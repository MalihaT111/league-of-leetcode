import type { Metadata } from "next";
import "./globals.css";
import { MantineProvider } from "@mantine/core";
import "@mantine/core/styles.css";
import "./fonts.css";
import { Space_Grotesk } from "next/font/google";
import { montserrat, orbitron, geistSans, geistMono } from "./fonts";
import ReactQueryProvider from "@/lib/queryProvider";

import InitialAppLoader from "./InitialAppLoader";   // ⭐ ADD THIS

export const metadata: Metadata = {
  title: "League of LeetCode",
  description: "Compete and practice coding with others",
};

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-space-grotesk",
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`
          ${geistSans.variable}
          ${geistMono.variable}
          ${montserrat.variable}
          ${orbitron.variable}
          ${spaceGrotesk.variable}
        `}
        suppressHydrationWarning
      >
        <MantineProvider
          defaultColorScheme="dark"
          theme={{
            fontFamily: "var(--font-space-grotesk), sans-serif",
            headings: { fontFamily: "var(--font-orbitron), sans-serif" },
            fontFamilyMonospace: "var(--font-geist-mono), monospace",
          }}
        >
          <ReactQueryProvider>
            <InitialAppLoader> 
                          {/* ⭐ WRAP CHILDREN HERE */}
              {children}
            </InitialAppLoader>

          </ReactQueryProvider>
        </MantineProvider>
      </body>
    </html>
  );
}
