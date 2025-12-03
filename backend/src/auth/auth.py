"""
Complete FastAPI-users authentication setup.
Everything you need for auth in one file.
"""

import os
import secrets
from typing import Optional
from fastapi import Depends, Request
from fastapi_users import BaseUserManager, FastAPIUsers, IntegerIDMixin
from fastapi_users.authentication import (
    AuthenticationBackend,
    BearerTransport,
    JWTStrategy,
)
from fastapi_users.db import SQLAlchemyUserDatabase
from fastapi_users.password import PasswordHelper
from sqlalchemy.ext.asyncio import AsyncSession
from dotenv import load_dotenv
from passlib.context import CryptContext

from src.database.models import User
from src.auth.schemas import UserCreate, UserRead
from src.database.database import get_db

load_dotenv()

# Configuration
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-in-production")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "3000"))

# Configure password context with bcrypt
try:
    # Try to configure bcrypt with explicit backend
    password_context = CryptContext(
        schemes=["bcrypt"], 
        deprecated="auto",
        bcrypt__rounds=12
    )
    password_helper = PasswordHelper(password_context)
except Exception as e:
    # Fallback to a simpler configuration
    password_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")
    password_helper = PasswordHelper(password_context)


# User Manager
class UserManager(IntegerIDMixin, BaseUserManager[User, int]):
    reset_password_token_secret = SECRET_KEY
    verification_token_secret = SECRET_KEY

    def __init__(self, user_db: SQLAlchemyUserDatabase):
        super().__init__(user_db)
        # Use our custom password helper
        self.password_helper = password_helper

    async def on_after_register(self, user: User, request: Optional[Request] = None):
        print(f"User {user.id} has registered.")

    async def on_after_forgot_password(self, user: User, token: str, request: Optional[Request] = None):
        print(f"User {user.id} has forgot their password. Reset token: {token}")

    async def on_after_request_verify(self, user: User, token: str, request: Optional[Request] = None):
        print(f"Verification requested for user {user.id}. Verification token: {token}")
    
    async def create(self, user_create: UserCreate, safe: bool = False, request: Optional[Request] = None) -> User:
        """Override create method to handle duplicate username errors and filter None values."""
        try:
            print(f"Creating user with data: {user_create.model_dump()}")
            
            # Filter out None values to let database defaults work
            user_data = user_create.model_dump(exclude_unset=True, exclude_none=True)
            filtered_user_create = UserCreate(**user_data)
            
            return await super().create(filtered_user_create, safe=safe, request=request)
        except Exception as e:
            print(f"Error creating user: {e}")
            error_msg = str(e)
            if "Duplicate entry" in error_msg and "leetcode_username" in error_msg:
                from fastapi import HTTPException
                raise HTTPException(
                    status_code=400, 
                    detail="LeetCode username already exists. Please choose a different username."
                )
            elif "Duplicate entry" in error_msg and "username" in error_msg:
                from fastapi import HTTPException
                raise HTTPException(
                    status_code=400, 
                    detail="Email already exists. Please use a different email address."
                )
            else:
                raise e
    


# Database adapter - using async session for FastAPI-users
async def get_user_db(session: AsyncSession = Depends(get_db)):
    yield SQLAlchemyUserDatabase(session, User)


# User manager dependency
async def get_user_manager(user_db: SQLAlchemyUserDatabase = Depends(get_user_db)):
    yield UserManager(user_db)


# JWT Strategy
def get_jwt_strategy() -> JWTStrategy:
    return JWTStrategy(
        secret=SECRET_KEY, 
        lifetime_seconds=ACCESS_TOKEN_EXPIRE_MINUTES * 60
    )


# Authentication backend
auth_backend = AuthenticationBackend(
    name="jwt",
    transport=BearerTransport(tokenUrl="auth/login"),
    get_strategy=get_jwt_strategy,
)

# FastAPI Users instance
fastapi_users = FastAPIUsers[User, int](
    get_user_manager,
    [auth_backend],
)

# Auth routes (ready to include in your main app)
auth_router = fastapi_users.get_auth_router(auth_backend)  # /login, /logout
register_router = fastapi_users.get_register_router(UserRead, UserCreate)  # /register

# Current user dependency for protecting routes
current_user = fastapi_users.current_user()