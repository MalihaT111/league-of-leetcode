"use client";

import React, { useState } from "react";
import {
  Card,
  Title,
  Text,
  TextInput,
  Chip,
  Flex,
  ScrollArea,
  Button,
  Group,
  Tooltip,
  Alert,
  List,
} from "@mantine/core";
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

  // ❗ Conditional returns AFTER all hooks
  if (loading || !settings)
    return <Text c="gray.4">Loading settings...</Text>;

  if (error)
    return (
      <Text c="red" fw={700}>
        Failed to load settings
      </Text>
    );

  // 🔎 Filtered list based on search term
  const filtered = topicNames.filter((f) =>
    f && f.toLowerCase().includes(search.toLowerCase())
  );

  // ✅ "Select All" → sets all topics active
  const handleSelectAll = () => {
    const allIndices = topicNames.map((_, idx) => idx);
    updateSettings({ topics: allIndices });
  };

  // 🔄 "Reset All" → clears all selected topics
  const handleResetAll = () => {
    updateSettings({ topics: [] });
  };

  // 🔧 Fix invalid topics by removing them
  const handleFixTopics = () => {
    const validTopics = (settings.topics || []).filter((topicIdx) => {
      const topicName = topicNames[topicIdx];
      return !validation.invalidTopics.includes(topicName);
    });
    updateSettings({ topics: validTopics });
  };

  return (
    <Card shadow="sm" radius="md" p="lg" w={420} bg="gray.3">
      <Title
        order={3}
        fw={900}
        fz="lg"
        mb="sm"
        c="black"
        ta="center"
        style={{ letterSpacing: 0.5, fontStyle: "italic" }}
      >
        FILTER TYPES
      </Title>

      <Card
        bg="black"
        p="md"
        radius="md"
        withBorder
        style={{
          borderColor: "#2f2f2f",
          minHeight: 250,
          maxHeight: 340,
          overflow: "hidden",
        }}
      >
        <TextInput
          placeholder="search"
          value={search}
          onChange={(e) => setSearch(e.currentTarget.value)}
          variant="unstyled"
          mb="sm"
          styles={{
            input: {
              backgroundColor: "#1a1a1a",
              color: "white",
              padding: "8px",
              borderRadius: "4px",
            },
          }}
        />

        {/* 🔘 Action Buttons */}
        <Group justify="space-between" mb="sm">
          <Button
            variant="subtle"
            color="gray"
            size="xs"
            radius="xl"
            onClick={handleSelectAll}
            styles={{
              root: {
                backgroundColor: "#2a2a2a",
                color: "white",
                fontWeight: 600,
                "&:hover": { backgroundColor: "#3a3a3a" },
              },
            }}
          >
            Select All
          </Button>

          <Button
            variant="subtle"
            color="gray"
            size="xs"
            radius="xl"
            onClick={handleResetAll}
            styles={{
              root: {
                backgroundColor: "#2a2a2a",
                color: "white",
                fontWeight: 600,
                "&:hover": { backgroundColor: "#3a3a3a" },
              },
            }}
          >
            Reset All
          </Button>
        </Group>

        <ScrollArea
          h={230}
          scrollbarSize={6}
          scrollHideDelay={500}
          styles={{
            scrollbar: { background: "#1a1a1a" },
            thumb: { background: "#444", "&:hover": { background: "#666" } },
          }}
        >
          <Flex wrap="wrap" gap="xs">
            {filtered.map((filter) => {
              const idx = topicNames.indexOf(filter);
              const isInvalid = validation.isTopicInvalid(filter);
              const isChecked = isTopicOn(idx);

              return (
                <Tooltip
                  key={filter}
                  label={
                    isInvalid
                      ? "This topic has no problems at the selected difficulty."
                      : ""
                  }
                  disabled={!isInvalid}
                  withArrow
                  color="red"
                >
                  <Chip
                    color="gray"
                    size="sm"
                    radius="xl"
                    variant="filled"
                    checked={isChecked}
                    onClick={() => toggleTopic(idx)}
                    className={isInvalid ? "invalid-topic" : ""}
                    styles={{
                      root: {
                        backgroundColor: isChecked ? "#6b7280" : "#2a2a2a",
                        color: isInvalid ? "#ff4d4d" : "white",
                        fontWeight: 600,
                        textAlign: "center",
                        borderRadius: "9999px",
                        transition: "all 150ms ease",
                        border: isInvalid ? "2px solid #ff4d4d" : "none",
                        boxShadow: isInvalid
                          ? "0 0 6px rgba(255, 77, 77, 0.4)"
                          : "none",
                        cursor: "pointer",
                      },
                    }}
                  >
                    {filter}
                  </Chip>
                </Tooltip>
              );
            })}
          </Flex>
        </ScrollArea>
      </Card>

      {/* ⚠️ Hard Block Error */}
      {validation.blockType === "hard" && validation.errorMessage && (
        <Alert
          color="red"
          title="Cannot Match"
          mt="md"
          styles={{
            root: {
              backgroundColor: "#3b0c0c",
              border: "2px solid #ff4d4d",
              borderRadius: "8px",
            },
            title: {
              color: "#ffcccc",
              fontWeight: 700,
              fontSize: "16px",
            },
            message: {
              color: "#ffcccc",
            },
          }}
        >
          <Text size="sm" fw={600} mb="xs">
            {validation.errorMessage}
          </Text>
          {validation.invalidTopics.length > 0 && (
            <>
              <Text size="sm" fw={500} mt="sm" mb="xs">
                Invalid topics:
              </Text>
              <List size="sm" mb="xs">
                {validation.invalidTopics.map((topic) => (
                  <List.Item key={topic}>{topic}</List.Item>
                ))}
              </List>
            </>
          )}
          <Text size="sm" mt="xs" c="dimmed">
            You must fix your settings before matchmaking.
          </Text>
        </Alert>
      )}

      {/* 🟡 Soft Block Warning */}
      {validation.blockType === "soft" && validation.errorMessage && (
        <Alert
          color="yellow"
          title="Warning"
          mt="md"
          styles={{
            root: {
              backgroundColor: "#3b2c0c",
              border: "1px solid #ffa500",
              borderRadius: "8px",
            },
            title: {
              color: "#ffd699",
              fontWeight: 700,
            },
            message: {
              color: "#ffd699",
            },
          }}
        >
          <Text size="sm" mb="xs">
            {validation.errorMessage}
          </Text>
          <List size="sm" mb="xs">
            {validation.invalidTopics.map((topic) => (
              <List.Item key={topic}>{topic}</List.Item>
            ))}
          </List>
          <Text size="sm" mt="xs">
            You can still match with your {validation.validTopics.length} valid
            topic(s).
          </Text>
          <Button
            size="xs"
            color="yellow"
            variant="light"
            mt="sm"
            onClick={handleFixTopics}
          >
            Remove Invalid Topics
          </Button>
        </Alert>
      )}
    </Card>
  );
}
