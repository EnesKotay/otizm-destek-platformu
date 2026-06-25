import { useEffect, useState, useCallback, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Users, Search, FileText, Calendar, Plus, CheckCircle,
  Clock, BarChart2, Printer, Target, AlertCircle,
  RefreshCw, MessageCircle, Trash2, Pencil, X, AlertTriangle,
  ChevronDown, ChevronUp, Filter, User, ShieldCheck,
  Activity, Sparkles, Loader2, Link as LinkIcon
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { toast } from '@/store/toastStore';
import { patientService } from '@/services/patientService';
import { messagingService } from '@/services/messagingService';
import type { ExpertTask, PatientSummary, TaskSubmission, ExpertConnectionRequest } from '@/types';

import { normalizeTR } from '@/utils/string';

function isOverdue(dueDate?: string): boolean {
  if (!dueDate) return false;
  return new Date(dueDate) < new Date(new Date().toDateString());
}

function formatLastSession(date: string | null): string {
  if (!date) return 'Yok';
  const d = new Date(date);
  return isNaN(d.getTime()) ? 'Yok' : d.toLocaleDateString('tr-TR');
}

const EMPTY_TASK = {
  title: '', description: '', dueDate: '',
  category: 'İletişim Becerileri', difficulty: 'Kolay',
  frequency: 'Günde 1 Kez', materialUrl: '',
};

type TaskFilter = 'all' | 'pending' | 'completed' | 'overdue' | 'review_pending';

export function PatientsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestedChildId = searchParams.get('childId') ?? '';
  const [patients, setPatients] = useState<PatientSummary[]>([]);
  const [tasks, setTasks] = useState<ExpertTask[]>([]);
  const [search, setSearch] = useState('');
  const [taskSearch, setTaskSearch] = useState('');
  const [taskFilter, setTaskFilter] = useState<TaskFilter>('all');
  const [selectedPatient, setSelectedPatient] = useState<PatientSummary | null>(null);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState<ExpertTask | null>(null);
  const [deleteTaskId, setDeleteTaskId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [messaging, setMessaging] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [patientSort, setPatientSort] = useState<'recent' | 'name' | 'tasks'>('recent');
  const [newTask, setNewTask] = useState({ ...EMPTY_TASK });
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);

  // Per-task submissions loaded lazily on expand
  const [taskSubmissions, setTaskSubmissions] = useState<Record<string, TaskSubmission[]>>({});
  const [loadingSubmissions, setLoadingSubmissions] = useState<Record<string, boolean>>({});
  // Per-submission feedback text — key: submissionId
  const [feedbackText, setFeedbackText] = useState<Record<string, string>>({});
  const [submittingFeedback, setSubmittingFeedback] = useState<string | null>(null);
  const [sentRequests, setSentRequests] = useState<ExpertConnectionRequest[]>([]);

  // Manual link states
  const [showAddModal, setShowAddModal] = useState(false);
  const [parentSearchEmail, setParentSearchEmail] = useState('');
  const [searchingParent, setSearchingParent] = useState(false);
  const [foundParent, setFoundParent] = useState<{ parentName: string; parentEmail: string; children: Array<{ id: string; name: string; diagnosis: string }> } | null>(null);
  const [selectedChildToAdd, setSelectedChildToAdd] = useState('');
  const [addingPatient, setAddingPatient] = useState(false);
  const [hasConsent, setHasConsent] = useState(false);

  const handleSearchParent = async () => {
    if (!parentSearchEmail.trim()) { toast.error('E-posta adresi giriniz.'); return; }
    setSearchingParent(true);
    setFoundParent(null);
    setSelectedChildToAdd('');
    setHasConsent(false);
    try {
      const data = await patientService.searchParent(parentSearchEmail.trim());
      setFoundParent(data);
      if (data.children && data.children.length > 0) {
        setSelectedChildToAdd(data.children[0].id);
      } else {
        toast.info('Bu velinin henüz kayıtlı bir çocuğu bulunmuyor.');
      }
    } catch {
      toast.error('Ebeveyn bulunamadı veya yetkisiz erişim.');
    } finally {
      setSearchingParent(false);
    }
  };

  const handleAddPatient = async () => {
    if (!parentSearchEmail.trim() || !selectedChildToAdd) {
      toast.error('Lütfen bir çocuk seçin.');
      return;
    }
    if (!hasConsent) {
      toast.error('Devam etmek için veli onayı kutusunu işaretlemelisiniz.');
      return;
    }
    setAddingPatient(true);
    try {
      await patientService.addPatient(parentSearchEmail.trim(), selectedChildToAdd);
      toast.success('Erişim isteği ebeveyne gönderildi. Veli onayladığında danışan listenizde görünecektir.');
      setShowAddModal(false);
      setParentSearchEmail('');
      setFoundParent(null);
      setSelectedChildToAdd('');
      setHasConsent(false);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || 'Danışan eklenemedi veya zaten listenizde ekli.');
    } finally {
      setAddingPatient(false);
    }
  };

  const loadPatients = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setLoadError(false);
    try {
      const data = await patientService.getPatients();
      if (signal?.aborted) return;
      setPatients(data);
      if (data.length > 0) {
        setSelectedPatient(prev => {
          const requestedPatient = requestedChildId
            ? data.find(p => p.childId === requestedChildId)
            : null;
          if (requestedPatient) return requestedPatient;
          if (prev && data.some(p => p.childId === prev.childId)) return prev;
          return data[0];
        });
      } else {
        setSelectedPatient(null);
      }
    } catch {
      if (signal?.aborted) return;
      setLoadError(true);
      toast.error('Danışan listesi yüklenemedi.');
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [requestedChildId]);

  const loadSentRequests = useCallback(async (signal?: AbortSignal) => {
    try {
      const data = await patientService.getSentConnectionRequests();
      if (!signal?.aborted) setSentRequests(data);
    } catch {
      // sessizce geç
    }
  }, []);

  const handleCancelRequest = async (id: string) => {
    try {
      await patientService.cancelConnectionRequest(id);
      setSentRequests(prev => prev.filter(r => r.id !== id));
      toast.success('İstek geri çekildi.');
    } catch {
      toast.error('İstek iptal edilemedi.');
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadPatients(controller.signal);
    loadSentRequests(controller.signal);
    return () => controller.abort();
  }, [loadPatients, loadSentRequests]);

  // Danışan değişince görevleri yükle, submission cache'i sıfırla
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!selectedPatient) { setTasks([]); return; }
    const controller = new AbortController();

    setTasksLoading(true);
    setTaskSearch('');
    setTaskFilter('all');
    setTaskSubmissions({});
    setExpandedTaskId(null);

    patientService.getTasks(selectedPatient.childId)
      .then(data => {
        if (!controller.signal.aborted) setTasks(data);
      })
      .catch(() => { if (!controller.signal.aborted) toast.error('Görevler yüklenemedi.'); })
      .finally(() => { if (!controller.signal.aborted) setTasksLoading(false); });

    return () => controller.abort();
  }, [selectedPatient]);

  // Görev genişletilince submission'ları lazy yükle
  const handleExpandTask = useCallback(async (taskId: string, taskStatus: string) => {
    setExpandedTaskId(prev => prev === taskId ? null : taskId);
    if (taskStatus !== 'COMPLETED') return;
    if (taskSubmissions[taskId] !== undefined || loadingSubmissions[taskId]) return;

    setLoadingSubmissions(prev => ({ ...prev, [taskId]: true }));
    try {
      const subs = await patientService.getTaskSubmissions(taskId);
      setTaskSubmissions(prev => ({ ...prev, [taskId]: subs }));
    } catch {
      setTaskSubmissions(prev => ({ ...prev, [taskId]: [] }));
    } finally {
      setLoadingSubmissions(prev => ({ ...prev, [taskId]: false }));
    }
  }, [taskSubmissions, loadingSubmissions]);

  const isReviewPending = useCallback((taskId: string) => {
    const subs = taskSubmissions[taskId];
    return Array.isArray(subs) && subs.length > 0 && subs.some(s => !s.expertReviewed);
  }, [taskSubmissions]);

  // Danışan arama ve sıralama
  const filteredPatients = useMemo(() => {
    const list = patients.filter(p => {
      if (!search.trim()) return true;
      const q = normalizeTR(search);
      return normalizeTR(p.name).includes(q) || normalizeTR(p.parentName).includes(q);
    });

    if (patientSort === 'name') {
      list.sort((a, b) => a.name.localeCompare(b.name, 'tr'));
    } else if (patientSort === 'tasks') {
      list.sort((a, b) => {
        const aPending = Math.max(0, a.totalTasks - a.tasksCompleted);
        const bPending = Math.max(0, b.totalTasks - b.tasksCompleted);
        return bPending - aPending;
      });
    } else {
      // 'recent': son seans tarihine göre — tarihi olmayanlar sona
      list.sort((a, b) => {
        if (!a.lastSessionDate && !b.lastSessionDate) return 0;
        if (!a.lastSessionDate) return 1;
        if (!b.lastSessionDate) return -1;
        return b.lastSessionDate.localeCompare(a.lastSessionDate);
      });
    }

    return list;
  }, [patients, search, patientSort]);

  // Görev filtre + arama + sıralama
  const filteredTasks = useMemo(() => {
    let list = tasks.filter(t => {
      if (taskFilter === 'pending')        return t.status === 'PENDING' && !isOverdue(t.dueDate);
      if (taskFilter === 'completed')      return t.status === 'COMPLETED';
      if (taskFilter === 'overdue')        return t.status === 'PENDING' && isOverdue(t.dueDate);
      if (taskFilter === 'review_pending') return t.status === 'COMPLETED' && isReviewPending(t.id);
      return true;
    });

    if (taskSearch.trim()) {
      const q = normalizeTR(taskSearch);
      list = list.filter(t => normalizeTR(t.title).includes(q) || normalizeTR(t.description ?? '').includes(q));
    }

    return [...list].sort((a, b) => {
      const aOver = isOverdue(a.dueDate) && a.status === 'PENDING';
      const bOver = isOverdue(b.dueDate) && b.status === 'PENDING';
      if (aOver !== bOver) return aOver ? -1 : 1;
      const aReview = isReviewPending(a.id);
      const bReview = isReviewPending(b.id);
      if (aReview !== bReview) return aReview ? -1 : 1;
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });
  }, [tasks, taskFilter, taskSearch, isReviewPending]);

  const taskStats = useMemo(() => ({
    total:          tasks.length,
    pending:        tasks.filter(t => t.status === 'PENDING' && !isOverdue(t.dueDate)).length,
    completed:      tasks.filter(t => t.status === 'COMPLETED').length,
    overdue:        tasks.filter(t => t.status === 'PENDING' && isOverdue(t.dueDate)).length,
    review_pending: tasks.filter(t => t.status === 'COMPLETED' && isReviewPending(t.id)).length,
  }), [tasks, isReviewPending]);

  const closeTaskModal = () => {
    setShowTaskModal(false);
    setEditingTask(null);
    setNewTask({ ...EMPTY_TASK });
  };

  const openEdit = (task: ExpertTask) => {
    setEditingTask(task);
    setNewTask({
      title: task.title,
      description: task.description ?? '',
      dueDate: task.dueDate ?? '',
      category: task.category ?? 'İletişim Becerileri',
      difficulty: task.difficulty ?? 'Kolay',
      frequency: task.frequency ?? 'Günde 1 Kez',
      materialUrl: task.materialUrl ?? '',
    });
    setShowTaskModal(true);
  };

  const handleSaveTask = async () => {
    if (!selectedPatient) return;
    if (!newTask.title.trim()) { toast.error('Görev başlığı zorunludur.'); return; }
    setSaving(true);
    try {
      if (editingTask) {
        const updated = await patientService.updateTask(editingTask.id, { ...newTask, dueDate: newTask.dueDate || undefined });
        setTasks(prev => prev.map(t => t.id === editingTask.id ? updated : t));
        toast.success('Görev güncellendi.');
      } else {
        const created = await patientService.assignTask(selectedPatient.childId, { ...newTask, dueDate: newTask.dueDate || undefined, status: 'PENDING' });
        setTasks(prev => [created, ...prev]);
        setPatients(prev => prev.map(p => p.childId === selectedPatient.childId ? { ...p, totalTasks: p.totalTasks + 1 } : p));
        toast.success('Görev başarıyla atandı.');
      }
      closeTaskModal();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'İşlem başarısız.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await patientService.deleteTask(taskId);
      const deleted = tasks.find(t => t.id === taskId);
      setTasks(prev => prev.filter(t => t.id !== taskId));
      if (selectedPatient && deleted) {
        setPatients(prev => prev.map(p =>
          p.childId === selectedPatient.childId
            ? {
                ...p,
                totalTasks: Math.max(0, p.totalTasks - 1),
                tasksCompleted: deleted.status === 'COMPLETED' ? Math.max(0, p.tasksCompleted - 1) : p.tasksCompleted,
              }
            : p
        ));
      }
      toast.success('Görev silindi.');
    } catch { toast.error('Görev silinemedi.'); }
    setDeleteTaskId(null);
  };

  const handleMessageParent = async () => {
    if (!selectedPatient?.parentId) return;
    setMessaging(true);
    try {
      const conv = await messagingService.getOrCreateDirect(selectedPatient.parentId);
      navigate('/mesajlar', { state: { openConversationId: conv.id } });
    } catch { toast.error('Mesaj başlatılamadı.'); }
    setMessaging(false);
  };

  const taskFilterLabels: Record<TaskFilter, string> = {
    all:            `Tümü (${taskStats.total})`,
    pending:        `Bekleyen (${taskStats.pending})`,
    completed:      `Tamamlanan (${taskStats.completed})`,
    overdue:        `Gecikmiş (${taskStats.overdue})`,
    review_pending: `Değerlendirme Bekleyen (${taskStats.review_pending})`,
  };

  return (
    <div className="space-y-8 max-w-[1400px] mx-auto animate-in fade-in duration-500 pb-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 bg-white p-6 rounded-[24px] border border-gray-100 shadow-sm">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Danışanlarım</h1>
          <p className="text-gray-500 mt-2 text-lg">Danışanlarınızı takip edin ve yeni hedefler belirleyin.</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {taskStats.review_pending > 0 && (
            <div className="flex items-center gap-1.5 bg-indigo-50 text-indigo-700 px-4 py-2 rounded-2xl font-bold text-sm border border-indigo-100 animate-pulse">
              <Sparkles size={14} /> {taskStats.review_pending} değerlendirme bekleyen görev
            </div>
          )}
          {taskStats.overdue > 0 && (
            <div className="flex items-center gap-1.5 bg-red-50 text-red-700 px-4 py-2 rounded-2xl font-bold text-sm border border-red-100">
              <AlertTriangle size={14} /> {taskStats.overdue} gecikmiş görev
            </div>
          )}
          <div className="bg-indigo-50 text-indigo-700 px-5 py-2.5 rounded-2xl font-bold">
            {patients.length} Aktif Danışan
          </div>
          <Button onClick={() => setShowAddModal(true)} className="rounded-2xl gap-2 font-bold shadow-sm">
            <Plus size={16} /> Danışan Ekle
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-[380px_1fr] gap-6 items-start">
        {/* Sol kolon */}
        <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden flex flex-col h-[calc(100vh-220px)] min-h-[600px]">
          <div className="p-5 border-b border-gray-100 bg-gray-50/30 space-y-3">
            <div className="relative">
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="İsim veya ebeveyn ara..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="bg-white border-gray-200 pl-10 shadow-sm rounded-xl"
              />
            </div>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <select
                  value={patientSort}
                  onChange={e => setPatientSort(e.target.value as 'recent' | 'name' | 'tasks')}
                  className="w-full appearance-none text-xs border border-gray-200 bg-white rounded-xl pl-8 pr-8 py-2 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 font-bold text-gray-600 shadow-sm cursor-pointer transition-all"
                >
                  <option value="recent">Son Seans Tarihine Göre</option>
                  <option value="name">İsme Göre (A-Z)</option>
                  <option value="tasks">Görev Bekleyenler</option>
                </select>
                <Filter size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
              <div className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest px-2.5 shrink-0 bg-white shadow-sm rounded-xl py-2 border border-slate-200">
                {filteredPatients.length} Kişi
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-full space-y-3 text-gray-400">
                <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                <p className="text-sm font-medium">Yükleniyor...</p>
              </div>
            ) : loadError ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-6 space-y-4">
                <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center">
                  <AlertCircle size={24} className="text-red-400" />
                </div>
                <div>
                  <p className="font-semibold text-gray-800">Yüklenemedi</p>
                  <p className="text-sm text-gray-500 mt-1">Danışan listesi alınamadı.</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => loadPatients()}>
                  <RefreshCw size={14} className="mr-1.5" /> Tekrar Dene
                </Button>
              </div>
            ) : patients.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-6 text-gray-500">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                  <Users size={24} className="text-gray-300" />
                </div>
                <p className="font-medium text-gray-900 mb-1">Henüz danışanınız yok</p>
                <p className="text-sm">Aileler randevu talep ettikçe danışanlarınız burada görünecek.</p>
              </div>
            ) : filteredPatients.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-6 text-gray-500">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                  <Search size={24} className="text-gray-300" />
                </div>
                <p className="font-medium text-gray-900 mb-1">Sonuç bulunamadı</p>
                <p className="text-sm">"{search}" aramasına uygun danışan yok.</p>
              </div>
            ) : (
              <>
                {sentRequests.map(req => (
                  <div key={req.id} className="w-full text-left p-4 rounded-2xl border border-amber-200 bg-amber-50/50 relative overflow-hidden group mb-1.5">
                    <div className="flex items-center gap-3 relative z-10">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 shadow-sm bg-gradient-to-br from-amber-400 to-orange-400 text-white">
                        {req.childName.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <h3 className="font-extrabold truncate text-xs sm:text-sm tracking-tight text-amber-900">
                            {req.childName}
                          </h3>
                          <span className="text-[9px] px-2 py-0.5 rounded-md font-extrabold tracking-wide uppercase shrink-0 bg-amber-100 text-amber-700 animate-pulse">
                            Onay Bekliyor
                          </span>
                        </div>
                        <p className="text-[11px] font-bold mt-0.5 truncate text-amber-700/70">
                          Veli İsmi: {req.parentName}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 relative z-10 flex justify-end">
                      <Button size="sm" variant="outline" onClick={() => handleCancelRequest(req.id)} className="h-7 text-[10px] px-2.5 border-amber-200 text-amber-700 hover:bg-amber-100 font-bold rounded-lg shadow-sm">
                        İsteği Geri Çek
                      </Button>
                    </div>
                  </div>
                ))}
                {filteredPatients.map(patient => {
                  const pct = patient.totalTasks > 0 ? Math.round((patient.tasksCompleted / patient.totalTasks) * 100) : 0;
                  const isSelected = selectedPatient?.id === patient.id;
                  const colors = [
                    'from-pink-500 to-rose-500',
                    'from-indigo-500 to-blue-500',
                    'from-emerald-500 to-teal-500',
                    'from-amber-500 to-orange-500'
                  ];
                  const avatarGradient = colors[patient.name.charCodeAt(0) % colors.length];

                  return (
                    <button
                      key={patient.id}
                      onClick={() => setSelectedPatient(patient)}
                      className={`w-full text-left p-4 rounded-2xl transition-all border outline-none relative overflow-hidden group cursor-pointer ${
                        isSelected
                          ? 'bg-indigo-50/80 border-indigo-200 shadow-sm'
                          : 'bg-white border-slate-100 hover:border-indigo-100/50 hover:bg-slate-50'
                      }`}
                    >
                      {isSelected && (
                        <span className="absolute left-0 top-0 bottom-0 w-1.5 bg-indigo-600 rounded-r-md" />
                      )}

                      <div className="flex items-center gap-3 relative z-10">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 shadow-sm bg-gradient-to-br ${avatarGradient} text-white`}>
                          {patient.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <h3 className={`font-extrabold truncate text-xs sm:text-sm tracking-tight ${isSelected ? 'text-indigo-950' : 'text-slate-900'}`}>
                              {patient.name}
                            </h3>
                            <div className="flex items-center gap-1 shrink-0">
                              {patient.implicit && (
                                <span className="text-[8px] px-1.5 py-0.5 rounded-md font-bold bg-slate-100 text-slate-400 border border-slate-200">
                                  Randevudan
                                </span>
                              )}
                              <span className={`text-[9px] px-2 py-0.5 rounded-md font-extrabold tracking-wide uppercase ${
                                isSelected ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-500'
                              }`}>
                                {patient.age} Yaş
                              </span>
                            </div>
                          </div>
                          <p className={`text-[11px] font-bold mt-0.5 truncate ${isSelected ? 'text-indigo-600' : 'text-slate-400'}`}>
                            Veli İsmi: {patient.parentName}
                          </p>
                        </div>
                      </div>

                      {patient.totalTasks > 0 ? (
                        <div className="mt-3.5 relative z-10">
                          <div className="flex items-center justify-between text-[10px] mb-1 font-bold">
                            <span className={isSelected ? 'text-indigo-500' : 'text-slate-400'}>
                              {patient.tasksCompleted}/{patient.totalTasks} Görev
                            </span>
                            <span className="font-black text-indigo-600">{pct}%</span>
                          </div>
                          <div className={`h-1.5 rounded-full overflow-hidden p-0.5 border border-transparent ${isSelected ? 'bg-indigo-100' : 'bg-slate-100'}`}>
                            <div
                              className={`h-full rounded-full transition-all ${isSelected ? 'bg-gradient-to-r from-indigo-400 to-indigo-600' : 'bg-gradient-to-r from-emerald-400 to-teal-500'}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="mt-2.5 flex items-center justify-between text-[9px] font-bold text-slate-400">
                          <span>Görev atanmamış</span>
                          <span className="text-[10px] text-indigo-500 font-extrabold flex items-center gap-0.5 hover:underline group-hover:translate-x-0.5 transition-transform shrink-0">
                            Hedef Ata →
                          </span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </>
            )}
          </div>
        </div>

        {/* Sağ kolon */}
        <div className="h-full min-h-[600px]">
          {selectedPatient ? (
            <div className="space-y-5 h-full flex flex-col animate-in slide-in-from-right-4 duration-300">
              {/* Hero */}
              <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-md rounded-[28px] p-6 border border-slate-200/50 dark:border-slate-800/40 shadow-sm relative overflow-hidden transition-all hover:border-slate-300/50">
                <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-bl from-indigo-50/40 via-purple-50/10 to-transparent rounded-bl-full pointer-events-none" />
                <div className="relative z-10">
                  <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-5">
                    <div className="flex items-center gap-5">
                      <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 via-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center text-3xl font-black text-white shadow-lg shadow-indigo-200 shrink-0">
                        {selectedPatient.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">{selectedPatient.name}</h2>
                          {selectedPatient.implicit && (
                            <span className="text-[10px] px-2 py-0.5 rounded-lg font-bold bg-slate-100 text-slate-500 border border-slate-200">
                              Randevu erişimi
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-lg font-black text-xs uppercase tracking-wide">{selectedPatient.age} Yaş</span>
                          <span className="text-slate-500 text-xs font-bold bg-slate-100 px-2.5 py-0.5 rounded-lg">{selectedPatient.diagnosis || 'Tanı bilgisi eklenmemiş'}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 items-center xl:justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleMessageParent}
                        loading={messaging}
                        className="rounded-xl shadow-sm hover:shadow text-xs border-slate-200 text-slate-700 hover:bg-slate-50 font-bold"
                      >
                        <MessageCircle size={14} className="mr-1.5 text-blue-500" /> Veliye Mesaj
                      </Button>
                      <Link to={`/cocuklarim/${selectedPatient.childId}`}>
                        <Button variant="outline" size="sm" className="rounded-xl shadow-sm hover:shadow text-xs border-slate-200 text-slate-700 hover:bg-slate-50 font-bold">
                          <User size={14} className="mr-1.5 text-slate-500" /> Profil
                        </Button>
                      </Link>
                      <Link to={`/bep-raporu?child=${selectedPatient.childId}`}>
                        <Button variant="outline" size="sm" className="rounded-xl shadow-sm hover:shadow text-xs border-slate-200 text-slate-700 hover:bg-slate-50 font-bold">
                          <FileText size={14} className="mr-1.5 text-purple-500" /> BEP
                        </Button>
                      </Link>
                      <Button variant="outline" size="sm" onClick={() => setShowReportModal(true)} className="rounded-xl shadow-sm hover:shadow text-xs border-slate-200 text-slate-700 hover:bg-slate-50 font-bold">
                        <BarChart2 size={14} className="mr-1.5 text-emerald-500" /> Rapor
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
                    <div className="bg-white p-3.5 rounded-2xl shadow-sm border border-slate-100/50 flex flex-col justify-between">
                      <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1">
                        <Users size={12} className="text-slate-400" /> Veli İsmi
                      </p>
                      <p className="font-extrabold text-slate-800 text-sm truncate">{selectedPatient.parentName}</p>
                    </div>
                    <div className="bg-white p-3.5 rounded-2xl shadow-sm border border-slate-100/50 flex flex-col justify-between">
                      <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1">
                        <Calendar size={12} className="text-indigo-400" /> Son Seans
                      </p>
                      <p className="font-extrabold text-slate-800 text-sm truncate">
                        {formatLastSession(selectedPatient.lastSessionDate)}
                      </p>
                    </div>
                    <div className="bg-white p-3.5 rounded-2xl shadow-sm border border-slate-100/50 flex flex-col justify-between">
                      <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1">
                        <Activity size={12} className="text-emerald-400" /> Görev İlerleme
                      </p>
                      <div className="flex items-center gap-2 mt-auto">
                        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                          <div
                            className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full transition-all"
                            style={{ width: `${selectedPatient.totalTasks > 0 ? (selectedPatient.tasksCompleted / selectedPatient.totalTasks) * 100 : 0}%` }}
                          />
                        </div>
                        <span className="text-[11px] font-black text-slate-700 shrink-0">{selectedPatient.tasksCompleted}/{selectedPatient.totalTasks}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-md rounded-[24px] border border-slate-200/50 dark:border-slate-800/40 p-4 shadow-sm">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Aile iş akışı</p>
                    <h3 className="mt-1 text-sm font-extrabold text-slate-900 dark:text-white">Planla, veliden geri bildirim al, rapora taşı</h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" onClick={() => setShowTaskModal(true)} className="h-9 rounded-xl bg-indigo-600 px-3 text-xs font-bold text-white hover:bg-indigo-700 shadow-sm">
                      <Plus size={14} className="mr-1.5" /> Görev ver
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleMessageParent} loading={messaging} className="h-9 rounded-xl border-slate-200 px-3 text-xs font-bold text-slate-700">
                      <MessageCircle size={14} className="mr-1.5 text-blue-500" /> Veliye yaz
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setShowReportModal(true)} className="h-9 rounded-xl border-slate-200 px-3 text-xs font-bold text-slate-700">
                      <FileText size={14} className="mr-1.5 text-emerald-500" /> Raporla
                    </Button>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
                  {[
                    { label: 'Açık görev', value: taskStats.pending + taskStats.overdue, detail: taskStats.overdue > 0 ? `${taskStats.overdue} gecikmiş` : 'Takip bekliyor', icon: Target, color: 'text-amber-700 bg-amber-50 border-amber-100' },
                    { label: 'Tamamlanan', value: taskStats.completed, detail: taskStats.review_pending > 0 ? `${taskStats.review_pending} incelenecek` : 'Hepsi incelendi', icon: CheckCircle, color: 'text-emerald-700 bg-emerald-50 border-emerald-100' },
                    { label: 'Paylaşım', value: selectedPatient.parentName ? 'Aktif' : 'Eksik', detail: selectedPatient.parentName || 'Veli bilgisi yok', icon: ShieldCheck, color: 'text-indigo-700 bg-indigo-50 border-indigo-100' },
                  ].map(({ label, value, detail, icon: Icon, color }) => (
                    <div key={label} className={`flex items-center gap-3 rounded-2xl border px-3 py-2.5 ${color}`}>
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/70">
                        <Icon size={17} />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-lg font-black leading-none">{value}</span>
                        <span className="mt-1 block truncate text-[10px] font-extrabold uppercase tracking-wider opacity-75">{label} · {detail}</span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Görevler */}
              <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-md rounded-[28px] border border-slate-200/50 dark:border-slate-800/40 shadow-sm flex-1 flex flex-col overflow-hidden hover:border-slate-300/50 transition-all">
                <div className="p-5 border-b border-slate-100/60 dark:border-slate-800/30 bg-slate-50/20">
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Target size={18} className="text-indigo-500" /> Görevler ve Ödevler
                    </h3>
                    <Button size="sm" onClick={() => setShowTaskModal(true)} className="rounded-xl shadow-md shadow-indigo-100 dark:shadow-none bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-3 py-1.5 h-8">
                      <Plus size={14} className="mr-1" /> Yeni Görev
                    </Button>
                  </div>

                  {tasks.length > 0 && (
                    <div className="flex flex-wrap gap-1 bg-slate-100 dark:bg-slate-800/60 p-1 rounded-xl mb-3 border border-slate-200/20">
                      {(['all', 'pending', 'review_pending', 'completed', 'overdue'] as TaskFilter[]).map(f => (
                        <button
                          key={f}
                          onClick={() => setTaskFilter(f)}
                          className={`flex-1 min-w-[80px] py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                            taskFilter === f ? 'bg-white dark:bg-slate-900 text-slate-950 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'
                          } ${f === 'overdue' && taskStats.overdue > 0 ? 'text-red-500 font-extrabold' : ''} ${f === 'review_pending' && taskStats.review_pending > 0 ? 'text-indigo-600 font-extrabold bg-indigo-50/50' : ''}`}
                        >
                          {taskFilterLabels[f]}
                        </button>
                      ))}
                    </div>
                  )}

                  {tasks.length > 3 && (
                    <div className="relative">
                      <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        value={taskSearch}
                        onChange={e => setTaskSearch(e.target.value)}
                        placeholder="Görev adı veya açıklaması ara..."
                        className="w-full pl-8 pr-8 py-2 text-xs border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-400 text-slate-800 dark:text-white font-semibold"
                      />
                      {taskSearch && (
                        <button onClick={() => setTaskSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 cursor-pointer">
                          <X size={12} className="text-slate-400" />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <div className="p-5 flex-1 overflow-y-auto space-y-3">
                  {tasksLoading ? (
                    <div className="flex justify-center items-center h-32">
                      <Loader2 size={24} className="animate-spin text-indigo-500" />
                    </div>
                  ) : tasks.length === 0 ? (
                    <div className="text-center py-14 bg-slate-50/50 dark:bg-slate-800/10 rounded-[24px] border border-dashed border-slate-200 dark:border-slate-800 p-6 flex flex-col items-center">
                      <div className="w-14 h-14 bg-indigo-50/70 dark:bg-indigo-950/30 rounded-2xl flex items-center justify-center mb-4 shadow-inner">
                        <Target size={26} className="text-indigo-500" />
                      </div>
                      <h4 className="text-sm font-extrabold text-slate-900 dark:text-white mb-1.5">Henüz görev atanmamış</h4>
                      <p className="text-xs text-slate-400 mb-5 max-w-xs mx-auto leading-relaxed font-semibold">Bu danışan için ev ödevleri, rutinler ve BEP gelişim hedefleri belirleyin.</p>
                      <Button size="sm" onClick={() => setShowTaskModal(true)} className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4">
                        <Plus size={14} className="mr-1" /> İlk Görevi Oluştur
                      </Button>
                    </div>
                  ) : filteredTasks.length === 0 ? (
                    <div className="text-center py-10 text-slate-400">
                      <Filter size={24} className="mx-auto mb-2 opacity-40 text-slate-400" />
                      <p className="text-xs font-semibold">Bu filtreyle eşleşen görev yok.</p>
                      <button onClick={() => { setTaskFilter('all'); setTaskSearch(''); }} className="mt-2 text-xs text-indigo-500 hover:underline font-bold cursor-pointer">
                        Filtreleri temizle
                      </button>
                    </div>
                  ) : (
                    filteredTasks.map(task => {
                      const over = isOverdue(task.dueDate) && task.status === 'PENDING';
                      const isExpanded = expandedTaskId === task.id;
                      const needsReview = isReviewPending(task.id);

                      const categoryStyles: Record<string, string> = {
                        'İletişim Becerileri': 'bg-blue-50 text-blue-700 border-blue-100',
                        'Motor Beceriler': 'bg-emerald-50 text-emerald-700 border-emerald-100',
                        'Davranış Yönetimi': 'bg-amber-50 text-amber-700 border-amber-100',
                        'Özbakım': 'bg-rose-50 text-rose-700 border-rose-100',
                        'Duyusal Bütünleme': 'bg-purple-50 text-purple-700 border-purple-100',
                      };
                      const catStyle = categoryStyles[task.category ?? ''] || 'bg-slate-50 text-slate-600 border-slate-200';

                      const diffStyles: Record<string, string> = {
                        'Kolay': 'bg-emerald-50/70 text-emerald-700',
                        'Orta': 'bg-amber-50/70 text-amber-700',
                        'Zor': 'bg-rose-50/70 text-rose-700',
                      };
                      const dStyle = diffStyles[task.difficulty ?? ''] || 'bg-slate-50 text-slate-500';

                      return (
                        <div
                          key={task.id}
                          className={`rounded-2xl border transition-all overflow-hidden ${
                            needsReview
                              ? 'border-indigo-200 bg-indigo-50/30'
                              : over
                              ? 'border-red-200 bg-red-50/20'
                              : task.status === 'COMPLETED'
                              ? 'border-emerald-100 bg-emerald-50/10'
                              : 'border-slate-100 bg-white hover:border-indigo-100/50 hover:bg-slate-50/10'
                          }`}
                        >
                          <div
                            className="flex items-start gap-4 p-4 cursor-pointer group/header"
                            onClick={() => handleExpandTask(task.id, task.status)}
                          >
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${
                              needsReview ? 'bg-indigo-100 text-indigo-600' :
                              over ? 'bg-red-100 text-red-600' :
                              task.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'
                            }`}>
                              {needsReview ? <Sparkles size={18} /> :
                               over ? <AlertTriangle size={18} /> :
                               task.status === 'COMPLETED' ? <CheckCircle size={18} /> : <Clock size={18} />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <h4 className={`font-bold text-xs sm:text-sm leading-tight tracking-tight ${task.status === 'COMPLETED' && !needsReview ? 'text-slate-400 line-through' : 'text-slate-900 group-hover/header:text-indigo-600 transition-colors'}`}>
                                  {task.title}
                                </h4>
                                <div className="flex items-center gap-1 shrink-0">
                                  {needsReview ? (
                                    <span className="text-[9px] bg-indigo-100/80 text-indigo-700 px-2 py-0.5 rounded-md font-extrabold uppercase shrink-0 animate-pulse border border-indigo-200">Değerlendirme Bekliyor</span>
                                  ) : task.status === 'COMPLETED' ? (
                                    <span className="text-[9px] bg-emerald-100/80 text-emerald-700 px-2 py-0.5 rounded-md font-extrabold uppercase shrink-0">Tamamlandı</span>
                                  ) : over ? (
                                    <span className="text-[9px] bg-red-100/80 text-red-700 px-2 py-0.5 rounded-md font-extrabold uppercase tracking-wide shrink-0 animate-pulse">Gecikti</span>
                                  ) : (
                                    <span className="text-[9px] bg-amber-100/80 text-amber-700 px-2 py-0.5 rounded-md font-extrabold uppercase shrink-0">Bekliyor</span>
                                  )}
                                  <button onClick={(e) => { e.stopPropagation(); openEdit(task); }} className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-indigo-600 cursor-pointer transition-colors">
                                    <Pencil size={12} />
                                  </button>
                                  <button onClick={(e) => { e.stopPropagation(); setDeleteTaskId(task.id); }} className="p-1.5 rounded-lg hover:bg-red-100 text-slate-400 hover:text-red-500 cursor-pointer transition-colors">
                                    <Trash2 size={12} />
                                  </button>
                                  <button className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-400 cursor-pointer transition-colors">
                                    {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                                  </button>
                                </div>
                              </div>
                              <div className="flex flex-wrap items-center gap-2 mt-2 text-[10px] font-bold text-slate-400">
                                {task.category && <span className={`px-2 py-0.5 rounded-md border ${catStyle}`}>{task.category}</span>}
                                {task.difficulty && <span className={`px-2 py-0.5 rounded-md ${dStyle}`}>{task.difficulty}</span>}
                                {task.frequency && <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md">{task.frequency}</span>}
                                {task.dueDate && (
                                  <span className={`px-2 py-0.5 rounded-md flex items-center gap-1 ${over ? 'bg-red-100/50 text-red-700' : 'bg-slate-100 text-slate-500'}`}>
                                    <Calendar size={10} /> {new Date(task.dueDate).toLocaleDateString('tr-TR')}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {isExpanded && (
                            <div className="px-4 pb-4 pt-0 border-t border-slate-100/60 space-y-3 mt-1.5 animate-in slide-in-from-top-1 duration-200">
                              {task.description && (
                                <div className="mt-3 bg-slate-50/50 p-3 rounded-xl border border-slate-100/50">
                                  <p className="text-xs text-slate-500 font-extrabold uppercase tracking-wide mb-1.5">Uygulama Adımları (Veliler İçin)</p>
                                  <p className="text-xs text-slate-600 leading-relaxed font-semibold whitespace-pre-wrap">{task.description}</p>
                                </div>
                              )}
                              {task.materialUrl && (
                                <div className="pt-1.5">
                                  <a
                                    href={task.materialUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 text-xs text-indigo-600 hover:underline font-extrabold bg-indigo-50 px-3 py-1.5 rounded-xl border border-indigo-100/30"
                                  >
                                    <FileText size={12} /> Materyal ve Destek Bağlantısı
                                  </a>
                                </div>
                              )}

                              {task.status === 'COMPLETED' && (
                                <div className="mt-4 pt-4 border-t border-slate-100/60">
                                  {loadingSubmissions[task.id] ? (
                                    <div className="flex items-center gap-2 text-xs text-slate-400">
                                      <Loader2 size={14} className="animate-spin" /> Teslimler yükleniyor...
                                    </div>
                                  ) : taskSubmissions[task.id]?.length > 0 ? (
                                    <>
                                      <h5 className="text-[11px] font-extrabold uppercase tracking-wide text-slate-500 mb-3 flex items-center gap-1.5">
                                        <CheckCircle size={14} className="text-emerald-500" /> Veli Görev Teslimi
                                      </h5>
                                      {taskSubmissions[task.id].map(sub => (
                                        <div key={sub.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                                          <div className="grid sm:grid-cols-2 gap-4">
                                            {sub.parentNote && (
                                              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Velinin Notu</p>
                                                <p className="text-xs text-slate-700 font-medium">{sub.parentNote}</p>
                                              </div>
                                            )}
                                            {sub.evidenceUrl && (
                                              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex flex-col justify-center items-start">
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Yüklenen Kanıt/Dosya</p>
                                                <a href={sub.evidenceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-2 rounded-xl transition-colors border border-indigo-100 w-full justify-center">
                                                  <LinkIcon size={14} /> Bağlantıya Git
                                                </a>
                                              </div>
                                            )}
                                          </div>

                                          <div className="pt-2 border-t border-slate-100">
                                            {sub.expertReviewed ? (
                                              <div className="bg-emerald-50/50 border border-emerald-100 p-3 rounded-xl flex gap-2">
                                                <ShieldCheck size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                                                <div>
                                                  <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-0.5">Uzman Değerlendirmesi Gönderildi</p>
                                                  <p className="text-xs text-emerald-800 font-medium">{sub.expertFeedback}</p>
                                                </div>
                                              </div>
                                            ) : (
                                              <div className="space-y-3 bg-indigo-50/30 p-3 rounded-xl border border-indigo-100">
                                                <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider flex items-center gap-1">
                                                  <Sparkles size={12} /> Uzman Görüşü Ekle (Zorunlu)
                                                </p>
                                                <textarea
                                                  value={feedbackText[sub.id] ?? ''}
                                                  onChange={e => setFeedbackText(prev => ({ ...prev, [sub.id]: e.target.value }))}
                                                  placeholder="Veliye geri bildirim verin. Bu geri bildirim velinin ödev panelinde görünecektir..."
                                                  className="w-full text-xs p-3 rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 resize-none shadow-inner"
                                                  rows={3}
                                                />
                                                <div className="flex justify-end">
                                                  <Button
                                                    size="sm"
                                                    loading={submittingFeedback === sub.id}
                                                    onClick={async () => {
                                                      const text = feedbackText[sub.id] ?? '';
                                                      if (!text.trim()) return toast.error('Lütfen bir geri bildirim yazın.');
                                                      setSubmittingFeedback(sub.id);
                                                      try {
                                                        const updated = await patientService.reviewTaskSubmission(sub.id, text);
                                                        setTaskSubmissions(prev => ({
                                                          ...prev,
                                                          [task.id]: prev[task.id].map(s => s.id === sub.id ? updated : s)
                                                        }));
                                                        setFeedbackText(prev => { const next = { ...prev }; delete next[sub.id]; return next; });
                                                        toast.success('Geri bildirim başarıyla iletildi.');
                                                      } catch {
                                                        toast.error('Değerlendirme gönderilemedi.');
                                                      } finally {
                                                        setSubmittingFeedback(null);
                                                      }
                                                    }}
                                                    className="rounded-xl text-[11px] font-bold px-5 py-2 h-auto bg-indigo-600 hover:bg-indigo-700 shadow-sm"
                                                  >
                                                    Gönder ve Onayla
                                                  </Button>
                                                </div>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      ))}
                                    </>
                                  ) : (
                                    <p className="text-xs text-slate-400 font-medium">Veli henüz teslim yapmadı.</p>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-slate-50/50 border border-slate-200/60 rounded-[32px] h-full flex items-center justify-center text-slate-400 flex-col gap-4">
              <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-sm">
                <Users size={24} className="text-slate-300" />
              </div>
              <p className="font-medium text-sm">Detayları görmek için bir danışan seçin</p>
            </div>
          )}
        </div>
      </div>

      <Modal isOpen={showTaskModal} onClose={closeTaskModal} title={editingTask ? 'Görevi Düzenle' : 'Yeni Görev Ata'}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Görev Başlığı</label>
            <Input value={newTask.title} onChange={e => setNewTask(prev => ({ ...prev, title: e.target.value }))} placeholder="Örn: Renkleri eşleştirme oyunu" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Açıklama & Adımlar</label>
            <textarea
              value={newTask.description}
              onChange={e => setNewTask(prev => ({ ...prev, description: e.target.value }))}
              className="w-full rounded-xl border border-slate-200 p-2.5 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
              rows={3}
              placeholder="Görevin nasıl yapılacağını açıklayın..."
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Kategori</label>
              <select value={newTask.category} onChange={e => setNewTask(prev => ({ ...prev, category: e.target.value }))} className="w-full rounded-xl border border-slate-200 p-2.5 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none">
                <option>İletişim Becerileri</option>
                <option>Motor Beceriler</option>
                <option>Davranış Yönetimi</option>
                <option>Özbakım</option>
                <option>Duyusal Bütünleme</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Zorluk</label>
              <select value={newTask.difficulty} onChange={e => setNewTask(prev => ({ ...prev, difficulty: e.target.value }))} className="w-full rounded-xl border border-slate-200 p-2.5 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none">
                <option value="Kolay">Kolay</option>
                <option value="Orta">Orta</option>
                <option value="Zor">Zor</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Sıklık</label>
              <select value={newTask.frequency} onChange={e => setNewTask(prev => ({ ...prev, frequency: e.target.value }))} className="w-full rounded-xl border border-slate-200 p-2.5 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none">
                <option>Günde 1 Kez</option>
                <option>Günde 2 Kez</option>
                <option>Haftada 3 Kez</option>
                <option>Sadece Hafta Sonu</option>
                <option>Her Gün</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Son Tarih</label>
              <Input type="date" value={newTask.dueDate} onChange={e => setNewTask(prev => ({ ...prev, dueDate: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Materyal Bağlantısı (Opsiyonel)</label>
            <Input value={newTask.materialUrl} onChange={e => setNewTask(prev => ({ ...prev, materialUrl: e.target.value }))} placeholder="https://..." />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t mt-6">
            <Button variant="outline" onClick={closeTaskModal} className="rounded-xl">İptal</Button>
            <Button onClick={handleSaveTask} loading={saving} className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white">
              {editingTask ? 'Güncelle' : 'Görev Ata'}
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmModal
        isOpen={!!deleteTaskId}
        onCancel={() => setDeleteTaskId(null)}
        onConfirm={() => deleteTaskId && handleDeleteTask(deleteTaskId)}
        title="Görevi Sil"
        message="Bu görevi silmek istediğinize emin misiniz? Bu işlem geri alınamaz."
        confirmLabel="Sil"
        cancelLabel="İptal"
        variant="danger"
      />

      <Modal isOpen={showReportModal} onClose={() => setShowReportModal(false)} title="Gelişim Raporu Oluştur">
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            <strong>{selectedPatient?.name}</strong> için genel gelişim raporu hazırlanacaktır.
            Tarayıcı yazdır ekranından PDF olarak kaydedebilirsiniz.
          </p>
          <div className="text-xs text-slate-500 bg-slate-50 rounded-xl p-3 border border-slate-100 space-y-1">
            <p><strong>Dahil edilecek bilgiler:</strong></p>
            <ul className="list-disc list-inside space-y-0.5 mt-1">
              <li>Danışan adı, yaş, tanı</li>
              <li>Veli bilgisi ve son seans tarihi</li>
              <li>Görev özeti ({taskStats.completed}/{taskStats.total} tamamlandı)</li>
              <li>Gecikmiş ve bekleyen görevler</li>
            </ul>
          </div>
          <div className="flex items-center gap-2 bg-indigo-50 text-indigo-700 p-3 rounded-xl text-sm">
            <Printer size={16} /> Tarayıcı yazdır ekranında "PDF olarak kaydet" seçeneğini kullanın.
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setShowReportModal(false)}>İptal</Button>
            <Button
              onClick={() => {
                if (!selectedPatient) return;
                const reportWindow = window.open('', '_blank');
                if (!reportWindow) { toast.error('Popup engelleyici açık olabilir.'); return; }
                const now = new Date().toLocaleDateString('tr-TR');
                const pendingTasks = tasks.filter(t => t.status === 'PENDING' && !isOverdue(t.dueDate));
                const overdueTasks = tasks.filter(t => t.status === 'PENDING' && isOverdue(t.dueDate));
                const completedTasks = tasks.filter(t => t.status === 'COMPLETED');
                reportWindow.document.write(`<!DOCTYPE html><html lang="tr"><head>
                  <meta charset="UTF-8"/>
                  <title>Gelişim Raporu — ${selectedPatient.name}</title>
                  <style>
                    body{font-family:Arial,sans-serif;max-width:800px;margin:40px auto;color:#1e293b;font-size:14px}
                    h1{font-size:22px;border-bottom:2px solid #6366f1;padding-bottom:8px;color:#4338ca}
                    h2{font-size:15px;margin-top:24px;margin-bottom:8px;color:#334155;border-left:4px solid #6366f1;padding-left:8px}
                    table{width:100%;border-collapse:collapse;margin-top:8px}
                    th,td{text-align:left;padding:6px 10px;border:1px solid #e2e8f0;font-size:13px}
                    th{background:#f8fafc;font-weight:600}
                    .badge{display:inline-block;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:600}
                    .red{background:#fee2e2;color:#b91c1c}
                    .green{background:#dcfce7;color:#15803d}
                    .amber{background:#fef3c7;color:#b45309}
                    .footer{margin-top:40px;font-size:11px;color:#94a3b8;border-top:1px solid #e2e8f0;padding-top:12px}
                    @media print{body{margin:20px}}
                  </style>
                </head><body>
                  <h1>Gelişim Raporu</h1>
                  <p style="color:#64748b;font-size:12px">Oluşturulma tarihi: ${now}</p>
                  <h2>Danışan Bilgileri</h2>
                  <table>
                    <tr><th>Ad</th><td>${selectedPatient.name}</td><th>Yaş</th><td>${selectedPatient.age}</td></tr>
                    <tr><th>Tanı</th><td colspan="3">${selectedPatient.diagnosis || '—'}</td></tr>
                    <tr><th>Veli</th><td>${selectedPatient.parentName}</td><th>Son Seans</th><td>${formatLastSession(selectedPatient.lastSessionDate)}</td></tr>
                  </table>
                  <h2>Görev Özeti</h2>
                  <table>
                    <tr><th>Toplam</th><th>Tamamlanan</th><th>Bekleyen</th><th>Gecikmiş</th></tr>
                    <tr>
                      <td>${taskStats.total}</td>
                      <td><span class="badge green">${taskStats.completed}</span></td>
                      <td><span class="badge amber">${pendingTasks.length}</span></td>
                      <td><span class="badge red">${overdueTasks.length}</span></td>
                    </tr>
                  </table>
                  ${overdueTasks.length > 0 ? `<h2>Gecikmiş Görevler</h2><table>
                    <tr><th>Görev</th><th>Kategori</th><th>Son Tarih</th></tr>
                    ${overdueTasks.map(t => `<tr><td>${t.title}</td><td>${t.category || '—'}</td><td>${t.dueDate ? new Date(t.dueDate).toLocaleDateString('tr-TR') : '—'}</td></tr>`).join('')}
                  </table>` : ''}
                  ${completedTasks.length > 0 ? `<h2>Tamamlanan Görevler</h2><table>
                    <tr><th>Görev</th><th>Kategori</th><th>Zorluk</th></tr>
                    ${completedTasks.map(t => `<tr><td>${t.title}</td><td>${t.category || '—'}</td><td>${t.difficulty || '—'}</td></tr>`).join('')}
                  </table>` : ''}
                  <div class="footer">Bu rapor Otizm Destek Platformu aracılığıyla oluşturulmuştur. Tıbbi tanı veya tedavi amacı taşımaz.</div>
                </body></html>`);
                reportWindow.document.close();
                reportWindow.focus();
                reportWindow.print();
                setShowReportModal(false);
              }}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              <Printer size={14} className="mr-1.5" /> PDF Oluştur ve Yazdır
            </Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Danışan (Veli) Ekle">
        <div className="space-y-5">
          <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100 mb-2">
            <p className="text-sm text-indigo-800">
              Veliye ait sisteme kayıtlı <strong>E-posta adresini</strong> girerek portföyünüze ekleyebilirsiniz.
            </p>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Veli E-posta Adresi</label>
            <div className="flex gap-2">
              <Input
                type="email"
                value={parentSearchEmail}
                onChange={e => setParentSearchEmail(e.target.value)}
                placeholder="ornek@veli.com"
                className="flex-1"
                onKeyDown={e => e.key === 'Enter' && handleSearchParent()}
              />
              <Button onClick={handleSearchParent} loading={searchingParent} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5">
                Bul
              </Button>
            </div>
          </div>

          {foundParent && (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4 animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center gap-3 border-b border-slate-200 pb-3">
                <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-bold">
                  {foundParent.parentName.charAt(0)}
                </div>
                <div>
                  <p className="font-bold text-slate-800">{foundParent.parentName}</p>
                  <p className="text-xs text-slate-500">{foundParent.parentEmail}</p>
                </div>
              </div>

              {foundParent.children.length > 0 ? (
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Eklenecek Çocuğu Seçin</label>
                  <div className="space-y-2">
                    {foundParent.children.map(child => (
                      <label key={child.id} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                        selectedChildToAdd === child.id ? 'border-indigo-500 bg-indigo-50/30 ring-1 ring-indigo-500' : 'border-slate-200 hover:bg-slate-100'
                      }`}>
                        <input
                          type="radio"
                          name="childSelect"
                          className="w-4 h-4 text-indigo-600 focus:ring-indigo-500"
                          checked={selectedChildToAdd === child.id}
                          onChange={() => setSelectedChildToAdd(child.id)}
                        />
                        <div>
                          <p className="font-semibold text-slate-800 text-sm">{child.name}</p>
                          {child.diagnosis && <p className="text-xs text-slate-500">{child.diagnosis}</p>}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-amber-600 bg-amber-50 p-3 rounded-lg border border-amber-100">
                  Bu velinin henüz sisteme kayıtlı bir çocuğu bulunmuyor. Ekleme işlemi yapılamaz.
                </p>
              )}

              {foundParent.children.length > 0 && (
                <label className="flex items-start gap-2 mt-2 pt-3 border-t border-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    className="mt-1 rounded text-indigo-600 focus:ring-indigo-500"
                    checked={hasConsent}
                    onChange={e => setHasConsent(e.target.checked)}
                  />
                  <span className="text-xs text-slate-600 leading-relaxed">
                    Veli ile görüştüğümü, onayını aldığımı ve bu çocuğu danışan portföyüme eklemeye yetkili olduğumu beyan ederim.
                  </span>
                </label>
              )}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setShowAddModal(false)}>İptal</Button>
            <Button
              onClick={handleAddPatient}
              loading={addingPatient}
              disabled={!foundParent || !selectedChildToAdd || !hasConsent}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              Danışan Olarak Ekle
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
