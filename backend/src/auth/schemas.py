"""
Pydantic schemas for FastAPI-users matching your users table structure.
"""

from fastapi_users import schemas
from typing import Optional, List
from pydantic import field_validator, field_serializer
import json
from pydantic import field_validator


class UserRead(schemas.BaseUser[int]):
    """Schema for reading user data - returns all your custom fields."""
    leetcode_username: Optional[str] = None
    user_elo: int = 1200
    leetcode_hash: Optional[str] = None
    repeating_questions: Optional[bool] = False  # tinyint(1) - boolean
    difficulty: List[str] = ["1", "2", "3"]  # List of difficulty levels
    topics: List[str] = [i for i in range(0, 71)]  # List of topic IDs
    winstreak: int = 0  # Win streak counter
    
    # Note: email field comes from BaseUser and maps to your username column
    
    @field_validator('difficulty', mode='before')
    @classmethod
    def validate_difficulty_input(cls, value):
        """Convert JSON string from database to list for validation."""
        if isinstance(value, str):
            try:
                parsed = json.loads(value)
                return parsed if isinstance(parsed, list) else ["1", "2", "3"]
            except:
                return ["1", "2", "3"]
        elif isinstance(value, list):
            return value
        else:
            return ["1", "2", "3"]
    
    @field_validator('topics', mode='before')
    @classmethod
    def validate_topics_input(cls, value):
        """Convert JSON string from database to list for validation."""
        if isinstance(value, str):
            try:
                parsed = json.loads(value)
                return parsed if isinstance(parsed, list) else [i for i in range(0, 71)]
            except:
                return [i for i in range(0, 71)]
        elif isinstance(value, list):
            return value
        else:
            return [i for i in range(0, 71)]

class UserCreate(schemas.BaseUserCreate):
    """Schema for creating users - requires your essential fields."""
    leetcode_username: Optional[str] = None  # Now optional - will be set later
    user_elo: Optional[int] = None  # Let database default handle this
    difficulty: Optional[List[str]] = None  # Let database default handle this
    topics: Optional[List[str]] = None  # Let database default handle this
    repeating_questions: Optional[bool] = None  # Let database default handle this
    winstreak: Optional[int] = None  # Let database default handle this
    
    @field_validator('password')
    @classmethod
    def validate_password(cls, v: str) -> str:
        """Ensure password is within bcrypt's 72-byte limit."""
        if len(v.encode('utf-8')) > 72:
            raise ValueError('Password cannot be longer than 72 bytes')
        return v
    


class UserUpdate(schemas.BaseUserUpdate):
    """Schema for updating users - all fields optional."""
    leetcode_username: Optional[str] = None
    user_elo: Optional[int] = None
    leetcode_hash: Optional[str] = None
    repeating_questions: Optional[bool] = False 
    difficulty: Optional[str] = None
    topics: Optional[str] = None
    winstreak: Optional[int] = None