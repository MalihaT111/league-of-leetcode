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
  usePendingMatchRequests,
  useMatchState,
  useSendMatchRequest,
  useAcceptMatchRequest,
  useRejectMatchRequest,
  useCancelMatchRequest,
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

  // All hooks must be called before any conditional returns
  const { data: searchResults, isLoading: searchLoading } = useSearchUsers(
    userId || 0,
    searchQuery,
    searchQuery.length >= 2
  );
  const { data: friendsList, isLoading: friendsLoading } = useFriendsList(userId || 0);
  const { data: friendRequests, isLoading: requestsLoading } = useFriendRequests(userId || 0);
  const { data: matchRequests, isLoading: matchRequestsLoading } = usePendingMatchRequests(userId || 0);
  const { data: matchState } = useMatchState(userId || 0);

  const sendRequest = useSendFriendRequest();
  const acceptRequest = useAcceptFriendRequest();
  const declineRequest = useDeclineFriendRequest();
  const cancelRequest = useCancelFriendRequest();
  const removeFriendMutation = useRemoveFriend();
  
  const sendMatchRequestMutation = useSendMatchRequest();
  const acceptMatchRequestMutation = useAcceptMatchRequest();
  const rejectMatchRequestMutation = useRejectMatchRequest();
  const cancelMatchRequestMutation = useCancelMatchRequest();

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

  // Handle match request acceptance - redirect to match page
  useEffect(() => {
    if (acceptMatchRequestMutation.isSuccess && acceptMatchRequestMutation.data?.match_id) {
      // Redirect to match page - the WebSocket will handle the match_found event
      router.push(`/match`);
    }
  }, [acceptMatchRequestMutation.isSuccess, acceptMatchRequestMutation.data, router]);

  // Check if user has a pending sent request that was accepted (for sender)
  useEffect(() => {
    const checkAcceptedRequest = async () => {
      if (!userId || !matchRequests?.sent || matchRequests.sent.length === 0) return;
      
      // Check if any sent request resulted in an active match
      try {
        const response = await fetch(`http://127.0.0.1:8000/api/friends/${userId}/match-state`);
        const state = await response.json();
        
        // If user is in an active match, redirect to match page
        if (state.in_active_match) {
          router.push(`/match`);
        }
      } catch (error) {
        console.error("Failed to check match state:", error);
      }
    };

    // Check every 2 seconds if user has sent requests
    const interval = setInterval(checkAcceptedRequest, 2000);
    return () => clearInterval(interval);
  }, [userId, matchRequests?.sent, router]);

  // Handle errors
  useEffect(() => {
    if (sendMatchRequestMutation.isError) {
      alert(sendMatchRequestMutation.error?.message || "Failed to send match request");
    }
  }, [sendMatchRequestMutation.isError, sendMatchRequestMutation.error]);

  useEffect(() => {
    if (acceptMatchRequestMutation.isError) {
      alert(acceptMatchRequestMutation.error?.message || "Failed to accept match request");
    }
  }, [acceptMatchRequestMutation.isError, acceptMatchRequestMutation.error]);

  // Early return after all hooks
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
  const matchRequestCount = matchRequests?.received?.length || 0;

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
              Friend Requests ({requestCount})
            </Tabs.Tab>
            <Tabs.Tab value="match-requests">
              Match Requests ({matchRequestCount})
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
                {friendsList.map((friend: any) => {
                  const pendingRequest = matchRequests?.sent?.find((req: any) => req.receiver_id === friend.user_id);
                  const hasPendingSent = !!pendingRequest;
                  const canSendMatchRequest = matchState?.can_send_match_request && !hasPendingSent;
                  
                  return (
                    <FriendCard
                      key={friend.user_id}
                      username={friend.username}
                      leetcodeUsername={friend.leetcode_username}
                      elo={friend.user_elo}
                      actions={
                        <>
                          {hasPendingSent ? (
                            <ActionButton
                              variant="cancel"
                              onClick={() => {
                                if (pendingRequest && userId) {
                                  cancelMatchRequestMutation.mutate({ requestId: pendingRequest.request_id, userId });
                                }
                              }}
                              loading={cancelMatchRequestMutation.isPending}
                            >
                              Cancel Match
                            </ActionButton>
                          ) : (
                            <ActionButton
                              variant="challenge"
                              onClick={() => sendMatchRequestMutation.mutate({ userId, friendId: friend.user_id })}
                              loading={sendMatchRequestMutation.isPending}
                              disabled={!canSendMatchRequest}
                            >
                              Challenge
                            </ActionButton>
                          )}
                          <ActionButton
                            variant="remove"
                            onClick={() => removeFriendMutation.mutate({ userId, friendId: friend.user_id })}
                            loading={removeFriendMutation.isPending}
                          >
                            Remove
                          </ActionButton>
                        </>
                      }
                    />
                  );
                })}
              </Stack>
            ) : (
              <div className={styles.emptyState}>
                No friends yet. Search for users to add!
              </div>
            )}
          </Tabs.Panel>

          {/* Match Requests Tab */}
          <Tabs.Panel value="match-requests" pt="xl">
            {matchRequestsLoading ? (
              <div className={styles.loadingState}>
                <Loader color="rgba(189, 155, 255, 1)" />
              </div>
            ) : matchRequests?.received && matchRequests.received.length > 0 ? (
              <Stack gap="md">
                {matchRequests.received.map((request: any) => (
                  <FriendCard
                    key={request.request_id}
                    username={request.sender_username}
                    leetcodeUsername={request.sender_username}
                    elo={request.sender_elo}
                    actions={
                      <>
                        <ActionButton
                          variant="accept"
                          onClick={() => acceptMatchRequestMutation.mutate({ requestId: request.request_id, userId })}
                          loading={acceptMatchRequestMutation.isPending}
                        >
                          Accept
                        </ActionButton>
                        <ActionButton
                          variant="remove"
                          onClick={() => rejectMatchRequestMutation.mutate({ requestId: request.request_id, userId })}
                          loading={rejectMatchRequestMutation.isPending}
                        >
                          Reject
                        </ActionButton>
                      </>
                    }
                  />
                ))}
              </Stack>
            ) : (
              <div className={styles.emptyState}>No pending match requests</div>
            )}
          </Tabs.Panel>

          {/* Friend Requests Tab */}
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
