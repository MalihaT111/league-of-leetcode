import React from "react";
import { Flex, Text } from "@mantine/core";
import { montserrat } from "@/app/fonts";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import ProfilePictureUpload from "./ProfilePictureUpload";
import styles from "./Profile.module.css";

interface ProfileHeaderProps {
  username: string;
  userId: number;
  profilePictureUrl?: string;
}

export default function ProfileHeader({ 
  username, 
  userId, 
  profilePictureUrl 
}: ProfileHeaderProps) {
  const { currentUserId } = useCurrentUser();
  const isOwnProfile = currentUserId === userId;

  return (
    <Flex align="center" gap="sm" p="sm" className={styles.headerContainer}>
      <ProfilePictureUpload
        currentPictureUrl={profilePictureUrl}
        username={username}
        userId={userId}
        isOwnProfile={isOwnProfile}
      />

      <Text className={`${montserrat.className} ${styles.headerUsername}`} c="white">
        {username}
      </Text>
    </Flex>
  );
}
