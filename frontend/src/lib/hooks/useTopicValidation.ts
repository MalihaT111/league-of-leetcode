"use client";

import { useState, useEffect, useMemo } from "react";

interface DisallowedMap {
  [topic: string]: string[];
}

const DIFFICULTY_MAP: { [key: number]: string } = {
  1: "EASY",
  2: "MEDIUM",
  3: "HARD",
};

// Map frontend topic names to backend topic names
// Backend only returns topics that are MISSING at least one difficulty
// Note: Frontend now uses "Sort" to match backend exactly
const TOPIC_ALIAS_MAP: Record<string, string> = {
  // All topics now match exactly (backend returns them)
  "Merge Sort": "Merge Sort",
  "Bucket Sort": "Bucket Sort",
  "Radix Sort": "Radix Sort",
  "Iterator": "Iterator",
  "Shell": "Shell",
  "Topological Sort": "Topological Sort",
  "Quickselect": "Quickselect",
  "Binary Indexed Tree": "Binary Indexed Tree",
  "Line Sweep": "Line Sweep",
  "Monotonic Queue": "Monotonic Queue",
  "Eulerian Circuit": "Eulerian Circuit",
  "Bitmask": "Bitmask",
  "Randomized": "Randomized",
  "Reservoir Sampling": "Reservoir Sampling",
  "Shortest Path": "Shortest Path",
  "Rejection Sampling": "Rejection Sampling",
  "Probability and Statistics": "Probability and Statistics",
  "Suffix Array": "Suffix Array",
  "Concurrency": "Concurrency",
  "Minimum Spanning Tree": "Minimum Spanning Tree",
  "Biconnected Component": "Biconnected Component",
  "Strongly Connected Component": "Strongly Connected Component",
};

export type BlockType = "none" | "soft" | "hard";

export interface ValidationResult {
  blockType: BlockType;
  invalidTopics: string[];
  validTopics: string[];
  errorMessage: string | null;
  canMatch: boolean;
  isTopicInvalid: (topicName: string) => boolean;
  loading: boolean;
  mapLoadFailed: boolean;
}

export function useTopicValidation(
  selectedTopics: number[],
  selectedDifficulties: number[],
  topicNames: string[]
): ValidationResult {
  const [disallowedMap, setDisallowedMap] = useState<DisallowedMap>({});
  const [loading, setLoading] = useState(true);
  const [mapLoadFailed, setMapLoadFailed] = useState(false);

  // Normalize topic names for matching (remove spaces, lowercase, trim)
  const normalize = (name?: string): string => {
    if (!name) return "";
    return name.toLowerCase().replace(/\s+/g, "").replace(/-/g, "").trim();
  };

  // Debug: Check for topic name mismatches
  useEffect(() => {
    if (loading || Object.keys(disallowedMap).length === 0) return;

    const missingTopics = topicNames.filter((name) => {
      const backendName = TOPIC_ALIAS_MAP[name] ?? name;
      const normalized = normalize(backendName);
      return !disallowedMap[normalized];
    });

    if (missingTopics.length > 0) {
      console.warn(
        "[Validation] Topics missing from backend map:",
        missingTopics
      );
    }

    // Log topics that use aliases
    const aliasedTopics = topicNames.filter((name) => TOPIC_ALIAS_MAP[name]);
    if (aliasedTopics.length > 0) {
      console.log(
        "[Validation] Topics using aliases:",
        aliasedTopics.map((t) => `"${t}" → "${TOPIC_ALIAS_MAP[t]}"`)
      );
    }
  }, [disallowedMap, loading, topicNames]);

  // Fetch disallowed map from backend (only once)
  useEffect(() => {
    async function fetchDisallowedMap() {
      try {
        const res = await fetch("http://localhost:8000/api/leetcode/topic-map");
        if (!res.ok) throw new Error("Failed to fetch topic map");
        const data = await res.json();
        
        // Check if data is empty or error response
        if (!data || (typeof data === "object" && Object.keys(data).length === 0)) {
          setMapLoadFailed(true);
        } else {
          // Normalize all keys in the disallowed map
          const normalizedMap: DisallowedMap = {};
          for (const key in data) {
            normalizedMap[normalize(key)] = data[key];
          }
          
          // Debug: log mismatches
          console.log("[Validation] Backend map keys:", Object.keys(data).slice(0, 10));
          console.log("[Validation] Normalized keys:", Object.keys(normalizedMap).slice(0, 10));
          
          setDisallowedMap(normalizedMap);
        }
      } catch (err) {
        console.error("Failed to load topic validation map:", err);
        setMapLoadFailed(true);
      } finally {
        setLoading(false);
      }
    }
    fetchDisallowedMap();
  }, []);

  // Comprehensive validation logic
  const validation = useMemo((): ValidationResult => {
    // HARD BLOCK 1: No difficulties AND no topics selected
    if (selectedDifficulties.length === 0 && selectedTopics.length === 0) {
      return {
        blockType: "hard",
        invalidTopics: [],
        validTopics: [],
        errorMessage: "Select at least one topic and one difficulty.",
        canMatch: false,
        isTopicInvalid: () => false,
        loading,
        mapLoadFailed,
      };
    }

    // HARD BLOCK 2: No difficulties selected
    if (selectedDifficulties.length === 0) {
      return {
        blockType: "hard",
        invalidTopics: [],
        validTopics: [],
        errorMessage: "Select at least one difficulty.",
        canMatch: false,
        isTopicInvalid: () => false,
        loading,
        mapLoadFailed,
      };
    }

    // HARD BLOCK 3: No topics selected
    if (selectedTopics.length === 0) {
      return {
        blockType: "hard",
        invalidTopics: [],
        validTopics: [],
        errorMessage: "Select at least one topic.",
        canMatch: false,
        isTopicInvalid: () => false,
        loading,
        mapLoadFailed,
      };
    }

    // HARD BLOCK 4: Invalid difficulty values
    const validDifficultyValues = [1, 2, 3];
    const hasInvalidDifficulty = selectedDifficulties.some(
      (d) => !validDifficultyValues.includes(d)
    );
    if (hasInvalidDifficulty) {
      return {
        blockType: "hard",
        invalidTopics: [],
        validTopics: [],
        errorMessage: "Your difficulty selection is invalid.",
        canMatch: false,
        isTopicInvalid: () => false,
        loading,
        mapLoadFailed,
      };
    }

    // HARD BLOCK 5: Topic map failed to load
    if (mapLoadFailed) {
      return {
        blockType: "hard",
        invalidTopics: [],
        validTopics: [],
        errorMessage: "Topic availability data is missing. Refresh topic map and try again.",
        canMatch: false,
        isTopicInvalid: () => false,
        loading,
        mapLoadFailed,
      };
    }

    // Still loading
    if (loading) {
      return {
        blockType: "none",
        invalidTopics: [],
        validTopics: [],
        errorMessage: null,
        canMatch: false,
        isTopicInvalid: () => false,
        loading,
        mapLoadFailed,
      };
    }

    // Validate topics against difficulties
    const selectedDifficultyStrings = selectedDifficulties.map(
      (d) => DIFFICULTY_MAP[d]
    );

    const invalid: string[] = [];
    const valid: string[] = [];

    for (const topicIdx of selectedTopics) {
      const topicName = topicNames[topicIdx];
      
      // Use alias map to get backend topic name, then normalize
      const backendTopicName = TOPIC_ALIAS_MAP[topicName] ?? topicName;
      const normalizedTopicName = normalize(backendTopicName);
      const disallowed = disallowedMap[normalizedTopicName];

      // If topic not in disallowed map, it's valid for all difficulties
      if (!disallowed) {
        valid.push(topicName);
        continue;
      }

      // Backend returns DISALLOWED difficulties (missing from LeetCode)
      // A topic is invalid only if ALL selected difficulties are disallowed
      // (i.e., there's no valid difficulty to match on)
      const allDisallowed = selectedDifficultyStrings.every((diff) =>
        disallowed.includes(diff)
      );

      if (allDisallowed) {
        invalid.push(topicName);
      } else {
        valid.push(topicName);
      }
    }

    // HARD BLOCK 6: ALL selected topics are invalid
    if (invalid.length > 0 && valid.length === 0) {
      return {
        blockType: "hard",
        invalidTopics: invalid,
        validTopics: [],
        errorMessage: "All selected topics are incompatible with your difficulty choices.",
        canMatch: false,
        isTopicInvalid: (name) => invalid.includes(name),
        loading,
        mapLoadFailed,
      };
    }

    // SOFT BLOCK: Some topics invalid, but at least one valid
    if (invalid.length > 0 && valid.length > 0) {
      return {
        blockType: "soft",
        invalidTopics: invalid,
        validTopics: valid,
        errorMessage: "Some topics cannot be matched with the selected difficulty.",
        canMatch: true,
        isTopicInvalid: (name) => invalid.includes(name),
        loading,
        mapLoadFailed,
      };
    }

    // All valid
    return {
      blockType: "none",
      invalidTopics: [],
      validTopics: valid,
      errorMessage: null,
      canMatch: true,
      isTopicInvalid: () => false,
      loading,
      mapLoadFailed,
    };
  }, [selectedTopics, selectedDifficulties, disallowedMap, loading, topicNames, mapLoadFailed]);

  return validation;
}
