"use client";
import React from "react";
import { Card, Title, Table, Text } from "@mantine/core";
import { useRouter } from "next/navigation";
import styles from "./Profile.module.css";

type RecentMatch = {
  match_id: number;
  outcome: string;
  rating_change: number;
  question: string;
};

export default function RecentSubmissionsTable({
  matches,
}: {
  matches: RecentMatch[];
}) {
  const lavenderDim = "rgba(189,155,255,0.55)";
  const rowEven = "rgba(255,255,255,0.02)";
  const rowOdd = "rgba(255,255,255,0.04)";

  const recentMatches = matches || [];
  const router = useRouter();

  const rows =
    recentMatches.length > 0
      ? recentMatches.map((match, index) => (
          <tr
            key={match.match_id}
            onClick={() => router.push(`/match-result/${match.match_id}`)}
            className={styles.tableRow}
            style={{ background: index % 2 === 0 ? rowEven : rowOdd }}
          >
            <td className={styles.tableCellLeft}>
              <Text
                fw={600}
                fz="sm"
                c={match.outcome === "win" ? "#9dffbd" : "#ff9b9b"}
              >
                {match.outcome.toUpperCase()}
              </Text>
            </td>

            <td className={styles.tableCellCenter}>
              <Text
                fw={600}
                fz="sm"
                c={match.rating_change >= 0 ? "#9dffbd" : "#ff9b9b"}
              >
                {match.rating_change >= 0
                  ? `+${match.rating_change}`
                  : match.rating_change}
              </Text>
            </td>

            <td className={styles.tableCellLeft}>
              <Text fw={500} fz="sm" className="problem-name">
                {match.question}
              </Text>
            </td>
          </tr>
        ))
      : [
          <tr key="none">
            <td colSpan={3} className={styles.emptyCell}>
              <Text c="gray.5">No recent submissions</Text>
            </td>
          </tr>,
        ];

  return (
    <Card radius="md" p="xl" className={styles.submissionsCard}>
      <Title
        order={2}
        ta="center"
        className={`title-gradient ${styles.submissionsTitle}`}
      >
        RECENT SUBMISSIONS
      </Title>

      <div className={styles.tableWrapper}>
        <Table
          withColumnBorders={false}
          withRowBorders={false}
          horizontalSpacing="sm"
          verticalSpacing="sm"
          highlightOnHover={false}
          className={styles.table}
        >
          <thead>
            <tr>
              <th style={{ textAlign: "left" }}>
                <Text c={lavenderDim} fw={600}>
                  OUTCOME
                </Text>
              </th>
              <th style={{ textAlign: "center" }}>
                <Text c={lavenderDim} fw={600}>
                  RATING CHANGE
                </Text>
              </th>
              <th style={{ textAlign: "left" }}>
                <Text c={lavenderDim} fw={600}>
                  QUESTION
                </Text>
              </th>
            </tr>
          </thead>

          <tbody>{rows}</tbody>
        </Table>
      </div>
    </Card>
  );
}
