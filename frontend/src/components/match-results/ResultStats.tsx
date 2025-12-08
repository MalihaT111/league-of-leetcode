import { Flex, Text, Stack } from "@mantine/core";

interface ResultCodeProps {
  time: string;
  memory: string;
}

export default function ResultStats({ time, memory }: ResultCodeProps) {
  return (
    <Stack gap="sm">
      {/* Runtime */}
      <Flex
        justify="space-between"
        align="center"
        p="sm"
        style={{ backgroundColor: "#1a1a1a", borderRadius: "8px" }}
      >
        <Text size="sm" c="dimmed">
          Runtime:
        </Text>

        <Text
          size="lg"
          fw={700}
          style={{
            fontFamily: "monospace",
            color: time === "N/A" ? "#888888" : "#06d6a0",
            whiteSpace: "nowrap",
          }}
        >
          {time}
        </Text>
      </Flex>

      {/* Memory */}
      <Flex
        justify="space-between"
        align="center"
        p="sm"
        style={{ backgroundColor: "#1a1a1a", borderRadius: "8px" }}
      >
        <Text size="sm" c="dimmed">
          Memory:
        </Text>

        <Text
          size="lg"
          fw={700}
          style={{
            fontFamily: "monospace",
            color: memory === "N/A" ? "#888888" : "#ffd166",
            whiteSpace: "nowrap",
          }}
        >
          {memory}
        </Text>
      </Flex>
    </Stack>
  );
}
