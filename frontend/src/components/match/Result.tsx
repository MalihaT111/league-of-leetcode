"use client";

import { Flex, Box, Text, Avatar } from "@mantine/core";
import { Crown } from "lucide-react";
import styles from "./Result.module.css";

interface PlayerResultProps {
  name: string;
  tag: string;
  isWinner?: boolean;
  onClick?: () => void;
  active?: boolean;
  profilePictureUrl?: string | null;
}

export function PlayerResult({
  name,
  tag,
  isWinner,
  onClick,
  active,
  profilePictureUrl,
}: PlayerResultProps) {
  const isLarge = !!active;

  const wrapperClasses = [
    styles.wrapper,
    isLarge ? styles.wrapperLarge : styles.wrapperSmall,
    isWinner ? styles.wrapperWinner : "",
  ].join(" ");

  const innerClasses = [
    styles.inner,
    active
      ? styles.innerActive
      : isWinner
        ? styles.innerWinner
        : styles.innerDefault,
  ].join(" ");

  const avatarClasses = [
    styles.avatar,
    isLarge ? styles.avatarLarge : styles.avatarSmall,
    isWinner ? styles.avatarWinner : styles.avatarDefault,
  ].join(" ");

  return (
    <div className={wrapperClasses} onClick={onClick}>
      <Flex align="center" gap="md" className={innerClasses}>
        {isWinner && <Crown size={24} className={styles.crownIcon} />}
        <Avatar
          size={isLarge ? 60 : 48}
          radius={8}
          src={profilePictureUrl || undefined}
          className={avatarClasses}
        >
          {tag}
        </Avatar>
        <Text fw={600} size={isLarge ? "xl" : "md"} c="rgba(220, 220, 255, 1)">
          {name}
        </Text>
      </Flex>
    </div>
  );
}
