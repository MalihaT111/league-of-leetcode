"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import LoadingScreen from "@/components/all/LoadingScreen";
import { AuthService } from "@/utils/auth";

// Routes that don't require authentication
const PUBLIC_ROUTES = ["/signin", "/signup", "/verify-leetcode"];

export default function InitialAppLoader({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      setIsLoading(true);

      // Check if current route is public
      const isPublicRoute = PUBLIC_ROUTES.some((route) => pathname.startsWith(route));

      if (isPublicRoute) {
        setIsAuthorized(true);
        setIsLoading(false);
        return;
      }

      // For protected routes, check authentication
      try {
        const token = AuthService.getToken();

        if (!token) {
          router.push("/signin");
          return;
        }

        // Verify token is valid
        await AuthService.getCurrentUser();
        setIsAuthorized(true);
      } catch (error) {
        console.error("Auth check failed:", error);
        AuthService.removeToken();
        router.push("/signin");
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [pathname, router]);

  if (isLoading) {
    return <LoadingScreen message="LOADING..." />;
  }

  if (!isAuthorized) {
    return null;
  }

  return <>{children}</>;
}
