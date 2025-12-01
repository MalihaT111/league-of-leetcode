"use client";

import { Space_Grotesk } from "next/font/google";
import {
  Avatar,
  Card,
  Center,
  Divider,
  Group,
  Loader,
  Table,
  Text,
  Title,
} from "@mantine/core";
import { useRouter } from "next/navigation";
import { useLeaderboardQuery } from "@/lib/api/queries/leaderboard";
import styles from "./Leaderboard.module.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

type Player = {
  rank: number;
  id: number;
  username: string;
  elo: number;
  winstreak: number;
};

export default function LeaderboardTable() {
  const lavender = "rgba(189,155,255,1)";
  const lavenderDim = "rgba(189,155,255,0.55)";
  const rowEven = "rgba(255,255,255,0.02)";
  const rowOdd = "rgba(255,255,255,0.04)";

  const { data, isLoading, isError } = useLeaderboardQuery();
  const router = useRouter();

  if (isLoading) {
    return (
      <Center mih="60vh">
        <Loader color={lavender} />
      </Center>
    );
  }

  if (isError) {
    return (
      <Center mih="60vh">
        <Text c="red" fz="lg">
          Failed to load leaderboard.
        </Text>
      </Center>
    );
  }

  const leaderboard: Player[] = data ?? [];

  const rows = leaderboard.map((player) => (
    <tr
      key={player.rank}
      onClick={() => router.push(`/profile/${player.id}`)}
      className={styles.row}
      style={{ background: player.rank % 2 === 0 ? rowEven : rowOdd }}
    >
      <td className={styles.cellCenter}>
        <Text fw={500} c={lavender} className={styles.rankText}>
          {player.rank}
        </Text>
      </td>

      <td>
        <Group gap="sm">
          <Avatar radius="xl" size="md" className={styles.avatar} />
          <Text fw={500} c="white" className={styles.usernameText}>
            {player.username}
          </Text>
        </Group>
      </td>

      <td className={styles.cellCenterWide}>
        <Text fw={500} c="white">
          {player.elo.toLocaleString()}
        </Text>
      </td>

      <td className={styles.cellCenterMedium}>
        <Text fw={500} c="white">
          {player.winstreak}
        </Text>
      </td>
    </tr>
  ));

  return (
    <Card
      radius="md"
      p="xl"
      w="90%"
      maw={900}
      className={`${spaceGrotesk.className} ${styles.card}`}
    >
      <Title
        order={1}
        mb="md"
        ta="center"
        className={`title-gradient ${styles.title}`}
      >
        LEADERBOARD
      </Title>

      <Divider color={lavenderDim} mb="md" />

      <div className={styles.tableWrapper}>
        <Table
          withColumnBorders={false}
          withRowBorders={false}
          horizontalSpacing="lg"
          verticalSpacing="md"
          highlightOnHover={false}
          className={styles.table}
        >
          <thead>
            <tr>
              <th className={styles.cellCenter}>
                <Text c={lavenderDim} fw={600}>
                  RANK
                </Text>
              </th>
              <th className={styles.cellLeft}>
                <Text c={lavenderDim} fw={600}>
                  USER
                </Text>
              </th>
              <th className={styles.cellCenter}>
                <Text c={lavenderDim} fw={600}>
                  ELO
                </Text>
              </th>
              <th className={styles.cellCenter}>
                <Text c={lavenderDim} fw={600}>
                  STREAK
                </Text>
              </th>
            </tr>
          </thead>

          <tbody>{rows}</tbody>
        </Table>
      </div>
    </Card>
  );
}
