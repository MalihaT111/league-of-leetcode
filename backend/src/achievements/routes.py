from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from ..database.database import get_db
from ..database.models import User
from ..auth.auth import current_user
from .achievements import ACHIEVEMENTS

router = APIRouter(prefix="/achievements", tags=["achievements"])

@router.get("/")
async def get_user_achievements(
    current_user: User = Depends(current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get current user's achievement status"""
    
    # Get fresh user data from database
    user_result = await db.execute(select(User).where(User.id == current_user.id))
    user = user_result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Combine achievement definitions with user's progress
    user_achievements = []
    for i, achievement in enumerate(ACHIEVEMENTS):
        user_achievements.append({
            "id": i,
            "description": achievement["description"],
            "target": achievement["target"],
            "difficulty": achievement["difficulty"],
            "event": achievement["event"],
            "unlocked": user.achievements[i] if i < len(user.achievements) else False
        })
    
    return {
        "achievements": user_achievements,
        "total_unlocked": sum(1 for unlocked in user.achievements if unlocked)
    }

@router.get("/definitions")
async def get_achievement_definitions():
    """Get all achievement definitions (public endpoint)"""
    return {
        "achievements": [
            {
                "id": i,
                "description": achievement["description"],
                "target": achievement["target"],
                "difficulty": achievement["difficulty"],
                "event": achievement["event"]
            }
            for i, achievement in enumerate(ACHIEVEMENTS)
        ]
    }

@router.post("/check")
async def check_achievements_manually(
    current_user: User = Depends(current_user),
    db: AsyncSession = Depends(get_db)
):
    """Manually check and update achievements for current user"""
    from .achievements import AchievementTracker
    
    newly_unlocked = await AchievementTracker.check_achievements(current_user.id, db)
    
    return {
        "message": f"Achievement check completed. {len(newly_unlocked)} new achievements unlocked.",
        "newly_unlocked": newly_unlocked
    }