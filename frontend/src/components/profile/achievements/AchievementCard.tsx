"use client";
import { Group, ThemeIcon, Text, Badge } from "@mantine/core";
import { IconTrophy, IconLock } from "@tabler/icons-react";
import { Achievement } from "@/lib/api/queries/achievements/types";
import styles from "@/components/profile/Profile.module.css";

interface AchievementCardProps {
  achievement: Achievement;
}

export default function AchievementCard({ achievement }: AchievementCardProps) {
  const unlocked = achievement.unlocked;

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case "easy":
        return "green";
      case "medium":
        return "yellow";
      case "hard":
        return "red";
      default:
        return "blue";
    }
  };

  return (
    <div
      className={`${styles.achievementCard} ${
        unlocked ? styles.achievementUnlocked : styles.achievementLocked
      }`}
    >
      <Group gap="sm" align="flex-start">
        <ThemeIcon
          size="lg"
          radius="xl"
          color={unlocked ? getDifficultyColor(achievement.difficulty) : "gray"}
          variant={unlocked ? "light" : "outline"}
          className={styles.achievementIcon}
        >
          {unlocked ? <IconTrophy size={20} /> : <IconLock size={20} />}
        </ThemeIcon>

        <div style={{ flex: 1 }}>
          <Group gap="xs" mb={4} justify="space-between">
            <Badge
              size="xs"
              color={getDifficultyColor(achievement.difficulty)}
              variant={unlocked ? "light" : "outline"}
            >
              {achievement.difficulty.toUpperCase()}
            </Badge>

            {unlocked && <div className={styles.unlockedIndicator}>✓</div>}
          </Group>

          <Text
            size="sm"
            fw={600}
            c={unlocked ? "white" : "rgba(255,255,255,0.4)"}
          >
            {achievement.description}
          </Text>
        </div>
      </Group>
    </div>
  );
}
