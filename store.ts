import { create } from 'zustand';
import { User, ViewState, LeaderboardEntry } from './types';

interface AppState {
  currentUser: User | null;
  currentView: ViewState;
  isMenuOpen: boolean;
  leaderboard: LeaderboardEntry[];
  
  // Actions
  setView: (view: ViewState) => void;
  toggleMenu: () => void;
  login: () => Promise<void>;
  logout: () => void;
  consumeHeart: () => boolean;
  addHeart: (amount: number) => void;
  updateBestTime: (time: number) => void;
  fetchLeaderboard: () => void;
}

const MOCK_USER: User = {
  id: 'user_123',
  nickname: 'LovelyJimin_99',
  avatarUrl: 'https://picsum.photos/100/100',
  hearts: 3,
  bestTime: null,
  country: 'KR',
  role: 'USER',
};

const MOCK_LEADERBOARD: LeaderboardEntry[] = [
  { id: '1', rank: 1, nickname: 'GoldenMaknae', country: 'KR', time: 24500 },
  { id: '2', rank: 2, nickname: 'BTS_Army_USA', country: 'US', time: 26100 },
  { id: '3', rank: 3, nickname: 'TaeTaeBear', country: 'JP', time: 28300 },
  { id: '4', rank: 4, nickname: 'HobiWorld', country: 'BR', time: 29900 },
  { id: '5', rank: 5, nickname: 'ChimChim', country: 'FR', time: 31200 },
  { id: '6', rank: 6, nickname: 'AgustD_93', country: 'DE', time: 32500 },
  { id: '7', rank: 7, nickname: 'WorldwideHandsome', country: 'PH', time: 33100 },
  { id: '8', rank: 8, nickname: 'Kookie_Luv', country: 'ID', time: 34800 },
  { id: '9', rank: 9, nickname: 'PurpleHeart', country: 'TH', time: 35200 },
  { id: '10', rank: 10, nickname: 'Monie', country: 'UK', time: 36000 },
];

export const useStore = create<AppState>((set, get) => ({
  currentUser: null,
  currentView: 'HOME',
  isMenuOpen: false,
  leaderboard: [],

  setView: (view) => set({ currentView: view }),
  
  toggleMenu: () => set((state) => ({ isMenuOpen: !state.isMenuOpen })),

  login: async () => {
    // Simulate API call
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        set({ currentUser: MOCK_USER });
        resolve();
      }, 800);
    });
  },

  logout: () => set({ currentUser: null, currentView: 'HOME' }),

  consumeHeart: () => {
    const { currentUser } = get();
    if (!currentUser || currentUser.hearts <= 0) return false;
    
    set({
      currentUser: {
        ...currentUser,
        hearts: currentUser.hearts - 1
      }
    });
    return true;
  },

  addHeart: (amount) => {
    const { currentUser } = get();
    if (!currentUser) return;
    set({
      currentUser: {
        ...currentUser,
        hearts: Math.min(currentUser.hearts + amount, 5) // Max 5 hearts mock cap
      }
    });
  },

  updateBestTime: (time) => {
    const { currentUser } = get();
    if (!currentUser) return;
    
    if (!currentUser.bestTime || time < currentUser.bestTime) {
        set({
            currentUser: {
                ...currentUser,
                bestTime: time
            }
        });
    }
  },

  fetchLeaderboard: () => {
    // Mock fetch
    set({ leaderboard: MOCK_LEADERBOARD });
  }
}));