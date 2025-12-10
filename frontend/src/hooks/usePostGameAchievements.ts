"use client";

import { useState, useCallback, createElement } from "react";
import { useAchievements, Achievement } from "./useAchievements";
import { notifications } from "@mantine/notifications";
import { AchievementNotification } from "@/components/achievements/AchievementNotification";

export const usePostGameAchievements = () => {
  const { checkAchievements, loading, error } = useAchievements();
  const [newlyUnlocked, setNewlyUnlocked] = useState<Achievement[]>([]);

  const checkForNewAchievements = useCallback(async () => {
    try {
      console.log("🏆 Checking for new achievements after game completion...");
      const unlockedAchievements = await checkAchievements();
      
      if (unlockedAchievements.length > 0) {
        console.log(`🎉 Found ${unlockedAchievements.length} new achievements:`, unlockedAchievements);
        setNewlyUnlocked(unlockedAchievements);
        
        // Show notifications for each newly unlocked achievement
        unlockedAchievements.forEach((achievement) => {
          notifications.show({
            message: createElement(AchievementNotification, {
              title: "Achievement Unlocked!",
              description: achievement.description,
              difficulty: achievement.difficulty,
            }),
            color: "yellow",
            autoClose: 8000,
            withCloseButton: true,
            styles: {
              root: {
                backgroundColor: "transparent",
                border: "none",
                padding: 0,
              },
            },
          });
        });
      } else {
        console.log("📝 No new achievements unlocked this game");
      }
      
      return unlockedAchievements;
    } catch (error) {
      console.error("Error checking post-game achievements:", error);
      return [];
    }
  }, [checkAchievements]);

  const clearNewlyUnlocked = useCallback(() => {
    setNewlyUnlocked([]);
  }, []);

  return {
    checkForNewAchievements,
    newlyUnlocked,
    clearNewlyUnlocked,
    loading,
    error,
  };
};