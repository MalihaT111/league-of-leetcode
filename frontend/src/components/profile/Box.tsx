import { Box, Stack, Text } from "@mantine/core";
import styles from "./Profile.module.css";

interface ProfileBoxProps {
  username?: string;
  rating?: number;
}

export function ProfileBox({ username, rating }: ProfileBoxProps) {
  const isUnknown = !username;

  return (
    <Stack align="center" gap="xs">
      <Box className={styles.profileBox}>
        {isUnknown ? (
          <Text fw={700} fz={40}>
            ?
          </Text>
        ) : (
          <Text fw={700} fz={32}></Text>
        )}
      </Box>

      {isUnknown ? (
        <Text c="rgba(220, 220, 255, 1)">???</Text>
      ) : (
        <Stack gap={0} align="center">
          <Text fw={700} c="rgba(220, 220, 255, 1)">{username}</Text>
          <Text fz="sm" c="rgba(220, 220, 255, 1)">
            ({rating})
          </Text>
        </Stack>
      )}
    </Stack>
  );
}
