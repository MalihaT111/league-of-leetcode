"use client";
import Navbar from "@/components/all/Navbar";
import { useEffect, useState } from "react";
import { Flex, Stack, Title, Text, Button } from "@mantine/core";
import { ProfileBox } from "@/components/profile/profilebox"; // ✅ use your existing square ProfileBox
import { orbitron, montserrat } from "../fonts";

export default function MatchFoundPage() {
  const [countdown, setCountdown] = useState(3);
  const [seconds, setSeconds] = useState(0);
  const [started, setStarted] = useState(false);

  // handle countdown first
  useEffect(() => {
    if (countdown > 0) {
      const interval = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(interval);
    } else {
      // when countdown hits 0 → show "START!" briefly, then start match
      const timeout = setTimeout(() => {
        setStarted(true);
      }, 1000); // 1s for the "START!" text
      return () => clearTimeout(timeout);
    }
  }, [countdown]);

  // match timer (only runs after countdown ends)
  useEffect(() => {
    if (started) {
      const interval = setInterval(() => {
        setSeconds((prev) => prev + 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [started]);

  // format MM:SS
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const formatted = `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;

  // what to display in timer spot
  let displayText;
  if (!started) {
    displayText = countdown > 0 ? countdown : "START!";
  } else {
    displayText = formatted;
  }

  return (
    <Flex
      h="100vh"
      w="100%"
      direction="column"
      align="center"
      justify="center"
      bg="dark"
      c="white"
      gap="lg"
    >
      <Navbar />
      {/* Title */}
      <Title
        order={1}
        className={montserrat.className}
        style={{ fontSize: "40px", fontWeight: 700 }}
      >
        MATCH FOUND
      </Title>

      {/* Players row */}
      <Flex align="center" justify="center" gap="6rem">
        <ProfileBox username="User 1" rating={1500} />

        <Text
          className={orbitron.className}
          style={{ fontSize: "40px", fontWeight: 700 }}
        >
          VS
        </Text>

        <ProfileBox username="User 2" rating={1480} />
      </Flex>

      {/* Countdown or Match Timer */}
      <Text
        className={orbitron.className}
        style={{
          fontSize: !started && displayText !== "START!" ? "80px" : "60px",
          fontWeight: 700,
          letterSpacing: "4px",
        }}
      >
        {displayText}
      </Text>

      {/* Problem link */}
      <Text size="sm" style={{ fontFamily: "monospace" }}>
        problem link: sdfghjmhgdfghjhgfdsdfgh
      </Text>

      {/* Rules */}
      <Text size="sm" c="dimmed">
        win +15 / lose -15 / resign -10
      </Text>

      {/* Buttons */}
      <Flex gap="xl" mt="lg">
        <Button
          size="lg"
          radius="sm"
          variant="filled"
          color="gray"
          style={{
            fontWeight: "bold",
            backgroundColor: "#E5E5E5",
            color: "black",
          }}
        >
          Submit
        </Button>
        <Button
          size="lg"
          radius="sm"
          variant="filled"
          color="gray"
          style={{
            fontWeight: "bold",
            backgroundColor: "#E5E5E5",
            color: "black",
          }}
        >
          Resign
        </Button>
      </Flex>
    </Flex>
  );
}
