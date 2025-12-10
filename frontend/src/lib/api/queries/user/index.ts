import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AuthService, User } from "@/utils/auth";

export const useCurrentUserQuery = () => {
  return useQuery({
    queryKey: ["currentUser"],
    queryFn: async (): Promise<User> => {
      return AuthService.getCurrentUser();
    },
    enabled: AuthService.isAuthenticated(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: (failureCount, error) => {
      // Don't retry if it's an authentication error
      if (error instanceof Error && error.message.includes("Authentication expired")) {
        return false;
      }
      return failureCount < 3;
    },
  });
};

export const useInvalidateCurrentUser = () => {
  const queryClient = useQueryClient();
  
  return () => {
    queryClient.invalidateQueries({ queryKey: ["currentUser"] });
  };
};