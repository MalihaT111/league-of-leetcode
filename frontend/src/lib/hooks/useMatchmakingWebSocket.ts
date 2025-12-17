import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { notifications } from '@mantine/notifications';
import { Achievement } from '@/lib/api/queries/achievements/types';

interface MatchFoundData {
  match_id: number;
  problem: {
    id: number;
    title: string;
    slug: string;
    difficulty: string;
    tags: string[];
    acceptance_rate: string;
  };
  opponent: {
    username: string;
    elo: number;
    profile_picture_url?: string | null;
  };
}

interface WebSocketMessage {
  type: string;
  match_id?: number;
  problem?: any;
  opponent?: any;
  result?: string;
  elo_change?: string;
  message?: string;
  phase?: string;
  countdown?: number;
  seconds?: number;
  formatted_time?: string;
  start_timestamp?: number;
  achievements_unlocked?: Achievement[];
  // Queue status fields
  queue_size?: number;
  wait_time?: number;
  elo_range?: number;
  potential_matches?: number;
}

export const useMatchmakingWebSocket = (userId: number | null, onMatchCompleted?: () => void) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isInQueue, setIsInQueue] = useState(false);
  const [matchData, setMatchData] = useState<MatchFoundData | null>(null);
  const [matchFound, setMatchFound] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Timer states
  const [timerPhase, setTimerPhase] = useState<'countdown' | 'start' | 'active' | null>(null);
  const [countdown, setCountdown] = useState<number>(3);
  const [matchSeconds, setMatchSeconds] = useState<number>(0);
  const [formattedTime, setFormattedTime] = useState<string>("00:00");
  const [startTimestamp, setStartTimestamp] = useState<number | null>(null);
  
  // Queue status states
  const [queueStatus, setQueueStatus] = useState<{
    queueSize: number;
    waitTime: number;
    eloRange: number;
    potentialMatches: number;
    message: string;
  } | null>(null);
  
  const wsRef = useRef<WebSocket | null>(null);
  const router = useRouter();

  // Function to display achievement notifications
  const displayAchievementNotifications = useCallback((achievements: Achievement[]) => {
    achievements.forEach((achievement, index) => {
      // Stagger notifications to avoid overlap
      setTimeout(() => {
        notifications.show({
          id: `achievement-${achievement.id}`,
          title: '🏆 Achievement Unlocked!',
          message: achievement.description,
          color: 'yellow',
          autoClose: 5000,
          withCloseButton: true,
          style: {
            background: "linear-gradient(135deg, rgba(139, 69, 19, 0.1), rgba(255, 215, 0, 0.1))",
            border: "1px solid rgba(255, 215, 0, 0.3)",
            boxShadow: "0 4px 20px rgba(255, 215, 0, 0.2)"
          }
        });
      }, index * 1000); // 1 second delay between notifications
    });
  }, []);

  const connect = useCallback(() => {
    if (!userId || wsRef.current?.readyState === WebSocket.OPEN) return;

    const ws = new WebSocket(`ws://127.0.0.1:8000/matchmaking/ws/matchmaking/${userId}`);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('🔌 WebSocket connected');
      setIsConnected(true);
      setError(null);
    };

    ws.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);
        console.log('📨 Received:', message);

        switch (message.type) {
          case 'queue_joined':
            setIsInQueue(true);
            setQueueStatus(null); // Reset queue status
            break;

          case 'queue_left':
            setIsInQueue(false);
            setQueueStatus(null); // Clear queue status
            break;

          case 'queue_status':
            if (message.queue_size !== undefined) {
              setQueueStatus({
                queueSize: message.queue_size,
                waitTime: message.wait_time || 0,
                eloRange: message.elo_range || 100,
                potentialMatches: message.potential_matches || 0,
                message: message.message || 'Searching...'
              });
            }
            break;

          case 'match_retry':
            // Show notification about match retry
            notifications.show({
              title: 'Retrying Match',
              message: message.message || 'Retrying with broader criteria...',
              color: 'yellow',
              autoClose: 3000,
            });
            break;

          case 'match_error':
            // Show notification about match error
            notifications.show({
              title: 'Match Error',
              message: message.message || 'Match creation error, continuing search...',
              color: 'red',
              autoClose: 3000,
            });
            break;

          case 'match_found':
            console.log('🎉 Match found!', message);
            setIsInQueue(false);
            setMatchData({
              match_id: message.match_id!,
              problem: message.problem,
              opponent: message.opponent!
            });
            setMatchFound(true);
            // Reset timer states for new match
            setTimerPhase(null);
            setCountdown(3);
            setMatchSeconds(0);
            setFormattedTime("00:00");
            setStartTimestamp(null);
            break;

          case 'timer_update':
            if (message.phase === 'countdown') {
              setTimerPhase('countdown');
              setCountdown(message.countdown || 3);
            } else if (message.phase === 'start') {
              setTimerPhase('start');
            } else if (message.phase === 'active') {
              setTimerPhase('active');
              setStartTimestamp(message.start_timestamp || Date.now() / 1000);
            }
            break;

          case 'match_completed':
            console.log('🏁 Match completed:', message.result);
            
            // Display achievement notifications if any were unlocked
            if (message.achievements_unlocked && message.achievements_unlocked.length > 0) {
              console.log('🏆 Achievements unlocked:', message.achievements_unlocked);
              displayAchievementNotifications(message.achievements_unlocked);
            }
            
            // Notify parent that match is completed (but keep state for UI)
            if (onMatchCompleted) {
              onMatchCompleted();
            }
            
            // Redirect to results page after delay (longer if achievements were unlocked)
            const redirectDelay = message.achievements_unlocked && message.achievements_unlocked.length > 0 
              ? 3000 + (message.achievements_unlocked.length * 1000) // Extra time for achievement notifications
              : 2000;
            
            setTimeout(() => {
              router.push(`/match-result/${message.match_id}`);
            }, redirectDelay);
            break;

          case 'error':
            setError(message.message || 'Unknown error');
            break;

          case 'submission_invalid':
            // Handle invalid submission - show error but don't end match
            setError(message.message || 'Invalid submission');
            // Clear error after 5 seconds
            setTimeout(() => setError(null), 5000);
            break;

          case 'pong':
            // Heartbeat response
            break;

          default:
            console.log('Unknown message type:', message.type);
        }
      } catch (err) {
        console.error('Failed to parse WebSocket message:', err);
      }
    };

    ws.onclose = (event) => {
      console.log('🔌 WebSocket disconnected:', event.code, event.reason);
      setIsConnected(false);
      setIsInQueue(false);
      
      // Attempt to reconnect after delay (unless intentionally closed)
      if (event.code !== 1000 && userId) {
        setTimeout(() => {
          connect();
        }, 3000);
      }
    };

    ws.onerror = (error) => {
      console.error('❌ WebSocket error:', error);
      setError('Connection error');
    };

  }, [userId, router, displayAchievementNotifications]);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close(1000, 'User disconnected');
      wsRef.current = null;
    }
    setIsConnected(false);
    setIsInQueue(false);
  }, []);

  const sendMessage = useCallback((message: unknown) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.error('WebSocket not connected');
    }
  }, []);

  const joinQueue = useCallback(() => {
    sendMessage({ type: 'join_queue' });
  }, [sendMessage]);

  const leaveQueue = useCallback(() => {
    sendMessage({ type: 'leave_queue' });
  }, [sendMessage]);

  const submitSolution = useCallback((matchId: number) => {
    sendMessage({ 
      type: 'submit_solution', 
      match_id: matchId,
      frontend_seconds: matchSeconds  // Send current frontend timer value
    });
  }, [sendMessage, matchSeconds]);

  const resignMatch = useCallback((matchId: number) => {
    sendMessage({ 
      type: 'resign_match', 
      match_id: matchId,
      frontend_seconds: matchSeconds  // Send current frontend timer value
    });
  }, [sendMessage, matchSeconds]);

  // Connect on mount, disconnect on unmount
  useEffect(() => {
    if (userId) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [userId, connect, disconnect]);

  // Heartbeat to keep connection alive
  useEffect(() => {
    if (!isConnected) return;

    const interval = setInterval(() => {
      sendMessage({ type: 'ping' });
    }, 30000); // Ping every 30 seconds

    return () => clearInterval(interval);
  }, [isConnected, sendMessage]);

  // Local timer calculation based on server start timestamp
  useEffect(() => {
    if (timerPhase === 'active' && startTimestamp) {
      const interval = setInterval(() => {
        const currentTime = Date.now() / 1000;
        const elapsed = Math.floor(currentTime - startTimestamp);
        const minutes = Math.floor(elapsed / 60);
        const seconds = elapsed % 60;
        
        setMatchSeconds(elapsed);
        setFormattedTime(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
      }, 100); // Update every 100ms for smooth display

      return () => clearInterval(interval);
    }
  }, [timerPhase, startTimestamp]);

  return {
    isConnected,
    isInQueue,
    matchFound,
    matchData,
    error,
    joinQueue,
    leaveQueue,
    submitSolution,
    resignMatch,
    connect,
    disconnect,
    // Timer states
    timerPhase,
    countdown,
    matchSeconds,
    formattedTime,
    // Queue status
    queueStatus
  };
};