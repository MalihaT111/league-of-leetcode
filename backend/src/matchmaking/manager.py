# src/matchmaking/manager.py
import redis.asyncio as aioredis
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from ..database.models import User
from ..matchmaking.service import create_match_record

MATCHMAKING_KEY = "matchmaking_queue"
REDIS_URL = "redis://localhost:6379"  # Use Elasticache endpoint in production

class MatchmakingManager:
    problem = None
    
    def __init__(self):
        self.redis_client = None  # Use redis.asyncio client

    async def connect(self):
        if not self.redis_client:
            self.redis_client = await aioredis.from_url(REDIS_URL, decode_responses=True)
        return self.redis_client

    async def add_player(self, user_id: int, elo: int):
        redis = await self.connect()
        await redis.zadd(MATCHMAKING_KEY, {user_id: elo})

    async def remove_player(self, user_id: int):
        redis = await self.connect()
        await redis.zrem(MATCHMAKING_KEY, user_id)

    async def find_match(self, user_id: int, elo: int, db: AsyncSession):
        redis = await self.connect()

        # Look for nearby players within ±100 ELO
        candidates = await redis.zrangebyscore(MATCHMAKING_KEY, elo - 100, elo + 100)

        for opp_id in candidates:
            opp_id = int(opp_id)
            if opp_id == user_id:
                continue

            # Remove both players from queue
            await redis.zrem(MATCHMAKING_KEY, user_id, opp_id)

            # Retrieve opponent info from DB
            opp_result = await db.execute(select(User).where(User.id == opp_id))
            opp = opp_result.scalar_one_or_none()
            
            user_result = await db.execute(select(User).where(User.id == user_id))
            user = user_result.scalar_one_or_none()

            if not opp or not user:
                continue

            # Create match record
            match_record = await create_match_record(db, user, opp)
            if not match_record:
                print(f"❌ Failed to create match record between {user.email} and {opp.email}")
                continue
            
            match = match_record["match"]
            problem = match_record["problem"]
            self.problem = problem  # Store for second player
            
            return {
                "match_id": match.match_id,
                "opponent": opp.email,  # Using email which maps to username
                "opponent_elo": opp.user_elo,
                "opponent_profile_picture_url": opp.profile_picture_url,
                "problem": problem  # Return problem directly for first player
            }

        return None
    
    def get_problem_for_match(self, match_id: int):
        """Get the stored problem for a match (fallback method)"""
        return self.problem  # Return the last stored problem
