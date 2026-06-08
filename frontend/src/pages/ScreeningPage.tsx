import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  BarChart3,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Clock,
  Gamepad2,
  HeartHandshake,
  Info,
  RotateCcw,
  Target,
  Trash2,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useChildStore } from '@/store/childStore';
import { childService } from '@/services/childService';
import { screeningService, type ScreeningResultDto } from '@/services/screeningService';
import { toast } from '@/store/toastStore';
import { PageOnboarding } from '@/components/ui/PageOnboarding';
import type { ActivityResult } from '@/types';

// ─── M-CHAT-R Soruları ───────────────────────────────────────────────────────

interface Question {
  id: string;
  text: string;
  riskAnswer: boolean; // hangi cevap riskli?
  hint?: string;
}

const MCHAT_QUESTIONS: Question[] = [
  { id: 'q1',  text: 'Birisi odanın karşısındaki bir şeyi parmağıyla gösterdiğinde çocuğunuz oraya bakıyor mu?', riskAnswer: false, hint: 'Örn: "Bak, köpek var!" dediğinizde dönerek bakıyor mu?' },
  { id: 'q2',  text: 'Çocuğunuz daha önce hiç bir şeymiş gibi yaparak oyun oynadı mı? (hayal gücü oyunu)', riskAnswer: false, hint: 'Örn: Sanki araba kullanıyormuş gibi ya da bebeğini besliyor gibi davranıyor mu?' },
  { id: 'q3',  text: 'Çocuğunuz diğer çocuklarla ilgileniyor mu?', riskAnswer: false },
  { id: 'q4',  text: 'Çocuğunuz bir şeyle eğlendiğinde sizinle göz teması kuruyor mu?', riskAnswer: false },
  { id: 'q5',  text: 'Çocuğunuz ilgilendiği bir şeyi size göstermek için parmağıyla işaret ediyor mu?', riskAnswer: false, hint: 'Bir şey istemek için değil, sadece göstermek amacıyla.' },
  { id: 'q6',  text: 'Çocuğunuz adıyla çağırıldığında tepki veriyor mu?', riskAnswer: false },
  { id: 'q7',  text: 'Çocuğunuz "öpücük atmak" veya el sallamak gibi sosyal oyunları oynuyor mu?', riskAnswer: false },
  { id: 'q8',  text: 'Çocuğunuz sizi taklit ediyor mu? (yüz ifadesi, hareket)', riskAnswer: false },
  { id: 'q9',  text: 'Çocuğunuz bir şeyi istediğinde parmağıyla işaret ediyor mu?', riskAnswer: false },
  { id: 'q10', text: 'Çocuğunuz siz gülümsediğinizde size gülümsüyor mu?', riskAnswer: false },
  { id: 'q11', text: 'Çocuğunuz kendi başına oynarken mutlu görünüyor mu?', riskAnswer: false },
  { id: 'q12', text: 'Çocuğunuz bir nesneyi size verip tekrar almak için uzatıyor mu?', riskAnswer: false },
  { id: 'q13', text: 'Çocuğunuz oynadığı bir şeyi izlemeniz için size getiriyor mu?', riskAnswer: false },
  { id: 'q14', text: 'Çocuğunuz sizi görmekten sevinç duyduğunu belli ediyor mu?', riskAnswer: false },
  { id: 'q15', text: 'Çocuğunuz aynı hareketleri ya da sesleri defalarca tekrar ediyor mu?', riskAnswer: true, hint: 'Örn: Elleri çırpma, sallanma, dönen nesnelere bakma.' },
  { id: 'q16', text: 'Çocuğunuz dokunulmaktan ya da birinin yaklaşmasından rahatsız oluyor mu?', riskAnswer: true },
  { id: 'q17', text: 'Çocuğunuz günlük rutinlerde küçük değişikliklere aşırı tepki veriyor mu?', riskAnswer: true },
  { id: 'q18', text: 'Çocuğunuz belirli nesnelere ya da konulara çok yoğun ilgi gösteriyor mu?', riskAnswer: true, hint: 'Örn: Sadece tekerleklere ya da saatlere odaklanma.' },
  { id: 'q19', text: 'Çocuğunuz oyun sırasında başka bireyleri oyuna katmaya çalışıyor mu?', riskAnswer: false },
  { id: 'q20', text: 'Çocuğunuz jest ve mimiklerle (el sallama, baş sallama vb.) iletişim kuruyor mu?', riskAnswer: false },
];

function calcRisk(answers: Record<string, boolean>, questions: Question[]) {
  let riskCount = 0;
  questions.forEach(q => {
    if (answers[q.id] === q.riskAnswer) riskCount++;
  });
  const riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' =
    riskCount <= 2 ? 'LOW' : riskCount <= 7 ? 'MEDIUM' : 'HIGH';
  return { score: riskCount, riskLevel };
}

const RISK_CONFIG = {
  LOW:    { label: 'Düşük Risk', color: 'text-green-700',  bg: 'bg-green-50',  border: 'border-green-200', icon: CheckCircle, desc: 'Çocuğunuzda otizm belirtileri düşük seviyede gözlemleniyor. Rutin gelişim takibine devam edin.' },
  MEDIUM: { label: 'Orta Risk',  color: 'text-yellow-700', bg: 'bg-yellow-50', border: 'border-yellow-200', icon: AlertCircle, desc: 'Bazı belirtiler dikkat çekici. Bir gelişim pediatristi veya çocuk psikiyatristiyle görüşmenizi öneririz.' },
  HIGH:   { label: 'Yüksek Risk', color: 'text-red-700',   bg: 'bg-red-50',   border: 'border-red-200',   icon: AlertCircle, desc: 'Belirtiler yüksek seviyede. Lütfen en kısa sürede bir uzman değerlendirmesi alın.' },
};

// ─── Çocuk Aktiviteleri ───────────────────────────────────────────────────────

const EMOTIONS = [
  { emoji: '😊', label: 'Mutlu' },
  { emoji: '😢', label: 'Üzgün' },
  { emoji: '😠', label: 'Kızgın' },
  { emoji: '😨', label: 'Korkmuş' },
  { emoji: '😲', label: 'Şaşkın' },
  { emoji: '🥰', label: 'Sevgi dolu' },
];

const ATTENTION_ROUNDS = [
  { items: ['🐱','🐱','🐱','🐶','🐱'], answer: 3 },
  { items: ['🍎','🍎','🍊','🍎','🍎'], answer: 2 },
  { items: ['⭐','⭐','⭐','⭐','🌙'], answer: 4 },
  { items: ['🔴','🔴','🔵','🔴','🔴'], answer: 2 },
  { items: ['🌸','🌸','🌸','🌻','🌸'], answer: 3 },
];

const MEMORY_PAIRS = ['🦁','🦊','🐧','🦋','🌈','🎈','⭐','🍀'];

type ActivityId = 'emotion' | 'attention' | 'memory';
type ActivityArea = 'all' | 'social' | 'attention' | 'memory';

interface ActivityGuide {
  id: ActivityId;
  emoji: string;
  title: string;
  desc: string;
  color: string;
  area: Exclude<ActivityArea, 'all'>;
  duration: string;
  skill: string;
  support: string;
  observe: string;
}


interface ActivityGameProps {
  onComplete: (score: number, total: number, detail: string) => void;
}

const ACTIVITY_GUIDES: ActivityGuide[] = [
  {
    id: 'emotion',
    emoji: '😊',
    title: 'Duygu Keşfi',
    desc: 'Yüz ifadelerini tanıma ve adlandırma',
    color: 'from-yellow-400 to-orange-400',
    area: 'social',
    duration: '5 dk',
    skill: 'Duygu farkındalığı',
    support: 'Önce siz yüz ifadesini modelleyin, sonra çocuktan seçeneklerden birini seçmesini isteyin.',
    observe: 'Doğru cevaptan çok bakma, taklit etme ve seçime katılma davranışını not edin.',
  },
  {
    id: 'attention',
    emoji: '🔍',
    title: 'Dikkat Bulmacası',
    desc: 'Farklı olanı bulma ve görsel tarama',
    color: 'from-blue-400 to-indigo-500',
    area: 'attention',
    duration: '4 dk',
    skill: 'Ortak dikkat ve görsel ayrım',
    support: 'İlk turda birlikte bakın; gerekirse farklı olan öğeyi parmağınızla yakından işaret edin.',
    observe: 'Çocuğun ekrana/nesneye ne kadar süre odaklandığını ve ipucu ihtiyacını izleyin.',
  },
  {
    id: 'memory',
    emoji: '🃏',
    title: 'Hafıza Eşleştirme',
    desc: 'Aynı kartları bulma ve sırayla oynama',
    color: 'from-green-400 to-teal-500',
    area: 'memory',
    duration: '6 dk',
    skill: 'Çalışma belleği ve sıra bekleme',
    support: 'Tur sırasını kısa cümleyle belirtin: önce sen, sonra ben. Eşleşmelerde küçük kutlama yapın.',
    observe: 'Hamle sayısı kadar bekleme toleransı ve yönerge takibini de değerlendirin.',
  },
];

function readActivityResults(source?: Record<string, unknown>): ActivityResult[] {
  const screeningActivities = source?.screeningActivities as Record<string, unknown> | undefined;
  const results = screeningActivities?.results;
  return Array.isArray(results) ? results as ActivityResult[] : [];
}

function createClientId() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function shuffleArray<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

function EmotionGame({ onComplete }: ActivityGameProps) {
  const [current, setCurrent] = useState(() => Math.floor(Math.random() * EMOTIONS.length));
  const [options, setOptions] = useState<typeof EMOTIONS>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [round, setRound] = useState(1);
  const TOTAL = 6;

  useEffect(() => {
    const correct = EMOTIONS[current];
    const others = EMOTIONS.filter((_, i) => i !== current).sort(() => Math.random() - 0.5).slice(0, 3);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOptions(shuffleArray([correct, ...others]));
    setSelected(null);
  }, [current]);

  const handleSelect = (emotion: typeof EMOTIONS[0]) => {
    if (selected !== null) return;
    const idx = EMOTIONS.indexOf(emotion);
    const nextScore = idx === current ? score + 1 : score;
    setSelected(idx);
    if (idx === current) setScore(nextScore);
    if (round >= TOTAL) {
      const detail = nextScore >= 5
        ? 'Duygu ifadelerini yüksek doğrulukla tanıdı.'
        : nextScore >= 3
          ? 'Duygu ifadelerinde orta düzey katılım gösterdi.'
          : 'Duygu ifadeleri için daha fazla modelleme gerekebilir.';
      onComplete(nextScore, TOTAL, detail);
    }
  };

  const next = () => {
    if (round >= TOTAL) return;
    setCurrent(Math.floor(Math.random() * EMOTIONS.length));
    setRound(r => r + 1);
  };

  const reset = () => { setScore(0); setRound(1); setCurrent(Math.floor(Math.random() * EMOTIONS.length)); };

  const done = round >= TOTAL && selected !== null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm text-gray-500">
        <span>Tur {round}/{TOTAL}</span>
        <span className="font-medium text-indigo-600">Puan: {score}</span>
      </div>
      <div className="text-center py-6">
        <div className="text-8xl mb-3">{EMOTIONS[current].emoji}</div>
        <p className="text-gray-600 font-medium">Bu yüz ne hissediyor?</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {options.map((e, i) => {
          const isCorrect = EMOTIONS.indexOf(e) === current;
          const isSelected = selected === EMOTIONS.indexOf(e);
          let cls = 'py-3 rounded-xl border-2 font-medium text-sm transition-all cursor-pointer ';
          if (selected === null) cls += 'border-gray-200 hover:border-indigo-300 hover:bg-indigo-50';
          else if (isCorrect) cls += 'border-green-400 bg-green-50 text-green-700';
          else if (isSelected) cls += 'border-red-400 bg-red-50 text-red-700';
          else cls += 'border-gray-100 text-gray-400';
          return (
            <button key={i} className={cls} onClick={() => handleSelect(e)}>
              {e.label}
            </button>
          );
        })}
      </div>
      {selected !== null && !done && (
        <Button className="w-full" onClick={next}>
          Sonraki <ChevronRight size={16} className="ml-1" />
        </Button>
      )}
      {done && (
        <div className="text-center p-4 bg-indigo-50 rounded-xl space-y-2">
          <p className="text-2xl font-bold text-indigo-700">{score}/{TOTAL} ✨</p>
          <p className="text-sm text-gray-600">{score >= 5 ? 'Harika! Duyguları çok iyi tanıyorsun!' : score >= 3 ? 'İyi iş! Biraz daha pratik yapalım.' : 'Tekrar deneyelim, daha iyisini yapabilirsin!'}</p>
          <Button variant="outline" size="sm" onClick={reset}><RotateCcw size={14} className="mr-1" />Tekrar Oyna</Button>
        </div>
      )}
    </div>
  );
}

function AttentionGame({ onComplete }: ActivityGameProps) {
  const [round, setRound] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const done = round >= ATTENTION_ROUNDS.length && selected !== null;
  const current = ATTENTION_ROUNDS[Math.min(round, ATTENTION_ROUNDS.length - 1)];

  const handleSelect = (idx: number) => {
    if (selected !== null) return;
    const nextScore = idx === current.answer ? score + 1 : score;
    setSelected(idx);
    if (idx === current.answer) setScore(nextScore);
    if (round + 1 >= ATTENTION_ROUNDS.length) {
      const detail = nextScore >= 4
        ? 'Görsel tarama ve farklı olanı bulmada güçlü performans gösterdi.'
        : 'Görsel tarama sırasında ek ipucu veya daha kısa tur gerekebilir.';
      onComplete(nextScore, ATTENTION_ROUNDS.length, detail);
    }
  };

  const next = () => {
    if (round + 1 >= ATTENTION_ROUNDS.length) return;
    setRound(r => r + 1);
    setSelected(null);
  };

  const reset = () => { setRound(0); setSelected(null); setScore(0); };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm text-gray-500">
        <span>Tur {round + 1}/{ATTENTION_ROUNDS.length}</span>
        <span className="font-medium text-indigo-600">Puan: {score}</span>
      </div>
      <p className="text-center text-gray-600 font-medium">Farklı olanı bul!</p>
      <div className="flex justify-center gap-3 py-4">
        {current.items.map((item, idx) => {
          const isCorrect = idx === current.answer;
          const isSelected = selected === idx;
          let cls = 'w-14 h-14 text-3xl rounded-2xl border-2 flex items-center justify-center transition-all cursor-pointer ';
          if (selected === null) cls += 'border-gray-200 hover:border-indigo-300 hover:scale-110';
          else if (isCorrect) cls += 'border-green-400 bg-green-50 scale-110';
          else if (isSelected) cls += 'border-red-400 bg-red-50';
          else cls += 'border-gray-100 opacity-50';
          return (
            <button key={idx} className={cls} onClick={() => handleSelect(idx)}>{item}</button>
          );
        })}
      </div>
      {selected !== null && !done && (
        <Button className="w-full" onClick={next}>Sonraki <ChevronRight size={16} className="ml-1" /></Button>
      )}
      {done && (
        <div className="text-center p-4 bg-indigo-50 rounded-xl space-y-2">
          <p className="text-2xl font-bold text-indigo-700">{score}/{ATTENTION_ROUNDS.length} 🎯</p>
          <p className="text-sm text-gray-600">{score >= 4 ? 'Süper dikkat! Gözünden kaçmıyor!' : 'Devam et, daha iyi olacaksın!'}</p>
          <Button variant="outline" size="sm" onClick={reset}><RotateCcw size={14} className="mr-1" />Tekrar Oyna</Button>
        </div>
      )}
    </div>
  );
}

function MemoryGame({ onComplete }: ActivityGameProps) {
  const allCards = [...MEMORY_PAIRS, ...MEMORY_PAIRS];
  const [cards] = useState(() => shuffleArray(allCards.map((emoji, i) => ({ id: i, emoji, flipped: false, matched: false }))));
  const [board, setBoard] = useState(cards);
  const [flipped, setFlipped] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const matched = board.filter(c => c.matched).length;
  const done = matched === board.length;

  const handleFlip = (idx: number) => {
    if (board[idx].flipped || board[idx].matched || flipped.length === 2) return;
    const newBoard = board.map((c, i) => i === idx ? { ...c, flipped: true } : c);
    const newFlipped = [...flipped, idx];
    setBoard(newBoard);
    setFlipped(newFlipped);

    if (newFlipped.length === 2) {
      setMoves(m => m + 1);
      const [a, b] = newFlipped;
      if (newBoard[a].emoji === newBoard[b].emoji) {
        setTimeout(() => {
          setBoard(prev => prev.map((c, i) => (i === a || i === b) ? { ...c, matched: true } : c));
          setFlipped([]);
          if (matched + 2 === board.length) {
            onComplete(MEMORY_PAIRS.length, MEMORY_PAIRS.length, `${moves + 1} hamlede tüm kartları eşleştirdi.`);
          }
        }, 400);
      } else {
        setTimeout(() => {
          setBoard(prev => prev.map((c, i) => (i === a || i === b) ? { ...c, flipped: false } : c));
          setFlipped([]);
        }, 800);
      }
    }
  };

  const reset = () => {
    setBoard(shuffleArray(allCards.map((emoji, i) => ({ id: i, emoji, flipped: false, matched: false }))));
    setFlipped([]);
    setMoves(0);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm text-gray-500">
        <span>Eşleşen: {matched / 2}/{MEMORY_PAIRS.length}</span>
        <span className="font-medium text-indigo-600">Hamle: {moves}</span>
      </div>
      <p className="text-center text-gray-600 font-medium text-sm">Aynı kartları eşleştir!</p>
      <div className="grid grid-cols-4 gap-2 max-w-sm mx-auto sm:max-w-none">
        {board.map((card, idx) => (
          <button
            key={idx}
            onClick={() => handleFlip(idx)}
            className={`aspect-square rounded-xl text-2xl flex items-center justify-center border-2 transition-all cursor-pointer ${
              card.matched
                ? 'border-green-300 bg-green-50 opacity-60'
                : card.flipped
                  ? 'border-indigo-300 bg-indigo-50'
                  : 'border-gray-200 bg-gray-50 hover:border-indigo-200'
            }`}
          >
            {card.flipped || card.matched ? card.emoji : '❓'}
          </button>
        ))}
      </div>
      {done && (
        <div className="text-center p-4 bg-indigo-50 rounded-xl space-y-2">
          <p className="text-2xl font-bold text-indigo-700">🎉 Tebrikler!</p>
          <p className="text-sm text-gray-600">{moves} hamlede tamamladın!</p>
          <Button variant="outline" size="sm" onClick={reset}><RotateCcw size={14} className="mr-1" />Tekrar Oyna</Button>
        </div>
      )}
    </div>
  );
}

// ─── Ana Sayfa ────────────────────────────────────────────────────────────────

export function ScreeningPage() {
  const [tab, setTab] = useState<'screening' | 'activities'>('screening');

  // Tarama
  const { children, setChildren, updateChild, selectedChild, setSelectedChild } = useChildStore();
  const selectedChildId = selectedChild?.id ?? '';
  const [step, setStep] = useState<'select' | 'quiz' | 'result'>('select');
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<string, boolean>>({});
  const [finalAnswers, setFinalAnswers] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [pastResults, setPastResults] = useState<ScreeningResultDto[]>([]);
  const [loadingResults, setLoadingResults] = useState(false);
  const [result, setResult] = useState<{ score: number; riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' } | null>(null);

  // Aktiviteler
  const [activeGame, setActiveGame] = useState<ActivityId | null>(null);
  const [activityFilter, setActivityFilter] = useState<ActivityArea>('all');
  const [activityResults, setActivityResults] = useState<ActivityResult[]>([]);
  const [savingActivityResult, setSavingActivityResult] = useState(false);
  const latestResult = pastResults[0] || null;
  const answeredCount = Object.keys(answers).length;
  const filteredGames = useMemo(
    () => activityFilter === 'all'
      ? ACTIVITY_GUIDES
      : ACTIVITY_GUIDES.filter((activity) => activity.area === activityFilter),
    [activityFilter]
  );

  useEffect(() => {
    childService.getAll().then(c => { setChildren(c); if (c.length && !selectedChild) setSelectedChild(c[0]); }).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setChildren]);

  useEffect(() => {
    if (!selectedChildId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPastResults([]);
      return;
    }
    setLoadingResults(true);
    screeningService.getByChild(selectedChildId)
      .then(setPastResults)
      .catch(() => {})
      .finally(() => setLoadingResults(false));
  }, [selectedChildId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setActivityResults(readActivityResults(selectedChild?.privacySettings));
  }, [selectedChild]);

  const handleAnswer = (answer: boolean) => {
    const q = MCHAT_QUESTIONS[currentQ];
    const nextAnswers = { ...answers, [q.id]: answer };
    setAnswers(nextAnswers);
    if (currentQ + 1 < MCHAT_QUESTIONS.length) {
      setCurrentQ(c => c + 1);
    } else {
      const { score, riskLevel } = calcRisk(nextAnswers, MCHAT_QUESTIONS);
      setFinalAnswers(nextAnswers);
      setResult({ score, riskLevel });
      setStep('result');
    }
  };

  const handleSaveResult = async () => {
    if (!result || !selectedChildId) return;
    setSaving(true);
    try {
      const saved = await screeningService.save({
        childId: selectedChildId,
        testType: 'MCHAT',
        score: result.score,
        riskLevel: result.riskLevel,
        answers: finalAnswers,
      });
      setPastResults(prev => [saved, ...prev]);
      toast.success('Tarama sonucu profil kaydedildi.');
    } catch {
      toast.error('Kaydedilemedi, lütfen tekrar deneyin.');
    }
    setSaving(false);
  };

  const handleDeleteResult = async (id: string) => {
    try {
      await screeningService.delete(id);
      setPastResults(prev => prev.filter(r => r.id !== id));
      toast.success('Sonuç silindi.');
    } catch {
      toast.error('Silinemedi.');
    }
  };

  const saveActivityResult = async (score: number, total: number, detail: string) => {
    if (!selectedChild || !activeGameMeta) {
      toast.error('Aktivite sonucunu kaydetmek için önce çocuk seçin.');
      return;
    }

    const nextResult: ActivityResult = {
      id: createClientId(),
      childId: selectedChild.id,
      activityId: activeGameMeta.id,
      activityTitle: activeGameMeta.title,
      score,
      total,
      detail,
      completedAt: new Date().toISOString(),
    };
    const nextResults = [nextResult, ...activityResults].slice(0, 30);
    setActivityResults(nextResults);

    try {
      setSavingActivityResult(true);
      const updatedChild = await childService.update(selectedChild.id, {
        ...selectedChild,
        privacySettings: {
          ...(selectedChild.privacySettings || {}),
          screeningActivities: {
            results: nextResults,
          },
        },
      });
      updateChild(updatedChild);
      toast.success('Aktivite sonucu çocuğa özel kaydedildi.');
    } catch {
      setActivityResults(activityResults);
      toast.error('Aktivite sonucu kaydedilemedi.');
    } finally {
      setSavingActivityResult(false);
    }
  };

  const resetScreening = () => {
    setStep('select');
    setCurrentQ(0);
    setAnswers({});
    setFinalAnswers({});
    setResult(null);
  };

  const startScreening = () => {
    if (!selectedChildId) { toast.error('Lütfen bir çocuk seçin.'); return; }
    setCurrentQ(0);
    setAnswers({});
    setFinalAnswers({});
    setResult(null);
    setStep('quiz');
  };

  const progress = ((step === 'result' ? MCHAT_QUESTIONS.length : currentQ) / MCHAT_QUESTIONS.length) * 100;
  const q = MCHAT_QUESTIONS[currentQ];
  const riskCfg = result ? RISK_CONFIG[result.riskLevel] : null;
  const activeGameMeta = activeGame ? ACTIVITY_GUIDES.find((game) => game.id === activeGame) : null;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageOnboarding
        pageId="screening"
        title="Gelişim Taraması ve Aktiviteler"
        description="Bilimsel ölçeklere dayalı erken dönem belirti taraması yapın ve çocuğunuzla eğlenceli aktiviteler oynayarak gelişimini destekleyin."
        steps={[
          {
            icon: <ClipboardList size={20} />,
            title: "Belirti Tarama",
            description: "20 soruluk testi çözerek çocuğunuzun otizm risk düzeyini erken dönemde değerlendirin."
          },
          {
            icon: <Gamepad2 size={20} />,
            title: "Eğitici Aktiviteler",
            description: "Duygu, dikkat ve hafıza odaklı mini oyunlarla çocuğunuzun gelişimine destek olun."
          }
        ]}
      />

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">Tarama & Aktiviteler</p>
            <h1 className="mt-1 text-2xl font-semibold text-slate-950">Gelişim sinyallerini sakin bir akışla izle</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Belirti taraması bilgilendirme amaçlıdır; aktiviteler ise günlük kısa tekrarlar için hazırlanmıştır.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-slate-50 px-3 py-3">
              <p className="text-xl font-semibold text-slate-950">{children.length}</p>
              <p className="text-xs text-slate-500">Profil</p>
            </div>
            <div className="rounded-xl bg-slate-50 px-3 py-3">
              <p className="text-xl font-semibold text-slate-950">{pastResults.length}</p>
              <p className="text-xs text-slate-500">Tarama</p>
            </div>
            <div className="rounded-xl bg-slate-50 px-3 py-3">
              <p className="text-xl font-semibold text-slate-950">{ACTIVITY_GUIDES.length}</p>
              <p className="text-xs text-slate-500">Aktivite</p>
            </div>
          </div>
        </div>
      </section>

      <div className="flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
        <AlertCircle size={18} className="mt-0.5 shrink-0" />
        <div>
          <p className="font-extrabold">Tarama sonucu tanı değildir</p>
          <p className="mt-1">
            Bu test bilgilendirme amaçlıdır ve otizm tanısı koymaz. Orta veya yüksek risk sonucu, gecikme şüphesi ya da aile kaygısı varsa çocuk psikiyatristi, gelişim pediatristi veya ilgili uzmana başvurun.
          </p>
          <Link to="/tibbi-uyari" className="mt-2 inline-flex text-xs font-extrabold text-amber-950 underline">
            Tıbbi güvenlik uyarılarını oku
          </Link>
        </div>
      </div>

      {/* Sekmeler */}
      <div className="flex gap-1 rounded-xl bg-gray-100 p-1">
        {[
          { key: 'screening', icon: ClipboardList, label: 'Belirti Tarama' },
          { key: 'activities', icon: Gamepad2, label: 'Çocuk Aktiviteleri' },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as typeof tab)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${
              tab === t.key ? 'bg-white shadow-sm text-indigo-700' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <t.icon size={16} />
            {t.label}
          </button>
        ))}
      </div>

      {/* ─── TARAMA SEKMESİ ─── */}
      {tab === 'screening' && (
        <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-4">
          {/* Uyarı */}
          <div className="flex gap-3 p-3 bg-blue-50 rounded-xl border border-blue-100">
            <Info size={18} className="text-blue-500 shrink-0 mt-0.5" />
            <p className="text-xs text-blue-700">
              Bu tarama M-CHAT-R'a dayalı bilgilendirme amaçlı bir araçtır. <strong>Klinik tanı yerine geçmez.</strong> Sonuçlarınızı mutlaka bir uzmanla paylaşın.
            </p>
          </div>

          {step === 'select' && (
            <Card>
              <h2 className="font-semibold text-gray-900 mb-4">Taramayı Kimin İçin Yapacaksınız?</h2>
              <div className="space-y-2 mb-4">
                {children.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">Önce "Çocuklarım" sayfasından çocuk profili ekleyin.</p>
                ) : (
                  children.map(c => (
                    <button
                      key={c.id}
                      onClick={() => setSelectedChild(c)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all cursor-pointer text-left ${
                        selectedChildId === c.id ? 'border-indigo-500 bg-indigo-50' : 'border-gray-100 hover:border-gray-200'
                      }`}
                    >
                      <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold shrink-0">
                        {c.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{c.name}</p>
                        {c.birthDate && <p className="text-xs text-gray-400">{c.birthDate}</p>}
                      </div>
                      {selectedChildId === c.id && <CheckCircle size={18} className="text-indigo-500 ml-auto" />}
                    </button>
                  ))
                )}
              </div>

              {/* Geçmiş sonuçlar */}
              {selectedChildId && (loadingResults || pastResults.length > 0) && (
                <div className="mb-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Geçmiş Taramalar</p>
                  {loadingResults ? (
                    <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-500">
                      Geçmiş taramalar yükleniyor...
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {pastResults.map(r => {
                      const cfg = RISK_CONFIG[r.riskLevel];
                      const Icon = cfg.icon;
                      return (
                        <div key={r.id} className={`flex items-center gap-3 p-2.5 rounded-xl border ${cfg.border} ${cfg.bg}`}>
                          <Icon size={16} className={cfg.color} />
                          <div className="flex-1 min-w-0">
                            <span className={`text-sm font-medium ${cfg.color}`}>{cfg.label}</span>
                            <span className="text-xs text-gray-400 ml-2">Skor: {r.score}/20</span>
                            {r.createdAt && (
                              <p className="text-xs text-gray-400">{new Date(r.createdAt).toLocaleDateString('tr-TR')}</p>
                            )}
                          </div>
                          {r.id && (
                            <button
                              onClick={() => handleDeleteResult(r.id!)}
                              className="p-1 text-gray-300 hover:text-red-500 transition-colors cursor-pointer"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      );
                      })}
                    </div>
                  )}
                </div>
              )}

              <Button className="w-full" onClick={startScreening} disabled={!selectedChildId}>
                Taramayı Başlat <ChevronRight size={16} className="ml-1" />
              </Button>
            </Card>
          )}

          {step === 'quiz' && (
            <Card>
              {/* Progress */}
              <div className="mb-5">
                <div className="flex justify-between text-xs text-gray-400 mb-1.5">
                  <span>Soru {currentQ + 1} / {MCHAT_QUESTIONS.length}</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-500 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              <p className="text-base font-medium text-gray-900 mb-2">{q.text}</p>
              {q.hint && <p className="text-xs text-gray-400 mb-5 italic">{q.hint}</p>}
              <p className="mb-3 text-xs font-medium text-slate-400">
                Yanıtlanan: {answeredCount}/{MCHAT_QUESTIONS.length}
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => handleAnswer(true)}
                  className="flex-1 py-4 rounded-2xl border-2 border-green-200 bg-green-50 text-green-700 font-semibold text-base hover:border-green-400 hover:bg-green-100 transition-all cursor-pointer"
                >
                  ✅ Evet
                </button>
                <button
                  onClick={() => handleAnswer(false)}
                  className="flex-1 py-4 rounded-2xl border-2 border-red-100 bg-red-50 text-red-600 font-semibold text-base hover:border-red-300 hover:bg-red-100 transition-all cursor-pointer"
                >
                  ❌ Hayır
                </button>
              </div>

              {currentQ > 0 && (
                <button
                  onClick={() => setCurrentQ(c => c - 1)}
                  className="mt-3 flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  <ChevronLeft size={14} /> Önceki soruya dön
                </button>
              )}
            </Card>
          )}

          {step === 'result' && result && riskCfg && (
            <div className="space-y-4">
              <Card>
                <div className={`flex items-start gap-4 p-4 rounded-xl border ${riskCfg.border} ${riskCfg.bg}`}>
                  <riskCfg.icon size={28} className={riskCfg.color} />
                  <div>
                    <p className={`text-xl font-bold ${riskCfg.color}`}>{riskCfg.label}</p>
                    <p className="text-sm text-gray-500 mt-0.5">Risk skoru: {result.score} / 20</p>
                    <p className="text-sm text-gray-700 mt-2">{riskCfg.desc}</p>
                  </div>
                </div>

                <div className="mt-4 rounded-2xl border border-gray-100 bg-white p-4">
                  <p className="text-sm font-semibold text-gray-900">Sonraki adım planı</p>
                  <p className="mt-1 text-sm text-gray-600">
                    {result.riskLevel === 'LOW'
                      ? 'Sonucu çocuk profiline kaydedin, haftalık kısa aktivitelerle izleme notlarını biriktirin.'
                      : 'Sonucu çocuk profiline kaydedin ve uzman değerlendirmesi için randevu/rapor akışını başlatın.'}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {selectedChildId && (
                      <Link to={`/cocuklarim/${selectedChildId}`}>
                        <Button size="sm" variant="outline">Çocuk Profiline Git</Button>
                      </Link>
                    )}
                    <Link to="/tedavi">
                      <Button size="sm" variant="outline">Tedavi Planı</Button>
                    </Link>
                    <Link to={result.riskLevel === 'LOW' ? '/tarama' : '/randevular'}>
                      <Button size="sm">
                        {result.riskLevel === 'LOW' ? 'Aktiviteyle Devam Et' : 'Randevu Planla'}
                      </Button>
                    </Link>
                  </div>
                </div>

                {/* Skor göstergesi */}
                <div className="mt-4">
                  <div className="flex justify-between text-xs text-gray-400 mb-1">
                    <span>0 — Düşük</span>
                    <span>8+ — Yüksek</span>
                  </div>
                  <div className="h-3 bg-gray-100 rounded-full overflow-hidden flex">
                    <div className="h-full bg-green-400" style={{ width: '15%' }} />
                    <div className="h-full bg-yellow-400" style={{ width: '25%' }} />
                    <div className="h-full bg-red-400" style={{ width: '60%' }} />
                  </div>
                  <div
                    className="relative mt-1"
                    style={{ left: `${Math.min((result.score / 20) * 100, 96)}%` }}
                  >
                    <div className="w-2 h-2 bg-gray-700 rounded-full" />
                  </div>
                </div>
              </Card>

              {/* Soru-bazlı breakdown */}
              <Card className="mt-4">
                <p className="text-sm font-semibold text-gray-900 mb-3">Soru Bazında Sonuçlar</p>
                <div className="space-y-1.5">
                  {MCHAT_QUESTIONS.map(q => {
                    const answered = finalAnswers[q.id];
                    const isRisk = answered === q.riskAnswer;
                    if (answered === undefined) return null;
                    return (
                      <div key={q.id} className={`flex items-start gap-2 p-2 rounded-xl text-xs ${isRisk ? 'bg-red-50 border border-red-100' : 'bg-green-50 border border-green-100'}`}>
                        <span className={`mt-0.5 shrink-0 font-bold ${isRisk ? 'text-red-500' : 'text-green-600'}`}>
                          {isRisk ? '⚠' : '✓'}
                        </span>
                        <span className={`leading-snug ${isRisk ? 'text-red-800' : 'text-green-800'}`}>{q.text}</span>
                      </div>
                    );
                  })}
                </div>
                <p className="text-xs text-gray-400 mt-3">
                  ⚠ riskli yanıt &nbsp;·&nbsp; ✓ beklenen yanıt
                </p>
              </Card>

              <div className="flex gap-3">
                <Button variant="outline" onClick={resetScreening} className="flex-1">
                  <RotateCcw size={15} className="mr-1" /> Yeni Tarama
                </Button>
                <Button onClick={handleSaveResult} loading={saving} className="flex-1">
                  Profil Kaydet
                </Button>
              </div>
            </div>
          )}
          </div>

          <aside className="space-y-4">
            <Card className="p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 text-primary-700">
                  <HeartHandshake size={20} />
                </div>
                <div>
                  <h2 className="font-semibold text-slate-950">Seçili profil</h2>
                  <p className="text-sm text-slate-500">{selectedChild?.name || 'Henüz çocuk seçilmedi'}</p>
                </div>
              </div>
              <div className="mt-4 rounded-xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Son durum</p>
                {latestResult ? (
                  <div className="mt-2">
                    <p className={`text-sm font-semibold ${RISK_CONFIG[latestResult.riskLevel].color}`}>
                      {RISK_CONFIG[latestResult.riskLevel].label}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">Skor: {latestResult.score}/20</p>
                  </div>
                ) : (
                  <p className="mt-2 text-sm leading-6 text-slate-500">Bu profil için kayıtlı tarama görünmüyor.</p>
                )}
              </div>
            </Card>

            <Card className="p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
                  <Target size={20} />
                </div>
                <div>
                  <h2 className="font-semibold text-slate-950">Sonraki adım</h2>
                  <p className="text-sm text-slate-500">Sonuçtan bağımsız takip önerisi</p>
                </div>
              </div>
              <div className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
                <p>Yanıtları günlük gözlemlerle birlikte değerlendirin.</p>
                <p>Orta veya yüksek riskte uzman görüşü alın; bu ekran tanı koymaz.</p>
                <p>Aktiviteler sekmesinde kısa, baskısız tekrarlarla devam edin.</p>
              </div>
            </Card>
          </aside>
        </div>
      )}

      {/* ─── AKTİVİTELER SEKMESİ ─── */}
      {tab === 'activities' && (
        <div className="space-y-4">
          <Card className="p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="font-semibold text-slate-950">Aktivite sonuçları hangi çocuk için kaydedilsin?</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Seçilen çocuğun aktivite geçmişi ebeveyn panelinde burada görünür.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {children.map((child) => (
                  <button
                    key={child.id}
                    onClick={() => setSelectedChild(child)}
                    className={`rounded-xl border px-4 py-2 text-sm font-semibold transition-colors ${
                      selectedChildId === child.id
                        ? 'border-primary-200 bg-primary-50 text-primary-700'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {child.name}
                  </button>
                ))}
              </div>
            </div>
          </Card>

          {!activeGame ? (
            <>
              <Card className="p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-950">Günlük kısa aktiviteler</h2>
                    <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
                      Her aktivite 4-6 dakikalık kısa tekrar için tasarlandı. Yanıt kadar katılım, bekleme ve ipucu ihtiyacını da gözlemleyin.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 rounded-xl bg-slate-100 p-1">
                    {([
                      ['all', 'Tümü'],
                      ['social', 'Sosyal'],
                      ['attention', 'Dikkat'],
                      ['memory', 'Hafıza'],
                    ] as const).map(([value, label]) => (
                      <button
                        key={value}
                        onClick={() => setActivityFilter(value)}
                        className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                          activityFilter === value ? 'bg-white text-primary-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </Card>

              <div className="grid gap-4 lg:grid-cols-3">
                {filteredGames.map(game => (
                  <button
                    key={game.id}
                    onClick={() => setActiveGame(game.id)}
                    className="group rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition-all hover:border-indigo-200 hover:shadow-md"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${game.color} text-2xl transition-transform group-hover:scale-105`}>
                        {game.emoji}
                      </div>
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                        <Clock size={12} />
                        {game.duration}
                      </span>
                    </div>
                    <p className="mt-4 font-semibold text-slate-950">{game.title}</p>
                    <p className="mt-1 text-sm leading-6 text-slate-500">{game.desc}</p>
                    <div className="mt-4 rounded-xl bg-slate-50 p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Hedef</p>
                      <p className="mt-1 text-sm font-medium text-slate-700">{game.skill}</p>
                    </div>
                  </button>
                ))}
              </div>

              <Card className="p-5">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="font-semibold text-slate-950">Aktivite geçmişi</h2>
                    <p className="text-sm text-slate-500">
                      {selectedChild ? `${selectedChild.name} için kaydedilen son sonuçlar` : 'Sonuçları görmek için çocuk seçin'}
                    </p>
                  </div>
                  {savingActivityResult && (
                    <span className="text-sm font-medium text-primary-600">Kaydediliyor...</span>
                  )}
                </div>

                {activityResults.length === 0 ? (
                  <p className="mt-4 rounded-xl bg-slate-50 px-4 py-5 text-sm leading-6 text-slate-500">
                    Bu çocuk için henüz aktivite sonucu yok. Bir aktiviteyi tamamladığınızda sonuç burada görünecek.
                  </p>
                ) : (
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    {activityResults.slice(0, 6).map((item) => (
                      <div key={item.id} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-slate-950">{item.activityTitle}</p>
                            <p className="mt-1 text-sm text-slate-500">
                              {new Date(item.completedAt).toLocaleDateString('tr-TR')} • {new Date(item.completedAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                          <span className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-primary-700 ring-1 ring-slate-100">
                            {item.score}/{item.total}
                          </span>
                        </div>
                        <p className="mt-3 text-sm leading-6 text-slate-600">{item.detail}</p>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </>
          ) : (
            <div className="grid gap-5 lg:grid-cols-[1fr_0.85fr]">
              <Card>
                <div className="mb-5 flex items-center gap-3">
                  <button
                    onClick={() => setActiveGame(null)}
                    className="rounded-xl p-2 transition-colors hover:bg-gray-100"
                  >
                    <ChevronLeft size={20} className="text-gray-600" />
                  </button>
                  <div>
                    <h2 className="font-semibold text-gray-900">{activeGameMeta?.title}</h2>
                    <p className="text-sm text-gray-500">{activeGameMeta?.skill}</p>
                  </div>
                </div>
                {!selectedChild && (
                  <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                    Sonucun kaydedilebilmesi için önce çocuk seçin.
                  </div>
                )}
                {activeGame === 'emotion' && <EmotionGame onComplete={saveActivityResult} />}
                {activeGame === 'attention' && <AttentionGame onComplete={saveActivityResult} />}
                {activeGame === 'memory' && <MemoryGame onComplete={saveActivityResult} />}
              </Card>

              {activeGameMeta && (
                <aside className="space-y-4">
                  <Card className="p-5">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${activeGameMeta.color} text-2xl`}>
                        {activeGameMeta.emoji}
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-950">{activeGameMeta.title}</h3>
                        <p className="text-sm text-slate-500">{activeGameMeta.duration} uygulama</p>
                      </div>
                    </div>
                    <div className="mt-4 grid gap-3">
                      <div className="rounded-xl bg-slate-50 p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Ebeveyn desteği</p>
                        <p className="mt-1 text-sm leading-6 text-slate-600">{activeGameMeta.support}</p>
                      </div>
                      <div className="rounded-xl bg-slate-50 p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Gözlemle</p>
                        <p className="mt-1 text-sm leading-6 text-slate-600">{activeGameMeta.observe}</p>
                      </div>
                    </div>
                  </Card>

                  <Card className="p-5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                        <BarChart3 size={20} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-950">Kayıt önerisi</h3>
                        <p className="text-sm text-slate-500">Oyun sonrası kısa not</p>
                      </div>
                    </div>
                    <p className="mt-4 text-sm leading-6 text-slate-600">
                      Oyun bitince Gelişim Notları sayfasına “ipucu ile yaptı”, “bekledi”, “zorlandı” gibi tek cümlelik bir gözlem eklemek takip kalitesini artırır.
                    </p>
                  </Card>
                </aside>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
