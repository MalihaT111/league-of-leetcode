# src/results/service.py
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional, List, Dict, Any
from ..database.models import MatchHistory, User

class ResultsService:
    """Service layer for handling match results database operations."""
    
    @staticmethod
    async def get_match_result_by_id(db: AsyncSession, match_id: int) -> Optional[Dict[str, Any]]:
        """
        Retrieve match result by match ID with all performance data.
        
        Args:
            db: Database session
            match_id: The match ID to retrieve
            
        Returns:
            Dictionary containing match result data or None if not found
        """
        # Query match history from database
        result = await db.execute(
            select(MatchHistory).where(MatchHistory.match_id == match_id)
        )
        match_history = result.scalar_one_or_none()
        
        if not match_history:
            return None
        
        # Query winner and loser user details
        winner_result = await db.execute(
            select(User).where(User.id == match_history.winner_id)
        )
        winner = winner_result.scalar_one_or_none()
        loser_result = await db.execute(
            select(User).where(User.id == match_history.loser_id)
        )
        loser = loser_result.scalar_one_or_none()
        
        # Use the new separate ELO change fields if available, fallback to old field
        winner_elo_change = match_history.winner_elo_change if match_history.winner_elo_change is not None else match_history.elo_change
        loser_elo_change = match_history.loser_elo_change if match_history.loser_elo_change is not None else -match_history.elo_change
        
        # Calculate ELO before the match using the correct individual changes
        winner_elo_before = match_history.winner_elo - winner_elo_change
        loser_elo_before = match_history.loser_elo - loser_elo_change  # loser_elo_change is already negative
        
        # Format problem title
        problem_title = match_history.leetcode_problem.replace('-', ' ').title()
        
        return {
            "match_id": match_history.match_id,
            "winner": {
                "id": match_history.winner_id,
                "username": winner.leetcode_username if winner else f"Player{match_history.winner_id}",
                "profile_picture_url": winner.profile_picture_url if winner else None,
                "elo_before": winner_elo_before,
                "elo_after": match_history.winner_elo,
                "elo_change": winner_elo_change,
                "runtime": match_history.winner_runtime,
                "memory": match_history.winner_memory,
                "code": match_history.winner_code
            },
            "loser": {
                "id": match_history.loser_id,
                "username": loser.leetcode_username if loser else f"Player{match_history.loser_id}",
                "profile_picture_url": loser.profile_picture_url if loser else None,
                "elo_before": loser_elo_before,
                "elo_after": match_history.loser_elo,
                "elo_change": loser_elo_change,
                "runtime": match_history.loser_runtime,
                "memory": match_history.loser_memory,
                "code": match_history.loser_code
            },
            "problem": {
                "title": problem_title,
                "url": f"https://leetcode.com/problems/{match_history.leetcode_problem}/"
            },
            "elo_change": match_history.elo_change,
            "match_duration": match_history.match_seconds
        }
    
    @staticmethod
    async def get_recent_matches(db: AsyncSession, limit: int = 10) -> Dict[str, Any]:
        """
        Retrieve recent matches with basic information.
        
        Args:
            db: Database session
            limit: Maximum number of matches to return
            
        Returns:
            Dictionary containing list of recent matches
        """
        # Query recent matches from database
        result = await db.execute(
            select(MatchHistory)
            .order_by(MatchHistory.match_id.desc())
            .limit(limit)
        )
        matches = result.scalars().all()
        
        match_list = []
        for match in matches:
            # Get usernames for each match
            winner_result = await db.execute(
                select(User).where(User.id == match.winner_id)
            )
            winner = winner_result.scalar_one_or_none()
            
            loser_result = await db.execute(
                select(User).where(User.id == match.loser_id)
            )
            loser = loser_result.scalar_one_or_none()
            
            match_list.append({
                "match_id": match.match_id,
                "winner_username": winner.leetcode_username if winner else f"Player{match.winner_id}",
                "loser_username": loser.leetcode_username if loser else f"Player{match.loser_id}",
                "problem": match.leetcode_problem,
                "elo_change": match.elo_change,
                "match_duration": match.match_seconds,
                "winner_runtime": match.winner_runtime,
                "loser_runtime": match.loser_runtime
            })
        
        return {
            "matches": match_list,
            "total": len(match_list)
        }
    
    @staticmethod
    async def get_user_match_history(db: AsyncSession, user_id: int, limit: int = 10) -> List[Dict[str, Any]]:
        """
        Get match history for a specific user.
        
        Args:
            db: Database session
            user_id: The user ID to get history for
            limit: Maximum number of matches to return
            
        Returns:
            List of matches where the user participated
        """
        # Get matches where user was either winner or loser
        matches_result = await db.execute(
            select(MatchHistory)
            .where(
                (MatchHistory.winner_id == user_id) | 
                (MatchHistory.loser_id == user_id)
            )
            .order_by(MatchHistory.match_id.desc())
            .limit(limit)
        )
        
        matches = matches_result.scalars().all()
        
        history = []
        for match in matches:
            # Determine if user won or lost
            won = match.winner_id == user_id
            opponent_id = match.loser_id if won else match.winner_id
            
            # Get opponent username
            opponent_result = await db.execute(
                select(User).where(User.id == opponent_id)
            )
            opponent = opponent_result.scalar_one_or_none()
            
            history.append({
                "match_id": match.match_id,
                "won": won,
                "opponent_id": opponent_id,
                "opponent_username": opponent.leetcode_username if opponent else f"Player{opponent_id}",
                "elo_change": (match.winner_elo_change if match.winner_elo_change is not None else match.elo_change) if won else (match.loser_elo_change if match.loser_elo_change is not None else -match.elo_change),
                "final_elo": match.winner_elo if won else match.loser_elo,
                "problem": match.leetcode_problem,
                "match_duration": match.match_seconds,
                "user_runtime": match.winner_runtime if won else match.loser_runtime,
                "opponent_runtime": match.loser_runtime if won else match.winner_runtime,
                "user_memory": match.winner_memory if won else match.loser_memory,
                "opponent_memory": match.loser_memory if won else match.winner_memory
            })
        
        return history