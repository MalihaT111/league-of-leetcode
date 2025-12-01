"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import LoadingScreen from "@/components/LoadingScreen";

export default function InitialAppLoader({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(true);

  // INITIAL LOAD
  useEffect(() => {
    setIsLoading(false);
  }, []);

  // ROUTE CHANGE
  useEffect(() => {
    setIsLoading(true);

    // Let the new page mount, then hide loader
    const t = setTimeout(() => {
      setIsLoading(false);
    }, 150);  // tiny delay to avoid hydration crash

    return () => clearTimeout(t);
  }, [pathname]);

  return (
    <>
      {isLoading && <LoadingScreen message="LOADING..." />}
      {children}
    </>
  );
}
