# backend/src/friends/service.py
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_
from fastapi import HTTPException
from typing import List, Optional
from src.database.models import User, Friends
from src.friends.schemas import FriendResponse, FriendRequestResponse
from src.profile.file_service import get_profile_picture_url


async def get_or_create_friends_record(db: AsyncSession, user_id: int) -> Friends:
    """Get or create a friends record for a user"""
    result = await db.execute(select(Friends).where(Friends.user_id == user_id))
    friends_record = result.scalar_one_or_none()
    
    if not friends_record:
        friends_record = Friends(
            user_id=user_id,
            current_friends=[],
            friend_requests_sent=[],
            friend_requests_received=[]
        )
        db.add(friends_record)
        try:
            await db.commit()
            await db.refresh(friends_record)
        except Exception as e:
            # Handle race condition - record was created by another request
            await db.rollback()
            result = await db.execute(select(Friends).where(Friends.user_id == user_id))
            friends_record = result.scalar_one_or_none()
            if not friends_record:
                raise e  # Re-raise if it's a different error
    
    return friends_record


async def send_friend_request(db: AsyncSession, sender_id: int, target_id: int) -> dict:
    """Send a friend request from sender to target user"""
    
    # Validate users exist
    sender_user_result = await db.execute(select(User).where(User.id == sender_id))
    sender_user = sender_user_result.scalar_one_or_none()
    
    target_user_result = await db.execute(select(User).where(User.id == target_id))
    target_user = target_user_result.scalar_one_or_none()
    
    if not sender_user or not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Cannot send request to self
    if sender_id == target_id:
        raise HTTPException(status_code=400, detail="Cannot send friend request to yourself")
    
    # Get or create friends records
    sender_friends = await get_or_create_friends_record(db, sender_id)
    target_friends = await get_or_create_friends_record(db, target_id)
    
    # Check if already friends
    if target_id in (sender_friends.current_friends or []):
        raise HTTPException(status_code=400, detail="Already friends with this user")
    
    # Check if request already sent
    if target_id in (sender_friends.friend_requests_sent or []):
        raise HTTPException(status_code=400, detail="Friend request already sent")
    
    # Check if target already sent request to sender (mutual request)
    if target_id in (sender_friends.friend_requests_received or []):
        raise HTTPException(status_code=400, detail="This user already sent you a friend request. Accept it instead.")
    
    # Add to sender's sent requests
    if sender_friends.friend_requests_sent is None:
        sender_friends.friend_requests_sent = []
    sender_friends.friend_requests_sent.append(target_id)
    
    # Add to target's received requests
    if target_friends.friend_requests_received is None:
        target_friends.friend_requests_received = []
    target_friends.friend_requests_received.append(sender_id)
    
    await db.commit()
    
    return {"message": f"Friend request sent to {target_user.username}"}


async def accept_friend_request(db: AsyncSession, user_id: int, requester_id: int) -> dict:
    """Accept a friend request"""
    
    # Validate users exist
    user_result = await db.execute(select(User).where(User.id == user_id))
    user = user_result.scalar_one_or_none()
    
    requester_result = await db.execute(select(User).where(User.id == requester_id))
    requester = requester_result.scalar_one_or_none()
    
    if not user or not requester:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get friends records
    user_friends = await get_or_create_friends_record(db, user_id)
    requester_friends = await get_or_create_friends_record(db, requester_id)
    
    # Check if request exists
    if requester_id not in (user_friends.friend_requests_received or []):
        raise HTTPException(status_code=400, detail="No friend request from this user")
    
    # Remove from received requests
    user_friends.friend_requests_received.remove(requester_id)
    
    # Remove from requester's sent requests
    if user_id in (requester_friends.friend_requests_sent or []):
        requester_friends.friend_requests_sent.remove(user_id)
    
    # Add to both users' friends lists
    if user_friends.current_friends is None:
        user_friends.current_friends = []
    user_friends.current_friends.append(requester_id)
    
    if requester_friends.current_friends is None:
        requester_friends.current_friends = []
    requester_friends.current_friends.append(user_id)
    
    await db.commit()
    
    return {"message": f"You are now friends with {requester.username}"}


async def decline_friend_request(db: AsyncSession, user_id: int, requester_id: int) -> dict:
    """Decline/delete a received friend request"""
    
    # Validate users exist
    user_result = await db.execute(select(User).where(User.id == user_id))
    user = user_result.scalar_one_or_none()
    
    requester_result = await db.execute(select(User).where(User.id == requester_id))
    requester = requester_result.scalar_one_or_none()
    
    if not user or not requester:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get friends records
    user_friends = await get_or_create_friends_record(db, user_id)
    requester_friends = await get_or_create_friends_record(db, requester_id)
    
    # Check if request exists
    if requester_id not in (user_friends.friend_requests_received or []):
        raise HTTPException(status_code=400, detail="No friend request from this user")
    
    # Remove from received requests
    user_friends.friend_requests_received.remove(requester_id)
    
    # Remove from requester's sent requests
    if user_id in (requester_friends.friend_requests_sent or []):
        requester_friends.friend_requests_sent.remove(user_id)
    
    await db.commit()
    
    return {"message": "Friend request declined"}


async def cancel_friend_request(db: AsyncSession, sender_id: int, target_id: int) -> dict:
    """Cancel a sent friend request"""
    
    # Validate users exist
    sender_result = await db.execute(select(User).where(User.id == sender_id))
    sender = sender_result.scalar_one_or_none()
    
    target_result = await db.execute(select(User).where(User.id == target_id))
    target = target_result.scalar_one_or_none()
    
    if not sender or not target:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get friends records
    sender_friends = await get_or_create_friends_record(db, sender_id)
    target_friends = await get_or_create_friends_record(db, target_id)
    
    # Check if request exists
    if target_id not in (sender_friends.friend_requests_sent or []):
        raise HTTPException(status_code=400, detail="No friend request sent to this user")
    
    # Remove from sender's sent requests
    sender_friends.friend_requests_sent.remove(target_id)
    
    # Remove from target's received requests
    if sender_id in (target_friends.friend_requests_received or []):
        target_friends.friend_requests_received.remove(sender_id)
    
    await db.commit()
    
    return {"message": "Friend request cancelled"}


async def remove_friend(db: AsyncSession, user_id: int, friend_id: int) -> dict:
    """Remove a friend from both users' friends lists and cancel pending match requests"""
    from sqlalchemy import update
    from src.database.models import FriendMatchRequest
    from datetime import datetime
    
    # Validate users exist
    user_result = await db.execute(select(User).where(User.id == user_id))
    user = user_result.scalar_one_or_none()
    
    friend_result = await db.execute(select(User).where(User.id == friend_id))
    friend = friend_result.scalar_one_or_none()
    
    if not user or not friend:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get friends records
    user_friends = await get_or_create_friends_record(db, user_id)
    friend_friends = await get_or_create_friends_record(db, friend_id)
    
    # Check if they are friends
    if friend_id not in (user_friends.current_friends or []):
        raise HTTPException(status_code=400, detail="Not friends with this user")
    
    # Remove from both friends lists
    # Create new lists to ensure SQLAlchemy detects the change
    user_friends.current_friends = [f for f in user_friends.current_friends if f != friend_id]
    from sqlalchemy.orm.attributes import flag_modified
    flag_modified(user_friends, "current_friends")
    
    if user_id in (friend_friends.current_friends or []):
        friend_friends.current_friends = [f for f in friend_friends.current_friends if f != user_id]
        flag_modified(friend_friends, "current_friends")
    
    # Cancel any pending match requests between these users
    now = datetime.utcnow()
    await db.execute(
        update(FriendMatchRequest)
        .where(
            and_(
                or_(
                    and_(
                        FriendMatchRequest.sender_id == user_id,
                        FriendMatchRequest.receiver_id == friend_id
                    ),
                    and_(
                        FriendMatchRequest.sender_id == friend_id,
                        FriendMatchRequest.receiver_id == user_id
                    )
                ),
                FriendMatchRequest.status == 'PENDING'
            )
        )
        .values(status='CANCELLED', responded_at=now)
    )
    
    await db.commit()
    
    return {"message": f"Removed {friend.username} from friends"}


async def get_friends_list(db: AsyncSession, user_id: int) -> List[FriendResponse]:
    """Get list of user's friends"""
    
    user_result = await db.execute(select(User).where(User.id == user_id))
    user = user_result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get friends record
    user_friends = await get_or_create_friends_record(db, user_id)
    
    if not user_friends.current_friends:
        return []
    
    # Fetch friend details
    friends_result = await db.execute(
        select(User).where(User.id.in_(user_friends.current_friends))
    )
    friends = friends_result.scalars().all()
    
    return [
        FriendResponse(
            user_id=friend.id,
            username=friend.username,
            leetcode_username=friend.leetcode_username or "",
            user_elo=friend.user_elo,
            profile_picture_url=get_profile_picture_url(friend.profile_picture_url)
        )
        for friend in friends
    ]


async def get_friend_requests(db: AsyncSession, user_id: int) -> dict:
    """Get sent and received friend requests"""
    
    user_result = await db.execute(select(User).where(User.id == user_id))
    user = user_result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get friends record
    user_friends = await get_or_create_friends_record(db, user_id)
    
    sent_requests = []
    received_requests = []
    
    # Get sent requests details
    if user_friends.friend_requests_sent:
        sent_result = await db.execute(
            select(User).where(User.id.in_(user_friends.friend_requests_sent))
        )
        sent_users = sent_result.scalars().all()
        sent_requests = [
            FriendRequestResponse(
                user_id=u.id,
                username=u.username,
                leetcode_username=u.leetcode_username or "",
                user_elo=u.user_elo,
                profile_picture_url=get_profile_picture_url(u.profile_picture_url)
            )
            for u in sent_users
        ]
    
    # Get received requests details
    if user_friends.friend_requests_received:
        received_result = await db.execute(
            select(User).where(User.id.in_(user_friends.friend_requests_received))
        )
        received_users = received_result.scalars().all()
        received_requests = [
            FriendRequestResponse(
                user_id=u.id,
                username=u.username,
                leetcode_username=u.leetcode_username or "",
                user_elo=u.user_elo,
                profile_picture_url=get_profile_picture_url(u.profile_picture_url)
            )
            for u in received_users
        ]
    
    return {
        "sent": sent_requests,
        "received": received_requests
    }


async def search_users(db: AsyncSession, query: str, current_user_id: int) -> List[FriendResponse]:
    """Search for users by username or leetcode_username"""
    
    if len(query) < 2:
        raise HTTPException(status_code=400, detail="Search query must be at least 2 characters")
    
    # Search for users (excluding current user)
    result = await db.execute(
        select(User).where(
            (User.email.ilike(f"%{query}%") | User.leetcode_username.ilike(f"%{query}%"))
            & (User.id != current_user_id)
        ).limit(20)
    )
    users = result.scalars().all()
    
    return [
        FriendResponse(
            user_id=user.id,
            username=user.username,
            leetcode_username=user.leetcode_username or "",
            user_elo=user.user_elo,
            profile_picture_url=get_profile_picture_url(user.profile_picture_url)
        )
        for user in users
    ]
