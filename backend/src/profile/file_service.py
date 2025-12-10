"""
Profile picture file handling service.
"""
import os
import uuid
import io
from typing import Optional
from fastapi import UploadFile, HTTPException
from PIL import Image
import aiofiles

# Configuration
# Get project root: go up from src/profile/file_service.py to project root
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
UPLOAD_DIR = os.path.join(PROJECT_ROOT, "backend", "uploads", "profile_pictures")
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
IMAGE_SIZE = (300, 300)  # Resize to 300x300 pixels

# Ensure upload directory exists
os.makedirs(UPLOAD_DIR, exist_ok=True)


async def save_profile_picture(file: UploadFile, user_id: int) -> str:
    """
    Save and process a profile picture file.
    
    Args:
        file: The uploaded file
        user_id: ID of the user uploading the picture
        
    Returns:
        str: The file path relative to the backend directory
        
    Raises:
        HTTPException: If file validation fails
    """
    # Validate file
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")
    
    # Check file extension
    file_ext = os.path.splitext(file.filename)[1].lower()
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400, 
            detail=f"Invalid file type. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"
        )
    
    # Check file size
    file_content = await file.read()
    if len(file_content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400, 
            detail=f"File too large. Maximum size: {MAX_FILE_SIZE // (1024*1024)}MB"
        )
    
    # Generate unique filename
    file_id = str(uuid.uuid4())
    filename = f"{user_id}_{file_id}{file_ext}"
    file_path = os.path.join(UPLOAD_DIR, filename)
    
    try:
        # Save and resize image
        with Image.open(io.BytesIO(file_content)) as img:
            # Convert to RGB if necessary (for PNG with transparency)
            if img.mode in ("RGBA", "P"):
                img = img.convert("RGB")
            
            # Resize maintaining aspect ratio
            img.thumbnail(IMAGE_SIZE, Image.Resampling.LANCZOS)
            
            # Create a square image with white background
            square_img = Image.new("RGB", IMAGE_SIZE, (255, 255, 255))
            
            # Center the resized image
            x = (IMAGE_SIZE[0] - img.width) // 2
            y = (IMAGE_SIZE[1] - img.height) // 2
            square_img.paste(img, (x, y))
            
            # Save the processed image
            square_img.save(file_path, "JPEG", quality=85, optimize=True)
    
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid image file: {str(e)}")
    
    # Return relative path for database storage
    return f"uploads/profile_pictures/{filename}"


async def delete_profile_picture(file_path: Optional[str]) -> None:
    """
    Delete a profile picture file.
    
    Args:
        file_path: The file path to delete (relative to project root)
    """
    if not file_path:
        return
    
    # Get the project root directory
    project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
    full_path = os.path.join(project_root, "backend", file_path)
    if os.path.exists(full_path):
        try:
            os.remove(full_path)
        except OSError:
            pass  # Ignore deletion errors


def get_profile_picture_url(file_path: Optional[str], base_url: str = "") -> Optional[str]:
    """
    Generate a URL for accessing a profile picture.
    
    Args:
        file_path: The file path stored in database
        base_url: Base URL for the API
        
    Returns:
        str: Full URL to access the image, or None if no image
    """
    if not file_path:
        return None
    
    import time
    # Add cache-busting timestamp to ensure fresh image loads
    timestamp = int(time.time())
    
    # Use full URL with localhost for frontend compatibility
    if not base_url:
        base_url = "http://127.0.0.1:8000"
    
    return f"{base_url}/api/profile/picture/{os.path.basename(file_path)}?t={timestamp}"