import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useStore } from '../store/useStore';
import { motion } from 'framer-motion';
import logo from '../assets/yummyd_logo_full.png';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const setUser = useStore((state) => state.setUser);
  const [formData, setFormData] = useState({ login_id: '', password: '' });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const isPasswordValid = formData.password.length >= 6;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isPasswordValid) return;
    try {
      // login_type을 명시적으로 포함하여 전송 (기본값 user)
      const res = await axios.post('/api/auth/login', {
        ...formData,
        login_type: 'user' 
      });
      if (res.data.success) {
        setUser(res.data.user);
        localStorage.setItem('yummy_token', res.data.token);
        navigate('/');
      }
    } catch (err: any) {
      alert(err.response?.data?.message || '로그인 실패');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-bg px-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white rounded-[3rem] shadow-2xl p-12 text-center border-2 border-brand-surface"
      >
        <div className="mb-8 flex justify-center">
          <img src={logo} alt="Yummy Logo" className="h-16 object-contain" />
        </div>
        <h1 className="text-3xl font-black text-brand-primary mb-2 tracking-tighter text-center w-full block">Yummy</h1>
        <p className="text-brand-primary/40 font-bold mb-10">오늘 당신의 마음은 어떤 맛인가요?</p>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <input 
            name="login_id" 
            placeholder="아이디" 
            required 
            onChange={handleChange} 
            className="w-full px-6 py-4 bg-brand-surface rounded-2xl border-none outline-none focus:ring-2 ring-brand-primary/20 font-bold text-brand-primary transition-all"
          />
          <input 
            name="password" 
            type="password" 
            placeholder="비밀번호 (6자 이상)" 
            required 
            onChange={handleChange} 
            className="w-full px-6 py-4 bg-brand-surface rounded-2xl border-none outline-none focus:ring-2 ring-brand-primary/20 font-bold text-brand-primary transition-all"
          />
          <button 
            type="submit" 
            disabled={!isPasswordValid}
            className={`w-full py-5 rounded-2xl font-black text-lg shadow-xl transition-all duration-300 ${
              isPasswordValid 
                ? 'bg-brand-primary text-white scale-100 opacity-100 hover:scale-[1.02]' 
                : 'bg-brand-primary/30 text-white/50 cursor-not-allowed'
            }`}
          >
            로그인
          </button>
        </form>
        
        <div className="mt-8">
          <button 
            onClick={() => navigate('/register')} 
            className="text-brand-primary/40 font-bold hover:text-brand-primary transition-colors text-sm underline underline-offset-4"
          >
            아직 회원이 아니신가요? 회원가입
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
