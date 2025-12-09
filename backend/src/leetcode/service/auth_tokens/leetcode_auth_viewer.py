import os
import sys
import asyncio
import logging
import json
from dataclasses import dataclass
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional, Tuple

from dotenv import load_dotenv
from playwright.async_api import async_playwright, TimeoutError as PlaywrightTimeoutError

# ──────────────────────────────────────────────────────────────
#  Path / Imports Setup
# ──────────────────────────────────────────────────────────────

# This file is at:
# backend/src/leetcode/service/auth_tokens/leetcode_auth_viewer.py
# So BACKEND_DIR is 4 levels up from this file.
CURRENT_FILE = Path(__file__).resolve()
BACKEND_DIR = CURRENT_FILE.parents[4]  # Go up: auth_tokens -> service -> leetcode -> src -> backend

if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from src.leetcode.service.leetcode_service import LeetCodeService
# ──────────────────────────────────────────────────────────────
#  Environment & Logging
# ──────────────────────────────────────────────────────────────

load_dotenv()

LOGGER = logging.getLogger("leetcode_auth")
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)

USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
COOKIE_NAME = "LEETCODE_SESSION"
CSRF_NAME = "csrftoken"

GITHUB_USERNAME = os.getenv("GITHUB_USERNAME")
GITHUB_PASSWORD = os.getenv("GITHUB_PASSWORD")

if not GITHUB_USERNAME or not GITHUB_PASSWORD:
    LOGGER.warning(
        "GITHUB_USERNAME or GITHUB_PASSWORD is not set in the environment. "
        "Authentication will fail until you configure your .env file."
    )
else:
    print("USER+PASS: ", GITHUB_USERNAME, GITHUB_PASSWORD)
# Where tokens will be stored
DEFAULT_TOKENS_FILE = BACKEND_DIR / "src" / "leetcode" / "service" / "auth_tokens" / "leetcode_tokens.json"

# Whether to print tokens to console (DANGEROUS: only enable locally!)
PRINT_TOKENS = os.getenv("PRINT_TOKENS", "false").lower() == "true"


# ──────────────────────────────────────────────────────────────
#  Data Model for Tokens
# ──────────────────────────────────────────────────────────────

@dataclass
class LeetCodeTokens:
    session_token: str
    csrf_token: Optional[str]
    retrieved_at: datetime

    @classmethod
    def from_dict(cls, data: dict) -> "LeetCodeTokens":
        return cls(
            session_token=data["LEETCODE_SESSION"],
            csrf_token=data.get("csrftoken"),
            retrieved_at=datetime.fromisoformat(data["retrieved_at"]),
        )

    def to_dict(self) -> dict:
        return {
            "LEETCODE_SESSION": self.session_token,
            "csrftoken": self.csrf_token,
            "retrieved_at": self.retrieved_at.isoformat(),
            "note": "These tokens are sensitive. Do not commit this file to version control.",
        }


# ──────────────────────────────────────────────────────────────
#  Authenticator Class
# ──────────────────────────────────────────────────────────────

class LeetCodeAuthenticator:
    def __init__(
        self,
        tokens_file: Path = DEFAULT_TOKENS_FILE,
        max_age_hours: int = 24,
        headless: bool = False,
    ) -> None:
        self.tokens_file = tokens_file
        self.max_age = timedelta(hours=max_age_hours)
        self.headless = headless

    # ──────────────────────────────────────────────────────
    #  Public API
    # ──────────────────────────────────────────────────────

    async def authenticate(self, force_refresh: bool = False) -> Tuple[str, Optional[str]]:
        """
        Main entrypoint:
        - Uses cached tokens if they exist, are fresh, and validate.
        - Otherwise logs in via Playwright + GitHub OAuth and saves tokens.
        """
        LOGGER.info("=" * 60)
        LOGGER.info(" LeetCode Authentication")
        LOGGER.info("=" * 60)

        if not force_refresh:
            LOGGER.info("Checking for existing tokens...")
            tokens = self._load_tokens()

            if tokens and self._tokens_are_fresh(tokens):
                LOGGER.info("Existing tokens are fresh. Validating against LeetCode API...")
                if await self._validate_tokens(tokens):
                    LOGGER.info("✅ Existing tokens are valid. Using cached tokens.")
                    self._print_token_summary(tokens)
                    return tokens.session_token, tokens.csrf_token
                else:
                    LOGGER.warning("⚠️ Existing tokens failed validation. Re-authenticating...")
            else:
                if tokens:
                    LOGGER.info("⚠️ Tokens are stale or invalid. Re-authenticating...")
                else:
                    LOGGER.info("ℹ️ No existing tokens found. Proceeding with authentication...")
        else:
            LOGGER.info("🔄 Force refresh enabled. Skipping cache and re-authenticating...")

        # Need fresh tokens
        tokens = await self._get_auth_cookie_with_retry()
        self._save_tokens(tokens)
        LOGGER.info("✅ Tokens saved to file and ready for use.")
        self._print_token_summary(tokens)

        # Final validation (optional, but nice for sanity)
        LOGGER.info("Validating new tokens using LeetCode API...")
        if not await self._validate_tokens(tokens):
            raise RuntimeError("Newly retrieved tokens failed validation.")

        LOGGER.info("✅ New tokens validated successfully.")
        return tokens.session_token, tokens.csrf_token

    # ──────────────────────────────────────────────────────
    #  Token File Helpers
    # ──────────────────────────────────────────────────────

    def _load_tokens(self) -> Optional[LeetCodeTokens]:
        try:
            if not self.tokens_file.exists():
                return None
            with self.tokens_file.open("r", encoding="utf-8") as f:
                data = json.load(f)
            tokens = LeetCodeTokens.from_dict(data)
            LOGGER.info(f"✅ Loaded tokens from {self.tokens_file}")
            LOGGER.info(f"   Retrieved at: {tokens.retrieved_at.isoformat()}")
            return tokens
        except Exception as e:
            LOGGER.error(f"❌ Failed to load tokens from file: {e}")
            return None

    def _save_tokens(self, tokens: LeetCodeTokens) -> None:
        """
        Save tokens atomically (write to .tmp then move).
        """
        try:
            self.tokens_file.parent.mkdir(parents=True, exist_ok=True)
            tmp_path = self.tokens_file.with_suffix(self.tokens_file.suffix + ".tmp")
            with tmp_path.open("w", encoding="utf-8") as f:
                json.dump(tokens.to_dict(), f, indent=2)
            os.replace(tmp_path, self.tokens_file)
            LOGGER.info(f"✅ Tokens saved to {self.tokens_file}")
        except Exception as e:
            LOGGER.error(f"❌ Failed to save tokens: {e}")
            raise

    def _tokens_are_fresh(self, tokens: LeetCodeTokens) -> bool:
        age = datetime.utcnow() - tokens.retrieved_at
        if age < self.max_age:
            LOGGER.info(
                f"✅ Tokens are fresh ({age.total_seconds() / 3600:.1f} hours old, "
                f"max: {self.max_age.total_seconds() / 3600:.1f} hours)"
            )
            return True
        LOGGER.info(f"⚠️ Tokens are stale ({age.days} days old)")
        return False

    def _print_token_summary(self, tokens: LeetCodeTokens) -> None:
        LOGGER.info("=" * 60)
        LOGGER.info(" Token Summary")
        LOGGER.info("=" * 60)
        LOGGER.info(f" Retrieved at: {tokens.retrieved_at.isoformat()}")
        LOGGER.info(f" Session token length: {len(tokens.session_token)}")
        LOGGER.info(f" CSRF token present: {'yes' if tokens.csrf_token else 'no'}")
        LOGGER.info("=" * 60)

        if PRINT_TOKENS:
            print("\n⚠️  PRINT_TOKENS=true — printing sensitive tokens (do NOT do this in prod!)")
            print("=" * 60)
            print(f"LEETCODE_SESSION = {tokens.session_token}")
            print(f"csrftoken        = {tokens.csrf_token}")
            print("=" * 60)

    # ──────────────────────────────────────────────────────
    #  Validation via LeetCodeService
    # ──────────────────────────────────────────────────────

    async def _validate_tokens(self, tokens: LeetCodeTokens) -> bool:
        """
        Simple "is this session valid?" check using an API call.
        You can swap this with any cheap authenticated call.
        """
        try:
            # Example submission; you can change this to a lightweight endpoint.
            submission_id = 1831890835
            question = await LeetCodeService.get_submission_details(submission_id)
            LOGGER.info(
                f"Validation call succeeded. Submission keys: {list(question.keys())}"
            )
            return True
        except Exception as e:
            LOGGER.warning(f"Token validation failed: {e}")
            return False

    # ──────────────────────────────────────────────────────
    #  Playwright Login / 2FA Handling
    # ──────────────────────────────────────────────────────

    async def _get_auth_cookie_with_retry(self, retries: int = 3) -> LeetCodeTokens:
        last_error: Optional[Exception] = None
        for attempt in range(1, retries + 1):
            try:
                LOGGER.info(f"Attempt {attempt}/{retries} to authenticate via browser...")
                return await self._get_auth_cookie()
            except Exception as e:
                last_error = e
                LOGGER.error(f"Attempt {attempt} failed: {e}")
                if attempt < retries:
                    backoff = 2 ** attempt
                    LOGGER.info(f"Retrying in {backoff} seconds...")
                    await asyncio.sleep(backoff)
                else:
                    LOGGER.error("All authentication attempts failed.")
        raise RuntimeError(f"Authentication failed after {retries} attempts: {last_error}")

    async def _get_auth_cookie(self) -> LeetCodeTokens:
        if not GITHUB_USERNAME or not GITHUB_PASSWORD:
            raise RuntimeError("GITHUB_USERNAME and GITHUB_PASSWORD must be set in the environment.")

        async with async_playwright() as p:
            LOGGER.info("Launching browser for GitHub → LeetCode login...")
            browser = await p.firefox.launch(headless=self.headless, timeout=40_000)
            context = await browser.new_context(user_agent=USER_AGENT)
            await context.clear_cookies()

            page = await context.new_page()
            login_url = "https://leetcode.com/accounts/github/login/?next=%2F"
            LOGGER.info(f"Navigating to GitHub OAuth login: {login_url}")
            await page.goto(login_url, wait_until="networkidle")

            LOGGER.info("Filling GitHub login form...")
            await page.fill("#login_field", GITHUB_USERNAME)
            await page.fill("#password", GITHUB_PASSWORD)

            LOGGER.info("Submitting login form...")
            await page.click("input[name='commit']")

            # Wait for navigation / redirect / possible 2FA or OAuth authorize
            await page.wait_for_load_state("networkidle")
            current_url = page.url
            LOGGER.info(f"Post-login URL: {current_url}")

            # Handle 2FA page
            if await self._detect_2fa(page):
                LOGGER.info("2FA detected. Waiting for user to finish 2FA...")
                await self._handle_2fa(page)
                await page.wait_for_load_state("networkidle")
                current_url = page.url
                LOGGER.info(f"URL after 2FA: {current_url}")

            # Handle GitHub OAuth authorization screen
            if "oauth/authorize" in current_url:
                LOGGER.info("GitHub OAuth authorization screen detected.")
                try:
                    await page.click("button[type='submit']")
                except Exception:
                    # Some GitHub OAuth screens have input[name='authorize']
                    try:
                        await page.click("input[name='authorize']")
                    except Exception:
                        LOGGER.warning("Could not find OAuth authorize button; continuing anyway.")
                await page.wait_for_load_state("networkidle")
                current_url = page.url
                LOGGER.info(f"URL after authorizing app: {current_url}")

            # Ensure we are now on LeetCode
            # GitHub redirects directly in the same tab — no popup.
            if "leetcode.com" not in current_url:
                LOGGER.error(f"Expected LeetCode redirect, got: {current_url}")
                await browser.close()
                raise RuntimeError(f"Unexpected redirect URL after login: {current_url}")

            LOGGER.info("Login successful. Retrieving cookies...")
            cookies = await context.cookies()

            session_token = self._extract_cookie(cookies, COOKIE_NAME)
            csrf_token = self._extract_cookie(cookies, CSRF_NAME)

            if not session_token or len(session_token) < 20:
                LOGGER.error("Could not find valid LEETCODE_SESSION cookie.")
                LOGGER.error(f"Cookies received: {[c['name'] for c in cookies]}")
                await browser.close()
                raise RuntimeError("Failed to retrieve LEETCODE_SESSION cookie; login may have failed.")

            LOGGER.info("Successfully retrieved auth cookies.")
            LOGGER.info(f"Session token length: {len(session_token)}")
            LOGGER.info(f"CSRF token present: {'yes' if csrf_token else 'no'}")

            await browser.close()

            return LeetCodeTokens(
                session_token=session_token,
                csrf_token=csrf_token,
                retrieved_at=datetime.utcnow(),
            )

    async def _detect_2fa(self, page) -> bool:
        """
        Try to detect whether a 2FA input is present on the GitHub page.
        """
        two_fa_selectors = [
            "input[name='app_otp']",  # Authenticator app
            "input[name='otp']",      # Generic OTP
            "#otp",
            "input[autocomplete='one-time-code']",
            "input[type='text'][placeholder*='code']",
        ]
        for selector in two_fa_selectors:
            if await page.locator(selector).count() > 0:
                LOGGER.info(f"🔐 Two-Factor Authentication input detected: '{selector}'")
                return True
        return False

    async def _handle_2fa(self, page) -> None:
        """
        Handle Two-Factor Authentication. Let the user complete it manually.
        """
        LOGGER.info("⏳ Please complete your 2FA in the browser window...")
        LOGGER.info("   Options:")
        LOGGER.info("   1. Enter code from your authenticator app")
        LOGGER.info("   2. Use SMS code if available")
        LOGGER.info("   3. Use a backup code if needed")
        LOGGER.info("   Waiting up to 3 minutes for successful redirect to LeetCode...")

        try:
            await page.wait_for_url(
                lambda url: "leetcode.com" in url,
                timeout=180_000,
            )
            LOGGER.info("✅ 2FA completed and redirected back to LeetCode.")
        except PlaywrightTimeoutError as e:
            LOGGER.error(f"❌ 2FA timeout or error: {e}")
            raise RuntimeError("2FA authentication failed or timed out")

    @staticmethod
    def _extract_cookie(cookies: list, name: str) -> Optional[str]:
        for c in cookies:
            if c.get("name") == name:
                return c.get("value")
        return None


# ──────────────────────────────────────────────────────────────
#  CLI Entry Point
# ──────────────────────────────────────────────────────────────

async def main() -> None:
    import argparse

    parser = argparse.ArgumentParser(description="LeetCode Authentication via GitHub + Playwright")
    parser.add_argument(
        "--force",
        "-f",
        action="store_true",
        help="Force re-authentication (ignore cached tokens)",
    )
    parser.add_argument(
        "--headless",
        action="store_true",
        help="Run browser in headless mode (no visible window)",
    )
    args = parser.parse_args()

    auth = LeetCodeAuthenticator(headless=args.headless)

    try:
        session_token, csrf_token = await auth.authenticate(force_refresh=args.force)
        LOGGER.info("✅ Authentication complete.")
        if PRINT_TOKENS:
            print("\nFinal Tokens:")
            print(f"LEETCODE_SESSION = {session_token}")
            print(f"csrftoken        = {csrf_token}")
    except Exception as e:
        LOGGER.error(f"❌ Authentication failed: {e}")
        print("\nTroubleshooting tips:")
        print("1. Check your GITHUB_USERNAME and GITHUB_PASSWORD in .env")
        print("2. Make sure you complete 2FA in the opened browser window")
        print("3. Check if GitHub is blocking automated logins / suspicious sign-ins")
        sys.exit(1)


async def get_leetcode_tokens(force_refresh: bool = False):
    """
    Retrieve valid LeetCode tokens and save them to the JSON file.

    Returns:
        (session_token: str, csrf_token: Optional[str])
    """
    auth = LeetCodeAuthenticator()
    session_token, csrf_token = await auth.authenticate(force_refresh=force_refresh)
    return session_token, csrf_token


if __name__ == "__main__":
    # Avoid accidental execution during certain import-based tooling.
    asyncio.run(main())
