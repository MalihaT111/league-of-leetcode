"use client";

import React from "react";
import { Card, Flex, Group, Text, Switch, Badge } from "@mantine/core";
import ProfileHeader from "@/components/profile/Head";
import { ValidationResult } from "@/lib/hooks/useTopicValidation";
import { Settings } from "@/lib/api/queries/settings";

interface SettingsTogglesProps {
  userId?: number;
  validation?: ValidationResult;
  settingsHook: {
    settings: Settings | null;
    loading: boolean;
    error: string | null;
    toggleRepeat: () => void;
    toggleDifficulty: (level: number) => void;
    isDifficultyOn: (level: number) => boolean;
  };
}

export default function SettingsToggles({
  validation,
  settingsHook,
}: SettingsTogglesProps) {
  const { settings, loading, error, toggleRepeat, toggleDifficulty, isDifficultyOn } =
    settingsHook;

  if (loading || !settings)
    return <Text c="gray.4">Loading settings...</Text>;

  if (error)
    return (
      <Text c="red" fw={700}>
        Failed to load settings
      </Text>
    );

  return (
    <Card shadow="sm" radius="md" p="lg" w={280} bg="gray.3">
      <Flex direction="column" gap="lg">
        <ProfileHeader username={settings.leetcode_username} />

        {/* Validation Status Badge */}
        {validation && (
          <Badge
            size="lg"
            variant="filled"
            color={
              validation.blockType === "hard"
                ? "red"
                : validation.blockType === "soft"
                ? "yellow"
                : "green"
            }
            style={{ alignSelf: "center" }}
          >
            {validation.blockType === "hard"
              ? "❌ Cannot Match"
              : validation.blockType === "soft"
              ? "⚠️ Warning"
              : "✅ Ready"}
          </Badge>
        )}

        <Flex direction="column" gap="md" mt="md">
          {/* Repeat */}
          <Group justify="space-between">
            <Text fw={700} c="black">
              Repeat
            </Text>
            <Switch
              size="md"
              color="gray"
              checked={!!settings.repeat}
              onChange={toggleRepeat}
              onLabel="ON"
              offLabel="OFF"
              styles={{
                track: { backgroundColor: "#d1d1d1" },
                label: { fontWeight: 700, color: "#666" },
              }}
            />
          </Group>

          {/* Difficulty */}
          {[
            { label: "Easy", level: 1 },
            { label: "Medium", level: 2 },
            { label: "Hard", level: 3 },
          ].map(({ label, level }) => (
            <Group key={label} justify="space-between">
              <Text fw={700} c="black">
                {label}
              </Text>
              <Switch
                size="md"
                color="gray"
                checked={isDifficultyOn(level)}
                onChange={() => toggleDifficulty(level)}
                onLabel="ON"
                offLabel="OFF"
                styles={{
                  track: { backgroundColor: "#d1d1d1" },
                  label: { fontWeight: 700, color: "#666" },
                }}
              />
            </Group>
          ))}
        </Flex>
      </Flex>
    </Card>
  );
}
