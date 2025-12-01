import { useEffect, useState } from "react";
import { Flex, Title, Text, Button, Anchor } from "@mantine/core";
import { Space_Grotesk } from "next/font/google";
import { useRouter } from "next/navigation";
import Navbar from "../all/Navbar";
import { ProfileBox } from "../profile/Box";
import { orbitron } from "@/app/fonts";
import { useSubmitSolution, useMatchStatus, useMatchRatingPreview } from "@/lib/api/queries/matchmaking";
import styles from "./Match.module.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

interface MatchFoundProps {
  match: {
    match_id: number;
    opponent: string;
    opponent_elo: number;
    problem: {
      difficulty: string;
      title: string;
      titleSlug: string;
    };
  };
  user: any;
  onSubmit?: () => void;
  onResign?: () => void;
  timerPhase?: "countdown" | "start" | "active" | null;
  countdown?: number;
  matchSeconds?: number;
  formattedTime?: string;
}

export default function MatchFound({
  match,
  user,
  onSubmit,
  onResign,
  timerPhase,
  countdown = 3,
  formattedTime = "00:00",
}: MatchFoundProps) {
  const [matchCompleted, setMatchCompleted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResigning, setIsResigning] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const [isOnCooldown, setIsOnCooldown] = useState(false);

  const router = useRouter();
  const submitSolutionMutation = useSubmitSolution();

  const { data: matchStatus } = useMatchStatus(
    user.id,
    timerPhase === "active" && !matchCompleted
  );
  const { data: ratingPreview } = useMatchRatingPreview(match.match_id, true);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isOnCooldown && cooldownSeconds > 0) {
      interval = setInterval(() => {
        setCooldownSeconds((prev) => {
          if (prev <= 1) {
            setIsOnCooldown(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isOnCooldown, cooldownSeconds]);

  useEffect(() => {
    if (matchStatus?.status === "completed" && !matchCompleted) {
      setMatchCompleted(true);
      setTimeout(() => {
        router.push(`/match-result/${match.match_id}`);
      }, 2000);
    }
  }, [matchStatus, matchCompleted, router, match.match_id]);

  useEffect(() => {
    if (submitSolutionMutation.isError && (isSubmitting || isResigning)) {
      setIsSubmitting(false);
      setIsResigning(false);
    }
  }, [submitSolutionMutation.isError, isSubmitting, isResigning]);

  const handleSubmit = async () => {
    if (isOnCooldown) return;
    setIsSubmitting(true);

    try {
      if (!user.leetcode_username) {
        setIsSubmitting(false);
        return;
      }

      const response = await fetch(
        `http://127.0.0.1:8000/api/leetcode/user/${user.leetcode_username}/recent-submission`
      );
      if (!response.ok) throw new Error("Failed to get recent submission");

      const recentSubmission = await response.json();

      if (!recentSubmission || !recentSubmission.titleSlug) {
        setIsSubmitting(false);
        setIsOnCooldown(true);
        setCooldownSeconds(10);
        return;
      }

      if (recentSubmission.titleSlug === match.problem.titleSlug) {
        if (onSubmit) {
          onSubmit();
        } else {
          await submitSolutionMutation.mutateAsync({
            matchId: match.match_id,
            userId: user.id,
          });
          setTimeout(() => {
            router.push(`/match-result/${match.match_id}`);
          }, 2000);
        }
      } else {
        setIsSubmitting(false);
        setIsOnCooldown(true);
        setCooldownSeconds(10);
      }
    } catch {
      setIsSubmitting(false);
      setIsOnCooldown(true);
      setCooldownSeconds(10);
    }
  };

  const handleResign = () => {
    setIsResigning(true);
    if (onResign) {
      onResign();
    } else {
      router.push(`/match-result/${match.match_id}`);
    }
  };

  const problem = match.problem;
  const link = `https://leetcode.com/problems/${problem.titleSlug}`;

  let displayText;
  let fontSize = "60px";

  if (matchCompleted) {
    displayText = "MATCH COMPLETED";
  } else if (timerPhase === "countdown") {
    displayText = countdown;
    fontSize = "80px";
  } else if (timerPhase === "start") {
    displayText = "START!";
  } else if (timerPhase === "active") {
    displayText = formattedTime;
  } else {
    displayText = "...";
  }

  return (
    <Flex
      h="100vh"
      w="100%"
      direction="column"
      align="center"
      justify="center"
      gap="lg"
      className={spaceGrotesk.className}
      style={{ background: "#0d0d0f", color: "rgba(220, 220, 255, 0.85)" }}
    >
      <Navbar />

      <Title order={1} className={`title-gradient ${styles.matchFoundTitle}`}>
        MATCH FOUND
      </Title>

      <Flex align="center" justify="center" gap="4rem">
        {/* LEFT PLAYER */}
        <div className={`${styles.matchFoundCard} ${styles.matchFoundCardLeft}`}>
          <ProfileBox
            username={user.leetcode_username || "User 1"}
            rating={user.user_elo}
          />
        </div>

        {/* VS */}
        <Text className={`${styles.vsHolo} ${orbitron.className}`}>VS</Text>

        {/* RIGHT PLAYER */}
        <div className={`${styles.matchFoundCard} ${styles.matchFoundCardRight}`}>
          <ProfileBox username={match.opponent} rating={match.opponent_elo} />
        </div>
      </Flex>

      <Text
        className={`${orbitron.className} ${styles.countdownText}`}
        style={{ fontSize }}
      >
        {displayText}
      </Text>

      <Text size="sm" className={styles.problemLink}>
        Problem Link:{" "}
        <Anchor
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.problemAnchor}
        >
          {link}
        </Anchor>
      </Text>

      <Text size="sm" c="rgba(220, 220, 255, 0.6)">
        {ratingPreview
          ? (() => {
              const currentPlayer =
                ratingPreview.player1.id === user.id
                  ? ratingPreview.player1
                  : ratingPreview.player2;
              const winChange = currentPlayer.rating_change_on_win;
              const lossChange = currentPlayer.rating_change_on_loss;
              const resignChange = lossChange - 2;
              return `win ${winChange >= 0 ? "+" : ""}${winChange} / lose ${lossChange} / resign ${resignChange}`;
            })()
          : "Loading ELO changes..."}
      </Text>

      <Flex gap="xl" mt="lg">
        <Button
          size="lg"
          radius="sm"
          variant="filled"
          color="gray"
          className={isOnCooldown ? styles.actionButtonDisabled : styles.actionButton}
          onClick={handleSubmit}
          loading={isSubmitting || submitSolutionMutation.isPending}
          disabled={
            timerPhase !== "active" ||
            matchCompleted ||
            isSubmitting ||
            isResigning ||
            isOnCooldown
          }
        >
          {isOnCooldown ? `Submit (${cooldownSeconds}s)` : "Submit"}
        </Button>
        <Button
          size="lg"
          radius="sm"
          variant="filled"
          color="gray"
          className={styles.actionButton}
          onClick={handleResign}
          loading={isResigning}
          disabled={
            timerPhase !== "active" ||
            matchCompleted ||
            isSubmitting ||
            isResigning
          }
        >
          Resign
        </Button>
      </Flex>

      {isOnCooldown && (
        <Text size="sm" c="red" mt="sm" ta="center">
          Please solve the correct problem before submitting!
        </Text>
      )}
    </Flex>
  );
}
