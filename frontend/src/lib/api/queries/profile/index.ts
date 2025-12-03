import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AuthService } from "@/utils/auth";

export const useProfileQuery = (userId: number) => {
  return useQuery({
    queryKey: ["profile", userId],
    queryFn: async () => {
      const res = await fetch(`http://127.0.0.1:8000/api/profile/${userId}`);
      if (!res.ok) throw new Error("Failed to fetch profile stats");
      return res.json();
    },
  });
};

export const useUploadProfilePicture = (userId?: number) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      
      // Use AuthService.authenticatedFetch for proper Bearer token authentication
      const res = await AuthService.authenticatedFetch("/api/profile/picture/upload", {
        method: "POST",
        body: formData,
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.detail || "Failed to upload profile picture");
      }
      
      return res.json();
    },
    onSuccess: () => {
      // Add a small delay to ensure database update completes
      setTimeout(() => {
        // Invalidate all profile queries
        queryClient.invalidateQueries({ queryKey: ["profile"] });
        
        // If we have a specific userId, also invalidate that specific query
        if (userId) {
          queryClient.invalidateQueries({ queryKey: ["profile", userId] });
        }
        
        // Force a refetch by removing the query from cache
        queryClient.removeQueries({ queryKey: ["profile"] });
      }, 500); // 500ms delay
    },
  });
};
