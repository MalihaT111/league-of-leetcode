"use client";

import { useState } from "react";
import { AuthService } from "@/utils/auth";

export interface Achievement {
  id: number;
  description: string;
  target: number;
  difficulty: string;
  event: string;
  unlocked: boolean;
}

export interface AchievementCheckResult {
  message: string;
  newly_unlocked: Achievement[];
}

export const useAchievements = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkAchievements = async (): Promise<Achievement[]> => {
    try {
      setLoading(true);
      setError(null);

      if (!AuthService.isAuthenticated()) {
        throw new Error("User not authenticated");
      }

      const token = AuthService.getToken();
      const response = await fetch("http://127.0.0.1:8000/api/achievements/check", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to check achievements: ${response.statusText}`);
      }

      const result: AchievementCheckResult = await response.json();
      return result.newly_unlocked;
    } catch (error) {
      console.error("Failed to check achievements:", error);
      setError(error instanceof Error ? error.message : "Failed to check achievements");
      return [];
    } finally {
      setLoading(false);
    }
  };

  const getUserAchievements = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!AuthService.isAuthenticated()) {
        throw new Error("User not authenticated");
      }

      const token = AuthService.getToken();
      const response = await fetch("http://127.0.0.1:8000/api/achievements/", {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch achievements: ${response.statusText}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error("Failed to fetch achievements:", error);
      setError(error instanceof Error ? error.message : "Failed to fetch achievements");
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    checkAchievements,
    getUserAchievements,
    loading,
    error,
  };
};