# src/matchmaking/routes.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, func
from ..database.database import get_db
from ..database.models import User, MatchHistory
from ..matchmaking.manager import MatchmakingManager
from ..matchmaking.manager import MATCHMAKING_KEY
from ..matchmaking.schemas import QueueResponse, MatchResponse
from ..matchmaking.elo_service import EloService
from ..leetcode.schemas import Problem

router = APIRouter(tags=["Matchmaking"])
manager = MatchmakingManager()

async def get_user_games_played(user_id: int, db: AsyncSession) -> int:
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

@router.post("/queue/{user_id}", response_model=QueueResponse)
async def join_queue(user_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    print(f"🚀 User {user_id} ({user.email}) joining queue with ELO {user.user_elo}")
    
    # First, remove user from queue if they're already there (cleanup)
    await manager.remove_player(user.id)
    
    # Add player to queue
    await manager.add_player(user.id, user.user_elo)

    match = await manager.find_match(user.id, user.user_elo, db)
    if match:
        print(f"🎉 Immediate match found for user {user_id}")
        problem = match.get("problem")
        match_response = MatchResponse(
            match_id=match["match_id"],
            opponent=match["opponent"],
            opponent_elo=match["opponent_elo"],
            problem=problem.dict() if problem else {}
        )
        return QueueResponse(status="matched", match=match_response)
    
    print(f"⏳ User {user_id} added to queue, waiting for opponent")
    return QueueResponse(status="queued", match=None)

@router.post("/leave/{user_id}")
async def leave_queue(user_id: int):
    await manager.remove_player(user_id)
    return {"status": "left"}

@router.get("/status/{user_id}")
async def get_match_status(user_id: int, db: AsyncSession = Depends(get_db)):
    """Check if user has been matched while waiting in queue"""
    
    # First check if user is still in Redis queue - if they are, they can't be matched yet
    redis = await manager.connect()
    user_in_queue = await redis.zscore(MATCHMAKING_KEY, user_id)
    
    if user_in_queue is not None:
        # User is still in queue, so no match yet
        return QueueResponse(status="waiting", match=None)
    
    # User is not in queue, check if they have a recent match with "TBD" problem
    # Look for any recent match with TBD status (active match)
    recent_match_result = await db.execute(
        select(MatchHistory)
        .where(
            or_(
                MatchHistory.winner_id == user_id,
                MatchHistory.loser_id == user_id
            )
        )
        .where(MatchHistory.leetcode_problem == "TBD")  # Active match indicator
        .order_by(MatchHistory.match_id.desc())
        .limit(1)
    )
    match = recent_match_result.scalar_one_or_none()
    
    if match:
        # Check if match is completed (elo_change != 0 means completed)
        if match.elo_change != 0:
            # Match is completed, determine if user won or lost
            user_won = match.winner_id == user_id
            return QueueResponse(status="completed", match=MatchResponse(
                match_id=match.match_id,
                opponent="",  # Not needed for completed status
                opponent_elo=0,
                problem=manager.problem.dict() if manager.problem else Problem(),
                result="won" if user_won else "lost"
            ))
        
        # Match is still active
        opponent_id = match.loser_id if match.winner_id == user_id else match.winner_id
        opponent_result = await db.execute(select(User).where(User.id == opponent_id))
        opponent = opponent_result.scalar_one_or_none()
        
        if opponent:
            return QueueResponse(
                status="matched",
                match=MatchResponse(
                    match_id=match.match_id,
                    opponent=opponent.email,
                    opponent_elo=opponent.user_elo,
                    problem=manager.problem.dict() if manager.problem else {}
                )
            )
    
    return QueueResponse(status="waiting", match=None)

@router.post("/submit/{match_id}/{user_id}")
async def submit_solution(match_id: int, user_id: int, db: AsyncSession = Depends(get_db)):
    """Handle when a user submits their solution and wins the match"""
    
    # Find the match
    match_result = await db.execute(
        select(MatchHistory).where(MatchHistory.match_id == match_id)
    )
    match = match_result.scalar_one_or_none()
    
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    
    # Check if match is already completed
    if match.elo_change != 0:
        raise HTTPException(status_code=400, detail="Match already completed")
    
    # Determine winner and loser
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
        raise HTTPException(status_code=400, detail="User not in this match")
    
    # Get winner's LeetCode username to fetch submission data
    winner_result = await db.execute(select(User).where(User.id == winner_id))
    winner = winner_result.scalar_one_or_none()
    loser_result = await db.execute(select(User).where(User.id == loser_id))
    loser = loser_result.scalar_one_or_none()
    
    if not winner or not loser:
        raise HTTPException(status_code=404, detail="Player data not found")
    
    # Get winner's recent submission for runtime and memory data
    from ..leetcode.service.leetcode_service import LeetCodeService
    try:
        if winner.leetcode_username:
            recent_submission = await LeetCodeService.get_recent_user_submission(winner.leetcode_username)
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
            else:
                winner_runtime = -1
                winner_memory = -1.0
        else:
            winner_runtime = -1
            winner_memory = -1.0
    except Exception as e:
        print(f"Error getting winner submission data: {e}")
        winner_runtime = -1
        winner_memory = -1.0
    
    # Set match duration (fallback - WebSocket should handle this)
    match.match_seconds = 0  # Default for REST API submissions
    
    # Get games played for both players for Elo calculation
    winner_games_played = await get_user_games_played(winner_id, db)
    loser_games_played = await get_user_games_played(loser_id, db)
    
    # Use original ELOs from match record for consistent calculation
    original_winner_elo = match.winner_elo if match.winner_id == winner_id else match.loser_elo
    original_loser_elo = match.loser_elo if match.winner_id == winner_id else match.winner_elo
    
    # Calculate ELO changes using original match ELOs
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
    
    # Set runtime and memory data
    match.winner_runtime = winner_runtime
    match.loser_runtime = -1  # Loser gets -1 for runtime
    match.winner_memory = winner_memory
    match.loser_memory = -1.0  # Loser gets -1 for memory
    
    await db.commit()
    
    return {
        "status": "completed", 
        "winner_id": winner_id, 
        "winner_elo_change": winner_elo_change,
        "loser_elo_change": loser_elo_change,
        "elo_change": abs(loser_elo_change)  # For backward compatibility
    }

@router.post("/resign/{match_id}/{user_id}")
async def resign_match(match_id: int, user_id: int, db: AsyncSession = Depends(get_db)):
    """Handle when a user resigns from a match"""
    
    # Find the match
    match_result = await db.execute(
        select(MatchHistory).where(MatchHistory.match_id == match_id)
    )
    match = match_result.scalar_one_or_none()
    
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    
    # Check if match is already completed
    if match.elo_change != 0:
        raise HTTPException(status_code=400, detail="Match already completed")
    
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
        raise HTTPException(status_code=400, detail="User not in this match")
    
    # Get the problem for this match and update the leetcode_problem field
    from ..matchmaking.websocket_manager import websocket_manager
    problem = websocket_manager.match_problems.get(match_id)
    if problem:
        try:
            problem_slug = problem.slug if hasattr(problem, 'slug') else str(problem.get('slug', 'unknown'))
            match.leetcode_problem = problem_slug
            print(f"📝 Updated resigned match {match_id} with problem slug: {problem_slug}")
        except Exception as e:
            print(f"⚠️ Error getting problem slug for resigned match {match_id}: {e}")
            match.leetcode_problem = "unknown"
    else:
        print(f"⚠️ Warning: No problem found for resigned match {match_id}")
        match.leetcode_problem = "unknown"
    
    # Set match duration (fallback - WebSocket should handle this)
    match.match_seconds = 0  # Default for REST API resignations
    
    # Get user objects and games played for Elo calculation
    winner_result = await db.execute(select(User).where(User.id == winner_id))
    winner = winner_result.scalar_one_or_none()
    loser_result = await db.execute(select(User).where(User.id == loser_id))
    loser = loser_result.scalar_one_or_none()
    
    if not winner or not loser:
        raise HTTPException(status_code=404, detail="Player data not found")
    
    # Get games played for both players for Elo calculation
    winner_games_played = await get_user_games_played(winner_id, db)
    loser_games_played = await get_user_games_played(loser_id, db)
    
    # Use original ELOs from match record for consistent calculation
    original_winner_elo = match.winner_elo if match.winner_id == winner_id else match.loser_elo
    original_loser_elo = match.loser_elo if match.winner_id == winner_id else match.winner_elo
    
    # Calculate ELO changes using original match ELOs with resignation penalty
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
    
    # Set runtime and memory data for resignation (both get -1 since no valid submission)
    match.winner_runtime = -1
    match.loser_runtime = -1
    match.winner_memory = -1.0
    match.loser_memory = -1.0
    
    await db.commit()
    
    return {
        "status": "completed", 
        "winner_id": winner_id, 
        "loser_id": loser_id,
        "resignation": True,
        "winner_elo_change": winner_elo_change,
        "loser_elo_change": loser_elo_change
    }

@router.get("/rating-preview/{user_id}/{opponent_id}")
async def get_rating_preview(user_id: int, opponent_id: int, db: AsyncSession = Depends(get_db)):
    """Get a preview of potential rating changes before a match"""
    
    # Get both users
    user_result = await db.execute(select(User).where(User.id == user_id))
    user = user_result.scalar_one_or_none()
    
    opponent_result = await db.execute(select(User).where(User.id == opponent_id))
    opponent = opponent_result.scalar_one_or_none()
    
    if not user or not opponent:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get games played for both players
    user_games_played = await get_user_games_played(user_id, db)
    opponent_games_played = await get_user_games_played(opponent_id, db)
    
    # Get rating change previews for both players
    user_preview = EloService.get_rating_change_preview(
        user.user_elo, opponent.user_elo, user_games_played
    )
    opponent_preview = EloService.get_rating_change_preview(
        opponent.user_elo, user.user_elo, opponent_games_played
    )
    
    return {
        "user": {
            "id": user_id,
            "current_elo": user.user_elo,
            "games_played": user_games_played,
            "win_probability": user_preview["win_probability"],
            "rating_change_on_win": user_preview["rating_change_on_win"],
            "rating_change_on_loss": user_preview["rating_change_on_loss"]
        },
        "opponent": {
            "id": opponent_id,
            "current_elo": opponent.user_elo,
            "games_played": opponent_games_played,
            "win_probability": opponent_preview["win_probability"],
            "rating_change_on_win": opponent_preview["rating_change_on_win"],
            "rating_change_on_loss": opponent_preview["rating_change_on_loss"]
        }
    }

@router.get("/match-rating-preview/{match_id}")
async def get_match_rating_preview(match_id: int, db: AsyncSession = Depends(get_db)):
    """Get rating preview for both players in a match"""
    
    # Find the match
    match_result = await db.execute(
        select(MatchHistory).where(MatchHistory.match_id == match_id)
    )
    match = match_result.scalar_one_or_none()
    
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    
    # Get both players
    user1_result = await db.execute(select(User).where(User.id == match.winner_id))
    user1 = user1_result.scalar_one_or_none()
    
    user2_result = await db.execute(select(User).where(User.id == match.loser_id))
    user2 = user2_result.scalar_one_or_none()
    
    if not user1 or not user2:
        raise HTTPException(status_code=404, detail="Player data not found")
    
    # Get games played for both players
    user1_games_played = await get_user_games_played(match.winner_id, db)
    user2_games_played = await get_user_games_played(match.loser_id, db)
    
    # Use the original ELOs stored in the match record (at match start time)
    # This ensures preview matches actual calculation
    original_user1_elo = match.winner_elo if match.winner_id == user1.id else match.loser_elo
    original_user2_elo = match.loser_elo if match.winner_id == user1.id else match.winner_elo
    
    # Get rating change previews using original match ELOs
    user1_preview = EloService.get_rating_change_preview(
        original_user1_elo, original_user2_elo, user1_games_played
    )
    user2_preview = EloService.get_rating_change_preview(
        original_user2_elo, original_user1_elo, user2_games_played
    )
    
    return {
        "player1": {
            "id": user1.id,
            "username": user1.leetcode_username or user1.email,
            "current_elo": user1.user_elo,
            "games_played": user1_games_played,
            "win_probability": user1_preview["win_probability"],
            "rating_change_on_win": user1_preview["rating_change_on_win"],
            "rating_change_on_loss": user1_preview["rating_change_on_loss"]
        },
        "player2": {
            "id": user2.id,
            "username": user2.leetcode_username or user2.email,
            "current_elo": user2.user_elo,
            "games_played": user2_games_played,
            "win_probability": user2_preview["win_probability"],
            "rating_change_on_win": user2_preview["rating_change_on_win"],
            "rating_change_on_loss": user2_preview["rating_change_on_loss"]
        }
    }