from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import desc, select
from src.database.models import User
from src.database.database import get_db
from src.users import service, schemas

router = APIRouter()

@router.post("/users", response_model=schemas.UserResponse)
async def register_user(user: schemas.UserCreate, db: AsyncSession = Depends(get_db)):
    try:
        db_user = await service.create_user(db, user)
        return db_user
    except Exception as e:
        raise HTTPException(status_code=400, detail="User already exists or invalid input")

@router.get("/users/{user_id}", response_model=schemas.UserStats)
async def get_user_by_id(user_id: int, db: AsyncSession = Depends(get_db)):
    """
    Fetch email, leetcode_hash, leetcode_username, and user_elo
    for a single user by user_id.
    """
    result = await db.execute(
        select(User.email, User.leetcode_hash, User.leetcode_username, User.user_elo)
        .where(User.id == user_id)
    )
    user = result.first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {
        "username": user.email,  # Map email back to username for API response
        "leetcode_username": user.leetcode_username,
        "user_elo": user.user_elo
    }
    
@router.get("/leaderboard")
async def get_leaderboard(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(
            User.id,
            User.leetcode_username,
            User.user_elo,
            User.winstreak
        ).order_by(desc(User.user_elo))
        .limit(10)
    )
    users = result.all()
    
    if not users:
        raise HTTPException(status_code=404, detail="No users found")

    leaderboard = [
        {
            "rank": rank,
            "id": user.id,
            "username": user.leetcode_username,
            "elo": user.user_elo,
            "winstreak": user.winstreak
        }
        for rank, user in enumerate(users, start=1)
    ]

    return leaderboard