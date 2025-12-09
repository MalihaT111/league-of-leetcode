# backend/src/friends/routes.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from src.database.database import get_db
from src.friends import service
from src.friends.schemas import (
    FriendRequest,
    FriendsListResponse,
    FriendRequestsResponse,
    MessageResponse,
    FriendResponse
)
from typing import List

router = APIRouter(prefix="/api/friends", tags=["Friends"])


@router.post("/{user_id}/send", response_model=MessageResponse)
async def send_friend_request(
    user_id: int,
    request: FriendRequest,
    db: AsyncSession = Depends(get_db)
):
    """Send a friend request to another user"""
    return await service.send_friend_request(db, user_id, request.target_user_id)


@router.post("/{user_id}/accept/{requester_id}", response_model=MessageResponse)
async def accept_friend_request(
    user_id: int,
    requester_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Accept a friend request"""
    return await service.accept_friend_request(db, user_id, requester_id)


@router.delete("/{user_id}/decline/{requester_id}", response_model=MessageResponse)
async def decline_friend_request(
    user_id: int,
    requester_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Decline a received friend request"""
    return await service.decline_friend_request(db, user_id, requester_id)


@router.delete("/{user_id}/cancel/{target_id}", response_model=MessageResponse)
async def cancel_friend_request(
    user_id: int,
    target_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Cancel a sent friend request"""
    return await service.cancel_friend_request(db, user_id, target_id)


@router.delete("/{user_id}/remove/{friend_id}", response_model=MessageResponse)
async def remove_friend(
    user_id: int,
    friend_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Remove a friend"""
    return await service.remove_friend(db, user_id, friend_id)


@router.get("/{user_id}/list", response_model=List[FriendResponse])
async def get_friends_list(
    user_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Get user's friends list"""
    return await service.get_friends_list(db, user_id)


@router.get("/{user_id}/requests", response_model=FriendRequestsResponse)
async def get_friend_requests(
    user_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Get sent and received friend requests"""
    return await service.get_friend_requests(db, user_id)


@router.get("/{user_id}/search", response_model=List[FriendResponse])
async def search_users(
    user_id: int,
    query: str,
    db: AsyncSession = Depends(get_db)
):
    """Search for users to add as friends"""
    return await service.search_users(db, query, user_id)
