import { useEffect, useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../store/useStore';
import { ShieldCheck, AlertTriangle, Users, PenLine, AlertCircle, ChevronDown, ChevronUp, Plus, Activity, X } from 'lucide-react';
import axios from 'axios';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';

interface Stats {
  totalStudents: number;
  todayReflections: number;
  highRiskCount: number;
}

interface ClassStats {
  totalStudents: number;
  todayReflections: number;
  notSubmitted: number;
  highRiskCount: number;
}

interface Student {
  id: number;
  username: string;
  enroll_status: string;
  isHighRisk: boolean;
  isEverHighRisk: boolean;
}

interface ConsultEntry {
  date: string;
  content: string;
  editedAt?: string;
}

// ── 모니터링 탭 정의 ────────────────────────────────────────────
const MONITORING_TABS = [
  { key: 'EDU_delay_time',            label: '학습회고 지연시간',   unit: '초',  color: '#60A5FA' },
  { key: 'EDU_char_count',            label: '학습회고 작성 글자수', unit: '자',  color: '#4FD1A5' },
  { key: 'cumulative_days',           label: '회고작성 누적일',     unit: '일',  color: '#1E4D3A' },
  { key: 'cumulative_absence_days',   label: '회고미작성 누적일',   unit: '일',  color: '#FAC775' },
  { key: 'dropout_prob',              label: '중도이탈확률',        unit: '%',   color: '#D4537E' },
] as const;

type MetricKey = typeof MONITORING_TABS[number]['key'];

// ── 감정 키 정의 (SQL snake_case 컬럼명 기준) ──────────────────
const ALL_EMOTION_KEYS = [
  { key: 'happy_prob',       label: '행복',      color: '#FAC775', positive: true  },
  { key: 'fulfill_prob',     label: '성취',      color: '#4FD1A5', positive: true  },
  { key: 'relief_prob',      label: '안도',      color: '#60A5FA', positive: true  },
  { key: 'gratitude_prob',   label: '감사',      color: '#A78BFA', positive: true  },
  { key: 'proud_prob',       label: '자랑스러움', color: '#F9A8D4', positive: true  },
  { key: 'sad_prob',         label: '슬픔',      color: '#93C5FD', positive: false },
  { key: 'anxious_prob',     label: '불안',      color: '#FCA5A5', positive: false },
  { key: 'defeat_prob',      label: '좌절',      color: '#6B7280', positive: false },
  { key: 'stress_prob',      label: '스트레스',  color: '#F87171', positive: false },
  { key: 'embarrassed_prob', label: '부끄러움',  color: '#FB923C', positive: false },
  { key: 'bored_prob',       label: '지루함',    color: '#D1D5DB', positive: false },
  { key: 'exhausted_prob',   label: '지침',      color: '#94A3B8', positive: false },
  { key: 'depressed_prob',   label: '우울',      color: '#475569', positive: false },
] as const;

const parseConsultEntries = (raw: string): ConsultEntry[] => {
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
  } catch {}
  if (raw.trim()) return [{ date: '이전 기록', content: raw }];
  return [];
};

export default function InBoard() {
  const { user } = useStore();
  const [stats, setStats] = useState<Stats | null>(null);
  const [groups, setGroups] = useState<any[]>([]);
  const [isClassListOpen, setIsClassListOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [selectedClass, setSelectedClass] = useState<{ id: number; class_name: string } | null>(null);
  const [classStats, setClassStats] = useState<ClassStats | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [studentFilter, setStudentFilter] = useState<'all' | 'highRisk' | 'everHighRisk' | 'dropout'>('all');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [monitoringHistory, setMonitoringHistory] = useState<any[]>([]);

  // ── 차트 상태
  const [chartMode, setChartMode] = useState<'weekly' | 'monthly'>('weekly');
  const [activeMetric, setActiveMetric] = useState<MetricKey>('EDU_delay_time');

  // ── 감정 차트 모드
  const [emoChartMode, setEmoChartMode] = useState<'week' | 'month'>('week');

  // ── 모니터링 섹션 스크롤 ref
  const monitorPanelRef = useRef<HTMLDivElement>(null);
  const studySectionRef = useRef<HTMLDivElement>(null);
  const emotionSectionRef = useRef<HTMLDivElement>(null);
  const consultSectionRef = useRef<HTMLDivElement>(null);
  const monitorScrollRef = useRef<HTMLDivElement>(null);

  // ── 상담일지 상태
  const [consultEntries, setConsultEntries] = useState<ConsultEntry[]>([]);
  const [newNote, setNewNote] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showConsultPopup, setShowConsultPopup] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editContent, setEditContent] = useState('');

  // ── 리포트 상태
  const [reportFilter, setReportFilter] = useState<'all' | 'highRisk' | 'everHighRisk' | 'dropout'>('all');
  const [reportIndividualName, setReportIndividualName] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  // ── 클래스 드롭다운 클릭 외부 감지 (백드롭 대신 mousedown 방식 사용)
  const classDropdownRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!isClassListOpen) return;
    const handleMouseDown = (e: MouseEvent) => {
      if (classDropdownRef.current && !classDropdownRef.current.contains(e.target as Node)) {
        setIsClassListOpen(false);
      }
    };
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [isClassListOpen]);


  // ── API 호출들 ────────────────────────────────────────────────
  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('yummy_token');
      if (!token) return;
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const res = await axios.get('/api/admin/stats', config);
      if (res.data.success) setStats(res.data.data);
    } catch {}
  };

  const fetchGroups = async () => {
    try {
      const token = localStorage.getItem('yummy_token');
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const res = await axios.get('/api/classes/my-classes', config);
      if (res.data.success) setGroups(res.data.classes);
    } catch {}
  };

  const fetchClassStats = async (classId: number) => {
    try {
      const token = localStorage.getItem('yummy_token');
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const res = await axios.get(`/api/admin/class-stats?class_id=${classId}`, config);
      if (res.data.success) setClassStats(res.data.data);
    } catch {}
  };

  const fetchClassStudents = async (classId: number) => {
    try {
      const token = localStorage.getItem('yummy_token');
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const res = await axios.get(`/api/admin/class-students?class_id=${classId}`, config);
      if (res.data.success) setStudents(res.data.data);
    } catch {}
  };

  const fetchMonitoringHistory = async (userId: number) => {
    try {
      const token = localStorage.getItem('yummy_token');
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const res = await axios.get(`/api/admin/student-monitoring-history?user_id=${userId}`, config);
      if (res.data.success) setMonitoringHistory(res.data.data);
    } catch {}
  };

  const fetchConsultation = async (userId: number) => {
    try {
      const token = localStorage.getItem('yummy_token');
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const res = await axios.get(`/api/admin/consultation?user_id=${userId}`, config);
      if (res.data.success) setConsultEntries(parseConsultEntries(res.data.data.note || ''));
    } catch {}
  };

  const handleSaveNewNote = async () => {
    if (!selectedStudent || !newNote.trim()) return;
    setIsSaving(true);
    try {
      const token = localStorage.getItem('yummy_token');
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const now = new Date();
      const today = now.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\. /g, '-').replace('.', '')
        + ' ' + now.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });
      const newEntry: ConsultEntry = { date: today, content: newNote.trim() };
      const updated = [...consultEntries, newEntry];
      await axios.post('/api/admin/consultation', {
        user_id: selectedStudent.id,
        note: JSON.stringify(updated)
      }, config);
      setConsultEntries(updated);
      setNewNote('');
    } catch {
      alert('저장 실패');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClassClick = (group: any) => {
    setSelectedClass({ id: group.id, class_name: group.class_name });
    setSelectedStudent(null);
    setMonitoringHistory([]);
    setConsultEntries([]);
    fetchClassStats(group.id);
    fetchClassStudents(group.id);
  };

  const handleStudentClick = (student: Student) => {
    setSelectedStudent(student);
    setMonitoringHistory([]);
    setConsultEntries([]);
    setNewNote('');
    fetchMonitoringHistory(student.id);
    fetchConsultation(student.id);
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) return;
    try {
      const token = localStorage.getItem('yummy_token');
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const res = await axios.post('/api/classes/create', { name: newGroupName }, config);
      if (res.data.success) { setNewGroupName(''); fetchGroups(); }
    } catch { alert('클래스 생성 실패'); }
  };

  // ── 차트 데이터 계산 ─────────────────────────────────────────
  const getMetricValue = (row: any, key: MetricKey) =>
    key === 'dropout_prob'
      ? parseFloat(((row.dropout_prob || 0) * 100).toFixed(1))
      : (row[key] || 0);

  const weeklyChartData = useMemo(() => {
    const isCumulativeDays = activeMetric === 'cumulative_days';
    const isCumulative = isCumulativeDays || activeMetric === 'cumulative_absence_days';
    const grouped: Record<string, { vals: number[]; count: number; rawDate: string }> = {};
    monitoringHistory.forEach(r => {
      const date = new Date(r.createdAt).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
      if (!grouped[date]) grouped[date] = { vals: [], count: 0, rawDate: r.createdAt };
      grouped[date].vals.push(getMetricValue(r, activeMetric));
      grouped[date].count += 1;
      if (new Date(r.createdAt) > new Date(grouped[date].rawDate)) {
        grouped[date].rawDate = r.createdAt;
      }
    });
    const allDates = Object.entries(grouped).map(([date, { vals, count, rawDate }]) => {
      const cumulativeMax = Math.max(...vals);
      const avg = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length * 10) / 10;
      // 해당 날짜가 속한 월의 1일부터 그 날까지 회고 작성된 고유 일수
      const thisDate = new Date(rawDate);
      const thisYear = thisDate.getFullYear();
      const thisMonth = thisDate.getMonth();
      const thisDayNum = thisDate.getDate();
      const daysWithReflections = new Set(
        monitoringHistory
          .filter(r => {
            const rd = new Date(r.createdAt);
            return rd.getFullYear() === thisYear && rd.getMonth() === thisMonth && rd.getDate() <= thisDayNum;
          })
          .map(r => new Date(r.createdAt).getDate())
      ).size;
      const monthDays = daysWithReflections;
      const monthAbsenceDays = thisDayNum - daysWithReflections; // 해당 월 1일~해당일 중 미작성 일수
      return {
        date,
        value: isCumulativeDays ? count : isCumulative ? cumulativeMax : avg,
        cumulative: isCumulativeDays ? cumulativeMax : null,
        monthDays,
        monthAbsenceDays,
        rawDate,
      };
    });
    return allDates.slice(-7);
  }, [monitoringHistory, activeMetric]);

  // 학습회고 지연시간 전용 Y축 — 데이터 최대값 기준으로 범위/눈금 동적 결정
  const delayMaxVal = useMemo(() =>
    weeklyChartData.length > 0
      ? Math.max(...weeklyChartData.map(d => d.value), 0)
      : 0,
  [weeklyChartData]);

  // 툴팁 전용: 초 → "N분 N초" 형식
  const formatDelayTooltip = (v: number) => {
    const secs = Math.round(v);
    if (secs < 60) return `${secs}초`;
    const min = Math.floor(secs / 60);
    const sec = secs % 60;
    return sec > 0 ? `${min}분 ${sec}초` : `${min}분`;
  };

  const delayAxisConfig = useMemo(() => {
    const max = delayMaxVal;
    const formatTick = (v: number) => v < 60 ? `${v}초` : `${Math.round(v / 60)}분`;

    if (max <= 60) {
      // 초 단위: 10초 간격
      return { ticks: [10, 20, 30, 40, 50, 60], domain: [0, 60] as [number, number], formatTick };
    } else if (max <= 300) {
      // 5분 이하: 30초·1분·2분·3분·5분
      return { ticks: [30, 60, 120, 180, 300], domain: [0, 300] as [number, number], formatTick };
    } else if (max <= 900) {
      // 15분 이하: 1분·3분·5분·10분·15분
      return { ticks: [60, 180, 300, 600, 900], domain: [0, 900] as [number, number], formatTick };
    } else {
      // 30분 이하
      return { ticks: [60, 300, 600, 900, 1800], domain: [0, 1800] as [number, number], formatTick };
    }
  }, [delayMaxVal]);

  const monthlyChartData = useMemo(() => {
    const isCumulativeDays = activeMetric === 'cumulative_days';
    const isCumulative = isCumulativeDays || activeMetric === 'cumulative_absence_days';
    const now = new Date();
    const cm = now.getMonth(); const cy = now.getFullYear();
    const monthRows = monitoringHistory.filter(r => {
      const d = new Date(r.createdAt);
      return d.getMonth() === cm && d.getFullYear() === cy;
    });
    const weeks: Record<string, { vals: number[]; count: number; dates: Set<number> }> = {};
    monthRows.forEach(r => {
      const d = new Date(r.createdAt);
      const w = `${Math.ceil(d.getDate() / 7)}주차`;
      if (!weeks[w]) weeks[w] = { vals: [], count: 0, dates: new Set() };
      weeks[w].vals.push(getMetricValue(r, activeMetric));
      weeks[w].count += 1;
      weeks[w].dates.add(d.getDate()); // 해당 주차의 고유 날짜 집합
    });
    return ['1주차', '2주차', '3주차', '4주차', '5주차'].map(week => {
      const entry = weeks[week];
      if (!entry) return { week, value: 0, weekCount: 0, weekUniqueDays: 0 };
      const maxVal = Math.max(...entry.vals);
      const avg = Math.round(entry.vals.reduce((a, b) => a + b, 0) / entry.vals.length * 10) / 10;
      return {
        week,
        // 회고작성 누적일: 선 높이는 주차별 제출 건수(N회), 나머지 누적은 MAX, 평균은 AVG
        value: isCumulativeDays ? entry.count : isCumulative ? maxVal : avg,
        weekCount: entry.count,
        weekUniqueDays: entry.dates.size, // 해당 주차 중 회고 작성된 고유 일수
      };
    });
  }, [monitoringHistory, activeMetric]);

  const activeTab = MONITORING_TABS.find(t => t.key === activeMetric)!;
  const chartColor = activeTab.color;
  const chartUnit = activeTab.unit;

  // ── 감정 차트 데이터 ─────────────────────────────────────────
  const top5EmotionKeys = useMemo(() => {
    if (monitoringHistory.length === 0) return ALL_EMOTION_KEYS.slice(0, 5).map(e => e.key);
    const avgs: Record<string, number> = {};
    ALL_EMOTION_KEYS.forEach(({ key }) => {
      avgs[key] = monitoringHistory.reduce((sum, r) => sum + (parseFloat(r[key]) || 0), 0) / monitoringHistory.length;
    });
    return [...ALL_EMOTION_KEYS]
      .sort((a, b) => avgs[b.key] - avgs[a.key])
      .slice(0, 5)
      .map(e => e.key);
  }, [monitoringHistory]);

  const emoChartData = useMemo(() =>
    monitoringHistory.slice(-5).map(r => {
      const total = top5EmotionKeys.reduce((sum, k) => sum + (parseFloat(r[k]) || 0), 0) || 1;
      const point: Record<string, any> = {
        date: new Date(r.createdAt).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
      };
      top5EmotionKeys.forEach(k => { point[k] = Math.round((parseFloat(r[k]) || 0) / total * 100); });
      return point;
    }),
  [monitoringHistory, top5EmotionKeys]);

  const emoMonthChartData = useMemo(() => {
    const now = new Date();
    const cm = now.getMonth(); const cy = now.getFullYear();
    const monthRows = monitoringHistory.filter(r => {
      const d = new Date(r.createdAt);
      return d.getMonth() === cm && d.getFullYear() === cy;
    });
    const weeks: Record<string, any[]> = {};
    monthRows.forEach(r => {
      const w = `${Math.ceil(new Date(r.createdAt).getDate() / 7)}주차`;
      if (!weeks[w]) weeks[w] = [];
      weeks[w].push(r);
    });
    return ['1주차', '2주차', '3주차', '4주차', '5주차'].map(week => {
      const point: Record<string, any> = { week };
      const rows = weeks[week] || [];
      top5EmotionKeys.forEach(k => {
        point[k] = rows.length > 0
          ? Math.round(rows.reduce((sum, r) => sum + (parseFloat(r[k]) || 0), 0) / rows.length * 100) / 100
          : 0;
      });
      return point;
    });
  }, [monitoringHistory, top5EmotionKeys]);

  const emoInsight = useMemo(() => {
    if (monitoringHistory.length === 0) return null;
    const avgs: Record<string, number> = {};
    ALL_EMOTION_KEYS.forEach(({ key }) => {
      avgs[key] = monitoringHistory.reduce((sum, r) => sum + (parseFloat(r[key]) || 0), 0) / monitoringHistory.length;
    });
    const totalSum = Object.values(avgs).reduce((a, b) => a + b, 0) || 1;
    const positiveSum = ALL_EMOTION_KEYS.filter(e => e.positive).reduce((sum, e) => sum + avgs[e.key], 0);
    const negativeSum = ALL_EMOTION_KEYS.filter(e => !e.positive).reduce((sum, e) => sum + avgs[e.key], 0);
    const topEmotion = [...ALL_EMOTION_KEYS].sort((a, b) => avgs[b.key] - avgs[a.key])[0];
    return {
      top: topEmotion,
      positiveRatio: Math.round(positiveSum / totalSum * 100),
      negativeRatio: Math.round(negativeSum / totalSum * 100),
    };
  }, [monitoringHistory]);

  // ── 모니터링 섹션 스크롤 헬퍼 ──────────────────────────────
  const scrollToSection = (ref: { current: HTMLDivElement | null }) => {
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // ── 리포트 생성 ─────────────────────────────────────────────
  // 새 탭 없이 off-screen iframe으로 출력 → 메인 창 포커스 유지
  const printHTML = (html: string) => {
    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:absolute;left:-9999px;top:-9999px;width:210mm;height:297mm;border:0;';
    // srcdoc를 DOM 추가 전에 설정 → about:blank 초기 로드 없이 콘텐츠 로드 한 번만 발생
    iframe.srcdoc = html.replace(/<script[\s\S]*?<\/script>/gi, '');
    iframe.onload = () => {
      iframe.contentWindow?.print();
      setTimeout(() => { if (document.body.contains(iframe)) document.body.removeChild(iframe); }, 1000);
    };
    document.body.appendChild(iframe);
  };


  const generateGroupReport = async () => {
    if (!selectedClass || students.length === 0) return;
    const targetStudents = students.filter(s => {
      if (reportFilter === 'highRisk') return s.isHighRisk;
      if (reportFilter === 'everHighRisk') return s.isEverHighRisk;
      if (reportFilter === 'dropout') return s.enroll_status === 'dropout';
      return true;
    });
    const filterLabel = reportFilter === 'highRisk' ? '중도이탈 위험군'
      : reportFilter === 'everHighRisk' ? '중도이탈위험 경험군'
      : reportFilter === 'dropout' ? '중도이탈 수강생'
      : '전체 수강생';
    const now = new Date().toLocaleString('ko-KR');
    const token = localStorage.getItem('yummy_token');
    const config = { headers: { Authorization: `Bearer ${token}` } };

    setIsGenerating(true);
    try {
      let rows = '';
      if (reportFilter === 'highRisk') {
        // 위험군: 최근 7일 평균 기반
        const studentData = await Promise.all(
          targetStudents.map(async (s, i) => {
            try {
              const res = await axios.get(`/api/admin/student-monitoring-history?user_id=${s.id}`, config);
              const history: any[] = res.data.success ? res.data.data : [];
              const recent7 = history.slice(-7);
              return { s, i, recent7 };
            } catch {
              return { s, i, recent7: [] };
            }
          })
        );

        rows = studentData.map(({ s, i, recent7 }) => {
          if (recent7.length === 0) {
            return `<tr><td>${i + 1}</td><td>${s.username}</td><td style="color:#e11d48;font-weight:700">위험군</td><td colspan="4" style="color:#999">데이터 없음</td></tr>`;
          }

          // 7일 평균 이탈확률
          const validProbs = recent7.filter((r: any) => r.dropout_prob != null);
          const avgProb = validProbs.length > 0
            ? validProbs.reduce((s: number, r: any) => s + parseFloat(r.dropout_prob), 0) / validProbs.length
            : null;
          const dropoutProb = avgProb != null ? `${(avgProb * 100).toFixed(1)}%` : '-';
          const highRiskDays = recent7.filter((r: any) => r.dropout_prob != null && parseFloat(r.dropout_prob) >= 0.99).length;

          // 7일 평균 기반 이탈 예측 근거
          const avgDelay = Math.round(recent7.reduce((s: number, r: any) => s + (r.EDU_delay_time || 0), 0) / recent7.length);
          const avgChars = Math.round(recent7.reduce((s: number, r: any) => s + (r.EDU_char_count || 0), 0) / recent7.length);
          const latestRow = recent7[recent7.length - 1];
          const absDays = latestRow?.cumulative_absence_days ?? 0;
          const cumDays = latestRow?.cumulative_days ?? 0;
          const absRatio = (cumDays + absDays) > 0 ? absDays / (cumDays + absDays) : 0;

          const reasons: string[] = [];
          if (avgDelay > 300) reasons.push(`평균 지연시간 과다 (${avgDelay}초)`);
          if (avgChars < 50)  reasons.push(`평균 글자수 부족 (${avgChars}자)`);
          if (absDays >= 3)   reasons.push(`회고 미작성 누적 (${absDays}일)`);
          if (absRatio > 0.3) reasons.push(`미작성 비율 높음 (${Math.round(absRatio * 100)}%)`);
          if (highRiskDays > 0) reasons.push(`고위험 판정 ${highRiskDays}일 / 최근 ${recent7.length}일`);
          if (avgProb != null && avgProb > 0.6) reasons.push(`7일 평균 이탈확률 높음 (${(avgProb * 100).toFixed(1)}%)`);

          const reasonHtml = reasons.length > 0
            ? `<ul style="margin:0;padding-left:16px;">${reasons.map(r => `<li>${r}</li>`).join('')}</ul>`
            : '<span style="color:#999">특이사항 없음</span>';

          // 7일 평균 주요 감정
          const emotionHtml = (() => {
            const sorted = [...ALL_EMOTION_KEYS]
              .map(e => ({ ...e, val: recent7.reduce((s: number, r: any) => s + (parseFloat(r[e.key]) || 0), 0) / recent7.length }))
              .filter(e => e.val > 0)
              .sort((a, b) => b.val - a.val)
              .slice(0, 4);
            if (sorted.length === 0) return '<span style="color:#999">-</span>';
            return sorted.map(e =>
              `<span style="display:inline-block;margin:1px 2px;padding:1px 6px;border-radius:3px;font-size:10px;font-weight:700;background:${e.positive ? '#d1fae5' : '#fee2e2'};color:${e.positive ? '#065f46' : '#991b1b'}">${e.label} ${(e.val * 100).toFixed(0)}%</span>`
            ).join('');
          })();

          return `
            <tr>
              <td>${i + 1}</td>
              <td>${s.username}</td>
              <td style="color:#e11d48;font-weight:700">위험군</td>
              <td style="font-weight:700">${dropoutProb}<br><span style="font-size:10px;color:#9ca3af;font-weight:400">7일 평균</span></td>
              <td>${reasonHtml}</td>
              <td>${emotionHtml}</td>
            </tr>`;
        }).join('');

        const html = `<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8">
          <title>${selectedClass.class_name} ${filterLabel} 리포트</title>
          <style>
            body { font-family: 'Malgun Gothic', sans-serif; padding: 40px; color: #1a1a1a; }
            h1 { font-size: 22px; margin-bottom: 4px; }
            .meta { color: #666; font-size: 13px; margin-bottom: 24px; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th { background: #1E4D3A; color: white; padding: 9px 12px; text-align: left; font-size: 11px; }
            td { padding: 8px 12px; border-bottom: 1px solid #eee; vertical-align: top; }
            tr:nth-child(even) td { background: #f9fafb; }
            li { margin-bottom: 2px; }
            .warn { color: #e11d48; font-size: 11px; font-weight: 700; background: #fff0f3; padding: 2px 6px; border-radius: 4px; margin-bottom: 8px; display: inline-block; }
            @media print { body { padding: 20px; } }
          </style></head><body>
          <h1>${selectedClass.class_name} — ${filterLabel} 리포트</h1>
          <p class="meta">생성일시: ${now} &nbsp;|&nbsp; 총 ${targetStudents.length}명 &nbsp;|&nbsp; 기준: 최근 7일 평균</p>
          <p class="warn">※ 이탈확률·예측근거·감정은 최근 7일 데이터의 평균값 기준입니다.</p>
          <table>
            <thead><tr><th>#</th><th>이름</th><th>상태</th><th>이탈확률(7일 평균)</th><th>이탈 예측 근거</th><th>주요 감정(7일 평균)</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
          </body></html>`;

        printHTML(html);
      } else if (reportFilter === 'everHighRisk') {
        // 위험 경험군: 7일 평균 기반 + 현재 상태 표기
        const studentData = await Promise.all(
          targetStudents.map(async (s, i) => {
            try {
              const res = await axios.get(`/api/admin/student-monitoring-history?user_id=${s.id}`, config);
              const history: any[] = res.data.success ? res.data.data : [];
              const recent7 = history.slice(-7);
              return { s, i, recent7 };
            } catch {
              return { s, i, recent7: [] };
            }
          })
        );

        rows = studentData.map(({ s, i, recent7 }) => {
          const currentStatus = s.enroll_status === 'dropout' ? '중도이탈'
            : s.isHighRisk ? '위험군'
            : '경험군(회복)';
          const statusColor = s.enroll_status === 'dropout' ? '#d97706'
            : s.isHighRisk ? '#e11d48'
            : '#ea580c';

          if (recent7.length === 0) {
            return `<tr><td>${i + 1}</td><td>${s.username}</td><td style="color:${statusColor};font-weight:700">${currentStatus}</td><td colspan="4" style="color:#999">데이터 없음</td></tr>`;
          }

          const validProbs = recent7.filter((r: any) => r.dropout_prob != null);
          const avgProb = validProbs.length > 0
            ? validProbs.reduce((acc: number, r: any) => acc + parseFloat(r.dropout_prob), 0) / validProbs.length
            : null;
          const dropoutProb = avgProb != null ? `${(avgProb * 100).toFixed(1)}%` : '-';
          const highRiskDays = recent7.filter((r: any) => r.dropout_prob != null && parseFloat(r.dropout_prob) >= 0.99).length;

          const avgDelay = Math.round(recent7.reduce((acc: number, r: any) => acc + (r.EDU_delay_time || 0), 0) / recent7.length);
          const avgChars = Math.round(recent7.reduce((acc: number, r: any) => acc + (r.EDU_char_count || 0), 0) / recent7.length);
          const latestRow = recent7[recent7.length - 1];
          const absDays = latestRow?.cumulative_absence_days ?? 0;
          const cumDays = latestRow?.cumulative_days ?? 0;
          const absRatio = (cumDays + absDays) > 0 ? absDays / (cumDays + absDays) : 0;

          const reasons: string[] = [];
          if (avgDelay > 300) reasons.push(`평균 지연시간 과다 (${avgDelay}초)`);
          if (avgChars < 50)  reasons.push(`평균 글자수 부족 (${avgChars}자)`);
          if (absDays >= 3)   reasons.push(`회고 미작성 누적 (${absDays}일)`);
          if (absRatio > 0.3) reasons.push(`미작성 비율 높음 (${Math.round(absRatio * 100)}%)`);
          if (highRiskDays > 0) reasons.push(`최근 7일 중 고위험 판정 ${highRiskDays}일`);
          if (avgProb != null && avgProb > 0.6) reasons.push(`7일 평균 이탈확률 높음 (${(avgProb * 100).toFixed(1)}%)`);
          if (reasons.length === 0 && avgProb != null && avgProb <= 0.5) reasons.push('최근 7일 기준 안정 상태');

          const reasonHtml = `<ul style="margin:0;padding-left:16px;">${reasons.map(r => `<li>${r}</li>`).join('')}</ul>`;

          const emotionHtml = (() => {
            const sorted = [...ALL_EMOTION_KEYS]
              .map(e => ({ ...e, val: recent7.reduce((acc: number, r: any) => acc + (parseFloat(r[e.key]) || 0), 0) / recent7.length }))
              .filter(e => e.val > 0)
              .sort((a, b) => b.val - a.val)
              .slice(0, 4);
            if (sorted.length === 0) return '<span style="color:#999">-</span>';
            return sorted.map(e =>
              `<span style="display:inline-block;margin:1px 2px;padding:1px 6px;border-radius:3px;font-size:10px;font-weight:700;background:${e.positive ? '#d1fae5' : '#fee2e2'};color:${e.positive ? '#065f46' : '#991b1b'}">${e.label} ${(e.val * 100).toFixed(0)}%</span>`
            ).join('');
          })();

          return `
            <tr>
              <td>${i + 1}</td>
              <td>${s.username}</td>
              <td style="color:${statusColor};font-weight:700">${currentStatus}</td>
              <td style="font-weight:700">${dropoutProb}<br><span style="font-size:10px;color:#9ca3af;font-weight:400">7일 평균</span></td>
              <td>${reasonHtml}</td>
              <td>${emotionHtml}</td>
            </tr>`;
        }).join('');

        const html = `<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8">
          <title>${selectedClass.class_name} ${filterLabel} 리포트</title>
          <style>
            body { font-family: 'Malgun Gothic', sans-serif; padding: 40px; color: #1a1a1a; }
            h1 { font-size: 22px; margin-bottom: 4px; }
            .meta { color: #666; font-size: 13px; margin-bottom: 24px; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th { background: #ea580c; color: white; padding: 9px 12px; text-align: left; font-size: 11px; }
            td { padding: 8px 12px; border-bottom: 1px solid #eee; vertical-align: top; }
            tr:nth-child(even) td { background: #f9fafb; }
            li { margin-bottom: 2px; }
            .warn { color: #ea580c; font-size: 11px; font-weight: 700; background: #fff7ed; padding: 2px 6px; border-radius: 4px; margin-bottom: 8px; display: inline-block; }
            @media print { body { padding: 20px; } }
          </style></head><body>
          <h1>${selectedClass.class_name} — ${filterLabel} 리포트</h1>
          <p class="meta">생성일시: ${now} &nbsp;|&nbsp; 총 ${targetStudents.length}명 &nbsp;|&nbsp; 기준: 최근 7일 평균</p>
          <p class="warn">※ 과거에 이탈확률 99% 이상을 기록한 이력이 있는 수강생 목록입니다. 현재 상태(위험군/경험군(회복)/중도이탈)를 함께 확인하세요.</p>
          <table>
            <thead><tr><th>#</th><th>이름</th><th>현재 상태</th><th>이탈확률(7일 평균)</th><th>최근 7일 동향</th><th>주요 감정(7일 평균)</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
          </body></html>`;

        printHTML(html);
      } else {
        // 전체 / 중도이탈: 기존 단순 테이블
        rows = targetStudents.map((s, i) => `
          <tr>
            <td>${i + 1}</td>
            <td>${s.username}</td>
            <td style="color:${s.enroll_status === 'dropout' ? '#d97706' : s.isHighRisk ? '#e11d48' : '#059669'}">
              ${s.enroll_status === 'dropout' ? '중도이탈' : s.isHighRisk ? '위험군' : '정상'}
            </td>
          </tr>`).join('');

        const html = `<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8">
          <title>${selectedClass.class_name} ${filterLabel} 리포트</title>
          <style>
            body { font-family: 'Malgun Gothic', sans-serif; padding: 40px; color: #1a1a1a; }
            h1 { font-size: 22px; margin-bottom: 4px; }
            .meta { color: #666; font-size: 13px; margin-bottom: 24px; }
            table { width: 100%; border-collapse: collapse; font-size: 14px; }
            th { background: #1E4D3A; color: white; padding: 10px 14px; text-align: left; }
            td { padding: 9px 14px; border-bottom: 1px solid #eee; }
            tr:nth-child(even) td { background: #f9fafb; }
            @media print { body { padding: 20px; } }
          </style></head><body>
          <h1>${selectedClass.class_name} — ${filterLabel} 리포트</h1>
          <p class="meta">생성일시: ${now} &nbsp;|&nbsp; 총 ${targetStudents.length}명</p>
          <table>
            <thead><tr><th>#</th><th>이름</th><th>상태</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
          <script>window.onbeforeunload = () => { if (window.opener) window.opener.postMessage('__report_closed__', '*'); }; window.onload = () => { window.print(); window.close(); };<\/script>
          </body></html>`;

        printHTML(html);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const generateIndividualReport = async () => {
    const name = reportIndividualName.trim();
    if (!name) return;
    const target = students.find(s => s.username === name);
    if (!target) { alert(`'${name}' 학생을 찾을 수 없습니다.`); return; }

    setIsGenerating(true);
    try {
      const token = localStorage.getItem('yummy_token');
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const [monRes, consultRes] = await Promise.all([
        axios.get(`/api/admin/student-monitoring-history?user_id=${target.id}`, config),
        axios.get(`/api/admin/consultation?user_id=${target.id}`, config),
      ]);
      const history: any[] = monRes.data.success ? monRes.data.data : [];
      const entries: ConsultEntry[] = consultRes.data.success ? parseConsultEntries(consultRes.data.data.note || '') : [];
      const now = new Date().toLocaleString('ko-KR');
      const statusLabel = target.enroll_status === 'dropout' ? '중도이탈'
        : target.isHighRisk ? '위험군'
        : target.isEverHighRisk ? '경험군(회복)'
        : '정상';
      const statusColor = target.enroll_status === 'dropout' ? '#d97706'
        : target.isHighRisk ? '#e11d48'
        : target.isEverHighRisk ? '#ea580c'
        : '#059669';

      // 최근 7일 데이터
      const recent7 = history.slice(-7);

      // 유형 분류 헬퍼
      const riskLabel = (prob: number | null) => {
        if (prob == null) return { text: '미분석', color: '#9ca3af' };
        if (prob >= 0.99) return { text: '고위험', color: '#dc2626' };
        if (prob >= 0.5)  return { text: '주의',   color: '#d97706' };
        return { text: '정상', color: '#059669' };
      };

      // 감정 뱃지 헬퍼 (리포트용 인라인)
      const emoBadges = (row: any, topN = 3) => {
        const sorted = [...ALL_EMOTION_KEYS]
          .map(e => ({ ...e, val: parseFloat(row[e.key]) || 0 }))
          .filter(e => e.val > 0)
          .sort((a, b) => b.val - a.val)
          .slice(0, topN);
        if (sorted.length === 0) return '<span style="color:#aaa">-</span>';
        return sorted.map(e =>
          `<span style="display:inline-block;margin:1px 2px;padding:1px 5px;border-radius:3px;font-size:10px;font-weight:700;background:${e.positive ? '#d1fae5' : '#fee2e2'};color:${e.positive ? '#065f46' : '#991b1b'}">${e.label}</span>`
        ).join('');
      };

      // ① 일별 데이터 표
      const dailyRows = recent7.length > 0 ? recent7.map((r, idx) => {
        const date = new Date(r.createdAt).toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit', weekday: 'short' });
        const delay = r.EDU_delay_time != null ? (r.EDU_delay_time < 60 ? `${r.EDU_delay_time}초` : `${Math.round(r.EDU_delay_time / 60)}분`) : '-';
        const chars = r.EDU_char_count != null ? `${r.EDU_char_count}자` : '-';
        const prob = r.dropout_prob != null ? parseFloat(r.dropout_prob) : null;
        const probText = prob != null ? `${(prob * 100).toFixed(1)}%` : '-';
        const risk = riskLabel(prob);
        const bgColor = idx % 2 === 0 ? '#ffffff' : '#f9fafb';
        return `<tr style="background:${bgColor}">
          <td style="text-align:center;font-weight:700">${date}</td>
          <td style="text-align:center">${delay}</td>
          <td style="text-align:center">${chars}</td>
          <td style="text-align:center;font-weight:700;color:${risk.color}">${probText}</td>
          <td>${emoBadges(r, 3)}</td>
          <td style="text-align:center"><span style="display:inline-block;padding:2px 8px;border-radius:99px;font-size:11px;font-weight:700;color:white;background:${risk.color}">${risk.text}</span></td>
        </tr>`;
      }).join('') : `<tr><td colspan="6" style="text-align:center;color:#999;padding:20px">최근 7일 데이터 없음</td></tr>`;

      // ② 통계 요약
      const validRows = recent7.filter(r => r.dropout_prob != null);
      const avgDelay   = recent7.length > 0 ? Math.round(recent7.reduce((s, r) => s + (r.EDU_delay_time || 0), 0) / recent7.length) : 0;
      const avgChars   = recent7.length > 0 ? Math.round(recent7.reduce((s, r) => s + (r.EDU_char_count || 0), 0) / recent7.length) : 0;
      const avgProb    = validRows.length > 0 ? validRows.reduce((s, r) => s + parseFloat(r.dropout_prob), 0) / validRows.length : null;
      const submitDays = recent7.length;
      const latestRow  = recent7[recent7.length - 1];
      const absDays    = latestRow?.cumulative_absence_days ?? '-';
      // 전체 history에서 고유 날짜(일) 기준으로 누적 제출일 계산
      const uniqueSubmitDates = new Set(history.map(r => new Date(r.createdAt).toDateString()));
      const cumDays    = uniqueSubmitDates.size > 0 ? `${uniqueSubmitDates.size}` : (latestRow?.cumulative_days ?? '-');
      const highRiskDays = recent7.filter(r => r.dropout_prob != null && parseFloat(r.dropout_prob) >= 0.99).length;
      const cautionDays  = recent7.filter(r => r.dropout_prob != null && parseFloat(r.dropout_prob) >= 0.5 && parseFloat(r.dropout_prob) < 0.99).length;

      const statsRows = [
        ['조회 기간 내 회고 제출 횟수', `${submitDays}회`],
        ['평균 학습회고 지연시간', avgDelay < 60 ? `${avgDelay}초` : `${Math.round(avgDelay / 60)}분`],
        ['평균 학습회고 글자수', `${avgChars}자`],
        ['평균 중도이탈확률', avgProb != null ? `${(avgProb * 100).toFixed(1)}%` : '-'],
        ['고위험 판정 일수', `${highRiskDays}일`],
        ['주의 판정 일수', `${cautionDays}일`],
        ['전체 회고작성 누적일', `${cumDays}일`],
        ['전체 회고미작성 누적일', `${absDays}일`],
      ].map((([label, val], i) =>
        `<tr style="background:${i % 2 === 0 ? '#fff' : '#f9fafb'}"><td style="font-weight:700;color:#374151">${label}</td><td style="font-weight:700;color:#1E4D3A">${val}</td></tr>`
      )).join('');

      // ③ 감정 분석 (7일 평균)
      const emotionAvgRows = (() => {
        if (recent7.length === 0) return '<tr><td colspan="3" style="color:#999;text-align:center">데이터 없음</td></tr>';
        const sorted = [...ALL_EMOTION_KEYS]
          .map(e => ({
            ...e,
            val: recent7.reduce((s, r) => s + (parseFloat(r[e.key]) || 0), 0) / recent7.length
          }))
          .filter(e => e.val > 0)
          .sort((a, b) => b.val - a.val);
        const posSum = sorted.filter(e => e.positive).reduce((s, e) => s + e.val, 0);
        const negSum = sorted.filter(e => !e.positive).reduce((s, e) => s + e.val, 0);
        const total = posSum + negSum || 1;
        const rows = sorted.slice(0, 8).map((e, i) =>
          `<tr style="background:${i % 2 === 0 ? '#fff' : '#f9fafb'}">
            <td>${e.label}</td>
            <td>
              <div style="display:flex;align-items:center;gap:8px">
                <div style="flex:1;background:#e5e7eb;border-radius:4px;height:8px;overflow:hidden">
                  <div style="width:${(e.val * 100).toFixed(0)}%;background:${e.positive ? '#4FD1A5' : '#F87171'};height:8px"></div>
                </div>
                <span style="font-size:12px;font-weight:700;min-width:36px">${(e.val * 100).toFixed(1)}%</span>
              </div>
            </td>
            <td style="font-weight:700;color:${e.positive ? '#059669' : '#dc2626'}">${e.positive ? '긍정' : '부정'}</td>
          </tr>`
        ).join('');
        return `${rows}
          <tr style="background:#f0fdf4;border-top:2px solid #1E4D3A">
            <td colspan="3" style="padding:10px 14px;font-size:13px;color:#374151">
              <strong style="color:#059669">긍정 지수: ${(posSum / total * 100).toFixed(0)}%</strong>
              &nbsp;&nbsp;&nbsp;
              <strong style="color:#dc2626">부정 지수: ${(negSum / total * 100).toFixed(0)}%</strong>
            </td>
          </tr>`;
      })();

      // ④ 상담일지 (입력일시 + 수정일시 포함)
      const consultHtml = entries.length > 0
        ? [...entries].reverse().map(e => `
            <div class="consult-entry">
              <div class="consult-date">
                입력: ${e.date}
                ${e.editedAt ? `&nbsp;<span style="color:#6b7280">| 수정: ${e.editedAt}</span>` : ''}
              </div>
              <div class="consult-content">${e.content.replace(/\n/g, '<br>')}</div>
            </div>`).join('')
        : '<p style="color:#999">상담 기록 없음</p>';

      const html = `<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8">
        <title>${target.username} 개별 모니터링 리포트</title>
        <style>
          body { font-family: 'Malgun Gothic', sans-serif; padding: 36px; color: #1a1a1a; max-width: 800px; margin: 0 auto; }
          h1 { font-size: 22px; margin-bottom: 4px; color: #1E4D3A; }
          h2 { font-size: 14px; margin: 26px 0 8px; color: #1E4D3A; border-bottom: 2px solid #1E4D3A; padding-bottom: 4px; letter-spacing: 0.05em; }
          .meta { color: #666; font-size: 12px; margin-bottom: 20px; }
          .status { display:inline-block; padding:2px 10px; border-radius:99px; font-size:11px; font-weight:700; color:white; background:${statusColor}; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; }
          th { background: #1E4D3A; color: white; padding: 8px 12px; text-align: left; font-size: 11px; }
          td { padding: 7px 12px; border-bottom: 1px solid #e5e7eb; vertical-align: middle; }
          .consult-entry { margin-bottom: 12px; border-left: 3px solid #4FD1A5; padding-left: 12px; }
          .consult-date { font-size: 10px; color: #888; font-weight: 700; margin-bottom: 3px; }
          .consult-content { font-size: 12px; line-height: 1.6; }
          @media print { body { padding: 16px; } }
        </style></head><body>
        <h1>${target.username} 개별 모니터링 리포트</h1>
        <p class="meta">
          클래스: ${selectedClass?.class_name ?? '-'} &nbsp;|&nbsp;
          상태: <span class="status">${statusLabel}</span> &nbsp;|&nbsp;
          생성일시: ${now} &nbsp;|&nbsp; 기준: 최근 7일 (${recent7.length}건)
        </p>

        <h2>① 일별 학습·감정 데이터 (최근 7일)</h2>
        <table>
          <thead><tr><th>날짜</th><th>지연시간</th><th>글자수</th><th>이탈확률</th><th>주요 감정</th><th>유형</th></tr></thead>
          <tbody>${dailyRows}</tbody>
        </table>

        <h2>② 통계 요약</h2>
        <table>
          <thead><tr><th>항목</th><th>값</th></tr></thead>
          <tbody>${statsRows}</tbody>
        </table>

        <h2>③ 감정 분석 (7일 평균)</h2>
        <table>
          <thead><tr><th>감정</th><th>평균 비율</th><th>유형</th></tr></thead>
          <tbody>${emotionAvgRows}</tbody>
        </table>

        <h2>④ 수강생 상담일지 (총 ${entries.length}개)</h2>
        ${consultHtml}
        </body></html>`;

      printHTML(html);
    } finally {
      setIsGenerating(false);
    }
  };

  // ── 초기 로드 ────────────────────────────────────────────────
  useEffect(() => {
    if ((user?.role as string) === 'institution' || user?.role === 'instructor') {
      fetchStats(); fetchGroups();
    }
  }, [user]);

  if ((user?.role as string) !== 'institution' && user?.role !== 'instructor') {
    return <div className="text-center py-20 font-black text-brand-primary">접근 권한이 없습니다.</div>;
  }

  const totalStudents = stats?.totalStudents || 0;
  const todayReflections = stats?.todayReflections || 0;
  const filteredStudents = students.filter(s => {
    if (studentFilter === 'highRisk') return s.isHighRisk;
    if (studentFilter === 'everHighRisk') return s.isEverHighRisk;
    if (studentFilter === 'dropout') return s.enroll_status === 'dropout';
    return true;
  });

  const statCards = [
    { label: '전체 수강생', value: `${totalStudents}명`, icon: Users, color: 'text-brand-primary', bg: 'bg-brand-surface0' },
    { label: '금일 회고', value: `${todayReflections}명`, icon: PenLine, color: 'text-brand-mint', bg: 'bg-emerald-50' },
    { label: '미제출', value: `${totalStudents - todayReflections}명`, icon: AlertCircle, color: 'text-brand-yellow', bg: 'bg-amber-50' },
    { label: '위험군', value: `${stats?.highRiskCount || 0}명`, icon: AlertTriangle, color: 'text-brand-pink', bg: 'bg-rose-50' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-6xl mx-auto space-y-8 px-6 pb-24 font-brand-kor"
    >
      {/* ── 상단 4개 통계 카드 ────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {statCards.map((card, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
            className="bg-white px-5 py-4 rounded-2xl border border-brand-surface shadow-sm hover:translate-y-[-2px] transition-all flex items-center gap-3"
          >
            <div className={`w-8 h-8 ${card.bg} rounded-xl flex items-center justify-center shrink-0 ${card.color}`}>
              <card.icon size={16} />
            </div>
            <div>
              <p className="text-[10px] font-black text-brand-primary/40 uppercase tracking-widest">{card.label}</p>
              <p className="text-xl font-black text-brand-primary">{card.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* ── 모니터링 시스템 헤더 + 클래스 추가 ───────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch">
        <div ref={classDropdownRef} className="md:col-span-2 bg-slate-900 text-white rounded-2xl shadow-xl relative">
          <div className="flex items-center justify-between px-5 py-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-white/10 rounded-xl flex items-center justify-center">
                <ShieldCheck className="text-brand-mint" size={18} />
              </div>
              <div>
                <h2 className="text-sm font-black tracking-tight">기관 전용 모니터링 시스템</h2>
                <p className="text-sm font-black text-brand-mint">
                  {selectedClass ? selectedClass.class_name : ((user as any).organization_name || 'Yummy Academy')}
                </p>
              </div>
            </div>
            <button onClick={() => setIsClassListOpen(p => !p)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-black text-brand-mint transition-colors"
            >
              모든 클래스 보기
              {isClassListOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
          </div>
          <AnimatePresence>
            {isClassListOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}
                  className="absolute top-full left-0 right-0 mt-2 bg-slate-800 rounded-xl shadow-2xl z-20 overflow-hidden border border-white/10"
                >
                  <div className="p-3 space-y-1 max-h-60 overflow-y-auto">
                    {groups.length > 0 ? groups.map((g) => (
                      <div key={g.id} onClick={() => { handleClassClick(g); setIsClassListOpen(false); }}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors cursor-pointer ${selectedClass?.id === g.id ? 'bg-brand-mint/20 ring-1 ring-brand-mint' : 'bg-white/5 hover:bg-white/10'}`}
                      >
                        <div className={`w-1.5 h-1.5 rounded-full ${selectedClass?.id === g.id ? 'bg-brand-mint' : 'bg-white/40'}`} />
                        <span className="text-xs font-bold text-white">{g.class_name}</span>
                        {selectedClass?.id === g.id && <span className="ml-auto text-[10px] text-brand-mint font-black">선택됨</span>}
                      </div>
                    )) : (
                      <p className="text-xs font-bold text-white/30 text-center py-3">등록된 클래스가 없습니다.</p>
                    )}
                  </div>
                </motion.div>
            )}
          </AnimatePresence>
        </div>
        <div className="bg-white px-5 py-4 rounded-2xl border border-brand-surface shadow-sm flex items-center gap-3">
          <div className="flex items-center gap-2 w-full">
            <input value={newGroupName} onChange={e => setNewGroupName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreateGroup()}
              placeholder="클래스명 입력"
              className="flex-1 px-3 py-2 bg-brand-surface0 rounded-lg font-bold text-xs outline-none text-brand-primary placeholder:text-brand-primary/30"
            />
            <button onClick={handleCreateGroup}
              className="flex items-center gap-1 px-3 py-2 bg-brand-primary text-white rounded-lg font-black text-xs whitespace-nowrap hover:opacity-90 transition-opacity"
            >
              <Plus size={13} /> 추가
            </button>
          </div>
        </div>
      </div>

      {/* ── 선택된 클래스 통계 ────────────────────────────────── */}
      <AnimatePresence>
        {selectedClass && classStats && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }} transition={{ duration: 0.3 }} className="space-y-3">
            <p className="text-[11px] font-black text-brand-primary/50 uppercase tracking-widest px-1">{selectedClass.class_name} 클래스</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: '수강생', value: `${classStats.totalStudents}명`, icon: Users, color: 'text-brand-primary', bg: 'bg-brand-surface0' },
                { label: '금일 회고', value: `${classStats.todayReflections}명`, icon: PenLine, color: 'text-brand-mint', bg: 'bg-emerald-50' },
                { label: '미제출', value: `${classStats.notSubmitted}명`, icon: AlertCircle, color: 'text-brand-yellow', bg: 'bg-amber-50' },
                { label: '중도이탈 위험군', value: `${classStats.highRiskCount}명`, icon: AlertTriangle, color: 'text-brand-pink', bg: 'bg-rose-50' },
              ].map((card, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
                  className="bg-white px-5 py-4 rounded-2xl border border-brand-surface shadow-sm hover:translate-y-[-2px] transition-all flex items-center gap-3"
                >
                  <div className={`w-8 h-8 ${card.bg} rounded-xl flex items-center justify-center shrink-0 ${card.color}`}><card.icon size={16} /></div>
                  <div>
                    <p className="text-[10px] font-black text-brand-primary/40 uppercase tracking-widest">{card.label}</p>
                    <p className="text-xl font-black text-brand-primary">{card.value}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── 모니터링 결과(3/5) + 수강생 목록(2/5) ────────────── */}
      <AnimatePresence>
        {selectedClass && students.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }} transition={{ duration: 0.3 }}
            className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start"
          >
            {/* ── 좌측: 모니터링 결과 (3/5) ─────────────────── */}
            <div ref={monitorPanelRef} className="lg:col-span-3 bg-white px-7 py-6 rounded-2xl border border-brand-surface shadow-sm space-y-5">
              {/* 헤더: 제목 + 스크롤 단축 버튼 — sticky */}
              <h3 className="sticky top-20 z-40 bg-white py-2 -mx-7 px-7 text-sm font-black text-brand-primary flex items-center gap-2 flex-wrap border-b border-brand-surface/60">
                <span className="flex items-center gap-2 flex-1 min-w-0">
                  <Activity size={16} className="text-brand-mint shrink-0" /> 모니터링 결과
                  {selectedStudent && <span className="text-brand-primary/40 font-bold truncate">— {selectedStudent.username}</span>}
                </span>
                {selectedStudent && (
                  <div className="flex gap-1.5 shrink-0">
                    <button onClick={() => scrollToSection(monitorPanelRef)}
                      className="px-3 py-1 bg-brand-surface0 hover:bg-brand-primary hover:text-white rounded-lg text-[11px] font-black text-brand-primary transition-colors"
                    >
                      학습모니터링
                    </button>
                    <button onClick={() => scrollToSection(emotionSectionRef)}
                      className="px-3 py-1 bg-brand-surface0 hover:bg-brand-primary hover:text-white rounded-lg text-[11px] font-black text-brand-primary transition-colors"
                    >
                      감정모니터링
                    </button>
                    <button onClick={() => scrollToSection(consultSectionRef)}
                      className="px-3 py-1 bg-brand-surface0 hover:bg-brand-primary hover:text-white rounded-lg text-[11px] font-black text-brand-primary transition-colors"
                    >
                      수강생상담일지
                    </button>
                  </div>
                )}
              </h3>

              {selectedStudent ? (
                <div ref={monitorScrollRef} className="space-y-6">

                  {/* ── 학습모니터링 섹션 ── */}
                  <div ref={studySectionRef} className="space-y-4">
                    <p className="text-[10px] font-black text-brand-primary/40 uppercase tracking-widest pb-2 border-b border-brand-surface">
                      학습모니터링
                    </p>

                    {/* 주별 / 월별 토글 */}
                    <div className="flex gap-2">
                      {(['weekly', 'monthly'] as const).map(mode => (
                        <button key={mode} onClick={() => setChartMode(mode)}
                          className={`px-4 py-1.5 rounded-xl text-xs font-black transition-all ${chartMode === mode ? 'bg-brand-primary text-white shadow' : 'bg-brand-surface/60 text-brand-primary/50 hover:bg-brand-surface'}`}
                        >
                          {mode === 'weekly' ? '주별 모니터링' : '월별 모니터링'}
                        </button>
                      ))}
                    </div>

                    {/* 5개 메트릭 탭 */}
                    <div className="flex flex-wrap gap-2">
                      {MONITORING_TABS.map(tab => (
                        <button key={tab.key} onClick={() => setActiveMetric(tab.key)}
                          className={`px-3 py-1.5 rounded-xl text-[11px] font-black transition-all border ${activeMetric === tab.key ? 'text-white border-transparent shadow-sm' : 'bg-white border-brand-surface text-brand-primary/50 hover:border-brand-primary/20'}`}
                          style={activeMetric === tab.key ? { backgroundColor: tab.color, borderColor: tab.color } : {}}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>

                    {/* 학습 차트 */}
                    {monitoringHistory.length > 0 ? (
                      <div>
                        <p className="text-[10px] font-black text-brand-primary/30 mb-2 uppercase tracking-widest">
                          {activeTab.label} ({chartUnit})
                        </p>
                        <ResponsiveContainer width="100%" height={200}>
                          {chartMode === 'weekly' ? (
                            <BarChart data={weeklyChartData} margin={{ top: 4, right: 8, left: activeMetric === 'EDU_delay_time' ? 10 : -20, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#2D5A3D66', fontWeight: 700 }} />
                              {activeMetric === 'EDU_delay_time' ? (
                                <YAxis
                                  ticks={delayAxisConfig.ticks}
                                  tickFormatter={delayAxisConfig.formatTick}
                                  tick={{ fontSize: 10, fill: '#2D5A3D66' }}
                                  domain={delayAxisConfig.domain}
                                />
                              ) : (
                                <YAxis
                                  tick={{ fontSize: 10, fill: '#2D5A3D66' }}
                                  allowDecimals={false}
                                  tickFormatter={(v: number) =>
                                    activeMetric === 'cumulative_days' ? `${v}회` : `${v}${chartUnit}`
                                  }
                                />
                              )}
                              <Tooltip
                                labelFormatter={(label: string, payload: any[]) => {
                                  if (activeMetric === 'cumulative_days' && payload?.[0]?.payload) {
                                    const { monthDays, rawDate } = payload[0].payload;
                                    const month = new Date(rawDate).getMonth() + 1;
                                    return `${label} (${month}월 누적 ${monthDays}일)`;
                                  }
                                  return label;
                                }}
                                formatter={(v: any, _: any, props: any) => {
                                  if (activeMetric === 'cumulative_days') {
                                    const cum = props?.payload?.cumulative;
                                    return [
                                      `당일 ${v}회 작성${cum != null ? ` / 누적 ${cum}회` : ''}`,
                                      activeTab.label
                                    ];
                                  }
                                  if (activeMetric === 'cumulative_absence_days') {
                                    const { monthAbsenceDays, rawDate } = props?.payload || {};
                                    const month = rawDate ? new Date(rawDate).getMonth() + 1 : '';
                                    return [
                                      <span key="absence">
                                        <div>{month}월 기준 미작성 {monthAbsenceDays ?? '-'}일</div>
                                        <div>수강 시작 기준 미작성 {v}일</div>
                                      </span>,
                                      ''
                                    ];
                                  }
                                  return [
                                    activeMetric === 'EDU_delay_time' ? formatDelayTooltip(v) : `${v}${chartUnit}`,
                                    activeTab.label
                                  ];
                                }}
                                contentStyle={{ borderRadius: 10, fontSize: 11, border: '1px solid #E5E7EB' }}
                              />
                              <Bar dataKey="value" fill={chartColor} radius={[4, 4, 0, 0]} />
                            </BarChart>
                          ) : (
                            <LineChart data={monthlyChartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                              <XAxis dataKey="week" tick={{ fontSize: 10, fill: '#2D5A3D66', fontWeight: 700 }} />
                              <YAxis
                                tick={{ fontSize: 10, fill: '#2D5A3D66' }}
                                allowDecimals={false}
                                unit={activeMetric === 'cumulative_days' ? '회' : chartUnit}
                              />
                              <Tooltip
                                formatter={(v: any, _: any, props: any) => {
                                  if (activeMetric === 'cumulative_days') {
                                    const { weekCount, weekUniqueDays } = props?.payload || {};
                                    return [
                                      <span key="monthly-cum">
                                        <div>회고작성 누적일 {weekUniqueDays}일 (해당 주차 기준)</div>
                                        <div>누적 {weekCount}회 (해당 주차 기준)</div>
                                      </span>,
                                      ''
                                    ];
                                  }
                                  return [`${v}${chartUnit}`, activeTab.label];
                                }}
                                contentStyle={{ borderRadius: 10, fontSize: 11, border: '1px solid #E5E7EB' }}
                              />
                              <Line type="monotone" dataKey="value" stroke={chartColor} strokeWidth={2}
                                dot={{ r: 4, fill: chartColor, strokeWidth: 0 }} activeDot={{ r: 6 }} />
                            </LineChart>
                          )}
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="h-[200px] flex items-center justify-center text-brand-primary/20 text-xs font-bold">
                        회고 데이터가 없습니다.
                      </div>
                    )}
                  </div>

                  {/* ── 감정모니터링 섹션 ── */}
                  <div ref={emotionSectionRef} className="space-y-4 pt-2">
                    <p className="text-[10px] font-black text-brand-primary/40 uppercase tracking-widest pb-2 border-b border-brand-surface">
                      감정모니터링
                    </p>

                    {/* 주별 / 월별 토글 */}
                    <div className="flex gap-2">
                      {(['week', 'month'] as const).map(mode => (
                        <button key={mode} onClick={() => setEmoChartMode(mode)}
                          className={`px-4 py-1.5 rounded-xl text-xs font-black transition-all ${emoChartMode === mode ? 'bg-brand-primary text-white shadow' : 'bg-brand-surface/60 text-brand-primary/50 hover:bg-brand-surface'}`}
                        >
                          {mode === 'week' ? '주별' : '월별'}
                        </button>
                      ))}
                    </div>

                    {/* 감정 차트 */}
                    {monitoringHistory.length > 0 ? (
                      <div>
                        <p className="text-[10px] font-black text-brand-primary/30 mb-2 uppercase tracking-widest">
                          감정 분포 (상위 5개, %)
                        </p>
                        <ResponsiveContainer width="100%" height={200}>
                          {emoChartMode === 'week' ? (
                            <BarChart data={emoChartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#2D5A3D66', fontWeight: 700 }} />
                              <YAxis tick={{ fontSize: 10, fill: '#2D5A3D66' }} unit="%" domain={[0, 100]} />
                              <Tooltip contentStyle={{ borderRadius: 10, fontSize: 11, border: '1px solid #E5E7EB' }} />
                              <Legend iconSize={8} wrapperStyle={{ fontSize: 10, fontWeight: 700 }} />
                              {top5EmotionKeys.map(k => {
                                const emo = ALL_EMOTION_KEYS.find(e => e.key === k)!;
                                return <Bar key={k} dataKey={k} name={emo.label} stackId="a" fill={emo.color} />;
                              })}
                            </BarChart>
                          ) : (
                            <LineChart data={emoMonthChartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                              <XAxis dataKey="week" tick={{ fontSize: 10, fill: '#2D5A3D66', fontWeight: 700 }} />
                              <YAxis tick={{ fontSize: 10, fill: '#2D5A3D66' }} />
                              <Tooltip contentStyle={{ borderRadius: 10, fontSize: 11, border: '1px solid #E5E7EB' }} />
                              <Legend iconSize={8} wrapperStyle={{ fontSize: 10, fontWeight: 700 }} />
                              {top5EmotionKeys.map(k => {
                                const emo = ALL_EMOTION_KEYS.find(e => e.key === k)!;
                                return <Line key={k} type="monotone" dataKey={k} name={emo.label} stroke={emo.color} strokeWidth={2} dot={{ r: 3, fill: emo.color, strokeWidth: 0 }} />;
                              })}
                            </LineChart>
                          )}
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="h-[200px] flex items-center justify-center text-brand-primary/20 text-xs font-bold">
                        회고 데이터가 없습니다.
                      </div>
                    )}

                    {/* 감정 인사이트 */}
                    {emoInsight && (
                      <div className="bg-brand-primary rounded-2xl px-5 py-4 text-white space-y-2">
                        <p className="text-[10px] font-black uppercase tracking-widest opacity-60">감정 인사이트</p>
                        <p className="text-sm font-black">가장 많이 느낀 감정: {emoInsight.top.label}</p>
                        <div className="flex gap-4 text-xs font-bold">
                          <span>긍정지수 <span className="text-brand-mint font-black">{emoInsight.positiveRatio}%</span></span>
                          <span>부정지수 <span className="text-brand-pink font-black">{emoInsight.negativeRatio}%</span></span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* ── 수강생 상담일지 — 항상 하단 ── */}
                  <div ref={consultSectionRef} className="pt-4 border-t border-brand-surface space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-black text-brand-primary">수강생 상담일지</h4>
                      {consultEntries.length > 0 && (
                        <button onClick={() => { setShowConsultPopup(true); setEditingIndex(null); }}
                          className="px-3 py-1 bg-brand-surface0 hover:bg-brand-surface rounded-lg text-[11px] font-black text-brand-primary transition-colors"
                        >
                          전체상담내용 확인 및 수정
                        </button>
                      )}
                    </div>

                    {consultEntries.length > 0 ? (
                      <div className="bg-brand-surface0 rounded-xl px-4 py-3">
                        <div className="flex items-center gap-2 mb-2">
                          <p className="text-[11px] font-black text-brand-primary/60">최종상담내용만 기재됩니다.</p>
                          <span className="text-[11px] font-black text-brand-mint">(상담내용 총 {consultEntries.length}개)</span>
                        </div>
                        <p className="text-[10px] font-bold text-brand-primary/50 mb-1">
                          입력: {consultEntries[consultEntries.length - 1].date}
                          {consultEntries[consultEntries.length - 1].editedAt && (
                            <span className="text-brand-primary/30 ml-2">
                              | 수정: {consultEntries[consultEntries.length - 1].editedAt}
                            </span>
                          )}
                        </p>
                        <p className="text-xs font-bold text-brand-primary/80 line-clamp-3">
                          {consultEntries[consultEntries.length - 1].content}
                        </p>
                      </div>
                    ) : (
                      <p className="text-xs text-brand-primary/20 font-bold">아직 상담 기록이 없습니다.</p>
                    )}

                    <div className="space-y-2">
                      <textarea value={newNote} onChange={e => setNewNote(e.target.value)}
                        rows={3} maxLength={1000}
                        placeholder="새 상담 내용을 입력하세요. 저장 시 오늘 날짜가 자동 기록됩니다."
                        className="w-full px-4 py-3 bg-brand-surface0 rounded-xl text-xs font-bold text-brand-primary outline-none resize-none placeholder:text-brand-primary/30 focus:ring-2 ring-brand-primary/20"
                      />
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-brand-primary/30 font-bold">{newNote.length} / 1000</span>
                        <button onClick={handleSaveNewNote} disabled={isSaving || !newNote.trim()}
                          className="px-4 py-2 bg-brand-primary text-white text-xs font-black rounded-xl hover:opacity-90 transition-opacity disabled:opacity-40"
                        >
                          {isSaving ? '저장 중...' : '기록 추가'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-48 flex items-center justify-center text-brand-primary/30 font-bold text-xs">
                  오른쪽 수강생 목록에서 이름을 클릭하세요.
                </div>
              )}
            </div>

            {/* ── 우측: 수강생 정밀 모니터링 (2/5) ──────────── */}
            <div className="lg:col-span-2 bg-white px-6 py-6 rounded-2xl border border-brand-surface shadow-sm space-y-4">
              <h3 className="text-sm font-black text-brand-primary">수강생 정밀 모니터링</h3>
              <div className="flex flex-col gap-2">
                {([
                  { value: 'all',          label: '전체 보기',           accent: 'accent-brand-primary', color: 'text-brand-primary' },
                  { value: 'highRisk',     label: '중도이탈 위험군',      accent: 'accent-brand-pink',    color: 'text-brand-pink' },
                  { value: 'everHighRisk', label: '중도이탈위험 경험군',  accent: 'accent-orange-400',    color: 'text-orange-400' },
                  { value: 'dropout',      label: '중도이탈 수강생',      accent: 'accent-brand-yellow',  color: 'text-brand-yellow' },
                ] as const).map(f => (
                  <label key={f.value} className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="studentFilter" checked={studentFilter === f.value} onChange={() => setStudentFilter(f.value)}
                      className={`w-3.5 h-3.5 ${f.accent}`}
                    />
                    <span className={`text-[11px] font-black ${f.color}`}>{f.label}</span>
                  </label>
                ))}
              </div>
              <div className="space-y-1.5 max-h-[420px] overflow-y-auto pr-1">
                {filteredStudents.length > 0 ? filteredStudents.map(s => (
                  <div key={s.id} onClick={() => handleStudentClick(s)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all ${selectedStudent?.id === s.id ? 'bg-brand-primary text-white' : 'bg-brand-surface0 hover:bg-brand-surface'}`}
                  >
                    <div className={`w-2 h-2 rounded-full shrink-0 ${s.enroll_status === 'dropout' ? 'bg-brand-yellow' : s.isHighRisk ? 'bg-brand-pink animate-pulse' : s.isEverHighRisk ? 'bg-orange-400' : 'bg-brand-mint'}`} />
                    <span className={`text-xs font-bold flex-1 ${selectedStudent?.id === s.id ? 'text-white' : 'text-brand-primary'}`}>{s.username}</span>
                    {s.isHighRisk && s.enroll_status !== 'dropout' && (
                      <span className="text-[9px] font-black text-brand-pink bg-rose-50 px-2 py-0.5 rounded-full">위험군</span>
                    )}
                    {!s.isHighRisk && s.isEverHighRisk && s.enroll_status !== 'dropout' && (
                      <span className="text-[9px] font-black text-orange-400 bg-orange-50 px-2 py-0.5 rounded-full">경험군</span>
                    )}
                    {s.enroll_status === 'dropout' && (
                      <span className="text-[9px] font-black text-brand-yellow bg-amber-50 px-2 py-0.5 rounded-full">중도이탈</span>
                    )}
                  </div>
                )) : (
                  <p className="text-center text-brand-primary/30 font-bold text-xs py-6">해당 조건의 수강생이 없습니다.</p>
                )}
              </div>

              {/* ── 리포트 받기 ────────────────────────── */}
              <div className="pt-4 border-t border-brand-surface space-y-4">
                <h4 className="text-xs font-black text-brand-primary">리포트 받기</h4>

                {/* 그룹 리포트 */}
                <div className="space-y-2">
                  <p className="text-[10px] font-black text-brand-primary/40 uppercase tracking-widest">그룹 리포트</p>
                  <div className="flex flex-col gap-1.5">
                    {([
                      { value: 'all',          label: '전체 수강생',          accent: 'accent-brand-primary', color: 'text-brand-primary/70' },
                      { value: 'highRisk',     label: '중도이탈 위험군',       accent: 'accent-brand-pink',    color: 'text-brand-pink' },
                      { value: 'everHighRisk', label: '중도이탈위험 경험군',   accent: 'accent-orange-400',    color: 'text-orange-400' },
                      { value: 'dropout',      label: '중도이탈 수강생',       accent: 'accent-brand-yellow',  color: 'text-brand-yellow' },
                    ] as const).map(opt => (
                      <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="reportFilter"
                          checked={reportFilter === opt.value}
                          onChange={() => setReportFilter(opt.value)}
                          className={`w-3.5 h-3.5 ${opt.accent}`}
                        />
                        <span className={`text-[11px] font-bold ${opt.color}`}>{opt.label}</span>
                      </label>
                    ))}
                  </div>
                  <button
                    onClick={generateGroupReport}
                    disabled={!selectedClass || students.length === 0}
                    className="w-full py-2 bg-brand-primary text-white text-xs font-black rounded-xl hover:opacity-90 transition-opacity disabled:opacity-30"
                  >
                    그룹 리포트 다운로드
                  </button>
                </div>

                {/* 개별 리포트 */}
                <div className="space-y-2">
                  <p className="text-[10px] font-black text-brand-primary/40 uppercase tracking-widest">개별 리포트</p>
                  <input
                    value={reportIndividualName}
                    onChange={e => setReportIndividualName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && generateIndividualReport()}
                    placeholder="수강생 이름 입력"
                    className="w-full px-3 py-2 bg-brand-surface0 rounded-xl text-xs font-bold text-brand-primary outline-none placeholder:text-brand-primary/30 focus:ring-2 ring-brand-primary/20"
                  />
                  <button
                    onClick={generateIndividualReport}
                    disabled={!reportIndividualName.trim() || isGenerating}
                    className="w-full py-2 bg-brand-mint text-white text-xs font-black rounded-xl hover:opacity-90 transition-opacity disabled:opacity-30"
                  >
                    {isGenerating ? '생성 중...' : '개별 리포트 다운로드'}
                  </button>
                  <p className="text-[10px] text-brand-primary/30 font-bold">* 개별 리포트에는 상담일지가 포함됩니다.</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── 상담일지 팝업 모달 (전체 기록 + 수정) ──────────────── */}
      <AnimatePresence>
        {showConsultPopup && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6"
            onClick={() => { setShowConsultPopup(false); setEditingIndex(null); }}
          >
            <motion.div initial={{ scale: 0.92, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.92, y: 20 }}
              onClick={e => e.stopPropagation()}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-xl flex flex-col"
              style={{ maxHeight: '80vh' }}
            >
              {/* 팝업 헤더 */}
              <div className="flex items-center justify-between px-8 pt-7 pb-4 border-b border-brand-surface shrink-0">
                <div>
                  <p className="text-[10px] font-black text-brand-primary/40 uppercase tracking-widest mb-0.5">수강생 상담일지</p>
                  <p className="text-sm font-black text-brand-primary">
                    {selectedStudent?.username} · 총 {consultEntries.length}개
                  </p>
                </div>
                <button onClick={() => { setShowConsultPopup(false); setEditingIndex(null); }}
                  className="w-8 h-8 bg-brand-surface0 rounded-xl flex items-center justify-center hover:bg-brand-surface transition-colors"
                >
                  <X size={15} className="text-brand-primary/60" />
                </button>
              </div>

              {/* 전체 기록 목록 */}
              <div className="overflow-y-auto px-8 py-5 space-y-3 flex-1">
                {[...consultEntries].reverse().map((entry, ri) => {
                  const realIndex = consultEntries.length - 1 - ri;
                  const isEditing = editingIndex === realIndex;
                  return (
                    <div key={realIndex} className="bg-brand-surface0 rounded-2xl px-5 py-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] font-black text-brand-primary/40">
                          입력: {entry.date}
                          {entry.editedAt && (
                            <span className="text-brand-primary/30 ml-2">| 수정: {entry.editedAt}</span>
                          )}
                        </p>
                        {!isEditing ? (
                          <button
                            onClick={() => { setEditingIndex(realIndex); setEditContent(entry.content); }}
                            className="text-[10px] font-black text-brand-primary/40 hover:text-brand-primary px-2 py-0.5 rounded-lg hover:bg-brand-surface transition-colors"
                          >
                            수정
                          </button>
                        ) : (
                          <div className="flex gap-2">
                            <button
                              onClick={() => setEditingIndex(null)}
                              className="text-[10px] font-black text-brand-primary/30 px-2 py-0.5 rounded-lg hover:bg-brand-surface transition-colors"
                            >
                              취소
                            </button>
                            <button
                              onClick={async () => {
                                if (!selectedStudent) return;
                                const editTs = (() => {
                                  const n = new Date();
                                  return n.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\. /g, '-').replace('.', '')
                                    + ' ' + n.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });
                                })();
                                const updated = consultEntries.map((e, i) =>
                                  i === realIndex ? { ...e, content: editContent, editedAt: editTs } : e
                                );
                                const token = localStorage.getItem('yummy_token');
                                await axios.post('/api/admin/consultation', {
                                  user_id: selectedStudent.id,
                                  note: JSON.stringify(updated)
                                }, { headers: { Authorization: `Bearer ${token}` } });
                                setConsultEntries(updated);
                                setEditingIndex(null);
                              }}
                              className="text-[10px] font-black text-white bg-brand-primary px-2 py-0.5 rounded-lg hover:opacity-90 transition-opacity"
                            >
                              저장
                            </button>
                          </div>
                        )}
                      </div>
                      {isEditing ? (
                        <textarea
                          value={editContent}
                          onChange={e => setEditContent(e.target.value)}
                          rows={4}
                          autoFocus
                          className="w-full px-3 py-2 bg-white border border-brand-primary/20 rounded-xl text-xs font-bold text-brand-primary outline-none resize-none focus:ring-2 ring-brand-primary/20"
                        />
                      ) : (
                        <p className="text-xs font-bold text-brand-primary leading-relaxed whitespace-pre-wrap">
                          {entry.content}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </motion.div>
  );
}
