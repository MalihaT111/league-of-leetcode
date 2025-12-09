import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  searchUsers,
  sendFriendRequest,
  getFriendsList,
  getFriendRequests,
  acceptFriendRequest,
  declineFriendRequest,
  cancelFriendRequest,
  removeFriend,
  sendMatchRequest,
  acceptMatchRequest,
  rejectMatchRequest,
  cancelMatchRequest,
  getPendingMatchRequests,
  getMatchState,
} from "../../friends";

export const useSearchUsers = (userId: number, query: string, enabled: boolean = false) => {
  return useQuery({
    queryKey: ["searchUsers", userId, query],
    queryFn: () => searchUsers(userId, query),
    enabled: enabled && query.length >= 2,
    staleTime: 30000, // Cache for 30 seconds
  });
};

export const useFriendsList = (userId: number) => {
  return useQuery({
    queryKey: ["friendsList", userId],
    queryFn: () => getFriendsList(userId),
    staleTime: 10000, // Cache for 10 seconds
  });
};

export const useFriendRequests = (userId: number) => {
  return useQuery({
    queryKey: ["friendRequests", userId],
    queryFn: () => getFriendRequests(userId),
    staleTime: 5000, // Cache for 5 seconds
  });
};

export const useSendFriendRequest = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ userId, targetUserId }: { userId: number; targetUserId: number }) =>
      sendFriendRequest(userId, targetUserId),
    onSuccess: (_, variables) => {
      // Invalidate friend requests to refresh the sent list
      queryClient.invalidateQueries({ queryKey: ["friendRequests", variables.userId] });
    },
  });
};

export const useAcceptFriendRequest = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ userId, requesterId }: { userId: number; requesterId: number }) =>
      acceptFriendRequest(userId, requesterId),
    onSuccess: (_, variables) => {
      // Invalidate both friends list and requests
      queryClient.invalidateQueries({ queryKey: ["friendsList", variables.userId] });
      queryClient.invalidateQueries({ queryKey: ["friendRequests", variables.userId] });
    },
  });
};

export const useDeclineFriendRequest = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ userId, requesterId }: { userId: number; requesterId: number }) =>
      declineFriendRequest(userId, requesterId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["friendRequests", variables.userId] });
    },
  });
};

export const useCancelFriendRequest = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ userId, targetId }: { userId: number; targetId: number }) =>
      cancelFriendRequest(userId, targetId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["friendRequests", variables.userId] });
    },
  });
};

export const useRemoveFriend = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ userId, friendId }: { userId: number; friendId: number }) =>
      removeFriend(userId, friendId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["friendsList", variables.userId] });
      queryClient.invalidateQueries({ queryKey: ["matchRequests", variables.userId] });
    },
  });
};

// Match request hooks
export const usePendingMatchRequests = (userId: number) => {
  return useQuery({
    queryKey: ["matchRequests", userId],
    queryFn: () => getPendingMatchRequests(userId),
    staleTime: 3000, // Cache for 3 seconds
    refetchInterval: 5000, // Poll every 5 seconds
  });
};

export const useMatchState = (userId: number) => {
  return useQuery({
    queryKey: ["matchState", userId],
    queryFn: () => getMatchState(userId),
    staleTime: 2000, // Cache for 2 seconds
    refetchInterval: 5000, // Poll every 5 seconds
  });
};

export const useSendMatchRequest = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ userId, friendId }: { userId: number; friendId: number }) =>
      sendMatchRequest(userId, friendId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["matchRequests", variables.userId] });
      queryClient.invalidateQueries({ queryKey: ["matchState", variables.userId] });
    },
  });
};

export const useAcceptMatchRequest = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ requestId, userId }: { requestId: number; userId: number }) =>
      acceptMatchRequest(requestId, userId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["matchRequests", variables.userId] });
      queryClient.invalidateQueries({ queryKey: ["matchState", variables.userId] });
    },
  });
};

export const useRejectMatchRequest = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ requestId, userId }: { requestId: number; userId: number }) =>
      rejectMatchRequest(requestId, userId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["matchRequests", variables.userId] });
      queryClient.invalidateQueries({ queryKey: ["matchState", variables.userId] });
    },
  });
};

export const useCancelMatchRequest = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ requestId, userId }: { requestId: number; userId: number }) =>
      cancelMatchRequest(requestId, userId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["matchRequests", variables.userId] });
      queryClient.invalidateQueries({ queryKey: ["matchState", variables.userId] });
    },
  });
};
