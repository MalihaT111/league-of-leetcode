import os
import sys
import asyncio
import logging
import json
from datetime import datetime, timedelta
from playwright.async_api import async_playwright
from dotenv import load_dotenv

# Add backend directory to Python path so we can import from src
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from src.leetcode.service.leetcode_service import LeetCodeService

load_dotenv()

LOGGER = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
COOKIE_NAME = "LEETCODE_SESSION"
CSRF_NAME = "csrftoken"

GITHUB_USERNAME = os.getenv("GITHUB_USERNAME")
GITHUB_PASSWORD = os.getenv("GITHUB_PASSWORD")

# File to store tokens
TOKENS_FILE = "backend/auth_tokens/leetcode_tokens.json"


def save_tokens_to_file(session_token: str, csrf_token: str, filepath: str = TOKENS_FILE):
    """
    Save LeetCode tokens to a JSON file.
    """
    tokens_data = {
        "LEETCODE_SESSION": session_token,
        "csrftoken": csrf_token,
        "retrieved_at": datetime.utcnow().isoformat(),
        "note": "These tokens are sensitive. Do not commit this file to version control."
    }
    
    try:
        with open(filepath, 'w') as f:
            json.dump(tokens_data, f, indent=2)
        LOGGER.info(f"✅ Tokens saved to: {filepath}")
        return True
    except Exception as e:
        LOGGER.error(f"❌ Failed to save tokens to file: {e}")
        return False


def load_tokens_from_file(filepath: str = TOKENS_FILE) -> dict:
    """
    Load LeetCode tokens from a JSON file.
    Returns None if file doesn't exist or is invalid.
    """
    try:
        if not os.path.exists(filepath):
            return None
        
        with open(filepath, 'r') as f:
            tokens_data = json.load(f)
        
        LOGGER.info(f"✅ Tokens loaded from: {filepath}")
        LOGGER.info(f"   Retrieved at: {tokens_data.get('retrieved_at', 'Unknown')}")
        return tokens_data
    except Exception as e:
        LOGGER.error(f"❌ Failed to load tokens from file: {e}")
        return None


def are_tokens_fresh(tokens_data: dict, max_age_hours: int = 24) -> bool:
    """
    Check if tokens are fresh (less than max_age_hours old).
    
    Args:
        tokens_data: Dictionary containing token data with 'retrieved_at' field
        max_age_hours: Maximum age in hours before tokens are considered stale (default: 24)
    
    Returns:
        True if tokens are fresh, False otherwise
    """
    if not tokens_data or 'retrieved_at' not in tokens_data:
        return False
    
    try:
        retrieved_at = datetime.fromisoformat(tokens_data['retrieved_at'])
        age = datetime.utcnow() - retrieved_at
        is_fresh = age < timedelta(hours=max_age_hours)
        
        if is_fresh:
            hours_old = age.total_seconds() / 3600
            LOGGER.info(f"✅ Tokens are fresh ({hours_old:.1f} hours old, max: {max_age_hours} hours)")
        else:
            LOGGER.info(f"⚠️  Tokens are stale ({age.days} days old)")
        
        return is_fresh
    except Exception as e:
        LOGGER.error(f"❌ Failed to check token age: {e}")
        return False


async def handle_2fa(page):
    """
    Handle Two-Factor Authentication.
    Waits for the user to manually enter their 2FA code in the browser.
    """
    LOGGER.info("⏳ Please enter your 2FA code in the browser window...")
    LOGGER.info("   Options:")
    LOGGER.info("   1. Enter code from your authenticator app")
    LOGGER.info("   2. Use SMS code if available")
    LOGGER.info("   3. Use backup code if needed")
    LOGGER.info("")
    LOGGER.info("   The script will wait up to 3 minutes for you to complete authentication.")
    
    try:
        # Wait for redirect to LeetCode (up to 3 minutes)
        await page.wait_for_url("https://leetcode.com/", timeout=180000)
        LOGGER.info("✅ 2FA completed successfully!")
    except Exception as e:
        LOGGER.error(f"❌ 2FA timeout or error: {e}")
        LOGGER.error("   Please complete 2FA within the time limit.")
        raise RuntimeError("2FA authentication failed or timed out")

async def get_auth_cookie():
    """
    Logs into LeetCode via GitHub using Playwright and returns
    the LEETCODE_SESSION and csrftoken cookies.
    Handles 2FA if required.
    """
    async with async_playwright() as p:
        LOGGER.info("Launching browser...")
        browser = await p.firefox.launch(headless=False, timeout=40000)
        context = await browser.new_context(user_agent=USER_AGENT)
        await context.clear_cookies()

        page = await context.new_page()
        LOGGER.info("Navigating to LeetCode login page...")
        await page.goto("https://leetcode.com/accounts/github/login/?next=%2F")
        await page.wait_for_load_state("networkidle")

        LOGGER.info("Filling GitHub login form...")
        await page.fill("#login_field", GITHUB_USERNAME)
        await page.fill("#password", GITHUB_PASSWORD)
        await page.click("input[name='commit']")

        await asyncio.sleep(2)

        try:
            current_url = page.url
            LOGGER.info(f"Current URL after login: {current_url}")
            
            # Check if we're on a 2FA page
            if "two-factor" in current_url or "sessions/two-factor" in current_url:
                LOGGER.info("🔐 Two-Factor Authentication page detected!")
                await handle_2fa(page)
            else:
                two_fa_selectors = [
                    "input[name='app_otp']",  # Authenticator app
                    "input[name='otp']",       # Generic OTP
                    "#otp",                    # Alternative ID
                    "input[autocomplete='one-time-code']",  # Modern autocomplete
                    "input[type='text'][placeholder*='code']",  # Generic code input
                ]
                
                two_fa_detected = False
                for selector in two_fa_selectors:
                    if await page.locator(selector).count() > 0:
                        two_fa_detected = True
                        LOGGER.info(f"🔐 Two-Factor Authentication input detected: {selector}")
                        await handle_2fa(page)
                        break
                
                if not two_fa_detected:
                    LOGGER.info("No 2FA detected. Waiting for redirect back to LeetCode...")
                    await page.wait_for_url("https://leetcode.com/", timeout=30000)
                    
        except Exception as e:
            LOGGER.warning(f"Error during authentication: {e}")
            LOGGER.info("Attempting to continue anyway...")
            await asyncio.sleep(3)

        final_url = page.url
        if "leetcode.com" not in final_url:
            LOGGER.error(f"Not on LeetCode! Current URL: {final_url}")
            await browser.close()
            raise RuntimeError(f"Authentication failed - ended up on: {final_url}")

        LOGGER.info("Retrieving cookies...")
        cookies = await context.cookies()
        cookie_map = {c['name']: c['value'] for c in cookies if c['name'] in [COOKIE_NAME, CSRF_NAME]}

        session_token = cookie_map.get(COOKIE_NAME)
        csrf_token = cookie_map.get(CSRF_NAME)

        if not session_token:
            LOGGER.error("Failed to retrieve LEETCODE_SESSION cookie")
            LOGGER.error(f"   Available cookies: {list(cookie_map.keys())}")
            await browser.close()
            raise RuntimeError("Failed to retrieve LEETCODE_SESSION cookie — login may have failed.")

        LOGGER.info("Successfully retrieved auth cookies!")
        LOGGER.info(f"   Session token length: {len(session_token)}")
        LOGGER.info(f"   CSRF token: {'Found' if csrf_token else 'Not found'}")
        
        await browser.close()
        return session_token, csrf_token



async def main(force_refresh: bool = False):
    """
    Main function to run authentication and save tokens.
    
    Args:
        force_refresh: If True, skip token freshness check and re-authenticate
    """
    print("="*60)
    print("LeetCode Authentication")
    print("="*60)
    
    # Check if we have fresh tokens (less than 24 hours old)
    if not force_refresh:
        print("\nChecking for existing tokens...")
        existing_tokens = load_tokens_from_file()
        
        if existing_tokens and are_tokens_fresh(existing_tokens, max_age_hours=24):
            print("\n✅ Using existing tokens (less than 24 hours old)")
            print("="*60)
            print(f"LEETCODE_SESSION = {existing_tokens['LEETCODE_SESSION']}")
            print(f"csrftoken = {existing_tokens['csrftoken']}")
            print(f"Retrieved at: {existing_tokens['retrieved_at']}")
            print("="*60)
            print("\n💡 Tip: To force re-authentication, delete the tokens file or wait 24 hours")
            
            # Test the existing tokens
            try:
                print("\nTesting existing tokens with API call...")
                submission_id = 1831890835
                question = await LeetCodeService.get_submission_details(submission_id)
                print(f"✅ Tokens are valid! Submission details retrieved:")
                print(f"   Submission ID: {submission_id}")
                print(f"   Data keys: {list(question.keys())}")
                return
            except Exception as e:
                print(f"⚠️  Existing tokens failed: {e}")
                print("   Re-authenticating with fresh tokens...")
        else:
            if existing_tokens:
                print("⚠️  Existing tokens are stale (>24 hours old)")
            else:
                print("ℹ️  No existing tokens found")
            print("   Proceeding with authentication...")
    else:
        print("\n🔄 Force refresh enabled - re-authenticating...")
    
    # Proceed with authentication
    try:
        print("\n" + "-"*60)
        session_token, csrf_token = await get_auth_cookie()
        print("\n" + "="*60)
        print("✅ Authentication successful!")
        print("="*60)
        print(f"LEETCODE_SESSION = {session_token}")
        print(f"csrftoken = {csrf_token}")
        print("="*60)
        
        # Save tokens to file
        print("\nSaving tokens to file...")
        if save_tokens_to_file(session_token, csrf_token):
            print(f"✅ Tokens saved to: {TOKENS_FILE}")
            print("   You can now use these tokens for authenticated LeetCode API requests.")
        else:
            print("⚠️  Failed to save tokens to file, but you can still use them from the output above.")
        
        # Example: Test getting submission details
        print("\nTesting API call...")
        submission_id = 1831890835
        question = await LeetCodeService.get_submission_details(submission_id)
        print(f"\n✅ Submission details retrieved:")
        print(f"   Submission ID: {submission_id}")
        print(f"   Data keys: {list(question.keys())}")
        
    except Exception as e:
        print("\n" + "="*60)
        print("❌ Authentication failed!")
        print("="*60)
        print(f"Error: {e}")
        print("\nTroubleshooting:")
        print("1. Check your GITHUB_USERNAME and GITHUB_PASSWORD in .env")
        print("2. Make sure you complete 2FA within the time limit")
        print("3. Check if GitHub is blocking automated logins")
        print("="*60)


if __name__ == "__main__":
    """
    Usage:
    1. Set GITHUB_USERNAME and GITHUB_PASSWORD in your .env file
    2. Run this script: python backend/leetcode_auth_viewer.py
    3. If 2FA is enabled on your GitHub account:
       - A browser window will open
       - Enter your 2FA code when prompted
       - The script will wait for you to complete authentication
    4. The script will output your LeetCode session tokens
    
    Options:
    - python backend/leetcode_auth_viewer.py          # Normal mode (uses cached tokens if <24h old)
    - python backend/leetcode_auth_viewer.py --force  # Force re-authentication
    
    Note: Keep the browser window open until authentication completes!
    """
    import sys
    
    # Check for --force flag
    force_refresh = "--force" in sys.argv or "-f" in sys.argv
    
    asyncio.run(main(force_refresh=force_refresh))

