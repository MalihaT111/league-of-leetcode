const BASE_URL = "http://127.0.0.1:8000";

export async function searchUsers(userId, query) {
  const response = await fetch(`${BASE_URL}/api/friends/${userId}/search?query=${encodeURIComponent(query)}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });
  if (!response.ok) throw new Error("Failed to search users");
  return await response.json();
}

export async function sendFriendRequest(userId, targetUserId) {
  const response = await fetch(`${BASE_URL}/api/friends/${userId}/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ target_user_id: targetUserId }),
  });
  if (!response.ok) throw new Error("Failed to send friend request");
  return await response.json();
}

export async function getFriendsList(userId) {
  const response = await fetch(`${BASE_URL}/api/friends/${userId}/list`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });
  if (!response.ok) throw new Error("Failed to get friends list");
  return await response.json();
}

export async function getFriendRequests(userId) {
  const response = await fetch(`${BASE_URL}/api/friends/${userId}/requests`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });
  if (!response.ok) throw new Error("Failed to get friend requests");
  return await response.json();
}

export async function acceptFriendRequest(userId, requesterId) {
  const response = await fetch(`${BASE_URL}/api/friends/${userId}/accept/${requesterId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  if (!response.ok) throw new Error("Failed to accept friend request");
  return await response.json();
}

export async function declineFriendRequest(userId, requesterId) {
  const response = await fetch(`${BASE_URL}/api/friends/${userId}/decline/${requesterId}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
  });
  if (!response.ok) throw new Error("Failed to decline friend request");
  return await response.json();
}

export async function cancelFriendRequest(userId, targetId) {
  const response = await fetch(`${BASE_URL}/api/friends/${userId}/cancel/${targetId}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
  });
  if (!response.ok) throw new Error("Failed to cancel friend request");
  return await response.json();
}

export async function removeFriend(userId, friendId) {
  const response = await fetch(`${BASE_URL}/api/friends/${userId}/remove/${friendId}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
  });
  if (!response.ok) throw new Error("Failed to remove friend");
  return await response.json();
}

// Match request functions
export async function sendMatchRequest(userId, friendId) {
  const response = await fetch(`${BASE_URL}/api/friends/${userId}/match-request/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ target_user_id: friendId }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to send match request");
  }
  return await response.json();
}

export async function acceptMatchRequest(requestId, userId) {
  const response = await fetch(`${BASE_URL}/api/friends/match-request/${requestId}/accept?user_id=${userId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to accept match request");
  }
  return await response.json();
}

export async function rejectMatchRequest(requestId, userId) {
  const response = await fetch(`${BASE_URL}/api/friends/match-request/${requestId}/reject?user_id=${userId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to reject match request");
  }
  return await response.json();
}

export async function cancelMatchRequest(requestId, userId) {
  const response = await fetch(`${BASE_URL}/api/friends/match-request/${requestId}/cancel?user_id=${userId}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to cancel match request");
  }
  return await response.json();
}

export async function getPendingMatchRequests(userId) {
  const response = await fetch(`${BASE_URL}/api/friends/${userId}/match-requests/pending`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });
  if (!response.ok) throw new Error("Failed to get pending match requests");
  return await response.json();
}

export async function getMatchState(userId) {
  const response = await fetch(`${BASE_URL}/api/friends/${userId}/match-state`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });
  if (!response.ok) throw new Error("Failed to get match state");
  return await response.json();
}
