/**
 * useAdmin.ts
 *
 * Secure hook to determine whether the authenticated user has verified administrator privileges.
 * Admin status is strictly based on the backend role from Supabase Auth & profiles table (role === 'admin').
 * While authentication is loading, isAdmin is strictly false to prevent UI flashing.
 */

import { useAuthStore } from '@/store/authStore';

export function useAdmin() {
  const { user, isLoading: authLoading } = useAuthStore();

  // Admin access strictly requires an authenticated user with role === 'admin'
  const isAdmin = !authLoading && Boolean(user && user.role === 'admin');
  const isCreator = !authLoading && Boolean(user && (user.role === 'admin' || user.role === 'creator'));

  return {
    isAdmin,
    isCreator,
    authLoading,
    user,
    role: user?.role || 'user',
  };
}
