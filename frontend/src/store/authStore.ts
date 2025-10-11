import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, LoginCredentials, RegisterData } from '@/types';
import { apiService } from '@/services/api';
import toast from 'react-hot-toast';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  
  // Actions
  login: (credentials: LoginCredentials) => Promise<boolean>;
  register: (data: RegisterData) => Promise<boolean>;
  logout: () => Promise<void>;
  loadUser: () => Promise<void>;
  updateUser: (userData: Partial<User>) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (credentials: LoginCredentials) => {
        set({ isLoading: true });
        
        try {
          const response = await apiService.login(credentials);
          
          if (response.success) {
            const { user, accessToken, refreshToken } = response.data;
            
            // Store tokens
            localStorage.setItem('accessToken', accessToken);
            localStorage.setItem('refreshToken', refreshToken);
            
            // Update state
            set({
              user,
              isAuthenticated: true,
              isLoading: false,
            });
            
            // Store user data
            apiService.storeUser(user);
            
            toast.success('Login successful!');
            return true;
          }
          
          return false;
        } catch (error: any) {
          console.error('Login error:', error);
          set({ isLoading: false });
          
          // Error is already handled by API service interceptor
          return false;
        }
      },

      register: async (data: RegisterData) => {
        set({ isLoading: true });
        
        try {
          const response = await apiService.register(data);
          
          if (response.success) {
            const { user, accessToken, refreshToken } = response.data;
            
            // Store tokens
            localStorage.setItem('accessToken', accessToken);
            localStorage.setItem('refreshToken', refreshToken);
            
            // Update state
            set({
              user,
              isAuthenticated: true,
              isLoading: false,
            });
            
            // Store user data
            apiService.storeUser(user);
            
            toast.success('Registration successful!');
            return true;
          }
          
          return false;
        } catch (error: any) {
          console.error('Registration error:', error);
          set({ isLoading: false });
          
          // Error is already handled by API service interceptor
          return false;
        }
      },

      logout: async () => {
        set({ isLoading: true });
        
        try {
          await apiService.logout();
        } catch (error) {
          console.error('Logout error:', error);
        } finally {
          // Clear state and storage
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
          });
          
          apiService.clearStorage();
          toast.success('Logged out successfully');
        }
      },

      loadUser: async () => {
        // Check if we have a token
        const token = localStorage.getItem('accessToken');
        if (!token) {
          set({ isAuthenticated: false, user: null, isLoading: false });
          return;
        }

        set({ isLoading: true });
        
        try {
          // Add timeout to prevent hanging on network issues
          const response = await Promise.race([
            apiService.getProfile(),
            new Promise<never>((_, reject) => 
              setTimeout(() => reject(new Error('Profile fetch timeout')), 5000)
            )
          ]);
          
          if (response.success) {
            const { user } = response.data;
            
            set({
              user,
              isAuthenticated: true,
              isLoading: false,
            });
            
            // Update stored user data
            apiService.storeUser(user);
          } else {
            // Invalid token, clear auth silently
            console.warn('Invalid token, clearing auth');
            get().clearAuth();
          }
        } catch (error: any) {
          console.warn('Load user failed, clearing auth:', error.message);
          
          // Clear auth silently on network errors
          // Don't show error to user during initialization
          get().clearAuth();
        }
      },

      updateUser: (userData: Partial<User>) => {
        const currentUser = get().user;
        if (currentUser) {
          const updatedUser = { ...currentUser, ...userData };
          set({ user: updatedUser });
          apiService.storeUser(updatedUser);
        }
      },

      clearAuth: () => {
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
        });
        apiService.clearStorage();
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

// Initialize auth state on app load
export const initializeAuth = async () => {
  const { loadUser } = useAuthStore.getState();
  
  try {
    // Add timeout to prevent hanging
    await Promise.race([
      loadUser(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Auth initialization timeout')), 10000)
      )
    ]);
  } catch (error) {
    console.error('Auth initialization failed:', error);
    // Ensure we're not stuck in loading state
    useAuthStore.getState().clearAuth();
  }
};
