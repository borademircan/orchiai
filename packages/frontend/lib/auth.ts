/**
 * Authentication Store
 * Global auth state management using Zustand
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface User {
    id: string;
    email: string;
    role: 'admin' | 'user';
    createdAt?: string;
}

interface AuthState {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;

    // Actions
    login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
    logout: () => void;
    setUser: (user: User, token: string) => void;
    checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: true,

            login: async (email: string, password: string) => {
                try {
                    const response = await fetch(`${getApiBaseUrl()}/api/v1/auth/login`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email, password }),
                    });

                    const data = await response.json();

                    if (!response.ok || !data.success) {
                        return {
                            success: false,
                            error: data.error?.message || 'Login failed',
                        };
                    }

                    const { token, user } = data.data;
                    set({
                        user,
                        token,
                        isAuthenticated: true,
                        isLoading: false,
                    });

                    return { success: true };
                } catch (error: any) {
                    return {
                        success: false,
                        error: error.message || 'Network error',
                    };
                }
            },

            logout: () => {
                set({
                    user: null,
                    token: null,
                    isAuthenticated: false,
                    isLoading: false,
                });
            },

            setUser: (user: User, token: string) => {
                set({
                    user,
                    token,
                    isAuthenticated: true,
                    isLoading: false,
                });
            },

            checkAuth: async () => {
                const { token } = get();

                if (!token) {
                    set({ isLoading: false, isAuthenticated: false });
                    return;
                }

                try {
                    const response = await fetch(`${getApiBaseUrl()}/api/v1/auth/me`, {
                        headers: {
                            'Authorization': `Bearer ${token}`,
                        },
                    });

                    const data = await response.json();

                    if (!response.ok || !data.success || !data.data) {
                        // Token is invalid, clear auth state
                        get().logout();
                        return;
                    }

                    set({
                        user: data.data,
                        isAuthenticated: true,
                        isLoading: false,
                    });
                } catch (error) {
                    // Network error, keep existing state but mark as not loading
                    set({ isLoading: false });
                }
            },
        }),
        {
            name: 'auth-storage',
            partialize: (state) => ({
                token: state.token,
                user: state.user,
            }),
        }
    )
);

// Helper to get API base URL
function getApiBaseUrl(): string {
    if (typeof window !== 'undefined') {
        const hostname = window.location.hostname;
        const protocol = window.location.protocol;

        if (hostname === 'orchiai.com' || hostname === 'www.orchiai.com') {
            return `${protocol}//${hostname}`;
        }

        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            return 'http://localhost:3001';
        }

        return `http://${hostname}:3001`;
    }

    return 'http://localhost:3001';
}
