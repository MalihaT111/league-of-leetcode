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
import { AlertCircle, Check, Copy } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "./SignUp.module.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export default function SignUpPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    leetcodeUsername: "",
  });
  const [loading, setLoading] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [error, setError] = useState("");
  const [showVerification, setShowVerification] = useState(false);
  const [verificationHash, setVerificationHash] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [registrationComplete, setRegistrationComplete] = useState(false);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (error) setError("");
  };

  const validateForm = () => {
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return false;
    }
    if (formData.password.length < 8) {
      setError("Password must be at least 8 characters long");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    setError("");

    try {
      const { AuthService } = await import("@/utils/auth");
      const response = await AuthService.initiateRegistration(
        formData.email,
        formData.password
      );
      setVerificationHash(response.leetcode_hash);
      setShowVerification(true);
    } catch (err: any) {
      setError(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const handleVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.leetcodeUsername.trim()) {
      setError("Please enter your LeetCode username");
      return;
    }

    setVerifyLoading(true);
    setError("");

    try {
      const { AuthService } = await import("@/utils/auth");
      await AuthService.completeRegistration({
        email: formData.email,
        leetcode_username: formData.leetcodeUsername,
      });
      setRegistrationComplete(true);
      setTimeout(() => router.push("/signin"), 2000);
    } catch (err: any) {
      setError(err.message || "Failed to verify LeetCode username");
    } finally {
      setVerifyLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (verificationHash) {
      navigator.clipboard.writeText(verificationHash);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (registrationComplete) {
    return (
      <Flex className={`${styles.page} ${spaceGrotesk.className}`}>
        <Card radius="lg" p="xl" className={styles.card}>
          <Stack gap="lg" ta="center">
            <Check size={64} color="#9dffbd" />
            <Title order={2} className={`title-gradient ${styles.title}`}>
              REGISTRATION COMPLETE!
            </Title>
            <Text c="rgba(220, 220, 255, 0.6)">
              Your account has been created successfully. Redirecting to sign in...
            </Text>
          </Stack>
        </Card>
      </Flex>
    );
  }

  if (showVerification && verificationHash) {
    return (
      <Flex className={`${styles.page} ${spaceGrotesk.className}`}>
        <Card radius="lg" p="xl" className={styles.cardWide}>
          <Stack gap="lg">
            <Box ta="center">
              <Title order={1} className={`title-gradient ${styles.title}`}>
                VERIFY LEETCODE
              </Title>
              <Text c="rgba(220, 220, 255, 0.6)" size="sm" mt="xs">
                Link your LeetCode account to complete registration
              </Text>
            </Box>

            <Box className={styles.hashBox}>
              <Flex justify="space-between" align="center" mb="sm">
                <Text c="white" fw={600}>
                  Your Verification Hash:
                </Text>
                <Button
                  size="xs"
                  variant="subtle"
                  className={styles.copyButton}
                  leftSection={<Copy size={14} />}
                  onClick={copyToClipboard}
                >
                  {copied ? "Copied!" : "Copy"}
                </Button>
              </Flex>
              <Text className={styles.hashText}>{verificationHash}</Text>
            </Box>

            <Alert color="violet" variant="light" className={styles.instructionAlert}>
              <Text c="rgba(220, 220, 255, 0.9)" size="sm" ta="left">
                <strong>Instructions:</strong>
                <br />
                1. Copy the verification hash above
                <br />
                2. Add it to your LeetCode profile bio
                <br />
                3. Enter your LeetCode username below
              </Text>
            </Alert>

            {error && (
              <Alert icon={<AlertCircle size={16} />} color="red" variant="light" className={styles.alert}>
                {error}
              </Alert>
            )}

            <form onSubmit={handleVerification}>
              <Stack gap="md">
                <TextInput
                  label="LeetCode Username"
                  placeholder="Enter your LeetCode username"
                  value={formData.leetcodeUsername}
                  onChange={(e) => handleInputChange("leetcodeUsername", e.target.value)}
                  required
                  classNames={{ label: styles.inputLabel, input: styles.input }}
                />

                <Button
                  type="submit"
                  loading={verifyLoading}
                  fullWidth
                  size="lg"
                  mt="md"
                  className={styles.submitButton}
                >
                  {verifyLoading ? "Verifying..." : "Complete Registration"}
                </Button>
              </Stack>
            </form>
          </Stack>
        </Card>
      </Flex>
    );
  }

  return (
    <Flex className={`${styles.page} ${spaceGrotesk.className}`}>
      <Card radius="lg" p="xl" className={styles.card}>
        <Stack gap="lg">
          <Box ta="center">
            <Title order={1} className={`title-gradient ${styles.title}`}>
              SIGN UP
            </Title>
            <Text c="rgba(220, 220, 255, 0.6)" size="sm" mt="xs">
              Join the League of LeetCode
            </Text>
          </Box>

          {error && (
            <Alert icon={<AlertCircle size={16} />} color="red" variant="light" className={styles.alert}>
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
                type="email"
                classNames={{ label: styles.inputLabel, input: styles.input }}
              />

              <PasswordInput
                label="Password"
                placeholder="Enter your password"
                value={formData.password}
                onChange={(e) => handleInputChange("password", e.target.value)}
                required
                classNames={{ label: styles.inputLabel, input: styles.input, innerInput: styles.innerInput }}
              />

              <PasswordInput
                label="Confirm Password"
                placeholder="Confirm your password"
                value={formData.confirmPassword}
                onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
                required
                classNames={{ label: styles.inputLabel, input: styles.input, innerInput: styles.innerInput }}
              />

              <Button
                type="submit"
                loading={loading}
                fullWidth
                size="lg"
                mt="md"
                className={styles.submitButton}
              >
                {loading ? "Creating Account..." : "Sign Up"}
              </Button>
            </Stack>
          </form>

          <Box ta="center" mt="sm">
            <Text c="rgba(220, 220, 255, 0.6)" size="sm">
              Already have an account?{" "}
              <Link href="/signin" className={styles.link}>
                Sign in here
              </Link>
            </Text>
          </Box>
        </Stack>
      </Card>
    </Flex>
  );
}
