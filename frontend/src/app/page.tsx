"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthService } from "@/utils/auth";

export default function RootPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuthAndRedirect = async () => {
      try {
        // Check if user has a token
        const token = AuthService.getToken();

        if (!token) {
          // No token, redirect to sign in
          router.push("/signin");
          return;
        }

        // Token exists, verify it's valid by fetching user data
        try {
          await AuthService.getCurrentUser();
          // Token is valid, redirect to home
          router.push("/home");
        } catch (error) {
          // Token is invalid or expired, redirect to sign in
          AuthService.removeToken();
          router.push("/signin");
        }
      } catch (error) {
        // Any other error, redirect to sign in
        console.error("Auth check failed:", error);
        router.push("/signin");
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthAndRedirect();
  }, [router]);

  // This should never be reached due to redirects, but just in case
  return null;
}
