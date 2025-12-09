"""
LeetCode integration package.

This package provides:
- LeetCode API integration via GraphQL
- Authentication token management
- Problem fetching and filtering
- User submission tracking
"""

# Import main service class
from .service.leetcode_service import LeetCodeService

# Import schemas
from .schemas import (
    Problem,
    UserSubmission,
    ProblemStats,
    SyncResult
)

# Import enums
from .enums.difficulty import DifficultyEnum

__all__ = [
    # Service
    'LeetCodeService',
    
    # Schemas
    'Problem',
    'UserSubmission',
    'ProblemStats',
    'SyncResult',
    
    # Enums
    'DifficultyEnum',
]

# Note: Auth tokens can be imported directly from src.leetcode.auth_tokens
# to avoid circular import issues
