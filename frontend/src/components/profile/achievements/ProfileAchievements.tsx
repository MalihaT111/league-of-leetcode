"use client";

import { Card, Title, Text, Flex, ScrollArea } from "@mantine/core";
import AchievementCard from "./AchievementCard";
import styles from "@/components/profile/Profile.module.css";
import { useUserAchievements } from "@/lib/api/queries/achievements";

// ----------------------------
// 2. MAIN COMPONENT
// ----------------------------
export default function ProfileAchievements({ userId }: { userId: number }) {
  const { data, isLoading, error } = useUserAchievements(userId);

  if (isLoading) {
    return ( 
      <Card radius="md" p="xl" className={styles.achievementsCard}>
        <Title order={2} ta="center" className={`title-gradient ${styles.achievementsTitle}`}>
          ACHIEVEMENTS
        </Title>
        <Flex justify="center" align="center" style={{ minHeight: 60 }}>
          <Text ta="center" c="dimmed">
            Loading achievements...
          </Text>
        </Flex>
      </Card>
    );
  }

  if (error) {
    return (
       <Card radius="md" p="xl" className={styles.achievementsCard}>
        <Title order={2} ta="center" className={`title-gradient ${styles.achievementsTitle}`}>
          ACHIEVEMENTS
        </Title>
        <Text ta="center" c="red">
          Failed to load achievements
        </Text>
      </Card>
    );
  }

  // Safe defaults
  const achievements = data?.achievements ?? [];
  const total_unlocked = data?.total_unlocked ?? 0;

  // // ----------------------------
  // // 3. SORT ACHIEVEMENTS
  // // ----------------------------
  // const sortedAchievements = useMemo(() => {
  //   return [...achievements].sort((a, b) => {
  //     // Unlocked achievements first
  //     if (a.unlocked && !b.unlocked) return -1;
  //     if (!a.unlocked && b.unlocked) return 1;

  //     // Then sort by difficulty
  //     const ad = normalizeDifficulty(a.difficulty);
  //     const bd = normalizeDifficulty(b.difficulty);

  //     return difficultyOrder[bd] - difficultyOrder[ad];
  //   });
  // }, [achievements]);


  // ----------------------------
  // 5. PROGRESS PERCENTAGE
  // ----------------------------
  const progressPercentage =
    achievements.length > 0
      ? (total_unlocked / achievements.length) * 100
      : 0;

  // ----------------------------
  // 6. RENDER UI
  // ----------------------------
  return (
    <Card radius="md" p="xl" className={styles.achievementsCard}>
      <Title
        order={2}
        ta="center"
        className={`title-gradient ${styles.achievementsTitle}`}
      >
        ACHIEVEMENTS
      </Title>

      <Text ta="center" c="dimmed" mb="md">
        {total_unlocked} / {achievements.length} unlocked (
        {progressPercentage.toFixed(0)}%)
      </Text>

      <ScrollArea
        h={350}
        type="auto"
        offsetScrollbars
        scrollbarSize={6}
      >
        <div className={styles.achievementList}>
          {achievements.map((ach) => (
            <AchievementCard key={ach.id} achievement={ach} />
          ))}
        </div>
      </ScrollArea>

    </Card>
  );
}
