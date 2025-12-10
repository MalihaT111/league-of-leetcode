import { Box, Stack, Text, Avatar } from "@mantine/core";
import styles from "./Profile.module.css";

interface ProfileBoxProps {
  username?: string;
  rating?: number;
  profilePictureUrl?: string | null;
}

export function ProfileBox({ username, rating, profilePictureUrl }: ProfileBoxProps) {
  const isUnknown = !username;

  return (
    <Stack align="center" gap="xs">
      <Box className={styles.profileBox}>
        {isUnknown ? (
          <Text fw={700} fz={40}>
            ?
          </Text>
        ) : (
          <Avatar
            size={146}
            radius={8}
            src={profilePictureUrl || undefined}
            className={styles.matchmakingAvatar}
          >
            {username?.charAt(0).toUpperCase()}
          </Avatar>
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
