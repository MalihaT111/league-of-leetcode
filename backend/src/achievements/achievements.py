from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from ..database.models import User, MatchHistory

ACHIEVEMENTS = [
    {
        "description": "Play your first game",
        "target": 1,
        "difficulty": "easy",
        "event": "match_played",
    },
    {
        "description": "Play 5 games",
        "target": 5,
        "difficulty": "easy",
        "event": "match_played",
    },
    {
      "description": "Win a game on each difficulty",
      "target": 3,
      "difficulty": "hard",
      "event": "match_played"
    },
    {
        "description": "Win a match",
        "target": 1,
        "difficulty": "easy",
        "event": "problem_solved",
    },
    {
        "description": "Win 5 matches",
        "target": 5,
        "difficulty": "medium",
        "event": "problem_solved",
    },
    {
        "description": "Solve 3 Easy problems",
        "target": 3,
        "difficulty": "easy",
        "event": "problem_solved"
    },
    {
        "description": "Solve 2 Medium problems",
        "target": 2,
        "difficulty": "medium",
        "event": "problem_solved"
    },
    {
        "description": "Solve 1 Hard problem",
        "target": 1,
        "difficulty": "hard",
        "event": "problem_solved",
    }
]

class AchievementTracker:
    """Handles achievement tracking and validation for users"""
    
    @staticmethod
    async def check_achievements(user_id: int, db: AsyncSession, event_type: str = "match_completed") -> list:
        """
        Check and update achievements for a user after a match event.
        Returns list of newly unlocked achievement objects.
        """
        # Get user data
        user_result = await db.execute(select(User).where(User.id == user_id))
        user = user_result.scalar_one_or_none()
        
        if not user:
            return []
        
        # Get user's match statistics
        stats = await AchievementTracker._get_user_stats(user_id, db)
        newly_unlocked = []
        
        # Check each achievement
        for i, achievement in enumerate(ACHIEVEMENTS):
            # Skip if already unlocked
            if user.achievements[i]:
                continue
                
            # Check if achievement is unlocked
            if await AchievementTracker._check_achievement(i, stats, achievement):
                user.achievements[i] = True
                # Add full achievement object with id
                achievement_obj = {
                    "id": i,
                    "description": achievement["description"],
                    "target": achievement["target"],
                    "difficulty": achievement["difficulty"],
                    "event": achievement["event"],
                    "unlocked": True
                }
                newly_unlocked.append(achievement_obj)
                print(f"🏆 User {user_id} unlocked achievement {i}: {achievement['description']}")
        
        # Save changes if any achievements were unlocked
        if newly_unlocked:
            await db.commit()
        
        return newly_unlocked
    
    @staticmethod
    async def _get_user_stats(user_id: int, db: AsyncSession) -> dict:
        """Get comprehensive user statistics for achievement checking"""
        
        # Total games played
        total_games_result = await db.execute(
            select(func.count(MatchHistory.match_id))
            .where(
                or_(
                    MatchHistory.winner_id == user_id,
                    MatchHistory.loser_id == user_id
                )
            )
            .where(MatchHistory.elo_change != 0)  # Only completed matches
        )
        total_games = total_games_result.scalar() or 0
        
        # Total wins
        total_wins_result = await db.execute(
            select(func.count(MatchHistory.match_id))
            .where(MatchHistory.winner_id == user_id)
            .where(MatchHistory.elo_change != 0)
        )
        total_wins = total_wins_result.scalar() or 0
        
        # Get all match history for difficulty analysis
        matches_result = await db.execute(
            select(MatchHistory)
            .where(MatchHistory.winner_id == user_id)
            .where(MatchHistory.elo_change != 0)
        )
        won_matches = matches_result.scalars().all()
        
        # Count wins by difficulty (we'll need to get problem difficulty from leetcode_problem)
        # For now, we'll use a simple heuristic or you can enhance this with actual problem data
        easy_wins = 0
        medium_wins = 0
        hard_wins = 0
        
        # This is a simplified approach - you might want to store problem difficulty in the database
        # or fetch it from your problem service
        for match in won_matches:
            # Simple heuristic based on problem name patterns or you can enhance this
            problem_name = match.leetcode_problem.lower() if match.leetcode_problem else ""
            if "easy" in problem_name or len(problem_name) < 20:  # Simple heuristic
                easy_wins += 1
            elif "hard" in problem_name or len(problem_name) > 40:
                hard_wins += 1
            else:
                medium_wins += 1
        
        # Check if user has won on all three difficulties
        difficulties_won = set()
        if easy_wins > 0:
            difficulties_won.add("easy")
        if medium_wins > 0:
            difficulties_won.add("medium")
        if hard_wins > 0:
            difficulties_won.add("hard")
        
        return {
            "total_games": total_games,
            "total_wins": total_wins,
            "easy_wins": easy_wins,
            "medium_wins": medium_wins,
            "hard_wins": hard_wins,
            "difficulties_won_count": len(difficulties_won)
        }
    
    @staticmethod
    async def _check_achievement(achievement_idx: int, stats: dict, achievement: dict) -> bool:
        """Check if a specific achievement should be unlocked"""
        
        if achievement_idx == 0:  # Play your first game
            return stats["total_games"] >= 1
        
        elif achievement_idx == 1:  # Play 5 games
            return stats["total_games"] >= 5
        
        elif achievement_idx == 2:  # Win a game on each difficulty
            return stats["difficulties_won_count"] >= 3
        
        elif achievement_idx == 3:  # Win a match
            return stats["total_wins"] >= 1
        
        elif achievement_idx == 4:  # Win 5 matches
            return stats["total_wins"] >= 5
        
        elif achievement_idx == 5:  # Solve 3 Easy problems
            return stats["easy_wins"] >= 3
        
        elif achievement_idx == 6:  # Solve 2 Medium problems
            return stats["medium_wins"] >= 2
        
        elif achievement_idx == 7:  # Solve 1 Hard problem
            return stats["hard_wins"] >= 1
        
        return False
