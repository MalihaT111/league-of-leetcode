import React from "react";
import { Avatar, Flex, Text } from "@mantine/core";
import { montserrat } from "@/app/fonts";
import styles from "./Profile.module.css";

export default function ProfileHeader({ username }: { username: string }) {
  return (
    <Flex align="center" gap="sm" p="sm" className={styles.headerContainer}>
      <Avatar size={40} radius="xl" className={styles.headerAvatar} />

      <Text className={`${montserrat.className} ${styles.headerUsername}`} c="white">
        {username}
      </Text>
    </Flex>
  );
}
