import { useEffect, useState, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import Home from './pages/Home';
import Jar from './pages/Jar';
import Reflection from './pages/Reflection';
import StBoard from './pages/StBoard';
import InBoard from './pages/InBoard';
import Login from './pages/Login';
import Register from './pages/Register';
import Settings from './pages/Settings';
import Navbar from './components/Navbar';
import Intro from './components/Intro';
import { useStore } from './store/useStore';
import { io } from 'socket.io-client'; // 🔌 소켓 클라이언트 추가
import './App.css';

// 🔌 소켓 인스턴스 (프록시 설정을 통해 백엔드와 연결)
const socket = io('/', { path: '/socket.io' }); 

function App() {
  const user = useStore((state) => state.user);
  const setUser = useStore((state) => state.setUser);
  const logout = useStore((state) => state.logout);
  const setAnalyzing = useStore((state) => state.setAnalyzing);
  const setAnalysisResult = useStore((state) => state.setAnalysisResult);
  const fetchMe = useStore((state) => state.fetchMe);
  
  const [loading, setLoading] = useState(true);
  const [showIntro, setShowIntro] = useState(true);

  // 🔌 소켓 이벤트 핸들링
  useEffect(() => {
    if (user) {
      socket.emit('join', { userId: user.id, classId: user.class_id ?? null });

      socket.on('analysis_started', () => {
        setAnalyzing(true);
      });

      socket.on('analysis_completed', (data) => {
        setAnalyzing(false);
        setAnalysisResult({
          summary: data.summary,
          dominantEmotion: data.dominantEmotion
        });
        fetchMe(); // 캔디 카운트 갱신
        console.log("AI 분석 완료:", data);
      });

      socket.on('analysis_failed', (data) => {
        setAnalyzing(false);
        alert(data.error);
      });
    }

    return () => {
      socket.off('analysis_started');
      socket.off('analysis_completed');
      socket.off('analysis_failed');
    };
  }, [user, setAnalyzing, setAnalysisResult, fetchMe]);

  const restoreSession = useCallback(async () => {
    const token = localStorage.getItem('yummy_token');
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const res = await axios.get('/api/auth/me');
      if (res.data.success) {
        setUser(res.data.user);
      } else {
        logout();
      }
    } catch (err) {
      logout();
    } finally {
      setLoading(false);
    }
  }, [setUser, logout]);

  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  const handleIntroComplete = () => {
    setShowIntro(false);
  };

  // 인트로 애니메이션을 최우선으로 보여줌
  if (showIntro) {
    return <Intro onComplete={handleIntroComplete} />;
  }

  // 세션 복구 대기 (인트로 종료 후)
  if (loading) return null;

  return (
    <Router>
      <div className="App pt-20">
        <Navbar />
        <Routes>
          <Route path="/login" element={!user ? <Login /> : <Navigate to="/" replace />} />
          <Route path="/register" element={!user ? <Register /> : <Navigate to="/" replace />} />
          
          <Route path="/" element={user ? <Home /> : <Navigate to="/login" replace />} />
          <Route path="/jar" element={user?.role === 'student' ? <Jar /> : <Navigate to="/" replace />} />
          <Route path="/reflection" element={user?.role === 'student' ? <Reflection /> : <Navigate to="/" replace />} />
          <Route path="/board" element={user ? <StBoard /> : <Navigate to="/login" replace />} />
          <Route path="/settings" element={user ? <Settings /> : <Navigate to="/login" replace />} />
          
          <Route path="/inboard" element={(user as any)?.role === 'institution' || user?.role === 'instructor' ? <InBoard /> : <Navigate to="/" replace />} />
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
