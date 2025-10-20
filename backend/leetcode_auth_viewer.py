import os
import asyncio
import logging
from playwright.async_api import async_playwright
from dotenv import load_dotenv  # optional but useful if you have a .env file

load_dotenv()

LOGGER = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
COOKIE_NAME = "LEETCODE_SESSION"
CSRF_NAME = "csrftoken"

# Replace these with your own credentials and 2FA retrieval logic
GITHUB_USERNAME = os.getenv("GITHUB_USERNAME")
GITHUB_PASSWORD = os.getenv("GITHUB_PASSWORD")

async def get_auth_cookie():
    """
    Logs into LeetCode via GitHub using Playwright and returns
    the LEETCODE_SESSION and csrftoken cookies.
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

        LOGGER.info("Waiting for redirect back to LeetCode...")
        await page.wait_for_url("https://leetcode.com/", timeout=60000)

        LOGGER.info("Retrieving cookies...")
        cookies = await context.cookies()
        cookie_map = {c['name']: c['value'] for c in cookies if c['name'] in [COOKIE_NAME, CSRF_NAME]}

        session_token = cookie_map.get(COOKIE_NAME)
        csrf_token = cookie_map.get(CSRF_NAME)

        await browser.close()

        if not session_token:
            raise RuntimeError("Failed to retrieve LEETCODE_SESSION cookie — login may have failed.")

        LOGGER.info("Successfully retrieved auth cookie.")
        return session_token, csrf_token


# Example usage
if __name__ == "__main__":
    session_token, csrf_token = asyncio.run(get_auth_cookie())
    print("LEETCODE_SESSION =", session_token)
    print("csrftoken =", csrf_token)
