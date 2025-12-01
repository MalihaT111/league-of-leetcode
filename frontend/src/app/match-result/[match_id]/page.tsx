"use client";
import { useParams, useRouter } from "next/navigation";
import {
  Flex,
  Title,
  Text,
  Button,
  Paper,
  Stack,
  Group,
  Loader,
  Alert,
  Divider,
} from "@mantine/core";
import { PlayerResult } from "@/components/playerresult";
import { useMatchResults } from "@/lib/api/queries";
import { useState } from "react";
import styles from "../MatchResult.module.css";

export default function MatchResultPage() {
  const params = useParams();
  const router = useRouter();
  const matchId = Number(params.match_id);
  const { data, isLoading, isError, error } = useMatchResults(matchId);
  const [selectedPlayer, setSelectedPlayer] = useState<"winner" | "loser">("winner");

  if (isNaN(matchId)) {
    return <Alert color="red">Invalid match ID.</Alert>;
  }

  if (isLoading) {
    return (
      <Flex h="100vh" align="center" justify="center" bg="#1a1a1a" c="white">
        <Stack align="center">
          <Loader size="lg" />
          <Text>Loading match results...</Text>
        </Stack>
      </Flex>
    );
  }

  if (isError) {
    const message =
      error instanceof Error && error.message === "Match not found"
        ? "This match ID does not exist."
        : "Failed to load match results.";

    return (
      <Flex h="100vh" align="center" justify="center" bg="#1a1a1a" c="white">
        <Paper bg="dark.6" p="xl" radius="md">
          <Alert color="red" title="Error" mb="md">
            {message}
          </Alert>
          <Group justify="center">
            <Button onClick={() => router.push("/dashboard")}>Dashboard</Button>
            <Button variant="outline" onClick={() => router.back()}>
              Go Back
            </Button>
          </Group>
        </Paper>
      </Flex>
    );
  }

  if (!data) {
    return (
      <Flex h="100vh" align="center" justify="center" bg="#1a1a1a" c="white">
        <Text>No match data found.</Text>
      </Flex>
    );
  }

  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  };

  const result = {
    match_id: data.match_id,
    problem: {
      title: data.problem || "Unknown Problem",
      slug: data.problem || "unknown",
      difficulty: "Medium",
    },
    duration: formatDuration(data.match_duration || 0),
    winner: {
      username: data.winner?.username || "Winner",
      runtime: data.winner?.runtime || 0,
      memory: data.winner?.memory || 0,
      elo_change: data.winner?.elo_change || data.elo_change || 0,
    },
    loser: {
      username: data.loser?.username || "Loser",
      runtime: data.loser?.runtime || 0,
      memory: data.loser?.memory || 0,
      elo_change: data.loser?.elo_change || -data.elo_change || 0,
    },
  };

  const performanceData = {
    winner: {
      executionTime:
        result.winner.runtime === -1 ? "N/A" : `${result.winner.runtime} ms`,
      memoryUsage:
        result.winner.memory === -1 ? "N/A" : `${result.winner.memory} MB`,
      description: "Winner's Stats:",
    },
    loser: {
      executionTime:
        result.loser.runtime === -1 ? "N/A" : `${result.loser.runtime} ms`,
      memoryUsage:
        result.loser.memory === -1 ? "N/A" : `${result.loser.memory} MB`,
      description: "Loser's Stats:",
    },
  };

  const getStatValueClass = (value: string, type: "runtime" | "memory") => {
    if (value === "N/A") return styles.statValueNA;
    if (type === "memory") return styles.statValueMemory;
    return selectedPlayer === "winner" ? styles.statValueWinner : styles.statValueLoser;
  };

  return (
    <Flex
      h="100vh"
      w="100%"
      bg="#1a1a1a"
      c="white"
      align="center"
      justify="center"
      direction="column"
      gap="xl"
      p="xl"
    >
      <Title order={1} className={`title-gradient ${styles.title}`}>
        RESULTS
      </Title>

      <Flex gap="6rem" align="flex-start" justify="center">
        <Stack gap="sm">
          <Text fw={700} size="lg" tt="uppercase" c="dimmed">
            {selectedPlayer === "winner"
              ? `${result.winner.username}'s Performance`
              : `${result.loser.username}'s Performance`}
          </Text>
          <Paper shadow="lg" radius="md" p="lg" className={styles.performancePaper}>
            <Stack gap="sm" h="100%" justify="space-between">
              <Stack gap="xs">
                <Text size="lg" fw={600}>
                  {performanceData[selectedPlayer].description}
                </Text>
                <Flex justify="space-between" align="center" p="sm" className={styles.statRow}>
                  <Text size="sm" c="dimmed">
                    Runtime:
                  </Text>
                  <Text
                    size="lg"
                    fw={700}
                    className={`${styles.statValue} ${getStatValueClass(performanceData[selectedPlayer].executionTime, "runtime")}`}
                  >
                    {performanceData[selectedPlayer].executionTime}
                  </Text>
                </Flex>

                <Flex justify="space-between" align="center" p="sm" className={styles.statRow}>
                  <Text size="sm" c="dimmed">
                    Memory:
                  </Text>
                  <Text
                    size="lg"
                    fw={700}
                    className={`${styles.statValue} ${getStatValueClass(performanceData[selectedPlayer].memoryUsage, "memory")}`}
                  >
                    {performanceData[selectedPlayer].memoryUsage}
                  </Text>
                </Flex>
              </Stack>
            </Stack>
          </Paper>
        </Stack>

        <Stack gap="lg">
          <Stack>
            <PlayerResult
              name={result.winner.username}
              tag="W"
              isWinner
              active={selectedPlayer === "winner"}
              onClick={() => setSelectedPlayer("winner")}
            />
            <PlayerResult
              name={result.loser.username}
              tag="L"
              active={selectedPlayer === "loser"}
              onClick={() => setSelectedPlayer("loser")}
            />
          </Stack>

          <Divider my="sm" color="gray.7" />

          <Stack gap="xs">
            <Text>
              <b>Problem:</b>{" "}
              <span className="problem-name">{result.problem.title}</span>
            </Text>
            <Text>
              <b>Duration:</b>{" "}
              <span className={styles.duration}>{result.duration}</span>
            </Text>
            <Text>
              <b>Winner ELO:</b>{" "}
              <span className={styles.eloWinner}>+{result.winner.elo_change}</span>
            </Text>
            <Text>
              <b>Loser ELO:</b>{" "}
              <span className={styles.eloLoser}>{result.loser.elo_change}</span>
            </Text>
          </Stack>
        </Stack>
      </Flex>

      <Group mt="xl" gap="lg">
        <Button onClick={() => router.push("/match")}>New Game</Button>
        <Button
          variant="light"
          color="blue"
          component="a"
          href={`https://leetcode.com/problems/${result.problem.slug}/`}
          target="_blank"
        >
          View Problem
        </Button>
        <Button variant="outline" onClick={() => router.push("/home")}>
          Home
        </Button>
      </Group>

      <Text size="xs" c="dimmed" mt="md">
        Match ID: {matchId}
      </Text>
    </Flex>
  );
}
