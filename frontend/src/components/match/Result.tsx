"use client";

import { Flex, Box, Text } from "@mantine/core";
import { Crown } from "lucide-react";
import styles from "./Result.module.css";

interface PlayerResultProps {
  name: string;
  tag: string;
  isWinner?: boolean;
  onClick?: () => void;
  active?: boolean;
}

export function PlayerResult({
  name,
  tag,
  isWinner,
  onClick,
  active,
}: PlayerResultProps) {
  const isLarge = !!active;

  const wrapperClasses = [
    styles.wrapper,
    isLarge ? styles.wrapperLarge : styles.wrapperSmall,
    isWinner ? styles.wrapperWinner : "",
  ].join(" ");

  const innerClasses = [
    styles.inner,
    isWinner
      ? styles.innerWinner
      : active
        ? styles.innerActive
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
        <Box className={avatarClasses}>{tag}</Box>
        <Text fw={600} size={isLarge ? "xl" : "md"} c="rgba(220, 220, 255, 1)">
          {name}
        </Text>
      </Flex>
    </div>
  );
}
