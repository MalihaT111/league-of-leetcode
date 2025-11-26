"""
Helper script to load LeetCode tokens from the saved file.
Use this in your scripts to avoid re-authenticating every time.
"""
import json
import os
from datetime import datetime, timedelta

TOKENS_FILE = "backend/auth_tokens/leetcode_tokens.json"


def load_tokens(filepath: str = TOKENS_FILE) -> dict:
    """
    Load LeetCode tokens from the saved JSON file.
    
    Returns:
        dict with keys: LEETCODE_SESSION, csrftoken, retrieved_at
        None if file doesn't exist or is invalid
    """
    try:
        if not os.path.exists(filepath):
            print(f"❌ Tokens file not found: {filepath}")
            print("   Run 'python backend/leetcode_auth_viewer.py' first to authenticate.")
            return None
        
        with open(filepath, 'r') as f:
            tokens_data = json.load(f)
        
        # Check if tokens are old (warn if older than 7 days)
        retrieved_at = tokens_data.get('retrieved_at')
        if retrieved_at:
            retrieved_date = datetime.fromisoformat(retrieved_at)
            age = datetime.utcnow() - retrieved_date
            
            if age > timedelta(days=7):
                print(f"⚠️  Warning: Tokens are {age.days} days old and may have expired.")
                print("   Consider re-authenticating if you encounter errors.")
        
        return tokens_data
    except Exception as e:
        print(f"❌ Failed to load tokens: {e}")
        return None


def get_session_token(filepath: str = TOKENS_FILE) -> str:
    """Get just the LEETCODE_SESSION token."""
    tokens = load_tokens(filepath)
    return tokens.get('LEETCODE_SESSION') if tokens else None


def get_csrf_token(filepath: str = TOKENS_FILE) -> str:
    """Get just the csrftoken."""
    tokens = load_tokens(filepath)
    return tokens.get('csrftoken') if tokens else None


def get_cookie_string(filepath: str = TOKENS_FILE) -> str:
    """
    Get tokens formatted as a cookie string for HTTP requests.
    Returns: "csrftoken=abc123; LEETCODE_SESSION=xyz789"
    """
    tokens = load_tokens(filepath)
    if not tokens:
        return None
    
    csrf = tokens.get('csrftoken', '')
    session = tokens.get('LEETCODE_SESSION', '')
    
    return f"csrftoken={csrf}; LEETCODE_SESSION={session}"


def get_cookie_dict(filepath: str = TOKENS_FILE) -> dict:
    """
    Get tokens as a dictionary for use with requests library.
    Returns: {"csrftoken": "abc123", "LEETCODE_SESSION": "xyz789"}
    """
    tokens = load_tokens(filepath)
    if not tokens:
        return None
    
    return {
        'csrftoken': tokens.get('csrftoken', ''),
        'LEETCODE_SESSION': tokens.get('LEETCODE_SESSION', '')
    }


# Example usage
if __name__ == "__main__":
    print("="*60)
    print("LeetCode Token Loader")
    print("="*60)
    
    tokens = load_tokens()
    
    if tokens:
        print("\n✅ Tokens loaded successfully!")
        print(f"\nRetrieved at: {tokens.get('retrieved_at', 'Unknown')}")
        print(f"\nLEETCODE_SESSION: {tokens.get('LEETCODE_SESSION', 'N/A')[:50]}...")
        print(f"csrftoken: {tokens.get('csrftoken', 'N/A')}")
        
        print("\n" + "-"*60)
        print("Usage examples:")
        print("-"*60)
        print("\n# Load all tokens:")
        print("from load_leetcode_tokens import load_tokens")
        print("tokens = load_tokens()")
        
        print("\n# Get cookie string for HTTP requests:")
        print("from load_leetcode_tokens import get_cookie_string")
        print("cookies = get_cookie_string()")
        
        print("\n# Get cookie dictionary:")
        print("from load_leetcode_tokens import get_cookie_dict")
        print("cookie_dict = get_cookie_dict()")
        print("="*60)
    else:
        print("\n❌ No tokens found.")
        print("\nTo authenticate and save tokens, run:")
        print("  python backend/leetcode_auth_viewer.py")
        print("="*60)
