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

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

// ------------------------------

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
  const borderGlow = "rgba(189,155,255,0.35)";
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
      style={{
        background: player.rank % 2 === 0 ? rowEven : rowOdd,
        transition: "all 0.25s ease",
        cursor: "pointer",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateX(6px)";
        e.currentTarget.style.opacity = "0.9";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateX(0px)";
        e.currentTarget.style.opacity = "1";
      }}
    >
      <td style={{ textAlign: "center", width: 80 }}>
        <Text fw={500} c={lavender} style={{ letterSpacing: 0.5 }}>
          {player.rank}
        </Text>
      </td>

      <td>
        <Group gap="sm">
          <Avatar
            radius="xl"
            size="md"
            style={{ border: `1px solid ${lavenderDim}` }}
          />
          <Text fw={500} c="white" style={{ letterSpacing: 0.4 }}>
            {player.username}
          </Text>
        </Group>
      </td>

      <td style={{ textAlign: "center", width: 160 }}>
        <Text fw={500} c="white">
          {player.elo.toLocaleString()}
        </Text>
      </td>

      <td style={{ textAlign: "center", width: 120 }}>
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
      className={spaceGrotesk.className}
      style={{
        background: "rgba(10,10,20,0.45)",
        backdropFilter: "blur(12px)",
        border: `1px solid ${borderGlow}`,
        boxShadow: `0 0 25px rgba(189,155,255,0.12)`,
        margin: "0 auto",
      }}
    >
      <Title
        order={1}
        mb="md"
        ta="center"
        className="title-gradient"
        style={{ fontSize: "3rem" }}
      >
        LEADERBOARD
      </Title>

      <Divider color={lavenderDim} mb="md" />

      {/* Responsive scroll wrapper */}
      <div style={{ overflowX: "auto" }}>
        <Table
          withColumnBorders={false}
          withRowBorders={false}
          horizontalSpacing="lg"
          verticalSpacing="md"
          highlightOnHover={false}
          style={{
            backgroundColor: "transparent",
            minWidth: 600,
          }}
        >
          <thead>
            <tr>
              <th style={{ textAlign: "center" }}>
                <Text c={lavenderDim} fw={600}>
                  RANK
                </Text>
              </th>
              <th style={{ textAlign: "left" }}>
                <Text c={lavenderDim} fw={600}>
                  USER
                </Text>
              </th>
              <th style={{ textAlign: "center" }}>
                <Text c={lavenderDim} fw={600}>
                  ELO
                </Text>
              </th>
              <th style={{ textAlign: "center" }}>
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
