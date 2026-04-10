import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import Cookies from 'js-cookie';
import type { User, CartSummary } from '@/types';

// ─── Auth Store ───────────────────────────────────────────────────────────────
interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, accessToken: string, refreshToken: string) => void;
  logout: () => void;
  updateUser: (user: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,

      setAuth: (user, accessToken, refreshToken) => {
        Cookies.set('accessToken', accessToken, { expires: 1 });
        Cookies.set('refreshToken', refreshToken, { expires: 7 });
        set({ user, accessToken, refreshToken, isAuthenticated: true });
      },

      logout: () => {
        Cookies.remove('accessToken');
        Cookies.remove('refreshToken');
        set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false });
      },

      updateUser: (userData) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...userData } : null,
        })),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

// ─── Cart Store ───────────────────────────────────────────────────────────────
interface CartState {
  cart: CartSummary | null;
  cartCount: number;
  setCart: (cart: CartSummary) => void;
  setCartCount: (count: number) => void;
  clearCart: () => void;
}

export const useCartStore = create<CartState>()((set) => ({
  cart: null,
  cartCount: 0,
  setCart: (cart) => set({ cart, cartCount: cart.totalItems }),
  setCartCount: (count) => set({ cartCount: count }),
  clearCart: () => set({ cart: null, cartCount: 0 }),
}));
