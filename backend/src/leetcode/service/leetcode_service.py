from fastapi import HTTPException
import httpx
import json
import os
import sys
import asyncio
import subprocess
from typing import List, Optional
from collections import defaultdict

from .client import LeetCodeGraphQLClient
from ..schemas import Problem, UserSubmission, ProblemStats, SyncResult
from ..enums.difficulty import DifficultyEnum
from .graphql_queries import *

# -------------------------------------------------------------------
# Paths / constants
# -------------------------------------------------------------------

CACHE_FILE = "topic_map_cache.json"
ALL_DIFFS = {"EASY", "MEDIUM", "HARD"}
TOPIC_MAP_CACHE = None

TOKENS_FILE = os.path.join(os.path.dirname(__file__), "auth_tokens", "leetcode_tokens.json")


# -------------------------------------------------------------------
# Auth cookie loader
# -------------------------------------------------------------------

async def load_auth_cookies(filepath: str = TOKENS_FILE) -> str:
    """
    Load LeetCode authentication cookies from the saved tokens file.
    If tokens don't exist, automatically runs authentication.

    Returns formatted cookie string:
        "csrftoken=<token>; LEETCODE_SESSION=<session>"
    """
    try:
        # Check if tokens file exists
        if not os.path.exists(filepath):
            print(f"⚠️  Tokens file not found: {filepath}")
            print("🔄 Running automatic authentication...")

            # Import and run authentication
            from ..auth_tokens.leetcode_auth_viewer import authenticate_leetcode

            # Run authentication (no force refresh by default)
            session_token, csrf_token = await authenticate_leetcode(force_refresh=False)

            print("✅ Authentication completed automatically!")
            return f"csrftoken={csrf_token}; LEETCODE_SESSION={session_token}"

        # Load existing tokens
        with open(filepath, "r", encoding="utf-8") as f:
            tokens_data = json.load(f)

        csrf_token = tokens_data.get("csrftoken", "")
        session_token = tokens_data.get("LEETCODE_SESSION", "")

        if not session_token:
            raise ValueError("LEETCODE_SESSION token not found in tokens file")

        return f"csrftoken={csrf_token}; LEETCODE_SESSION={session_token}"

    except HTTPException:
        # Pass through FastAPI HTTPExceptions unchanged
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to load authentication tokens: {str(e)}",
        )


# -------------------------------------------------------------------
# LeetCodeService
# -------------------------------------------------------------------

class LeetCodeService:
    @staticmethod
    async def load_cache():
        """Load cache from disk on startup."""
        global TOPIC_MAP_CACHE

        if os.path.exists(CACHE_FILE):
            with open(CACHE_FILE, "r") as f:
                # Convert stored lists back into sets
                data = json.load(f)
                TOPIC_MAP_CACHE = {k: set(v) for k, v in data.items()}

    @staticmethod
    async def fetch_leetcode_questions():
        data = await LeetCodeGraphQLClient.query(MAPPING_QUERY)
        return data["data"]["problemsetQuestionListV2"]["questions"]

    @staticmethod
    async def refresh_topic_difficulty_map():
        """
        Refresh the topic->difficulty map AND persist it.
        Only topics missing at least one difficulty are included.
        """
        global TOPIC_MAP_CACHE

        questions = await LeetCodeService.fetch_leetcode_questions()
        topic_map = defaultdict(set)

        for q in questions:
            diff = q["difficulty"]
            for tag in q["topicTags"]:
                topic_map[tag["name"]].add(diff)

        # Filter topics missing at least one difficulty
        # Store the MISSING difficulties (disallowed), not the available ones
        filtered = {
            topic: list(ALL_DIFFS - diffs)  # Get missing difficulties
            for topic, diffs in topic_map.items()
            if diffs != ALL_DIFFS  # Only include topics missing at least one difficulty
        }

        TOPIC_MAP_CACHE = {k: set(v) for k, v in filtered.items()}

        # Save to disk (already converted to lists)
        with open(CACHE_FILE, "w") as f:
            json.dump(filtered, f)

        return {"status": "updated", "topics": len(filtered)}

    @staticmethod
    async def get_problem(slug: str) -> Problem:
        data = await LeetCodeGraphQLClient.query(PROBLEM_QUERY, {"titleSlug": slug})
        return data

    @staticmethod
    async def get_user_submissions(username: str):
        data = await LeetCodeGraphQLClient.query(
            RECENT_AC_SUBMISSIONS_QUERY, {"username": username}
        )
        return data["data"]["recentAcSubmissionList"]

    @staticmethod
    async def get_recent_user_submission(username: str) -> Optional[UserSubmission]:
        submissions = await LeetCodeService.get_user_submissions(username)
        if not submissions:
            return None

        submission = submissions[0]
        submission_details = await LeetCodeService.get_submission_details(
            submission["id"]
        )
        print(submission_details)
        return UserSubmission(
            id=submission_details["id"],
            title=submission_details["title"],
            titleSlug=submission_details["titleSlug"],
            timestamp=submission_details["timestamp"],
            lang=submission_details["lang"],
            runtime=submission_details["runtime"],
            memory=submission_details["memory"],
            code=submission_details["code"],
        )

    @staticmethod
    async def get_user_stats(username: str) -> ProblemStats:
        """Get user's LeetCode statistics (Easy, Medium, Hard only)."""
        data = await LeetCodeGraphQLClient.query(
            QUESTION_STATS_QUERY, {"username": username}
        )

        matched_user = data.get("data", {}).get("matchedUser")

        if not matched_user:
            raise HTTPException(
                status_code=404,
                detail=f"User '{username}' not found on LeetCode.",
            )

        stats = matched_user["submitStats"]["acSubmissionNum"]
        filtered = {
            s["difficulty"]: s["count"]
            for s in stats
            if s["difficulty"] in ["All", "Easy", "Medium", "Hard"]
        }

        total = filtered.get("All", 0)
        easy = filtered.get("Easy", 0)
        medium = filtered.get("Medium", 0)
        hard = filtered.get("Hard", 0)

        return ProblemStats(
            total_solved=total,
            easy_solved=easy,
            medium_solved=medium,
            hard_solved=hard,
        )

    @staticmethod
    async def get_user_profile_summary(username: str) -> dict:
        """
        Get user's LeetCode profile summary including aboutMe (bio).
        Returns the profile data including username, ranking, avatar, realName, and aboutMe.
        """
        data = await LeetCodeGraphQLClient.query(PROFILE_QUERY, {"username": username})

        matched_user = data.get("data", {}).get("matchedUser")

        if not matched_user:
            raise HTTPException(
                status_code=404,
                detail=f"User '{username}' not found on LeetCode.",
            )

        profile = matched_user.get("profile", {})

        return {
            "username": matched_user.get("username"),
            "ranking": profile.get("ranking"),
            "userAvatar": profile.get("userAvatar"),
            "realName": profile.get("realName"),
            "aboutMe": profile.get("aboutMe", ""),
        }

    @staticmethod
    async def get_random_problem(
        topics: Optional[list[str]] = None,
        difficulty: Optional[list[str]] = None,
        excluded_slugs: Optional[set[str]] = None,
        max_attempts: int = 10,
    ) -> Problem:
        """
        Fetch a random LeetCode problem filtered only by topic(s) and difficulty.
        Skips premium problems and excluded problems (for repeat=false).
        """
        excluded_slugs = excluded_slugs or set()

        filters = {
            "filterCombineType": "ALL",
            "topicFilter": {
                "topicSlugs": topics or [],
                "operator": "IS",
            },
            "difficultyFilter": {
                "difficulties": [str(d).upper() for d in difficulty]
                if difficulty
                else [],
                "operator": "IS",
            },
            "premiumFilter": {
                "premiumStatus": ["NOT_PREMIUM"],
                "operator": "IS",
            },
        }

        variables = {
            "categorySlug": "all-code-essentials",
            "filtersV2": filters,
            "searchKeyword": "",
        }

        for attempt in range(max_attempts):
            try:
                response = await LeetCodeGraphQLClient.query(
                    RANDOM_QUESTION_QUERY, variables
                )
                random_slug = response["data"]["randomQuestionV2"]["titleSlug"]

                if not random_slug:
                    raise ValueError("LeetCode API returned no titleSlug")

                if random_slug in excluded_slugs:
                    print(
                        f"🔄 Attempt {attempt + 1}: Problem {random_slug} already completed, retrying..."
                    )
                    continue

                print(f"🎯 Selected random problem: {random_slug}")

                problem_data = await LeetCodeService.get_problem(random_slug)
                problem = problem_data["data"]["question"]

                stats_data = json.loads(problem["stats"])
                acceptance_rate = stats_data.get("acRate")

                return Problem(
                    id=problem["questionId"],
                    title=problem["title"],
                    slug=problem["titleSlug"],
                    difficulty=problem["difficulty"],
                    tags=[tag["name"] for tag in problem["topicTags"]],
                    acceptance_rate=acceptance_rate,
                )

            except Exception as e:
                if attempt < max_attempts - 1:
                    continue
                print(f"⚠️ Failed to fetch random problem: {e}")
                return {"error": str(e)}

        error_msg = (
            "You've completed all questions under your current filters. "
            "Enable Repeat Questions or widen your topics."
        )
        print(f"⚠️ {error_msg}")
        return {"error": error_msg}

    @staticmethod
    async def get_submission_details(submission_id: int) -> dict:
        """
        Fetch details of a specific submission by its ID.
        Automatically loads authentication cookies from the saved tokens file.
        """
        auth_cookies = await load_auth_cookies()
        
        data = await LeetCodeGraphQLClient.query(
            SUBMISSION_DETAILS_QUERY,
            {"submissionId": submission_id},
            auth_cookies,
        )
        print(data)
        return data["data"]["submissionDetails"]
