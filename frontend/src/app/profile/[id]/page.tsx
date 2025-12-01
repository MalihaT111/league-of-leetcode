"use client";
import React from "react";
import { useProfileQuery } from "@/lib/api/queries/profile";
import { Flex, Title } from "@mantine/core";
import { montserrat } from "../../fonts";
import Navbar from "@/components/all/Navbar";
import ProfileStatsCard from "@/components/profile/profilestatscard";
import RecentSubmissionsTable from "@/components/profile/profilesubmissions";
import { useParams } from "next/navigation";

export default function ProfilePage() {
  const { id } = useParams();
  const userId = Number(id); // convert to number

  const { data, isLoading, error } = useProfileQuery(userId);

  if (isLoading) return null;
  if (error || !data) return <p>Failed to load profile data.</p>;

  // ✅ Destructure to match backend JSON
  const { user, stats, recent_matches } = data;

  return (
    <Flex
      direction="column"
      align="center"
      justify="center"
      mih="100vh"
      bg="#1a1a1a"
      c="white"
      gap={40}
    >
      <Navbar />
      <Title
        order={1}
        className="title-gradient"
        style={{ fontSize: "3rem" }}
      >
        PROFILE
      </Title>

      <Flex gap={60} align="flex-start" justify="center">
        {/* ✅ Pass both user and stats separately */}
        <ProfileStatsCard user={user} stats={stats} />

        {/* ✅ Pass matches for the table */}
        <RecentSubmissionsTable matches={recent_matches} />
      </Flex>
    </Flex>
  );
}
