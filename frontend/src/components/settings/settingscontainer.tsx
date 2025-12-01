"use client";

import React from "react";
import { Flex, Text } from "@mantine/core";
import SettingsToggles from "./settingstoggle";
import FilterTypesCard from "./filtertypes";
import { ValidationResult } from "@/lib/hooks/useTopicValidation";
import { Settings } from "@/lib/api/queries/settings";

interface SettingsContainerProps {
  userId: number;
  validation: ValidationResult;
  settingsHook: {
    settings: Settings | null;
    loading: boolean;
    error: string | null;
    toggleRepeat: () => void;
    toggleDifficulty: (level: number) => void;
    toggleTopic: (topicId: number) => void;
    isDifficultyOn: (level: number) => boolean;
    isTopicOn: (topicId: number) => boolean;
    updateSettings: (updates: Partial<Settings>) => void;
  };
  topicNames: string[];
}

export default function SettingsContainer({
  userId,
  validation,
  settingsHook,
  topicNames,
}: SettingsContainerProps) {
  return (
    <>
      <Flex
        gap="clamp(32px, 5vw, 60px)"
        align="stretch"
        justify="center"
        wrap="wrap"
      >
        <SettingsToggles
          userId={userId}
          validation={validation}
          settingsHook={settingsHook}
        />
        <FilterTypesCard
          userId={userId}
          validation={validation}
          settingsHook={settingsHook}
          topicNames={topicNames}
        />
      </Flex>

      {/* Soft block summary */}
      {validation.blockType === "soft" && validation.errorMessage && (
        <div
          style={{
            background: "rgba(255, 165, 0, 0.1)",
            border: "1px solid rgba(255, 165, 0, 0.4)",
            borderRadius: "10px",
            padding: "16px 24px",
            maxWidth: "700px",
            textAlign: "center",
            marginTop: "24px",
          }}
        >
          <Text fw={600} size="md" c="#ffd699" mb={4}>
            ⚠️ {validation.invalidTopics.length} topic(s) incompatible
          </Text>
          <Text size="sm" c="rgba(255, 214, 153, 0.9)">
            You can still match with your {validation.validTopics.length} valid topic(s).
          </Text>
        </div>
      )}
    </>
  );
}
