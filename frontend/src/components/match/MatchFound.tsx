import { useEffect, useState } from "react";
import { Flex, Title, Text, Button, Anchor } from "@mantine/core";
import { useRouter } from "next/navigation";
import Navbar from "../all/Navbar";
import { ProfileBox } from "../profile/profilebox";
import { orbitron, montserrat } from "@/app/fonts";
import { useSubmitSolution, useMatchStatus, useMatchRatingPreview } from "@/lib/api/queries/matchmaking";

interface MatchFoundProps {
  match: {
    match_id: number;
    opponent: string;
    opponent_elo: number;
    problem: {
      difficulty: string,
      title: string,
      titleSlug: string
    };
  };
  user: any;
  onSubmit?: () => void;
  onResign?: () => void;
  timerPhase?: 'countdown' | 'start' | 'active' | null;
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
  matchSeconds = 0, 
  formattedTime = "00:00" 
}: MatchFoundProps) {
  const [matchCompleted, setMatchCompleted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResigning, setIsResigning] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const [isOnCooldown, setIsOnCooldown] = useState(false);
  
  const router = useRouter();
  const submitSolutionMutation = useSubmitSolution();
  
  // Poll for match completion (fallback only)
  const { data: matchStatus } = useMatchStatus(user.id, timerPhase === 'active' && !matchCompleted);
  
  // Get rating preview for this match
  const { data: ratingPreview } = useMatchRatingPreview(match.match_id, true);
  
  // Cooldown timer effect
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
  
  // Server handles all timing - no local timer needed

  // Check for match completion
  useEffect(() => {
    if (matchStatus?.status === "completed" && !matchCompleted) {
      setMatchCompleted(true);
      
      // Redirect to existing results page after a short delay
      setTimeout(() => {
        router.push(`/match-result/${match.match_id}`);
      }, 2000);
    }
  }, [matchStatus, matchCompleted, router, match.match_id]);

  // Reset loading states when there's an error (invalid submission)
  useEffect(() => {
    // Reset button loading states when submission fails
    if (submitSolutionMutation.isError && (isSubmitting || isResigning)) {
      setIsSubmitting(false);
      setIsResigning(false);
    }
  }, [submitSolutionMutation.isError, isSubmitting, isResigning]);

  // Handle submit solution
  const handleSubmit = async () => {
    if (isOnCooldown) return;
    
    setIsSubmitting(true);
    
    try {
      // Check if user has a valid recent submission
      if (!user.leetcode_username) {
        console.error("User has no LeetCode username");
        setIsSubmitting(false);
        return;
      }

      // Fetch user's most recent submission
      console.log(user.leetcode_username);
      const response = await fetch(`http://127.0.0.1:8000/api/leetcode/user/${user.leetcode_username}/recent-submission`);
      if (!response.ok) {
        throw new Error("Failed to get recent submission");
      }
      
      const recentSubmission = await response.json();
      
      // Check if user has any recent submissions
      if (!recentSubmission || !recentSubmission.titleSlug) {
        console.log("No recent submissions found");
        setIsSubmitting(false);
        setIsOnCooldown(true);
        setCooldownSeconds(10);
        return;
      }
      
      // Check if the submission matches the current problem
      if (recentSubmission.titleSlug === match.problem.titleSlug) {
        // Valid submission - user wins!
        if (onSubmit) {
          // Use WebSocket submission - don't change any state, just show loading
          onSubmit();
          // Don't set matchCompleted - let WebSocket handle redirect
        } else {
          // Fallback to REST API
          await submitSolutionMutation.mutateAsync({
            matchId: match.match_id,
            userId: user.id
          });
          
          // Redirect to existing results page after short delay
          setTimeout(() => {
            router.push(`/match-result/${match.match_id}`);
          }, 2000);
        }
      } else {
        // Invalid submission - start cooldown
        console.log(`Submission mismatch: expected ${match.problem.titleSlug}, got ${recentSubmission.titleSlug}`);
        console.log("Please solve the correct problem before submitting!");
        setIsSubmitting(false);
        setIsOnCooldown(true);
        setCooldownSeconds(10);
      }
    } catch (error) {
      console.error("Failed to validate submission:", error);
      setIsSubmitting(false);
      // Start cooldown on error as well
      setIsOnCooldown(true);
      setCooldownSeconds(10);
    }
  };

  // Handle resignation
  const handleResign = () => {
    setIsResigning(true);
    
    if (onResign) {
      // Use WebSocket resignation - don't change any state, just show loading
      onResign();
      // Don't set matchCompleted - let WebSocket handle redirect
    } else {
      // Fallback - redirect to results
      router.push(`/match-result/${match.match_id}`);
    }
  };
  

  const problem = match.problem;
  const link = `https://leetcode.com/problems/${problem.titleSlug}`;

  // Server-controlled timer display
  let displayText;
  let fontSize = "60px";
  
  if (matchCompleted) {
    displayText = "MATCH COMPLETED";
  } else if (timerPhase === 'countdown') {
    displayText = countdown;
    fontSize = "80px";
  } else if (timerPhase === 'start') {
    displayText = "START!";
  } else if (timerPhase === 'active') {
    displayText = formattedTime;
  } else {
    // Fallback while waiting for server timer
    displayText = "...";
  }

  return (
    <Flex
      h="100vh"
      w="100%"
      direction="column"
      align="center"
      justify="center"
      bg="dark"
      c="white"
      gap="lg"
    >
      <Navbar />
      {/* Title */}
      <Title
        order={1}
        className="title-gradient"
        style={{ fontSize: "3rem" }}
      >
        MATCH FOUND
      </Title>

      {/* Players row */}
      <Flex align="center" justify="center" gap="6rem">
        <ProfileBox username={user.leetcode_username || "User 1"} rating={user.user_elo} />

        <Text
          className={orbitron.className}
          style={{ fontSize: "40px", fontWeight: 700 }}
        >
          VS
        </Text>

        <ProfileBox username={match.opponent} rating={match.opponent_elo} />
      </Flex>

      {/* Countdown or Match Timer */}
      <Text
        className={orbitron.className}
        style={{
          fontSize: fontSize,
          fontWeight: 700,
          letterSpacing: "4px",
        }}
      >
        {displayText}
      </Text>

      {/* Problem link */}
      <Text size="sm" style={{ fontFamily: "monospace" }}>
        Problem Link:{" "}
        <Anchor
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            color: "#1e88e5", // bright blue
            textDecoration: "underline",
            fontWeight: "bold",
          }}
        >
          {link}
        </Anchor>
      </Text>

      {/* Rules */}
      <Text size="sm" c="dimmed">
        {ratingPreview ? (
          (() => {
            // Find which player is the current user
            const currentPlayer = ratingPreview.player1.id === user.id ? ratingPreview.player1 : ratingPreview.player2;
            const winChange = currentPlayer.rating_change_on_win;
            const lossChange = currentPlayer.rating_change_on_loss;
            const resignChange = lossChange - 2; // Resignation penalty is -2 additional
            
            return `win ${winChange >= 0 ? '+' : ''}${winChange} / lose ${lossChange} / resign ${resignChange}`;
          })()
        ) : (
          "Loading ELO changes..."
        )}
      </Text>

      {/* Buttons */}
      <Flex gap="xl" mt="lg">
        <Button
          size="lg"
          radius="sm"
          variant="filled"
          color="gray"
          style={{
            fontWeight: "bold",
            backgroundColor: isOnCooldown ? "#CCCCCC" : "#E5E5E5",
            color: "black",
          }}
          onClick={handleSubmit}
          loading={isSubmitting || submitSolutionMutation.isPending}
          disabled={timerPhase !== 'active' || matchCompleted || isSubmitting || isResigning || isOnCooldown}
        >
          {isOnCooldown ? `Submit (${cooldownSeconds}s)` : "Submit"}
        </Button>
        <Button
          size="lg"
          radius="sm"
          variant="filled"
          color="gray"
          style={{
            fontWeight: "bold",
            backgroundColor: "#E5E5E5",
            color: "black",
          }}
          onClick={handleResign}
          loading={isResigning}
          disabled={timerPhase !== 'active' || matchCompleted || isSubmitting || isResigning}
        >
          Resign
        </Button>
      </Flex>

      {/* Cooldown message */}
      {isOnCooldown && (
        <Text size="sm" c="red" mt="sm" ta="center">
          Please solve the correct problem before submitting!
        </Text>
      )}
    </Flex>
  );
}