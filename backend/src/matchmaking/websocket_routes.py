# src/matchmaking/websocket_routes.py
import json
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from ..database.database import get_db
from ..database.models import User
from .websocket_manager import websocket_manager

router = APIRouter()

@router.websocket("/ws/test")
async def test_websocket(websocket: WebSocket):
    """Simple WebSocket test endpoint"""
    await websocket.accept()
    try:
        while True:
            data = await websocket.receive_text()
            await websocket.send_text(f"Echo: {data}")
    except WebSocketDisconnect:
        print("Test WebSocket disconnected")

@router.websocket("/ws/matchmaking/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: int):
    """WebSocket endpoint for matchmaking"""
    
    try:
        # Accept connection first
        await websocket.accept()
        print(f"🔌 WebSocket connection accepted for user {user_id}")
        
        # Connect user to manager
        await websocket_manager.connect(websocket, user_id)
        
        # Send connection confirmation
        await websocket_manager.send_to_user(user_id, {
            "type": "connected",
            "message": "WebSocket connected successfully"
        })
        
        # Check if user already has an active match (from friend match request)
        from ..database.database import AsyncSessionLocal
        from ..database.models import MatchHistory
        from sqlalchemy import and_, or_
        
        async with AsyncSessionLocal() as db:
            # Check for active match
            active_match_result = await db.execute(
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
            active_match = active_match_result.scalar_one_or_none()
            
            if active_match:
                print(f"🎮 User {user_id} has an active match {active_match.match_id}, sending match_found")
                
                # Get opponent info
                opponent_id = active_match.loser_id if active_match.winner_id == user_id else active_match.winner_id
                opponent_result = await db.execute(select(User).where(User.id == opponent_id))
                opponent = opponent_result.scalar_one_or_none()
                
                # Get problem from websocket manager
                problem = websocket_manager.match_problems.get(active_match.match_id)
                
                if opponent and problem:
                    # Send match_found message
                    await websocket_manager.send_to_user(user_id, {
                        "type": "match_found",
                        "match_id": active_match.match_id,
                        "problem": problem.dict(),
                        "opponent": {
                            "username": opponent.leetcode_username or opponent.email,
                            "elo": opponent.user_elo,
                            "profile_picture_url": opponent.profile_picture_url
                        }
                    })
                    
                    # Check if timer is already running
                    timer_data = websocket_manager.match_timers.get(active_match.match_id)
                    if not timer_data:
                        print(f"⏱️ Starting timer for existing match {active_match.match_id}")
                        websocket_manager.match_timers[active_match.match_id] = {
                            "start_time": None,
                            "players": [active_match.winner_id, active_match.loser_id],
                            "status": "countdown",
                            "countdown": 3
                        }
                        import asyncio
                        asyncio.create_task(websocket_manager.run_match_timer(active_match.match_id))
                    elif timer_data["status"] == "active" and timer_data.get("start_time"):
                        # Timer is already active, send the start timestamp to sync
                        await websocket_manager.send_to_user(user_id, {
                            "type": "timer_update",
                            "phase": "active",
                            "start_timestamp": timer_data["start_time"]
                        })
        
        while True:
            # Receive messages from client
            data = await websocket.receive_text()
            message = json.loads(data)
            print(f"📨 Received message from user {user_id}: {message}")
            
            message_type = message.get("type")
            
            if message_type == "join_queue":
                # Get database session for this operation
                from ..database.database import AsyncSessionLocal
                async with AsyncSessionLocal() as db:
                    # Get user data
                    result = await db.execute(select(User).where(User.id == user_id))
                    user = result.scalar_one_or_none()
                    if user:
                        await websocket_manager.join_queue(user_id, user.user_elo, db)
                    else:
                        await websocket_manager.send_to_user(user_id, {
                            "type": "error",
                            "message": "User not found"
                        })
                        
            elif message_type == "leave_queue":
                await websocket_manager.leave_queue(user_id)
                
            elif message_type == "submit_solution":
                match_id = message.get("match_id")
                frontend_seconds = message.get("frontend_seconds", 0)  # Get frontend timer value
                if match_id:
                    from ..database.database import AsyncSessionLocal
                    async with AsyncSessionLocal() as db:
                        success = await websocket_manager.submit_solution(match_id, user_id, db, frontend_seconds)
                        if not success:
                            await websocket_manager.send_to_user(user_id, {
                                "type": "error",
                                "message": "Failed to submit solution"
                            })
                            
            elif message_type == "resign_match":
                match_id = message.get("match_id")
                frontend_seconds = message.get("frontend_seconds", 0)  # Get frontend timer value
                if match_id:
                    from ..database.database import AsyncSessionLocal
                    async with AsyncSessionLocal() as db:
                        success = await websocket_manager.resign_match(match_id, user_id, db, frontend_seconds)
                        if not success:
                            await websocket_manager.send_to_user(user_id, {
                                "type": "error",
                                "message": "Failed to resign from match"
                            })
                        
            elif message_type == "ping":
                # Heartbeat to keep connection alive
                await websocket_manager.send_to_user(user_id, {"type": "pong"})
                
    except WebSocketDisconnect:
        print(f"🔌 WebSocket disconnected for user {user_id}")
        websocket_manager.disconnect(user_id)
    except Exception as e:
        print(f"❌ WebSocket error for user {user_id}: {e}")
        websocket_manager.disconnect(user_id)