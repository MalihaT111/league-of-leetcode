"use client";
import React from "react";
import { useProfileQuery } from "@/lib/api/queries/profile";
import { Flex, Title } from "@mantine/core";
import Navbar from "@/components/all/Navbar";
import ProfileStatsCard from "@/components/profile/Stats";
import RecentSubmissionsTable from "@/components/profile/Submissions";
import ProfileAchievements from "@/components/profile/achievements/ProfileAchievements";
import { useParams } from "next/navigation";
import styles from "./Profile.module.css";
import NotFound from "@/app/not-found";

export default function ProfilePage() {
  const { id } = useParams();
  const userId = Number(id);

  const { data, isLoading, error } = useProfileQuery(userId);

  if (!userId || Number.isNaN(userId)) {
    return <NotFound />
  }

  if (isLoading) return null;
  if (error || !data) return <p>Failed to load profile data.</p>;

  const { user, stats, recent_matches } = data;

  return (
    <Flex
      direction="column"
      align="center"
      bg="#0d0d0f"
      mih="100vh"
      c="white"
      className={styles.page}
    >
      <Navbar />

      <Title order={1} className={`title-gradient ${styles.title}`}>
        PROFILE
      </Title>

      <Flex className={styles.content}>
        <ProfileStatsCard user={user} stats={stats} />
        <RecentSubmissionsTable matches={recent_matches} />
        <ProfileAchievements userId={userId} />
      </Flex>
    </Flex>
  );
}
