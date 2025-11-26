import os
import asyncio
import logging
from playwright.async_api import async_playwright
from src.leetcode.service.leetcode_service import LeetCodeService
from dotenv import load_dotenv

load_dotenv()

LOGGER = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
COOKIE_NAME = "LEETCODE_SESSION"
CSRF_NAME = "csrftoken"

GITHUB_USERNAME = os.getenv("GITHUB_USERNAME")
GITHUB_PASSWORD = os.getenv("GITHUB_PASSWORD")

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



async def main():
    session_token, csrf_token = await get_auth_cookie()
    print("\n" + "="*60)
    print("✅ Authentication successful!")
    print("="*60)
    print(f"LEETCODE_SESSION = {session_token}")
    print(f"csrftoken = {csrf_token}")
    print("="*60)
    print("\nYou can now use these tokens for authenticated LeetCode API requests.")
    
    # Example: Test getting submission details
    print("\nTesting API call...")
    submission_id = 1831890835
    question = await LeetCodeService.get_submission_details(submission_id, f"csrftoken={csrf_token}; LEETCODE_SESSION={session_token}")
    print(f"\n✅ Submission details retrieved:")
    print(f"   Submission ID: {submission_id}")
    print(f"   Data keys: {list(question.keys())}")


if __name__ == "__main__":
    asyncio.run(main())

