"""
Simple helper to call authentication from anywhere.
"""
import asyncio
from .leetcode_auth_viewer import authenticate_leetcode


def run_authentication(force_refresh: bool = False) -> tuple[str, str]:
    """
    Synchronous wrapper to run LeetCode authentication.
    Can be called from any file without async/await.
    
    Args:
        force_refresh: If True, skip cache and force re-authentication
    
    Returns:
        tuple: (session_token, csrf_token)
    
    Example:
        from src.leetcode.auth_tokens.auth_helper import run_authentication
        session, csrf = run_authentication()
    """
    return asyncio.run(authenticate_leetcode(force_refresh=force_refresh))


# Convenience function with no parameters
def authenticate() -> tuple[str, str]:
    """
    Authenticate with LeetCode (uses cache if available).
    No parameters needed - everything is self-contained.
    
    Returns:
        tuple: (session_token, csrf_token)
    
    Example:
        from src.leetcode.auth_tokens.auth_helper import authenticate
        session, csrf = authenticate()
    """
    return run_authentication(force_refresh=False)
