import { create } from 'zustand';
import axios from 'axios';

interface User {
  id: number;
  username: string;
  role: 'student' | 'admin' | 'instructor';
  login_id?: string;
  institution_id?: number;
  class_id?: number;
  current_candy_count?: number;
  total_candy_count?: number;
  attendance_days?: number;
  streak?: number;
  last_login_at?: string;
}

interface CandyPost {
  id: number;
  userId: number;
  text: string;
  likes: number;
  likedBy: number[];
  timestamp: string;
  date: string;
  color: 'mint' | 'pink' | 'yellow';
}

interface CollectionItem {
  id: number;
  user_id: number;
  collection_id: number;
  is_equipped: boolean;

  Collection: {
    id: number;
    name: string;
    grade: string;
    item_type: string;
    image_url: string | null;
    video_url: string | null;
  };
}

interface YummyState {
  user: User | null;
  emotions: any[];
  collection: CollectionItem[];
  streakDays: number;
  totalReflectionCount: number;
  classMood: { 
    message: string; 
    description: string;
    dominantEmotion: 'mint' | 'pink' | 'yellow';
  };
  candyPosts: CandyPost[];
  isAnalyzing: boolean;
  analysisResult: { summary: string; dominantEmotion: string } | null;
  setUser: (user: User | null) => void;
  setAnalyzing: (val: boolean) => void;
  setAnalysisResult: (res: { summary: string; dominantEmotion: string } | null) => void;
  addEmotion: (color: string) => void;
  logout: () => void;
  fetchHistory: () => Promise<void>;
  fetchMe: () => Promise<void>;
  fetchBoard: () => Promise<void>;
  fetchCollection: () => Promise<void>;
  drawItem: () => Promise<{ success: boolean; item?: any; message?: string }>;
  toggleEquip: (itemId: number) => Promise<void>;
  addCandyPost: (text: string) => { success: boolean; message: string };
  deleteCandyPost: (id: number) => void;
  editCandyPost: (id: number, newText: string) => void;
  likeCandyPost: (id: number) => void;
}

export const useStore = create<YummyState>((set, get) => ({
  user: null,
  emotions: [],
  collection: [],
  streakDays: 0,
  totalReflectionCount: 0,
  classMood: { 
    message: "모두의 마음이 모이고 있어요.",
    description: "오늘 우리 반의 감정 사탕은 상큼한 민트색이네요.",
    dominantEmotion: 'mint'
  },
  candyPosts: [],
  isAnalyzing: false,
  analysisResult: null,
  
  setUser: (user) => set({ user }),
  setAnalyzing: (val) => set({ isAnalyzing: val }),
  setAnalysisResult: (res) => {
    set({ analysisResult: res, isAnalyzing: false }); // 결과가 설정되면 로딩 종료
  },

  fetchCollection: async () => {
    const { user } = get();
    if (!user) return;
    try {
      const res = await axios.get(`/api/collection/${user.id}`);
      if (res.data.success) {
        set({ collection: res.data.data });
      }
    } catch (err) {
      console.error('Failed to fetch collection:', err);
    }
  },

  updateReflection: async (id: number, data: any) => {
    try {
      const res = await axios.put(`/api/update/${id}`, data);
      if (res.data.success) {
        await get().fetchHistory(); // 기록 갱신
        return { success: true };
      }
      return { success: false, message: res.data.message };
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  },

  drawItem: async () => {
    const { user } = get();
    if (!user) return { success: false, message: "로그인이 필요합니다." };
    try {
      // [무료화 반영] 캔디 체크 없이 즉시 호출
      const res = await axios.post('/api/collection/draw', { userId: user.id });
      if (res.data.success) {
        await get().fetchMe();
        await get().fetchCollection();
        return { success: true, item: res.data.item };
      }
      return { success: false, message: res.data.message };
    } catch (err: any) {
      return { success: false, message: err.response?.data?.message || "오류가 발생했습니다." };
    }
  },

  toggleEquip: async (itemId) => {
    const { user } = get();
    if (!user) return;
    try {
      await axios.post('/api/collection/toggle-equip', { userId: user.id, itemId });
      await get().fetchCollection();
    } catch (err) {
      console.error('Failed to toggle equip:', err);
    }
  },
  
  addEmotion: (color) => set((state) => ({ 
    totalReflectionCount: state.totalReflectionCount + 1
  })),
  
  logout: () => {
    localStorage.removeItem('yummy_token');
    set({ user: null, emotions: [], streakDays: 0, candyPosts: [] });
  },

  fetchHistory: async () => {
    const { user } = get();
    if (!user) return;
    try {
      const res = await axios.get(`/api/history/${user.id}`);
      if (res.data.success) {
        const history = Array.isArray(res.data.data) ? res.data.data : [];
        set({ 
          emotions: history, 
          totalReflectionCount: user.total_candy_count || history.length,
          streakDays: user.streak || 0 
        });
      }
    } catch (err) {
      console.error('Failed to fetch history:', err);
    }
  },

  fetchMe: async () => {
    const token = localStorage.getItem('yummy_token');
    if (!token) return;
    try {
      const res = await axios.get('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        set({ user: res.data.user });
      }
    } catch (err) {
      console.error('Failed to fetch user info:', err);
    }
  },

  fetchBoard: async () => {
    try {
      const res = await axios.get('/api/board');
      if (res.data.success) {
        set({ classMood: res.data.summary });
        if (get().candyPosts.length === 0) {
            set({ candyPosts: [
                { id: 1, userId: 0, text: "오늘 하루도 다들 고생 많았어요! 화이팅!", likes: 5, likedBy: [], timestamp: "오전 10:20", date: "2026-03-28", color: 'mint' },
                { id: 2, userId: 0, text: "내일 시험 잘 봅시다 ㅠㅠ", likes: 2, likedBy: [], timestamp: "오전 11:45", date: "2026-03-28", color: 'pink' }
            ]});
        }
      }
    } catch (err) {
      console.error('Failed to fetch board:', err);
    }
  },

  addCandyPost: (text) => {
    const { user, candyPosts } = get();
    if (!user) return { success: false, message: "로그인이 필요합니다." };
    const today = new Date().toISOString().split('T')[0];
    const alreadyPosted = candyPosts.some(post => post.userId === user.id && post.date === today);
    if (alreadyPosted) return { success: false, message: "블라블라 캔디는 하루에 한 번만 던질 수 있어요!" };

    const colors: ('mint' | 'pink' | 'yellow')[] = ['mint', 'pink', 'yellow'];
    const newPost: CandyPost = {
      id: Date.now(),
      userId: user.id,
      text,
      likes: 0,
      likedBy: [],
      timestamp: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
      date: today,
      color: colors[Math.floor(Math.random() * colors.length)]
    };
    set((state) => ({ candyPosts: [newPost, ...state.candyPosts] }));
    return { success: true, message: "성공!" };
  },

  deleteCandyPost: (id) => set((state) => ({ candyPosts: state.candyPosts.filter(p => p.id !== id) })),
  editCandyPost: (id, newText) => set((state) => ({ 
    candyPosts: state.candyPosts.map(p => p.id === id ? { ...p, text: newText } : p) 
  })),
  likeCandyPost: (id) => {
    const { user } = get();
    if (!user) return;
    set((state) => ({
      candyPosts: state.candyPosts.map(p => {
        if (p.id === id) {
          const isLiked = p.likedBy.includes(user.id);
          const newLikedBy = isLiked ? p.likedBy.filter(uid => uid !== user.id) : [...p.likedBy, user.id];
          return { ...p, likedBy: newLikedBy, likes: newLikedBy.length };
        }
        return p;
      })
    }));
  }
}));
