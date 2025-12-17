# src/matchmaking/websocket_manager.py
import json
import asyncio
from typing import Dict, Set
from fastapi import WebSocket
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from ..database.models import User, MatchHistory
from .manager import MatchmakingManager
from .service import create_match_record
from .elo_service import EloService
from ..profile.file_service import get_profile_picture_url
import time

class WebSocketManager:
    """
    WebSocket manager for handling real-time matchmaking and game events.
    
    Features:
    - Real-time matchmaking queue management
    - Match creation and timer management
    - Solution submission and validation
    - Match resignation handling
    - Achievement tracking integration
    """
    def __init__(self):
        # Store active connections by user_id
        self.active_connections: Dict[int, WebSocket] = {}
        # Store users waiting in queue
        self.queue: Dict[int, dict] = {}  # user_id -> {elo, websocket, join_time}
        # Store match problems by match_id
        self.match_problems: Dict[int, dict] = {}
        # Store match timers by match_id
        self.match_timers: Dict[int, dict] = {}  # match_id -> {start_time, players, status}
        self.matchmaking_manager = MatchmakingManager()
        # Start queue status update task
        self._queue_update_task = None
        self._start_queue_updates()

    async def get_user_games_played(self, user_id: int, db: AsyncSession) -> int:
        """Get the total number of completed games for a user."""
        result = await db.execute(
            select(func.count(MatchHistory.match_id))
            .where(
                or_(
                    MatchHistory.winner_id == user_id,
                    MatchHistory.loser_id == user_id
                )
            )
            .where(MatchHistory.elo_change != 0)  # Only count completed matches
        )
        return result.scalar() or 0

    async def connect(self, websocket: WebSocket, user_id: int):
        """Store WebSocket connection (already accepted in route)"""
        self.active_connections[user_id] = websocket
        print(f"🔌 User {user_id} connected via WebSocket")

    def disconnect(self, user_id: int):
        """Remove user from connections and queue"""
        if user_id in self.active_connections:
            del self.active_connections[user_id]
        if user_id in self.queue:
            del self.queue[user_id]
        print(f"🔌 User {user_id} disconnected")

    async def send_to_user(self, user_id: int, message: dict):
        """Send message to specific user"""
        if user_id in self.active_connections:
            try:
                await self.active_connections[user_id].send_text(json.dumps(message))
            except Exception as e:
                print(f"❌ Failed to send message to user {user_id}: {e}")
                # Remove dead connection
                if user_id in self.active_connections:
                    del self.active_connections[user_id]

    async def join_queue(self, user_id: int, user_elo: int, db: AsyncSession):
        """Add user to matchmaking queue"""
        print(f"🚀 User {user_id} joining queue with ELO {user_elo}")
        
        # Add to queue with timestamp for progressive matching
        import time
        self.queue[user_id] = {
            "elo": user_elo,
            "websocket": self.active_connections.get(user_id),
            "join_time": time.time()
        }

        # Send queue joined confirmation
        await self.send_to_user(user_id, {
            "type": "queue_joined",
            "message": "Searching for opponent..."
        })

        # Try to find a match
        await self.try_match_players(db)

    async def leave_queue(self, user_id: int):
        """Remove user from queue"""
        if user_id in self.queue:
            del self.queue[user_id]
            await self.send_to_user(user_id, {
                "type": "queue_left",
                "message": "Left matchmaking queue"
            })
            print(f"🚪 User {user_id} left queue")

    def get_elo_range_for_wait_time(self, wait_time_seconds: float) -> int:
        """Calculate ELO range based on how long user has been waiting"""
        if wait_time_seconds < 30:  # First 30 seconds
            return 100
        elif wait_time_seconds < 60:  # 30-60 seconds
            return 150
        elif wait_time_seconds < 120:  # 1-2 minutes
            return 200
        elif wait_time_seconds < 300:  # 2-5 minutes
            return 300
        elif wait_time_seconds < 600:  # 5-10 minutes
            return 500
        else:  # 10+ minutes - very generous matching
            return 1000

    async def try_match_players(self, db: AsyncSession):
        """Try to match players in queue with progressive ELO expansion"""
        if len(self.queue) < 2:
            return

        import time
        current_time = time.time()
        queue_items = list(self.queue.items())
        
        # Try to match players with progressive ELO ranges
        for i in range(len(queue_items)):
            for j in range(i + 1, len(queue_items)):
                user1_id, user1_data = queue_items[i]
                user2_id, user2_data = queue_items[j]
                
                # Calculate wait times for both users
                user1_wait_time = current_time - user1_data["join_time"]
                user2_wait_time = current_time - user2_data["join_time"]
                
                # Use the maximum wait time to determine ELO range (more generous matching)
                max_wait_time = max(user1_wait_time, user2_wait_time)
                elo_range = self.get_elo_range_for_wait_time(max_wait_time)
                
                # Check ELO compatibility with progressive range
                elo_diff = abs(user1_data["elo"] - user2_data["elo"])
                if elo_diff <= elo_range:
                    print(f"🎯 Matching users {user1_id} (ELO: {user1_data['elo']}) and {user2_id} (ELO: {user2_data['elo']}) with ELO diff {elo_diff} (range: ±{elo_range}, max wait: {max_wait_time:.1f}s)")
                    await self.create_match(user1_id, user2_id, db)
                    return
                else:
                    # Log why match was rejected for debugging
                    if elo_diff > 100:  # Only log if it would have been rejected under old system
                        print(f"⏳ Users {user1_id} (ELO: {user1_data['elo']}) and {user2_id} (ELO: {user2_data['elo']}) - ELO diff {elo_diff} > range ±{elo_range} (wait: {max_wait_time:.1f}s)")

    async def create_match(self, user1_id: int, user2_id: int, db: AsyncSession):
        """Create a match between two users"""
        try:
            # Remove both from queue
            self.queue.pop(user1_id, None)
            self.queue.pop(user2_id, None)

            # Get user data from database
            user1_result = await db.execute(select(User).where(User.id == user1_id))
            user1 = user1_result.scalar_one_or_none()
            
            user2_result = await db.execute(select(User).where(User.id == user2_id))
            user2 = user2_result.scalar_one_or_none()

            if not user1 or not user2:
                print(f"❌ Failed to get user data for match")
                return

            # Create match record
            match_record = await create_match_record(db, user1, user2)
            if not match_record:
                print(f"❌ Failed to create match record between {user1.email} and {user2.email}")
                # Re-add users to queue with original join times
                import time
                current_time = time.time()
                self.queue[user1_id] = {
                    "elo": user1.user_elo, 
                    "websocket": self.active_connections.get(user1_id),
                    "join_time": current_time - 5  # Give them a small head start
                }
                self.queue[user2_id] = {
                    "elo": user2.user_elo, 
                    "websocket": self.active_connections.get(user2_id),
                    "join_time": current_time - 5  # Give them a small head start
                }
                
                # Notify users about the retry
                await self.send_to_user(user1_id, {
                    "type": "match_retry",
                    "message": "Match creation failed, retrying with broader criteria..."
                })
                await self.send_to_user(user2_id, {
                    "type": "match_retry", 
                    "message": "Match creation failed, retrying with broader criteria..."
                })
                return
            
            match = match_record["match"]
            problem = match_record["problem"]

            # Store problem for this match
            self.match_problems[match.match_id] = problem

            print(f"✅ Match created: {match.match_id} between {user1.email} and {user2.email}")

            # Initialize match timer
            self.match_timers[match.match_id] = {
                "start_time": None,  # Will be set when countdown ends
                "players": [user1_id, user2_id],
                "status": "countdown",  # countdown -> active -> completed
                "countdown": 3
            }

            # Notify both players
            match_data = {
                "type": "match_found",
                "match_id": match.match_id,
                "problem": problem.dict(),
            }

            await self.send_to_user(user1_id, {
                **match_data,
                "opponent": {
                    "username": user2.leetcode_username or user2.email,
                    "elo": user2.user_elo,
                    "profile_picture_url": get_profile_picture_url(user2.profile_picture_url)
                }
            })

            await self.send_to_user(user2_id, {
                **match_data,
                "opponent": {
                    "username": user1.leetcode_username or user1.email,
                    "elo": user1.user_elo,
                    "profile_picture_url": get_profile_picture_url(user1.profile_picture_url)
                }
            })

            # Start countdown timer for this match
            asyncio.create_task(self.run_match_timer(match.match_id))

        except Exception as e:
            print(f"❌ Error creating match: {e}")
            # Re-add users to queue if match creation failed
            import time
            current_time = time.time()
            self.queue[user1_id] = {
                "elo": user1.user_elo, 
                "websocket": self.active_connections.get(user1_id),
                "join_time": current_time - 10  # Give them more head start after error
            }
            self.queue[user2_id] = {
                "elo": user2.user_elo, 
                "websocket": self.active_connections.get(user2_id),
                "join_time": current_time - 10  # Give them more head start after error
            }
            
            # Notify users about the error
            await self.send_to_user(user1_id, {
                "type": "match_error",
                "message": "Match creation encountered an error, continuing search..."
            })
            await self.send_to_user(user2_id, {
                "type": "match_error",
                "message": "Match creation encountered an error, continuing search..."
            })

    async def submit_solution(self, match_id: int, user_id: int, db: AsyncSession, frontend_seconds: int = 0):
        """Handle solution submission with LeetCode validation"""
        from sqlalchemy import select
        from ..database.models import MatchHistory
        from ..leetcode.service.leetcode_service import LeetCodeService

        # Find the match
        match_result = await db.execute(
            select(MatchHistory).where(MatchHistory.match_id == match_id)
        )
        match = match_result.scalar_one_or_none()

        if not match or match.elo_change != 0:
            return False

        # Get the user who submitted
        user_result = await db.execute(select(User).where(User.id == user_id))
        user = user_result.scalar_one_or_none()
        
        if not user or not user.leetcode_username:
            await self.send_to_user(user_id, {
                "type": "error",
                "message": "LeetCode username not found. Please update your profile."
            })
            return False

        # Get the problem for this match
        problem = self.match_problems.get(match_id)
        if not problem:
            await self.send_to_user(user_id, {
                "type": "error", 
                "message": "Match problem not found"
            })
            return False

        try:
            # Check user's recent submissions
            print(f"🔍 Checking submissions for {user.leetcode_username} on problem {problem.slug}")
            recent_submission = await LeetCodeService.get_recent_user_submission(user.leetcode_username)
            
            if not recent_submission:
                await self.send_to_user(user_id, {
                    "type": "submission_invalid",
                    "message": "No recent submissions found. Please submit your solution on LeetCode first."
                })
                return False
            
            # Check if the submission is for the correct problem
            if recent_submission.titleSlug != problem.slug:
                await self.send_to_user(user_id, {
                    "type": "submission_invalid", 
                    "message": f"Your recent submission is for '{recent_submission.titleSlug}', but the match problem is '{problem.slug}'. Please submit the correct problem."
                })
                return False
            
            print(f"✅ Valid submission found for {user.leetcode_username}: {recent_submission.titleSlug}")
            
        except Exception as e:
            print(f"❌ Error validating submission: {e}")
            await self.send_to_user(user_id, {
                "type": "error",
                "message": "Failed to validate submission. Please try again."
            })
            return False

        # Store original ELOs before any swapping
        original_user1_elo = match.winner_elo  # Original first user's ELO
        original_user2_elo = match.loser_elo   # Original second user's ELO
        original_user1_id = match.winner_id    # Original first user's ID
        original_user2_id = match.loser_id     # Original second user's ID

        # Determine winner and loser (submitting user wins)
        if match.winner_id == user_id:
            winner_id = match.winner_id
            loser_id = match.loser_id
        elif match.loser_id == user_id:
            winner_id = match.loser_id
            loser_id = match.winner_id
            # Swap winner/loser in the match record
            match.winner_id = winner_id
            match.loser_id = loser_id
        else:
            return False

        # Use frontend timer value if provided, otherwise calculate from server
        if frontend_seconds > 0:
            match.match_seconds = frontend_seconds
            print(f"⏱️ Match {match_id} duration (from frontend): {frontend_seconds} seconds")
        else:
            # Fallback to server calculation
            timer_data = self.match_timers.get(match_id)
            if timer_data and timer_data.get("start_time"):
                match_duration = int(time.time() - timer_data["start_time"])
                match.match_seconds = match_duration
                print(f"⏱️ Match {match_id} duration (server calculated): {match_duration} seconds")
            else:
                match.match_seconds = 0
                print(f"⚠️ No timer data found for match {match_id}")

        # Update match with problem slug
        problem = self.match_problems.get(match_id)
        if problem:
            match.leetcode_problem = problem.slug

        # Get runtime, memory, and code data from the winner's submission
        try:
            if recent_submission:
                # Parse runtime (remove "ms" and convert to int)
                try:
                    winner_runtime = int(recent_submission.runtime.replace(" ms", "").replace("ms", "")) if recent_submission.runtime else -1
                except (ValueError, AttributeError):
                    winner_runtime = -1
                
                # Parse memory (remove "MB" and convert to float)
                try:
                    winner_memory = float(recent_submission.memory.replace(" MB", "").replace("MB", "")) if recent_submission.memory else -1.0
                except (ValueError, AttributeError):
                    winner_memory = -1.0
                
                # Get the submitted code
                winner_code = recent_submission.code if hasattr(recent_submission, 'code') else None
            else:
                winner_runtime = -1
                winner_memory = -1.0
                winner_code = None
        except Exception as e:
            print(f"Error parsing submission data: {e}")
            winner_runtime = -1
            winner_memory = -1.0
            winner_code = None

        # Get user data and calculate ELO changes
        winner_result = await db.execute(select(User).where(User.id == winner_id))
        winner = winner_result.scalar_one_or_none()
        loser_result = await db.execute(select(User).where(User.id == loser_id))
        loser = loser_result.scalar_one_or_none()

        if winner and loser:
            # Get games played for both players for Elo calculation
            winner_games_played = await self.get_user_games_played(winner_id, db)
            loser_games_played = await self.get_user_games_played(loser_id, db)
            
            # Use correct original ELOs based on actual user IDs, not swapped match record
            if winner_id == original_user1_id:
                # Winner was originally the first user
                original_winner_elo = original_user1_elo
                original_loser_elo = original_user2_elo
            else:
                # Winner was originally the second user
                original_winner_elo = original_user2_elo
                original_loser_elo = original_user1_elo
            
            # Calculate ELO changes using correct original ELOs
            winner_elo_change, loser_elo_change = EloService.calculate_match_rating_changes(
                winner_rating=original_winner_elo,
                loser_rating=original_loser_elo,
                winner_games_played=winner_games_played,
                loser_games_played=loser_games_played,
                is_resignation=False
            )
            
            # Store all ELO changes accurately
            match.elo_change = abs(loser_elo_change)  # Keep for backward compatibility
            match.winner_elo_change = winner_elo_change  # New: Actual winner gain
            match.loser_elo_change = loser_elo_change    # New: Actual loser loss (negative)
            
            # Update user ELOs
            winner.user_elo += winner_elo_change
            loser.user_elo += loser_elo_change  # This will be negative
            match.winner_elo = winner.user_elo
            match.loser_elo = loser.user_elo
            
            
            
            

        # Set runtime, memory, and code data
        match.winner_runtime = winner_runtime
        match.loser_runtime = -1  # Loser gets -1 for runtime
        match.winner_memory = winner_memory
        match.loser_memory = -1.0  # Loser gets -1 for memory
        match.winner_code = winner_code  # Store winner's code
        match.loser_code = None  # Loser doesn't have valid code

        await db.commit()

        # Stop the timer
        self.stop_match_timer(match_id)

        # Check achievements for both players
        from ..achievements.achievements import AchievementTracker
        
        # Check achievements for winner
        winner_achievements = await AchievementTracker.check_achievements(winner_id, db, "match_completed")
        
        # Check achievements for loser (they still played a game)
        loser_achievements = await AchievementTracker.check_achievements(loser_id, db, "match_completed")

        # Notify both players
        await self.send_to_user(winner_id, {
            "type": "match_completed",
            "result": "won",
            "match_id": match_id,
            "elo_change": f"+{winner_elo_change}",
            "achievements_unlocked": winner_achievements
        })

        await self.send_to_user(loser_id, {
            "type": "match_completed", 
            "result": "lost",
            "match_id": match_id,
            "elo_change": f"{loser_elo_change}",  # Already negative
            "achievements_unlocked": loser_achievements
        })

        print(f"🏆 Match {match_id} completed. Winner: {winner_id}, Loser: {loser_id}")
        return True

    async def resign_match(self, match_id: int, user_id: int, db: AsyncSession, frontend_seconds: int = 0):
        """Handle match resignation"""
        from sqlalchemy import select
        from ..database.models import MatchHistory

        # Find the match
        match_result = await db.execute(
            select(MatchHistory).where(MatchHistory.match_id == match_id)
        )
        match = match_result.scalar_one_or_none()

        if not match or match.elo_change != 0:
            return False

        # Store original ELOs before any swapping
        original_user1_elo = match.winner_elo  # Original first user's ELO
        original_user2_elo = match.loser_elo   # Original second user's ELO
        original_user1_id = match.winner_id    # Original first user's ID
        original_user2_id = match.loser_id     # Original second user's ID

        # Determine winner and loser (resigning user loses)
        if match.winner_id == user_id:
            # User was winner, now becomes loser
            winner_id = match.loser_id
            loser_id = match.winner_id
            match.winner_id = winner_id
            match.loser_id = loser_id
        elif match.loser_id == user_id:
            # User was loser, stays loser
            winner_id = match.winner_id
            loser_id = match.loser_id
        else:
            return False

        # Use frontend timer value if provided, otherwise calculate from server
        if frontend_seconds > 0:
            match.match_seconds = frontend_seconds
            print(f"⏱️ Match {match_id} resigned after (from frontend): {frontend_seconds} seconds")
        else:
            # Fallback to server calculation
            timer_data = self.match_timers.get(match_id)
            if timer_data and timer_data.get("start_time"):
                match_duration = int(time.time() - timer_data["start_time"])
                match.match_seconds = match_duration
                print(f"⏱️ Match {match_id} resigned after (server calculated): {match_duration} seconds")
            else:
                match.match_seconds = 0
                print(f"⚠️ No timer data found for resigned match {match_id}")

        # Update match with problem slug
        problem = self.match_problems.get(match_id)
        if problem:
            match.leetcode_problem = problem.slug

        # Get user data and calculate ELO changes for resignation
        winner_result = await db.execute(select(User).where(User.id == winner_id))
        winner = winner_result.scalar_one_or_none()
        loser_result = await db.execute(select(User).where(User.id == loser_id))
        loser = loser_result.scalar_one_or_none()

        if winner and loser:
            # Get games played for both players for Elo calculation
            winner_games_played = await self.get_user_games_played(winner_id, db)
            loser_games_played = await self.get_user_games_played(loser_id, db)
            
            # Use correct original ELOs based on actual user IDs, not swapped match record
            if winner_id == original_user1_id:
                # Winner was originally the first user
                original_winner_elo = original_user1_elo
                original_loser_elo = original_user2_elo
            else:
                # Winner was originally the second user
                original_winner_elo = original_user2_elo
                original_loser_elo = original_user1_elo
            
            # Calculate ELO changes using correct original ELOs
            winner_elo_change, loser_elo_change = EloService.calculate_match_rating_changes(
                winner_rating=original_winner_elo,
                loser_rating=original_loser_elo,
                winner_games_played=winner_games_played,
                loser_games_played=loser_games_played,
                is_resignation=True
            )
            
            # Store all ELO changes accurately
            match.elo_change = abs(loser_elo_change)  # Keep for backward compatibility
            match.winner_elo_change = winner_elo_change  # New: Actual winner gain
            match.loser_elo_change = loser_elo_change    # New: Actual loser loss (negative)
            
            # Update user ELOs
            winner.user_elo += winner_elo_change
            loser.user_elo += loser_elo_change  # This will be negative
            match.winner_elo = winner.user_elo
            match.loser_elo = loser.user_elo

        # Set runtime, memory, and code data for resignation (both get -1 since no valid submission)
        match.winner_runtime = -1
        match.loser_runtime = -1
        match.winner_memory = -1.0
        match.loser_memory = -1.0
        match.winner_code = None  # No code for resignation
        match.loser_code = None  # No code for resignation

        await db.commit()

        # Check achievements for both players
        from ..achievements.achievements import AchievementTracker
        
        # Check achievements for winner (they won by resignation)
        winner_achievements = await AchievementTracker.check_achievements(winner_id, db, "match_completed")
        
        # Check achievements for loser (they still played a game)
        loser_achievements = await AchievementTracker.check_achievements(loser_id, db, "match_completed")

        # Notify both players
        await self.send_to_user(winner_id, {
            "type": "match_completed",
            "result": "won",
            "match_id": match_id,
            "elo_change": f"+{winner_elo_change}",
            "reason": "opponent_resigned",
            "achievements_unlocked": winner_achievements
        })

        await self.send_to_user(loser_id, {
            "type": "match_completed", 
            "result": "lost",
            "match_id": match_id,
            "elo_change": f"{loser_elo_change}",  # Already negative
            "reason": "resigned",
            "achievements_unlocked": loser_achievements
        })

        print(f"🏳️ Match {match_id} ended by resignation. Winner: {winner_id}, Loser: {loser_id}")
        
        # Stop the timer for this match
        if match_id in self.match_timers:
            self.match_timers[match_id]["status"] = "completed"
        
        return True

    async def run_match_timer(self, match_id: int):
        """Run the synchronized timer for a match"""
        if match_id not in self.match_timers:
            return

        timer_data = self.match_timers[match_id]
        players = timer_data["players"]

        try:
            # Countdown phase (3, 2, 1)
            for countdown in [3, 2, 1]:
                if timer_data["status"] != "countdown":
                    return
                
                # Send countdown to both players
                for player_id in players:
                    await self.send_to_user(player_id, {
                        "type": "timer_update",
                        "phase": "countdown",
                        "countdown": countdown
                    })
                
                await asyncio.sleep(1)

            # Send "START!" message
            for player_id in players:
                await self.send_to_user(player_id, {
                    "type": "timer_update",
                    "phase": "start",
                    "message": "START!"
                })
            
            await asyncio.sleep(1)

            # Start match timer
            timer_data["status"] = "active"
            timer_data["start_time"] = time.time()
            match_seconds = 0

            # Active match timer - send start time instead of continuous updates
            start_timestamp = timer_data["start_time"]
            
            # Send match start time to both players for client-side calculation
            for player_id in players:
                await self.send_to_user(player_id, {
                    "type": "timer_update",
                    "phase": "active",
                    "start_timestamp": start_timestamp
                })
            
            # Keep timer alive but don't send continuous updates
            while timer_data["status"] == "active":
                await asyncio.sleep(5)  # Check every 5 seconds instead of every second

        except Exception as e:
            print(f"❌ Timer error for match {match_id}: {e}")
        finally:
            # Clean up timer data
            if match_id in self.match_timers:
                del self.match_timers[match_id]

    def stop_match_timer(self, match_id: int):
        """Stop the timer for a match"""
        if match_id in self.match_timers:
            self.match_timers[match_id]["status"] = "completed"

    def _start_queue_updates(self):
        """Start the periodic queue status update and matching tasks"""
        import asyncio
        
        async def queue_update_loop():
            while True:
                try:
                    await asyncio.sleep(10)  # Update every 10 seconds
                    await self._send_queue_updates()
                except Exception as e:
                    print(f"❌ Queue update error: {e}")
        
        async def periodic_matching_loop():
            """Periodically try to match players to handle progressive ELO expansion"""
            while True:
                try:
                    await asyncio.sleep(5)  # Try matching every 5 seconds
                    if len(self.queue) >= 2:
                        from ..database.database import AsyncSessionLocal
                        async with AsyncSessionLocal() as db:
                            await self.try_match_players(db)
                except Exception as e:
                    print(f"❌ Periodic matching error: {e}")
        
        # Start both tasks
        asyncio.create_task(queue_update_loop())
        asyncio.create_task(periodic_matching_loop())

    async def _send_queue_updates(self):
        """Send queue status updates to all users in queue"""
        if not self.queue:
            return
            
        import time
        current_time = time.time()
        queue_size = len(self.queue)
        
        for user_id, user_data in self.queue.items():
            wait_time = current_time - user_data["join_time"]
            current_elo_range = self.get_elo_range_for_wait_time(wait_time)
            
            # Count potential matches within current ELO range
            user_elo = user_data["elo"]
            potential_matches = 0
            for other_id, other_data in self.queue.items():
                if other_id != user_id:
                    elo_diff = abs(user_elo - other_data["elo"])
                    if elo_diff <= current_elo_range:
                        potential_matches += 1
            
            await self.send_to_user(user_id, {
                "type": "queue_status",
                "queue_size": queue_size,
                "wait_time": int(wait_time),
                "elo_range": current_elo_range,
                "potential_matches": potential_matches,
                "message": f"Searching... ({int(wait_time)}s, ±{current_elo_range} ELO, {potential_matches} potential matches)"
            })


    
    
# Global WebSocket manager instance
websocket_manager = WebSocketManager()