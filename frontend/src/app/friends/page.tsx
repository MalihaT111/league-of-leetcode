"use client";

import { useState, useEffect } from "react";
import { Flex, Title, Tabs, Stack, Loader, Text } from "@mantine/core";
import { Space_Grotesk } from "next/font/google";
import Navbar from "@/components/all/Navbar";
import FriendCard, { ActionButton, PendingBadge } from "@/components/friends/FriendCard";
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
import styles from "./Friends.module.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export default function FriendsPage() {
  const [userId, setUserId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<string | null>("friends");
  const router = useRouter();

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

  const { data: searchResults, isLoading: searchLoading } = useSearchUsers(
    userId || 0,
    searchQuery,
    searchQuery.length >= 2
  );
  const { data: friendsList, isLoading: friendsLoading } = useFriendsList(userId || 0);
  const { data: friendRequests, isLoading: requestsLoading } = useFriendRequests(userId || 0);

  const sendRequest = useSendFriendRequest();
  const acceptRequest = useAcceptFriendRequest();
  const declineRequest = useDeclineFriendRequest();
  const cancelRequest = useCancelFriendRequest();
  const removeFriendMutation = useRemoveFriend();

  if (!userId) {
    return (
      <Flex className={`${spaceGrotesk.className} ${styles.page}`}>
        <Navbar />
        <div className={styles.loadingState}>
          <Loader color="rgba(189, 155, 255, 1)" />
        </div>
      </Flex>
    );
  }

  const friendCount = friendsList?.length || 0;
  const requestCount = (friendRequests?.received?.length || 0) + (friendRequests?.sent?.length || 0);

  return (
    <Flex
      direction="column"
      align="center"
      className={`${spaceGrotesk.className} ${styles.page}`}
    >
      <Navbar />

      <Title order={1} className={`title-gradient ${styles.title}`}>
        FRIENDS
      </Title>

      <div className={styles.container}>
        <Tabs
          value={activeTab}
          onChange={setActiveTab}
          classNames={{
            root: styles.tabs,
            list: styles.tabsList,
            tab: styles.tab,
          }}
        >
          <Tabs.List grow>
            <Tabs.Tab value="friends">
              My Friends ({friendCount})
            </Tabs.Tab>
            <Tabs.Tab value="requests">
              Requests ({requestCount})
            </Tabs.Tab>
            <Tabs.Tab value="search">
              Add Friends
            </Tabs.Tab>
          </Tabs.List>


          {/* Friends List Tab */}
          <Tabs.Panel value="friends" pt="xl">
            {friendsLoading ? (
              <div className={styles.loadingState}>
                <Loader color="rgba(189, 155, 255, 1)" />
              </div>
            ) : friendsList && friendsList.length > 0 ? (
              <Stack gap="md">
                {friendsList.map((friend: any) => (
                  <FriendCard
                    key={friend.user_id}
                    username={friend.username}
                    leetcodeUsername={friend.leetcode_username}
                    elo={friend.user_elo}
                    profilePictureUrl={friend.profile_picture_url}
                    actions={
                      <ActionButton
                        variant="remove"
                        onClick={() => removeFriendMutation.mutate({ userId, friendId: friend.user_id })}
                        loading={removeFriendMutation.isPending}
                      >
                        Remove
                      </ActionButton>
                    }
                  />
                ))}
              </Stack>
            ) : (
              <div className={styles.emptyState}>
                No friends yet. Search for users to add!
              </div>
            )}
          </Tabs.Panel>

          {/* Requests Tab */}
          <Tabs.Panel value="requests" pt="xl">
            {requestsLoading ? (
              <div className={styles.loadingState}>
                <Loader color="rgba(189, 155, 255, 1)" />
              </div>
            ) : (
              <Stack gap="xl">
                {/* Received Requests */}
                <div>
                  <Text className={styles.sectionTitle}>
                    Received ({friendRequests?.received?.length || 0})
                  </Text>
                  {friendRequests?.received && friendRequests.received.length > 0 ? (
                    <Stack gap="md">
                      {friendRequests.received.map((request: any) => (
                        <FriendCard
                          key={request.user_id}
                          username={request.username}
                          leetcodeUsername={request.leetcode_username}
                          elo={request.user_elo}
                          profilePictureUrl={request.profile_picture_url}
                          actions={
                            <>
                              <ActionButton
                                variant="accept"
                                onClick={() => acceptRequest.mutate({ userId, requesterId: request.user_id })}
                                loading={acceptRequest.isPending}
                              >
                                Accept
                              </ActionButton>
                              <ActionButton
                                variant="remove"
                                onClick={() => declineRequest.mutate({ userId, requesterId: request.user_id })}
                                loading={declineRequest.isPending}
                              >
                                Decline
                              </ActionButton>
                            </>
                          }
                        />
                      ))}
                    </Stack>
                  ) : (
                    <div className={styles.emptyState}>No pending requests</div>
                  )}
                </div>

                {/* Sent Requests */}
                <div>
                  <Text className={styles.sectionTitle}>
                    Sent ({friendRequests?.sent?.length || 0})
                  </Text>
                  {friendRequests?.sent && friendRequests.sent.length > 0 ? (
                    <Stack gap="md">
                      {friendRequests.sent.map((request: any) => (
                        <FriendCard
                          key={request.user_id}
                          username={request.username}
                          leetcodeUsername={request.leetcode_username}
                          elo={request.user_elo}
                          profilePictureUrl={request.profile_picture_url}
                          actions={
                            <>
                              <PendingBadge />
                              <ActionButton
                                variant="cancel"
                                onClick={() => cancelRequest.mutate({ userId, targetId: request.user_id })}
                                loading={cancelRequest.isPending}
                              >
                                Cancel
                              </ActionButton>
                            </>
                          }
                        />
                      ))}
                    </Stack>
                  ) : (
                    <div className={styles.emptyState}>No sent requests</div>
                  )}
                </div>
              </Stack>
            )}
          </Tabs.Panel>

          {/* Search Tab */}
          <Tabs.Panel value="search" pt="xl">
            <input
              type="text"
              placeholder="Search for users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={styles.searchInput}
            />

            {searchQuery.length < 2 ? (
              <div className={styles.emptyState}>
                Type at least 2 characters to search
              </div>
            ) : searchLoading ? (
              <div className={styles.loadingState}>
                <Loader color="rgba(189, 155, 255, 1)" />
              </div>
            ) : searchResults && searchResults.length > 0 ? (
              <Stack gap="md" mt="md">
                {searchResults.map((user: any) => (
                  <FriendCard
                    key={user.user_id}
                    username={user.username}
                    leetcodeUsername={user.leetcode_username}
                    elo={user.user_elo}
                    profilePictureUrl={user.profile_picture_url}
                    actions={
                      <ActionButton
                        variant="add"
                        onClick={() => sendRequest.mutate({ userId, targetUserId: user.user_id })}
                        loading={sendRequest.isPending}
                      >
                        Add Friend
                      </ActionButton>
                    }
                  />
                ))}
              </Stack>
            ) : (
              <div className={styles.emptyState}>No users found</div>
            )}
          </Tabs.Panel>
        </Tabs>
      </div>
    </Flex>
  );
}
