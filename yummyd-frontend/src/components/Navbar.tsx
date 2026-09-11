import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { JarIcon } from '../assets/JarIcon';
import { Home, Users, PenLine, Settings, LogOut } from 'lucide-react';
import logo from '../assets/yummyd_logo_wordmark.png';


const Navbar: React.FC = () => {
  const { user, logout } = useStore();
  const navigate = useNavigate();
  const location = useLocation();

  if (!user) return null;

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-brand-gold/5 backdrop-blur-xl border-b border-brand-surface px-6 py-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          <img src={logo} alt="Yummy Wordmark" className="h-6 object-contain" />
        </Link>

        {/* Desktop Menu */}
        <div className="hidden md:flex items-center gap-15">
          {user.role === 'student' && (
            <>
              <NavLink to="/" icon={<Home size={18} />} label="홈" active={isActive('/')} />
              <NavLink to="/reflection" icon={<PenLine size={18} />} label="기록하기" active={isActive('/reflection')} />
              <NavLink to="/jar" icon={<JarIcon size={18} />} label="유리병" active={isActive('/jar')} />
            </>
          )}
          {(user.role === 'institution' || user.role === 'instructor') && (
            <NavLink to="/inboard" icon={<Settings size={18} />} label="관리자 대시보드" active={isActive('/inboard')} />
          )}
          <NavLink to="/board" icon={<Users size={18} />} label="공감보드" active={isActive('/board')} />
        </div>

        {/* User Actions */}
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/settings')}
            className={`p-2 rounded-xl transition-colors ${isActive('/settings') ? 'bg-brand-primary text-white' : 'hover:bg-brand-surface text-brand-primary/60'}`}
          >
            <Settings size={22} />
          </button>
          <button 
            onClick={() => { if(window.confirm('로그아웃 하시겠습니까?')) logout(); }}
            className="p-2 hover:bg-brand-pink/10 text-brand-pink rounded-xl transition-colors"
          >
            <LogOut size={22} />
          </button>
        </div>
      </div>
    </nav>
  );
};

const NavLink = ({ to, icon, label, active }: { to: string, icon: any, label: string, active: boolean }) => (
  <Link 
    to={to} 
    className={`flex items-center gap-2 font-black text-sm transition-all ${active ? 'text-brand-primary' : 'text-brand-primary/60 hover:text-brand-primary/60'}`}
  >
    {icon}
    <span>{label}</span>
  </Link>
);

export default Navbar;
