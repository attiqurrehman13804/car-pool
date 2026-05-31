import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from '../types';
import { setAuthToken, fetchMe } from '../services/api';
import { connectSocket, disconnectSocket } from '../services/socket';

const TOKEN_KEY = '@carpool/access_token';
const USER_KEY = '@carpool/user';

interface AuthState {
  accessToken: string | null;
  user: User | null;
  isHydrated: boolean;
  setSession: (token: string, user: User) => Promise<void>;
  clearSession: () => Promise<void>;
  hydrate: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  user: null,
  isHydrated: false,

  setSession: async (token, user) => {
    await AsyncStorage.multiSet([
      [TOKEN_KEY, token],
      [USER_KEY, JSON.stringify(user)],
    ]);
    setAuthToken(token);
    connectSocket(token);
    set({ accessToken: token, user });
  },

  clearSession: async () => {
    await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
    setAuthToken(null);
    disconnectSocket();
    set({ accessToken: null, user: null });
  },

  hydrate: async () => {
    try {
      const [[, token], [, userJson]] = await AsyncStorage.multiGet([TOKEN_KEY, USER_KEY]);
      if (token) {
        setAuthToken(token);
        connectSocket(token);
        let user: User | null = null;
        if (userJson) {
          user = JSON.parse(userJson) as User;
        }
        try {
          const me = await fetchMe();
          user = {
            id: me.id,
            email: me.email,
            full_name: me.full_name,
            phone: me.phone,
            profile_photo_url: me.profile_photo_url,
            is_admin: me.is_admin,
            default_role: me.default_role,
          };
          await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
        } catch {
          if (!user) {
            await AsyncStorage.removeItem(TOKEN_KEY);
            setAuthToken(null);
            disconnectSocket();
            set({ isHydrated: true });
            return;
          }
        }
        set({ accessToken: token, user, isHydrated: true });
      } else {
        set({ isHydrated: true });
      }
    } catch {
      set({ isHydrated: true });
    }
  },
}));

export function useIsAuthenticated(): boolean {
  return useAuthStore(s => !!s.accessToken);
}
