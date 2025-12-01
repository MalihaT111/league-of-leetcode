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
import { AlertCircle } from "lucide-react";
import Link from "next/link";
import { montserrat } from "../fonts";

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

      // Store the token
      AuthService.setToken(data.access_token);

      // Redirect to home page
      window.location.href = "/home";
    } catch (err: any) {
      setError(err.message || "Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Flex
      h="100vh"
      w="100%"
      justify="center"
      align="center"
      p="xl"
      bg="#1a1a1a"
    >
      <Card
        shadow="xl"
        radius="md"
        p="xl"
        w={450}
        bg="gray.9"
        style={{
          border: "1px solid #333",
        }}
      >
        <Stack gap="lg">
          {/* Title */}
          <Box ta="center">
            <Title
              order={1}
              className="title-gradient"
              style={{
                fontSize: "2.5rem",
                marginBottom: "8px",
              }}
            >
              SIGN IN
            </Title>
            <Text c="gray.4" size="sm">
              Welcome back to League of LeetCode
            </Text>
          </Box>

          {/* Error Alert */}
          {error && (
            <Alert
              icon={<AlertCircle size={16} />}
              color="red"
              variant="filled"
            >
              {error}
            </Alert>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit}>
            <Stack gap="md">
              <TextInput
                label="Email"
                placeholder="Enter your email"
                value={formData.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
                required
                styles={{
                  label: {
                    color: "white",
                    fontWeight: 600,
                    marginBottom: "8px",
                  },
                  input: {
                    backgroundColor: "#2d2d2d",
                    border: "1px solid #444",
                    color: "white",
                    "&:focus": {
                      borderColor: "#d8a727",
                    },
                  },
                }}
              />

              <PasswordInput
                label="Password"
                placeholder="Enter your password"
                value={formData.password}
                onChange={(e) => handleInputChange("password", e.target.value)}
                required
                styles={{
                  label: {
                    color: "white",
                    fontWeight: 600,
                    marginBottom: "8px",
                  },
                  input: {
                    backgroundColor: "#2d2d2d",
                    border: "1px solid #444",
                    color: "white",
                    "&:focus": {
                      borderColor: "#d8a727",
                    },
                  },
                  innerInput: {
                    backgroundColor: "transparent",
                  },
                }}
              />

              <Button
                type="submit"
                loading={loading}
                fullWidth
                size="lg"
                mt="md"
                styles={{
                  root: {
                    backgroundColor: "#FFBD42",
                    color: "black",
                    fontWeight: 700,
                    fontSize: "16px",
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                    fontStyle: "italic",
                    border: "none",
                    "&:hover": {
                      backgroundColor: "#d8a727",
                    },
                  },
                }}
              >
                {loading ? "Signing In..." : "Sign In"}
              </Button>
            </Stack>
          </form>

          {/* Sign Up Link */}
          <Box ta="center" mt="md">
            <Text c="gray.4" size="sm">
              Don't have an account?{" "}
              <Link
                href="/signup"
                style={{
                  color: "#d8a727",
                  textDecoration: "none",
                  fontWeight: 600,
                }}
              >
                Sign up here
              </Link>
            </Text>
          </Box>

          {/* Back to Home */}
          <Box ta="center">
            <Link
              href="/home"
              style={{
                color: "#666",
                textDecoration: "none",
                fontSize: "14px",
                transition: "color 0.2s ease",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#d8a727")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#666")}
            >
              ← Back to Home
            </Link>
          </Box>
        </Stack>
      </Card>
    </Flex>
  );
}
