"use client";

import { useState, useEffect, useRef } from "react";
import { Portal } from "@mantine/core";
import { useRouter } from "next/navigation";
import MatchRequestNotification from "./MatchRequestNotification";
import { useAcceptMatchRequest, useRejectMatchRequest } from "@/lib/api/queries/friends";
import { useNotificationSound } from "@/hooks/useNotificationSound";

interface MatchRequest {
  request_id: number;
  sender_id: number;
  sender_username: string;
  sender_elo: number;
  created_at: string;
}

interface NotificationManagerProps {
  userId: number;
  matchRequests: MatchRequest[];
}

export default function NotificationManager({ userId, matchRequests }: NotificationManagerProps) {
  const [dismissedRequests, setDismissedRequests] = useState<Set<number>>(new Set());
  const [currentNotification, setCurrentNotification] = useState<MatchRequest | null>(null);
  const previousRequestCount = useRef(0);
  const router = useRouter();

  const acceptMatchRequestMutation = useAcceptMatchRequest();
  const rejectMatchRequestMutation = useRejectMatchRequest();
  const { playNotificationSound } = useNotificationSound();

  // Show the first non-dismissed request and play sound for new requests
  useEffect(() => {
    const availableRequest = matchRequests.find(
      (request) => !dismissedRequests.has(request.request_id)
    );
    
    // Play sound if we have new requests
    if (matchRequests.length > previousRequestCount.current && matchRequests.length > 0) {
      playNotificationSound();
    }
    previousRequestCount.current = matchRequests.length;
    
    if (availableRequest && currentNotification?.request_id !== availableRequest.request_id) {
      setCurrentNotification(availableRequest);
    } else if (!availableRequest && currentNotification) {
      setCurrentNotification(null);
    }
  }, [matchRequests, dismissedRequests, currentNotification, playNotificationSound]);

  const handleAccept = (requestId: number) => {
    acceptMatchRequestMutation.mutate({ requestId, userId });
    setDismissedRequests(prev => new Set([...prev, requestId]));
    setCurrentNotification(null);
  };

  const handleReject = (requestId: number) => {
    rejectMatchRequestMutation.mutate({ requestId, userId });
    setDismissedRequests(prev => new Set([...prev, requestId]));
    setCurrentNotification(null);
  };

  const handleDismiss = () => {
    if (currentNotification) {
      setDismissedRequests(prev => new Set([...prev, currentNotification.request_id]));
      setCurrentNotification(null);
    }
  };

  // Clear dismissed requests when match requests change (in case they were cancelled)
  useEffect(() => {
    const currentRequestIds = new Set(matchRequests.map(r => r.request_id));
    setDismissedRequests(prev => {
      const newDismissed = new Set<number>();
      prev.forEach(id => {
        if (currentRequestIds.has(id)) {
          newDismissed.add(id);
        }
      });
      return newDismissed;
    });
  }, [matchRequests]);

  // Handle successful match request acceptance - redirect to match page
  useEffect(() => {
    if (acceptMatchRequestMutation.isSuccess && acceptMatchRequestMutation.data?.match_id) {
      // Redirect to match page - the WebSocket will handle the match_found event
      router.push(`/match`);
    }
  }, [acceptMatchRequestMutation.isSuccess, acceptMatchRequestMutation.data, router]);

  if (!currentNotification) {
    return null;
  }

  return (
    <Portal>
      <MatchRequestNotification
        request={currentNotification}
        onAccept={handleAccept}
        onReject={handleReject}
        onDismiss={handleDismiss}
        isLoading={acceptMatchRequestMutation.isPending || rejectMatchRequestMutation.isPending}
      />
    </Portal>
  );
}