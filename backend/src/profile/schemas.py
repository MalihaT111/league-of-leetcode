from pydantic import BaseModel
try:
    from pydantic import ConfigDict
    _HAS_V2 = True
except Exception:
    _HAS_V2 = False

from typing import List
from src.users.schemas import UserProfile  # contains username + elo


class Stats(BaseModel):
    matches_won: int
    win_rate: float
    win_streak: int


class MatchSummary(BaseModel):
    match_id: int
    outcome: str
    rating_change: int
    question: str


class ProfileOut(BaseModel):
    user: UserProfile
    stats: Stats
    recent_matches: List[MatchSummary]

    if _HAS_V2:
        model_config = ConfigDict(from_attributes=True)
    else:
        class Config:
            orm_mode = True
