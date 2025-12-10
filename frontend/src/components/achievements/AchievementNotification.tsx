"use client";

import { Paper, Text, Group, ThemeIcon } from "@mantine/core";
import { IconTrophy } from "@tabler/icons-react";
import styles from "./Achievement.module.css";

interface AchievementNotificationProps {
  title: string;
  description: string;
  difficulty: string;
}

export const AchievementNotification = ({ 
  title, 
  description, 
  difficulty 
}: AchievementNotificationProps) => {
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case 'easy': return 'green';
      case 'medium': return 'yellow';
      case 'hard': return 'red';
      case 'legendary': return 'purple';
      default: return 'blue';
    }
  };

  return (
    <Paper 
      p="md" 
      radius="md" 
      className={styles.achievementNotification}
      style={{
        background: "linear-gradient(135deg, rgba(139, 69, 19, 0.1), rgba(255, 215, 0, 0.1))",
        border: "1px solid rgba(255, 215, 0, 0.3)",
        boxShadow: "0 4px 20px rgba(255, 215, 0, 0.2)"
      }}
    >
      <Group gap="md">
        <ThemeIcon 
          size="lg" 
          radius="xl" 
          color={getDifficultyColor(difficulty)}
          variant="light"
        >
          <IconTrophy size={20} />
        </ThemeIcon>
        <div style={{ flex: 1 }}>
          <Text fw={600} size="sm" c="yellow.4">
            🏆 Achievement Unlocked!
          </Text>
          <Text size="xs" c="dimmed" tt="uppercase">
            {difficulty}
          </Text>
          <Text size="sm" mt={2}>
            {description}
          </Text>
        </div>
      </Group>
    </Paper>
  );
};