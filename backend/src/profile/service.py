from typing import Optional, Dict, Any, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, desc

from src.database.models import User as UserModel
from src.database.models import MatchHistory


async def get_profile_data(db: AsyncSession, user_id: int) -> Optional[Dict[str, Any]]:
    # 1️⃣ Get user info (username + elo)
    user_result = await db.execute(
        select(UserModel.leetcode_username, UserModel.user_elo)
        .where(UserModel.id == user_id)
    )
    user_row = user_result.one_or_none()
    if not user_row:
        return None

    # 2️⃣ Get all matches involving the user
    all_matches_result = await db.execute(
        select(MatchHistory)
        .where(
            or_(
                MatchHistory.winner_id == user_id,
                MatchHistory.loser_id == user_id,
            )
        )
        .order_by(desc(MatchHistory.match_id))
    )
    all_matches: List[MatchHistory] = all_matches_result.scalars().all()

    # 3️⃣ Compute lifetime stats
    total_matches = len(all_matches)
    matches_won = sum(
        1 for m in all_matches if m.winner_id == user_id
    )
    win_rate = round((matches_won / total_matches) * 100, 1) if total_matches > 0 else 0

    win_streak = 0
    for match in all_matches:
        if match.winner_id == user_id:
            win_streak += 1
        else:
            break  # streak ends once a non-win occurs

    # 4️⃣ Prepare recent 5 matches with correct ELO changes
    recent_matches = []
    for m in all_matches[:5]:
        if m.winner_id == user_id:
            # User won - use winner_elo_change or fallback to positive elo_change
            rating_change = m.winner_elo_change if m.winner_elo_change is not None else m.elo_change
        else:
            # User lost - use loser_elo_change or fallback to negative elo_change
            rating_change = m.loser_elo_change if m.loser_elo_change is not None else -m.elo_change
        
        recent_matches.append({
            "match_id": m.match_id,
            "outcome": "win" if m.winner_id == user_id else "loss",
            "rating_change": rating_change,
            "question": m.leetcode_problem,
        })

    # 5️⃣ Combine all into a single clean response
    return {
        "user": {
            "username": user_row.leetcode_username,
            "elo": user_row.user_elo,
        },
        "stats": {
            "matches_won": matches_won,
            "win_rate": win_rate,
            "win_streak": win_streak,
        },
        "recent_matches": recent_matches,
    }
