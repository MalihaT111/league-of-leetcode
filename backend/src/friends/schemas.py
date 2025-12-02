# backend/src/friends/schemas.py
from pydantic import BaseModel, ConfigDict
from typing import List, Optional
from enum import Enum


class FriendRequest(BaseModel):
    """Schema for sending a friend request"""
    target_user_id: int


class FriendResponse(BaseModel):
    """Schema for friend information"""
    user_id: int
    username: str
    leetcode_username: str
    user_elo: int
    
    model_config = ConfigDict(from_attributes=True)


class FriendRequestResponse(BaseModel):
    """Schema for friend request information"""
    user_id: int
    username: str
    leetcode_username: str
    user_elo: int
    
    model_config = ConfigDict(from_attributes=True)


class FriendsListResponse(BaseModel):
    """Schema for friends list"""
    friends: List[FriendResponse]
    
    model_config = ConfigDict(from_attributes=True)


class FriendRequestsResponse(BaseModel):
    """Schema for friend requests"""
    sent: List[FriendRequestResponse]
    received: List[FriendRequestResponse]
    
    model_config = ConfigDict(from_attributes=True)


class MessageResponse(BaseModel):
    """Generic message response"""
    message: str


# Match request schemas
class MatchRequestStatus(str, Enum):
    PENDING = "PENDING"
    ACCEPTED = "ACCEPTED"
    REJECTED = "REJECTED"
    CANCELLED = "CANCELLED"
    EXPIRED = "EXPIRED"


class SendMatchRequestSchema(BaseModel):
    """Schema for sending a match request"""
    friend_id: int


class MatchRequestResponse(BaseModel):
    """Schema for match request information"""
    request_id: int
    sender_id: int
    receiver_id: int
    sender_username: str
    receiver_username: str
    sender_elo: int
    receiver_elo: int
    status: str
    created_at: str
    expires_at: str


class MatchRequestActionResponse(BaseModel):
    """Schema for match request action response"""
    message: str
    request_id: int
    match_id: Optional[int] = None
    problem: Optional[dict] = None
    expires_at: Optional[str] = None
