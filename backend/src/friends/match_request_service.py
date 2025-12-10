# backend/src/friends/match_request_service.py
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, update
from sqlalchemy.exc import IntegrityError
from fastapi import HTTPException
from datetime import datetime, timedelta
from typing import List, Optional
import asyncio
from src.database.models import User, Friends, FriendMatchRequest, MatchHistory
from src.matchmaking.service import create_match_record
from src.matchmaking.manager import MatchmakingManager, MATCHMAKING_KEY

REQUEST_EXPIRY_MINUTES = 5  # Requests expire after 5 minutes


async def send_match_request(db: AsyncSession, sender_id: int, receiver_id: int) -> dict:
    """Send a match request to a friend"""
    
    # Validate both users exist
    sender = await db.execute(select(User).where(User.id == sender_id))
    sender_user = sender.scalar_one_or_none()
    
    receiver = await db.execute(select(User).where(User.id == receiver_id))
    receiver_user = receiver.scalar_one_or_none()
    
    if not sender_user or not receiver_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if they are friends
    sender_friends = await db.execute(select(Friends).where(Friends.user_id == sender_id))
    friends_record = sender_friends.scalar_one_or_none()
    
    if not friends_record or receiver_id not in (friends_record.current_friends or []):
        raise HTTPException(status_code=400, detail="You can only send match requests to friends")
    
    # Check if sender has any pending outgoing requests
    pending_sent = await db.execute(
        select(FriendMatchRequest).where(
            and_(
                FriendMatchRequest.sender_id == sender_id,
                FriendMatchRequest.status == 'PENDING'
            )
        )
    )
    if pending_sent.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="You already have a pending match request")
    
    # Check if receiver has any pending incoming requests (they need to respond first)
    pending_received = await db.execute(
        select(FriendMatchRequest).where(
            and_(
                FriendMatchRequest.receiver_id == receiver_id,
                FriendMatchRequest.status == 'PENDING'
            )
        )
    )
    if pending_received.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="This friend already has a pending match request")
    
    # Check if either user is currently in a match
    active_match_sender = await db.execute(
        select(MatchHistory).where(
            and_(
                or_(
                    MatchHistory.winner_id == sender_id,
                    MatchHistory.loser_id == sender_id
                ),
                MatchHistory.leetcode_problem == "TBD",
                MatchHistory.elo_change == 0
            )
        )
    )
    if active_match_sender.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="You are currently in an active match")
    
    active_match_receiver = await db.execute(
        select(MatchHistory).where(
            and_(
                or_(
                    MatchHistory.winner_id == receiver_id,
                    MatchHistory.loser_id == receiver_id
                ),
                MatchHistory.leetcode_problem == "TBD",
                MatchHistory.elo_change == 0
            )
        )
    )
    if active_match_receiver.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Your friend is currently in an active match")
    
    # Check if sender is in matchmaking queue
    manager = MatchmakingManager()
    redis = await manager.connect()
    sender_in_queue = await redis.zscore(MATCHMAKING_KEY, sender_id)
    
    if sender_in_queue is not None:
        raise HTTPException(
            status_code=400,
            detail="Cannot send match request while in matchmaking queue. Please leave queue first."
        )
    
    # Check if receiver is in matchmaking queue
    receiver_in_queue = await redis.zscore(MATCHMAKING_KEY, receiver_id)
    
    if receiver_in_queue is not None:
        raise HTTPException(
            status_code=400,
            detail="Your friend is currently in the matchmaking queue"
        )
    
    # Check for mutual pending requests (race condition)
    mutual_request = await db.execute(
        select(FriendMatchRequest).where(
            and_(
                FriendMatchRequest.sender_id == receiver_id,
                FriendMatchRequest.receiver_id == sender_id,
                FriendMatchRequest.status == 'PENDING'
            )
        )
    )
    existing_mutual = mutual_request.scalar_one_or_none()
    
    if existing_mutual:
        # Auto-accept the existing request instead of creating a new one
        return await accept_match_request(db, existing_mutual.request_id, sender_id)
    
    # Create the match request with retry logic
    max_retries = 3
    for attempt in range(max_retries):
        try:
            now = datetime.utcnow()
            expires_at = now + timedelta(minutes=REQUEST_EXPIRY_MINUTES)
            
            match_request = FriendMatchRequest(
                sender_id=sender_id,
                receiver_id=receiver_id,
                status='PENDING',
                created_at=now,
                expires_at=expires_at
            )
            
            db.add(match_request)
            await db.commit()
            await db.refresh(match_request)
            
            return {
                "message": f"Match request sent to {receiver_user.leetcode_username or receiver_user.email}",
                "request_id": match_request.request_id,
                "expires_at": expires_at.isoformat()
            }
            
        except IntegrityError:
            await db.rollback()
            
            # Check if the other user just sent a request
            mutual_check = await db.execute(
                select(FriendMatchRequest).where(
                    and_(
                        FriendMatchRequest.sender_id == receiver_id,
                        FriendMatchRequest.receiver_id == sender_id,
                        FriendMatchRequest.status == 'PENDING'
                    )
                )
            )
            mutual_req = mutual_check.scalar_one_or_none()
            
            if mutual_req:
                # Auto-accept the other user's request
                return await accept_match_request(db, mutual_req.request_id, sender_id)
            
            if attempt == max_retries - 1:
                raise HTTPException(status_code=500, detail="Failed to send request")
            
            await asyncio.sleep(0.1 * (attempt + 1))


async def accept_match_request(db: AsyncSession, request_id: int, user_id: int) -> dict:
    """Accept a match request and create a match"""
    
    # Get the request
    result = await db.execute(
        select(FriendMatchRequest).where(FriendMatchRequest.request_id == request_id)
    )
    request = result.scalar_one_or_none()
    
    if not request:
        raise HTTPException(status_code=404, detail="Match request not found")
    
    # Verify user is the receiver
    if request.receiver_id != user_id:
        raise HTTPException(status_code=403, detail="You can only accept requests sent to you")
    
    # Check if request is still pending
    if request.status != 'PENDING':
        raise HTTPException(status_code=400, detail=f"Request is already {request.status.lower()}")
    
    # Check if request has expired
    if datetime.utcnow() > request.expires_at:
        request.status = 'EXPIRED'
        request.responded_at = datetime.utcnow()
        await db.commit()
        raise HTTPException(status_code=400, detail="Match request has expired")
    
    # Get both users
    sender = await db.execute(select(User).where(User.id == request.sender_id))
    sender_user = sender.scalar_one_or_none()
    
    receiver = await db.execute(select(User).where(User.id == request.receiver_id))
    receiver_user = receiver.scalar_one_or_none()
    
    if not sender_user or not receiver_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Create the match
    match_record = await create_match_record(db, sender_user, receiver_user)
    
    if not match_record:
        raise HTTPException(status_code=500, detail="Failed to create match")
    
    match = match_record["match"]
    problem = match_record["problem"]
    
    # Update request status
    request.status = 'ACCEPTED'
    request.responded_at = datetime.utcnow()
    request.match_id = match.match_id
    
    await db.commit()
    
    # Notify both players via WebSocket if they're connected
    from src.matchmaking.websocket_manager import websocket_manager
    
    # Store problem for this match
    websocket_manager.match_problems[match.match_id] = problem
    
    # Initialize match timer
    websocket_manager.match_timers[match.match_id] = {
        "start_time": None,
        "players": [sender_user.id, receiver_user.id],
        "status": "countdown",
        "countdown": 3
    }
    
    # Prepare match data
    match_data = {
        "type": "match_found",
        "match_id": match.match_id,
        "problem": problem.dict(),
    }
    
    # Send to sender
    await websocket_manager.send_to_user(sender_user.id, {
        **match_data,
        "opponent": {
            "username": receiver_user.leetcode_username or receiver_user.email,
            "elo": receiver_user.user_elo
        }
    })
    
    # Send to receiver
    await websocket_manager.send_to_user(receiver_user.id, {
        **match_data,
        "opponent": {
            "username": sender_user.leetcode_username or sender_user.email,
            "elo": sender_user.user_elo
        }
    })
    
    # Start countdown timer for this match
    import asyncio
    asyncio.create_task(websocket_manager.run_match_timer(match.match_id))
    
    return {
        "message": "Match request accepted",
        "request_id": request.request_id,
        "match_id": match.match_id,
        "problem": problem.dict() if problem else {},
        "sender_id": sender_user.id,
        "receiver_id": receiver_user.id
    }


async def reject_match_request(db: AsyncSession, request_id: int, user_id: int) -> dict:
    """Reject a match request"""
    
    result = await db.execute(
        select(FriendMatchRequest).where(FriendMatchRequest.request_id == request_id)
    )
    request = result.scalar_one_or_none()
    
    if not request:
        raise HTTPException(status_code=404, detail="Match request not found")
    
    if request.receiver_id != user_id:
        raise HTTPException(status_code=403, detail="You can only reject requests sent to you")
    
    if request.status != 'PENDING':
        raise HTTPException(status_code=400, detail=f"Request is already {request.status.lower()}")
    
    request.status = 'REJECTED'
    request.responded_at = datetime.utcnow()
    
    await db.commit()
    
    return {
        "message": "Match request rejected",
        "request_id": request.request_id
    }


async def cancel_match_request(db: AsyncSession, request_id: int, user_id: int) -> dict:
    """Cancel a sent match request"""
    
    result = await db.execute(
        select(FriendMatchRequest).where(FriendMatchRequest.request_id == request_id)
    )
    request = result.scalar_one_or_none()
    
    if not request:
        raise HTTPException(status_code=404, detail="Match request not found")
    
    if request.sender_id != user_id:
        raise HTTPException(status_code=403, detail="You can only cancel requests you sent")
    
    if request.status != 'PENDING':
        raise HTTPException(status_code=400, detail=f"Request is already {request.status.lower()}")
    
    request.status = 'CANCELLED'
    request.responded_at = datetime.utcnow()
    
    await db.commit()
    
    return {
        "message": "Match request cancelled",
        "request_id": request.request_id
    }


async def get_pending_requests(db: AsyncSession, user_id: int) -> dict:
    """Get all pending match requests for a user (sent and received)"""
    from src.profile.file_service import get_profile_picture_url
    
    # Get sent requests
    sent_result = await db.execute(
        select(FriendMatchRequest, User).join(
            User, FriendMatchRequest.receiver_id == User.id
        ).where(
            and_(
                FriendMatchRequest.sender_id == user_id,
                FriendMatchRequest.status == 'PENDING'
            )
        )
    )
    sent_requests = sent_result.all()
    
    # Get received requests
    received_result = await db.execute(
        select(FriendMatchRequest, User).join(
            User, FriendMatchRequest.sender_id == User.id
        ).where(
            and_(
                FriendMatchRequest.receiver_id == user_id,
                FriendMatchRequest.status == 'PENDING'
            )
        )
    )
    received_requests = received_result.all()
    
    # Clean up expired requests
    now = datetime.utcnow()
    for req, _ in sent_requests + received_requests:
        if now > req.expires_at:
            req.status = 'EXPIRED'
            req.responded_at = now
    await db.commit()
    
    return {
        "sent": [
            {
                "request_id": req.request_id,
                "user_id": user.id,
                "username": user.username,
                "leetcode_username": user.leetcode_username or "",
                "user_elo": user.user_elo,
                "profile_picture_url": get_profile_picture_url(user.profile_picture_url),
                "created_at": req.created_at.isoformat(),
                "expires_at": req.expires_at.isoformat()
            }
            for req, user in sent_requests if req.status == 'PENDING'
        ],
        "received": [
            {
                "request_id": req.request_id,
                "user_id": user.id,
                "username": user.username,
                "leetcode_username": user.leetcode_username or "",
                "user_elo": user.user_elo,
                "profile_picture_url": get_profile_picture_url(user.profile_picture_url),
                "created_at": req.created_at.isoformat(),
                "expires_at": req.expires_at.isoformat()
            }
            for req, user in received_requests if req.status == 'PENDING'
        ]
    }


async def cleanup_expired_requests(db: AsyncSession):
    """Background task to clean up expired requests"""
    now = datetime.utcnow()
    
    # Get all pending requests
    result = await db.execute(
        select(FriendMatchRequest).where(FriendMatchRequest.status == 'PENDING')
    )
    pending_requests = result.scalars().all()
    
    # Expire old requests
    for request in pending_requests:
        if now > request.expires_at:
            request.status = 'EXPIRED'
            request.responded_at = now
    
    await db.commit()


async def get_user_match_state(db: AsyncSession, user_id: int) -> dict:
    """Get comprehensive match state for a user"""
    
    # Check for active match
    active_match = await db.execute(
        select(MatchHistory).where(
            and_(
                or_(
                    MatchHistory.winner_id == user_id,
                    MatchHistory.loser_id == user_id
                ),
                MatchHistory.leetcode_problem == "TBD",
                MatchHistory.elo_change == 0
            )
        )
    )
    active_match_record = active_match.scalar_one_or_none()
    in_active_match = active_match_record is not None
    
    # Check for pending match requests
    pending_sent = await db.execute(
        select(FriendMatchRequest).where(
            and_(
                FriendMatchRequest.sender_id == user_id,
                FriendMatchRequest.status == 'PENDING'
            )
        )
    )
    has_pending_sent = pending_sent.scalar_one_or_none()
    
    pending_received = await db.execute(
        select(FriendMatchRequest).where(
            and_(
                FriendMatchRequest.receiver_id == user_id,
                FriendMatchRequest.status == 'PENDING'
            )
        )
    )
    has_pending_received = pending_received.scalars().all()
    
    # Check if in queue
    manager = MatchmakingManager()
    redis = await manager.connect()
    in_queue = await redis.zscore(MATCHMAKING_KEY, user_id) is not None
    
    return {
        "user_id": user_id,
        "in_active_match": in_active_match,
        "active_match_id": active_match_record.match_id if active_match_record else None,
        "in_queue": in_queue,
        "has_pending_sent_request": has_pending_sent is not None,
        "pending_sent_request_id": has_pending_sent.request_id if has_pending_sent else None,
        "pending_received_requests": [
            {
                "request_id": req.request_id,
                "sender_id": req.sender_id,
                "expires_at": req.expires_at.isoformat()
            }
            for req in has_pending_received
        ],
        "can_send_match_request": not (in_active_match or in_queue or has_pending_sent),
        "can_join_queue": not (in_active_match or has_pending_sent or has_pending_received)
    }


async def get_user_match_state(db: AsyncSession, user_id: int) -> dict:
    """Get comprehensive match state for a user"""
    
    # Check for active match
    active_match = await db.execute(
        select(MatchHistory).where(
            and_(
                or_(
                    MatchHistory.winner_id == user_id,
                    MatchHistory.loser_id == user_id
                ),
                MatchHistory.leetcode_problem == "TBD",
                MatchHistory.elo_change == 0
            )
        )
    )
    in_active_match = active_match.scalar_one_or_none() is not None
    
    # Check for pending match requests
    pending_sent = await db.execute(
        select(FriendMatchRequest).where(
            and_(
                FriendMatchRequest.sender_id == user_id,
                FriendMatchRequest.status == 'PENDING'
            )
        )
    )
    has_pending_sent = pending_sent.scalar_one_or_none()
    
    pending_received = await db.execute(
        select(FriendMatchRequest).where(
            and_(
                FriendMatchRequest.receiver_id == user_id,
                FriendMatchRequest.status == 'PENDING'
            )
        )
    )
    has_pending_received = pending_received.scalars().all()
    
    # Check if in queue
    manager = MatchmakingManager()
    redis = await manager.connect()
    in_queue = await redis.zscore(MATCHMAKING_KEY, user_id) is not None
    
    return {
        "user_id": user_id,
        "in_active_match": in_active_match,
        "in_queue": in_queue,
        "has_pending_sent_request": has_pending_sent is not None,
        "pending_sent_request_id": has_pending_sent.request_id if has_pending_sent else None,
        "pending_received_requests": [
            {
                "request_id": req.request_id,
                "sender_id": req.sender_id,
                "expires_at": req.expires_at
            }
            for req in has_pending_received
        ],
        "can_send_match_request": not (in_active_match or in_queue or has_pending_sent),
        "can_join_queue": not (in_active_match or has_pending_sent or has_pending_received)
    }
