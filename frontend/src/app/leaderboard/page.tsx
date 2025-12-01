"use client";
import { montserrat } from "@/app/fonts";
import React from "react";
import Navbar from "@/components/all/Navbar";
import LeaderboardTable from "@/components/leaderboard/LeaderboardTable";
import {
  Card,
  Flex,
  Group,
  Table,
  Text,
  Title,
  Avatar,
  Divider,
  Loader,
  Center,
} from "@mantine/core";
import { useLeaderboardQuery } from "@/lib/api/queries/leaderboard";

// type Player = {
//   rank: number;
//   username: string;
//   elo: number;
//   winstreak: number;
// };

// function LeaderboardTable() {
//   const accent = "#d8a727"; // softer gold
//   const bgEven = "#121212";
//   const bgOdd = "#181818";

//   // ✅ use query data instead of hardcoded list
//   const { data, isLoading, isError } = useLeaderboardQuery();

//   if (isLoading) {
//     return (
//       <Center mih="60vh">
//         <Loader color={accent} />
//       </Center>
//     );
//   }

//   if (isError) {
//     return (
//       <Center mih="60vh">
//         <Text c="red" fz="lg">
//           Failed to load leaderboard.
//         </Text>
//       </Center>
//     );
//   }

//   const leaderboard: Player[] = data ?? [];

//   const rows = leaderboard.map((player) => (
//     <tr
//       key={player.rank}
//       style={{
//         backgroundColor: player.rank % 2 === 0 ? bgEven : bgOdd,
//         transition: "background 0.2s ease",
//       }}
//     >
//       <td style={{ textAlign: "center", width: 80 }}>
//         <Text fw={700} fz="md" c="white" style={{ fontStyle: "italic" }}>
//           {player.rank}
//         </Text>
//       </td>

//       <td>
//         <Group justify="flex-start" gap="sm">
//           <Avatar radius="xl" size="md" color="gray" />
//           <Text fw={600} fz="md" c="white" style={{ fontStyle: "italic" }}>
//             {player.username}
//           </Text>
//         </Group>
//       </td>

//       <td style={{ textAlign: "center", width: 160 }}>
//         <Text fw={700} fz="md" c="white" style={{ fontStyle: "italic" }}>
//           {player.elo.toLocaleString()}
//         </Text>
//       </td>

//       <td style={{ textAlign: "center", width: 120 }}>
//         <Text fw={700} fz="md" c="white" style={{ fontStyle: "italic" }}>
//           {player.winstreak}
//         </Text>
//       </td>
//     </tr>
//   ));

//   return (
//     <Card
//       shadow="sm"
//       radius="md"
//       p="xl"
//       w={800}
//       className={montserrat.className}
//       style={{
//         backgroundColor: "#1a1a1a",
//         border: `1px solid ${accent}`,
//         boxShadow: `0 0 35px rgba(216,167,39,0.08)`,
//       }}
//     >
//       <Title
//         order={1}
//         mb="sm"
//         c={accent}
//         ta="center"
//         style={{
//           letterSpacing: 0.8,
//           fontSize: "40px",
//           fontWeight: 700,
//           fontStyle: "italic",
//         }}
//       >
//         LEADERBOARD
//       </Title>

//       <Divider color={accent} mb="md" />

//       <Table
//         withColumnBorders={false}
//         withRowBorders={false}
//         horizontalSpacing="md"
//         verticalSpacing="sm"
//         highlightOnHover
//         style={{ backgroundColor: "transparent" }}
//       >
//         <thead style={{ backgroundColor: "#000000" }}>
//           <tr>
//             <th style={{ textAlign: "center" }}>
//               <Text fw={700} fz="sm" c={accent} style={{ fontStyle: "italic" }}>
//                 RANK
//               </Text>
//             </th>
//             <th style={{ textAlign: "left" }}>
//               <Text fw={700} fz="sm" c={accent} style={{ fontStyle: "italic" }}>
//                 USER
//               </Text>
//             </th>
//             <th style={{ textAlign: "center" }}>
//               <Text fw={700} fz="sm" c={accent} style={{ fontStyle: "italic" }}>
//                 ELO
//               </Text>
//             </th>
//             <th style={{ textAlign: "center" }}>
//               <Text fw={700} fz="sm" c={accent} style={{ fontStyle: "italic" }}>
//                 STREAK
//               </Text>
//             </th>
//           </tr>
//         </thead>

//         <tbody>{rows}</tbody>
//       </Table>
//     </Card>
//   );
// }

export default function LeaderboardPage() {
  return (
    <Flex
      direction="column"
      align="center"
      justify="center"
      mih="100vh"
      bg="#0c0c0c"
      gap={40}
    >
      <Navbar />
      <LeaderboardTable />
    </Flex>
  );
}
