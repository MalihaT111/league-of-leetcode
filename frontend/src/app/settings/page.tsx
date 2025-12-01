"use client";

import React, { useEffect, useState, useMemo } from "react";
import { Flex, Title } from "@mantine/core";
import { montserrat } from "@/app/fonts";
import SettingsContainer from "@/components/settings/settingscontainer";
import Navbar from "@/components/navbar";
import { AuthService } from "@/utils/auth";
import { useRouter } from "next/navigation";
import { useSettings } from "@/lib/api/queries/settings";
import { useTopicValidation } from "@/lib/hooks/useTopicValidation";
// import { debugTopicMapMatching } from "@/lib/utils/debugTopicMap"; // Uncomment to debug

const TOPIC_NAMES = [
  "Array",
  "String",
  "Hash Table",
  "Math",
  "Dynamic Programming",
  "Sort",
  "Greedy",
  "Depth-First Search",
  "Binary Search",
  "Database",
  "Matrix",
  "Bit Manipulation",
  "Tree",
  "Breadth-First Search",
  "Two Pointers",
  "Prefix Sum",
  "Heap (Priority Queue)",
  "Simulation",
  "Binary Tree",
  "Graph",
  "Counting",
  "Stack",
  "Sliding Window",
  "Design",
  "Enumeration",
  "Backtracking",
  "Union Find",
  "Number Theory",
  "Linked List",
  "Ordered Set",
  "Monotonic Stack",
  "Segment Tree",
  "Trie",
  "Combinatorics",
  "Bitmask",
  "Divide and Conquer",
  "Queue",
  "Recursion",
  "Geometry",
  "Binary Indexed Tree",
  "Memoization",
  "Hash Function",
  "Binary Search Tree",
  "Shortest Path",
  "String Matching",
  "Topological Sort",
  "Rolling Hash",
  "Game Theory",
  "Interactive",
  "Data Stream",
  "Monotonic Queue",
  "Brainteaser",
  "Doubly-Linked List",
  "Randomized",
  "Merge Sort",
  "Counting Sort",
  "Iterator",
  "Concurrency",
  "Line Sweep",
  "Probability and Statistics",
  "Quickselect",
  "Suffix Array",
  "Minimum Spanning Tree",
  "Bucket Sort",
  "Shell",
  "Reservoir Sampling",
  "Strongly Connected Component",
  "Eulerian Circuit",
  "Radix Sort",
  "Rejection Sampling",
  "Biconnected Component",
];

export default function SettingsPage() {
  const [userId, setUserId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Clear error param from URL if present (no state needed)
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
        if (!user) {
          console.warn("No user found — redirecting to signin...");
          router.push("/signin");
        } else if (!user.leetcode_username) {
          console.warn("LeetCode username not set — user account incomplete");
          router.push("/signin");
        } else {
          setUserId(user.id);
        }
      } catch (error) {
        console.error("Error fetching current user:", error);
        router.push("/signin");
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [router]);

  // Memoize topic names
  const topicNames = useMemo(() => TOPIC_NAMES, []);

  // Show loading state while user is being fetched
  if (loading || !userId) {
    return null;
  }

  // Now we have userId, safe to call hooks
  return <SettingsPageContent userId={userId} topicNames={topicNames} />;
}

// Separate component that only renders when userId is available
function SettingsPageContent({
  userId,
  topicNames,
}: {
  userId: number;
  topicNames: string[];
}) {
  const router = useRouter();

  // 🔥 SINGLE SOURCE OF TRUTH - Only call useSettings here
  const settingsHook = useSettings(userId);

  // Real-time validation - single source of truth
  const validation = useTopicValidation(
    settingsHook.settings?.topics || [],
    settingsHook.settings?.difficulty || [],
    topicNames
  );

  // Show loading state while settings are being fetched
  if (settingsHook.loading || !settingsHook.settings) {
    return null;
  }

  return (
    <Flex
      direction="column"
      align="center"
      justify="center"
      mih="100vh"
      bg="#1a1a1a"
      c="white"
      gap={40}
    >
      <Navbar />
      <Title
        order={1}
        className={montserrat.className}
        style={{
          fontSize: "40px",
          fontWeight: 700,
          fontStyle: "italic",
        }}
      >
        SETTINGS
      </Title>

      {/* Global error banner - derived from validation, not stored state */}
      {validation.blockType === "hard" && validation.errorMessage && (
        <div
          style={{
            backgroundColor: "#3b0c0c",
            border: "2px solid #ff4d4d",
            borderRadius: "8px",
            padding: "16px",
            maxWidth: "600px",
            color: "#ffcccc",
            textAlign: "center",
          }}
        >
          <strong>⚠️ Cannot Match</strong>
          <br />
          <span style={{ fontSize: "14px" }}>{validation.errorMessage}</span>
        </div>
      )}

      <SettingsContainer
        userId={userId}
        validation={validation}
        settingsHook={settingsHook}
        topicNames={topicNames}
      />
    </Flex>
  );
}
