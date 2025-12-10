"use client";

import { useState, useEffect } from "react";
import { Card, Text, Button, Group, Avatar, Stack } from "@mantine/core";
import { IconX, IconSwords, IconUser } from "@tabler/icons-react";
import styles from "./MatchRequestNotification.module.css";

interface MatchRequest {
  request_id: number;
  sender_id: number;
  sender_username: string;
  sender_elo: number;
  created_at: string;
}

interface MatchRequestNotificationProps {
  request: MatchRequest;
  onAccept: (requestId: number) => void;
  onReject: (requestId: number) => void;
  onDismiss: () => void;
  isLoading?: boolean;
}

export default function MatchRequestNotification({
  request,
  onAccept,
  onReject,
  onDismiss,
  isLoading = false,
}: MatchRequestNotificationProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Animate in
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const handleAccept = () => {
    onAccept(request.request_id);
  };

  const handleReject = () => {
    onReject(request.request_id);
  };

  const handleDismiss = () => {
    setIsVisible(false);
    setTimeout(onDismiss, 300); // Wait for animation
  };

  return (
    <Card
      className={`${styles.notification} ${isVisible ? styles.visible : ""}`}
      shadow="lg"
      padding="md"
      radius="md"
      withBorder
    >
      <Group justify="space-between" align="flex-start" mb="xs">
        <Group gap="sm">
          <Avatar size="sm" radius="xl">
            <IconUser size={16} />
          </Avatar>
          <Stack gap={0}>
            <Text size="sm" fw={600} c="white">
              Match Challenge!
            </Text>
            <Text size="xs" c="dimmed">
              from {request.sender_username}
            </Text>
          </Stack>
        </Group>
        <Button
          variant="subtle"
          size="xs"
          p={4}
          onClick={handleDismiss}
          className={styles.closeButton}
        >
          <IconX size={14} />
        </Button>
      </Group>

      <Text size="sm" c="dimmed" mb="md">
        <IconSwords size={16} style={{ verticalAlign: "middle", marginRight: 4 }} />
        ELO: {request.sender_elo}
      </Text>

      <Group gap="xs" justify="flex-end">
        <Button
          size="xs"
          variant="outline"
          color="red"
          onClick={handleReject}
          loading={isLoading}
          disabled={isLoading}
        >
          Decline
        </Button>
        <Button
          size="xs"
          variant="filled"
          color="green"
          onClick={handleAccept}
          loading={isLoading}
          disabled={isLoading}
        >
          Accept
        </Button>
      </Group>
    </Card>
  );
}