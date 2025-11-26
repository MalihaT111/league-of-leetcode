from fastapi import HTTPException
import httpx
from typing import List, Optional
from src.leetcode.service.client import LeetCodeGraphQLClient
from src.leetcode.schemas import Problem, UserSubmission, ProblemStats, SyncResult
from src.leetcode.enums.difficulty import DifficultyEnum
from src.leetcode.service.graphql_queries import *
import json
from collections import defaultdict
import os 

CACHE_FILE = "topic_map_cache.json"
ALL_DIFFS = {"EASY", "MEDIUM", "HARD"}
TOPIC_MAP_CACHE = None

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
        data = await LeetCodeGraphQLClient.query(RECENT_AC_SUBMISSIONS_QUERY, {"username": username})
        return data["data"]["recentAcSubmissionList"]
    
    @staticmethod
    async def get_recent_user_submission(username: str) -> Optional[UserSubmission]:
        submissions = await LeetCodeService.get_user_submissions(username)
        if not submissions:
            return None
        submission = submissions[0]
        return UserSubmission(
            id=submission["id"],
            title=submission["title"],
            titleSlug=submission["titleSlug"],
            timestamp=submission["timestamp"],
            lang=submission["lang"],
            runtime=submission["runtime"],
            memory=submission["memory"]
        )
    
    @staticmethod
    async def get_user_stats(username: str) -> ProblemStats:
        """Get user's LeetCode statistics (Easy, Medium, Hard only)."""
        data = await LeetCodeGraphQLClient.query(QUESTION_STATS_QUERY, {"username": username})

        # LeetCodeGraphQLClient already returns the `data` portion,
        # so you should check inside that structure.
        matched_user = data.get("data",{}).get("matchedUser")

        if not matched_user:
            raise HTTPException(status_code=404, detail=f"User '{username}' not found on LeetCode.")

        # Extract submission stats
        stats = matched_user["submitStats"]["acSubmissionNum"]
        # Filter to only Easy, Medium, Hard
        filtered = {s["difficulty"]: s["count"] for s in stats if s["difficulty"] in ["All", "Easy", "Medium", "Hard"]}

        # Safely get counts (0 if missing)
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
            raise HTTPException(status_code=404, detail=f"User '{username}' not found on LeetCode.")
        
        profile = matched_user.get("profile", {})
        
        return {
            "username": matched_user.get("username"),
            "ranking": profile.get("ranking"),
            "userAvatar": profile.get("userAvatar"),
            "realName": profile.get("realName"),
            "aboutMe": profile.get("aboutMe", ""),
        }
    
    """
"variables":{"categorySlug":"all-code-essentials","filtersV2":{"filterCombineType":"ALL","statusFilter":{"questionStatuses":[],"operator":"IS"},"difficultyFilter":{"difficulties":[],"operator":"IS"},"languageFilter":{"languageSlugs":[],"operator":"IS"},"topicFilter":{"topicSlugs":[],"operator":"IS"},"acceptanceFilter":{},"frequencyFilter":{},"frontendIdFilter":{},"lastSubmittedFilter":{},"publishedFilter":{},"companyFilter":{"companySlugs":[],"operator":"IS"},"positionFilter":{"positionSlugs":[],"operator":"IS"},"contestPointFilter":{"contestPoints":[],"operator":"IS"},"premiumFilter":{"premiumStatus":["NOT_PREMIUM"],"operator":"IS"}},"searchKeyword":""},"operationName":"randomQuestionV2"}
    """
    
    
    
    
    @staticmethod
    async def get_random_problem(
        topics: Optional[list[str]] = None,
        difficulty: Optional[list[str]] = None,
        excluded_slugs: Optional[set[str]] = None,
        max_attempts: int = 10
    ) -> Problem:
        """
        Fetch a random LeetCode problem filtered only by topic(s) and difficulty.
        Skips premium problems and excluded problems (for repeat=false).
        
        Args:
            topics: List of topic slugs to filter by
            difficulty: List of difficulty levels (EASY, MEDIUM, HARD)
            excluded_slugs: Set of problem slugs to exclude (completed problems)
            max_attempts: Maximum number of attempts to find a non-excluded problem
        """
        excluded_slugs = excluded_slugs or set()

        # Build the GraphQL filter structure
        filters = {
            "filterCombineType": "ALL",
            "topicFilter": {
                "topicSlugs": topics or [],
                "operator": "IS"
            },
            "difficultyFilter": {
                "difficulties": [str(d).upper() for d in difficulty] if difficulty else [],
                "operator": "IS"
            },
            "premiumFilter": {
                "premiumStatus": ["NOT_PREMIUM"],
                "operator": "IS"
            },
        }

        variables = {
            "categorySlug": "all-code-essentials",
            "filtersV2": filters,
            "searchKeyword": ""
        }

        # Try multiple times to get a non-excluded problem
        for attempt in range(max_attempts):
            try:
                response = await LeetCodeGraphQLClient.query(RANDOM_QUESTION_QUERY, variables)
                random_slug = response["data"]["randomQuestionV2"]["titleSlug"]

                if not random_slug:
                    raise ValueError("LeetCode API returned no titleSlug")

                # Check if this problem is excluded
                if random_slug in excluded_slugs:
                    print(f"🔄 Attempt {attempt + 1}: Problem {random_slug} already completed, retrying...")
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
                    acceptance_rate=acceptance_rate
                )
            
            except Exception as e:
                if attempt < max_attempts - 1:
                    continue
                print(f"⚠️ Failed to fetch random problem: {e}")
                return {"error": str(e)}
        
        # If we exhausted all attempts, all problems were excluded
        error_msg = "You've completed all questions under your current filters. Enable Repeat Questions or widen your topics."
        print(f"⚠️ {error_msg}")
        return {"error": error_msg}
    
    @staticmethod
    async def get_submission_details(submission_id: int, auth_cookies: str) -> dict:
        """Fetch details of a specific submission by its ID."""
        data = await LeetCodeGraphQLClient.query(SUBMISSION_DETAILS, {"submissionId": submission_id}, auth_cookies)
        return data["data"]["submissionDetails"]