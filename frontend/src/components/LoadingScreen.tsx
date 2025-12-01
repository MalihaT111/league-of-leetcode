import { Flex, Loader, Text } from "@mantine/core";

interface LoadingScreenProps {
  message?: string;
}

export default function LoadingScreen({ message = "Loading..." }: LoadingScreenProps) {
  return (
    <Flex
      h="100vh"
      align="center"
      justify="center"
      direction="column"
      bg="#1a1a1a"
    >
      <Loader color="yellow" size="lg" />
      <Text mt="md" size="lg" c="white">
        {message}
      </Text>
    </Flex>
  );
}
