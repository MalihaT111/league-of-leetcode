// Authentication utilities for managing JWT tokens and user state

export interface User {
  id: number;
  email: string;
  leetcode_username: string;
  user_elo: number;
  leetcode_hash?: string | null;
  repeating_questions?: string | null;
  difficulty?: string | null;
  topics?: string | null;
  is_active: boolean;
  is_verified: boolean;
  is_superuser: boolean;
  profile_picture_url?: string | null;
}

export interface RegisterData {
  email: string;
  password: string;
  leetcode_username: string;
  user_elo?: number;
  difficulty?: string;
  topics?: string;
  repeating_questions?: string;
}

export interface InitialRegistrationResponse {
  message: string;
  leetcode_hash: string;
  email: string;
}

export interface CompleteRegistrationData {
  email: string;
  leetcode_username: string;
}

export class AuthService {
  private static readonly TOKEN_KEY = "access_token";
  private static readonly API_BASE_URL =
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  // Token management
  static getToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(this.TOKEN_KEY);
  }

  static setToken(token: string): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(this.TOKEN_KEY, token);
  }

  static removeToken(): void {
    if (typeof window === "undefined") return;
    localStorage.removeItem(this.TOKEN_KEY);
  }

  static isAuthenticated(): boolean {
    return this.getToken() !== null;
  }

  // API calls
  static async login(
    email: string,
    password: string,
  ): Promise<{ access_token: string; token_type: string }> {
    const response = await fetch(`${this.API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        username: email, // FastAPI-users expects 'username' field
        password: password,
      }),
    });

    if (!response.ok) {
      let errorMessage = "Login failed";
      try {
        const error = await response.json();
        if (error.detail) {
          errorMessage =
            typeof error.detail === "string"
              ? error.detail
              : "Invalid credentials";
        }
      } catch {
        // Handle cases where response isn't JSON
        if (response.status === 400) {
          errorMessage = "Invalid email or password";
        } else if (response.status === 422) {
          errorMessage = "Please check your email and password format";
        } else {
          errorMessage = response.statusText || errorMessage;
        }
      }
      throw new Error(errorMessage);
    }

    return response.json();
  }

  static async register(registerData: RegisterData): Promise<User> {
    const response = await fetch(`${this.API_BASE_URL}/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: registerData.email,
        password: registerData.password,
        leetcode_username: registerData.leetcode_username || null,
        user_elo: registerData.user_elo || 1200,
        difficulty: registerData.difficulty || null,
        topics: registerData.topics || null,
        repeating_questions: registerData.repeating_questions || null,
      }),
    });

    if (!response.ok) {
      let errorMessage = "Registration failed";
      try {
        const error = await response.json();
        // Handle FastAPI-users validation errors
        if (error.detail) {
          if (Array.isArray(error.detail)) {
            // Validation errors are arrays
            errorMessage = error.detail.map((err: any) => err.msg).join(", ");
          } else if (typeof error.detail === "string") {
            errorMessage = error.detail;
          }
        }
      } catch {
        // If JSON parsing fails, use status text
        errorMessage = response.statusText || errorMessage;
      }
      throw new Error(errorMessage);
    }

    return response.json();
  }

  static async initiateRegistration(
    email: string,
    password: string
  ): Promise<InitialRegistrationResponse> {
    const response = await fetch(`${this.API_BASE_URL}/auth/register/init`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        password,
      }),
    });

    if (!response.ok) {
      let errorMessage = "Registration failed";
      try {
        const error = await response.json();
        if (error.detail) {
          errorMessage =
            typeof error.detail === "string" ? error.detail : "Registration failed";
        }
      } catch {
        errorMessage = response.statusText || errorMessage;
      }
      throw new Error(errorMessage);
    }

    return response.json();
  }

  static async completeRegistration(
    data: CompleteRegistrationData
  ): Promise<{ message: string; user_id: number; email: string; leetcode_username: string }> {
    const response = await fetch(`${this.API_BASE_URL}/auth/register/complete`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      let errorMessage = "Failed to complete registration";
      try {
        const error = await response.json();
        if (error.detail) {
          errorMessage =
            typeof error.detail === "string" ? error.detail : errorMessage;
        }
      } catch {
        errorMessage = response.statusText || errorMessage;
      }
      throw new Error(errorMessage);
    }

    return response.json();
  }

  static async checkRegistrationStatus(
    email: string
  ): Promise<{ status: string; leetcode_hash?: string; email?: string }> {
    const response = await fetch(
      `${this.API_BASE_URL}/auth/register/status/${encodeURIComponent(email)}`
    );

    if (!response.ok) {
      throw new Error("Failed to check registration status");
    }

    return response.json();
  }

  static async getCurrentUser(): Promise<User> {
    const token = this.getToken();
    if (!token) {
      throw new Error("No authentication token");
    }

    const response = await fetch(`${this.API_BASE_URL}/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        this.removeToken(); // Token is invalid
        throw new Error("Authentication expired");
      }
      throw new Error("Failed to fetch user data");
    }

    return response.json();
  }

  static async logout(): Promise<void> {
    const token = this.getToken();
    if (token) {
      try {
        await fetch(`${this.API_BASE_URL}/auth/logout`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
      } catch (error) {
        // Logout endpoint might fail, but we still want to clear local token
        console.warn("Logout request failed:", error);
      }
    }

    this.removeToken();
  }

  // Helper method to make authenticated API calls
  static async authenticatedFetch(
    url: string,
    options: RequestInit = {},
  ): Promise<Response> {
    const token = this.getToken();
    if (!token) {
      throw new Error("No authentication token");
    }

    const headers = {
      ...options.headers,
      Authorization: `Bearer ${token}`,
    };

    const response = await fetch(`${this.API_BASE_URL}${url}`, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      this.removeToken(); // Token is invalid
      throw new Error("Authentication expired");
    }

    return response;
  }

  // Convenience method for login + token storage
  static async loginAndStore(email: string, password: string): Promise<User> {
    const tokenData = await this.login(email, password);
    this.setToken(tokenData.access_token);
    return this.getCurrentUser();
  }
}

// React hook for authentication state (optional, for future use)
export function useAuth() {
  if (typeof window === "undefined") {
    return {
      isAuthenticated: false,
      token: null,
      login: AuthService.login,
      register: AuthService.register,
      logout: AuthService.logout,
      getCurrentUser: AuthService.getCurrentUser,
    };
  }

  const token = AuthService.getToken();
  return {
    isAuthenticated: AuthService.isAuthenticated(),
    token,
    login: AuthService.login,
    register: AuthService.register,
    logout: AuthService.logout,
    getCurrentUser: AuthService.getCurrentUser,
  };
}
