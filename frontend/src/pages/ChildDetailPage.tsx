import { useEffect, useRef, useState, useMemo } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import {
  ArrowLeft, FileText, Star, TrendingUp, Tag as TagIcon, Check, X,
  Download, BarChart2, Pencil, Plus, Trash2, Brain, GraduationCap,
  HeartPulse, Users, MessageCircle, Eye, Zap, Activity, CalendarDays, Camera,
  ClipboardList, Gamepad2, Bell, AlertCircle, Loader2, Search,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useChildStore } from '@/store/childStore';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { TextArea } from '@/components/ui/TextArea';
import { Modal } from '@/components/ui/Modal';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { EmptyState } from '@/components/ui/EmptyState';
import { childService } from '@/services/childService';
import { noteService } from '@/services/noteService';
import { milestoneService } from '@/services/milestoneService';
import { tagService } from '@/services/tagService';
import { uploadService } from '@/services/uploadService';
import { screeningService, type ScreeningResultDto } from '@/services/screeningService';
import { calendarService } from '@/services/calendarService';
import { appointmentService } from '@/services/appointmentService';
import { moodService } from '@/services/moodService';
import { sleepService } from '@/services/sleepService';
import { behaviorJournalService } from '@/services/behaviorJournalService';
import { medicationService } from '@/services/medicationService';

import { formatDate } from '@/utils/date';
import { toast } from '@/store/toastStore';
import type { ActivityResult, AppointmentRecord, CalendarEvent, Child, DevelopmentNote, Milestone, MoodEntry, SleepEntry, Tag, MedicationLog, ABCEntry } from '@/types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid, AreaChart, Area } from 'recharts';

const CATEGORY_LABELS: Record<string, string> = {
  ILETISIM: 'İletişim', SOSYAL: 'Sosyal', DUYUSAL: 'Duyusal',
  DAVRANIS: 'Davranış', MOTOR: 'Motor', EGITIM: 'Eğitim',
};

const CATEGORY_COLORS: Record<string, string> = {
  ILETISIM: 'bg-blue-100 text-blue-700',
  SOSYAL: 'bg-green-100 text-green-700',
  DUYUSAL: 'bg-purple-100 text-purple-700',
  DAVRANIS: 'bg-orange-100 text-orange-700',
  MOTOR: 'bg-red-100 text-red-700',
  EGITIM: 'bg-teal-100 text-teal-700',
};

const CATEGORY_DEFS: Record<string, {
  label: string;
  gradient: string;
  border: string;
  text: string;
  bg: string;
  iconBg: string;
  iconColor: string;
  activeGradient: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon: React.ComponentType<any>;
}> = {
  DUYUSAL: {
    label: 'Duyusal Hassasiyetler',
    gradient: 'from-purple-500/5 to-indigo-500/5 hover:from-purple-500/10 hover:to-indigo-500/10',
    border: 'border-purple-100 focus-within:border-purple-400',
    text: 'text-purple-700',
    bg: 'bg-purple-50/50',
    iconBg: 'bg-purple-100/60',
    iconColor: 'text-purple-600',
    activeGradient: 'from-purple-500 to-indigo-500 shadow-purple-200/50',
    icon: Eye,
  },
  MOTOR: {
    label: 'Motor Beceriler',
    gradient: 'from-rose-500/5 to-orange-500/5 hover:from-rose-500/10 hover:to-orange-500/10',
    border: 'border-rose-100 focus-within:border-rose-400',
    text: 'text-rose-700',
    bg: 'bg-rose-50/50',
    iconBg: 'bg-rose-100/60',
    iconColor: 'text-rose-600',
    activeGradient: 'from-rose-500 to-orange-500 shadow-rose-200/50',
    icon: Activity,
  },
  DAVRANIS: {
    label: 'Davranış & Düzen',
    gradient: 'from-amber-500/5 to-orange-500/5 hover:from-amber-500/10 hover:to-orange-500/10',
    border: 'border-amber-100 focus-within:border-amber-400',
    text: 'text-amber-700',
    bg: 'bg-amber-50/50',
    iconBg: 'bg-amber-100/60',
    iconColor: 'text-amber-600',
    activeGradient: 'from-amber-500 to-orange-500 shadow-amber-200/50',
    icon: Brain,
  },
  EGITIM: {
    label: 'Eğitim & Terapiler',
    gradient: 'from-teal-500/5 to-emerald-500/5 hover:from-teal-500/10 hover:to-emerald-500/10',
    border: 'border-teal-100 focus-within:border-teal-400',
    text: 'text-teal-700',
    bg: 'bg-teal-50/50',
    iconBg: 'bg-teal-100/60',
    iconColor: 'text-teal-600',
    activeGradient: 'from-teal-500 to-emerald-500 shadow-teal-200/50',
    icon: GraduationCap,
  },
  SOSYAL: {
    label: 'Sosyal Etkileşim',
    gradient: 'from-emerald-500/5 to-green-500/5 hover:from-emerald-500/10 hover:to-green-500/10',
    border: 'border-emerald-100 focus-within:border-emerald-400',
    text: 'text-emerald-700',
    bg: 'bg-emerald-50/50',
    iconBg: 'bg-emerald-100/60',
    iconColor: 'text-emerald-600',
    activeGradient: 'from-emerald-500 to-green-500 shadow-emerald-200/50',
    icon: Users,
  },
  ILETISIM: {
    label: 'İletişim & Konuşma',
    gradient: 'from-blue-500/5 to-indigo-500/5 hover:from-blue-500/10 hover:to-indigo-500/10',
    border: 'border-blue-100 focus-within:border-blue-400',
    text: 'text-blue-700',
    bg: 'bg-blue-50/50',
    iconBg: 'bg-blue-100/60',
    iconColor: 'text-blue-600',
    activeGradient: 'from-blue-500 to-indigo-500 shadow-blue-200/50',
    icon: MessageCircle,
  },
};

const MILESTONE_CATEGORIES = [
  { value: 'İletişim', color: '#3B82F6', bgLight: '#EFF6FF', icon: MessageCircle },
  { value: 'Sosyal',   color: '#10B981', bgLight: '#ECFDF5', icon: Users },
  { value: 'Duyusal',  color: '#8B5CF6', bgLight: '#F5F3FF', icon: Eye },
  { value: 'Davranış', color: '#F59E0B', bgLight: '#FFFBEB', icon: Zap },
  { value: 'Motor',    color: '#EF4444', bgLight: '#FEF2F2', icon: Activity },
  { value: 'Eğitim',  color: '#0D9488', bgLight: '#F0FDFA', icon: GraduationCap },
];

const NOTES_PAGE_SIZE = 5;

function calcAge(birthDate: string): string | null {
  if (!birthDate) return null;
  const birth = new Date(birthDate);
  if (Number.isNaN(birth.getTime())) return null;
  const today = new Date();
  let months = (today.getFullYear() - birth.getFullYear()) * 12 + today.getMonth() - birth.getMonth();
  if (today.getDate() < birth.getDate()) months -= 1;
  if (months < 0) return null;
  if (months < 24) return `${months} aylık`;
  const years = Math.floor(months / 12);
  const extra = months % 12;
  return extra > 0 ? `${years} yaş ${extra} ay` : `${years} yaş`;
}

const CHART_COLORS = ['#6366f1', '#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444'];
const BEP_REPORTS_KEY = 'bep_shared_reports';

interface SharedBepReport {
  id: string;
  childId: string;
  studentName: string;
  diagnosis: string;
  performance: string;
  goals: Array<{ domain: string; longTerm: string; progress: number; status: string }>;
  sharedAt: string;
  schoolYear: string;
}

const RISK_LABELS: Record<ScreeningResultDto['riskLevel'], { label: string; className: string }> = {
  LOW: { label: 'Düşük risk', className: 'bg-green-50 text-green-700' },
  MEDIUM: { label: 'Orta risk', className: 'bg-yellow-50 text-yellow-700' },
  HIGH: { label: 'Yüksek risk', className: 'bg-red-50 text-red-700' },
};

function readActivityResults(source?: Record<string, unknown>): ActivityResult[] {
  const screeningActivities = source?.screeningActivities as Record<string, unknown> | undefined;
  const results = screeningActivities?.results;
  return Array.isArray(results)
    ? [...results as ActivityResult[]].sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())
    : [];
}

function readSharedBepReports(childId: string): SharedBepReport[] {
  try {
    const reports = JSON.parse(localStorage.getItem(BEP_REPORTS_KEY) || '[]') as SharedBepReport[];
    return reports
      .filter(report => report.childId === childId)
      .sort((a, b) => new Date(b.sharedAt).getTime() - new Date(a.sharedAt).getTime());
  } catch {
    return [];
  }
}

export function ChildDetailPage() {
  return <ChildDetailContent />;
}

function ChildDetailContent() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const accessToken = useAuthStore(s => s.accessToken);

  const [child, setChild] = useState<Child | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState<DevelopmentNote[]>([]);
  const [notesTotal, setNotesTotal] = useState(0);
  const [notesPage, setNotesPage] = useState(0);
  const [loadingMoreNotes, setLoadingMoreNotes] = useState(false);

  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [moodEntries, setMoodEntries] = useState<MoodEntry[]>([]);
  const [sleepEntries, setSleepEntries] = useState<SleepEntry[]>([]);
  const [medicationLogs, setMedicationLogs] = useState<MedicationLog[]>([]);
  const [abcEntries, setAbcEntries] = useState<ABCEntry[]>([]);
  const [screeningResults, setScreeningResults] = useState<ScreeningResultDto[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [appointments, setAppointments] = useState<AppointmentRecord[]>([]);
  const [allTags, setAllTags] = useState<Record<string, Tag[]>>({});
  const [tagsLoading, setTagsLoading] = useState(false);
  const [tagsError, setTagsError] = useState(false);
  const [editingTags, setEditingTags] = useState(false);
  const [selectedTagIds, setSelectedTagIds] = useState<Set<string>>(new Set());
  const [savingTags, setSavingTags] = useState(false);
  const [tagSearchQuery, setTagSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: '', birthDate: '', diagnosisInfo: '', educationProgram: '', therapies: '',
    gender: '' as '' | 'ERKEK' | 'KIZ',
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const [showMilestoneModal, setShowMilestoneModal] = useState(false);
  const [milestoneForm, setMilestoneForm] = useState({
    title: '', description: '', achievedDate: new Date().toISOString().split('T')[0], category: '',
  });
  const [milestoneLoading, setMilestoneLoading] = useState(false);

  const [editingMilestone, setEditingMilestone] = useState<Milestone | null>(null);
  const [deleteMilestoneId, setDeleteMilestoneId] = useState<string | null>(null);
  const [editMilestoneForm, setEditMilestoneForm] = useState({
    title: '', description: '', achievedDate: '', category: '',
  });
  const [savingMilestone, setSavingMilestone] = useState(false);

  useEffect(() => {
    if (!id) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
     
    setError(null);

    Promise.all([
      childService.getById(id)
        .then(data => {
          setChild(data);
          setError(null);
        })
        .catch(err => {
          console.error('Child fetch error:', err);
          setError(err.response?.data?.message || 'Çocuk profili yüklenirken bir hata oluştu veya bu profile erişim yetkiniz bulunmuyor.');
        }),
      noteService.getByChild(id, 0, NOTES_PAGE_SIZE).then(res => {
        setNotes(res.content);
        setNotesTotal(res.totalPages);
      }).catch(() => {}),
      milestoneService.getByChild(id).then(setMilestones).catch(() => {}),
      moodService.getByChild(id).then(data => setMoodEntries(data || [])).catch(() => {}),
      sleepService.getByChild(id).then(data => setSleepEntries(data || [])).catch(() => {}),
      behaviorJournalService.getByChild(id).then(data => setAbcEntries(data || [])).catch(() => {}),
      medicationService.getLogs(id).then(data => setMedicationLogs(data || [])).catch(() => {}),
      screeningService.getByChild(id).then(setScreeningResults).catch(() => setScreeningResults([])),
      calendarService.getByChild(id).then(setEvents).catch(() => setEvents([])),
      appointmentService.getAll()
        .then(data => setAppointments(data.filter(item => item.childId === id)))
        .catch(() => setAppointments([])),
    ]).finally(() => {
      setLoading(false);
    });

    setTagsLoading(true);
    tagService.getTagsByCategory()
      .then(data => { setAllTags(data); setTagsError(false); })
      .catch(() => setTagsError(true))
      .finally(() => setTagsLoading(false));

    if ((location.state as { openTagEditor?: boolean } | null)?.openTagEditor) {
      setEditingTags(true);
      window.history.replaceState({}, '');
    }
  }, [id, location.state]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (child?.tagIds) setSelectedTagIds(new Set(child.tagIds));
    if (child) {
      setProfileForm({
        name: child.name || '',
        birthDate: child.birthDate || '',
        diagnosisInfo: child.diagnosisInfo || '',
        educationProgram: child.educationProgram || '',
        therapies: child.therapies || '',
        gender: (child.gender as '' | 'ERKEK' | 'KIZ') || '',
      });
    }
  }, [child]);

  const correlationData = useMemo(() => {
    const behaviorByDate: Record<string, number> = {};
    abcEntries.forEach(entry => {
      const dateStr = entry.date;
      if (dateStr) {
        behaviorByDate[dateStr] = (behaviorByDate[dateStr] || 0) + 1;
      }
    });

    const medByDate: Record<string, { taken: number; total: number; sideEffects: string[] }> = {};
    medicationLogs.forEach(log => {
      const dateStr = log.logDate;
      if (dateStr) {
        if (!medByDate[dateStr]) {
          medByDate[dateStr] = { taken: 0, total: 0, sideEffects: [] };
        }
        medByDate[dateStr].total += 1;
        if (log.taken) {
          medByDate[dateStr].taken += 1;
        }
        if (log.sideEffects) {
          log.sideEffects.forEach(se => {
            if (!medByDate[dateStr].sideEffects.includes(se)) {
              medByDate[dateStr].sideEffects.push(se);
            }
          });
        }
      }
    });

    const allDates = Array.from(new Set([...Object.keys(behaviorByDate), ...Object.keys(medByDate)]));
    allDates.sort((a, b) => a.localeCompare(b));

    return allDates.slice(-30).map(dateStr => {
      const formattedDate = new Date(dateStr).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
      const behaviorCount = behaviorByDate[dateStr] || 0;
      const medInfo = medByDate[dateStr] || { taken: 0, total: 0, sideEffects: [] };
      const adherence = medInfo.total > 0 ? Math.round((medInfo.taken / medInfo.total) * 100) : null;

      return {
        date: dateStr,
        displayDate: formattedDate,
        behaviorCount,
        takenCount: medInfo.taken,
        totalCount: medInfo.total,
        adherence,
        sideEffects: medInfo.sideEffects,
      };
    });
  }, [abcEntries, medicationLogs]);

  const handleLoadMoreNotes = async () => {
    if (!id) return;
    setLoadingMoreNotes(true);
    try {
      const nextPage = notesPage + 1;
      const res = await noteService.getByChild(id, nextPage, NOTES_PAGE_SIZE);
      setNotes(prev => [...prev, ...res.content]);
      setNotesPage(nextPage);
      setNotesTotal(res.totalPages);
    } catch {
      toast.error('Notlar yüklenemedi.');
    }
    setLoadingMoreNotes(false);
  };

  const handleDownloadPdf = async () => {
    if (!id) return;
    try {
      const response = await fetch(`/api/pdf/child/${id}`, {
        headers: { Authorization: `Bearer ${accessToken || ''}` },
      });
      if (!response.ok) throw new Error();
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `gelisim-raporu-${child?.name || id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch { toast.error('PDF raporu oluşturulamadı.'); }
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !id || !child) return;
    setUploadingPhoto(true);
    try {
      const url = await uploadService.upload(file);
      const updated = await childService.update(id, { ...child, profileImageUrl: url });
      setChild(updated);
      useChildStore.getState().updateChild(updated);
      toast.success('Profil fotoğrafı güncellendi.');
    } catch {
      toast.error('Fotoğraf yüklenemedi.');
    }
    setUploadingPhoto(false);
    if (photoInputRef.current) photoInputRef.current.value = '';
  };

  const handleSaveProfile = async () => {
    if (!child || !id) return;
    setSavingProfile(true);
    try {
      const updated = await childService.update(id, {
        ...child,
        ...profileForm,
        gender: profileForm.gender || undefined,
      });
      setChild(updated);
      useChildStore.getState().updateChild(updated);
      setEditingProfile(false);
      toast.success('Profil güncellendi.');
    } catch { toast.error('Profil güncellenemedi.'); }
    setSavingProfile(false);
  };

  const handleToggleTag = (tagId: string) => {
    setSelectedTagIds(prev => {
      const next = new Set(prev);
      if (next.has(tagId)) next.delete(tagId); else next.add(tagId);
      return next;
    });
  };

  const handleSaveTags = async () => {
    if (!child || !id) return;
    setSavingTags(true);
    try {
      const updated = await childService.update(id, { ...child, tagIds: Array.from(selectedTagIds) });
      setChild(updated);
      useChildStore.getState().updateChild(updated);
      setEditingTags(false);
      toast.success('Etiketler kaydedildi.');
    } catch { toast.error('Etiketler kaydedilemedi.'); }
    finally { setSavingTags(false); }
  };

  const handleCreateMilestone = async () => {
    if (!milestoneForm.title.trim() || !id) return;
    setMilestoneLoading(true);
    try {
      const milestone = await milestoneService.create({ ...milestoneForm, childId: id });
      setMilestones(prev => [milestone, ...prev]);
      setShowMilestoneModal(false);
      setMilestoneForm({ title: '', description: '', achievedDate: new Date().toISOString().split('T')[0], category: '' });
      toast.success('Milestone eklendi.');
    } catch { toast.error('Milestone eklenemedi.'); }
    setMilestoneLoading(false);
  };

  const handleOpenEditMilestone = (m: Milestone) => {
    setEditingMilestone(m);
    setEditMilestoneForm({
      title: m.title,
      description: m.description || '',
      achievedDate: m.achievedDate,
      category: m.category || '',
    });
  };

  const handleSaveEditMilestone = async () => {
    if (!editingMilestone || !editMilestoneForm.title.trim()) return;
    setSavingMilestone(true);
    try {
      const updated = await milestoneService.update(editingMilestone.id, {
        ...editMilestoneForm,
        childId: editingMilestone.childId,
      });
      setMilestones(prev => prev.map(m => m.id === updated.id ? updated : m));
      setEditingMilestone(null);
      toast.success('Milestone güncellendi.');
    } catch { toast.error('Milestone güncellenemedi.'); }
    setSavingMilestone(false);
  };

  const handleDeleteMilestone = async (milestoneId: string) => {
    try {
      await milestoneService.delete(milestoneId);
      setMilestones(prev => prev.filter(m => m.id !== milestoneId));
      toast.success('Milestone silindi.');
    } catch { toast.error('Milestone silinemedi.'); }
    setDeleteMilestoneId(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-indigo-50/80 dark:bg-indigo-950/30 flex items-center justify-center mx-auto shadow-inner animate-pulse">
            <Loader2 size={28} className="animate-spin text-indigo-500" />
          </div>
          <p className="text-slate-400 dark:text-slate-500 text-xs font-extrabold uppercase tracking-widest animate-pulse">Profil Verileri Yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (error || !child) {
    return (
      <div className="flex items-center justify-center min-h-[400px] p-4">
        <div className="max-w-md w-full bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 rounded-[32px] p-8 text-center shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-red-500 via-orange-500 to-amber-500" />
          <div className="w-16 h-16 bg-red-50 dark:bg-red-950/30 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-inner">
            <AlertCircle size={30} className="text-red-500" />
          </div>
          <h3 className="text-lg font-extrabold text-slate-950 dark:text-white mb-2 tracking-tight">Profil Yüklenemedi</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 font-semibold leading-relaxed">
            {error || 'Aradığınız çocuk profili bulunamadı veya bu profile erişim yetkiniz bulunmuyor.'}
          </p>
          <div className="flex gap-3 justify-center">
            <Link to="/cocuklarim">
              <Button variant="outline" className="rounded-xl border-slate-200 text-slate-700 font-bold text-xs">
                Geri Dön
              </Button>
            </Link>
            <Button
              onClick={() => {
                setError(null);
                setLoading(true);
                childService.getById(id!)
                  .then(data => {
                    setChild(data);
                    setError(null);
                  })
                  .catch(err => {
                    setError(err.response?.data?.message || 'Profil yüklenemedi.');
                  })
                  .finally(() => setLoading(false));
              }}
              className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs"
            >
              Yeniden Dene
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const age = calcAge(child.birthDate || '');
  const initials = child.name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?';

  const categoryCounts: Record<string, number> = {};
  notes.forEach(n => {
    const cat = n.category || 'Genel';
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
  });
  const chartData = Object.entries(categoryCounts).map(([name, value]) => ({ name: CATEGORY_LABELS[name] || name, value }));

  const monthlyData = (() => {
    const map: Record<string, number> = {};
    notes.forEach(n => {
      // eslint-disable-next-line react-hooks/purity
      const d = new Date(n.noteDate || n.createdAt || Date.now());
      const key = d.toLocaleDateString('tr-TR', { month: 'short', year: '2-digit' });
      map[key] = (map[key] || 0) + 1;
    });
    return Object.entries(map).slice(-6).map(([ay, not]) => ({ ay, not }));
  })();

  const milestoneTimeline = (() => {
    const map: Record<string, number> = {};
    milestones.forEach(m => {
      // eslint-disable-next-line react-hooks/purity
      const d = new Date(m.achievedDate || Date.now());
      const key = d.toLocaleDateString('tr-TR', { month: 'short', year: '2-digit' });
      map[key] = (map[key] || 0) + 1;
    });
    return Object.entries(map).slice(-6).map(([ay, milestone]) => ({ ay, milestone }));
  })();

  const moodTrend = (() => {
    const map: Record<string, { total: number; count: number }> = {};
    moodEntries.forEach(m => {
      const d = new Date(m.entryDate || m.createdAt);
      const key = d.toLocaleDateString('tr-TR', { month: 'short', year: '2-digit' });
      if (!map[key]) map[key] = { total: 0, count: 0 };
      map[key].total += m.moodLevel;
      map[key].count++;
    });
    return Object.entries(map).slice(-6).map(([ay, v]) => ({ ay, ruh: parseFloat((v.total / v.count).toFixed(1)) }));
  })();

  const sleepTrend = (() => {
    const map: Record<string, { total: number; count: number }> = {};
    sleepEntries.forEach(s => {
      if (!s.durationMinutes) return;
      const d = new Date(s.sleepDate || s.createdAt);
      const key = d.toLocaleDateString('tr-TR', { month: 'short', year: '2-digit' });
      if (!map[key]) map[key] = { total: 0, count: 0 };
      map[key].total += s.durationMinutes / 60;
      map[key].count++;
    });
    return Object.entries(map).slice(-6).map(([ay, v]) => ({ ay, saat: parseFloat((v.total / v.count).toFixed(1)) }));
  })();

  // Aktivite ısı haritası — son 16 haftalık günlük not/aktivite sayısı
  const activityHeatmap = (() => {
    const dayCounts: Record<string, number> = {};
    notes.forEach(n => {
      const key = (n.noteDate || n.createdAt || '').slice(0, 10);
      if (key) dayCounts[key] = (dayCounts[key] || 0) + 1;
    });
    milestones.forEach(m => {
      const key = (m.achievedDate || '').slice(0, 10);
      if (key) dayCounts[key] = (dayCounts[key] || 0) + 1;
    });
    // Son 16 hafta = 112 gün, Pazartesi'den başla
    const today = new Date();
    const startDay = new Date(today);
    startDay.setDate(today.getDate() - 111);
    // Haftanın başına (Pazartesi) hizala
    const dow = startDay.getDay(); // 0=Pazar
    startDay.setDate(startDay.getDate() - ((dow + 6) % 7));

    const weeks: { date: string; count: number; iso: string }[][] = [];
    let week: { date: string; count: number; iso: string }[] = [];
    const cursor = new Date(startDay);
    while (cursor <= today) {
      const iso = cursor.toISOString().slice(0, 10);
      week.push({ date: iso, count: dayCounts[iso] || 0, iso });
      if (week.length === 7) { weeks.push(week); week = []; }
      cursor.setDate(cursor.getDate() + 1);
    }
    if (week.length > 0) {
      while (week.length < 7) week.push({ date: '', count: 0, iso: '' });
      weeks.push(week);
    }
    const max = Math.max(1, ...Object.values(dayCounts));
    return { weeks, max };
  })();

  const genderLabel = child.gender === 'ERKEK' ? 'Erkek' : child.gender === 'KIZ' ? 'Kız' : null;
  const sortedScreenings = [...screeningResults].sort((a, b) =>
    new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
  );
  const latestScreening = sortedScreenings[0];
  const latestActivity = readActivityResults(child.privacySettings)[0];
  const latestNote = notes[0];
  const now = new Date();
  const upcomingAppointment = appointments
    .filter(item => item.status !== 'CANCELLED' && item.status !== 'COMPLETED')
    .sort((a, b) => new Date(`${a.date}T${a.time || '00:00'}`).getTime() - new Date(`${b.date}T${b.time || '00:00'}`).getTime())[0];
  const upcomingEvent = events
    .filter(item => new Date(item.startTime) >= now)
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())[0];
  const bepReports = readSharedBepReports(child.id);
  const latestBepReport = bepReports[0];
  const latestBepProgress = latestBepReport?.goals.length
    ? Math.round(latestBepReport.goals.reduce((total, goal) => total + (goal.progress || 0), 0) / latestBepReport.goals.length)
    : 0;

  return (
    <div className="space-y-5">

      {/* Hero Header Card */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-950 to-purple-950 shadow-2xl shadow-indigo-900/30">
        {/* Decorative mesh glow */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full -translate-y-1/3 translate-x-1/4 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/10 rounded-full translate-y-1/2 -translate-x-1/4 blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-indigo-400/5 rounded-full -translate-x-1/2 -translate-y-1/2 blur-2xl pointer-events-none" />

        <div className="relative p-6 sm:p-8">
          {/* Back Button */}
          <Link to="/cocuklarim" className="inline-flex items-center gap-1.5 text-white/50 hover:text-white/90 text-xs font-semibold transition-colors mb-5 group">
            <ArrowLeft size={15} className="group-hover:-translate-x-0.5 transition-transform" />
            Tüm Profiller
          </Link>

          <div className="flex flex-col sm:flex-row sm:items-center gap-5">
            {/* Avatar */}
            <div className="relative group shrink-0">
              {child.profileImageUrl ? (
                <img
                  src={child.profileImageUrl}
                  alt={child.name}
                  className="w-[88px] h-[88px] rounded-2xl object-cover shadow-2xl shadow-indigo-500/20 ring-[3px] ring-white/15"
                />
              ) : (
                <div className="w-[88px] h-[88px] rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center text-white font-extrabold text-2xl shrink-0 shadow-2xl shadow-indigo-500/20 ring-[3px] ring-white/15">
                  {initials}
                </div>
              )}
              <button
                onClick={() => photoInputRef.current?.click()}
                disabled={uploadingPhoto}
                className="absolute inset-0 rounded-2xl bg-black/50 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 cursor-pointer"
                title="Fotoğraf değiştir"
              >
                {uploadingPhoto
                  ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : <Camera size={20} className="text-white" />
                }
              </button>
              <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">{child.name}</h1>
              <div className="flex flex-wrap items-center gap-2 mt-2.5">
                {child.birthDate && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/8 border border-white/10 text-white/70 text-xs font-medium">
                    <CalendarDays size={12} />
                    {formatDate(child.birthDate)}
                  </span>
                )}
                {age !== null && (
                  <span className="px-3 py-1 rounded-full bg-indigo-500/25 border border-indigo-400/20 text-indigo-200 text-xs font-semibold">
                    {age}
                  </span>
                )}
                {genderLabel && (
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${child.gender === 'ERKEK' ? 'bg-sky-500/20 border-sky-400/20 text-sky-200' : 'bg-pink-500/20 border-pink-400/20 text-pink-200'}`}>
                    {genderLabel}
                  </span>
                )}
                {child.diagnosisInfo && (
                  <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-white/60 text-xs font-medium truncate max-w-[220px]">
                    {child.diagnosisInfo}
                  </span>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-2 shrink-0">
              <Link to="/tedavi">
                <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-indigo-700 hover:bg-indigo-50 text-sm font-bold transition-all duration-200 shadow-lg shadow-white/10">
                  <HeartPulse size={15} />
                  Tedavi Planı
                </button>
              </Link>
              <button
                onClick={handleDownloadPdf}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/8 hover:bg-white/15 border border-white/10 text-white/80 hover:text-white text-sm font-semibold transition-all duration-200 backdrop-blur-sm"
              >
                <Download size={15} />
                Rapor
              </button>
            </div>
          </div>

          {/* Stats Capsules */}
          <div className="grid grid-cols-3 gap-3 mt-7">
            {[
              { label: 'Gelişim Notu', value: notes.length, icon: FileText },
              { label: 'Milestone', value: milestones.length, icon: Star },
              { label: 'Etiket', value: child.tags?.length || 0, icon: TagIcon },
            ].map(s => {
              const Icon = s.icon;
              return (
                <div key={s.label} className="text-center bg-white/5 backdrop-blur-sm border border-white/8 rounded-2xl p-4 hover:bg-white/10 transition-all duration-300 group/stat cursor-default">
                  <p className="text-2xl sm:text-3xl font-extrabold text-white group-hover/stat:scale-105 transition-transform duration-300">{s.value}</p>
                  <div className="flex items-center justify-center gap-1.5 mt-1.5">
                    <Icon size={12} className="text-indigo-300/60" />
                    <p className="text-indigo-200/50 text-[11px] font-semibold tracking-wide">{s.label}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Takip Merkezi */}
      <div>
        <div className="mb-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-indigo-500">Takip Merkezi</p>
          <h2 className="text-lg font-bold text-gray-900 mt-0.5">Çocuğa özel son durum</h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Son Tarama */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 group relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 to-blue-500 rounded-t-2xl" />
            <div className="flex items-center justify-between mb-3 pt-1">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center group-hover:bg-indigo-100 group-hover:scale-105 transition-all duration-300">
                <ClipboardList size={18} className="text-indigo-500" />
              </div>
              {latestScreening && (
                <div className={`w-2.5 h-2.5 rounded-full ring-2 ring-white ${latestScreening.riskLevel === 'LOW' ? 'bg-green-400' : latestScreening.riskLevel === 'MEDIUM' ? 'bg-yellow-400' : 'bg-red-400'}`} />
              )}
            </div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Son Tarama</p>
            {latestScreening && (
              <>
                <p className="mt-1.5 text-base font-bold text-gray-900">Skor {latestScreening.score}/20</p>
                <span className={`inline-block mt-2 px-2.5 py-0.5 rounded-full text-xs font-semibold ${RISK_LABELS[latestScreening.riskLevel].className}`}>
                  {RISK_LABELS[latestScreening.riskLevel].label}
                </span>
              </>
            )}
          </div>

          {/* Son Aktivite */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 group relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 to-fuchsia-500 rounded-t-2xl" />
            <div className="flex items-center justify-between mb-3 pt-1">
              <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center group-hover:bg-purple-100 group-hover:scale-105 transition-all duration-300">
                <Gamepad2 size={18} className="text-purple-500" />
              </div>
            </div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Son Aktivite</p>
            {latestActivity ? (
              <>
                <p className="mt-1.5 text-sm font-bold text-gray-900 line-clamp-1">{latestActivity.activityTitle}</p>
                <p className="mt-1 text-xs text-gray-500">{latestActivity.score}/{latestActivity.total} · {formatDate(latestActivity.completedAt)}</p>
              </>
            ) : (
              <p className="mt-3 text-xs text-gray-400 font-medium">Henüz aktivite yok</p>
            )}
          </div>

          {/* Son Not */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 group relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-t-2xl" />
            <div className="flex items-center justify-between mb-3 pt-1">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center group-hover:bg-blue-100 group-hover:scale-105 transition-all duration-300">
                <FileText size={18} className="text-blue-500" />
              </div>
            </div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Son Not</p>
            {latestNote ? (
              <>
                <p className="mt-1.5 text-sm font-bold text-gray-900 line-clamp-1">{latestNote.title}</p>
                <p className="mt-1 text-xs text-gray-500">{formatDate(latestNote.noteDate || latestNote.createdAt)}</p>
              </>
            ) : (
              <Link to={`/notlar?child=${id}&new=1`} className="mt-3 inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 font-semibold transition-colors group/link">
                Not Ekle
                <ArrowLeft size={12} className="rotate-180 group-hover/link:translate-x-0.5 transition-transform" />
              </Link>
            )}
          </div>

          {/* Yaklaşan Plan */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 group relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-orange-500 rounded-t-2xl" />
            <div className="flex items-center justify-between mb-3 pt-1">
              <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center group-hover:bg-amber-100 group-hover:scale-105 transition-all duration-300">
                <Bell size={18} className="text-amber-500" />
              </div>
              {(upcomingAppointment || upcomingEvent) && (
                <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse ring-2 ring-white" />
              )}
            </div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Yaklaşan Plan</p>
            {upcomingAppointment ? (
              <>
                <p className="mt-1.5 text-sm font-bold text-gray-900 line-clamp-1">{upcomingAppointment.expertName}</p>
                <p className="mt-1 text-xs text-gray-500">{formatDate(upcomingAppointment.date)} · {upcomingAppointment.time}</p>
              </>
            ) : upcomingEvent ? (
              <>
                <p className="mt-1.5 text-sm font-bold text-gray-900 line-clamp-1">{upcomingEvent.title}</p>
                <p className="mt-1 text-xs text-gray-500">{formatDate(upcomingEvent.startTime)}</p>
              </>
            ) : (
              <p className="mt-3 text-xs text-gray-400 font-medium">Planlanmış kayıt yok</p>
            )}
          </div>
        </div>

        {latestBepReport && (
          <div className="mt-4 bg-white rounded-2xl border border-indigo-100 shadow-sm p-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between hover:shadow-md transition-all duration-300">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
                <BarChart2 size={17} className="text-indigo-600" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-indigo-500">Paylaşılan BEP</p>
                <p className="text-sm font-semibold text-gray-900 mt-0.5">
                  {latestBepReport.schoolYear} · {latestBepReport.goals.length} hedef · <span className="text-indigo-600">%{latestBepProgress} ilerleme</span>
                </p>
              </div>
            </div>
            <Link to={`/bep-raporu?child=${child.id}`}>
              <Button size="sm" variant="outline" className="shrink-0">BEP Taslağını Aç</Button>
            </Link>
          </div>
        )}
      </div>

      {/* Hızlı Eylemler */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Not Ekle', desc: 'Gelişim gözlemi', icon: FileText, to: `/notlar?child=${id}&new=1`, color: 'text-blue-600', bg: 'bg-blue-50/80', gradient: 'from-blue-500 to-cyan-500' },
          { label: 'Randevu', desc: 'Uzman görüşmesi', icon: CalendarDays, to: '/randevular', color: 'text-violet-600', bg: 'bg-violet-50/80', gradient: 'from-violet-500 to-purple-500' },
          { label: 'BEP Oluştur', desc: 'Eğitim planı', icon: GraduationCap, to: `/bep-raporu?child=${id}`, color: 'text-orange-600', bg: 'bg-orange-50/80', gradient: 'from-orange-500 to-amber-500' },
        ].map(item => {
          const Icon = item.icon;
          return (
            <Link key={item.label} to={item.to}>
              <div className={`rounded-2xl p-4 ${item.bg} hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 cursor-pointer group border border-white/60 relative overflow-hidden`}>
                <div className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r ${item.gradient}`} />
                <div className={`w-10 h-10 rounded-xl bg-white/80 flex items-center justify-center mb-3 shadow-sm group-hover:scale-110 transition-transform duration-300`}>
                  <Icon size={18} className={item.color} />
                </div>
                <p className={`text-sm font-bold ${item.color}`}>{item.label}</p>
                <p className="text-[11px] text-gray-400 mt-0.5 font-medium">{item.desc}</p>
              </div>
            </Link>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Sol Kolon */}
        <div className="lg:col-span-1 space-y-6">

          {/* Profil Bilgileri */}
          <Card>
            <CardHeader className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-purple-50 flex items-center justify-center">
                  <Brain size={16} className="text-purple-500" />
                </div>
                <CardTitle>Profil Bilgileri</CardTitle>
              </div>
              {!editingProfile ? (
                <Button variant="ghost" size="sm" onClick={() => setEditingProfile(true)}>
                  <Pencil size={14} className="mr-1" /> Düzenle
                </Button>
              ) : (
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => {
                    setEditingProfile(false);
                    setProfileForm({
                      name: child.name || '', birthDate: child.birthDate || '',
                      diagnosisInfo: child.diagnosisInfo || '', educationProgram: child.educationProgram || '',
                      therapies: child.therapies || '', gender: (child.gender as '' | 'ERKEK' | 'KIZ') || '',
                    });
                  }}>
                    <X size={16} />
                  </Button>
                  <Button size="sm" onClick={handleSaveProfile} disabled={savingProfile}>
                    <Check size={16} className="mr-1" />
                    {savingProfile ? 'Kaydediliyor...' : 'Kaydet'}
                  </Button>
                </div>
              )}
            </CardHeader>

            <div className="px-5 pb-5">
            {editingProfile ? (
              <div className="space-y-3">
                <Input label="Ad" value={profileForm.name} onChange={e => setProfileForm(f => ({ ...f, name: e.target.value }))} />
                <Input label="Doğum Tarihi" type="date" value={profileForm.birthDate} onChange={e => setProfileForm(f => ({ ...f, birthDate: e.target.value }))} />

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Cinsiyet</label>
                  <div className="flex gap-2">
                    {(['ERKEK', 'KIZ'] as const).map(g => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => setProfileForm(f => ({ ...f, gender: f.gender === g ? '' : g }))}
                        className={`flex-1 py-2 rounded-xl border-2 text-sm font-medium transition-all cursor-pointer ${
                          profileForm.gender === g
                            ? g === 'ERKEK' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-pink-400 bg-pink-50 text-pink-700'
                            : 'border-gray-200 text-gray-500 hover:border-gray-300'
                        }`}
                      >
                        {g === 'ERKEK' ? '👦 Erkek' : '👧 Kız'}
                      </button>
                    ))}
                  </div>
                </div>

                <TextArea label="Tanı Bilgisi" value={profileForm.diagnosisInfo} onChange={e => setProfileForm(f => ({ ...f, diagnosisInfo: e.target.value }))} rows={2} placeholder="Örn: Otizm Spektrum Bozukluğu, Düzey 2" />
                <TextArea label="Eğitim Programı" value={profileForm.educationProgram} onChange={e => setProfileForm(f => ({ ...f, educationProgram: e.target.value }))} rows={2} placeholder="Örn: Özel Eğitim Merkezi, BEP" />
                <TextArea label="Terapiler" value={profileForm.therapies} onChange={e => setProfileForm(f => ({ ...f, therapies: e.target.value }))} rows={2} placeholder="Örn: ABA, Dil Terapisi, Oyun Terapisi" />
              </div>
            ) : (
              <div className="space-y-3">
                {[
                  { icon: Brain, label: 'Tanı', value: child.diagnosisInfo, color: 'text-purple-500', bg: 'bg-purple-50/70' },
                  { icon: GraduationCap, label: 'Eğitim Programı', value: child.educationProgram, color: 'text-teal-500', bg: 'bg-teal-50/70' },
                  { icon: HeartPulse, label: 'Terapiler', value: child.therapies, color: 'text-rose-500', bg: 'bg-rose-50/70' },
                ].map(field => {
                  const Icon = field.icon;
                  return field.value ? (
                    <div key={field.label} className={`flex items-start gap-3 p-3.5 rounded-xl ${field.bg} border border-gray-50`}>
                      <div className={`${field.color} mt-0.5 shrink-0`}><Icon size={16} /></div>
                      <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{field.label}</p>
                        <p className="text-sm text-gray-800 mt-0.5 font-medium">{field.value}</p>
                      </div>
                    </div>
                  ) : null;
                })}
                {!child.diagnosisInfo && !child.educationProgram && !child.therapies && (
                  <div className="text-center py-6">
                    <p className="text-sm text-gray-400 font-medium">Henüz bilgi eklenmedi.</p>
                    <button onClick={() => setEditingProfile(true)} className="text-sm text-indigo-600 hover:text-indigo-800 font-semibold mt-1.5 cursor-pointer transition-colors">
                      Bilgi ekle →
                    </button>
                  </div>
                )}
              </div>
            )}
            </div>
          </Card>

          {/* Semptom Etiketleri */}
          <Card>
            <CardHeader className="flex items-center justify-between pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-xl bg-indigo-50 text-indigo-500 shrink-0">
                  <TagIcon size={18} />
                </div>
                <div>
                  <CardTitle>Semptom Etiketleri</CardTitle>
                  <p className="text-[10px] text-gray-400 mt-0.5">Çocuğunuzun öne çıkan bireysel semptomları</p>
                </div>
              </div>
              {!editingTags ? (
                <Button variant="ghost" size="sm" onClick={() => setEditingTags(true)} className="rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-100/50">
                  {child?.tags && child.tags.length > 0 ? 'Düzenle' : <><Plus size={14} className="mr-1" />Ekle</>}
                </Button>
              ) : (
                <div className="flex gap-1.5">
                  <Button variant="ghost" size="sm" onClick={() => { setEditingTags(false); setSelectedTagIds(new Set(child?.tagIds || [])); setTagSearchQuery(''); }} className="rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-100/50">
                    <X size={16} />
                  </Button>
                  <Button size="sm" onClick={handleSaveTags} disabled={savingTags} className="rounded-xl shadow-md shadow-indigo-100">
                    <Check size={16} className="mr-1" />
                    {savingTags ? 'Kaydediliyor...' : 'Kaydet'}
                  </Button>
                </div>
              )}
            </CardHeader>

            {editingTags ? (
              <div className="space-y-4 mt-2">
                {tagsLoading ? (
                  <div className="flex flex-col items-center py-8 gap-2">
                    <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                    <p className="text-xs text-gray-400">Yükleniyor...</p>
                  </div>
                ) : tagsError ? (
                  <div className="flex flex-col items-center py-6 gap-2">
                    <p className="text-sm text-red-400">Etiketler yüklenemedi.</p>
                    <button
                      onClick={() => {
                        setTagsLoading(true); setTagsError(false);
                        tagService.getTagsByCategory()
                          .then(data => { setAllTags(data); setTagsError(false); })
                          .catch(() => setTagsError(true))
                          .finally(() => setTagsLoading(false));
                      }}
                      className="text-xs text-indigo-600 hover:underline cursor-pointer"
                    >
                      Tekrar dene
                    </button>
                  </div>
                ) : Object.keys(allTags).length === 0 ? (
                  <div className="flex flex-col items-center py-6 gap-1">
                    <TagIcon size={24} className="text-gray-200" />
                    <p className="text-sm text-gray-400">Henüz tanımlı etiket bulunamadı.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Search & Statistics Panel */}
                    <div className="flex flex-col gap-3 pb-3 border-b border-slate-100/60">
                      <div className="relative w-full">
                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                          <Search size={14} />
                        </span>
                        <input
                          type="text"
                          placeholder="Etiketlerde ara..."
                          value={tagSearchQuery}
                          onChange={e => setTagSearchQuery(e.target.value)}
                          className="w-full pl-9 pr-8 py-1.5 text-xs bg-slate-50 border border-slate-200/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder-slate-400"
                        />
                        {tagSearchQuery && (
                          <button
                            onClick={() => setTagSearchQuery('')}
                            className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                          >
                            <X size={13} />
                          </button>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50/60 text-indigo-700 text-[11px] font-semibold border border-indigo-100/50 shrink-0 select-none self-start">
                        <TagIcon size={12} />
                        <span>Seçilenler:</span>
                        <span className="px-1.5 py-0.5 rounded-lg bg-indigo-600 text-white font-bold text-[10px]">
                          {selectedTagIds.size}
                        </span>
                      </div>
                    </div>

                    {/* Filter categories & tags based on search query */}
                    {(() => {
                      const filterTags = (tagsList: Tag[]) => {
                        if (!tagSearchQuery.trim()) return tagsList;
                        const query = tagSearchQuery.toLowerCase().trim();
                        return tagsList.filter(t => 
                          t.name.toLowerCase().includes(query) || 
                          (t.description && t.description.toLowerCase().includes(query))
                        );
                      };

                      const filteredGroups = Object.entries(allTags).reduce((acc, [category, tagsList]) => {
                        const matched = filterTags(tagsList);
                        if (matched.length > 0) acc[category] = matched;
                        return acc;
                      }, {} as Record<string, Tag[]>);

                      if (Object.keys(filteredGroups).length === 0) {
                        return (
                          <div className="flex flex-col items-center justify-center py-10 px-4 text-center gap-3">
                            <div className="p-3 bg-slate-50 text-slate-400 rounded-full">
                              <Search size={24} />
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-slate-700">Arama sonucu bulunamadı</p>
                              <p className="text-[10px] text-slate-400 mt-0.5">"{tagSearchQuery}" ile eşleşen bir etiket bulunmuyor.</p>
                            </div>
                            <button
                              onClick={() => setTagSearchQuery('')}
                              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer"
                            >
                              Aramayı Temizle
                            </button>
                          </div>
                        );
                      }

                      return (
                        <div className="flex flex-col gap-4 mt-2 max-h-[480px] overflow-y-auto pr-1">
                          {Object.entries(filteredGroups).map(([category, tagsList]) => {
                            const def = CATEGORY_DEFS[category] || {
                              label: category,
                              gradient: 'from-slate-50 to-slate-50',
                              border: 'border-slate-200',
                              text: 'text-slate-700',
                              bg: 'bg-slate-50/50',
                              iconBg: 'bg-slate-100',
                              iconColor: 'text-slate-600',
                              activeGradient: 'from-indigo-500 to-indigo-600',
                              icon: TagIcon
                            };
                            const Icon = def.icon;
                            const categorySelectedCount = tagsList.filter(tag => selectedTagIds.has(tag.id)).length;
                            const isExpanded = expandedCategories[category] || false;
                            
                            // If search query is active, expand all automatically so search results aren't hidden
                            const showAll = tagSearchQuery.trim() !== '' || isExpanded;
                            const visibleTags = showAll ? tagsList : tagsList.slice(0, 3);

                            return (
                              <div 
                                key={category} 
                                className={`p-3.5 rounded-2xl border bg-white shadow-sm hover:shadow transition-all duration-300 ${def.border} flex flex-col gap-2.5 group/card relative`}
                              >
                                {/* Category Header */}
                                <div className="flex items-center justify-between pb-2 border-b border-slate-50 gap-2 select-none">
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <div className={`p-1.5 rounded-lg transition-all duration-300 ${def.iconBg} ${def.iconColor} group-hover/card:scale-105 shrink-0`}>
                                      <Icon size={14} />
                                    </div>
                                    <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wider truncate">
                                      {def.label}
                                    </span>
                                  </div>
                                  
                                  {categorySelectedCount > 0 && (
                                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${def.iconBg} ${def.iconColor} shrink-0`}>
                                      {categorySelectedCount}
                                    </span>
                                  )}
                                </div>

                                {/* Tags Flex container */}
                                <div className="flex flex-wrap gap-1.5 pt-1">
                                  {visibleTags.map(tag => {
                                    const isSelected = selectedTagIds.has(tag.id);
                                    return (
                                      <div key={tag.id} className="relative group/pill max-w-full">
                                        <button
                                          type="button"
                                          onClick={() => handleToggleTag(tag.id)}
                                          className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer flex items-center gap-1 max-w-full select-none ${
                                            isSelected
                                              ? `bg-gradient-to-r ${def.activeGradient} text-white shadow-sm border-transparent`
                                              : 'bg-slate-50 hover:bg-slate-100/90 text-slate-600 border border-slate-200 hover:border-slate-300'
                                          }`}
                                        >
                                          {isSelected && <Check size={11} className="shrink-0" />}
                                          <span className="whitespace-normal text-left">{tag.name}</span>
                                        </button>
                                        
                                        {/* Hover Tooltip for Descriptions */}
                                        {tag.description && (
                                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 scale-95 translate-y-1 pointer-events-none group-hover/pill:opacity-100 group-hover/pill:scale-100 group-hover/pill:translate-y-0 w-44 p-2 bg-slate-900/95 text-white text-[10px] font-medium leading-normal rounded-xl shadow-xl z-50 text-center transition-all duration-200 border border-slate-700/30 backdrop-blur-sm">
                                            <span>{tag.description}</span>
                                            <div className="absolute top-full left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-slate-900 rotate-45 border-r border-b border-slate-700/30 -mt-0.75" />
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                  
                                  {/* Expand/Collapse toggle pill */}
                                  {!tagSearchQuery.trim() && tagsList.length > 3 && (
                                    <button
                                      type="button"
                                      onClick={() => setExpandedCategories(prev => ({ ...prev, [category]: !prev[category] }))}
                                      className={`px-2 py-1 rounded-xl text-[10px] font-bold border transition-all cursor-pointer select-none flex items-center gap-1 ${
                                        isExpanded
                                          ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700'
                                          : `bg-slate-50 hover:bg-slate-100 border-slate-200 ${def.iconColor}`
                                      }`}
                                    >
                                      {isExpanded ? 'Daha Az' : `+${tagsList.length - 3} daha`}
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            ) : (
              <div className="mt-2">
                {child?.tags && child.tags.length > 0 ? (
                  <div className="space-y-2.5 mt-1.5">
                    {Object.entries(
                      child.tags.reduce((acc, tag) => {
                        if (!acc[tag.category]) acc[tag.category] = [];
                        acc[tag.category].push(tag);
                        return acc;
                      }, {} as Record<string, typeof child.tags>)
                    ).map(([category, tagsList]) => {
                      const def = CATEGORY_DEFS[category] || {
                        label: category,
                        iconColor: 'text-indigo-500',
                        iconBg: 'bg-indigo-50',
                        icon: TagIcon
                      };
                      const Icon = def.icon;
                      return (
                        <div key={category} className="flex flex-col gap-1.5 p-3 rounded-2xl bg-slate-50/50 border border-slate-100/60 hover:bg-slate-50 transition-colors">
                          <div className="flex items-center gap-1.5 select-none">
                            <div className={`p-1 rounded-lg ${def.iconBg} ${def.iconColor} shrink-0`}>
                              <Icon size={12} />
                            </div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                              {def.label}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {tagsList.map(tag => (
                              <span
                                key={tag.id}
                                title={tag.description}
                                className={`px-2.5 py-1 rounded-xl text-xs font-semibold shadow-sm border border-transparent select-none transition-all ${
                                  CATEGORY_COLORS[tag.category] || 'bg-gray-100 text-gray-700'
                                }`}
                              >
                                {tag.name}
                              </span>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-6 border border-dashed border-slate-200 rounded-2xl mt-1">
                    <TagIcon size={24} className="text-gray-300 mx-auto mb-2" />
                    <p className="text-xs font-medium text-gray-500">Henüz etiket eklenmedi</p>
                    <p className="text-[10px] text-gray-400 mt-0.5 px-4 leading-normal">
                      Semptom etiketleri benzer profil ve hedeflere sahip diğer aileleri bulmanıza yardımcı olur.
                    </p>
                  </div>
                )}
              </div>
            )}
          </Card>
        </div>

        {/* Sağ Kolon */}
        <div className="lg:col-span-2 space-y-6">

          {/* Son Gelişim Notları */}
          <Card>
            <CardHeader className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center">
                  <FileText size={16} className="text-blue-500" />
                </div>
                <CardTitle>Gelişim Notları</CardTitle>
              </div>
              <div className="flex items-center gap-2">
                <Link to={`/notlar?child=${id}`}>
                  <Button variant="ghost" size="sm">Tümünü Gör</Button>
                </Link>
                <Link to={`/notlar?child=${id}&new=1`}>
                  <Button size="sm">
                    <Plus size={14} className="mr-1" /> Not Ekle
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <div className="px-5 pb-5">
            {notes.length === 0 ? (
              <EmptyState
                icon={<FileText size={24} />}
                title="Henüz not yok"
                description="Çocuğunuzun gelişimiyle ilgili gözlemlerinizi kaydedin"
                className="border-0 bg-transparent shadow-none p-4"
                action={
                  <Link to={`/notlar?child=${id}&new=1`}>
                    <Button size="sm"><Plus size={14} className="mr-1" />İlk Notu Ekle</Button>
                  </Link>
                }
              />
            ) : (
              <>
                <div className="space-y-2">
                  {notes.map(note => {
                    const catColor = note.category ? CATEGORY_COLORS[note.category] : '';
                    const catLabel = note.category ? CATEGORY_LABELS[note.category] || note.category : '';
                    return (
                      <div key={note.id} className="group flex items-start gap-0 rounded-2xl border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all duration-200 overflow-hidden">
                        <div className={`w-1 self-stretch shrink-0 ${
                          note.category === 'ILETISIM' ? 'bg-blue-400'
                          : note.category === 'SOSYAL' ? 'bg-green-400'
                          : note.category === 'DUYUSAL' ? 'bg-purple-400'
                          : note.category === 'DAVRANIS' ? 'bg-orange-400'
                          : note.category === 'MOTOR' ? 'bg-red-400'
                          : note.category === 'EGITIM' ? 'bg-teal-400'
                          : 'bg-indigo-400'
                        }`} />
                        <div className="flex-1 min-w-0 p-3.5">
                          <div className="flex items-start justify-between gap-2">
                            <p className="font-semibold text-gray-900 text-sm leading-snug">{note.title}</p>
                            {catLabel && (
                              <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium shrink-0 ${catColor || 'bg-gray-100 text-gray-700'}`}>
                                {catLabel}
                              </span>
                            )}
                          </div>
                          {note.content && (
                            <p className="text-xs text-gray-500 mt-1 line-clamp-2 leading-relaxed">{note.content}</p>
                          )}
                          <p className="text-[10px] text-gray-400 mt-2 font-medium">{formatDate(note.noteDate)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {notesPage + 1 < notesTotal && (
                  <button
                    onClick={handleLoadMoreNotes}
                    disabled={loadingMoreNotes}
                    className="w-full mt-4 py-2.5 text-sm text-indigo-600 hover:text-indigo-800 font-semibold transition-colors disabled:opacity-50 cursor-pointer rounded-xl hover:bg-indigo-50"
                  >
                    {loadingMoreNotes ? 'Yükleniyor...' : 'Daha Fazla Göster'}
                  </button>
                )}
              </>
            )}
            </div>
          </Card>

          {/* Milestone'lar */}
          <Card>
            <CardHeader className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-yellow-50 flex items-center justify-center">
                  <Star size={16} className="text-yellow-500" />
                </div>
                <CardTitle>Kazanılan Beceriler</CardTitle>
              </div>
              <Button size="sm" onClick={() => setShowMilestoneModal(true)}>
                <Plus size={14} className="mr-1" /> Ekle
              </Button>
            </CardHeader>
            <div className="px-5 pb-5">
            {milestones.length === 0 ? (
              <EmptyState
                icon={<Star size={24} />}
                title="Henüz milestone yok"
                description="Çocuğunuzun kazandığı becerileri ve ilkleri kaydedin"
                className="border-0 bg-transparent shadow-none p-4"
                action={
                  <Button size="sm" onClick={() => setShowMilestoneModal(true)}>
                    <Plus size={14} className="mr-1" />Milestone Ekle
                  </Button>
                }
              />
            ) : (
              <div className="space-y-0">
                {milestones.map((m, idx) => {
                  const catDef = MILESTONE_CATEGORIES.find(c => c.value === m.category);
                  const Icon = catDef?.icon || TrendingUp;
                  const isLast = idx === milestones.length - 1;
                  return (
                    <div key={m.id} className="group flex items-start gap-3 relative">
                      {/* Timeline line */}
                      {!isLast && (
                        <div className="absolute left-[19px] top-10 bottom-0 w-0.5 bg-gray-100 z-0" />
                      )}
                      {/* Icon */}
                      <div
                        className="relative z-10 w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-sm border-2 border-white"
                        style={{ backgroundColor: catDef?.bgLight || '#FFFBEB', color: catDef?.color || '#F59E0B' }}
                      >
                        <Icon size={16} />
                      </div>
                      <div className="flex-1 min-w-0 pb-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-900 text-sm leading-snug">{m.title}</p>
                            {m.description && (
                              <p className="text-xs text-gray-500 mt-0.5 line-clamp-2 leading-relaxed">{m.description}</p>
                            )}
                            <div className="flex items-center gap-2 mt-1.5">
                              <p className="text-[10px] text-gray-400 font-medium">{formatDate(m.achievedDate)}</p>
                              {m.category && (
                                <span
                                  className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
                                  style={{ backgroundColor: catDef?.bgLight || '#FFFBEB', color: catDef?.color || '#6B7280' }}
                                >
                                  {m.category}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => handleOpenEditMilestone(m)}
                              className="p-1.5 rounded-lg text-gray-300 hover:bg-indigo-50 hover:text-indigo-500 transition-colors cursor-pointer"
                              title="Düzenle"
                            >
                              <Pencil size={13} />
                            </button>
                            <button
                              onClick={() => setDeleteMilestoneId(m.id)}
                              className="p-1.5 rounded-lg text-gray-300 hover:bg-red-50 hover:text-red-500 transition-colors cursor-pointer"
                              title="Sil"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            </div>
          </Card>

          {/* İlaç & Davranış Korelasyon Analizi */}
          {(abcEntries.length > 0 || medicationLogs.length > 0) && (
            <Card>
              <CardHeader className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-rose-50 flex items-center justify-center">
                    <HeartPulse size={16} className="text-rose-500" />
                  </div>
                  <div>
                    <CardTitle>İlaç Uyum & Davranış Korelasyon Grafiği</CardTitle>
                    <p className="text-[11px] font-bold text-slate-400 mt-0.5">İlaç dozu uyum yüzdesi, gözlemlenen yan etkiler ve davranış problemlerinin ilişkisi</p>
                  </div>
                </div>
              </CardHeader>
              <div className="px-5 pb-5">
                {correlationData.length === 0 ? (
                  <div className="py-6 text-center text-xs font-semibold text-slate-400">
                    Korelasyon analizi için yeterli veri bulunmuyor.
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center gap-4 flex-wrap text-xs font-bold text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
                        <span>Davranış Problemi Sayısı (Sol Aks)</span>
                      </div>
                      <div className="flex-1" />
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                        <span>İlaç Doz Uyumu (%, Sağ Aks)</span>
                      </div>
                    </div>

                    <ResponsiveContainer width="100%" height={260}>
                      <AreaChart data={correlationData} margin={{ top: 10, right: 5, left: -25, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorAdherence" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                          </linearGradient>
                          <linearGradient id="colorBehavior" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.15}/>
                            <stop offset="95%" stopColor="#ef4444" stopOpacity={0.0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="4 4" stroke="#f3f4f6" vertical={false} />
                        <XAxis dataKey="displayDate" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                        <YAxis yAxisId="left" tick={{ fontSize: 10, fill: '#9ca3af' }} allowDecimals={false} axisLine={false} tickLine={false} />
                        <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                        <Tooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const data = payload[0].payload;
                              return (
                                <div className="bg-white border border-slate-200 p-3 rounded-2xl shadow-xl text-xs flex flex-col gap-1.5 min-w-[200px]">
                                  <p className="font-extrabold text-slate-800 border-b border-slate-100 pb-1">{data.date}</p>
                                  <p className="font-bold text-rose-600 flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
                                    Davranış Problemleri: {data.behaviorCount} adet
                                  </p>
                                  <p className="font-bold text-emerald-600 flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                                    İlaç Uyum Oranı: {data.adherence !== null ? `%${data.adherence}` : 'Kayıt Yok'}
                                  </p>
                                  {data.totalCount > 0 && (
                                    <p className="text-[10px] font-bold text-slate-400 pl-3.5">
                                      Alınan Doz: {data.takenCount} / {data.totalCount}
                                    </p>
                                  )}
                                  {data.sideEffects && data.sideEffects.length > 0 && (
                                    <div className="border-t border-slate-100 pt-1.5 mt-1">
                                      <p className="text-[10px] font-black text-amber-500 uppercase tracking-wide flex items-center gap-1">
                                        <AlertCircle size={10} /> Yan Etkiler
                                      </p>
                                      <div className="flex flex-wrap gap-1 mt-1">
                                        {data.sideEffects.map((se: string) => (
                                          <span key={se} className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200/50 rounded-md text-[10px] font-bold">
                                            {se}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Area yAxisId="right" type="monotone" dataKey="adherence" name="Doz Uyum Oranı" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorAdherence)" dot={{ r: 3.5, fill: '#ffffff', stroke: '#10b981', strokeWidth: 2 }} activeDot={{ r: 5, strokeWidth: 0 }} />
                        <Area yAxisId="left" type="monotone" dataKey="behaviorCount" name="Davranış Problemi" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#colorBehavior)" dot={{ r: 3.5, fill: '#ffffff', stroke: '#ef4444', strokeWidth: 2 }} activeDot={{ r: 5, strokeWidth: 0 }} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Gelişim Analizi */}
          {notes.length > 0 && (
            <Card>
              <CardHeader className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center">
                    <BarChart2 size={16} className="text-indigo-500" />
                  </div>
                  <CardTitle>Gelişim Analizi</CardTitle>
                </div>
              </CardHeader>
              <div className="px-5 pb-5">

              {monthlyData.length > 1 && (
                <div className="mt-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-1.5 h-4 rounded-full bg-indigo-500" />
                    <p className="text-xs font-bold text-gray-700 uppercase tracking-wide">Aylık Not Gelişim Trendi</p>
                  </div>
                  <ResponsiveContainer width="100%" height={160}>
                    <AreaChart data={monthlyData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorNot" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="4 4" stroke="#f3f4f6" vertical={false} />
                      <XAxis dataKey="ay" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} allowDecimals={false} axisLine={false} tickLine={false} />
                      <Tooltip
                        content={({ active, payload, label }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="bg-white/90 backdrop-blur-md border border-indigo-100 p-2.5 rounded-xl shadow-lg text-[11px] flex flex-col gap-0.5">
                                <p className="font-bold text-gray-800">{label}</p>
                                <p className="font-semibold text-indigo-600 flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 inline-block" /> {payload[0].name}: {payload[0].value}
                                </p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Area type="monotone" dataKey="not" name="Gelişim Notu" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#colorNot)" dot={{ r: 3.5, fill: '#ffffff', stroke: '#6366f1', strokeWidth: 2 }} activeDot={{ r: 5, strokeWidth: 0 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}

              {milestoneTimeline.length > 1 && (
                <div className="mt-5">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-1.5 h-4 rounded-full bg-emerald-500" />
                    <p className="text-xs font-bold text-gray-700 uppercase tracking-wide">Aylık Başarı Taşları</p>
                  </div>
                  <ResponsiveContainer width="100%" height={140}>
                    <AreaChart data={milestoneTimeline} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorMilestone" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="4 4" stroke="#f3f4f6" vertical={false} />
                      <XAxis dataKey="ay" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} allowDecimals={false} axisLine={false} tickLine={false} />
                      <Tooltip
                        content={({ active, payload, label }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="bg-white/90 backdrop-blur-md border border-emerald-100 p-2.5 rounded-xl shadow-lg text-[11px] flex flex-col gap-0.5">
                                <p className="font-bold text-gray-800">{label}</p>
                                <p className="font-semibold text-emerald-600 flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" /> {payload[0].name}: {payload[0].value}
                                </p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Area type="monotone" dataKey="milestone" name="Kazanılan Beceri" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorMilestone)" dot={{ r: 3.5, fill: '#ffffff', stroke: '#10b981', strokeWidth: 2 }} activeDot={{ r: 5, strokeWidth: 0 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}

              {moodTrend.length > 1 && (
                <div className="mt-5">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-1.5 h-4 rounded-full bg-amber-400" />
                    <p className="text-xs font-bold text-gray-700 uppercase tracking-wide">Aylık Ruh Hali Trendi (1–5)</p>
                  </div>
                  <ResponsiveContainer width="100%" height={140}>
                    <AreaChart data={moodTrend} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorMood" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="4 4" stroke="#f3f4f6" vertical={false} />
                      <XAxis dataKey="ay" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                      <YAxis domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                      <Tooltip
                        content={({ active, payload, label }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="bg-white/90 backdrop-blur-md border border-amber-100 p-2.5 rounded-xl shadow-lg text-[11px] flex flex-col gap-0.5">
                                <p className="font-bold text-gray-800">{label}</p>
                                <p className="font-semibold text-amber-600 flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" /> Ort. Ruh Hali: {payload[0].value}/5
                                </p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Area type="monotone" dataKey="ruh" name="Ruh Hali" stroke="#f59e0b" strokeWidth={2} fillOpacity={1} fill="url(#colorMood)" dot={{ r: 3.5, fill: '#ffffff', stroke: '#f59e0b', strokeWidth: 2 }} activeDot={{ r: 5, strokeWidth: 0 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}

              {sleepTrend.length > 1 && (
                <div className="mt-5">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-1.5 h-4 rounded-full bg-cyan-500" />
                    <p className="text-xs font-bold text-gray-700 uppercase tracking-wide">Aylık Uyku Süresi (Saat Ort.)</p>
                  </div>
                  <ResponsiveContainer width="100%" height={140}>
                    <AreaChart data={sleepTrend} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorSleep" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="4 4" stroke="#f3f4f6" vertical={false} />
                      <XAxis dataKey="ay" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                      <Tooltip
                        content={({ active, payload, label }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="bg-white/90 backdrop-blur-md border border-cyan-100 p-2.5 rounded-xl shadow-lg text-[11px] flex flex-col gap-0.5">
                                <p className="font-bold text-gray-800">{label}</p>
                                <p className="font-semibold text-cyan-600 flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 inline-block" /> Ort. Uyku: {payload[0].value} saat
                                </p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Area type="monotone" dataKey="saat" name="Uyku Süresi" stroke="#06b6d4" strokeWidth={2} fillOpacity={1} fill="url(#colorSleep)" dot={{ r: 3.5, fill: '#ffffff', stroke: '#06b6d4', strokeWidth: 2 }} activeDot={{ r: 5, strokeWidth: 0 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Aktivite Isı Haritası */}
              {notes.length > 0 && (
                <div className="mt-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-4 rounded-full bg-teal-500" />
                      <p className="text-xs font-bold text-gray-700 uppercase tracking-wide">Aktivite Takvimi (Son 16 Hafta)</p>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
                      <span>Az</span>
                      {[0.15, 0.35, 0.6, 0.85, 1].map((o, i) => (
                        <span key={i} className="w-2.5 h-2.5 rounded-sm inline-block" style={{ backgroundColor: `rgba(20,184,166,${o})` }} />
                      ))}
                      <span>Çok</span>
                    </div>
                  </div>
                  <div className="overflow-x-auto pb-1">
                    <div className="flex gap-1 min-w-max">
                      {/* Gün etiketi sütunu */}
                      <div className="flex flex-col gap-1 mr-1 justify-around pt-5">
                        {['Pzt', '', 'Çrş', '', 'Cum', '', 'Paz'].map((d, i) => (
                          <span key={i} className="text-[9px] text-gray-400 leading-none h-2.5 flex items-center">{d}</span>
                        ))}
                      </div>
                      {activityHeatmap.weeks.map((week, wi) => {
                        const firstDayOfMonth = week.find(d => d.iso.slice(8, 10) === '01');
                        return (
                          <div key={wi} className="flex flex-col gap-1">
                            {/* Ay etiketi */}
                            <span className="text-[9px] text-gray-400 leading-none h-4 flex items-end">
                              {firstDayOfMonth
                                ? new Date(firstDayOfMonth.iso).toLocaleDateString('tr-TR', { month: 'short' })
                                : wi === 0 ? new Date(week[0].iso).toLocaleDateString('tr-TR', { month: 'short' }) : ''}
                            </span>
                            {week.map((day, di) => {
                              if (!day.iso) return <div key={di} className="w-2.5 h-2.5 rounded-sm" />;
                              const intensity = day.count === 0 ? 0 : Math.max(0.15, Math.min(1, day.count / activityHeatmap.max));
                              const isToday = day.iso === new Date().toISOString().slice(0, 10);
                              return (
                                <div
                                  key={di}
                                  title={`${day.iso}: ${day.count} aktivite`}
                                  className={`w-2.5 h-2.5 rounded-sm transition-transform hover:scale-125 cursor-default ${isToday ? 'ring-1 ring-teal-600 ring-offset-1' : ''}`}
                                  style={{
                                    backgroundColor: day.count === 0 ? '#f3f4f6' : `rgba(20,184,166,${intensity})`,
                                  }}
                                />
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-1.5 h-4 rounded-full bg-violet-500" />
                  <p className="text-xs font-bold text-gray-700 uppercase tracking-wide">Gelişim Alanı Dağılımı</p>
                </div>
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="4 4" stroke="#f3f4f6" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} allowDecimals={false} axisLine={false} tickLine={false} />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-white/90 backdrop-blur-md border border-gray-100 p-2.5 rounded-xl shadow-lg text-[11px] flex flex-col gap-0.5">
                              <p className="font-bold text-gray-800">{label}</p>
                              <p className="font-semibold text-indigo-600 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 inline-block" /> {payload[0].name}: {payload[0].value}
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="value" name="Kayıt Sayısı" radius={[6, 6, 0, 0]} maxBarSize={28}>
                      {chartData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Milestone Ekle Modal */}
      <Modal isOpen={showMilestoneModal} onClose={() => setShowMilestoneModal(false)} title="Milestone Ekle">
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">Kategori</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {MILESTONE_CATEGORIES.map(cat => {
                const Icon = cat.icon;
                const isSelected = milestoneForm.category === cat.value;
                return (
                  <button
                    key={cat.value}
                    onClick={() => setMilestoneForm(f => ({ ...f, category: isSelected ? '' : cat.value }))}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 transition-all cursor-pointer text-left ${
                      isSelected ? '' : 'border-gray-100 bg-gray-50 hover:border-gray-200 text-gray-500'
                    }`}
                    style={isSelected ? { borderColor: cat.color, backgroundColor: cat.bgLight, color: cat.color } : undefined}
                  >
                    <Icon size={15} />
                    <span className="text-xs font-medium">{cat.value}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <Input label="Başlık *" value={milestoneForm.title} onChange={e => setMilestoneForm(f => ({ ...f, title: e.target.value }))} placeholder="Örn: İlk kez göz teması kurdu" />
          <TextArea label="Açıklama" value={milestoneForm.description} onChange={e => setMilestoneForm(f => ({ ...f, description: e.target.value }))} placeholder="Detayları not edin..." rows={3} />
          <Input label="Tarih" type="date" value={milestoneForm.achievedDate} onChange={e => setMilestoneForm(f => ({ ...f, achievedDate: e.target.value }))} />
          <div className="flex gap-3 pt-1">
            <Button variant="outline" onClick={() => setShowMilestoneModal(false)} className="flex-1">İptal</Button>
            <Button
              onClick={handleCreateMilestone}
              loading={milestoneLoading}
              className="flex-1 text-white"
              style={{ backgroundColor: MILESTONE_CATEGORIES.find(c => c.value === milestoneForm.category)?.color || '#4F46E5' }}
            >
              Kaydet
            </Button>
          </div>
        </div>
      </Modal>

      {/* Milestone Düzenle Modal */}
      <Modal isOpen={!!editingMilestone} onClose={() => setEditingMilestone(null)} title="Milestone Düzenle">
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">Kategori</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {MILESTONE_CATEGORIES.map(cat => {
                const Icon = cat.icon;
                const isSelected = editMilestoneForm.category === cat.value;
                return (
                  <button
                    key={cat.value}
                    onClick={() => setEditMilestoneForm(f => ({ ...f, category: isSelected ? '' : cat.value }))}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 transition-all cursor-pointer text-left ${
                      isSelected ? '' : 'border-gray-100 bg-gray-50 hover:border-gray-200 text-gray-500'
                    }`}
                    style={isSelected ? { borderColor: cat.color, backgroundColor: cat.bgLight, color: cat.color } : undefined}
                  >
                    <Icon size={15} />
                    <span className="text-xs font-medium">{cat.value}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <Input label="Başlık *" value={editMilestoneForm.title} onChange={e => setEditMilestoneForm(f => ({ ...f, title: e.target.value }))} />
          <TextArea label="Açıklama" value={editMilestoneForm.description} onChange={e => setEditMilestoneForm(f => ({ ...f, description: e.target.value }))} rows={3} />
          <Input label="Tarih" type="date" value={editMilestoneForm.achievedDate} onChange={e => setEditMilestoneForm(f => ({ ...f, achievedDate: e.target.value }))} />
          <div className="flex gap-3 pt-1">
            <Button variant="outline" onClick={() => setEditingMilestone(null)} className="flex-1">İptal</Button>
            <Button onClick={handleSaveEditMilestone} loading={savingMilestone} className="flex-1">
              Güncelle
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmModal
        isOpen={!!deleteMilestoneId}
        title="Milestone'ı sil?"
        message="Bu gelişim kaydı kalıcı olarak silinecek."
        confirmLabel="Evet, sil"
        onConfirm={() => deleteMilestoneId && handleDeleteMilestone(deleteMilestoneId)}
        onCancel={() => setDeleteMilestoneId(null)}
      />
    </div>
  );
}
