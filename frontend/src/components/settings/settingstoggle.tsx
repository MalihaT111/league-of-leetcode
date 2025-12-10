"use client";

import React from "react";
import { Flex, Text, Switch, Stack } from "@mantine/core";
import ProfileHeader from "@/components/profile/Head";
import { ValidationResult } from "@/lib/hooks/useTopicValidation";
import { Settings } from "@/lib/api/queries/settings";

interface SettingsTogglesProps {
  userId?: number;
  validation?: ValidationResult;
  user?: any;
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
  userId,
  validation,
  user,
  settingsHook,
}: SettingsTogglesProps) {
  const { settings, loading, error, toggleRepeat, toggleDifficulty, isDifficultyOn } =
    settingsHook;

  if (loading || !settings) {
    return <Text c="rgba(220, 220, 255, 0.6)">Loading settings...</Text>;
  }

  if (error) {
    return <Text c="#ff9b9b" fw={700}>Failed to load settings</Text>;
  }

  const getStatusStyle = () => {
    if (validation?.blockType === "hard") {
      return {
        background: "rgba(255, 77, 77, 0.15)",
        border: "1px solid rgba(255, 77, 77, 0.5)",
        color: "#ff9b9b",
      };
    }
    if (validation?.blockType === "soft") {
      return {
        background: "rgba(255, 165, 0, 0.15)",
        border: "1px solid rgba(255, 165, 0, 0.5)",
        color: "#ffd699",
      };
    }
    return {
      background: "rgba(6, 214, 160, 0.15)",
      border: "1px solid rgba(6, 214, 160, 0.5)",
      color: "#9dffbd",
    };
  };

  const getStatusText = () => {
    if (validation?.blockType === "hard") return "❌ Cannot Match";
    if (validation?.blockType === "soft") return "⚠️ Warning";
    return "✅ Ready";
  };

  return (
    <div
      style={{
        background: "rgba(10, 10, 20, 0.45)",
        backdropFilter: "blur(12px)",
        border: "1px solid rgba(189, 155, 255, 0.25)",
        boxShadow: "0 0 25px rgba(189, 155, 255, 0.12)",
        borderRadius: "14px",
        padding: "24px",
        width: "300px",
      }}
    >
      <Stack gap="lg">
        <ProfileHeader 
          username={settings.leetcode_username} 
          userId={userId || 0}
          profilePictureUrl={user?.profile_picture_url}
        />

        {/* Status Badge */}
        {validation && (
          <div
            style={{
              ...getStatusStyle(),
              padding: "10px 16px",
              borderRadius: "20px",
              fontSize: "13px",
              fontWeight: 600,
              textAlign: "center",
            }}
          >
            {getStatusText()}
          </div>
        )}

        <Stack gap="md" mt="md">
          {/* Repeat Toggle */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "12px 16px",
              background: "rgba(255, 255, 255, 0.03)",
              borderRadius: "8px",
            }}
          >
            <Text fw={600} c="rgba(220, 220, 255, 0.85)" size="sm">
              Repeat
            </Text>
            <Switch
              size="md"
              color="violet"
              checked={!!settings.repeat}
              onChange={toggleRepeat}
            />
          </div>

          {/* Difficulty Toggles */}
          {[
            { label: "Easy", level: 1 },
            { label: "Medium", level: 2 },
            { label: "Hard", level: 3 },
          ].map(({ label, level }) => (
            <div
              key={label}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "12px 16px",
                background: "rgba(255, 255, 255, 0.03)",
                borderRadius: "8px",
              }}
            >
              <Text fw={600} c="rgba(220, 220, 255, 0.85)" size="sm">
                {label}
              </Text>
              <Switch
                size="md"
                color="violet"
                checked={isDifficultyOn(level)}
                onChange={() => toggleDifficulty(level)}
              />
            </div>
          ))}
        </Stack>
      </Stack>
    </div>
  );
}
