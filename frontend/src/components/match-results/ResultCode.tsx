"use client";

import { useState } from "react";
import { Modal, ActionIcon } from "@mantine/core";

function formatAnyCode(raw: string): string {
  if (!raw) return "";
  try {
    raw = JSON.parse(`"${raw.replace(/"/g, '\\"')}"`);
  } catch {
    raw = raw
      .replace(/\\n/g, "\n")
      .replace(/\\t/g, "    ")
      .replace(/\\\\/g, "\\");
  }
  const lines = raw.split("\n");
  while (lines.length && lines[0].trim() === "") lines.shift();
  if (!lines.length) return raw;
  const indent = Math.min(
    ...lines
      .filter((l) => l.trim().length > 0)
      .map((l) => l.match(/^ */)?.[0].length ?? 0),
  );
  return lines.map((l) => l.slice(indent)).join("\n");
}

export default function ResultCode({ code }: { code: string }) {
  const [opened, setOpened] = useState(false);

  return (
    <>
      {/* FULLSCREEN MODAL */}
      <Modal
        opened={opened}
        onClose={() => setOpened(false)}
        size="90%"
        yOffset="4vh"
        padding="lg"
        styles={{
          content: {
            background: "#1a1a1a", // modal background
            color: "white",
          },
          header: {
            background: "#1a1a1a", // top bar matches body
            color: "white",
            borderBottom: "none",
            paddingBottom: "0.5rem",
          },
          close: {
            color: "white", // close icon becomes white
            "&:hover": { background: "#333" },
          },
          body: {
            background: "#1a1a1a",
            color: "white",
            height: "80vh",
            overflow: "hidden",
          },
        }}
      >
        <pre
          style={{
            overflowX: "auto",
            overflowY: "auto",
            height: "100%",
            background: "#1a1a1a",
            color: "#e0e0e0",
            fontFamily: "monospace",
            fontSize: "16px",
            borderRadius: "8px",
          }}
        >
          {code ? formatAnyCode(code) : <b style={{ fontSize: "28px" }}>N/A</b>}
        </pre>
      </Modal>

      {/* INLINE CODE DISPLAY WITH FULLSCREEN BUTTON */}
      <div style={{ position: "relative" }}>
        <ActionIcon
          variant="subtle"
          color="gray"
          size="sm"
          onClick={() => setOpened(true)}
          style={{
            position: "absolute",
            top: 4,
            right: 4,
            zIndex: 10,
          }}
        >
          {/* Inline SVG Fullscreen Icon */}
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M15 3h6v6" />
            <path d="M9 21H3v-6" />
            <path d="M21 3l-7 7" />
            <path d="M3 21l7-7" />
          </svg>
        </ActionIcon>

        <pre
          style={{
            background: "#1a1a1a",
            color: "#e0e0e0",
            padding: "12px",
            borderRadius: "8px",
            overflowX: "auto",
            whiteSpace: "pre",
            fontFamily: "monospace",
            fontSize: "14px",
            maxHeight: "220px",
          }}
        >
          {code ? (
            formatAnyCode(code)
          ) : (
            <span
              style={{ fontWeight: 700, fontSize: "22px", color: "#ff6b6b" }}
            >
              N/A
            </span>
          )}
        </pre>
      </div>
    </>
  );
}