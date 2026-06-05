import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Users, Search, FileText, Calendar, Plus, CheckCircle,
  Clock, BarChart2, Printer, Target, LayoutDashboard, AlertCircle,
  RefreshCw, MessageCircle, Trash2, Pencil, X, AlertTriangle,
  ChevronDown, ChevronUp, Filter, User, Mail, Check, Info, ShieldCheck,
  Heart, Smile, Activity, Sparkles, Brain, Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { toast } from '@/store/toastStore';
import { patientService } from '@/services/patientService';
import { messagingService } from '@/services/messagingService';
import type { ExpertTask, PatientSummary, TaskSubmission } from '@/types';

function normalizeTR(str: string): string {
  return str
    .toLocaleLowerCase('tr-TR')
    .replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ı/g, 'i')
    .replace(/ö/g, 'o').replace(/ş/g, 's').replace(/ü/g, 'u');
}

function isOverdue(dueDate?: string): boolean {
  if (!dueDate) return false;
  return new Date(dueDate) < new Date(new Date().toDateString());
}

const EMPTY_TASK = {
  title: '', description: '', dueDate: '',
  category: 'İletişim Becerileri', difficulty: 'Kolay',
  frequency: 'Günde 1 Kez', materialUrl: '',
};

type TaskFilter = 'all' | 'pending' | 'completed' | 'overdue';

export function PatientsPage() {
  const navigate = useNavigate();
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
  
  const [taskSubmissions, setTaskSubmissions] = useState<Record<string, TaskSubmission[]>>({});
  const [feedbackText, setFeedbackText] = useState('');
  const [submittingFeedback, setSubmittingFeedback] = useState<string | null>(null);

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
    } catch (err: any) {
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
      const created = await patientService.addPatient(parentSearchEmail.trim(), selectedChildToAdd);
      setPatients(prev => [created, ...prev]);
      setSelectedPatient(created);
      toast.success('Danışan başarıyla portföyünüze eklendi.');
      setShowAddModal(false);
      setParentSearchEmail('');
      setFoundParent(null);
      setSelectedChildToAdd('');
      setHasConsent(false);
    } catch (err: any) {
      toast.error('Danışan eklenemedi veya zaten listenizde ekli.');
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
      if (data.length > 0) setSelectedPatient(prev => prev ?? data[0]);
    } catch {
      if (signal?.aborted) return;
      setLoadError(true);
      toast.error('Danışan listesi yüklenemedi.');
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    loadPatients(controller.signal);
    return () => controller.abort();
  }, [loadPatients]);

  useEffect(() => {
    if (!selectedPatient) { setTasks([]); return; }
    const controller = new AbortController();
    setTasksLoading(true);
    setTaskSearch('');
    setTaskFilter('all');
    patientService.getTasks(selectedPatient.childId)
      .then(data => { if (!controller.signal.aborted) setTasks(data); })
      .catch(() => { if (!controller.signal.aborted) toast.error('Görevler yüklenemedi.'); })
      .finally(() => { if (!controller.signal.aborted) setTasksLoading(false); });
    return () => controller.abort();
  }, [selectedPatient?.childId]);

  // Danışan arama ve sıralama
  const filteredPatients = useMemo(() => {
    let list = patients.filter(p => {
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
      // recent: varsayılan sıralama id değerine göre tersten
      list.sort((a, b) => b.id.localeCompare(a.id));
    }
    
    return list;
  }, [patients, search, patientSort]);

  // Görev filtre + arama + sıralama
  const filteredTasks = useMemo(() => {
    let list = tasks.filter(t => {
      if (taskFilter === 'pending')   return t.status === 'PENDING' && !isOverdue(t.dueDate);
      if (taskFilter === 'completed') return t.status === 'COMPLETED';
      if (taskFilter === 'overdue')   return t.status === 'PENDING' && isOverdue(t.dueDate);
      return true;
    });
    if (taskSearch.trim()) {
      const q = normalizeTR(taskSearch);
      list = list.filter(t => normalizeTR(t.title).includes(q) || normalizeTR(t.description ?? '').includes(q));
    }
    // Gecikmiş önce, sonra yakın tarih
    return [...list].sort((a, b) => {
      const aOver = isOverdue(a.dueDate) && a.status === 'PENDING';
      const bOver = isOverdue(b.dueDate) && b.status === 'PENDING';
      if (aOver !== bOver) return aOver ? -1 : 1;
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });
  }, [tasks, taskFilter, taskSearch]);

  // Görev istatistikleri
  const taskStats = useMemo(() => ({
    total:     tasks.length,
    pending:   tasks.filter(t => t.status === 'PENDING' && !isOverdue(t.dueDate)).length,
    completed: tasks.filter(t => t.status === 'COMPLETED').length,
    overdue:   tasks.filter(t => t.status === 'PENDING' && isOverdue(t.dueDate)).length,
  }), [tasks]);

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
    all:       `Tümü (${taskStats.total})`,
    pending:   `Bekleyen (${taskStats.pending})`,
    completed: `Tamamlanan (${taskStats.completed})`,
    overdue:   `Gecikmiş (${taskStats.overdue})`,
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
                  onChange={e => setPatientSort(e.target.value as any)}
                  className="w-full appearance-none text-xs border border-gray-200 bg-white rounded-xl pl-8 pr-8 py-2 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 font-bold text-gray-600 shadow-sm cursor-pointer transition-all"
                >
                  <option value="recent">En Yeni Eklenenler</option>
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
                <Button size="sm" variant="outline" onClick={() => { loadPatients(); }}>
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
              filteredPatients.map(patient => {
                const pct = patient.totalTasks > 0 ? Math.round((patient.tasksCompleted / patient.totalTasks) * 100) : 0;
                const isSelected = selectedPatient?.id === patient.id;
                
                // Dinamik avatarlar çocuk isimlerine göre
                const colors = [
                  'from-pink-500 to-rose-500',
                  'from-indigo-500 to-blue-500',
                  'from-emerald-500 to-teal-500',
                  'from-amber-500 to-orange-500'
                ];
                const hash = patient.name.charCodeAt(0) % colors.length;
                const avatarGradient = colors[hash];

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
                    {/* Active Left indicator */}
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
                          <span className={`text-[9px] px-2 py-0.5 rounded-md font-extrabold tracking-wide uppercase shrink-0 ${
                            isSelected ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-500'
                          }`}>
                            {patient.age} Yaş
                          </span>
                        </div>
                        <p className={`text-[11px] font-bold mt-0.5 truncate ${isSelected ? 'text-indigo-600' : 'text-slate-400'}`}>
                          Veli İsmi: {patient.parentName}
                        </p>
                      </div>
                    </div>

                    {/* Progress bar */}
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
              })
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
                        <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">{selectedPatient.name}</h2>
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
                        <Users size={12} className="text-slate-400" />
                        Veli İsmi
                      </p>
                      <p className="font-extrabold text-slate-800 text-sm truncate">{selectedPatient.parentName}</p>
                    </div>
                    <div className="bg-white p-3.5 rounded-2xl shadow-sm border border-slate-100/50 flex flex-col justify-between">
                      <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1">
                        <Calendar size={12} className="text-indigo-400" />
                        Son Seans
                      </p>
                      <p className="font-extrabold text-slate-800 text-sm truncate" title={selectedPatient.lastSession}>
                        {selectedPatient.lastSession && !isNaN(Date.parse(selectedPatient.lastSession)) 
                          ? new Date(selectedPatient.lastSession).toLocaleDateString('tr-TR') 
                          : (selectedPatient.lastSession === 'Henüz tamamlanan seans yok' ? 'Yok' : selectedPatient.lastSession || 'Yok')}
                      </p>
                    </div>
                    <div className="bg-white p-3.5 rounded-2xl shadow-sm border border-slate-100/50 flex flex-col justify-between">
                      <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1">
                        <Activity size={12} className="text-emerald-400" />
                        Görev İlerleme
                      </p>
                      <div className="flex items-center gap-2 mt-auto">
                        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden shadow-inner relative">
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

              {/* Görevler */}
              <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-md rounded-[28px] border border-slate-200/50 dark:border-slate-800/40 shadow-sm flex-1 flex flex-col overflow-hidden hover:border-slate-300/50 transition-all">
                {/* Tasks header */}
                <div className="p-5 border-b border-slate-100/60 dark:border-slate-800/30 bg-slate-50/20">
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Target size={18} className="text-indigo-500" /> Görevler ve Ödevler
                    </h3>
                    <Button size="sm" onClick={() => setShowTaskModal(true)} className="rounded-xl shadow-md shadow-indigo-100 dark:shadow-none bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-3 py-1.5 h-8">
                      <Plus size={14} className="mr-1" /> Yeni Görev
                    </Button>
                  </div>

                  {/* Mini stats */}
                  {tasks.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
                      {[
                        { label: 'Toplam', value: taskStats.total, color: 'text-slate-700 bg-slate-100/80 dark:bg-slate-800/60 dark:text-slate-300' },
                        { label: 'Bekleyen', value: taskStats.pending, color: 'text-amber-700 bg-amber-50/80 dark:bg-amber-950/20 dark:text-amber-400' },
                        { label: 'Tamamlanan', value: taskStats.completed, color: 'text-emerald-700 bg-emerald-50/80 dark:bg-emerald-950/20 dark:text-emerald-400' },
                        { label: 'Gecikmiş', value: taskStats.overdue, color: taskStats.overdue > 0 ? 'text-red-700 bg-red-50/80 dark:bg-red-950/20 dark:text-red-400' : 'text-slate-400 bg-slate-50 dark:bg-slate-800/30' },
                      ].map(s => (
                        <div key={s.label} className={`rounded-xl px-2.5 py-2 text-center border border-slate-100/20 ${s.color}`}>
                          <p className="text-lg font-black leading-none">{s.value}</p>
                          <p className="text-[9px] font-extrabold uppercase mt-1 tracking-wider">{s.label}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Task filter tabs */}
                  {tasks.length > 0 && (
                    <div className="flex gap-1 bg-slate-100 dark:bg-slate-800/60 p-1 rounded-xl mb-3 border border-slate-200/20">
                      {(['all', 'pending', 'completed', 'overdue'] as TaskFilter[]).map(f => (
                        <button
                          key={f}
                          onClick={() => setTaskFilter(f)}
                          className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            taskFilter === f ? 'bg-white dark:bg-slate-900 text-slate-950 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'
                          } ${f === 'overdue' && taskStats.overdue > 0 ? 'text-red-500 font-extrabold' : ''}`}
                        >
                          {taskFilterLabels[f]}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Task search */}
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

                      // Kategoriye göre dinamik rozet stilleri
                      const categoryStyles: Record<string, string> = {
                        'İletişim Becerileri': 'bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900/30',
                        'Motor Beceriler': 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30',
                        'Davranış Yönetimi': 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30',
                        'Özbakım': 'bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/30',
                        'Duyusal Bütünleme': 'bg-purple-50 text-purple-700 border-purple-100 dark:bg-purple-950/20 dark:text-purple-400 dark:border-purple-900/30',
                      };
                      const catStyle = categoryStyles[task.category ?? ''] || 'bg-slate-50 text-slate-600 border-slate-200';

                      // Zorluk rozeti stilleri
                      const diffStyles: Record<string, string> = {
                        'Kolay': 'bg-emerald-50/70 text-emerald-700 dark:bg-emerald-950/10 dark:text-emerald-400',
                        'Orta': 'bg-amber-50/70 text-amber-700 dark:bg-amber-950/10 dark:text-amber-400',
                        'Zor': 'bg-rose-50/70 text-rose-700 dark:bg-rose-950/10 dark:text-rose-400',
                      };
                      const dStyle = diffStyles[task.difficulty ?? ''] || 'bg-slate-50 text-slate-500';

                      return (
                        <div
                          key={task.id}
                          className={`rounded-2xl border transition-all overflow-hidden ${
                            over
                              ? 'border-red-200 bg-red-50/20 dark:border-red-950/30 dark:bg-red-950/5'
                              : task.status === 'COMPLETED'
                              ? 'border-emerald-100 bg-emerald-50/10 dark:border-emerald-950/20 dark:bg-emerald-950/5'
                              : 'border-slate-100 bg-white hover:border-indigo-100/50 hover:bg-slate-50/10 dark:border-slate-800/60 dark:bg-slate-900/40'
                          }`}
                        >
                          {/* Task row */}
                          <div className="flex items-start gap-4 p-4">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${
                              over ? 'bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400' :
                              task.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400' : 'bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400'
                            }`}>
                              {over ? <AlertTriangle size={18} /> :
                               task.status === 'COMPLETED' ? <CheckCircle size={18} /> : <Clock size={18} />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <h4 className={`font-bold text-xs sm:text-sm leading-tight tracking-tight ${task.status === 'COMPLETED' ? 'text-slate-400 line-through' : 'text-slate-900 dark:text-white'}`}>
                                  {task.title}
                                </h4>
                                <div className="flex items-center gap-1 shrink-0">
                                  {task.status === 'COMPLETED' ? (
                                    <span className="text-[9px] bg-emerald-100/80 text-emerald-700 px-2 py-0.5 rounded-md font-extrabold uppercase shrink-0">Tamamlandı</span>
                                  ) : over ? (
                                    <span className="text-[9px] bg-red-100/80 text-red-700 px-2 py-0.5 rounded-md font-extrabold uppercase tracking-wide shrink-0 animate-pulse">Gecikti</span>
                                  ) : (
                                    <span className="text-[9px] bg-amber-100/80 text-amber-700 px-2 py-0.5 rounded-md font-extrabold uppercase shrink-0">Bekliyor</span>
                                  )}
                                  <button onClick={() => openEdit(task)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-indigo-600 cursor-pointer transition-colors">
                                    <Pencil size={12} />
                                  </button>
                                  <button onClick={() => setDeleteTaskId(task.id)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20 text-slate-400 hover:text-red-500 cursor-pointer transition-colors">
                                    <Trash2 size={12} />
                                  </button>
                                  <button onClick={() => {
                                    const expand = !isExpanded;
                                    setExpandedTaskId(expand ? task.id : null);
                                    if (expand && task.status === 'COMPLETED' && !taskSubmissions[task.id]) {
                                      patientService.getTaskSubmissions(task.id)
                                        .then(data => setTaskSubmissions(prev => ({ ...prev, [task.id]: data })))
                                        .catch(err => console.error('Görev teslimleri alınamadı', err));
                                    }
                                  }} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 cursor-pointer transition-colors">
                                    {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                                  </button>
                                </div>
                              </div>
                              <div className="flex flex-wrap items-center gap-2 mt-2 text-[10px] font-bold text-slate-400">
                                {task.category && <span className={`px-2 py-0.5 rounded-md border ${catStyle}`}>{task.category}</span>}
                                {task.difficulty && <span className={`px-2 py-0.5 rounded-md ${dStyle}`}>{task.difficulty}</span>}
                                {task.frequency && <span className="bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded-md">{task.frequency}</span>}
                                {task.dueDate && (
                                  <span className={`px-2 py-0.5 rounded-md flex items-center gap-1 ${over ? 'bg-red-100/50 text-red-700' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                                    <Calendar size={10} /> {new Date(task.dueDate).toLocaleDateString('tr-TR')}
                                  </span>
                                )}
                              </div>
                              </div>
                            </div>

                          {/* Expanded detail */}
                          {isExpanded && (
                            <div className="px-4 pb-4 pt-0 border-t border-slate-100/60 dark:border-slate-800/20 space-y-3 mt-1.5 animate-in slide-in-from-top-1 duration-200">
                              {task.description && (
                                <div className="mt-3 bg-slate-50/50 dark:bg-slate-800/10 p-3 rounded-xl border border-slate-100/50 dark:border-slate-800/20">
                                  <p className="text-xs text-slate-500 dark:text-slate-400 font-extrabold uppercase tracking-wide mb-1.5">Uygulama Adımları (Veliler İçin)</p>
                                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-semibold whitespace-pre-wrap">{task.description}</p>
                                </div>
                              )}
                              {task.materialUrl && (
                                <div className="pt-1.5">
                                  <a 
                                    href={task.materialUrl} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-extrabold bg-indigo-50 dark:bg-indigo-950/20 px-3 py-1.5 rounded-xl border border-indigo-100/30"
                                  >
                                    <FileText size={12} /> Materyal ve Destek Bağlantısı
                                  </a>
                                </div>
                              )}

                              {/* Görev Teslimleri ve Değerlendirme */}
                              {task.status === 'COMPLETED' && taskSubmissions[task.id] && taskSubmissions[task.id].length > 0 && (
                                <div className="mt-4 pt-4 border-t border-slate-100/60 dark:border-slate-800/20">
                                  <h5 className="text-[11px] font-extrabold uppercase tracking-wide text-slate-500 mb-3 flex items-center gap-1.5">
                                    <CheckCircle size={14} className="text-emerald-500" /> Veli Görev Teslimi
                                  </h5>
                                  
                                  {taskSubmissions[task.id].map(sub => (
                                    <div key={sub.id} className="bg-slate-50/70 dark:bg-slate-800/30 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-3">
                                      {sub.evidenceUrl && (
                                        <div>
                                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Yüklenen Dosya/Kanıt</p>
                                          <a href={sub.evidenceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-xl transition-colors border border-blue-100">
                                            <FileText size={14} /> Görüntüle
                                          </a>
                                        </div>
                                      )}
                                      
                                      {sub.parentNote && (
                                        <div>
                                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Velinin Notu</p>
                                          <p className="text-xs text-slate-700 dark:text-slate-300 font-medium bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                                            {sub.parentNote}
                                          </p>
                                        </div>
                                      )}

                                      {/* Uzman Değerlendirmesi */}
                                      <div className="pt-2">
                                        {sub.expertReviewed ? (
                                          <div className="bg-emerald-50/50 border border-emerald-100 p-3 rounded-xl flex gap-2">
                                            <ShieldCheck size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                                            <div>
                                              <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-0.5">Uzman Değerlendirmesi Gönderildi</p>
                                              <p className="text-xs text-emerald-800 font-medium">{sub.expertFeedback}</p>
                                            </div>
                                          </div>
                                        ) : (
                                          <div className="space-y-2">
                                            <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                                              <Sparkles size={12} /> Uzman Görüşü Ekle
                                            </p>
                                            <textarea
                                              value={feedbackText}
                                              onChange={(e) => setFeedbackText(e.target.value)}
                                              placeholder="Veliye geri bildirim verin..."
                                              className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 resize-none"
                                              rows={2}
                                            />
                                            <div className="flex justify-end">
                                              <Button 
                                                size="sm" 
                                                loading={submittingFeedback === sub.id}
                                                onClick={async () => {
                                                  if (!feedbackText.trim()) return toast.error('Lütfen bir geri bildirim yazın.');
                                                  setSubmittingFeedback(sub.id);
                                                  try {
                                                    const updated = await patientService.reviewTaskSubmission(sub.id, feedbackText);
                                                    setTaskSubmissions(prev => ({
                                                      ...prev,
                                                      [task.id]: prev[task.id].map(s => s.id === sub.id ? updated : s)
                                                    }));
                                                    setFeedbackText('');
                                                    toast.success('Geri bildirim başarıyla iletildi.');
                                                  } catch (err) {
                                                    toast.error('Değerlendirme gönderilemedi.');
                                                  } finally {
                                                    setSubmittingFeedback(null);
                                                  }
                                                }}
                                                className="rounded-xl text-[11px] font-bold px-4 py-1.5 h-auto bg-indigo-600 hover:bg-indigo-700"
                                              >
                                                Gönder
                                              </Button>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  ))}
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
            <div className="h-full bg-gradient-to-br from-indigo-50/50 to-purple-50/50 rounded-[32px] border border-dashed border-indigo-200 flex flex-col items-center justify-center text-center p-8">
              <div className="w-24 h-24 bg-white shadow-xl shadow-indigo-100 rounded-[32px] flex items-center justify-center mb-5">
                <Users size={40} className="text-indigo-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Bir Danışan Seçin</h3>
              <p className="text-gray-500 max-w-sm leading-relaxed">
                Detaylı gelişim raporlarını görüntülemek, yeni hedefler belirlemek ve ev ödevleri atamak için sol menüden bir profil seçin.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Görev ekle / düzenle modal */}
      <Modal isOpen={showTaskModal} onClose={closeTaskModal} title={editingTask ? 'Görevi Düzenle' : 'Yeni Görev Ata'}>
        <div className="space-y-5 p-1 animate-in fade-in duration-300">
          
          <div className="bg-indigo-50/50 border border-indigo-100/40 rounded-2xl p-4 flex gap-3 items-start">
            <Target className="text-indigo-500 shrink-0 mt-0.5 animate-pulse" size={18} />
            <div className="text-xs text-indigo-900/80 leading-relaxed font-semibold">
              Çocuğun bireysel gelişim planına (BEP) uygun, evde veli gözetiminde uygulanabilecek yeni bir hedef veya etkinlik atayın.
            </div>
          </div>

          <Input
            label="Görev Başlığı *"
            placeholder="Örn: İnce Motor Becerisi Pratiği"
            value={newTask.title}
            onChange={e => setNewTask({ ...newTask, title: e.target.value })}
          />

          {/* Kategori Seçici - Premium Pills */}
          <div className="space-y-2">
            <label className="block text-xs font-extrabold text-slate-400 uppercase tracking-wider">
              Kategori Seçin
            </label>
            <div className="flex flex-wrap gap-2">
              {[
                { label: 'İletişim Becerileri', icon: MessageCircle, color: 'text-blue-600 bg-blue-50 border-blue-100 hover:border-blue-200' },
                { label: 'Motor Beceriler', icon: Activity, color: 'text-emerald-600 bg-emerald-50 border-emerald-100 hover:border-emerald-200' },
                { label: 'Davranış Yönetimi', icon: Smile, color: 'text-amber-600 bg-amber-50 border-amber-100 hover:border-amber-200' },
                { label: 'Özbakım', icon: Heart, color: 'text-rose-600 bg-rose-50 border-rose-100 hover:border-rose-200' },
                { label: 'Duyusal Bütünleme', icon: Brain, color: 'text-purple-600 bg-purple-50 border-purple-100 hover:border-purple-200' },
              ].map(cat => {
                const isSelected = newTask.category === cat.label;
                const Icon = cat.icon;
                return (
                  <button
                    key={cat.label}
                    type="button"
                    onClick={() => setNewTask({ ...newTask, category: cat.label })}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      isSelected 
                        ? 'border-indigo-600 bg-indigo-600 text-white shadow-md shadow-indigo-100' 
                        : cat.color
                    }`}
                  >
                    <Icon size={13} />
                    <span>{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            {/* Zorluk Derecesi - Segmented Controller */}
            <div className="space-y-2">
              <label className="block text-xs font-extrabold text-slate-400 uppercase tracking-wider">
                Zorluk Derecesi
              </label>
              <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200/50">
                {[
                  { label: 'Kolay', activeClass: 'bg-emerald-500 text-white shadow-sm', unactiveClass: 'text-slate-500 hover:text-slate-800' },
                  { label: 'Orta', activeClass: 'bg-amber-500 text-white shadow-sm', unactiveClass: 'text-slate-500 hover:text-slate-800' },
                  { label: 'Zor', activeClass: 'bg-rose-500 text-white shadow-sm', unactiveClass: 'text-slate-500 hover:text-slate-800' },
                ].map(diff => {
                  const isSelected = newTask.difficulty === diff.label;
                  return (
                    <button
                      key={diff.label}
                      type="button"
                      onClick={() => setNewTask({ ...newTask, difficulty: diff.label })}
                      className={`flex-1 text-center py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                        isSelected ? diff.activeClass : diff.unactiveClass
                      }`}
                    >
                      {diff.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Tekrar Sıklığı */}
            <div className="space-y-1.5">
              <label className="block text-xs font-extrabold text-slate-400 uppercase tracking-wider">
                Tekrar Sıklığı
              </label>
              <select 
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white cursor-pointer text-slate-800"
                value={newTask.frequency} 
                onChange={e => setNewTask({ ...newTask, frequency: e.target.value })}
              >
                <option>Günde 1 Kez</option>
                <option>Günde 2 Kez</option>
                <option>Haftada 3 Kez</option>
                <option>Sadece 1 Kez</option>
              </select>
            </div>
          </div>

          {/* Açıklama (Şablon Doldur Destekli) */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="block text-xs font-extrabold text-slate-400 uppercase tracking-wider">
                Açıklama (Aile için)
              </label>
              <button
                type="button"
                onClick={() => {
                  const TEMPLATES: Record<string, string> = {
                    'İletişim Becerileri': '1. Çocuğun göz hizasına inin.\n2. Kısa ve net yönergeler verin.\n3. İletişim kurduğunda sözel pekiştireç verin.\n4. Çalışmayı 10 dakikadan uzun tutmayın.',
                    'Motor Beceriler': '1. Hareketi önce kendiniz gösterin.\n2. Fiziksel yardım derecesini kademeli olarak azaltın.\n3. Denge kaybına karşı güvenlik önlemleri alın.\n4. Yorulduğunda 2 dakika dinlendirin.',
                    'Davranış Yönetimi': '1. İstenmeyen davranışı sakin kalın ve görmezden gelin.\n2. Doğru davranışı hemen ödüllendirin.\n3. Sakin ve kararlı ses tonu kullanın.\n4. Kriz anında güvenli alana geçin.',
                    'Özbakım': '1. İşlemi küçük basamaklara (örneğin el yıkamada 5 adım) bölün.\n2. Görsel destek kartları kullanın.\n3. Başardığı her mikro adımda alkışlayın.\n4. Yardımı azaltarak bağımsızlığı destekleyin.',
                    'Duyusal Bütünleme': '1. Çocuğun tepkilerini yakından izleyin.\n2. Aşırı uyarılma (overstimulation) halinde durun.\n3. Yumuşak zemin ve sessiz ortam tercih edin.\n4. Sevdiği duyusal oyuncakları dahil edin.',
                  };
                  const tpl = TEMPLATES[newTask.category] || '';
                  setNewTask({ ...newTask, description: tpl });
                  toast.success(`${newTask.category} şablonu uygulandı.`);
                }}
                className="text-[10px] text-indigo-600 hover:text-indigo-700 font-extrabold flex items-center gap-1 hover:underline cursor-pointer bg-indigo-50 dark:bg-indigo-950/30 px-2 py-0.5 rounded-lg border border-indigo-100/40"
              >
                <Sparkles size={11} /> Şablon Doldur
              </button>
            </div>
            <textarea 
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none text-slate-800 leading-relaxed"
              rows={4} 
              placeholder="Adım adım uygulama talimatları..."
              value={newTask.description} 
              onChange={e => setNewTask({ ...newTask, description: e.target.value })} 
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            {/* Son Tamamlama Tarihi */}
            <div className="flex-1">
              <Input 
                type="date" 
                label="Son Tamamlama Tarihi" 
                value={newTask.dueDate}
                onChange={e => setNewTask({ ...newTask, dueDate: e.target.value })} 
              />
            </div>

            {/* Yardımcı Materyal Linki */}
            <div className="flex-1">
              <Input 
                label="Yardımcı Materyal Linki"
                placeholder="YouTube linki veya PDF bağlantısı"
                value={newTask.materialUrl} 
                onChange={e => setNewTask({ ...newTask, materialUrl: e.target.value })} 
              />
              {/* Dinamik Link Badge */}
              {(() => {
                const url = newTask.materialUrl.trim();
                if (!url) return null;
                const lower = url.toLowerCase();
                let badge = { text: 'Dış Bağlantı', color: 'bg-blue-50 text-blue-700 border-blue-100', icon: '🔗' };
                
                if (lower.includes('youtube.com') || lower.includes('youtu.be')) {
                  badge = { text: 'YouTube Videosu', color: 'bg-red-50 text-red-700 border-red-100', icon: '🎥' };
                } else if (lower.endsWith('.pdf') || lower.includes('drive.google.com/file') || lower.includes('/pdf/')) {
                  badge = { text: 'PDF Dosyası', color: 'bg-orange-50 text-orange-700 border-orange-100', icon: '📄' };
                } else if (lower.includes('drive.google.com')) {
                  badge = { text: 'Google Drive', color: 'bg-emerald-50 text-emerald-700 border-emerald-100', icon: '💾' };
                }
                
                return (
                  <div className={`inline-flex items-center gap-1 text-[9px] font-extrabold border px-2 py-0.5 rounded-lg mt-1 animate-in fade-in duration-300 ${badge.color}`}>
                    <span>{badge.icon}</span>
                    <span>{badge.text}</span>
                  </div>
                );
              })()}
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t border-gray-100">
            <Button variant="outline" className="flex-1 rounded-xl font-bold border-slate-200 text-slate-600 hover:bg-slate-50" onClick={closeTaskModal}>İptal</Button>
            <Button className="flex-1 rounded-xl font-bold shadow-lg shadow-indigo-100 bg-indigo-600 hover:bg-indigo-700 text-white" onClick={handleSaveTask} loading={saving}>
              {editingTask ? 'Güncelle' : 'Görevi Ata'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Silme onayı */}
      <ConfirmModal
        isOpen={!!deleteTaskId}
        title="Görevi sil?"
        message="Bu görev kalıcı olarak silinecek."
        confirmLabel="Evet, sil"
        variant="danger"
        onConfirm={() => deleteTaskId && handleDeleteTask(deleteTaskId)}
        onCancel={() => setDeleteTaskId(null)}
      />

      {/* İlerleme Raporu */}
      <Modal isOpen={showReportModal} onClose={() => setShowReportModal(false)} title={`İlerleme Raporu — ${selectedPatient?.name ?? ''}`}>
        {selectedPatient && (
          <div className="space-y-5">
            <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-indigo-900">{selectedPatient.name}</h3>
                <p className="text-sm text-indigo-700 mt-0.5">Veli İsmi: {selectedPatient.parentName}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold text-indigo-400 uppercase">Rapor Tarihi</p>
                <p className="text-sm font-medium text-indigo-800">{new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
              </div>
            </div>

            <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
              <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                <Target size={16} className="text-indigo-500" /> Görev Tamamlama
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Toplam',      value: taskStats.total,     color: 'text-gray-700 bg-gray-50' },
                  { label: 'Tamamlanan',  value: taskStats.completed,  color: 'text-emerald-700 bg-emerald-50' },
                  { label: 'Bekleyen',    value: taskStats.pending,    color: 'text-amber-700 bg-amber-50' },
                  { label: 'Gecikmiş',    value: taskStats.overdue,    color: taskStats.overdue > 0 ? 'text-red-700 bg-red-50' : 'text-gray-400 bg-gray-50' },
                ].map(s => (
                  <div key={s.label} className={`text-center p-3 rounded-xl ${s.color}`}>
                    <p className="text-2xl font-black">{s.value}</p>
                    <p className="text-[10px] font-bold uppercase tracking-wide mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 h-3 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 rounded-full transition-all"
                  style={{ width: `${selectedPatient.totalTasks > 0 ? Math.round((selectedPatient.tasksCompleted / selectedPatient.totalTasks) * 100) : 0}%` }} />
              </div>
            </div>

            {tasks.length > 0 && (
              <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
                <h4 className="text-sm font-bold text-gray-900 mb-3">Son Görevler</h4>
                <div className="space-y-2">
                  {tasks.slice(0, 5).map(t => (
                    <div key={t.id} className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
                      <div className="flex items-center gap-2">
                        {t.status === 'COMPLETED'
                          ? <CheckCircle size={15} className="text-emerald-500 shrink-0" />
                          : <Clock size={15} className="text-amber-500 shrink-0" />}
                        <span className="text-sm font-medium text-gray-800">{t.title}</span>
                      </div>
                      <span className="text-[11px] font-bold text-gray-400 bg-gray-50 px-2 py-0.5 rounded-lg">{t.category}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 flex justify-between items-center">
              <span className="font-semibold text-gray-700 text-sm">Son Seans</span>
              <span className="font-semibold text-gray-900 bg-white px-3 py-1 rounded-xl shadow-sm text-sm" title={selectedPatient.lastSession}>
                {selectedPatient.lastSession && !isNaN(Date.parse(selectedPatient.lastSession)) 
                  ? new Date(selectedPatient.lastSession).toLocaleDateString('tr-TR') 
                  : (selectedPatient.lastSession === 'Henüz tamamlanan seans yok' ? 'Yok' : selectedPatient.lastSession || 'Kayıt yok')}
              </span>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setShowReportModal(false)} className="flex-1 rounded-xl">Kapat</Button>
              <Button onClick={() => window.print()} className="flex-1 rounded-xl bg-gray-900 hover:bg-gray-800 text-white">
                <Printer size={16} className="mr-2" /> PDF
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Danışan Ekleme Modali */}
      <Modal 
        isOpen={showAddModal} 
        onClose={() => { 
          setShowAddModal(false); 
          setFoundParent(null); 
          setParentSearchEmail(''); 
          setHasConsent(false);
        }} 
        title="Sisteme Danışan Bağla"
      >
        <div className="space-y-5 p-1 animate-in fade-in duration-300">
          
          {/* Header info */}
          <div className="bg-indigo-50/50 border border-indigo-100/40 rounded-2xl p-4 flex gap-3 items-start">
            <Info className="text-indigo-500 shrink-0 mt-0.5" size={18} />
            <p className="text-xs font-semibold leading-relaxed text-indigo-900/80">
              Danışanınızı ekleyerek gelişim raporlarına erişebilir, özel BEP hedefleri atayabilir ve veliyle doğrudan anlık mesajlaşma başlatabilirsiniz.
            </p>
          </div>

          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <Input
                label="Veli E-Posta Adresi *"
                placeholder="veli@example.com"
                value={parentSearchEmail}
                onChange={e => setParentSearchEmail(e.target.value)}
              />
            </div>
            <Button 
              onClick={handleSearchParent} 
              loading={searchingParent} 
              className="rounded-xl h-11 px-5 font-bold shadow-md hover:shadow-indigo-100/30 mb-1.5 shrink-0 bg-slate-900 text-white hover:bg-slate-800 transition-all"
            >
              Bul
            </Button>
          </div>

          {/* Ebeveyn ve Çocuk Bulunamadı / Başlangıç Rehberi */}
          {!foundParent && !searchingParent && (
            <div className="border border-slate-100 rounded-2xl p-5 bg-slate-50/50 space-y-3">
              <h5 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-emerald-500" />
                Süreç Nasıl Çalışır?
              </h5>
              <ul className="space-y-2.5 text-xs text-slate-500 font-semibold">
                <li className="flex gap-2 items-start">
                  <span className="w-5 h-5 rounded-full bg-slate-200/60 font-black text-[10px] flex items-center justify-center shrink-0 text-slate-700">1</span>
                  <span>Velinin platforma kayıtlı e-posta adresini yukarıya girip aratın.</span>
                </li>
                <li className="flex gap-2 items-start">
                  <span className="w-5 h-5 rounded-full bg-slate-200/60 font-black text-[10px] flex items-center justify-center shrink-0 text-slate-700">2</span>
                  <span>Sistem veliyi ve onun sistemde tanımlı çocuk profillerini çeker.</span>
                </li>
                <li className="flex gap-2 items-start">
                  <span className="w-5 h-5 rounded-full bg-slate-200/60 font-black text-[10px] flex items-center justify-center shrink-0 text-slate-700">3</span>
                  <span>Portföyünüze dahil etmek istediğiniz çocuğu seçerek onaylayın.</span>
                </li>
              </ul>
            </div>
          )}

          {foundParent && (
            <div className="space-y-4 animate-in slide-in-from-bottom duration-300">
              
              {/* Ebeveyn Bilgi Kartı */}
              <div className="bg-gradient-to-br from-indigo-50/30 to-purple-50/30 dark:from-slate-800/40 dark:to-indigo-950/20 border border-indigo-100/40 rounded-2xl p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center text-white font-extrabold text-sm shadow-sm shrink-0">
                    {foundParent.parentName ? foundParent.parentName.charAt(0).toUpperCase() : 'V'}
                  </div>
                  <div>
                    <p className="text-xs font-extrabold text-indigo-400 uppercase tracking-wider">Eşleşen Ebeveyn</p>
                    <p className="font-bold text-slate-800 text-sm mt-0.5">{foundParent.parentName}</p>
                    <p className="text-slate-500 font-semibold text-xs flex items-center gap-1 mt-0.5">
                      <Mail size={12} className="text-slate-400 shrink-0" />
                      {foundParent.parentEmail}
                    </p>
                  </div>
                </div>
                <span className="text-[10px] bg-emerald-100/70 border border-emerald-200 text-emerald-700 font-bold px-2 py-0.5 rounded-full uppercase shrink-0">Kayıtlı</span>
              </div>

              {/* Çocuk Listesi / Kart Seçimi */}
              {foundParent.children && foundParent.children.length > 0 ? (
                <div className="space-y-2">
                  <label className="block text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-1">
                    Çocuk Profili Seçin
                  </label>
                  
                  <div className="grid sm:grid-cols-2 gap-3">
                    {foundParent.children.map(c => {
                      const isSelected = selectedChildToAdd === c.id;
                      // Basit renk formülü çocuk ismine göre
                      const colors = [
                        'from-pink-400 to-rose-400',
                        'from-indigo-400 to-blue-400',
                        'from-emerald-400 to-teal-400',
                        'from-amber-400 to-orange-400'
                      ];
                      const hash = c.name.charCodeAt(0) % colors.length;
                      const avatarGradient = colors[hash];

                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => setSelectedChildToAdd(c.id)}
                          className={`relative text-left p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center gap-3 group outline-none ${
                            isSelected 
                              ? 'border-indigo-600 bg-indigo-50/30 shadow-md shadow-indigo-100/50' 
                              : 'border-slate-100 hover:border-slate-200 bg-white hover:bg-slate-50/50 shadow-sm'
                          }`}
                        >
                          <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${avatarGradient} flex items-center justify-center text-white font-extrabold text-xs shadow-sm shrink-0`}>
                            {c.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-slate-800 text-xs truncate group-hover:text-indigo-950 transition-colors">{c.name}</p>
                            {c.diagnosis && (
                              <span className="inline-block text-[9px] bg-slate-100 text-slate-600 font-bold px-1.5 py-0.5 rounded mt-1 truncate max-w-full">
                                {c.diagnosis}
                              </span>
                            )}
                          </div>
                          {isSelected && (
                            <span className="absolute top-2 right-2 w-4 h-4 rounded-full bg-indigo-600 flex items-center justify-center text-white shadow-sm">
                              <Check size={10} strokeWidth={3} />
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2.5 text-xs text-amber-700 bg-amber-50/80 border border-amber-100 p-4 rounded-2xl font-semibold">
                  <AlertCircle size={16} className="text-amber-500 shrink-0" />
                  <p>Bu velinin platformda henüz çocuk kaydı bulunmuyor. Önce velinin platformda çocuk eklemesi gerekir.</p>
                </div>
              )}

              {/* KVKK / Onay Beyanı */}
              {foundParent.children && foundParent.children.length > 0 && (
                <div className="pt-2 border-t border-slate-100 flex items-start gap-2.5">
                  <input
                    type="checkbox"
                    id="kvkk_consent"
                    checked={hasConsent}
                    onChange={e => setHasConsent(e.target.checked)}
                    className="mt-0.5 w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 cursor-pointer"
                  />
                  <label htmlFor="kvkk_consent" className="text-[11px] font-semibold text-slate-500 select-none cursor-pointer leading-tight">
                    Bu veliyi ve çocuğunu portföyüme ekleyerek takip yapmak için **velinin rızasını/açık onayını** aldığımı beyan ederim.
                  </label>
                </div>
              )}

            </div>
          )}

          <div className="flex gap-3 pt-4 border-t border-slate-100">
            <Button 
              variant="outline" 
              className="flex-1 rounded-xl font-bold border-slate-200 text-slate-600 hover:bg-slate-50" 
              onClick={() => { 
                setShowAddModal(false); 
                setFoundParent(null); 
                setParentSearchEmail(''); 
                setHasConsent(false);
              }}
            >
              İptal
            </Button>
            <Button 
              className={`flex-1 rounded-xl font-bold transition-all shadow-md ${
                !hasConsent || !foundParent || !foundParent.children || foundParent.children.length === 0
                  ? 'bg-slate-200 text-slate-400 shadow-none cursor-not-allowed'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-100 hover:shadow-lg'
              }`} 
              onClick={handleAddPatient} 
              loading={addingPatient}
              disabled={!hasConsent || !foundParent || !foundParent.children || foundParent.children.length === 0}
            >
              Portföye Ekle
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
