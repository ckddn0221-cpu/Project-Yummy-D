import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';
import logo from '../assets/yummyd_logo_full.png';

const Register: React.FC = () => {
  const navigate = useNavigate();
  const [role, setRole] = useState<'student' | 'institution'>('student');
  const [isIdChecked, setIsIdChecked] = useState(false);
  const [institutions, setInstitutions] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    login_id: '',
    password: '',
    username: '',
    email: '',
    organization_name: '',
    institution_id: '',
    class_id: '',
    cohort_id: '',
    privacy_consent: false,
    third_party_consent: false
  });

  // 기관 목록 로드
  React.useEffect(() => {
    if (role === 'student') {
      axios.get('/api/classes/institutions').then(res => {
        if (res.data.success) setInstitutions(res.data.institutions);
      });
    }
  }, [role]);

  // 선택된 기관의 클래스 목록 로드
  React.useEffect(() => {
    if (formData.institution_id) {
      axios.get(`/api/classes/list?institution_id=${formData.institution_id}`).then(res => {
        if (res.data.success) setClasses(res.data.classes);
      });
    }
  }, [formData.institution_id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    if (name === 'login_id') setIsIdChecked(false);
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const isFormValid = isIdChecked && formData.password.length >= 6 && formData.username && formData.email && formData.privacy_consent && (role === 'institution' ? formData.organization_name : (formData.institution_id && formData.class_id));

  const handleCheckId = async () => {
    if (!formData.login_id) {
      alert('아이디를 입력해 주세요.');
      return;
    }
    try {
      const res = await axios.get(`/api/auth/check-id?login_id=${formData.login_id}`);
      if (res.data.isDuplicate) {
        alert('이미 사용 중인 아이디입니다.');
        setIsIdChecked(false);
      } else {
        alert('사용 가능한 아이디입니다.');
        setIsIdChecked(true);
      }
    } catch (err) {
      alert('중복 확인 중 오류가 발생했습니다.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;
    try {
      const res = await axios.post('/api/auth/register', { ...formData, role });
      if (res.data.success) {
        alert('회원가입 성공! 로그인해 주세요.');
        navigate('/login');
      }
    } catch (err: any) {
      alert(err.response?.data?.message || '회원가입 실패');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-bg px-6 py-12">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }} 
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-xl w-full bg-white rounded-[3rem] shadow-2xl p-12 border-2 border-brand-surface"
      >
        <div className="mb-8 flex justify-center">
          <img src={logo} alt="Yummy Logo" className="h-12 object-contain" />
        </div>
        <h2 className="text-2xl font-black text-brand-primary text-center mb-8 tracking-tight">야미 회원가입</h2>
        
        <div className="flex bg-brand-surface p-1.5 rounded-2xl mb-10">
          <button 
            onClick={() => setRole('student')} 
            className={`flex-1 py-3 rounded-xl font-black text-sm transition-all ${role === 'student' ? 'bg-brand-primary text-white shadow-lg' : 'text-brand-primary/40 hover:text-brand-primary'}`}
          >수강생</button>
          <button 
            onClick={() => setRole('institution')} 
            className={`flex-1 py-3 rounded-xl font-black text-sm transition-all ${role === 'institution' ? 'bg-brand-primary text-white shadow-lg' : 'text-brand-primary/40 hover:text-brand-primary'}`}
          >기관</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex gap-3">
            <input 
              name="login_id" 
              placeholder="아이디" 
              required 
              onChange={handleChange} 
              className="flex-1 px-6 py-4 bg-brand-surface rounded-2xl border-none outline-none focus:ring-2 ring-brand-primary/20 font-bold text-brand-primary transition-all"
            />
            <button 
              type="button" 
              onClick={handleCheckId} 
              className={`px-6 rounded-2xl font-black text-xs transition-all ${isIdChecked ? 'bg-brand-mint text-white' : 'bg-brand-primary/10 text-brand-primary hover:bg-brand-primary/20'}`}
            >
              {isIdChecked ? '확인됨' : '중복확인'}
            </button>
          </div>
          
          <input 
            name="password" 
            type="password" 
            placeholder="비밀번호 (6자 이상)" 
            required 
            onChange={handleChange} 
            className="w-full px-6 py-4 bg-brand-surface rounded-2xl border-none outline-none focus:ring-2 ring-brand-primary/20 font-bold text-brand-primary transition-all"
          />
          <input 
            name="username" 
            placeholder="성함" 
            required 
            onChange={handleChange} 
            className="w-full px-6 py-4 bg-brand-surface rounded-2xl border-none outline-none focus:ring-2 ring-brand-primary/20 font-bold text-brand-primary transition-all"
          />
          <input 
            name="email" 
            type="email" 
            placeholder="이메일 주소" 
            required 
            onChange={handleChange} 
            className="w-full px-6 py-4 bg-brand-surface rounded-2xl border-none outline-none focus:ring-2 ring-brand-primary/20 font-bold text-brand-primary transition-all"
          />
          
          {role === 'institution' ? (
            <input name="organization_name" placeholder="기관명" required onChange={handleChange} className="w-full px-6 py-4 bg-brand-surface rounded-2xl border-none outline-none focus:ring-2 ring-brand-primary/20 font-bold text-brand-primary transition-all" />
          ) : (
            <div className="space-y-4">
              <select 
                name="institution_id" 
                required 
                onChange={handleChange} 
                className="w-full px-6 py-4 bg-brand-surface rounded-2xl border-none outline-none focus:ring-2 ring-brand-primary/20 font-bold text-brand-primary transition-all appearance-none"
              >
                <option value="">기관 선택</option>
                {institutions.length > 0 ? (
                  institutions.map(inst => (
                    <option key={inst.id} value={inst.id}>{inst.inst_name}</option>
                  ))
                ) : (
                  <option disabled>등록된 기관이 없습니다.</option>
                )}
              </select>
              
              <select 
                name="class_id" 
                required 
                disabled={!formData.institution_id || classes.length === 0}
                onChange={handleChange} 
                className="w-full px-6 py-4 bg-brand-surface rounded-2xl border-none outline-none focus:ring-2 ring-brand-primary/20 font-bold text-brand-primary transition-all appearance-none disabled:opacity-50"
              >
                <option value="">그룹(반) 선택</option>
                {classes.length > 0 ? (
                  classes.map(cls => (
                    <option key={cls.id} value={cls.id}>{cls.class_name || cls.name}</option>
                  ))
                ) : (
                  <option disabled>선택 가능한 클래스가 없습니다.</option>
                )}
              </select>
              {role === 'student' && institutions.length === 0 && (
                <p className="text-[10px] text-brand-pink font-bold px-2">※ 가입 가능한 기관이 없습니다. 관리자에게 문의하세요.</p>
              )}
            </div>
          )}

          <div className="py-6 space-y-3">
            <label className="flex items-center gap-3 cursor-pointer group">
              <input type="checkbox" name="privacy_consent" required onChange={handleChange} className="w-5 h-5 accent-brand-primary rounded-lg" />
              <span className="text-sm font-bold text-brand-primary/60 group-hover:text-brand-primary transition-colors"><span className="text-brand-pink">[필수]</span> 개인정보 수집 및 이용 동의</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer group">
              <input type="checkbox" name="third_party_consent" onChange={handleChange} className="w-5 h-5 accent-brand-primary rounded-lg" />
              <span className="text-sm font-bold text-brand-primary/30 group-hover:text-brand-primary transition-colors"><span className="opacity-50">[선택]</span> 제3자 제공 동의</span>
            </label>
          </div>

          <button 
            type="submit" 
            disabled={!isFormValid}
            className={`w-full py-5 rounded-2xl font-black text-lg shadow-xl transition-all duration-300 mt-4 ${
              isFormValid 
                ? 'bg-brand-primary text-white scale-100 opacity-100 hover:scale-[1.02]' 
                : 'bg-brand-primary/30 text-white/50 cursor-not-allowed'
            }`}
          >
            가입하기
          </button>
        </form>
        
        <div className="mt-8 text-center">
          <button 
            onClick={() => navigate('/login')} 
            className="text-brand-primary/40 font-bold hover:text-brand-primary transition-colors text-sm"
          >
            이미 계정이 있으신가요? 로그인
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default Register;
