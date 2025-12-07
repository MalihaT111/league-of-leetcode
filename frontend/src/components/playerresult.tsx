"use client";

import { Flex, Box, Text } from "@mantine/core";

interface PlayerResultProps {
  name: string;
  tag: string;
  isWinner?: boolean;
  onClick?: () => void;
  active?: boolean;
}

export function PlayerResult({
  name,
  tag,
  isWinner,
  onClick,
  active,
}: PlayerResultProps) {
  return (
    <Flex
      align="center"
      gap="md"
      onClick={onClick}
      style={{
        cursor: "pointer",

        // Colors
        backgroundColor: active
          ? "#FFBD42"
          : active
          ? "#555"
          : "#444",
        color: active ? "#222" : "white",

        // Fixed size → prevents ANY layout shaking
        width: "340px",
        height: "64px",

        // Scale animation ONLY (no size changes)
        transform: active ? "scale(1.06)" : "scale(1.00)",
        transition: "transform 0.25s ease, box-shadow 0.25s ease",

        borderRadius: "10px",
        padding: "14px 24px",

        clipPath: "polygon(10% 0, 100% 0, 100% 100%, 0% 100%)",

        zIndex: active ? 2 : 1,
      }}
    >
      {/* Winner Icon */}
      {isWinner && (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="26"
          height="26"
          viewBox="0 0 24 24"
          fill="gold"
          stroke="#222"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ flexShrink: 0 }}
        >
          <path d="M2 19h20l-2-10-5 5-5-9-5 9-5-5z" />
        </svg>
      )}

      {/* Tag Circle */}
      <Box
        style={{
          backgroundColor: isWinner ? "#fff" : "#ccc",
          borderRadius: "50%",
          width: "48px",
          height: "48px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: 700,
          fontSize: "16px",
          color: "#222",
          flexShrink: 2,
        }}
      >
        {tag}
      </Box>

      {/* Player Name */}
      <Text fw={600} size="lg" style={{ whiteSpace: "nowrap" }}>
        {name}
      </Text>
    </Flex>
  );
}
