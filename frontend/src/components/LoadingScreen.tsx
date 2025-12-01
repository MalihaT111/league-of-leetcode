"use client";

import { Flex, Text } from "@mantine/core";
import styles from "./LoadingScreen.module.css";

interface LoadingScreenProps {
  message?: string;
}

export default function LoadingScreen({
  message = "SYSTEM INITIALIZING..."
}: LoadingScreenProps) {
  return (
    <div className={styles.wrapper}   style={{
    background: "#0b0a0e",
  }}>
      {/* PARTICLES */}
      <div className={styles.particles}>
        {Array.from({ length: 35 }).map((_, i) => (
          <div key={i} className={styles.particle} />
        ))}
      </div>

      {/* CENTER CONTENT */}
      <Flex direction="column" align="center" justify="center" className={styles.center}>
        <div className={styles.ringLoader} />

        <Text className={styles.loadingText}>
          {message}
        </Text>
      </Flex>
    </div>
  );
}
