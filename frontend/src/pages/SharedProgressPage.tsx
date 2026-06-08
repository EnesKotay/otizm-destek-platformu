import { useEffect, useState, useMemo, useRef } from 'react';
import {
  Plus, CheckCircle, Clock, GraduationCap, User, MessageSquare,
  Trash2, ChevronDown, ChevronUp, Pencil, AlertTriangle, Info,
  Calendar, TrendingUp, Eye, EyeOff, Shield, Printer,
  Paperclip, X, Image as ImageIcon
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { useChildStore } from '@/store/childStore';
import { useAuthStore } from '@/store/authStore';
import { childService } from '@/services/childService';
import { sharedProgressService } from '@/services/sharedProgressService';
import { uploadService } from '@/services/uploadService';
import { toast } from '@/store/toastStore';
import { PageOnboarding } from '@/components/ui/PageOnboarding';

type NoteType = 'observation' | 'homework' | 'goal' | 'feedback' | 'general';
type NoteStatus = 'open' | 'done' | 'in_progress';
type NotePriority = 'urgent' | 'normal' | 'info';
type NoteAudience = 'both' | 'expert' | 'parent';

interface NoteReply {
  id: string;
  fromRole: 'expert' | 'parent';
  fromName: string;
  content: string;
  createdAt: string;
}

interface ProgressNote {
  id: string;
  childId: string;
  fromRole: 'expert' | 'parent';
  fromName: string;
  toRole: NoteAudience;
  type: NoteType;
  title: string;
  content: string;
  status: NoteStatus;
  priority: NotePriority;
  targetPercent?: number;
  currentLevel?: string;
  measureUnit?: string;
  sessionDate?: string;
  dueDate?: string;
  completedAt?: string;
  replies: NoteReply[];
  expertId?: string;
  createdAt: string;
}

const TYPE_CONFIG: Record<NoteType, { label: string; color: string; icon: string }> = {
  observation: { label: 'Gözlem',        color: 'bg-blue-100 text-blue-700 border-blue-200',      icon: '🔍' },
  homework:    { label: 'Ev Ödevi',       color: 'bg-purple-100 text-purple-700 border-purple-200', icon: '📝' },
  goal:        { label: 'Hedef',          color: 'bg-indigo-100 text-indigo-700 border-indigo-200', icon: '🎯' },
  feedback:    { label: 'Geri Bildirim',  color: 'bg-green-100 text-green-700 border-green-200',    icon: '💬' },
  general:     { label: 'Genel',          color: 'bg-gray-100 text-gray-700 border-gray-200',       icon: '📋' },
};

const STATUS_CONFIG: Record<NoteStatus, { label: string; icon: typeof CheckCircle; color: string; bg: string }> = {
  open:        { label: 'Açık',          icon: Clock,         color: 'text-amber-600',  bg: 'bg-amber-50' },
  in_progress: { label: 'Devam Ediyor',  icon: Clock,         color: 'text-blue-600',   bg: 'bg-blue-50' },
  done:        { label: 'Tamamlandı',    icon: CheckCircle,   color: 'text-green-600',  bg: 'bg-green-50' },
};

const PRIORITY_CONFIG: Record<NotePriority, { label: string; color: string; border: string; icon: typeof AlertTriangle }> = {
  urgent: { label: '🚨 Acil',          color: 'text-red-600 bg-red-50',     border: 'border-red-300',   icon: AlertTriangle },
  normal: { label: '📌 Normal',         color: 'text-gray-600 bg-gray-50',   border: 'border-gray-200',  icon: Info },
  info:   { label: '💡 Bilgi Amaçlı',  color: 'text-sky-600 bg-sky-50',     border: 'border-sky-200',   icon: Info },
};

const AUDIENCE_CONFIG: Record<NoteAudience, { label: string }> = {
  both:   { label: 'Herkese' },
  expert: { label: 'Yalnızca Uzmana' },
  parent: { label: 'Yalnızca Aileye' },
};

function parseReplies(raw: string | NoteReply[]): NoteReply[] {
  if (Array.isArray(raw)) return raw;
  try { return JSON.parse(raw as string); } catch { return []; }
}

function parseNote(raw: ReturnType<typeof Object.assign>): ProgressNote {
  return {
    ...raw,
    fromRole: (raw.fromRole === 'expert' ? 'expert' : 'parent') as 'expert' | 'parent',
    toRole: (['both', 'expert', 'parent'].includes(raw.toRole) ? raw.toRole : 'both') as NoteAudience,
    priority: (['urgent', 'normal', 'info'].includes(raw.priority) ? raw.priority : 'normal') as NotePriority,
    replies: parseReplies(raw.replies ?? []),
  };
}

const READ_KEY = 'sp_read_notes';
function getReadSet(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(READ_KEY) ?? '[]')); } catch { return new Set(); }
}
function markRead(id: string) {
  const s = getReadSet(); s.add(id);
  localStorage.setItem(READ_KEY, JSON.stringify([...s]));
}

const EMPTY_FORM = {
  fromRole: 'parent' as 'expert' | 'parent',
  fromName: '',
  toRole: 'both' as NoteAudience,
  type: 'general' as NoteType,
  title: '',
  content: '',
  priority: 'normal' as NotePriority,
  dueDate: '',
  sessionDate: '',
  targetPercent: 80,
  currentLevel: '',
  measureUnit: '',
};

// ──────────────────────────────
// Basit Markdown Parse
// ──────────────────────────────
function parseReplyContent(content: string) {
  const parts = content.split(/(!?\[.*?\]\(.*?\))/g);
  return parts.map((part, i) => {
    const imgMatch = part.match(/^!\[(.*?)\]\((.*?)\)$/);
    if (imgMatch) {
      return <img key={i} src={imgMatch[2]} alt={imgMatch[1]} className="max-w-[200px] mt-2 rounded-xl object-cover border border-gray-200" />;
    }
    const linkMatch = part.match(/^\[(.*?)\]\((.*?)\)$/);
    if (linkMatch) {
      return (
        <a key={i} href={linkMatch[2]} target="_blank" rel="noopener noreferrer" className="flex w-fit items-center gap-1.5 px-3 py-1.5 mt-2 bg-indigo-50 text-indigo-700 text-xs font-semibold rounded-lg hover:bg-indigo-100 transition-colors">
          <Paperclip size={13} /> {linkMatch[1]}
        </a>
      );
    }
    return <span key={i} className="whitespace-pre-wrap">{part}</span>;
  });
}

// ──────────────────────────────
// Mini Sparkline (SVG tabanlı)
// ──────────────────────────────
function Sparkline({ values, color = '#6366f1' }: { values: number[]; color?: string }) {
  if (values.length < 2) return null;
  const max = Math.max(...values, 1);
  const w = 80; const h = 28;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * w;
    const y = h - (v / max) * h;
    return `${x},${y}`;
  }).join(' ');
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="overflow-visible">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {values.map((v, i) => {
        const x = (i / (values.length - 1)) * w;
        const y = h - (v / max) * h;
        return <circle key={i} cx={x} cy={y} r="2.5" fill={color} />;
      })}
    </svg>
  );
}

// ──────────────────────────────
// Main Page
// ──────────────────────────────
export function SharedProgressPage() {
  const { user } = useAuthStore();
  const { children, setChildren, selectedChild, setSelectedChild } = useChildStore();
  const selectedChildId = selectedChild?.id ?? '';
  const [notes, setNotes] = useState<ProgressNote[]>([]);

  const [showModal, setShowModal] = useState(false);
  const [editingNote, setEditingNote] = useState<ProgressNote | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [replyingId, setReplyingId] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [replyFile, setReplyFile] = useState<File | null>(null);
  const [isUploadingReply, setIsUploadingReply] = useState(false);
  const replyFileInputRef = useRef<HTMLInputElement>(null);

  const [filterType, setFilterType] = useState<NoteType | ''>('');
  const [filterStatus, setFilterStatus] = useState<NoteStatus | ''>('');
  const [filterPriority, setFilterPriority] = useState<NotePriority | ''>('');
  const [activeTab, setActiveTab] = useState<'all' | 'open' | 'done'>('all');
  const [readSet, setReadSet] = useState<Set<string>>(getReadSet);
  const [isPrinting, setIsPrinting] = useState(false);
  const [trendData, setTrendData] = useState<{
    weekly: { label: string; total: number; done: number }[];
    completionRate: number;
    byType: Record<string, number>;
  } | null>(null);
  const [showTrend, setShowTrend] = useState(false);

  const handlePrint = () => {
    setIsPrinting(true);
    setTimeout(() => { window.print(); setIsPrinting(false); }, 150);
  };

  useEffect(() => {
     
    if (!children.length) childService.getAll().then(setChildren).catch(() => {});
     

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { if (!selectedChild && children.length) setSelectedChild(children[0]); }, [children, selectedChild, setSelectedChild]);

  useEffect(() => {
    if (!selectedChildId) return;
    sharedProgressService.getNotes(selectedChildId)
      .then(data => setNotes(data.map(parseNote)))
      .catch(() => {});
    sharedProgressService.getTrend(selectedChildId)
      .then(setTrendData)
      .catch(() => {});
  }, [selectedChildId]);

  const openAdd = () => {
    setEditingNote(null);
    const role = (user?.role === 'EXPERT' ? 'expert' : 'parent') as 'expert' | 'parent';
    setForm({ ...EMPTY_FORM, fromRole: role, fromName: user?.fullName ?? '' });
    setShowModal(true);
  };

  const openEdit = (n: ProgressNote) => {
    setEditingNote(n);
    setForm({
      fromRole: n.fromRole, fromName: n.fromName, toRole: n.toRole, type: n.type,
      title: n.title, content: n.content, priority: n.priority,
      dueDate: n.dueDate ?? '', sessionDate: n.sessionDate ?? '',
      targetPercent: n.targetPercent ?? 80, currentLevel: n.currentLevel ?? '', measureUnit: n.measureUnit ?? '',
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.content.trim() || !form.fromName.trim()) {
      toast.error('Ad, başlık ve içerik zorunlu.'); return;
    }
    try {
      const payload = {
        ...form,
        dueDate: form.dueDate || undefined,
        sessionDate: form.sessionDate || undefined,
        targetPercent: form.type === 'goal' ? form.targetPercent : undefined,
        currentLevel: form.type === 'goal' ? form.currentLevel : undefined,
        measureUnit: form.type === 'goal' ? form.measureUnit : undefined,
      };

      if (editingNote) {
        const updated = await sharedProgressService.updateNote(editingNote.id, payload);
        setNotes(prev => prev.map(n => n.id === editingNote.id ? parseNote({ ...updated, replies: n.replies }) : n));
        toast.success('Not güncellendi.');
      } else {
        const created = await sharedProgressService.createNote(selectedChildId, payload);
        setNotes(prev => [parseNote({ ...created, replies: [] }), ...prev]);
        toast.success('Not eklendi.');
      }
      setShowModal(false);
    } catch { toast.error('Kaydedilemedi.'); }
  };

  const handleStatusChange = async (id: string, status: NoteStatus) => {
    try {
      const updated = await sharedProgressService.updateStatus(id, status);
      setNotes(prev => prev.map(n => n.id === id ? { ...n, status: updated.status as NoteStatus, completedAt: updated.completedAt } : n));
      if (status === 'done') toast.success('✅ Tamamlandı olarak işaretlendi.');
    } catch { toast.error('Güncellenemedi.'); }
  };

  const handleDelete = async (id: string) => {
    try {
      await sharedProgressService.delete(id);
      setNotes(prev => prev.filter(n => n.id !== id));
      setDeleteId(null);
      toast.success('Not silindi.');
    } catch { toast.error('Silinemedi.'); }
  };

  const handleReply = async (noteId: string) => {
    if (!replyContent.trim() && !replyFile) { toast.error('Yanıt boş bırakılamaz.'); return; }
    const role = (user?.role === 'EXPERT' ? 'expert' : 'parent') as 'expert' | 'parent';
    setIsUploadingReply(true);
    try {
      let contentToSave = replyContent;
      if (replyFile) {
        const url = await uploadService.upload(replyFile);
        const isImage = replyFile.type.startsWith('image/');
        contentToSave += `\n\n${isImage ? '!' : ''}[Eklenen Dosya: ${replyFile.name}](${url})`;
      }

      const updated = await sharedProgressService.addReply(noteId, {
        fromRole: role, fromName: user?.fullName ?? 'Bilinmiyor', content: contentToSave.trim(),
      });
      setNotes(prev => prev.map(n => n.id === noteId ? { ...n, replies: parseReplies(updated.replies) } : n));
      setReplyingId(null); setReplyContent(''); setReplyFile(null);
      toast.success('Yanıt eklendi.');
    } catch { toast.error('Yanıt eklenemedi.'); } finally { setIsUploadingReply(false); }
  };

  const handleExpand = (id: string) => {
    const next = expandedId === id ? null : id;
    setExpandedId(next);
    if (next) { markRead(next); setReadSet(getReadSet()); }
  };

  // Filtered notes (sorted: urgent first)
  const filtered = useMemo(() => notes
    .filter(n => {
      const matchTab = activeTab === 'all' || (activeTab === 'open' && n.status !== 'done') || (activeTab === 'done' && n.status === 'done');
      const matchType = !filterType || n.type === filterType;
      const matchStatus = !filterStatus || n.status === filterStatus;
      const matchPriority = !filterPriority || n.priority === filterPriority;
      return matchTab && matchType && matchStatus && matchPriority;
    })
    .sort((a, b) => {
      const p = { urgent: 0, normal: 1, info: 2 };
      return p[a.priority] - p[b.priority];
    }),
    [notes, activeTab, filterType, filterStatus, filterPriority]
  );

  const stats = useMemo(() => ({
    open: notes.filter(n => n.status === 'open').length,
    inProgress: notes.filter(n => n.status === 'in_progress').length,
    done: notes.filter(n => n.status === 'done').length,
    urgent: notes.filter(n => n.priority === 'urgent' && n.status !== 'done').length,
    unread: notes.filter(n => !readSet.has(n.id)).length,
  }), [notes, readSet]);

  // This week panel
  const today = new Date().toISOString().split('T')[0];
  // eslint-disable-next-line react-hooks/purity
  const weekEnd = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
  const thisWeekNotes = useMemo(() =>
    notes.filter(n => n.dueDate && n.dueDate >= today && n.dueDate <= weekEnd && n.status !== 'done')
      .sort((a, b) => (a.dueDate ?? '') > (b.dueDate ?? '') ? 1 : -1),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [notes]
  );

  // Sparkline: last 7 days completion count
  const sparkData = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, i) => {
      // eslint-disable-next-line react-hooks/purity
      const d = new Date(Date.now() - (6 - i) * 86400000).toISOString().split('T')[0];
      return notes.filter(n => n.completedAt?.startsWith(d)).length;
    });
    return days;
  }, [notes]);

  const isExpert = user?.role === 'EXPERT';

  return (
    <div className="space-y-6 max-w-5xl mx-auto px-4 py-2">
      <div className="print:hidden space-y-6">
        <PageOnboarding
          pageId="shared_progress"
          title="Paylaşımlı İlerleme Defteri"
          description="Çocuğunuzun eğitim ve gelişim sürecinde terapist, öğretmen ve aile arasında ortak bir köprü kurun."
          steps={[
            {
              icon: <Plus size={20} />,
              title: "Gözlem ve Ödev Ekleyin",
              description: "Evde veya seansta yapılan çalışmaları, gözlemleri ve ödevleri sisteme not edin.",
            },
            {
              icon: <MessageSquare size={20} />,
              title: "Ortak İletişim",
              description: "Uzmanların yazdığı hedefleri takip edin ve karşılıklı yanıtlarla geri bildirim verin.",
            },
            {
              icon: <CheckCircle size={20} />,
              title: "İlerlemeyi Takip Edin",
              description: "Açık, devam eden veya tamamlanan görevleri önceliğe göre sıralayın.",
            },
          ]}
        />

        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Paylaşımlı İlerleme Defteri</h1>
            <p className="text-gray-500 mt-1">Uzman ↔ Aile ortak gözlem, ödev ve hedef takibi</p>
          </div>
          <div className="flex gap-2">
            {notes.length > 0 && (
              <Button variant="outline" onClick={handlePrint}>
                <Printer size={15} className="mr-1" />Yazdır
              </Button>
            )}
            <Button onClick={openAdd}><Plus size={15} className="mr-1" />Not Ekle</Button>
          </div>
        </div>

      {/* Child Selector */}
      {children.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {children.map(c => (
            <button key={c.id} onClick={() => setSelectedChild(c)}
              className={`px-4 py-2 rounded-xl border text-sm font-medium transition-all cursor-pointer ${selectedChildId === c.id ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white border-gray-200 text-gray-600 hover:border-indigo-300'}`}>
              {c.name}
            </button>
          ))}
        </div>
      )}

      {!selectedChildId ? (
        <EmptyState icon={<MessageSquare size={28} />} title="Çocuk bulunamadı" description="Önce Çocuklarım sayfasından profil ekleyin." />
      ) : (
        <>
          {/* Stats Row */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[
              { label: 'Açık',          value: stats.open,       color: 'text-amber-600',  bg: 'bg-amber-50' },
              { label: 'Devam Ediyor',  value: stats.inProgress, color: 'text-blue-600',   bg: 'bg-blue-50' },
              { label: 'Tamamlandı',   value: stats.done,       color: 'text-green-600',  bg: 'bg-green-50' },
              { label: '🚨 Acil',       value: stats.urgent,     color: 'text-red-600',    bg: 'bg-red-50' },
              { label: '📭 Okunmadı',   value: stats.unread,     color: 'text-violet-600', bg: 'bg-violet-50' },
            ].map(s => (
              <Card key={s.label} className={`p-3 text-center ${s.bg} border-0`}>
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
              </Card>
            ))}
          </div>

          {/* Trend & This Week - 2 column panel */}
          <div className="grid md:grid-cols-2 gap-4">
            {/* Sparkline Trend */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                  <TrendingUp size={13} className="text-indigo-500" /> Son 7 Günde Tamamlanan
                </div>
                <p className="text-2xl font-bold text-gray-900">{sparkData.reduce((a, b) => a + b, 0)}</p>
                <p className="text-xs text-gray-400">not tamamlandı</p>
              </div>
              <Sparkline values={sparkData} color="#6366f1" />
            </div>

            {/* This Week Panel */}
            <div className="bg-gradient-to-br from-indigo-50 to-violet-50 rounded-2xl border border-indigo-100 p-4">
              <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-700 uppercase tracking-wider mb-2">
                <Calendar size={13} /> Bu Hafta Son Tarihi Gelenler
              </div>
              {thisWeekNotes.length === 0 ? (
                <p className="text-xs text-indigo-400">Bu hafta bekleyen görev yok 🎉</p>
              ) : (
                <div className="space-y-1.5">
                  {thisWeekNotes.slice(0, 3).map(n => (
                    <div key={n.id} className="flex items-center gap-2 text-xs">
                      <span className="text-sm">{TYPE_CONFIG[n.type].icon}</span>
                      <span className="flex-1 font-medium text-gray-800 truncate">{n.title}</span>
                      <span className="text-indigo-500 font-medium shrink-0">
                        {new Date(n.dueDate + 'T12:00:00').toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
                      </span>
                    </div>
                  ))}
                  {thisWeekNotes.length > 3 && (
                    <p className="text-[10px] text-indigo-400">+{thisWeekNotes.length - 3} daha…</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* 8 Haftalık Trend Analizi */}
          {trendData && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <button
                onClick={() => setShowTrend(v => !v)}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <TrendingUp size={16} className="text-indigo-500" />
                  <span className="text-sm font-bold text-gray-900">8 Haftalık İlerleme Trendi</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${trendData.completionRate >= 70 ? 'bg-green-50 text-green-700' : trendData.completionRate >= 40 ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'}`}>
                    %{trendData.completionRate} tamamlanma
                  </span>
                </div>
                <span className="text-gray-400 text-xs">{showTrend ? '▲' : '▼'}</span>
              </button>

              {showTrend && (
                <div className="px-5 pb-5 space-y-4">
                  {/* Çubuk grafik */}
                  <div className="flex items-end gap-1.5 h-24">
                    {trendData.weekly.map((w, i) => {
                      const maxTotal = Math.max(...trendData.weekly.map(x => x.total), 1);
                      const totalH = (w.total / maxTotal) * 100;
                      const doneH = w.total > 0 ? (w.done / w.total) * totalH : 0;
                      return (
                        <div key={i} className="flex-1 flex flex-col items-center gap-1">
                          <div className="w-full relative flex flex-col justify-end" style={{ height: '72px' }}>
                            {/* total bar (gri) */}
                            <div className="w-full rounded-t-sm bg-gray-100" style={{ height: `${totalH}%`, minHeight: w.total > 0 ? '4px' : '0' }} />
                            {/* done bar (indigo, üstüste) */}
                            <div className="absolute bottom-0 w-full rounded-t-sm bg-indigo-500 transition-all"
                              style={{ height: `${doneH}%`, minHeight: w.done > 0 ? '3px' : '0' }} />
                          </div>
                          <span className="text-[9px] text-gray-400 font-medium text-center leading-tight">{w.label}</span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex items-center gap-4 text-[11px] text-gray-500">
                    <span className="flex items-center gap-1"><span className="w-3 h-2 rounded-sm bg-indigo-500 inline-block" /> Tamamlanan</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-2 rounded-sm bg-gray-200 inline-block" /> Toplam</span>
                  </div>

                  {/* Tip dağılımı */}
                  <div>
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Not Tipi Dağılımı</p>
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                      {Object.entries(trendData.byType).map(([type, count]) => {
                        const cfg = TYPE_CONFIG[type as NoteType];
                        if (!cfg || count === 0) return null;
                        return (
                          <div key={type} className={`text-center p-2 rounded-xl border text-xs ${cfg.color}`}>
                            <p className="text-sm">{cfg.icon}</p>
                            <p className="font-bold text-base leading-none mt-0.5">{count}</p>
                            <p className="text-[9px] mt-0.5">{cfg.label}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
            {([['all', 'Tümü'], ['open', 'Açık'], ['done', 'Tamamlanan']] as const).map(([key, label]) => (
              <button key={key} onClick={() => setActiveTab(key)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${activeTab === key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>
                {label}
              </button>
            ))}
          </div>

          {/* Filters */}
          <div className="flex gap-2 flex-wrap">
            <select value={filterType} onChange={e => setFilterType(e.target.value as NoteType | '')}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none bg-white">
              <option value="">Tüm Tipler</option>
              {(Object.entries(TYPE_CONFIG) as [NoteType, (typeof TYPE_CONFIG)[NoteType]][]).map(([k, v]) =>
                <option key={k} value={k}>{v.icon} {v.label}</option>)}
            </select>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as NoteStatus | '')}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none bg-white">
              <option value="">Tüm Durumlar</option>
              {(Object.entries(STATUS_CONFIG) as [NoteStatus, (typeof STATUS_CONFIG)[NoteStatus]][]).map(([k, v]) =>
                <option key={k} value={k}>{v.label}</option>)}
            </select>
            <select value={filterPriority} onChange={e => setFilterPriority(e.target.value as NotePriority | '')}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none bg-white">
              <option value="">Tüm Öncelikler</option>
              {(Object.entries(PRIORITY_CONFIG) as [NotePriority, (typeof PRIORITY_CONFIG)[NotePriority]][]).map(([k, v]) =>
                <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>

          {/* Notes List */}
          {filtered.length === 0 ? (
            <EmptyState icon={<MessageSquare size={28} />}
              title={notes.length === 0 ? 'Henüz not yok' : 'Filtreye uygun not bulunamadı'}
              description={notes.length === 0 ? 'Uzman veya aile olarak ilk notu ekleyin.' : ''}
              action={notes.length === 0 ? <Button onClick={openAdd}><Plus size={14} className="mr-1" />Not Ekle</Button> : undefined} />
          ) : (
            <div className="space-y-3">
              {filtered.map(note => {
                const tc = TYPE_CONFIG[note.type];
                const sc = STATUS_CONFIG[note.status];
                const pc = PRIORITY_CONFIG[note.priority];
                const StatusIcon = sc.icon;
                const isExpanded = expandedId === note.id;
                const isOverdue = note.dueDate && note.status !== 'done' && note.dueDate < today;
                const isUnread = !readSet.has(note.id);
                const isUrgent = note.priority === 'urgent';

                return (
                  <div key={note.id}
                    className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all ${
                      isUrgent && note.status !== 'done'
                        ? 'border-red-300 shadow-red-100'
                        : isOverdue ? 'border-orange-200' : 'border-gray-100'
                    }`}>
                    {/* Urgent top bar */}
                    {isUrgent && note.status !== 'done' && (
                      <div className="bg-red-500 px-4 py-1 flex items-center gap-1.5">
                        <AlertTriangle size={12} className="text-white" />
                        <span className="text-[11px] font-bold text-white uppercase tracking-wider">Acil Dikkat Gerekiyor</span>
                      </div>
                    )}

                    <div className="w-full text-left p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => handleExpand(note.id)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleExpand(note.id); } }}>
                      <div className="flex items-start gap-3">
                        {/* Avatar */}
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 relative ${note.fromRole === 'expert' ? 'bg-purple-100' : 'bg-blue-100'}`}>
                          {note.fromRole === 'expert'
                            ? <GraduationCap size={16} className="text-purple-600" />
                            : <User size={16} className="text-blue-600" />}
                          {/* Verified badge */}
                          {note.fromRole === 'expert' && (
                            <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-purple-600 rounded-full flex items-center justify-center">
                              <Shield size={8} className="text-white" />
                            </span>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${tc.color}`}>{tc.icon} {tc.label}</span>
                            <span className={`text-xs font-medium flex items-center gap-0.5 ${sc.color}`}>
                              <StatusIcon size={11} />{sc.label}
                            </span>
                            {note.priority !== 'normal' && (
                              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${pc.color}`}>{pc.label}</span>
                            )}
                            {note.toRole !== 'both' && (
                              <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                                {AUDIENCE_CONFIG[note.toRole].label}
                              </span>
                            )}
                            {isOverdue && <span className="text-xs text-red-600 font-bold">⚠️ Gecikmiş</span>}
                          </div>
                          <h3 className="font-semibold text-gray-900 text-sm">{note.title}</h3>
                          <p className="text-xs text-gray-500 mt-0.5">
                            <span className={`font-medium ${note.fromRole === 'expert' ? 'text-purple-600' : 'text-blue-600'}`}>{note.fromName}</span>
                            {note.fromRole === 'expert' && <span className="ml-1 text-purple-400">✓ Uzman</span>}
                            {' '}• {new Date(note.createdAt).toLocaleDateString('tr-TR')}
                            {note.sessionDate && ` • Seans: ${new Date(note.sessionDate + 'T12:00:00').toLocaleDateString('tr-TR')}`}
                            {note.dueDate && ` • Son: ${new Date(note.dueDate + 'T12:00:00').toLocaleDateString('tr-TR')}`}
                          </p>
                        </div>

                        <div className="flex gap-1 shrink-0 items-center">
                          {isUnread && <span className="w-2 h-2 bg-indigo-500 rounded-full" title="Okunmadı" />}
                          <button onClick={e => { e.stopPropagation(); openEdit(note); }}
                            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 cursor-pointer"><Pencil size={13} /></button>
                          <button onClick={e => { e.stopPropagation(); setDeleteId(note.id); }}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 cursor-pointer"><Trash2 size={13} /></button>
                          {isExpanded ? <ChevronUp size={15} className="text-gray-400" /> : <ChevronDown size={15} className="text-gray-400" />}
                        </div>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="px-4 pb-5 border-t border-gray-100 pt-4 space-y-4">
                        <p className="text-sm text-gray-700 leading-relaxed">{note.content}</p>

                        {/* Read indicator */}
                        <div className="flex items-center gap-1.5 text-xs text-gray-400">
                          <Eye size={12} /> Okundu
                        </div>

                        {/* SMART Goal Progress */}
                        {note.type === 'goal' && note.targetPercent && (
                          <div className="bg-indigo-50 rounded-xl p-3 space-y-2">
                            <p className="text-xs font-bold text-indigo-700">🎯 Hedef Kriterleri</p>
                            <div className="flex justify-between text-xs text-indigo-800">
                              <span>Hedef Başarı Eşiği</span>
                              <span className="font-bold">%{note.targetPercent}</span>
                            </div>
                            {note.currentLevel && (
                              <p className="text-xs text-indigo-600">Mevcut Seviye: {note.currentLevel}</p>
                            )}
                            {note.measureUnit && (
                              <p className="text-xs text-indigo-600">Ölçüm Birimi: {note.measureUnit}</p>
                            )}
                          </div>
                        )}

                        {/* Status update */}
                        {note.status !== 'done' && (
                          <div className="flex gap-2 flex-wrap">
                            <button onClick={() => handleStatusChange(note.id, 'in_progress')}
                              className="text-sm px-3 py-1.5 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 cursor-pointer font-medium flex items-center gap-1">
                              <Clock size={13} />Devam Ediyor
                            </button>
                            <button onClick={() => handleStatusChange(note.id, 'done')}
                              className="text-sm px-3 py-1.5 rounded-xl bg-green-50 text-green-600 hover:bg-green-100 cursor-pointer font-medium flex items-center gap-1">
                              <CheckCircle size={13} />Tamamlandı
                            </button>
                          </div>
                        )}
                        {note.completedAt && (
                          <p className="text-xs text-green-600">✅ {new Date(note.completedAt).toLocaleDateString('tr-TR')} tarihinde tamamlandı.</p>
                        )}

                        {/* Replies */}
                        {note.replies.length > 0 && (
                          <div className="space-y-2 pl-4 border-l-2 border-gray-200">
                            {note.replies.map(r => (
                              <div key={r.id} className="text-sm">
                                <div className="flex items-center gap-1.5 mb-0.5">
                                  <span className={`text-xs font-semibold ${r.fromRole === 'expert' ? 'text-purple-600' : 'text-blue-600'}`}>
                                    {r.fromName}
                                    {r.fromRole === 'expert' && <span className="ml-1 text-purple-400 font-normal">✓ Uzman</span>}
                                  </span>
                                  <span className="text-xs text-gray-400">{new Date(r.createdAt).toLocaleDateString('tr-TR')}</span>
                                </div>
                                <div className="text-gray-700">{parseReplyContent(r.content)}</div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Reply form */}
                        {replyingId === note.id ? (
                          <div className="space-y-2 bg-gray-50 rounded-xl p-3">
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              {isExpert
                                ? <><Shield size={12} className="text-purple-600" /> Uzman olarak yanıtlıyorsunuz</>
                                : <><User size={12} className="text-blue-600" /> Aile olarak yanıtlıyorsunuz</>}
                            </div>
                            <textarea value={replyContent} onChange={e => setReplyContent(e.target.value)}
                              rows={2} placeholder="Yanıtınız..."
                              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none resize-none" />
                            {replyFile && (
                              <div className="flex items-center gap-2 p-2 bg-indigo-50 border border-indigo-100 rounded-lg text-xs">
                                <Paperclip size={12} className="text-indigo-600" />
                                <span className="flex-1 truncate text-indigo-800">{replyFile.name}</span>
                                <button onClick={() => setReplyFile(null)} className="text-indigo-400 hover:text-red-500 cursor-pointer"><X size={12} /></button>
                              </div>
                            )}
                            <div className="flex items-center justify-between">
                              <div className="flex gap-2">
                                <Button size="sm" onClick={() => handleReply(note.id)} disabled={isUploadingReply || (!replyContent.trim() && !replyFile)}>
                                  {isUploadingReply ? 'Yükleniyor...' : 'Gönder'}
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => { setReplyingId(null); setReplyFile(null); }}>İptal</Button>
                              </div>
                              <div>
                                <input type="file" className="hidden" ref={replyFileInputRef} onChange={e => { if (e.target.files?.length) setReplyFile(e.target.files[0]); }} />
                                <button onClick={() => replyFileInputRef.current?.click()} className="text-gray-400 hover:text-indigo-600 p-1.5 rounded-lg border border-gray-200 hover:bg-gray-100 cursor-pointer flex items-center gap-1 text-xs">
                                  <Paperclip size={13} /> Medya Ekle
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <button onClick={() => { setReplyingId(note.id); setReplyContent(''); }}
                            className="text-xs text-gray-500 hover:text-indigo-600 cursor-pointer flex items-center gap-1">
                            <MessageSquare size={11} />Yanıt ekle
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Add / Edit Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editingNote ? 'Notu Düzenle' : 'Yeni Not Ekle'} className="max-w-xl">
        <div className="space-y-5">

          {/* Role indicator (read-only) */}
          <div className={`flex items-center gap-2 px-3.5 py-3 rounded-2xl text-xs font-semibold border ${
            form.fromRole === 'expert'
              ? 'bg-purple-50/80 border-purple-200/50 text-purple-700'
              : 'bg-indigo-50/80 border-indigo-200/50 text-indigo-700'
          } shadow-sm backdrop-blur-xs`}>
            {form.fromRole === 'expert' ? (
              <><Shield size={15} className="animate-pulse" /> Doğrulanmış Uzman / Terapist kimliğiyle not ekliyorsunuz</>
            ) : (
              <><User size={15} className="text-indigo-600" /> Aile / Veli kimliğiyle not ekliyorsunuz</>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Adınız *</label>
              <input value={form.fromName} onChange={e => setForm(f => ({ ...f, fromName: e.target.value }))}
                placeholder="Ad Soyad..." className="w-full border border-gray-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white transition-all hover:border-gray-300" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Öncelik Seviyesi</label>
              <div className="grid grid-cols-3 gap-2">
                {(Object.entries(PRIORITY_CONFIG) as [NotePriority, typeof PRIORITY_CONFIG[keyof typeof PRIORITY_CONFIG]][]).map(([key, cfg]) => {
                  const isSelected = form.priority === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, priority: key }))}
                      className={`p-2 rounded-xl border text-[10px] font-bold flex flex-col items-center justify-center gap-1.5 transition-all duration-200 cursor-pointer ${
                        isSelected
                          ? key === 'urgent'
                            ? 'border-red-400 bg-red-50 text-red-700 shadow-xs scale-[1.03]'
                            : key === 'info'
                            ? 'border-sky-400 bg-sky-50 text-sky-700 shadow-xs scale-[1.03]'
                            : 'border-indigo-400 bg-indigo-50 text-indigo-700 shadow-xs scale-[1.03]'
                          : 'border-gray-200 hover:border-gray-300 bg-white text-gray-500 hover:bg-slate-50'
                      }`}
                    >
                      <span className="text-sm shrink-0">{key === 'urgent' ? '🚨' : key === 'normal' ? '📌' : '💡'}</span>
                      <span className="truncate w-full text-center">{cfg.label.replace(/^[^\s]+\s+/, '')}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Not Tipi</label>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {(Object.entries(TYPE_CONFIG) as [NoteType, typeof TYPE_CONFIG[keyof typeof TYPE_CONFIG]][]).map(([key, cfg]) => {
                const isSelected = form.type === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, type: key }))}
                    className={`p-2.5 rounded-xl border text-[10px] font-bold flex flex-col items-center justify-center gap-1.5 transition-all duration-200 cursor-pointer ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-700 shadow-xs scale-[1.03]'
                        : 'border-gray-200 hover:border-gray-300 bg-white text-gray-500 hover:bg-slate-50'
                    }`}
                  >
                    <span className="text-base shrink-0">{cfg.icon}</span>
                    <span className="truncate w-full text-center">{cfg.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Görünürlük (Kime Gösterilsin)</label>
            <div className="grid grid-cols-3 gap-2">
              {(Object.entries(AUDIENCE_CONFIG) as [NoteAudience, typeof AUDIENCE_CONFIG[keyof typeof AUDIENCE_CONFIG]][]).map(([key, cfg]) => {
                const isSelected = form.toRole === key;
                const emoji = key === 'both' ? '👥' : key === 'parent' ? '👨‍👩‍👧' : '🎓';
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, toRole: key }))}
                    className={`p-2.5 rounded-xl border text-[10px] font-bold flex flex-col items-center justify-center gap-1.5 transition-all duration-200 cursor-pointer ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-700 shadow-xs scale-[1.03]'
                        : 'border-gray-200 hover:border-gray-300 bg-white text-gray-500 hover:bg-slate-50'
                    }`}
                  >
                    <span className="text-sm shrink-0">{emoji}</span>
                    <span className="truncate w-full text-center">{cfg.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Son Tarih (Termin)</label>
              <input type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white transition-all hover:border-gray-300" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Seans Tarihi</label>
              <input type="date" value={form.sessionDate} onChange={e => setForm(f => ({ ...f, sessionDate: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white transition-all hover:border-gray-300" />
            </div>
          </div>

          {/* SMART Goal Fields */}
          {form.type === 'goal' && (
            <div className="bg-gradient-to-br from-indigo-50/60 to-violet-50/60 rounded-2xl p-4 space-y-3 border border-indigo-100/50 shadow-inner">
              <p className="text-xs font-black text-indigo-800 flex items-center gap-1.5 uppercase tracking-wider">
                <Info size={13} className="text-indigo-600" /> SMART Hedef Kriterleri
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-[10px] font-bold text-indigo-600 mb-1.5 uppercase tracking-wide">Başarı Eşiği (%)</label>
                  <input type="number" min={0} max={100} value={form.targetPercent}
                    onChange={e => setForm(f => ({ ...f, targetPercent: Number(e.target.value) }))}
                    className="w-full border border-indigo-200 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 bg-white transition-all" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-indigo-600 mb-1.5 uppercase tracking-wide">Ölçüm Birimi</label>
                  <input value={form.measureUnit} placeholder="tekrar / dk..."
                    onChange={e => setForm(f => ({ ...f, measureUnit: e.target.value }))}
                    className="w-full border border-indigo-200 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 bg-white transition-all" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-indigo-600 mb-1.5 uppercase tracking-wide">Mevcut Seviye</label>
                  <input value={form.currentLevel} placeholder="2/10 deneme..."
                    onChange={e => setForm(f => ({ ...f, currentLevel: e.target.value }))}
                    className="w-full border border-indigo-200 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 bg-white transition-all" />
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Başlık *</label>
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="Notun başlığı..."
              className="w-full border border-gray-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white transition-all hover:border-gray-300" />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">İçerik *</label>
            <textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
              rows={4} placeholder="Gözlem, ödev, hedef ya da geri bildiriminizi detaylıca yazın..."
              className="w-full border border-gray-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white transition-all hover:border-gray-300 resize-none" />
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={() => setShowModal(false)} className="flex-1 py-2.5 rounded-xl transition-all">İptal</Button>
            <Button onClick={handleSave} className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-md hover:shadow-lg transition-all">{editingNote ? 'Güncelle' : 'Kaydet'}</Button>
          </div>
        </div>
      </Modal>

      <ConfirmModal isOpen={!!deleteId} title="Notu sil?" message="Bu not kalıcı olarak silinecek."
        confirmLabel="Evet, sil" variant="danger"
        onConfirm={() => deleteId && handleDelete(deleteId)} onCancel={() => setDeleteId(null)} />

      {/* Suppress unused var warning */}
      <span className="hidden">{isExpert ? 'e' : ''}<EyeOff size={0} /></span>
      </div>

      {/* Clean clinical print summary sheet */}
      {isPrinting && (
        <div className="hidden print:block p-8 bg-white text-black min-h-screen">
          <div className="max-w-4xl mx-auto border border-gray-200 p-8 rounded-2xl shadow-sm bg-white">
            {/* Header */}
            <div className="flex justify-between items-start border-b pb-6 mb-6">
              <div>
                <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Paylaşımlı İlerleme Defteri Raporu</h1>
                <p className="text-sm text-slate-500 mt-1">Otizm Destek Platformu • Gelişim, Ödev ve SMART Hedef Gözlemleri</p>
              </div>
              <div className="text-right">
                <span className="px-3 py-1 bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold rounded-full uppercase tracking-wider">Klinik Notlar</span>
                <p className="text-xs text-slate-400 mt-2">Tarih: {new Date().toLocaleDateString('tr-TR')}</p>
              </div>
            </div>

            {/* Stats / Info */}
            <div className="grid grid-cols-2 gap-4 mb-8 bg-slate-50 p-4 rounded-xl border border-slate-100">
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider font-bold">Öğrenci / Çocuk</p>
                <p className="text-lg font-black text-slate-900 mt-0.5">{selectedChild?.name}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider font-bold">Toplam Aktif Gözlem</p>
                <p className="text-lg font-black text-slate-900 mt-0.5">{filtered.length} Kayıt</p>
              </div>
            </div>

            {/* List of Notes */}
            <div className="space-y-6">
              {filtered.map(note => {
                const tc = TYPE_CONFIG[note.type];
                const sc = STATUS_CONFIG[note.status];
                const pc = PRIORITY_CONFIG[note.priority];
                return (
                  <div key={note.id} className="border border-slate-100 rounded-xl p-5 break-inside-avoid bg-white shadow-xs">
                    <div className="flex items-center justify-between border-b border-slate-50 pb-3 mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{tc.icon}</span>
                        <h2 className="font-extrabold text-base text-slate-800">{note.title}</h2>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${tc.color}`}>{tc.label}</span>
                      </div>
                      <div className="flex gap-2 items-center">
                        <span className="text-xs font-medium text-slate-500">{new Date(note.createdAt).toLocaleDateString('tr-TR')}</span>
                        <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${pc.color}`}>{pc.label}</span>
                        <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-semibold">{sc.label}</span>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">{note.content}</p>

                      {/* SMART Goal Details */}
                      {note.type === 'goal' && note.targetPercent && (
                        <div className="bg-indigo-50/50 border border-indigo-100 rounded-lg p-3 text-xs space-y-1 mt-2 text-indigo-950">
                          <p className="font-bold text-indigo-800">🎯 SMART Hedef Kriterleri:</p>
                          <p>• <strong>Başarı Eşiği:</strong> %{note.targetPercent}</p>
                          {note.currentLevel && <p>• <strong>Mevcut Seviye:</strong> {note.currentLevel}</p>}
                          {note.measureUnit && <p>• <strong>Ölçüm Birimi:</strong> {note.measureUnit}</p>}
                        </div>
                      )}

                      {/* Meta info */}
                      <p className="text-xs text-slate-400 mt-2">
                        <strong>Yazan:</strong> {note.fromName} ({note.fromRole === 'expert' ? 'Uzman/Terapist' : 'Veli'})
                        {note.sessionDate && ` • Seans Tarihi: ${new Date(note.sessionDate + 'T12:00:00').toLocaleDateString('tr-TR')}`}
                        {note.dueDate && ` • Son Tarih: ${new Date(note.dueDate + 'T12:00:00').toLocaleDateString('tr-TR')}`}
                      </p>

                      {/* Replies */}
                      {note.replies && note.replies.length > 0 && (
                        <div className="mt-3 pl-4 border-l-2 border-slate-200 space-y-2">
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider text-slate-400">Yanıtlar ve Geri Bildirimler:</p>
                          {note.replies.map(r => (
                            <div key={r.id} className="text-xs text-slate-600">
                              <span className="font-bold text-slate-700">{r.fromName} ({r.fromRole === 'expert' ? 'Uzman' : 'Veli'}): </span>
                              <span>{r.content}</span>
                              <span className="text-[10px] text-slate-400 block mt-0.5">{new Date(r.createdAt).toLocaleDateString('tr-TR')}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="mt-12 pt-6 border-t border-slate-100 flex justify-between items-center text-[10px] text-slate-400">
              <p>Otizm Destek Aile ve Uzman Platformu • Gelişim Günlüğü</p>
              <p>Bu rapor veli/uzman tarafından beyan edilen gelişim gözlemlerine dayanmaktadır.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
