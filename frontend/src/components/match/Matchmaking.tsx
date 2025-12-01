import { Flex, Title, Text, Button, Stack } from "@mantine/core";
import Navbar from "../all/Navbar";
import { montserrat, orbitron } from "@/app/fonts";
import { ProfileBox } from "../profile/profilebox";
import { UseMutationResult } from "@tanstack/react-query";
import { User } from "@/utils/auth";

interface MatchmakingProps {
  user: User; 
  seconds: number;
  handleLeaveQueue: () => Promise<void>;
  isLeaving?: boolean;
  connectionStatus?: string;
}

export default function Matchmaking({ user, seconds, handleLeaveQueue, isLeaving = false, connectionStatus }: MatchmakingProps) {
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
      <Title
        className="title-gradient"
        order={1}
        style={{ fontSize: "4.5rem" }}
      >
        MATCHMAKING
      </Title>

      {/* Profile Row */}
      <Flex align="center" justify="center" gap="xl">
        <Stack align="center" gap="xs">
          <ProfileBox username={user?.leetcode_username} rating={user?.user_elo} />
        </Stack>

        <Stack align="center" gap="xs">
          <Text
            style={{
              fontSize: "30px",
              fontStyle: "italic",
              fontWeight: 700,
              lineHeight: "1",
              fontFamily: "var(--font-montserrat), sans-serif",
            }}
            size="sm"
            c="dimmed"
            ta="center"
          >
            finding a worthy opponent...
          </Text>
          {connectionStatus && (
            <Text size="xs" c="dimmed">
              {connectionStatus}
            </Text>
          )}
          <div
            style={{
              width: 60,
              height: 60,
              border: "4px solid white",
              borderRadius: "50%",
            }}
          />
          <Text
            size="sm"
            className={orbitron.className}
            style={{
              fontSize: "28px",
              fontWeight: 700,
              letterSpacing: "2px",
            }}
          >
            {formatted}
          </Text>
        </Stack>

        <Stack align="center" gap="xs">
          <ProfileBox /> {/* Unknown opponent */}
        </Stack>
      </Flex>

            {/* Cancel button */}
      <Button
        size="xl"
        radius="sm"
        variant="filled"
        color="yellow"
        mt="xl"
        style={{ fontWeight: "bold" }}
        onClick={handleLeaveQueue}
        loading={isLeaving}
      >
        Cancel
      </Button>
    </Flex>
  );
}
