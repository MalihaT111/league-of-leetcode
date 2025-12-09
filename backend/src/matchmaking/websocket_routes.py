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