import { Flex, Title, Text, Button, Stack } from "@mantine/core";
import { Space_Grotesk } from "next/font/google";
import Navbar from "../all/Navbar";
import { orbitron } from "@/app/fonts";
import { ProfileBox } from "../profile/Box";
import { User } from "@/utils/auth";
import styles from "./Match.module.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

interface QueueStatus {
  queueSize: number;
  waitTime: number;
  eloRange: number;
  potentialMatches: number;
  message: string;
}

interface MatchmakingProps {
  user: User;
  seconds: number;
  handleLeaveQueue: () => Promise<void>;
  isLeaving?: boolean;
  connectionStatus?: string;
  queueStatus?: QueueStatus | null;
}

export default function Matchmaking({
  user,
  seconds,
  handleLeaveQueue,
  isLeaving = false,
  connectionStatus,
  queueStatus,
}: MatchmakingProps) {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const formatted = `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;

  return (
    <Flex
      h="100vh"
      w="100%"
      direction="column"
      align="center"
      justify="center"
      gap="xl"
      className={spaceGrotesk.className}
      style={{ position: "relative", background: "#0d0d0f", color: "rgba(220, 220, 255, 1)" }}
    >
      <Navbar />

      <Title order={1} className={`title-gradient ${styles.matchmakingTitle}`}>
        MATCHMAKING
      </Title>

      <Stack align="center" gap="xs" mt={-10}>
        <Text className={styles.searchingText} ta="center">
          {queueStatus?.message || "finding a worthy opponent..."}
        </Text>
        
        {queueStatus && (
          <Stack align="center" gap={4}>
            <Text size="sm" c="rgba(220, 220, 255, 0.8)" ta="center">
              {queueStatus.queueSize} players in queue • ±{queueStatus.eloRange} ELO range
            </Text>
            {queueStatus.potentialMatches > 0 && (
              <Text size="xs" c="rgba(220, 220, 255, 0.6)" ta="center">
                {queueStatus.potentialMatches} potential match{queueStatus.potentialMatches !== 1 ? 'es' : ''} found
              </Text>
            )}
          </Stack>
        )}
      </Stack>

      <Flex align="center" justify="center" gap="5rem" mt="lg">
        {/* LEFT PLAYER */}
        <div className={styles.playerCard}>
          <ProfileBox 
            username={user?.leetcode_username} 
            rating={user?.user_elo} 
            profilePictureUrl={user?.profile_picture_url}
          />
        </div>

        {/* CENTER - VS + TIMER */}
        <Stack align="center" gap="sm" className={styles.centerStack}>
          <Text className={`${styles.vsHolo} ${orbitron.className}`}>VS</Text>
          <div className={styles.timerCircle} />
          <Text className={`${orbitron.className} ${styles.timerText}`}>
            {formatted}
          </Text>
          {connectionStatus && (
            <Text size="xs" c="rgba(220, 220, 255, 1)">
              {connectionStatus}
            </Text>
          )}
        </Stack>

        {/* RIGHT PLAYER (placeholder) */}
        <div className={`${styles.playerCard} ${styles.opponentGlow}`}>
          <ProfileBox />
          <Text fz="sm" c="rgba(220, 220, 255, 1)">Searching...</Text>
        </div>
      </Flex>

      <Button
        size="xl"
        radius="sm"
        variant="light"
        mt="xl"
        className={styles.cancelButton}
        onClick={handleLeaveQueue}
        loading={isLeaving}
      >
        Cancel
      </Button>
    </Flex>
  );
}
