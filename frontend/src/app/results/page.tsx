"use client";

import {
  Flex,
  Stack,
  Title,
  Text,
  Paper,
  Divider,
  Button,
  Group,
} from "@mantine/core";
import { montserrat } from "../fonts";
import { PlayerResult } from "@/components/match/Result";
import { useState } from "react";

export default function ResultsPage() {
  const [selected, setSelected] = useState<"P1" | "P2">("P1");

  const solutions: Record<"P1" | "P2", string> = {
    P1: `def function(x):\n    print("person 1")`,
    P2: `def function(x):\n    print("person 2")`,
  };

  return (
    <Flex
      h="100vh"
      w="100%"
      bg="#1a1a1a"
      c="white"
      align="center"
      justify="center"
      direction="column"
      gap="xl"
      p="xl"
    >
      <Title
        order={1}
        className={montserrat.className}
        style={{ fontSize: "56px", fontWeight: 800, letterSpacing: "2px" }}
      >
        RESULTS
      </Title>

      <Flex gap="6rem" align="flex-start" justify="center">
        {/* Solution box */}
        <Stack gap="sm">
          <Text fw={700} size="lg" tt="uppercase" c="dimmed">
            {selected === "P1" ? "Person 1's Solution" : "Person 2's Solution"}
          </Text>
          <Paper
            shadow="lg"
            radius="md"
            p="md"
            style={{
              backgroundColor: "#2a2a2a",
              border: "1px solid #444",
              width: "380px",
              height: "260px",
              fontFamily: "monospace",
              fontSize: "18px",
              overflow: "auto",
              whiteSpace: "pre-wrap",
            }}
          >
            {solutions[selected]}
          </Paper>
        </Stack>

        {/* Right side */}
        <Stack gap="lg">
          <Stack>
            <PlayerResult
              name="Person 1"
              tag="P1"
              isWinner
              active={selected === "P1"}
              onClick={() => setSelected("P1")}
            />
            <PlayerResult
              name="Person 2"
              tag="P2"
              active={selected === "P2"}
              onClick={() => setSelected("P2")}
            />
          </Stack>

          <Divider my="sm" color="gray.7" />

          <Stack gap="xs">
            <Text size="md">
              <b>Time score:</b> <span style={{ color: "#ffd166" }}>300</span>
            </Text>
            <Text size="md">
              <b>Quality score:</b>{" "}
              <span style={{ color: "#06d6a0" }}>256</span>
            </Text>
            <Text size="md">
              <b>ELO:</b>{" "}
              <span style={{ color: "#118ab2", fontWeight: 700 }}>
                1200 <span style={{ color: "#06d6a0" }}>(+15)</span>
              </span>
            </Text>
          </Stack>
        </Stack>
      </Flex>

      {/* Buttons */}
      <Group mt="xl" gap="lg">
        <Button
          size="md"
          variant="light"
          color="gray"
          style={{ fontWeight: "bold", minWidth: "140px" }}
        >
          Rematch
        </Button>
        <Button
          size="md"
          variant="light"
          color="blue"
          style={{ fontWeight: "bold", minWidth: "140px" }}
        >
          New Game
        </Button>
        <Button
          size="md"
          variant="outline"
          color="gray"
          style={{ fontWeight: "bold", minWidth: "140px" }}
        >
          Main Menu
        </Button>
      </Group>
    </Flex>
  );
}
