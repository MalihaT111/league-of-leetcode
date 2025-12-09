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
