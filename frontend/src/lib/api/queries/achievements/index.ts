"use client";

import { useQuery, useMutation } from "@tanstack/react-query";
import { AuthService } from "@/utils/auth";
import { AchievementCheckResult, UserAchievementsResponse } from "./types";

async function fetchUserAchievements(userId: number): Promise<UserAchievementsResponse> {
  if (!AuthService.isAuthenticated()) {
    throw new Error("User not authenticated");
  }


  const response = await fetch(`http://127.0.0.1:8000/api/achievements/${userId}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch achievements: ${response.statusText}`);
  }

  return response.json();
}

async function fetchCheckAchievements(): Promise<AchievementCheckResult> {
  if (!AuthService.isAuthenticated()) {
    throw new Error("User not authenticated");
  }

  const token = AuthService.getToken();

  const response = await fetch("http://127.0.0.1:8000/api/achievements/check", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to check achievements: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Fetches all achievements for the logged-in user.
 * Auto-handles loading + error states.
 */
export const useUserAchievements = (userId: number) =>
  useQuery<UserAchievementsResponse>({
    queryKey: ["user-achievements"],
    queryFn: () => fetchUserAchievements(userId),
  });

/**
 * Triggers achievement checking (unlocking).
 * Returns newly unlocked achievements.
 */
export const useCheckAchievements = () =>
  useMutation<AchievementCheckResult>({
    mutationFn: fetchCheckAchievements,
  });
