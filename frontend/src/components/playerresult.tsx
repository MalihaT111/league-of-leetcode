"use client";

import { Flex, Box, Text } from "@mantine/core";
import styles from "./PlayerResult.module.css";

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

  const containerClasses = [
    styles.container,
    isLarge ? styles.containerLarge : styles.containerSmall,
    isWinner
      ? styles.containerWinner
      : active
        ? styles.containerActive
        : styles.containerDefault,
  ].join(" ");

  const avatarClasses = [
    styles.avatar,
    isLarge ? styles.avatarLarge : styles.avatarSmall,
    isWinner ? styles.avatarWinner : styles.avatarDefault,
  ].join(" ");

  return (
    <Flex align="center" gap="md" onClick={onClick} className={containerClasses}>
      {isWinner && (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#222"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M2 19h20l-2-10-5 5-5-9-5 9-5-5z" />
        </svg>
      )}

      <Box className={avatarClasses}>{tag}</Box>

      <Text fw={600} size={isLarge ? "xl" : "md"}>
        {name}
      </Text>
    </Flex>
  );
}
