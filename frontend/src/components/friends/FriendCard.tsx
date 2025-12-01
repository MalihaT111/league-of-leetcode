"use client";

import { Avatar, Group, Text, Loader } from "@mantine/core";
import styles from "./Friends.module.css";

interface FriendCardProps {
  username: string;
  leetcodeUsername: string;
  elo: number;
  actions: React.ReactNode;
}

export default function FriendCard({
  username,
  leetcodeUsername,
  elo,
  actions,
}: FriendCardProps) {
  return (
    <div className={styles.friendCard}>
      <Group justify="space-between" wrap="nowrap">
        <Group gap="md" wrap="nowrap">
          <Avatar radius="xl" size="md" className={styles.avatar}>
            {username.charAt(0).toUpperCase()}
          </Avatar>
          <div>
            <Text className={styles.username}>{username}</Text>
            <Text className={styles.leetcodeUsername}>{leetcodeUsername}</Text>
          </div>
        </Group>
        <Group gap="sm" wrap="nowrap">
          <span className={styles.eloBadge}>ELO: {elo}</span>
          {actions}
        </Group>
      </Group>
    </div>
  );
}

interface ActionButtonProps {
  variant: "add" | "accept" | "remove" | "cancel";
  onClick: () => void;
  loading?: boolean;
  children: React.ReactNode;
}

export function ActionButton({
  variant,
  onClick,
  loading,
  children,
}: ActionButtonProps) {
  const variantClass = {
    add: styles.addButton,
    accept: styles.acceptButton,
    remove: styles.removeButton,
    cancel: styles.removeButton,
  }[variant];

  return (
    <button
      className={`${styles.actionButton} ${variantClass}`}
      onClick={onClick}
      disabled={loading}
    >
      {loading ? <Loader size="xs" color="white" /> : children}
    </button>
  );
}

export function PendingBadge() {
  return <span className={styles.pendingBadge}>Pending</span>;
}
