"use client";

import { useState, useEffect } from "react";
import { Flex, Title, Tabs, TextInput, Button, Card, Text, Badge, Group, Stack, Avatar } from "@mantine/core";
// Icons replaced with text for simplicity
import { montserrat } from "../fonts";
import Navbar from "@/components/navbar";
import { AuthService } from "@/utils/auth";
import { useRouter } from "next/navigation";
import {
  useSearchUsers,
  useFriendsList,
  useFriendRequests,
  useSendFriendRequest,
  useAcceptFriendRequest,
  useDeclineFriendRequest,
  useCancelFriendRequest,
  useRemoveFriend,
} from "@/lib/api/queries/friends";

export default function FriendsPage() {
  const [userId, setUserId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<string | null>("friends");
  const router = useRouter();

  // Get current user
  useEffect(() => {
    const getCurrentUser = async () => {
      try {
        const user = await AuthService.getCurrentUser();
        setUserId(user.id);
      } catch (error) {
        console.error("Failed to get current user:", error);
        router.push("/signin");
      }
    };
    getCurrentUser();
  }, [router]);

  // Queries
  const { data: searchResults, isLoading: searchLoading } = useSearchUsers(
    userId || 0,
    searchQuery,
    searchQuery.length >= 2
  );
  const { data: friendsList, isLoading: friendsLoading } = useFriendsList(userId || 0);
  const { data: friendRequests, isLoading: requestsLoading } = useFriendRequests(userId || 0);

  // Mutations
  const sendRequest = useSendFriendRequest();
  const acceptRequest = useAcceptFriendRequest();
  const declineRequest = useDeclineFriendRequest();
  const cancelRequest = useCancelFriendRequest();
  const removeFriendMutation = useRemoveFriend();

  if (!userId) {
    return null;
  }

  return (
    <Flex
      direction="column"
      align="center"
      mih="100vh"
      bg="#1a1a1a"
      c="white"
      p="xl"
    >
      <Navbar />
      
      <Title
        order={1}
        className={montserrat.className}
        style={{ fontSize: "40px", fontWeight: 700, marginTop: "80px", marginBottom: "40px" }}
      >
        FRIENDS
      </Title>

      <Tabs
        value={activeTab}
        onChange={setActiveTab}
        color="yellow"
        variant="default"
        style={{ width: "100%", maxWidth: "900px" }}
      >
        <Tabs.List>
          <Tabs.Tab value="friends">
            My Friends ({friendsList?.length || 0})
          </Tabs.Tab>
          <Tabs.Tab value="requests">
            Requests ({(friendRequests?.received?.length || 0) + (friendRequests?.sent?.length || 0)})
          </Tabs.Tab>
          <Tabs.Tab value="search">
            Add Friends
          </Tabs.Tab>
        </Tabs.List>

        {/* Friends List Tab */}
        <Tabs.Panel value="friends" pt="xl">
          {friendsList && friendsList.length > 0 ? (
            <Stack gap="md">
              {friendsList.map((friend: any) => (
                <Card key={friend.user_id} bg="#2a2a2a" p="md">
                  <Group justify="space-between">
                    <Group>
                      <Avatar color="yellow" radius="xl">
                        {friend.username.charAt(0).toUpperCase()}
                      </Avatar>
                      <div>
                        <Text fw={600}>{friend.username}</Text>
                        <Text size="sm" c="dimmed">{friend.leetcode_username}</Text>
                      </div>
                    </Group>
                    <Group>
                      <Badge color="yellow" variant="light">
                        ELO: {friend.user_elo}
                      </Badge>
                      <Button
                        color="red"
                        variant="light"
                        size="xs"
                        onClick={() => removeFriendMutation.mutate({ userId, friendId: friend.user_id })}
                        loading={removeFriendMutation.isPending}
                      >
                        Remove
                      </Button>
                    </Group>
                  </Group>
                </Card>
              ))}
            </Stack>
          ) : (
            <Text c="dimmed" ta="center" mt="xl">
              No friends yet. Search for users to add!
            </Text>
          )}
        </Tabs.Panel>

        {/* Requests Tab */}
        <Tabs.Panel value="requests" pt="xl">
          <Stack gap="xl">
            {/* Received Requests */}
            <div>
              <Text fw={600} size="lg" mb="md">
                Received ({friendRequests?.received?.length || 0})
              </Text>
              {friendRequests?.received && friendRequests.received.length > 0 ? (
                <Stack gap="md">
                  {friendRequests.received.map((request: any) => (
                    <Card key={request.user_id} bg="#2a2a2a" p="md">
                      <Group justify="space-between">
                        <Group>
                          <Avatar color="yellow" radius="xl">
                            {request.username.charAt(0).toUpperCase()}
                          </Avatar>
                          <div>
                            <Text fw={600}>{request.username}</Text>
                            <Text size="sm" c="dimmed">{request.leetcode_username}</Text>
                          </div>
                        </Group>
                        <Group>
                          <Badge color="yellow" variant="light">
                            ELO: {request.user_elo}
                          </Badge>
                          <Button
                            color="green"
                            variant="light"
                            size="xs"
                            onClick={() => acceptRequest.mutate({ userId, requesterId: request.user_id })}
                            loading={acceptRequest.isPending}
                          >
                            Accept
                          </Button>
                          <Button
                            color="red"
                            variant="light"
                            size="xs"
                            onClick={() => declineRequest.mutate({ userId, requesterId: request.user_id })}
                            loading={declineRequest.isPending}
                          >
                            Decline
                          </Button>
                        </Group>
                      </Group>
                    </Card>
                  ))}
                </Stack>
              ) : (
                <Text c="dimmed" ta="center">No pending requests</Text>
              )}
            </div>

            {/* Sent Requests */}
            <div>
              <Text fw={600} size="lg" mb="md">
                Sent ({friendRequests?.sent?.length || 0})
              </Text>
              {friendRequests?.sent && friendRequests.sent.length > 0 ? (
                <Stack gap="md">
                  {friendRequests.sent.map((request: any) => (
                    <Card key={request.user_id} bg="#2a2a2a" p="md">
                      <Group justify="space-between">
                        <Group>
                          <Avatar color="yellow" radius="xl">
                            {request.username.charAt(0).toUpperCase()}
                          </Avatar>
                          <div>
                            <Text fw={600}>{request.username}</Text>
                            <Text size="sm" c="dimmed">{request.leetcode_username}</Text>
                          </div>
                        </Group>
                        <Group>
                          <Badge color="gray" variant="light">
                            Pending
                          </Badge>
                          <Button
                            color="red"
                            variant="light"
                            size="xs"
                            onClick={() => cancelRequest.mutate({ userId, targetId: request.user_id })}
                            loading={cancelRequest.isPending}
                          >
                            Cancel
                          </Button>
                        </Group>
                      </Group>
                    </Card>
                  ))}
                </Stack>
              ) : (
                <Text c="dimmed" ta="center">No sent requests</Text>
              )}
            </div>
          </Stack>
        </Tabs.Panel>

        {/* Search Tab */}
        <Tabs.Panel value="search" pt="xl">
          <TextInput
            placeholder="Search for users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            size="md"
            mb="xl"
            styles={{
              input: {
                backgroundColor: "#2a2a2a",
                border: "1px solid #444",
                color: "white",
                "&:focus": {
                  borderColor: "#FFBD42",
                },
              },
            }}
          />

          {searchQuery.length < 2 ? (
            <Text c="dimmed" ta="center">
              Type at least 2 characters to search
            </Text>
          ) : searchLoading ? (
            <Text c="dimmed">Searching...</Text>
          ) : searchResults && searchResults.length > 0 ? (
            <Stack gap="md">
              {searchResults.map((user: any) => (
                <Card key={user.user_id} bg="#2a2a2a" p="md">
                  <Group justify="space-between">
                    <Group>
                      <Avatar color="yellow" radius="xl">
                        {user.username.charAt(0).toUpperCase()}
                      </Avatar>
                      <div>
                        <Text fw={600}>{user.username}</Text>
                        <Text size="sm" c="dimmed">{user.leetcode_username}</Text>
                      </div>
                    </Group>
                    <Group>
                      <Badge color="yellow" variant="light">
                        ELO: {user.user_elo}
                      </Badge>
                      <Button
                        color="yellow"
                        variant="light"
                        onClick={() => sendRequest.mutate({ userId, targetUserId: user.user_id })}
                        loading={sendRequest.isPending}
                      >
                        Add Friend
                      </Button>
                    </Group>
                  </Group>
                </Card>
              ))}
            </Stack>
          ) : (
            <Text c="dimmed" ta="center">
              No users found
            </Text>
          )}
        </Tabs.Panel>
      </Tabs>
    </Flex>
  );
}
