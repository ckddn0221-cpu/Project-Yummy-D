import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Sparkles, AlertCircle, Zap, ThumbsUp, BarChart2 } from 'lucide-react';
import axios from 'axios';
import { useStore } from '../store/useStore';
import { io } from 'socket.io-client';
import logo from '../assets/YummyD_logo.png';

const BACKEND_URL = ''; // NCP 클라우드 배포 시 상대 경로 사용 (Nginx 프록시 설정 필요)

export default function YummyChat() {
  const { user } = useStore();
  const socketRef = useRef<any>(null); // 🔌 소켓 인스턴스 ref 보장
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([{ role: 'bot', text: '안녕! 야미와 함께하는 스마트한 강의실입니다.' }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  
  // 공통 실시간 상태
  const [activePoll, setActivePoll] = useState<{ questionType: string; options: string[] } | null>(null);
  
  // 강사 전용 실시간 집계 상태
  const [classAlerts, setClassAlerts] = useState({ hard: 0, fast: 0, good: 0 });
  const [pollResults, setPollResults] = useState<Record<string, number>>({});

  useEffect(() => {
    if (user && !socketRef.current) {
      // 🔌 소켓 연결 초기화 (지연 로딩)
      socketRef.current = io(BACKEND_URL, {
        transports: ['websocket', 'polling'],
        reconnectionAttempts: 5
      });

      const socket = socketRef.current;

      // 룸 접속 (강사/학생 구분)
      socket.emit('join', { userId: user.id, classId: user.class_id ?? null });

      // [공통] 강사가 투표 시작했을 때
      socket.on('class_poll_started', (poll: any) => {
        if (user.role === 'student') {
          setIsOpen(true);
          setActivePoll(poll);
          const questionText = poll.questionType === 'understanding' ? '오늘 내용, 잘 이해하고 있나요?' : '수업 속도는 어떤가요?';
          setMessages(prev => [...prev, { role: 'bot', text: `📢 강사님의 질문: ${questionText}` }]);
        }
      });

      // [강사 전용] 학생들로부터 알림/응답 수신
      if (user.role !== 'student') {
        socket.on('class_alert_received', ({ alertType }: any) => {
          setClassAlerts(prev => ({ ...prev, [alertType]: (prev as any)[alertType] + 1 }));
          const labels: any = { hard: '⚠️ 내용이 어려움', fast: '⚡ 진도가 빠름', good: '👍 잘 이해됨' };
          setMessages(prev => [...prev, { role: 'system', text: `[실시간 피드백] ${labels[alertType]} 의견이 추가되었습니다.` }]);
        });

        socket.on('poll_result_updated', ({ response }: any) => {
          setPollResults(prev => ({ ...prev, [response]: (prev[response] || 0) + 1 }));
        });
      }
    }
    
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [user]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, activePoll, pollResults]);

  const handleSend = async (customMsg?: string) => {
    const textToSend = customMsg || input;
    if (!textToSend.trim() || loading) return;

    if (!customMsg) setMessages(prev => [...prev, { role: 'user', text: textToSend }]);
    if (!customMsg) setInput('');
    setLoading(true);

    try {
      const res = await axios.post(`${BACKEND_URL}/api/chat`, { userId: user?.id || 1, message: textToSend });
      setMessages(prev => [...prev, { role: 'bot', text: res.data.reply }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: 'bot', text: '앗, 잠시 연결이 끊겼나 봐요.' }]);
    } finally {
      setLoading(false);
    }
  };

  // --- 강사 기능 ---
  const startPoll = (type: 'understanding' | 'pace') => {
    if (socketRef.current) {
      const options = type === 'understanding' ? ['완벽해요', '보통이에요', '모르겠어요'] : ['빨라요', '좋아요', '느려요'];
      setPollResults({});
      socketRef.current.emit('instructor_poll', { classId: user?.class_id ?? null, questionType: type, options });
      setMessages(prev => [...prev, { role: 'bot', text: `🚀 학생들에게 '${type === 'understanding' ? '이해도' : '진도'}' 체크 질문을 보냈습니다.` }]);
    }
  };

  // --- 학생 기능 ---
  const sendQuickFeedback = (type: string, label: string) => {
    if (socketRef.current) {
      socketRef.current.emit('student_alert', { classId: user?.class_id ?? null, alertType: type });
      setMessages(prev => [...prev, { role: 'user', text: `📢 강사님에게 알림 발송: "${label}"` }]);
    }
  };

  const submitPollResponse = (option: string) => {
    if (socketRef.current) {
      socketRef.current.emit('student_response', { classId: user?.class_id ?? null, userId: user?.id, response: option });
      setMessages(prev => [...prev, { role: 'user', text: `✅ 대답 완료: ${option}` }]);
      setActivePoll(null);
    }
  };

  return (
    <div className="fixed bottom-24 right-8 z-50 md:bottom-8">
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.8, y: 40 }} 
            animate={{ opacity: 1, scale: 1, y: 0 }} 
            exit={{ opacity: 0, scale: 0.8, y: 40 }}
            className="absolute bottom-24 right-0 w-[380px] h-[600px] bg-white rounded-[2.5rem] shadow-2xl border-2 border-brand-coral/10 overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="p-6 bg-gradient-to-r from-brand-coral to-brand-primary text-white flex justify-between items-center">
               <div className="flex items-center gap-3">
                 <div className="w-10 h-10 bg-white/20 rounded-2xl p-1">
                    <img src={logo} alt="Mascot" className="w-full h-full object-contain" />
                 </div>
                 <div>
                    <h4 className="font-black text-xs uppercase tracking-tighter">Yummy Assistant</h4>
                    <span className="text-[10px] font-bold opacity-70 uppercase tracking-widest">{user?.role === 'student' ? 'Student Mode' : 'Instructor Mode'}</span>
                 </div>
               </div>
               <button onClick={() => setIsOpen(false)} className="opacity-70 hover:opacity-100"><X size={18} /></button>
            </div>
            
            <div ref={scrollRef} className="flex-1 p-6 overflow-y-auto space-y-4 bg-brand-bg/30">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] p-4 rounded-[1.5rem] font-bold text-xs shadow-sm ${
                    m.role === 'user' ? 'bg-brand-coral text-white rounded-tr-none' 
                    : m.role === 'system' ? 'bg-slate-800 text-brand-mint text-[9px] w-full text-center rounded-xl'
                    : 'bg-white text-brand-primary rounded-tl-none border border-brand-surface'
                  }`}>
                    {m.text}
                  </div>
                </div>
              ))}
              
              {/* 강사 모드: 실시간 현황 요약 */}
              {user?.role !== 'student' && Object.keys(pollResults).length > 0 && (
                <div className="p-4 bg-white rounded-2xl border-2 border-brand-mint/20 space-y-3">
                   <p className="text-[10px] font-black text-brand-primary/40 uppercase text-center">현재 투표 결과</p>
                   <div className="space-y-2">
                      {Object.entries(pollResults).map(([opt, count]) => (
                        <div key={opt} className="space-y-1">
                           <div className="flex justify-between text-[10px] font-bold"><span>{opt}</span><span>{count}명</span></div>
                           <div className="h-1.5 bg-brand-bg rounded-full overflow-hidden">
                              <div className="h-full bg-brand-mint" style={{ width: `${(count / 10) * 100}%` }} />
                           </div>
                        </div>
                      ))}
                   </div>
                </div>
              )}

              {/* 학생 모드: 투표 버튼 */}
              {user?.role === 'student' && activePoll && (
                <div className="grid grid-cols-1 gap-2 p-2 bg-white rounded-2xl border-2 border-brand-primary/10">
                  {activePoll.options.map(opt => (
                    <button key={opt} onClick={() => submitPollResponse(opt)} className="bg-brand-bg hover:bg-brand-primary hover:text-white transition-all p-3 rounded-xl text-xs font-black">
                      {opt}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Bottom Quick Bar */}
            <div className="p-4 bg-white border-t border-brand-surface space-y-4">
               {user?.role !== 'student' ? (
                 <div className="flex gap-2">
                    <button onClick={() => startPoll('understanding')} className="flex-1 py-3 bg-brand-mint/10 text-brand-mint rounded-xl text-[10px] font-black hover:bg-brand-mint/20 transition-all border border-brand-mint/20 flex items-center justify-center gap-1">
                       <BarChart2 size={12} /> 이해도 체크
                    </button>
                    <button onClick={() => startPoll('pace')} className="flex-1 py-3 bg-brand-yellow/10 text-brand-yellow rounded-xl text-[10px] font-black hover:bg-brand-yellow/20 transition-all border border-brand-yellow/20 flex items-center justify-center gap-1">
                       <Zap size={12} /> 진도 체크
                    </button>
                 </div>
               ) : (
                 <div className="flex gap-2">
                    <button onClick={() => sendQuickFeedback('hard', '어려워요')} className="flex-1 py-3 bg-brand-pink/10 text-brand-pink rounded-xl text-[10px] font-black hover:bg-brand-pink/20 transition-all border border-brand-pink/20 flex items-center justify-center gap-1">
                       <AlertCircle size={12} /> 어려워요
                    </button>
                    <button onClick={() => sendQuickFeedback('fast', '빨라요')} className="flex-1 py-3 bg-brand-yellow/10 text-brand-yellow rounded-xl text-[10px] font-black hover:bg-brand-yellow/20 transition-all border border-brand-yellow/20 flex items-center justify-center gap-1">
                       <Zap size={12} /> 빨라요
                    </button>
                    <button onClick={() => sendQuickFeedback('good', '좋아요!')} className="flex-1 py-3 bg-brand-mint/10 text-brand-mint rounded-xl text-[10px] font-black hover:bg-brand-mint/20 transition-all border border-brand-mint/20 flex items-center justify-center gap-1">
                       <ThumbsUp size={12} /> 좋아요!
                    </button>
                 </div>
               )}

               <div className="flex gap-2">
                  <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSend()} placeholder="메시지를 입력하세요..." className="flex-1 bg-brand-bg px-5 py-3 rounded-xl outline-none text-xs font-bold" />
                  <button onClick={() => handleSend()} className="w-12 h-12 bg-brand-coral text-white rounded-xl flex items-center justify-center shadow-lg"><Send size={18} /></button>
               </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      <motion.div whileHover={{ scale: 1.05 }} onClick={() => setIsOpen(!isOpen)} className="flex items-center gap-3 bg-white p-2 pr-6 rounded-full shadow-2xl border-2 border-brand-coral/30 cursor-pointer group">
        <div className="w-14 h-14 bg-brand-coral/10 rounded-full flex items-center justify-center relative">
          <img src={logo} alt="Assistant" className="w-10 h-10 object-contain relative z-10" />
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] font-black text-brand-coral uppercase tracking-widest leading-none mb-1">Live Pulse</span>
          <span className="text-sm font-black text-brand-primary">{user?.role === 'student' ? '야미에게 질문' : '실시간 클래스 관리'}</span>
        </div>
      </motion.div>
    </div>
  );
}
