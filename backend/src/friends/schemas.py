# backend/src/friends/schemas.py
from pydantic import BaseModel, ConfigDict
from typing import List, Optional


class FriendRequest(BaseModel):
    """Schema for sending a friend request"""
    target_user_id: int


class FriendResponse(BaseModel):
    """Schema for friend information"""
    user_id: int
    username: str
    leetcode_username: str
    user_elo: int
    profile_picture_url: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)


class FriendRequestResponse(BaseModel):
    """Schema for friend request information"""
    user_id: int
    username: str
    leetcode_username: str
    user_elo: int
    profile_picture_url: Optional[str] = None
    
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
