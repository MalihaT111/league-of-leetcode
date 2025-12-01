"use client";

import React, { useState } from "react";
import { Title, Text, ScrollArea, Flex, Tooltip, Stack, List } from "@mantine/core";
import { ValidationResult } from "@/lib/hooks/useTopicValidation";
import { Settings } from "@/lib/api/queries/settings";

interface FilterTypesCardProps {
  userId?: number;
  validation: ValidationResult;
  settingsHook: {
    settings: Settings | null;
    loading: boolean;
    error: string | null;
    toggleTopic: (topicId: number) => void;
    isTopicOn: (topicId: number) => boolean;
    updateSettings: (updates: Partial<Settings>) => void;
  };
  topicNames: string[];
}

export default function FilterTypesCard({
  validation,
  settingsHook,
  topicNames,
}: FilterTypesCardProps) {
  const [search, setSearch] = useState("");

  const { settings, loading, error, toggleTopic, isTopicOn, updateSettings } =
    settingsHook;

  if (loading || !settings) {
    return <Text c="rgba(220, 220, 255, 0.6)">Loading settings...</Text>;
  }

  if (error) {
    return <Text c="#ff9b9b" fw={700}>Failed to load settings</Text>;
  }

  const filtered = topicNames.filter((f) =>
    f && f.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelectAll = () => {
    const allIndices = topicNames.map((_, idx) => idx);
    updateSettings({ topics: allIndices });
  };

  const handleResetAll = () => {
    updateSettings({ topics: [] });
  };

  const handleFixTopics = () => {
    const validTopics = (settings.topics || []).filter((topicIdx) => {
      const topicName = topicNames[topicIdx];
      return !validation.invalidTopics.includes(topicName);
    });
    updateSettings({ topics: validTopics });
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
        width: "440px",
      }}
    >
      <Title
        order={3}
        ta="center"
        mb="md"
        style={{
          color: "rgba(220, 220, 255, 0.9)",
          fontSize: "1.2rem",
          letterSpacing: "1px",
        }}
      >
        FILTER TYPES
      </Title>

      {/* Inner container */}
      <div
        style={{
          background: "rgba(0, 0, 0, 0.4)",
          border: "1px solid rgba(189, 155, 255, 0.15)",
          borderRadius: "10px",
          padding: "16px",
          minHeight: "280px",
          maxHeight: "360px",
        }}
      >
        {/* Search input */}
        <input
          type="text"
          placeholder="Search topics..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: "100%",
            background: "rgba(255, 255, 255, 0.05)",
            border: "1px solid rgba(189, 155, 255, 0.2)",
            borderRadius: "8px",
            color: "rgba(220, 220, 255, 1)",
            padding: "10px 14px",
            marginBottom: "12px",
            fontSize: "14px",
            outline: "none",
          }}
        />

        {/* Action buttons */}
        <div style={{ display: "flex", gap: "12px", marginBottom: "14px" }}>
          <button
            onClick={handleSelectAll}
            style={{
              background: "rgba(189, 155, 255, 0.15)",
              border: "1px solid rgba(189, 155, 255, 0.3)",
              color: "rgba(220, 220, 255, 0.9)",
              padding: "6px 14px",
              borderRadius: "20px",
              fontSize: "12px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Select All
          </button>
          <button
            onClick={handleResetAll}
            style={{
              background: "rgba(189, 155, 255, 0.15)",
              border: "1px solid rgba(189, 155, 255, 0.3)",
              color: "rgba(220, 220, 255, 0.9)",
              padding: "6px 14px",
              borderRadius: "20px",
              fontSize: "12px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Reset All
          </button>
        </div>

        {/* Topic chips */}
        <ScrollArea h={200} scrollbarSize={6}>
          <Flex wrap="wrap" gap="xs">
            {filtered.map((filter) => {
              const idx = topicNames.indexOf(filter);
              const isInvalid = validation.isTopicInvalid(filter);
              const isChecked = isTopicOn(idx);

              const chipStyle: React.CSSProperties = {
                background: isChecked
                  ? "rgba(189, 155, 255, 0.3)"
                  : "rgba(255, 255, 255, 0.08)",
                border: isInvalid
                  ? "1px solid #ff6b6b"
                  : isChecked
                  ? "1px solid rgba(189, 155, 255, 0.6)"
                  : "1px solid rgba(189, 155, 255, 0.2)",
                color: isInvalid ? "#ff9b9b" : isChecked ? "white" : "rgba(220, 220, 255, 0.85)",
                padding: "6px 14px",
                borderRadius: "20px",
                fontSize: "13px",
                fontWeight: 500,
                cursor: "pointer",
                boxShadow: isInvalid ? "0 0 8px rgba(255, 107, 107, 0.3)" : "none",
                transition: "all 0.2s ease",
              };

              return (
                <Tooltip
                  key={filter}
                  label="This topic has no problems at the selected difficulty."
                  disabled={!isInvalid}
                  withArrow
                  color="red"
                >
                  <span style={chipStyle} onClick={() => toggleTopic(idx)}>
                    {filter}
                  </span>
                </Tooltip>
              );
            })}
          </Flex>
        </ScrollArea>
      </div>

      {/* Hard Block Error */}
      {validation.blockType === "hard" && validation.errorMessage && (
        <div
          style={{
            background: "rgba(255, 77, 77, 0.1)",
            border: "1px solid rgba(255, 77, 77, 0.4)",
            borderRadius: "10px",
            padding: "16px",
            marginTop: "16px",
          }}
        >
          <Text fw={700} size="sm" c="#ff9b9b" mb={8}>
            ❌ Cannot Match
          </Text>
          <Text size="xs" c="rgba(255, 155, 155, 0.9)" mb={8}>
            {validation.errorMessage}
          </Text>
          {validation.invalidTopics.length > 0 && (
            <Stack gap={4} mt="sm">
              <Text size="xs" fw={600} c="rgba(255, 155, 155, 0.8)">
                Invalid topics:
              </Text>
              <List size="xs" c="rgba(255, 155, 155, 0.7)">
                {validation.invalidTopics.slice(0, 5).map((topic) => (
                  <List.Item key={topic}>{topic}</List.Item>
                ))}
                {validation.invalidTopics.length > 5 && (
                  <List.Item>...and {validation.invalidTopics.length - 5} more</List.Item>
                )}
              </List>
            </Stack>
          )}
        </div>
      )}

      {/* Soft Block Warning */}
      {validation.blockType === "soft" && validation.errorMessage && (
        <div
          style={{
            background: "rgba(255, 165, 0, 0.1)",
            border: "1px solid rgba(255, 165, 0, 0.4)",
            borderRadius: "10px",
            padding: "16px",
            marginTop: "16px",
          }}
        >
          <Text fw={700} size="sm" c="#ffd699" mb={8}>
            ⚠️ Warning
          </Text>
          <Text size="xs" c="rgba(255, 214, 153, 0.9)" mb={8}>
            {validation.errorMessage}
          </Text>
          <List size="xs" c="rgba(255, 214, 153, 0.8)" mb="sm">
            {validation.invalidTopics.slice(0, 5).map((topic) => (
              <List.Item key={topic}>{topic}</List.Item>
            ))}
            {validation.invalidTopics.length > 5 && (
              <List.Item>...and {validation.invalidTopics.length - 5} more</List.Item>
            )}
          </List>
          <Text size="xs" c="rgba(255, 214, 153, 0.7)" mb="sm">
            You can still match with your {validation.validTopics.length} valid topic(s).
          </Text>
          <button
            onClick={handleFixTopics}
            style={{
              background: "rgba(255, 165, 0, 0.2)",
              border: "1px solid rgba(255, 165, 0, 0.5)",
              color: "#ffd699",
              padding: "8px 16px",
              borderRadius: "8px",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Remove Invalid Topics
          </button>
        </div>
      )}
    </div>
  );
}
