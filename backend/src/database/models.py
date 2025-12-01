"""
Database models for the application.
"""
from sqlalchemy.ext.mutable import MutableList
from fastapi_users.db import SQLAlchemyBaseUserTable
from sqlalchemy import Column, Integer, String, Boolean, Float, Text, JSON, Enum, ForeignKey
from src.database.database import Base
import enum


class User(SQLAlchemyBaseUserTable[int], Base):
    """
    User model that matches your existing users table structure
    with additional FastAPI-users required fields.
    """
    __tablename__ = "users"

    # FastAPI-users required fields mapped to actual database columns
    id = Column("user_id", Integer, primary_key=True, index=True, autoincrement=True)
    email = Column("username", String(50), unique=True, nullable=False, index=True)  # username serves as email
    hashed_password = Column("password_hash", String(255), nullable=False)
    
    # Your existing custom fields (matching actual database schema)
    leetcode_hash = Column(String(255), nullable=True)
    leetcode_username = Column(String(50), nullable=True)  # Based on your schema
    user_elo = Column(Integer, default=1200)
    repeating_questions = Column(Boolean, default=False, nullable=False)
    difficulty = Column(MutableList.as_mutable(JSON), default=lambda: [1, 2, 3], nullable=False)
    topics = Column(MutableList.as_mutable(JSON), default=lambda: [i for i in range(0, 71)], nullable=False)
    winstreak = Column(Integer, default=0, nullable=False)  # Win streak counter
    
    # FastAPI-users required fields (need to be added to your database)
    is_active = Column(Boolean, default=True, nullable=False)
    is_superuser = Column(Boolean, default=False, nullable=False)
    is_verified = Column(Boolean, default=True, nullable=False)
    
    # Additional properties to access database column names directly
    @property
    def user_id(self):
        return self.id
    
    @user_id.setter
    def user_id(self, value):
        self.id = value
    
    @property
    def username(self):
        return self.email
    
    @username.setter
    def username(self, value):
        self.email = value
    
    @property
    def password_hash(self):
        return self.hashed_password
    
    @password_hash.setter
    def password_hash(self, value):
        self.hashed_password = value

class Friends(Base):
    __tablename__ = "friends"
    
    user_id = Column(Integer, ForeignKey("users.user_id"), primary_key=True, nullable=False)
    current_friends = Column(MutableList.as_mutable(JSON), default=list, nullable=False)
    friend_requests_sent = Column(MutableList.as_mutable(JSON), default=list, nullable=False)
    friend_requests_received = Column(MutableList.as_mutable(JSON), default=list, nullable=False)


class MatchHistory(Base):
    __tablename__ = "match_history"

    match_id = Column(Integer, primary_key=True, autoincrement=True)
    winner_id = Column(Integer, ForeignKey("users.user_id"), nullable=False, index=True)
    loser_id = Column(Integer, ForeignKey("users.user_id"), nullable=False, index=True)
    leetcode_problem = Column(String(255), nullable=False)
    
    # ELO tracking columns
    elo_change = Column(Integer, nullable=False)  # Keep for backward compatibility
    winner_elo_change = Column(Integer, nullable=True)  # New: Winner's actual ELO gain
    loser_elo_change = Column(Integer, nullable=True)   # New: Loser's actual ELO loss (negative)
    winner_elo = Column(Integer, nullable=False)  # Winner's ELO after match
    loser_elo = Column(Integer, nullable=False)   # Loser's ELO after match
    
    match_seconds = Column(Integer, nullable=False)
    winner_runtime = Column(Integer, nullable=False)
    loser_runtime = Column(Integer, nullable=False)
    winner_memory = Column(Float, nullable=False)
    loser_memory = Column(Float, nullable=False)
    winner_code = Column(Text, nullable=True)
    loser_code = Column(Text, nullable=True)
    
# backend/src/database/models.py