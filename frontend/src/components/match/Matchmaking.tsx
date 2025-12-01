import { Flex, Title, Text, Button, Stack } from "@mantine/core";
import Navbar from "../all/Navbar";
import { orbitron } from "@/app/fonts";
import { ProfileBox } from "../profile/Box";
import { User } from "@/utils/auth";
import styles from "./Match.module.css";

interface MatchmakingProps {
  user: User;
  seconds: number;
  handleLeaveQueue: () => Promise<void>;
  isLeaving?: boolean;
  connectionStatus?: string;
}

export default function Matchmaking({
  user,
  seconds,
  handleLeaveQueue,
  isLeaving = false,
  connectionStatus,
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
      bg="dark"
      c="white"
      gap="xl"
    >
      <Navbar />
      <Title order={1} className={`title-gradient ${styles.matchmakingTitle}`}>
        MATCHMAKING
      </Title>

      <Flex align="center" justify="center" gap="xl">
        <Stack align="center" gap="xs">
          <ProfileBox username={user?.leetcode_username} rating={user?.user_elo} />
        </Stack>

        <Stack align="center" gap="xs">
          <Text size="sm" c="dimmed" ta="center" className={styles.searchingText}>
            finding a worthy opponent...
          </Text>
          {connectionStatus && (
            <Text size="xs" c="dimmed">
              {connectionStatus}
            </Text>
          )}
          <div className={styles.timerCircle} />
          <Text size="sm" className={`${orbitron.className} ${styles.timerText}`}>
            {formatted}
          </Text>
        </Stack>

        <Stack align="center" gap="xs">
          <ProfileBox />
        </Stack>
      </Flex>

      <Button
        size="xl"
        radius="sm"
        variant="filled"
        color="yellow"
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
