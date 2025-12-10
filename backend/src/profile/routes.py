import os
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from src.profile.service import get_profile_data, update_profile_picture
from src.profile.schemas import ProfileOut
from src.profile.file_service import save_profile_picture, delete_profile_picture, get_profile_picture_url
from src.database.database import get_db
from src.auth.auth import current_user
from src.database.models import User

router = APIRouter(prefix="/api/profile", tags=["Profile"])

@router.get("/{user_id}", response_model=ProfileOut)
async def get_profile(user_id: int, db: AsyncSession = Depends(get_db)):
    data = await get_profile_data(db, user_id)
    if not data:
        raise HTTPException(status_code=404, detail="User not found")
    return data


@router.post("/picture/upload")
async def upload_profile_picture(
    file: UploadFile = File(...),
    user: User = Depends(current_user),
    db: AsyncSession = Depends(get_db)
):
    """Upload a new profile picture for the authenticated user."""
    
    # Delete old profile picture if it exists
    if user.profile_picture_url:
        await delete_profile_picture(user.profile_picture_url)
    
    # Save new profile picture
    file_path = await save_profile_picture(file, user.id)
    
    # Update user record
    await update_profile_picture(db, user.id, file_path)
    
    return {
        "message": "Profile picture uploaded successfully",
        "picture_url": get_profile_picture_url(file_path)
    }


@router.delete("/picture")
async def delete_user_profile_picture(
    user: User = Depends(current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete the authenticated user's profile picture."""
    
    if not user.profile_picture_url:
        raise HTTPException(status_code=404, detail="No profile picture found")
    
    # Delete file
    await delete_profile_picture(user.profile_picture_url)
    
    # Update user record
    await update_profile_picture(db, user.id, None)
    
    return {"message": "Profile picture deleted successfully"}


@router.get("/picture/{filename}")
async def get_profile_picture(filename: str):
    """Serve profile picture files."""
    # Get the project root directory (go up from src/profile/routes.py to project root)
    project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
    file_path = os.path.join(project_root, "backend", "uploads", "profile_pictures", filename)
    
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Picture not found")
    
    return FileResponse(
        file_path,
        media_type="image/jpeg",
        headers={
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0"
        }
    )
