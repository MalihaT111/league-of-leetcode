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
import { Space_Grotesk } from "next/font/google";
import { PlayerResult } from "@/components/match/Result";
import { useMatchResults } from "@/lib/api/queries";
import { useState, useEffect } from "react";
import ResultCode from "@/components/match-results/ResultCode";
import ResultStats from "@/components/match-results/ResultStats";
import styles from "../MatchResult.module.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

// Animated ELO counter hook
function useAnimatedNumber(target: number, duration: number = 700, delay: number = 600) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    const timeout = setTimeout(() => {
      const startTime = Date.now();
      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        // Ease out cubic
        const eased = 1 - Math.pow(1 - progress, 3);
        setValue(Math.round(target * eased));
        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      };
      animate();
    }, delay);
    return () => clearTimeout(timeout);
  }, [target, duration, delay]);

  return value;
}

export default function MatchResultPage() {
  const params = useParams();
  const router = useRouter();
  const matchId = Number(params.match_id);
  const { data, isLoading, isError, error } = useMatchResults(matchId);
  const [selectedPlayer, setSelectedPlayer] = useState<"winner" | "loser">("winner");

  // Get actual ELO values for animation
  const winnerElo = data?.winner?.elo_change || data?.elo_change || 0;
  const loserElo = data?.loser?.elo_change || -(data?.elo_change || 0);
    const [resultsBox, setResultsBox] = useState<"stats" | "code">(
    "code"
  );

  const animatedWinnerElo = useAnimatedNumber(winnerElo, 700, 600);
  const animatedLoserElo = useAnimatedNumber(Math.abs(loserElo), 700, 700);

  if (isNaN(matchId)) {
    return <Alert color="red">Invalid match ID.</Alert>;
  }

  if (isLoading) {
    return (
      <Flex
        h="100vh"
        align="center"
        justify="center"
        className={spaceGrotesk.className}
        style={{ background: "#0d0d0f", color: "rgba(220, 220, 255, 1)" }}
      >
        <Stack align="center">
          <Loader size="lg" color="violet" />
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
      <Flex
        h="100vh"
        align="center"
        justify="center"
        className={spaceGrotesk.className}
        style={{ background: "#0d0d0f", color: "rgba(220, 220, 255, 1)" }}
      >
        <Paper p="xl" radius="md" className={styles.performancePaper}>
          <Alert color="red" title="Error" mb="md">
            {message}
          </Alert>
          <Group justify="center">
            <Button className={styles.glassButtonPrimary} onClick={() => router.push("/home")}>
              Home
            </Button>
            <Button className={styles.glassButton} onClick={() => router.back()}>
              Go Back
            </Button>
          </Group>
        </Paper>
      </Flex>
    );
  }

  if (!data) {
    return (
      <Flex
        h="100vh"
        align="center"
        justify="center"
        className={spaceGrotesk.className}
        style={{ background: "#0d0d0f", color: "rgba(220, 220, 255, 1)" }}
      >
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
      title: data.problem.title || "Unknown Problem",
      slug: data.problem.slug || "unknown",
      url: data.problem.url || "unknown",
      difficulty: "Medium", // Mock difficulty
    },
    duration: formatDuration(data.match_duration || 0),
    winner: {
      username: data.winner?.username || "Winner",
      runtime: data.winner?.runtime || 0,
      memory: data.winner?.memory || 0,
      elo_change: winnerElo,
      code: data.winner?.code || "",
    },
    loser: {
      username: data.loser?.username || "Loser",
      runtime: data.loser?.runtime || 0,
      memory: data.loser?.memory || 0,
      elo_change: loserElo,
      code: data.loser?.code || "",
    },
  };

  const performanceData = {
    winner: {
      executionTime:
        result.winner.runtime === -1 ? "N/A" : `${result.winner.runtime} ms`,
      memoryUsage:
        result.winner.memory === -1 ? "N/A" : `${result.winner.memory} MB`,
      code: result.winner.code
    },
    loser: {
      executionTime:
        result.loser.runtime === -1 ? "N/A" : `${result.loser.runtime} ms`,
      memoryUsage:
        result.loser.memory === -1 ? "N/A" : `${result.loser.memory} MB`,
      code: result.loser.code
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
      align="center"
      justify="center"
      direction="column"
      gap={24}
      p="xl"
      className={spaceGrotesk.className}
      style={{ background: "#0d0d0f", color: "rgba(220, 220, 255, 1)" }}
    >
      <Title order={1} className={`title-gradient ${styles.title}`}>
        RESULTS
      </Title>

      {/* Unified content block */}
      <div className={styles.contentBlock}>
        {/* Left: Stats Panel */}
        <Stack gap="sm">
          <Text fw={600} size="sm" tt="uppercase" className={styles.performanceHeader}>
            {selectedPlayer === "winner"
              ? `${result.winner.username}'s Performance`
              : `${result.loser.username}'s Performance`}
          </Text>
          <Paper radius="md" p="lg" className={styles.performancePaper}>
            <Stack gap="md">
              <Text size="xs" tt="uppercase" className={styles.statsHeader}>
                {
                  resultsBox === "code"
                    ? selectedPlayer === "winner"
                      ? "Winner's Code"
                      : "Loser's Code"
                    : selectedPlayer === "winner"
                      ? "Winner's Stats"
                      : "Loser's Stats"
                }
              </Text>
                {resultsBox === "code" ? (
                    <ResultCode
                      code={performanceData[selectedPlayer].code}
                    />
                ) : (
                    <ResultStats
                      time={performanceData[selectedPlayer].executionTime}
                      memory={performanceData[selectedPlayer].memoryUsage}
                    />
                )}
            </Stack>
          </Paper>
          <Button
            variant="light"
            fullWidth
            onClick={() =>
              setResultsBox(resultsBox === "code" ? "stats" : "code")
            }
          >
            {resultsBox === "code" ? "View Stats" : "View Code"}
          </Button>
        </Stack>

        {/* Right: Player Cards + Info */}
        <Stack gap="md">
          <div className={styles.playerColumn}>
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
          </div>

          <Divider color="rgba(189, 155, 255, 0.15)" />

          <Stack gap={6} className={styles.infoSection}>
            <Text size="sm" c="rgba(220, 220, 255, 0.85)">
              <b>Problem:</b>{" "}
              <span className={styles.problemTitle}>{result.problem.title}</span>
            </Text>
            <Text size="sm" c="rgba(220, 220, 255, 0.85)">
              <b>Duration:</b>{" "}
              <span className={styles.duration}>{result.duration}</span>
            </Text>
            <Text size="sm" c="rgba(220, 220, 255, 0.85)">
              <b>Winner ELO:</b>{" "}
              <span className={styles.eloWinner}>+{animatedWinnerElo}</span>
            </Text>
            <Text size="sm" c="rgba(220, 220, 255, 0.85)">
              <b>Loser ELO:</b>{" "}
              <span className={styles.eloLoser}>-{animatedLoserElo}</span>
            </Text>
          </Stack>
        </Stack>
      </div>

      <Group mt="sm" gap="md">
        <Button className={styles.glassButtonPrimary} onClick={() => router.push("/match")}>
          New Game
        </Button>
        <Button
          className={styles.glassButton}
          component="a"
          href={result.problem.url}
          target="_blank"
        >
          View Problem
        </Button>
        <Button className={styles.glassButton} onClick={() => router.push("/home")}>
          Home
        </Button>
      </Group>

      <Text className={styles.matchId}>
        Match ID: {matchId}
      </Text>
    </Flex>
  );
}
