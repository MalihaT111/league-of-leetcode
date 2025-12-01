"use client";

import React, { useEffect, useState, useMemo } from "react";
import { Flex, Title, Text, Switch, ScrollArea, Tooltip } from "@mantine/core";
import { Space_Grotesk } from "next/font/google";
import Navbar from "@/components/all/Navbar";
import ProfileHeader from "@/components/profile/Head";
import { AuthService } from "@/utils/auth";
import { useRouter } from "next/navigation";
import { useSettings } from "@/lib/api/queries/settings";
import { useTopicValidation } from "@/lib/hooks/useTopicValidation";
import LoadingScreen from "@/components/all/LoadingScreen";
import styles from "./Settings.module.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const TOPIC_NAMES = [
  "Array", "String", "Hash Table", "Math", "Dynamic Programming",
  "Sort", "Greedy", "Depth-First Search", "Binary Search", "Database",
  "Matrix", "Bit Manipulation", "Tree", "Breadth-First Search", "Two Pointers",
  "Prefix Sum", "Heap (Priority Queue)", "Simulation", "Binary Tree", "Graph",
  "Counting", "Stack", "Sliding Window", "Design", "Enumeration",
  "Backtracking", "Union Find", "Number Theory", "Linked List", "Ordered Set",
  "Monotonic Stack", "Segment Tree", "Trie", "Combinatorics", "Bitmask",
  "Divide and Conquer", "Queue", "Recursion", "Geometry", "Binary Indexed Tree",
  "Memoization", "Hash Function", "Binary Search Tree", "Shortest Path",
  "String Matching", "Topological Sort", "Rolling Hash", "Game Theory",
  "Interactive", "Data Stream", "Monotonic Queue", "Brainteaser",
  "Doubly-Linked List", "Randomized", "Merge Sort", "Counting Sort",
  "Iterator", "Concurrency", "Line Sweep", "Probability and Statistics",
  "Quickselect", "Suffix Array", "Minimum Spanning Tree", "Bucket Sort",
  "Shell", "Reservoir Sampling", "Strongly Connected Component",
  "Eulerian Circuit", "Radix Sort", "Rejection Sampling", "Biconnected Component",
];

export default function SettingsPage() {
  const [userId, setUserId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("error") === "invalid_config") {
      router.replace("/settings", { scroll: false });
    }
  }, [router]);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await AuthService.getCurrentUser();
        if (!user || !user.leetcode_username) {
          router.push("/signin");
        } else {
          setUserId(user.id);
        }
      } catch {
        router.push("/signin");
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, [router]);

  const topicNames = useMemo(() => TOPIC_NAMES, []);

  if (loading || !userId) {
    return <LoadingScreen message="LOADING USER..." />;
  }

  return <SettingsContent userId={userId} topicNames={topicNames} />;
}

function SettingsContent({ userId, topicNames }: { userId: number; topicNames: string[] }) {
  const [search, setSearch] = useState("");
  const settingsHook = useSettings(userId);
  const { settings, toggleRepeat, toggleDifficulty, isDifficultyOn, toggleTopic, isTopicOn, updateSettings } = settingsHook;

  const validation = useTopicValidation(
    settings?.topics || [],
    settings?.difficulty || [],
    topicNames
  );

  if (settingsHook.loading || !settings) {
    return <LoadingScreen message="LOADING SETTINGS..." />;
  }

  const filtered = topicNames.filter((f) =>
    f.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelectAll = () => updateSettings({ topics: topicNames.map((_, i) => i) });
  const handleResetAll = () => updateSettings({ topics: [] });

  const getStatusClass = () => {
    if (validation.blockType === "hard") return styles.statusError;
    if (validation.blockType === "soft") return styles.statusWarning;
    return styles.statusReady;
  };

  const getStatusText = () => {
    if (validation.blockType === "hard") return "❌ Cannot Match";
    if (validation.blockType === "soft") return "⚠️ Warning";
    return "✅ Ready to Match";
  };

  return (
    <Flex
      direction="column"
      align="center"
      className={`${spaceGrotesk.className} ${styles.page}`}
      style={{ color: "rgba(220, 220, 255, 1)" }}
    >
      <Navbar />

      <Title order={1} className={`title-gradient ${styles.title}`}>
        SETTINGS
      </Title>

      {/* Unified glowing container */}
      <div className={styles.unifiedContainer}>
        <div className={styles.contentGrid}>
          {/* Left Panel - Toggles */}
          <div className={styles.togglesPanel}>
            <Title order={3} className={`title-gradient ${styles.panelTitle}`}>
              DIFFICULTY
            </Title>

            <div style={{ marginBottom: 20 }}>
              <ProfileHeader username={settings.leetcode_username} />
            </div>

            {[
              { label: "Easy", level: 1 },
              { label: "Medium", level: 2 },
              { label: "Hard", level: 3 },
            ].map(({ label, level }) => (
              <div key={label} className={styles.settingsRow}>
                <Text className={styles.settingsLabel}>{label}</Text>
                <Switch
                  size="md"
                  color="violet"
                  checked={isDifficultyOn(level)}
                  onChange={() => toggleDifficulty(level)}
                />
              </div>
            ))}

            <div className={styles.settingsRow} style={{ marginTop: 16 }}>
              <Text className={styles.settingsLabel}>Repeat Problems</Text>
              <Switch
                size="md"
                color="violet"
                checked={!!settings.repeat}
                onChange={toggleRepeat}
              />
            </div>

            {/* Status Badge */}
            <div className={`${styles.statusBadge} ${getStatusClass()}`}>
              {getStatusText()}
            </div>

            {/* Alert Messages */}
            {validation.blockType === "hard" && validation.errorMessage && (
              <div className={`${styles.alertCompact} ${styles.alertError}`}>
                <div style={{ marginBottom: 6 }}>{validation.errorMessage}</div>
                {validation.invalidTopics.length > 0 && (
                  <div style={{ fontSize: 11, opacity: 0.85 }}>
                    Invalid: {validation.invalidTopics.slice(0, 3).join(", ")}
                    {validation.invalidTopics.length > 3 && ` +${validation.invalidTopics.length - 3} more`}
                  </div>
                )}
                <div style={{ fontSize: 11, opacity: 0.7, marginTop: 6 }}>
                  Fix your settings before matchmaking.
                </div>
              </div>
            )}

            {validation.blockType === "soft" && (
              <div className={`${styles.alertCompact} ${styles.alertWarning}`}>
                <div style={{ marginBottom: 6 }}>
                  {validation.invalidTopics.length} topic(s) have no problems at selected difficulty.
                </div>
                <div style={{ fontSize: 11, opacity: 0.85 }}>
                  Invalid: {validation.invalidTopics.slice(0, 3).join(", ")}
                  {validation.invalidTopics.length > 3 && ` +${validation.invalidTopics.length - 3} more`}
                </div>
                <div style={{ fontSize: 11, opacity: 0.7, marginTop: 6 }}>
                  You can still match with {validation.validTopics.length} valid topic(s).
                </div>
              </div>
            )}
          </div>

          {/* Right Panel - Filter Types */}
          <div className={styles.filterPanel}>
            <Title order={3} className={`title-gradient ${styles.panelTitle}`}>
              FILTER TOPICS
            </Title>

            <input
              type="text"
              placeholder="Search topics..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={styles.searchInput}
            />

            <div className={styles.actionRow}>
              <button onClick={handleSelectAll} className={styles.actionButton}>
                Select All
              </button>
              <button onClick={handleResetAll} className={styles.actionButton}>
                Reset All
              </button>
            </div>

            <ScrollArea h={280} scrollbarSize={6}>
              <div className={styles.chipsContainer}>
                {filtered.map((topic) => {
                  const idx = topicNames.indexOf(topic);
                  const isInvalid = validation.isTopicInvalid(topic);
                  const isChecked = isTopicOn(idx);

                  const chipClass = [
                    styles.chip,
                    isChecked && styles.chipActive,
                    isInvalid && styles.chipInvalid,
                  ].filter(Boolean).join(" ");

                  return (
                    <Tooltip
                      key={topic}
                      label="No problems at selected difficulty"
                      disabled={!isInvalid}
                      withArrow
                      color="red"
                    >
                      <span className={chipClass} onClick={() => toggleTopic(idx)}>
                        {topic}
                      </span>
                    </Tooltip>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
        </div>
      </div>
    </Flex>
  );
}
