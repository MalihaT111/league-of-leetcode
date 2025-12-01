"use client";
import { Card, Flex, Title, Text } from "@mantine/core";
import ProfileHeader from "@/components/profile/Head";
import styles from "./Profile.module.css";

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <Flex justify="space-between" align="center" className={styles.statRow}>
      <Text fw={600} c="rgba(189,155,255,0.7)" className={styles.statLabel}>
        {label}
      </Text>
      <Text fw={600} c="white" className={styles.statValue}>
        {value}
      </Text>
    </Flex>
  );
}

export default function ProfileStatsCard({
  user,
  stats,
}: {
  user: any;
  stats: any;
}) {
  return (
    <Card radius="md" p="xl" className={styles.statsCard}>
      <Flex direction="column" h="100%" justify="space-evenly">
        <Title
          order={2}
          ta="center"
          className={`title-gradient ${styles.statsTitle}`}
        >
          PLAYER STATS
        </Title>

        <ProfileHeader username={user.username || `user_${user.id}`} />

        <Stat label="ELO" value={user.elo ?? "—"} />
        <Stat label="MATCHES WON" value={stats.matches_won ?? 0} />
        <Stat label="WIN RATE" value={`${stats.win_rate ?? 0}%`} />
        <Stat label="WIN STREAK" value={stats.win_streak ?? 0} />
      </Flex>
    </Card>
  );
}
