import {
  useState, useRef, useEffect, useCallback, useMemo,
} from 'react';
import {
  MessageCircle, X, Send, Bot, User, Sparkles,
  Plus, Trash2, Clock, Copy,
  Download, Mic, MicOff, History, ChevronLeft, StopCircle,
  Volume2, Maximize2, Minimize2, RefreshCw, Search,
  UserCheck, AlertCircle, BookOpen, Calendar, Shield,
  WifiOff, Check, CheckCheck, PhoneCall,
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { chatbotService, type ChatMessage, type ConversationTurn, type ChatError } from '@/services/chatbotService';
import { toast } from '@/store/toastStore';

/* ─── Sabitler ──────────────────────────────────────────── */

const SESSIONS_KEY = 'autibot_sessions';
const ACTIVE_KEY   = 'autibot_active_session';
const MAX_SESSIONS = 10;
const MAX_CHARS    = 1000;

type BrowserSpeechRecognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const PAGE_MAP: Record<string, string> = {
  '/':                 'Ana Sayfa',
  '/cocuklarim':       'Çocuklarım',
  '/tedavi':           'Tedavi',
  '/notlar':           'Notlar',
  '/takvim':           'Takvim',
  '/mesajlar':         'Mesajlar',
  '/forum':            'Forum',
  '/ayarlar':          'Ayarlar',
  '/bilgi-bankasi':    'Bilgi Bankası',
  '/uzmanlar':         'Uzmanlar',
  '/randevular':       'Randevular',
  '/bep-raporu':       'BEP Oluşturucu',
  '/tarama':           'Tarama',
  '/gunluk-takip':     'Günlük Takip',
  '/gelisim-paneli':   'Analitik',
  '/sosyal-hikayeler': 'Sosyal Hikayeler',
  '/kriz-rehberi':     'Kriz Kılavuzu',
  '/gorevler':         'Görevler',
  '/rutinler':         'Rutin Yönetimi',
};

const QUICK_SUGGESTIONS = [
  'Otizm belirtileri nelerdir?',
  'BEP nasıl oluşturulur?',
  'ABA terapisi nedir?',
  'Rutin yönetimi nasıl yapılır?',
  'Platform nasıl kullanılır?',
];

// Sayfa bazlı akıllı öneriler
const PAGE_SUGGESTIONS: Record<string, string[]> = {
  '/cocuklarim':       ['Çocuk profili nasıl oluştururum?', 'Tanı bilgisi nereye girilir?', 'Profil fotoğrafı nasıl eklenir?'],
  '/tedavi':           ['ABA terapisi nedir?', 'Tedavi hedefi nasıl belirlenir?', 'Seans sıklığı ne olmalı?'],
  '/takvim':           ['Takvime nasıl etkinlik eklerim?', 'Tekrarlayan hatırlatma nasıl ayarlanır?'],
  '/mesajlar':         ['Uzmanla nasıl yazışabilirim?', 'Mesaj gönderemiyor musunuz?'],
  '/randevular':       ['Randevu nasıl alınır?', 'İptal politikası nedir?', 'Müsaitlik saati nasıl ayarlanır?'],
  '/gunluk-takip':     ['İlaç takibi nasıl yapılır?', 'Uyku kaydı neden önemli?'],
  '/gelisim-paneli':   ['Gelişim grafiklerini nasıl okuyabilirim?', 'Hangi metrikler izlenmeli?'],
  '/forum':            ['Nasıl soru sorabilirim?', 'Anonim paylaşım mümkün mü?'],
  '/gruplar':          ['Gruba nasıl katılırım?', 'Kendi grubumu oluşturabilir miyim?'],
  '/bilgi-bankasi':    ['Otizm hakkında hangi makaleler var?', 'ABA kaynakları nerede?'],
  '/uzmanlar':         ['Uzman nasıl seçilir?', 'Randevu almak için ne yapmalıyım?'],
  '/sosyal-hikayeler': ['Sosyal hikaye nedir?', 'Kendi hikayemi nasıl oluştururum?'],
  '/kriz-rehberi':     ['Meltdown sırasında ne yapmalıyım?', 'Tetikleyiciler nasıl belirlenir?'],
  '/davranis-gunlugu': ['ABC kaydı nedir?', 'Hangi davranışları kayıt etmeliyim?'],
  '/rutinler':         ['Görsel rutin tablosu nasıl hazırlanır?', 'Rutin ne kadar esnek olmalı?'],
  '/beslenme':         ['Otizmde beslenme hassasiyeti neden yaygın?', 'Hangi besinlerden kaçınılmalı?'],
  '/bep-raporu':       ['BEP hedefleri nasıl yazılır?', 'BEP toplantısına nasıl hazırlanırım?'],
  '/tarama':           ['Tarama sonuçlarım ne anlama geliyor?', 'Hangi tarama araçları kullanılıyor?'],
  '/ebeveyn-refahi':   ['Tükenmişlik belirtileri nelerdir?', 'Hangi destek hizmetlerine başvurabilirim?'],
  '/haklar-rehberi':   ['Çocuğumun eğitim hakları nelerdir?', 'Engelli kimlik kartı nasıl alınır?'],
};

// Kriz anahtar kelimeleri
const CRISIS_KEYWORDS = [
  'kendime zarar', 'intihar', 'ölmek istiyorum', 'yaşamak istemiyorum',
  'kendini vurdu', 'kendini kesti', 'kriz', 'meltdown', 'kendini incitti',
  'çok korkuyorum', 'kontrol edemiyorum', 'tehlikeli', 'acil yardım',
];

// Karşılama ekranı konu kategorileri
const TOPIC_CATEGORIES = [
  { emoji: '🎓', label: 'Eğitim & Terapi', q: 'Otizm için hangi eğitim ve terapi yöntemleri var?' },
  { emoji: '🏥', label: 'Tanı & Değerlendirme', q: 'Otizm tanı süreci nasıl işler, nereden başlamalıyım?' },
  { emoji: '👨‍👩‍👧', label: 'Aile Rehberi', q: 'Ebeveyn olarak çocuğuma nasıl destek olabilirim?' },
  { emoji: '🚨', label: 'Kriz Yönetimi', q: 'Kriz veya meltdown anında ne yapmalıyım?' },
  { emoji: '⚖️', label: 'Haklar & Kurumlar', q: 'Çocuğumun yasal hakları ve yararlanabileceğim kurumlar nelerdir?' },
  { emoji: '🔧', label: 'Platform Kullanımı', q: 'Platform nasıl kullanılır, nereden başlamalıyım?' },
];

const FOLLOWUP_MAP: Array<{ keywords: string[]; suggestions: string[] }> = [
  { keywords: ['aba', 'davranış', 'uygulam'],           suggestions: ['ABA seansları ne kadar sürmeli?', 'ABA terapisti nasıl bulunur?'] },
  { keywords: ['bep', 'bireyselleştirilmiş', 'plan'],   suggestions: ['BEP hedefleri nasıl belirlenir?', 'BEP\'i kim hazırlar?'] },
  { keywords: ['rutin', 'program', 'çizelge'],           suggestions: ['Görsel rutin tablosu nasıl hazırlanır?', 'Rutini bozmak neden zor?'] },
  { keywords: ['iletişim', 'konuş', 'dil', 'pecs'],     suggestions: ['PECS nedir ve nasıl kullanılır?', 'AAC cihazları hakkında bilgi ver'] },
  { keywords: ['kriz', 'meltdown', 'öfke', 'agresif'],  suggestions: ['Kriz anında güvenliği nasıl sağlarım?', 'Tetikleyicileri nasıl belirlerim?'] },
  { keywords: ['duyu', 'sensory', 'hassas', 'dokunm'],   suggestions: ['Duyusal entegrasyon terapisi nedir?', 'Duyu odası nasıl oluşturulur?'] },
  { keywords: ['okul', 'eğitim', 'öğretmen', 'özel'],   suggestions: ['Okula uyumu nasıl kolaylaştırırım?', 'Öğretmenle nasıl iletişim kurmalıyım?'] },
  { keywords: ['sosyal', 'arkadaş', 'oyun', 'hikaye'],  suggestions: ['Sosyal hikaye örneği verir misin?', 'Akran etkileşimini nasıl artırabilirim?'] },
];

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const WELCOME_FEATURES = [
  { icon: BookOpen,  title: 'Bilgi',     desc: 'Otizm hakkında güncel bilgiler' },
  { icon: Calendar,  title: 'Rehber',    desc: 'Platform kullanım rehberi' },
  { icon: Shield,    title: 'Destek',    desc: 'Duygusal destek ve yönlendirme' },
  { icon: UserCheck, title: 'Uzmanlar',  desc: 'Doğru uzmana yönlendirme' },
];

const REACTION_EMOJIS = [
  { emoji: '👍', label: 'Yararlı', key: 'like' },
  { emoji: '❤️', label: 'Teşekkürler', key: 'heart' },
  { emoji: '💡', label: 'Aydınlatıcı', key: 'idea' },
  { emoji: '🙏', label: 'Yardımcı', key: 'pray' },
] as const;

type ReactionKey = typeof REACTION_EMOJIS[number]['key'];

function getFollowUpSuggestions(content: string): string[] {
  const lower = content.toLowerCase();
  for (const entry of FOLLOWUP_MAP) {
    if (entry.keywords.some(kw => lower.includes(kw))) return entry.suggestions;
  }
  return ['Daha detaylı açıklar mısın?', 'Pratik örnek verir misin?'];
}

/* ─── Tipler ────────────────────────────────────────────── */

interface Session {
  id:        string;
  title:     string;
  messages:  ChatMessage[];
  createdAt: string;
  updatedAt: string;
}

/* ─── Tarih yardımcıları ─────────────────────────────────── */

function formatDateSeparator(date: Date): string {
  const now  = new Date();
  const diff = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  if (diff === 0) return 'Bugün';
  if (diff === 1) return 'Dün';
  return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/* ─── Markdown Renderer ─────────────────────────────────── */

function renderMarkdown(text: string, navigate: (path: string) => void): React.ReactNode {
  const lines = text.split('\n');
  const nodes: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { nodes.push(<br key={i} />); i++; continue; }

    if (line.startsWith('## ')) {
      nodes.push(<p key={i} className="cb-md-h2">{parseInline(line.slice(3), navigate)}</p>);
      i++; continue;
    }
    if (line.startsWith('# ')) {
      nodes.push(<p key={i} className="cb-md-h1">{parseInline(line.slice(2), navigate)}</p>);
      i++; continue;
    }
    if (/^[-*] /.test(line)) {
      const items: React.ReactNode[] = [];
      while (i < lines.length && /^[-*] /.test(lines[i])) {
        items.push(<li key={i}>{parseInline(lines[i].replace(/^[-*] /, ''), navigate)}</li>);
        i++;
      }
      nodes.push(<ul key={`ul-${i}`} className="cb-md-ul">{items}</ul>);
      continue;
    }
    if (/^\d+\. /.test(line)) {
      const items: React.ReactNode[] = [];
      while (i < lines.length && /^\d+\. /.test(lines[i])) {
        items.push(<li key={i}>{parseInline(lines[i].replace(/^\d+\. /, ''), navigate)}</li>);
        i++;
      }
      nodes.push(<ol key={`ol-${i}`} className="cb-md-ol">{items}</ol>);
      continue;
    }
    nodes.push(<p key={i} className="cb-md-p">{parseInline(line, navigate)}</p>);
    i++;
  }
  return <>{nodes}</>;
}

function parseInline(text: string, navigate: (path: string) => void): React.ReactNode {
  const allRe = /(\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*|\*([^*]+)\*|`([^`]+)`)/g;
  const parts: React.ReactNode[] = [];
  let last = 0;
  let match: RegExpExecArray | null;

  while ((match = allRe.exec(text)) !== null) {
    if (match.index > last) parts.push(<span key={last}>{text.slice(last, match.index)}</span>);
    const full = match[0];
    if (full.startsWith('[')) {
      const linkText = match[2]; const linkUrl = match[3];
      const isInternal = linkUrl.startsWith('/');
      parts.push(
        <a key={match.index} href={isInternal ? undefined : linkUrl}
          onClick={isInternal ? (e) => { e.preventDefault(); navigate(linkUrl); } : undefined}
          target={isInternal ? undefined : '_blank'} rel={isInternal ? undefined : 'noopener noreferrer'}
          className="cb-md-link">{linkText}</a>
      );
    } else if (full.startsWith('**')) {
      parts.push(<strong key={match.index}>{match[4]}</strong>);
    } else if (full.startsWith('*')) {
      parts.push(<em key={match.index}>{match[5]}</em>);
    } else if (full.startsWith('`')) {
      parts.push(<code key={match.index} className="cb-md-code">{match[6]}</code>);
    }
    last = match.index + full.length;
  }
  if (last < text.length) parts.push(<span key={last}>{text.slice(last)}</span>);
  return <>{parts}</>;
}

/* ─── Session Yönetimi ──────────────────────────────────── */

function makeSession(): Session {
  const now = new Date().toISOString();
  return {
    id:        `sess-${Date.now()}`,
    title:     'Yeni Sohbet',
    messages:  [{
      id:        'welcome',
      role:      'bot',
      content:   'Merhaba! Ben **AutiBot** 🧩\n\nOtizm destek platformunuzda size yardımcı olmak için buradayım. Otizm hakkında sorularınızı yanıtlayabilir, platform özelliklerini açıklayabilir ve sizi doğru kaynaklara yönlendirebilirim.\n\nNasıl yardımcı olabilirim?',
      timestamp: new Date(),
    }],
    createdAt: now,
    updatedAt: now,
  };
}

function loadSessions(): Session[] {
  try {
    const raw = localStorage.getItem(SESSIONS_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as Array<Session & { messages: Array<Omit<ChatMessage,'timestamp'> & {timestamp:string}> }>;
    return arr.map(s => ({ ...s, messages: s.messages.map(m => ({ ...m, timestamp: new Date(m.timestamp) })) }));
  } catch { return []; }
}

function saveSessions(sessions: Session[]) {
  try { localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions.slice(0, MAX_SESSIONS))); } catch { /* ignore */ }
}

/* ─── Web Speech API ────────────────────────────────────── */
const SpeechRecognitionAPI =
  (typeof window !== 'undefined') &&
  ((window as unknown as { SpeechRecognition?: new () => BrowserSpeechRecognition; webkitSpeechRecognition?: new () => BrowserSpeechRecognition }).SpeechRecognition ||
  (window as unknown as { webkitSpeechRecognition?: new () => BrowserSpeechRecognition }).webkitSpeechRecognition ||
  null);

/* ─── Ana Bileşen ───────────────────────────────────────── */

export function ChatBot() {
  const navigate = useNavigate();
  const location = useLocation();

  const [isOpen,         setIsOpen]         = useState(false);
  const [isVisible,      setIsVisible]      = useState(false);
  const [showHistory,    setShowHistory]     = useState(false);
  const [showExportMenu, setShowExportMenu]  = useState(false);
  const [isExpanded,     setIsExpanded]      = useState(false);
  const [historySearch,  setHistorySearch]   = useState('');

  const [sessions, setSessions] = useState<Session[]>(loadSessions);
  const [activeId, setActiveId] = useState<string>(() => {
    const stored   = localStorage.getItem(ACTIVE_KEY);
    const existing = loadSessions();
    if (stored && existing.find(s => s.id === stored)) return stored;
    return '';
  });

  const activeSession = useMemo(() => sessions.find(s => s.id === activeId) ?? null, [sessions, activeId]);
  const messages = useMemo(() => activeSession?.messages ?? [], [activeSession]);

  const [input,       setInput]       = useState('');
  const [isLoading,   setIsLoading]   = useState(false);
  const [isListening, setIsListening] = useState(false);

  const [reactions,  setReactions]  = useState<Record<string, ReactionKey | null>>({});
  const [copied,     setCopied]     = useState<Record<string, boolean>>({});
  const [isOffline,  setIsOffline]  = useState(() => typeof navigator !== 'undefined' && !navigator.onLine);
  const [sentIds,    setSentIds]    = useState<Set<string>>(new Set());

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef       = useRef<HTMLTextAreaElement>(null);
  const cleanupRef     = useRef<(() => void) | null>(null);
  const exportMenuRef  = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);

  /* ── Oturum başlat ─────────────────────────────────── */
  useEffect(() => {
    if (!activeId || !sessions.find(s => s.id === activeId)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (sessions.length > 0) setActiveId(sessions[0].id);
       
      else { const f = makeSession(); setSessions([f]); setActiveId(f.id); }
    }
  }, [activeId, sessions]);

  /* ── localStorage sync ─────────────────────────────── */
  useEffect(() => { saveSessions(sessions); }, [sessions]);
  useEffect(() => { localStorage.setItem(ACTIVE_KEY, activeId); }, [activeId]);

  /* ── Scroll ──────────────────────────────────────────── */
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, isLoading]);

  /* ── Pencere aç/kapat ──────────────────────────────── */
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => setIsVisible(true), 10);
      setTimeout(() => inputRef.current?.focus(), 300);
    } else {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsVisible(false);
    }
  }, [isOpen]);

  /* ── Çevrimdışı tespiti ───────────────────────────── */
  useEffect(() => {
    const goOnline  = () => setIsOffline(false);
    const goOffline = () => setIsOffline(true);
    window.addEventListener('online',  goOnline);
    window.addEventListener('offline', goOffline);
    return () => { window.removeEventListener('online', goOnline); window.removeEventListener('offline', goOffline); };
  }, []);

  /* ── Export menu dışına tıklayınca kapat ────────────── */
  useEffect(() => {
    if (!showExportMenu) return;
    const handler = (e: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) setShowExportMenu(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showExportMenu]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => { setIsOpen(false); setShowHistory(false); setShowExportMenu(false); }, 300);
  };

  /* ── Session işlemleri ─────────────────────────────── */
  const createNewSession = () => {
    const fresh = makeSession();
    setSessions(prev => [fresh, ...prev]);
    setActiveId(fresh.id);
    setShowHistory(false);
  };

  const switchSession = (id: string) => { setActiveId(id); setShowHistory(false); };

  const deleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSessions(prev => {
      const next = prev.filter(s => s.id !== id);
      if (id === activeId) {
        if (next.length > 0) setActiveId(next[0].id);
        else { const f = makeSession(); setActiveId(f.id); return [f]; }
      }
      return next;
    });
  };

  const updateActiveSession = useCallback((updater: (s: Session) => Session) => {
    setSessions(prev => prev.map(s => s.id === activeId ? updater(s) : s));
  }, [activeId]);

  /* ── SSE streaming mesaj gönderme ──────────────────── */
  const sendMessage = useCallback((text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isLoading || trimmed.length > MAX_CHARS) return;

    const history: ConversationTurn[] = messages
      .filter(m => m.id !== 'welcome' && !m.isError)
      .map(m => ({ role: m.role === 'bot' ? 'model' : 'user', text: m.content }));

    const userMsg: ChatMessage = { id: `user-${Date.now()}`, role: 'user', content: trimmed, timestamp: new Date() };

    updateActiveSession(s => ({
      ...s,
      title:     s.messages.filter(m => m.role === 'user').length === 0 ? trimmed.slice(0, 40) : s.title,
      messages:  [...s.messages, userMsg],
      updatedAt: new Date().toISOString(),
    }));

    setInput('');
    if (inputRef.current) inputRef.current.style.height = 'auto';
    setIsLoading(true);
    setSentIds(prev => new Set(prev).add(userMsg.id));

    const botId = `bot-${Date.now()}`;
    const botMsg: ChatMessage = { id: botId, role: 'bot', content: '', timestamp: new Date(), streaming: true };
    setSessions(prev => prev.map(s =>
      s.id === activeId ? { ...s, messages: [...s.messages, botMsg] } : s
    ));

    const cleanup = chatbotService.streamMessage(
      trimmed,
      history,
      (chunk) => {
        setSessions(prev => prev.map(s => {
          if (s.id !== activeId) return s;
          return { ...s, messages: s.messages.map(m => m.id === botId ? { ...m, content: m.content + chunk } : m) };
        }));
      },
      () => {
        setSessions(prev => prev.map(s => {
          if (s.id !== activeId) return s;
          return {
            ...s,
            messages:  s.messages.map(m => m.id === botId ? { ...m, streaming: false } : m),
            updatedAt: new Date().toISOString(),
          };
        }));
        setIsLoading(false);
        cleanupRef.current = null;
      },
      (err: ChatError) => {
        setSessions(prev => prev.map(s => {
          if (s.id !== activeId) return s;
          return {
            ...s,
            messages: s.messages.map(m =>
              m.id === botId
                ? { ...m, content: m.content || err.message, streaming: false, isError: !m.content, retryText: trimmed }
                : m
            ),
          };
        }));
        setIsLoading(false);
        cleanupRef.current = null;
        toast.error(err.message);
      },
      location.pathname
    );
    cleanupRef.current = cleanup;
  }, [isLoading, messages, updateActiveSession, activeId, location.pathname]);

  /* ── Tekrar dene ───────────────────────────────────── */
  const retryMessage = useCallback((retryText: string, errorMsgId: string) => {
    // Hata mesajını kaldır
    setSessions(prev => prev.map(s =>
      s.id === activeId
        ? { ...s, messages: s.messages.filter(m => m.id !== errorMsgId) }
        : s
    ));
    // Mesajı tekrar gönder
    setTimeout(() => sendMessage(retryText), 100);
  }, [activeId, sendMessage]);

  /* ── Üretimi durdur ─────────────────────────────────── */
  const stopStreaming = () => {
    cleanupRef.current?.();
    cleanupRef.current = null;
    setSessions(prev => prev.map(s => ({
      ...s,
      messages: s.messages.map(m => m.streaming ? { ...m, streaming: false } : m),
    })));
    setIsLoading(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
  };

  /* ── Auto-resize textarea ──────────────────────────── */
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    if (val.length > MAX_CHARS) return;
    setInput(val);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
  };

  /* ── Ses girişi ────────────────────────────────────── */
  const toggleVoice = () => {
    if (!SpeechRecognitionAPI) { toast.error('Tarayıcınız ses girişini desteklemiyor.'); return; }
    if (isListening) { recognitionRef.current?.stop(); setIsListening(false); return; }
    const rec = new SpeechRecognitionAPI();
    rec.lang = 'tr-TR'; rec.interimResults = true; rec.continuous = false;
    rec.onresult = (e: SpeechRecognitionEvent) => {
      const transcript = Array.from(e.results).map((r: SpeechRecognitionResult) => r[0].transcript).join('');
      setInput(transcript);
      if (inputRef.current) { inputRef.current.style.height = 'auto'; inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 120) + 'px'; }
    };
    rec.onend   = () => setIsListening(false);
    rec.onerror = () => { setIsListening(false); toast.error('Ses tanıma hatası.'); };
    recognitionRef.current = rec; rec.start(); setIsListening(true);
  };

  /* ── Kopyala ───────────────────────────────────────── */
  const copyMessage = (id: string, content: string) => {
    navigator.clipboard.writeText(content).then(() => {
      setCopied(prev => ({ ...prev, [id]: true }));
      setTimeout(() => setCopied(prev => ({ ...prev, [id]: false })), 2000);
    });
  };

  /* ── Tepki ─────────────────────────────────────────── */
  const giveReaction = (msgId: string, key: ReactionKey) => {
    setReactions(prev => ({ ...prev, [msgId]: prev[msgId] === key ? null : key }));
  };

  /* ── Seslendirme (TTS) ─────────────────────────────── */
  const speakMessage = (text: string) => {
    if (!window.speechSynthesis) { toast.error('Sesli okuma desteklenmiyor.'); return; }
    window.speechSynthesis.cancel();
    const cleanText = text.replace(/[*_#]/g, '');
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'tr-TR';
    window.speechSynthesis.speak(utterance);
  };

  /* ── Dışa Aktarma ──────────────────────────────────── */
  const exportChat = (format: 'txt' | 'print') => {
    if (!activeSession) return;
    const lines = activeSession.messages
      .filter(m => m.id !== 'welcome')
      .map(m => {
        const who  = m.role === 'user' ? 'SİZ' : 'AutiBot';
        const time = m.timestamp.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
        return `[${time}] ${who}:\n${m.content}`;
      })
      .join('\n\n---\n\n');
    const header = `AutiBot Sohbet Geçmişi\n${activeSession.title}\n${new Date().toLocaleDateString('tr-TR')}\n${'='.repeat(40)}\n\n`;
    const full = header + lines;

    if (format === 'txt') {
      const blob = new Blob([full], { type: 'text/plain;charset=utf-8' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url; a.download = `autibot-${Date.now()}.txt`; a.click();
      URL.revokeObjectURL(url);
    } else {
      const win = window.open('', '_blank');
      if (!win) return;
      win.document.write(`<html><head><title>AutiBot Sohbet</title>
        <style>body{font-family:system-ui,sans-serif;max-width:700px;margin:40px auto;padding:20px;line-height:1.6}
        pre{white-space:pre-wrap;font-family:inherit}</style></head>
        <body><pre>${full.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre></body></html>`);
      win.document.close(); win.print();
    }
  };

  /* ── Hesaplamalar ──────────────────────────────────── */
  const hasOnlyWelcome = messages.length === 1 && messages[0].id === 'welcome';
  const lastBotMsg = useMemo(
    () => [...messages].reverse().find(m => m.role === 'bot' && m.id !== 'welcome' && !m.isError) ?? null,
    [messages]
  );

  const pageSuggestions = PAGE_SUGGESTIONS[location.pathname] ?? QUICK_SUGGESTIONS;
  const suggestionChips = hasOnlyWelcome
    ? pageSuggestions
    : (lastBotMsg && !lastBotMsg.streaming ? getFollowUpSuggestions(lastBotMsg.content) : []);

  const isCrisisInput = useMemo(() => {
    const lower = input.toLowerCase();
    return CRISIS_KEYWORDS.some(kw => lower.includes(kw));
  }, [input]);

  const filteredSessions = useMemo(() => {
    if (!historySearch.trim()) return sessions;
    const q = historySearch.toLowerCase();
    return sessions.filter(s =>
      s.title.toLowerCase().includes(q) ||
      s.messages.some(m => m.content.toLowerCase().includes(q))
    );
  }, [sessions, historySearch]);

  // Uzmana yönlendirme: Her 4 kullanıcı mesajından sonra göster
  const userMsgCount = messages.filter(m => m.role === 'user').length;
  const showExpertCTA = userMsgCount > 0 && userMsgCount % 4 === 0 && !isLoading;

  /* ── Render ────────────────────────────────────────── */
  return (
    <>
      {/* FAB */}
      {!isOpen && (
        <button
          id="chatbot-open-button"
          onClick={() => setIsOpen(true)}
          className="cb-fab print:hidden"
          aria-label="AutiBot'u aç"
        >
          <div className="cb-fab-glow" />
          <div className="cb-fab-pulse" />
          <MessageCircle size={26} />
          <span className="cb-fab-badge">AI</span>
        </button>
      )}

      {/* Chat Penceresi */}
      {isOpen && (
        <div
          className={`cb-window print:hidden ${isVisible ? 'cb-window--visible' : ''} ${isExpanded ? 'cb-window--expanded' : ''}`}
          role="dialog"
          aria-label="AutiBot sohbet penceresi"
        >
          {/* Header */}
          <div className="cb-header">
            <div className="cb-header-left">
              <div className="cb-avatar">
                <Bot size={18} />
                <div className="cb-avatar-status" />
              </div>
              <div>
                <div className="cb-header-title"><Sparkles size={12} /> AutiBot</div>
                <div className="cb-header-subtitle">Yardımcı asistan • Bilgilendirme amaçlıdır</div>
              </div>
            </div>
            <div className="cb-header-actions">
              <button onClick={() => setShowHistory(h => !h)} className="cb-icon-btn" title="Sohbet geçmişi"><History size={14} /></button>
              <button onClick={createNewSession} className="cb-icon-btn" title="Yeni sohbet"><Plus size={14} /></button>
              <div className="cb-dropdown-wrapper" ref={exportMenuRef}>
                <button className="cb-icon-btn" title="Sohbeti dışa aktar" onClick={() => setShowExportMenu(v => !v)}><Download size={14} /></button>
                {showExportMenu && (
                  <div className="cb-export-menu">
                    <button onClick={() => { exportChat('txt');   setShowExportMenu(false); }} className="cb-export-item"><Download size={12} /> .txt indir</button>
                    <button onClick={() => { exportChat('print'); setShowExportMenu(false); }} className="cb-export-item"><Download size={12} /> PDF / Yazdır</button>
                  </div>
                )}
              </div>
              <button onClick={() => setIsExpanded(v => !v)} className="cb-icon-btn" title={isExpanded ? 'Küçült' : 'Genişlet'}>
                {isExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
              </button>
              <button onClick={handleClose} className="cb-icon-btn cb-icon-btn--close" title="Kapat"><X size={16} /></button>
            </div>
          </div>

          {/* Çevrimdışı banner */}
          {isOffline && (
            <div className="cb-offline-banner">
              <WifiOff size={13} />
              <span>İnternet bağlantısı yok — yanıtlar alınamayabilir.</span>
            </div>
          )}

          {/* Geçmiş Paneli */}
          {showHistory && (
            <div className="cb-history-panel">
              <div className="cb-history-header">
                <button onClick={() => setShowHistory(false)} className="cb-back-btn"><ChevronLeft size={14} /> Geri</button>
                <span>Sohbet Geçmişi</span>
              </div>
              {/* Arama */}
              <div className="cb-history-search">
                <Search size={13} />
                <input
                  type="text"
                  placeholder="Geçmişte ara..."
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  className="cb-history-search-input"
                />
              </div>
              <div className="cb-history-list">
                {filteredSessions.length === 0 && <p className="cb-history-empty">{historySearch ? 'Sonuç bulunamadı.' : 'Henüz sohbet yok.'}</p>}
                {filteredSessions.map(s => (
                  <div key={s.id} onClick={() => switchSession(s.id)} className={`cb-history-item ${s.id === activeId ? 'cb-history-item--active' : ''}`}>
                    <div className="cb-history-item-title">{s.title || 'Yeni Sohbet'}</div>
                    <div className="cb-history-item-meta">
                      <Clock size={10} />
                      {new Date(s.updatedAt).toLocaleDateString('tr-TR')}
                      <span className="cb-history-item-count">{s.messages.filter(m => m.role === 'user').length} mesaj</span>
                    </div>
                    <button onClick={(e) => deleteSession(s.id, e)} className="cb-history-delete" title="Sil"><Trash2 size={12} /></button>
                  </div>
                ))}
              </div>
              <button onClick={createNewSession} className="cb-new-session-btn"><Plus size={14} /> Yeni Sohbet Başlat</button>
            </div>
          )}

          {/* Mesajlar + Input */}
          {!showHistory && (
            <>
              <div className="cb-messages" id="chatbot-messages">
                {/* Hoş geldin ekranı */}
                {hasOnlyWelcome && (
                  <div className="cb-welcome">
                    <div className="cb-welcome-avatar">
                      <Bot size={28} />
                    </div>
                    <h3 className="cb-welcome-title">Merhaba! 👋</h3>
                    <p className="cb-welcome-desc">Ben <strong>AutiBot</strong>, otizm destek asistanınız. Bir konu seçin veya sorunuzu yazın.</p>
                    <div className="cb-topic-grid">
                      {TOPIC_CATEGORIES.map((cat) => (
                        <button
                          key={cat.label}
                          className="cb-topic-card"
                          onClick={() => sendMessage(cat.q)}
                        >
                          <span className="cb-topic-emoji">{cat.emoji}</span>
                          <span className="cb-topic-label">{cat.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Mesaj listesi */}
                {!hasOnlyWelcome && messages.map((msg, idx) => {
                  const showDate = idx === 0 || !isSameDay(messages[idx - 1].timestamp, msg.timestamp);
                  return (
                    <div key={msg.id}>
                      {showDate && (
                        <div className="cb-date-sep">
                          <span>{formatDateSeparator(msg.timestamp)}</span>
                        </div>
                      )}
                      <div className={`cb-msg cb-msg--${msg.role}`}>
                        {msg.role === 'bot' && (
                          <div className="cb-msg-avatar cb-msg-avatar--bot"><Bot size={13} /></div>
                        )}
                        <div className="cb-bubble-wrap">
                          <div className={`cb-bubble ${msg.isError ? 'cb-bubble--error' : ''}`}>
                            <div className="cb-bubble-text">
                              {msg.role === 'bot'
                                ? <>
                                    {msg.isError && <AlertCircle size={14} className="cb-error-icon" />}
                                    {renderMarkdown(msg.content, navigate)}
                                    {msg.streaming && <span className="cb-cursor" />}
                                  </>
                                : msg.content
                              }
                            </div>
                            <div className="cb-bubble-time">
                              {msg.timestamp.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                              {msg.role === 'user' && (
                                <span className="cb-msg-status" title={sentIds.has(msg.id) ? 'İletildi' : 'Gönderildi'}>
                                  {sentIds.has(msg.id) ? <CheckCheck size={11} /> : <Check size={11} />}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Hata — Tekrar Dene */}
                          {msg.isError && msg.retryText && (
                            <button
                              className="cb-retry-btn"
                              onClick={() => retryMessage(msg.retryText!, msg.id)}
                            >
                              <RefreshCw size={12} /> Tekrar Dene
                            </button>
                          )}

                          {/* Tepki & Aksiyonlar */}
                          {msg.role === 'bot' && msg.id !== 'welcome' && !msg.isError && !msg.streaming && (
                            <div className="cb-msg-actions">
                              {REACTION_EMOJIS.map(r => (
                                <button
                                  key={r.key}
                                  className={`cb-react-btn ${reactions[msg.id] === r.key ? 'cb-react-btn--active' : ''}`}
                                  onClick={() => giveReaction(msg.id, r.key)}
                                  title={r.label}
                                >{r.emoji}</button>
                              ))}
                              <span className="cb-action-divider" />
                              <button className="cb-action-btn" onClick={() => speakMessage(msg.content)} title="Sesli Oku"><Volume2 size={11} /></button>
                              <button className={`cb-action-btn ${copied[msg.id] ? 'cb-action-btn--copied' : ''}`}
                                onClick={() => copyMessage(msg.id, msg.content)} title="Kopyala">
                                <Copy size={11} /> {copied[msg.id] && <span className="cb-copied-label">✓</span>}
                              </button>
                            </div>
                          )}
                        </div>
                        {msg.role === 'user' && (
                          <div className="cb-msg-avatar cb-msg-avatar--user"><User size={13} /></div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Yazıyor animasyonu */}
                {isLoading && messages[messages.length - 1]?.streaming !== true && (
                  <div className="cb-msg cb-msg--bot">
                    <div className="cb-msg-avatar cb-msg-avatar--bot"><Bot size={13} /></div>
                    <div className="cb-bubble cb-bubble--typing">
                      <div className="cb-shimmer"><span /><span /><span /></div>
                    </div>
                  </div>
                )}

                {/* Uzmana yönlendirme CTA */}
                {showExpertCTA && (
                  <div className="cb-expert-cta">
                    <UserCheck size={16} />
                    <div>
                      <div className="cb-expert-cta-title">Bir uzmanla konuşmak ister misiniz?</div>
                      <div className="cb-expert-cta-desc">Profesyonel destek için uzman ağımıza göz atın.</div>
                    </div>
                    <button onClick={() => navigate('/uzmanlar')} className="cb-expert-cta-btn">Uzmanlara Git</button>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Kriz tespiti banner'ı */}
              {isCrisisInput && (
                <div className="cb-crisis-banner">
                  <AlertCircle size={14} className="cb-crisis-icon" />
                  <div className="cb-crisis-text">
                    <strong>Acil destek gerekiyor mu?</strong>
                    <span>Kriz anında hızlı rehberimize bakın veya ALO 182'yi arayın.</span>
                  </div>
                  <div className="cb-crisis-actions">
                    <button className="cb-crisis-btn" onClick={() => navigate('/kriz-rehberi')}>Kriz Rehberi</button>
                    <a className="cb-crisis-call" href="tel:182" title="ALO 182 Sosyal Destek">
                      <PhoneCall size={13} />
                    </a>
                  </div>
                </div>
              )}

              {/* Öneri chip'leri */}
              {suggestionChips.length > 0 && !isLoading && (
                <div className="cb-suggestions">
                  {suggestionChips.map(s => (
                    <button key={s} className="cb-chip" onClick={() => sendMessage(s)}>{s}</button>
                  ))}
                </div>
              )}

              <p className="px-4 pb-1 text-[10px] leading-4 text-slate-500">
                AutiBot yalnızca bilgilendirme amaçlıdır; tanı veya tedavi yerine geçmez. Tıbbi kararlar için yetkili bir uzmana başvurun.
              </p>

              {/* Input Alanı */}
              <div className="cb-input-area">
                {SpeechRecognitionAPI && (
                  <button
                    className={`cb-voice-btn ${isListening ? 'cb-voice-btn--active' : ''}`}
                    onClick={toggleVoice}
                    title={isListening ? 'Sesi durdur' : 'Sesle yaz'}
                    aria-label={isListening ? 'Dinlemeyi durdur' : 'Sesle mesaj gönder'}
                  >
                    {isListening ? <MicOff size={16} /> : <Mic size={16} />}
                  </button>
                )}

                <div className="cb-input-wrapper">
                  <textarea
                    ref={inputRef}
                    id="chatbot-input"
                    className="cb-input"
                    placeholder="Mesajınızı yazın…"
                    value={input}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    rows={1}
                    disabled={isLoading}
                    aria-label="Chatbot mesaj giriş alanı"
                  />
                  {input.length > 0 && (
                    <span className={`cb-char-count ${input.length > MAX_CHARS * 0.9 ? 'cb-char-count--warn' : ''}`}>
                      {input.length}/{MAX_CHARS}
                    </span>
                  )}
                </div>

                {isLoading ? (
                  <button className="cb-send-btn cb-send-btn--stop" onClick={stopStreaming} aria-label="Durdur" title="Durdur">
                    <StopCircle size={18} />
                  </button>
                ) : (
                  <button
                    id="chatbot-send-button"
                    className={`cb-send-btn ${input.trim() ? 'cb-send-btn--active' : ''}`}
                    onClick={() => sendMessage(input)}
                    disabled={!input.trim()}
                    aria-label="Mesaj gönder"
                  >
                    <Send size={18} />
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      )}

      <style>{CHATBOT_STYLES}</style>
    </>
  );
}

/* ─── Stiller ───────────────────────────────────────────── */

const CHATBOT_STYLES = `
/* ============================================================
   AutiBot Chatbot — Premium UI (Light + Dark Mode)
   ============================================================ */

/* === CSS Variables === */
:root {
  --cb-primary: #6366f1;
  --cb-primary-dark: #4f46e5;
  --cb-accent: #7c3aed;
  --cb-green: #10b981;
  --cb-bg: rgba(255,255,255,0.97);
  --cb-bg-solid: #ffffff;
  --cb-surface: rgba(243,244,246,0.85);
  --cb-surface-hover: rgba(238,238,248,0.9);
  --cb-border: rgba(99,102,241,0.1);
  --cb-text: #1f2937;
  --cb-text-secondary: #6b7280;
  --cb-text-muted: #9ca3af;
  --cb-shadow: 0 32px 64px rgba(99,102,241,0.15), 0 16px 32px rgba(0,0,0,0.08);
  --cb-input-bg: #f9fafb;
  --cb-input-border: #e5e7eb;
}

.dark {
  --cb-primary: #818cf8;
  --cb-primary-dark: #6366f1;
  --cb-accent: #a78bfa;
  --cb-bg: rgba(17,24,39,0.97);
  --cb-bg-solid: #111827;
  --cb-surface: rgba(31,41,55,0.85);
  --cb-surface-hover: rgba(55,65,81,0.9);
  --cb-border: rgba(99,102,241,0.15);
  --cb-text: #f3f4f6;
  --cb-text-secondary: #9ca3af;
  --cb-text-muted: #6b7280;
  --cb-shadow: 0 32px 64px rgba(0,0,0,0.4), 0 16px 32px rgba(0,0,0,0.2);
  --cb-input-bg: #1f2937;
  --cb-input-border: #374151;
}

/* === FAB (Floating Action Button) === */
.cb-fab {
  position: fixed; bottom: 28px; right: 28px; z-index: 9999;
  width: 60px; height: 60px; border-radius: 50%;
  background: linear-gradient(135deg, #6366f1 0%, #4f46e5 40%, #7c3aed 100%);
  color: white; border: none; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 4px 20px rgba(99,102,241,0.45), 0 0 40px rgba(99,102,241,0.15);
  transition: transform .2s cubic-bezier(.34,1.56,.64,1), box-shadow .2s;
}
.cb-fab:hover {
  transform: scale(1.12);
  box-shadow: 0 6px 28px rgba(99,102,241,0.6), 0 0 60px rgba(99,102,241,0.2);
}
.cb-fab:active { transform: scale(.95); }

.cb-fab-glow {
  position: absolute; inset: -8px; border-radius: 50%;
  background: radial-gradient(circle, rgba(99,102,241,0.3) 0%, transparent 70%);
  animation: cb-glow 3s ease-in-out infinite;
}
@keyframes cb-glow {
  0%, 100% { opacity: 0.6; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.15); }
}
.cb-fab-pulse {
  position: absolute; inset: -4px; border-radius: 50%;
  background: rgba(99,102,241,0.2);
  animation: cb-pulse 2.5s ease-out infinite;
}
@keyframes cb-pulse {
  0% { transform: scale(1); opacity: .6; }
  70%,100% { transform: scale(1.5); opacity: 0; }
}
.cb-fab-badge {
  position: absolute; top: -4px; right: -4px;
  background: linear-gradient(135deg, #10b981, #059669);
  color: white; font-size: 9px; font-weight: 800; letter-spacing: .05em;
  padding: 2px 6px; border-radius: 8px; border: 2px solid white; line-height: 1;
}
.dark .cb-fab-badge { border-color: #111827; }

/* === Window === */
.cb-window {
  position: fixed; bottom: 28px; right: 28px; z-index: 9999;
  width: 420px; max-width: calc(100vw - 24px);
  height: 620px; max-height: calc(100vh - 40px);
  background: var(--cb-bg); backdrop-filter: blur(24px) saturate(1.2);
  border-radius: 28px;
  border: 1px solid var(--cb-border);
  box-shadow: var(--cb-shadow);
  display: flex; flex-direction: column; overflow: hidden;
  transform: scale(.85) translateY(20px); opacity: 0; transform-origin: bottom right;
  transition: transform .35s cubic-bezier(.34,1.56,.64,1), opacity .3s;
}
.cb-window--visible { transform: scale(1) translateY(0); opacity: 1; }
.cb-window--expanded {
  width: 800px; max-width: 95vw;
  height: 85vh; max-height: 95vh;
  bottom: 50vh; right: 50vw;
  transform: scale(.85) translate(50%, 50%);
}
.cb-window--expanded.cb-window--visible { transform: scale(1) translate(50%, 50%); }

/* === Header === */
.cb-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 16px;
  background: linear-gradient(135deg, #6366f1 0%, #4f46e5 40%, #7c3aed 100%);
  background-size: 200% 200%;
  animation: cb-gradient 6s ease infinite;
  color: white; flex-shrink: 0;
  border-bottom: 1px solid rgba(255,255,255,0.1);
}
@keyframes cb-gradient {
  0%,100% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
}
.cb-header-left { display: flex; align-items: center; gap: 11px; }
.cb-header-actions { display: flex; align-items: center; gap: 5px; }
.cb-avatar {
  position: relative; width: 40px; height: 40px;
  background: rgba(255,255,255,0.2); backdrop-filter: blur(8px);
  border-radius: 14px; display: flex; align-items: center; justify-content: center;
  border: 2px solid rgba(255,255,255,0.3);
}
.cb-avatar-status {
  position: absolute; bottom: -1px; right: -1px;
  width: 11px; height: 11px; background: #10b981; border-radius: 50%;
  border: 2.5px solid rgba(99,102,241,0.9);
  box-shadow: 0 0 6px rgba(16,185,129,0.6);
}
.cb-header-title   { font-size: 14px; font-weight: 700; display: flex; align-items: center; gap: 5px; }
.cb-header-subtitle { font-size: 10.5px; opacity: .75; margin-top: 1px; }
.cb-icon-btn {
  background: rgba(255,255,255,0.12); border: 1px solid rgba(255,255,255,0.2);
  color: white; border-radius: 10px; width: 30px; height: 30px;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; transition: all .15s;
}
.cb-icon-btn:hover { background: rgba(255,255,255,0.25); transform: scale(1.05); }
.cb-icon-btn--close:hover { background: rgba(239,68,68,0.3); }

/* === Export Dropdown === */
.cb-dropdown-wrapper { position: relative; }
.cb-export-menu {
  position: absolute; top: calc(100% + 8px); right: 0;
  background: var(--cb-bg-solid); border-radius: 14px; overflow: hidden;
  box-shadow: 0 12px 32px rgba(0,0,0,0.12), 0 0 0 1px var(--cb-border);
  min-width: 160px; z-index: 10;
  animation: cb-menu-in .2s cubic-bezier(.34,1.56,.64,1);
}
@keyframes cb-menu-in {
  from { opacity: 0; transform: scale(.92) translateY(-6px); }
  to   { opacity: 1; transform: scale(1) translateY(0); }
}
.cb-export-item {
  display: flex; align-items: center; gap: 8px;
  width: 100%; padding: 11px 15px; background: none; border: none;
  font-size: 12.5px; color: var(--cb-text); cursor: pointer; text-align: left;
  transition: background .12s;
}
.cb-export-item:hover { background: var(--cb-surface-hover); color: var(--cb-primary); }

/* === History Panel === */
.cb-history-panel { flex: 1; display: flex; flex-direction: column; overflow: hidden; background: var(--cb-bg-solid); }
.cb-history-header {
  display: flex; align-items: center; gap: 8px;
  padding: 12px 14px; border-bottom: 1px solid var(--cb-border);
  font-size: 13px; font-weight: 600; color: var(--cb-text);
}
.cb-back-btn { display: flex; align-items: center; gap: 3px; font-size: 12px; color: var(--cb-primary); background: none; border: none; cursor: pointer; padding: 0; }
.cb-history-search {
  display: flex; align-items: center; gap: 8px; padding: 8px 12px; margin: 8px 10px 4px;
  border-radius: 12px; background: var(--cb-surface); border: 1.5px solid var(--cb-input-border);
  color: var(--cb-text-muted); transition: border-color .15s;
}
.cb-history-search:focus-within { border-color: var(--cb-primary); }
.cb-history-search-input {
  flex: 1; background: none; border: none; outline: none; font-size: 12.5px;
  color: var(--cb-text); font-family: inherit;
}
.cb-history-search-input::placeholder { color: var(--cb-text-muted); }
.cb-history-list { flex: 1; overflow-y: auto; padding: 8px; }
.cb-history-empty { text-align: center; color: var(--cb-text-muted); font-size: 13px; padding: 20px; }
.cb-history-item {
  position: relative; padding: 10px 34px 10px 12px;
  border-radius: 14px; cursor: pointer; margin-bottom: 4px;
  transition: all .15s; background: var(--cb-bg-solid);
  border: 1.5px solid var(--cb-border);
}
.cb-history-item:hover { background: var(--cb-surface-hover); border-color: var(--cb-primary); }
.cb-history-item--active { background: var(--cb-surface); border-color: var(--cb-primary); box-shadow: 0 0 0 3px rgba(99,102,241,0.1); }
.cb-history-item-title { font-size: 12.5px; font-weight: 600; color: var(--cb-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.cb-history-item-meta { display: flex; align-items: center; gap: 5px; font-size: 10.5px; color: var(--cb-text-muted); margin-top: 3px; }
.cb-history-item-count { font-size: 10px; background: var(--cb-surface); color: var(--cb-primary); padding: 1px 6px; border-radius: 8px; }
.cb-history-delete {
  position: absolute; right: 8px; top: 50%; transform: translateY(-50%);
  background: none; border: none; color: var(--cb-text-muted); cursor: pointer; padding: 4px;
  border-radius: 8px; display: flex; align-items: center; transition: all .15s;
}
.cb-history-delete:hover { color: #ef4444; background: rgba(239,68,68,0.1); }
.cb-new-session-btn {
  margin: 8px; padding: 11px 14px;
  background: linear-gradient(135deg, var(--cb-primary), var(--cb-primary-dark)); color: white;
  border: none; border-radius: 14px; cursor: pointer;
  font-size: 13px; font-weight: 600;
  display: flex; align-items: center; justify-content: center; gap: 6px;
  transition: all .15s; box-shadow: 0 4px 12px rgba(99,102,241,0.25);
}
.cb-new-session-btn:hover { opacity: .9; transform: translateY(-1px); }

/* === Welcome Screen === */
.cb-welcome {
  display: flex; flex-direction: column; align-items: center; padding: 24px 16px;
  animation: cb-welcome-in .5s cubic-bezier(.34,1.56,.64,1);
}
@keyframes cb-welcome-in {
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
}
.cb-welcome-avatar {
  width: 64px; height: 64px; border-radius: 22px;
  background: linear-gradient(135deg, #6366f1, #7c3aed);
  display: flex; align-items: center; justify-content: center;
  color: white; margin-bottom: 14px;
  box-shadow: 0 8px 24px rgba(99,102,241,0.3);
  animation: cb-avatar-float 3s ease-in-out infinite;
}
@keyframes cb-avatar-float {
  0%,100% { transform: translateY(0); }
  50% { transform: translateY(-6px); }
}
.cb-welcome-title { font-size: 18px; font-weight: 800; color: var(--cb-text); margin-bottom: 6px; }
.cb-welcome-desc { font-size: 13px; color: var(--cb-text-secondary); text-align: center; line-height: 1.5; margin-bottom: 18px; }
.cb-welcome-features { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; width: 100%; }
.cb-welcome-card {
  display: flex; align-items: flex-start; gap: 10px;
  padding: 12px; border-radius: 14px;
  background: var(--cb-surface); border: 1.5px solid var(--cb-border);
  transition: all .2s; cursor: default;
  color: var(--cb-primary);
}
.cb-welcome-card:hover { border-color: var(--cb-primary); transform: translateY(-2px); box-shadow: 0 4px 12px rgba(99,102,241,0.1); }
.cb-welcome-card-title { font-size: 12px; font-weight: 700; color: var(--cb-text); }
.cb-welcome-card-desc { font-size: 10.5px; color: var(--cb-text-muted); margin-top: 2px; line-height: 1.4; }

/* === Date Separator === */
.cb-date-sep {
  display: flex; align-items: center; justify-content: center;
  padding: 8px 0; gap: 12px;
}
.cb-date-sep::before, .cb-date-sep::after {
  content: ''; flex: 1; height: 1px;
  background: linear-gradient(to right, transparent, var(--cb-border), transparent);
}
.cb-date-sep span {
  font-size: 10px; font-weight: 600; color: var(--cb-text-muted);
  background: var(--cb-bg-solid); padding: 2px 10px; border-radius: 10px;
  border: 1px solid var(--cb-border); letter-spacing: 0.02em;
}

/* === Messages === */
.cb-messages {
  flex: 1; overflow-y: auto; padding: 14px 12px;
  display: flex; flex-direction: column; gap: 8px; scroll-behavior: smooth;
}
.cb-messages::-webkit-scrollbar { width: 4px; }
.cb-messages::-webkit-scrollbar-thumb { background: var(--cb-border); border-radius: 2px; }

.cb-msg {
  display: flex; align-items: flex-end; gap: 6px;
  animation: cb-msg-in .3s cubic-bezier(.34,1.56,.64,1);
}
@keyframes cb-msg-in {
  from { opacity: 0; transform: translateY(12px) scale(.95); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}
.cb-msg--user { flex-direction: row-reverse; }
.cb-msg-avatar {
  width: 28px; height: 28px; border-radius: 10px;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.cb-msg-avatar--bot  { background: linear-gradient(135deg, #6366f1, #7c3aed); color: white; }
.cb-msg-avatar--user { background: linear-gradient(135deg, #3b82f6, #2563eb); color: white; }

.cb-bubble-wrap { display: flex; flex-direction: column; max-width: 82%; }
.cb-msg--user .cb-bubble-wrap { align-items: flex-end; }

.cb-bubble {
  padding: 11px 14px; border-radius: 20px; word-break: break-word; position: relative;
}
.cb-msg--bot .cb-bubble {
  background: var(--cb-surface); backdrop-filter: blur(8px);
  border-bottom-left-radius: 6px; color: var(--cb-text);
  border: 1px solid var(--cb-border);
  box-shadow: 0 2px 8px rgba(0,0,0,0.03);
}
.cb-msg--user .cb-bubble {
  background: linear-gradient(135deg, rgba(99,102,241,0.95), rgba(79,70,229,0.95));
  backdrop-filter: blur(8px);
  border-bottom-right-radius: 6px; color: white;
  border: 1px solid rgba(255,255,255,0.1);
  box-shadow: 0 4px 12px rgba(99,102,241,0.2);
}

.cb-bubble--error {
  background: rgba(239,68,68,0.08) !important; border-color: rgba(239,68,68,0.2) !important;
}
.cb-error-icon { color: #ef4444; margin-bottom: 4px; display: inline-block; vertical-align: middle; margin-right: 4px; }

.cb-bubble-text { font-size: 13px; line-height: 1.65; }
.cb-bubble-text p { margin: 0; }
.cb-bubble-time { font-size: 9.5px; opacity: .45; margin-top: 5px; text-align: right; }

/* Markdown elements */
.cb-md-h1 { font-weight: 800; font-size: 15px; margin: 6px 0 4px; color: var(--cb-primary); }
.cb-md-h2 { font-weight: 700; font-size: 14px; margin: 6px 0 2px; color: var(--cb-primary); }
.cb-md-p { margin: 2px 0; }
.cb-md-ul { margin: 4px 0; padding-left: 18px; list-style: disc; }
.cb-md-ul li { margin-bottom: 2px; }
.cb-md-ol { margin: 4px 0; padding-left: 18px; }
.cb-md-ol li { margin-bottom: 2px; }
.cb-md-link { color: var(--cb-primary); text-decoration: underline; cursor: pointer; font-weight: 500; text-underline-offset: 2px; }
.cb-md-link:hover { opacity: 0.8; }
.cb-md-code { background: rgba(99,102,241,0.1); padding: 1px 6px; border-radius: 5px; font-size: 12px; font-family: monospace; }

/* === Retry Button === */
.cb-retry-btn {
  display: inline-flex; align-items: center; gap: 5px;
  margin-top: 6px; padding: 6px 14px;
  background: linear-gradient(135deg, #ef4444, #dc2626); color: white;
  border: none; border-radius: 10px; cursor: pointer;
  font-size: 12px; font-weight: 600;
  transition: all .2s; box-shadow: 0 2px 8px rgba(239,68,68,0.2);
}
.cb-retry-btn:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(239,68,68,0.3); }

/* === Message Actions (Reactions + Utilities) === */
.cb-msg-actions {
  display: flex; align-items: center; gap: 3px;
  margin-top: 5px; opacity: 0; transition: opacity .2s;
  flex-wrap: wrap;
}
.cb-bubble-wrap:hover .cb-msg-actions { opacity: 1; }

.cb-react-btn {
  width: 28px; height: 26px; border-radius: 8px;
  background: var(--cb-bg-solid); border: 1.5px solid var(--cb-border);
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; font-size: 13px; transition: all .15s;
}
.cb-react-btn:hover { transform: scale(1.15); border-color: var(--cb-primary); }
.cb-react-btn--active {
  background: linear-gradient(135deg, rgba(99,102,241,0.1), rgba(124,58,237,0.1));
  border-color: var(--cb-primary); transform: scale(1.1);
  box-shadow: 0 2px 8px rgba(99,102,241,0.15);
}

.cb-action-divider {
  width: 1px; height: 16px; background: var(--cb-border); margin: 0 3px;
}

.cb-action-btn {
  display: flex; align-items: center; gap: 3px;
  background: none; border: 1px solid var(--cb-border); color: var(--cb-text-muted);
  border-radius: 7px; padding: 3px 7px; font-size: 10.5px;
  cursor: pointer; transition: all .15s;
}
.cb-action-btn:hover { background: var(--cb-surface-hover); border-color: var(--cb-primary); color: var(--cb-primary); }
.cb-action-btn--copied { background: rgba(16,185,129,0.1); border-color: #6ee7b7; color: #059669; }
.cb-copied-label { font-size: 10px; font-weight: 600; }

/* === Expert CTA === */
.cb-expert-cta {
  display: flex; align-items: center; gap: 10px;
  margin: 8px 0; padding: 12px 14px; border-radius: 16px;
  background: linear-gradient(135deg, rgba(16,185,129,0.08), rgba(5,150,105,0.08));
  border: 1.5px solid rgba(16,185,129,0.2);
  color: #059669; animation: cb-msg-in .3s ease;
}
.dark .cb-expert-cta { color: #34d399; }
.cb-expert-cta svg { flex-shrink: 0; }
.cb-expert-cta-title { font-size: 12.5px; font-weight: 700; color: var(--cb-text); }
.cb-expert-cta-desc { font-size: 10.5px; color: var(--cb-text-muted); margin-top: 1px; }
.cb-expert-cta-btn {
  margin-left: auto; padding: 6px 14px; border-radius: 10px;
  background: linear-gradient(135deg, #10b981, #059669); color: white;
  border: none; cursor: pointer; font-size: 11.5px; font-weight: 600;
  white-space: nowrap; transition: all .15s; flex-shrink: 0;
}
.cb-expert-cta-btn:hover { transform: scale(1.05); box-shadow: 0 4px 12px rgba(16,185,129,0.3); }

/* === Shimmer Typing === */
.cb-bubble--typing { padding: 14px 18px; }
.cb-shimmer { display: flex; gap: 5px; align-items: center; }
.cb-shimmer span {
  width: 8px; height: 8px; border-radius: 50%;
  background: linear-gradient(135deg, var(--cb-primary), var(--cb-accent));
  animation: cb-shimmer-bounce 1.4s infinite ease-in-out;
}
.cb-shimmer span:nth-child(1) { animation-delay: 0s; }
.cb-shimmer span:nth-child(2) { animation-delay: 0.2s; }
.cb-shimmer span:nth-child(3) { animation-delay: 0.4s; }
@keyframes cb-shimmer-bounce {
  0%, 60%, 100% { transform: translateY(0) scale(1); opacity: 0.6; }
  30% { transform: translateY(-8px) scale(1.2); opacity: 1; }
}

/* === Suggestions === */
.cb-suggestions {
  padding: 4px 12px 8px; display: flex; flex-wrap: wrap; gap: 5px; flex-shrink: 0;
}
.cb-chip {
  background: var(--cb-surface); color: var(--cb-primary); border: 1.5px solid var(--cb-border);
  border-radius: 20px; padding: 6px 12px; font-size: 11.5px; font-weight: 500;
  cursor: pointer; transition: all .2s; white-space: nowrap;
}
.cb-chip:hover {
  background: var(--cb-surface-hover); border-color: var(--cb-primary);
  transform: translateY(-1px); box-shadow: 0 2px 8px rgba(99,102,241,0.1);
}

/* === Input === */
.cb-input-area {
  padding: 10px 12px; border-top: 1px solid var(--cb-border);
  display: flex; align-items: flex-end; gap: 7px;
  background: var(--cb-bg-solid); flex-shrink: 0;
}
.cb-input-wrapper { flex: 1; position: relative; display: flex; flex-direction: column; }
.cb-voice-btn {
  width: 38px; height: 38px; border-radius: 12px; border: 1.5px solid var(--cb-input-border);
  background: var(--cb-input-bg); color: var(--cb-text-muted);
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; transition: all .2s; flex-shrink: 0;
}
.cb-voice-btn:hover { border-color: var(--cb-primary); color: var(--cb-primary); background: var(--cb-surface-hover); }
.cb-voice-btn--active {
  background: linear-gradient(135deg, #ef4444, #dc2626);
  border-color: #dc2626; color: white;
  box-shadow: 0 0 0 4px rgba(239,68,68,0.15);
  animation: cb-voice-pulse 1s infinite;
}
@keyframes cb-voice-pulse {
  0%,100% { box-shadow: 0 0 0 4px rgba(239,68,68,0.15); }
  50% { box-shadow: 0 0 0 8px rgba(239,68,68,0.05); }
}

.cb-input {
  width: 100%; border: 1.5px solid var(--cb-input-border); border-radius: 14px;
  padding: 10px 13px; font-size: 13px; resize: none; outline: none;
  font-family: inherit; color: var(--cb-text); background: var(--cb-input-bg);
  transition: border-color .15s, box-shadow .15s; line-height: 1.45;
  max-height: 120px; overflow-y: auto; box-sizing: border-box;
}
.cb-input:focus {
  border-color: var(--cb-primary); background: var(--cb-bg-solid);
  box-shadow: 0 0 0 3px rgba(99,102,241,0.1);
}
.cb-input::placeholder { color: var(--cb-text-muted); }
.cb-input:disabled { opacity: 0.6; cursor: not-allowed; }

.cb-char-count {
  align-self: flex-end; font-size: 10px; color: var(--cb-text-muted);
  margin-top: 2px; margin-right: 4px;
}
.cb-char-count--warn { color: #f59e0b; font-weight: 600; }

.cb-send-btn {
  width: 40px; height: 40px; border-radius: 14px; border: none;
  background: var(--cb-input-border); color: var(--cb-text-muted); cursor: not-allowed;
  display: flex; align-items: center; justify-content: center;
  transition: all .2s cubic-bezier(.34,1.56,.64,1); flex-shrink: 0;
}
.cb-send-btn--active {
  background: linear-gradient(135deg, #6366f1, #4f46e5); color: white; cursor: pointer;
  box-shadow: 0 4px 14px rgba(99,102,241,0.35);
}
.cb-send-btn--active:hover { transform: scale(1.08); box-shadow: 0 6px 18px rgba(99,102,241,0.45); }
.cb-send-btn--stop {
  background: linear-gradient(135deg, #ef4444, #dc2626); color: white; cursor: pointer;
  box-shadow: 0 4px 12px rgba(239,68,68,0.25);
}
.cb-send-btn--stop:hover { transform: scale(1.08); }

/* === Streaming cursor === */
.cb-cursor {
  display: inline-block; margin-left: 2px;
  width: 6px; height: 15px; background: var(--cb-primary);
  border-radius: 2px; vertical-align: middle;
  animation: cb-blink .8s cubic-bezier(.4,0,.6,1) infinite;
}
@keyframes cb-blink { 0%,100% { opacity: 1; } 50% { opacity: 0; } }

/* === Mobile === */
@media (max-width: 480px) {
  .cb-fab { bottom: 80px; right: 16px; }
  .cb-window {
    bottom: 0; right: 0; left: 0;
    width: 100vw; max-width: 100vw;
    height: 100dvh; max-height: 100dvh;
    border-radius: 0;
  }
  .cb-header { padding: 16px; padding-top: max(16px, env(safe-area-inset-top)); }
  .cb-input-area { padding-bottom: max(10px, env(safe-area-inset-bottom)); }
  .cb-welcome-features { grid-template-columns: 1fr; }
}

/* === Offline Banner === */
.cb-offline-banner {
  display: flex; align-items: center; gap: 7px;
  padding: 7px 14px; font-size: 11.5px; font-weight: 500;
  background: #fef3c7; color: #92400e; border-bottom: 1px solid #fde68a;
  flex-shrink: 0;
}
.dark .cb-offline-banner { background: #44372a; color: #fde68a; border-bottom-color: #78523a; }

/* === Crisis Banner === */
.cb-crisis-banner {
  display: flex; align-items: flex-start; gap: 9px;
  margin: 0 10px 4px; padding: 10px 12px;
  background: #fef2f2; border: 1.5px solid #fca5a5; border-radius: 14px;
  flex-shrink: 0; animation: cb-crisis-in .2s ease-out;
}
@keyframes cb-crisis-in {
  from { opacity: 0; transform: translateY(-6px); }
  to   { opacity: 1; transform: translateY(0); }
}
.cb-crisis-icon { color: #ef4444; flex-shrink: 0; margin-top: 1px; }
.cb-crisis-text { flex: 1; display: flex; flex-direction: column; gap: 1px; }
.cb-crisis-text strong { font-size: 12px; color: #991b1b; }
.cb-crisis-text span   { font-size: 11px; color: #b91c1c; }
.cb-crisis-actions { display: flex; align-items: center; gap: 5px; flex-shrink: 0; }
.cb-crisis-btn {
  font-size: 11px; font-weight: 700; padding: 5px 10px;
  background: #ef4444; color: white; border: none; border-radius: 8px;
  cursor: pointer; transition: background .15s;
}
.cb-crisis-btn:hover { background: #dc2626; }
.cb-crisis-call {
  display: flex; align-items: center; justify-content: center;
  width: 28px; height: 28px; border-radius: 8px;
  background: #fee2e2; color: #ef4444; border: 1.5px solid #fca5a5;
  transition: all .15s; text-decoration: none;
}
.cb-crisis-call:hover { background: #ef4444; color: white; }
.dark .cb-crisis-banner { background: #3b1010; border-color: #7f1d1d; }
.dark .cb-crisis-text strong { color: #fca5a5; }
.dark .cb-crisis-text span   { color: #f87171; }

/* === Topic Category Grid === */
.cb-topic-grid {
  display: grid; grid-template-columns: 1fr 1fr; gap: 7px;
  width: 100%; margin-top: 4px;
}
.cb-topic-card {
  display: flex; align-items: center; gap: 8px;
  padding: 9px 12px; border-radius: 14px; cursor: pointer;
  background: var(--cb-surface); border: 1.5px solid var(--cb-border);
  font-size: 12px; font-weight: 600; color: var(--cb-text);
  text-align: left; transition: all .18s; line-height: 1.3;
}
.cb-topic-card:hover {
  border-color: var(--cb-primary); background: var(--cb-surface-hover);
  color: var(--cb-primary); transform: translateY(-1px);
  box-shadow: 0 3px 10px rgba(99,102,241,0.12);
}
.cb-topic-emoji { font-size: 18px; flex-shrink: 0; }
.cb-topic-label { flex: 1; }

/* === Message delivery status === */
.cb-msg-status {
  display: inline-flex; align-items: center; margin-left: 4px;
  color: rgba(255,255,255,0.65); vertical-align: middle;
}

/* === Reduced motion === */
@media (prefers-reduced-motion: reduce) {
  .cb-fab-pulse, .cb-fab-glow { animation: none; }
  .cb-window { transition-duration: 0.01ms; }
  .cb-msg { animation: none; }
  .cb-welcome { animation: none; }
  .cb-welcome-avatar { animation: none; }
  .cb-shimmer span { animation: none; opacity: 0.5; }
}
`;
