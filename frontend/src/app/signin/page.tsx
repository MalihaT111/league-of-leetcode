"use client";

import React, { useState } from "react";
import {
  Card,
  TextInput,
  PasswordInput,
  Button,
  Title,
  Text,
  Flex,
  Stack,
  Alert,
  Box,
} from "@mantine/core";
import { Space_Grotesk } from "next/font/google";
import { AlertCircle } from "lucide-react";
import Link from "next/link";
import styles from "./SignIn.module.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export default function SignInPage() {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (error) setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const { AuthService } = await import("@/utils/auth");
      const data = await AuthService.login(formData.email, formData.password);
      AuthService.setToken(data.access_token);
      window.location.href = "/home";
    } catch (err: any) {
      setError(err.message || "Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Flex className={`${styles.page} ${spaceGrotesk.className}`}>
      <Card radius="lg" p="xl" className={styles.card}>
        <Stack gap="lg">
          <Box ta="center">
            <Title order={1} className={`title-gradient ${styles.title}`}>
              SIGN IN
            </Title>
            <Text c="rgba(220, 220, 255, 0.6)" size="sm" mt="xs">
              Welcome back to League of LeetCode
            </Text>
          </Box>

          {error && (
            <Alert
              icon={<AlertCircle size={16} />}
              color="red"
              variant="light"
              className={styles.alert}
            >
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <Stack gap="md">
              <TextInput
                label="Email"
                placeholder="Enter your email"
                value={formData.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
                required
                classNames={{
                  label: styles.inputLabel,
                  input: styles.input,
                }}
              />

              <PasswordInput
                label="Password"
                placeholder="Enter your password"
                value={formData.password}
                onChange={(e) => handleInputChange("password", e.target.value)}
                required
                classNames={{
                  label: styles.inputLabel,
                  input: styles.input,
                  innerInput: styles.innerInput,
                }}
              />

              <Button
                type="submit"
                loading={loading}
                fullWidth
                size="lg"
                mt="md"
                className={styles.submitButton}
              >
                {loading ? "Signing In..." : "Sign In"}
              </Button>
            </Stack>
          </form>

          <Box ta="center" mt="sm">
            <Text c="rgba(220, 220, 255, 0.6)" size="sm">
              Don't have an account?{" "}
              <Link href="/signup" className={styles.link}>
                Sign up here
              </Link>
            </Text>
          </Box>
        </Stack>
      </Card>
    </Flex>
  );
}
