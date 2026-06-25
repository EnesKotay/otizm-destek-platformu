import { useMemo, useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { patientService } from '@/services/patientService';
import { useAuthStore } from '@/store/authStore';
import { toast } from '@/store/toastStore';
import {
  ClipboardCheck, CheckCircle2, Clock, ExternalLink,
  ChevronDown, ChevronUp, BookOpen, Star, AlertCircle,
  MessageCircle, Link as LinkIcon, Info
} from 'lucide-react';
import { PageOnboarding } from '@/components/ui/PageOnboarding';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import type { ExpertTask, TaskSubmission } from '@/types';

const CATEGORY_COLOR: Record<string, string> = {
  'Dil & İletişim': 'bg-blue-50 text-blue-700 border-blue-100',
  'Sosyal Beceri':  'bg-purple-50 text-purple-700 border-purple-100',
  'Öz Bakım':       'bg-emerald-50 text-emerald-700 border-emerald-100',
  'Motor Beceri':   'bg-orange-50 text-orange-700 border-orange-100',
  'Akademik':       'bg-indigo-50 text-indigo-700 border-indigo-100',
};

const DIFFICULTY_LABEL: Record<string, string> = {
  EASY: 'Kolay', MEDIUM: 'Orta', HARD: 'Zor',
};
const DIFFICULTY_COLOR: Record<string, string> = {
  EASY: 'text-emerald-600', MEDIUM: 'text-amber-600', HARD: 'text-red-600',
};

function isOverdue(dueDate?: string): boolean {
  if (!dueDate) return false;
  return new Date(dueDate) < new Date(new Date().toDateString());
}

interface TaskSubmissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (note: string, evidenceUrl: string) => void;
  taskTitle: string;
  isSubmitting: boolean;
}

function TaskSubmissionModal({ isOpen, onClose, onSubmit, taskTitle, isSubmitting }: TaskSubmissionModalProps) {
  const [note, setNote] = useState('');
  const [evidenceUrl, setEvidenceUrl] = useState('');

  // Reset fields when opened
  useEffect(() => {
    if (isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setNote('');
      setEvidenceUrl('');
    }
  }, [isOpen]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Görevi Teslim Et">
      <div className="space-y-5 p-1">
        <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100/50">
          <p className="text-xs font-bold text-indigo-800 uppercase tracking-wider mb-1">Seçili Görev</p>
          <p className="text-sm font-semibold text-indigo-950">{taskTitle}</p>
        </div>
        
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">Uzmana İletilecek Not</label>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Çocuğunuz bu görevi yaparken nasıl hissetti? (Örn: Çok rahat tamamladı)"
            className="w-full min-h-[100px] rounded-2xl border-slate-200 bg-slate-50/50 p-3 text-sm focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">Kanıt / Eklenti Bağlantısı (İsteğe Bağlı)</label>
          <div className="relative">
            <LinkIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              value={evidenceUrl}
              onChange={e => setEvidenceUrl(e.target.value)}
              placeholder="https://... (Drive, Fotoğraf linki)"
              className="pl-9 rounded-xl border-slate-200 bg-slate-50/50 shadow-none focus:bg-white"
            />
          </div>
          <p className="text-[10px] font-medium text-slate-500 mt-1.5 flex items-start gap-1">
            <Info size={12} className="shrink-0 mt-0.5" /> Uzmanınızın görebilmesi için ilgili çalışma anının videosunu veya fotoğrafını bulut bağlantısı olarak ekleyebilirsiniz.
          </p>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting} className="rounded-xl px-5 text-xs font-bold">
            İptal
          </Button>
          <Button onClick={() => onSubmit(note, evidenceUrl)} loading={isSubmitting} className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white px-6 text-xs font-bold shadow-sm shadow-indigo-200">
            Teslim Et ve Kapat
          </Button>
        </div>
      </div>
    </Modal>
  );
}

interface TaskCardProps {
  task: ExpertTask;
  onCompleteRequest: (task: ExpertTask) => void;
  completing: boolean;
}

function TaskCard({ task, onCompleteRequest, completing }: TaskCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [submissions, setSubmissions] = useState<TaskSubmission[]>([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const done = task.status === 'COMPLETED';
  const overdue = !done && isOverdue(task.dueDate);

  const catClass = task.category
    ? (CATEGORY_COLOR[task.category] ?? 'bg-slate-50 text-slate-600 border-slate-200')
    : 'bg-slate-50 text-slate-600 border-slate-200';

  useEffect(() => {
    if (expanded && done && submissions.length === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoadingSubmissions(true);
      patientService.getTaskSubmissions(task.id)
        .then(data => setSubmissions(data))
        .catch(() => console.error("Could not fetch submissions"))
        .finally(() => setLoadingSubmissions(false));
    }
  }, [expanded, done, task.id, submissions.length]);

  return (
    <div className={`group bg-white/80 backdrop-blur-xl rounded-[2rem] border transition-all duration-500 overflow-hidden ${
      done
        ? 'border-emerald-200/60 bg-gradient-to-br from-emerald-50/20 to-transparent'
        : overdue
        ? 'border-red-200/80 shadow-[0_8px_30px_rgba(239,68,68,0.05)] hover:shadow-[0_12px_40px_rgba(239,68,68,0.1)] hover:-translate-y-0.5'
        : 'border-slate-200/60 shadow-[0_8px_30px_rgba(15,23,42,0.02)] hover:shadow-[0_12px_40px_rgba(15,23,42,0.06)] hover:-translate-y-0.5'
    }`}>
      {overdue && (
        <div className="flex items-center gap-2 px-5 pt-4 pb-0">
          <AlertCircle size={14} className="text-red-500 shrink-0" />
          <span className="text-xs font-bold uppercase tracking-wider text-red-600">Son tarih geçti! Uzmanınız teslimat bekliyor.</span>
        </div>
      )}

      <div className="p-5 sm:p-6">
        <div 
          className="flex items-start gap-4 cursor-pointer group/header"
          onClick={() => setExpanded(v => !v)}
        >
          <button
            onClick={(e) => { e.stopPropagation(); if (!done) onCompleteRequest(task); }}
            disabled={done || completing}
            title={done ? 'Tamamlandı' : 'Görev Teslimini Başlat'}
            className={`mt-1 shrink-0 w-8 h-8 rounded-xl flex items-center justify-center transition-all cursor-pointer shadow-sm ${
              done
                ? 'bg-emerald-100 cursor-default shadow-none'
                : completing
                ? 'bg-slate-100 opacity-50'
                : 'bg-white border border-slate-200 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200'
            }`}
          >
            {done
              ? <CheckCircle2 size={18} className="text-emerald-600" />
              : completing
              ? <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
              : <Clock size={16} className={done ? "text-emerald-600" : "text-slate-400"} />
            }
          </button>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3 className={`text-base font-bold transition-colors ${done ? 'text-slate-400 line-through decoration-slate-300' : 'text-slate-800 group-hover/header:text-indigo-600'}`}>
                {task.title}
              </h3>
              <span className="shrink-0 p-1.5 hover:bg-slate-200 rounded-xl transition-colors">
                {expanded
                  ? <ChevronUp size={16} className="text-slate-400" />
                  : <ChevronDown size={16} className="text-slate-400" />}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2 mt-2">
              {task.category && (
                <span className={`text-[10px] px-2.5 py-1 rounded-lg font-black uppercase tracking-wider border ${catClass}`}>
                  {task.category}
                </span>
              )}
              {task.difficulty && (
                <span className={`text-[11px] font-black uppercase tracking-wider bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-lg ${DIFFICULTY_COLOR[task.difficulty] ?? 'text-slate-500'}`}>
                  <Star size={10} className="inline mr-1 mb-0.5" />
                  {DIFFICULTY_LABEL[task.difficulty] ?? task.difficulty}
                </span>
              )}
              {task.frequency && (
                <span className="text-[11px] font-bold text-slate-400 border border-slate-100 bg-slate-50 px-2 py-0.5 rounded-lg">{task.frequency}</span>
              )}
              {task.dueDate && (
                <span className={`text-[11px] font-black uppercase tracking-wider px-2 py-0.5 rounded-lg border ${overdue ? 'text-red-600 bg-red-50 border-red-100' : 'text-slate-500 bg-slate-50 border-slate-100'}`}>
                  Son: {new Date(task.dueDate).toLocaleDateString('tr-TR')}
                </span>
              )}
            </div>
          </div>
        </div>

        {expanded && (
          <div className="mt-5 ml-12 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
            {task.description && (
              <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                <p className="text-xs uppercase tracking-wider font-extrabold text-slate-400 mb-1.5">GÖREV DETAYI</p>
                <p className="text-sm text-slate-700 leading-relaxed font-medium">{task.description}</p>
              </div>
            )}
            
            {task.materialUrl && (
              <a
                href={task.materialUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-xl transition-colors border border-indigo-100/50"
              >
                <ExternalLink size={14} /> Gerekli Materyale Git
              </a>
            )}
            
            {!done && (
              <div className="pt-2">
                <button
                  onClick={() => onCompleteRequest(task)}
                  disabled={completing}
                  className="flex items-center justify-center w-full sm:w-auto gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl text-sm font-bold hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-200 disabled:opacity-50 transition-all cursor-pointer"
                >
                  <CheckCircle2 size={16} />
                  {completing ? 'Hazırlanıyor...' : 'Görevi Teslim Et'}
                </button>
              </div>
            )}

            {/* Display Submissions if done */}
            {done && (
              <div className="mt-4 space-y-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-px bg-slate-100 flex-1" />
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Teslimat & Değerlendirme Özeti</span>
                  <div className="h-px bg-slate-100 flex-1" />
                </div>
                
                {loadingSubmissions ? (
                  <p className="text-xs text-slate-400 text-center py-2 animate-pulse font-medium">Yükleniyor...</p>
                ) : submissions.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-2 font-medium">Bu görev için teslim kaydı bulunamadı (Eski görev olabilir).</p>
                ) : (
                  submissions.map(sub => (
                    <div key={sub.id} className="space-y-3">
                      {/* Parent Note */}
                      {(sub.parentNote || sub.evidenceUrl) && (
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 relative">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Sizin Notunuz</p>
                          {sub.parentNote && <p className="text-xs font-medium text-slate-700 mb-2">{sub.parentNote}</p>}
                          {sub.evidenceUrl && (
                            <a href={sub.evidenceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-500 hover:text-indigo-700 bg-indigo-50/50 px-2 py-1 rounded-lg">
                              <LinkIcon size={10} /> Eklenmiş Kanıt/Video
                            </a>
                          )}
                        </div>
                      )}
                      
                      {/* Expert Feedback */}
                      {sub.expertReviewed ? (
                        <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100 relative">
                          <div className="absolute top-4 right-4 text-emerald-200">
                            <MessageCircle size={24} />
                          </div>
                          <p className="text-[10px] font-black text-emerald-600 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                            <CheckCircle2 size={12} /> UZMAN DEĞERLENDİRMESİ
                          </p>
                          <p className="text-sm font-medium text-emerald-900 leading-relaxed relative z-10">
                            {sub.expertFeedback || 'Uzman onayladı ama not bırakmadı.'}
                          </p>
                        </div>
                      ) : (
                        <div className="bg-amber-50/50 p-3 rounded-2xl border border-amber-100/50 flex items-center gap-2">
                          <Clock size={14} className="text-amber-500" />
                          <p className="text-xs font-bold text-amber-700">Uzman Değerlendirmesi Bekleniyor...</p>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function TasksPage() {
  return <TasksCore />;
}

function TasksCore() {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');
  
  // Modal State
  const [activeTaskForSubmit, setActiveTaskForSubmit] = useState<ExpertTask | null>(null);
  const [isSubmittingTask, setIsSubmittingTask] = useState(false);

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['my-tasks', user?.id],
    queryFn: () => patientService.getMyTasks(),
    enabled: !!user,
  });

  const submitMut = useMutation({
    mutationFn: ({ task, note, evidenceUrl }: { task: ExpertTask; note: string; evidenceUrl: string }) => {
      if (!user?.id) return Promise.reject(new Error('Kullanıcı bulunamadı.'));
      return patientService.submitTask(task.id, user.id, note, evidenceUrl);
    },
    onMutate: () => setIsSubmittingTask(true),
    onSuccess: () => {
      toast.success('Görev başarıyla uzmanınıza teslim edildi!');
      setActiveTaskForSubmit(null);
    },
    onError: () => {
      toast.error('Görev teslim edilemedi. Lütfen tekrar deneyin.');
    },
    onSettled: () => {
      setIsSubmittingTask(false);
      qc.invalidateQueries({ queryKey: ['my-tasks', user?.id] });
    },
  });

  const pending   = tasks.filter(t => t.status === 'PENDING').length;
  const completed = tasks.filter(t => t.status === 'COMPLETED').length;
  const overdue   = tasks.filter(t => t.status === 'PENDING' && isOverdue(t.dueDate)).length;

  const sortedTasks = useMemo(() => {
    const pendingList = tasks
      .filter(t => t.status === 'PENDING')
      .sort((a, b) => {
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      });
    const doneList = tasks.filter(t => t.status === 'COMPLETED');
    return [...pendingList, ...doneList];
  }, [tasks]);

  const displayed = sortedTasks.filter(t => {
    if (filter === 'pending')   return t.status === 'PENDING';
    if (filter === 'completed') return t.status === 'COMPLETED';
    return true;
  });

  const progressPct = tasks.length > 0 ? Math.round((completed / tasks.length) * 100) : 0;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8 animate-in fade-in duration-500 pb-20">
      <PageOnboarding
        pageId="tasks_premium"
        title="Uzmanın Verdiği Ödevler"
        description="Uzmanınızın size verdiği çalışmalar ve ödevler burada görünür. Tamamladıkça işaretleyebilirsiniz."
        steps={[
          { icon: <ClipboardCheck size={20} />, title: "Ödevlere Bakın", description: "Her ödevin ne yapmanız gerektiğini açıkça yazar. Tıklayarak detayları görebilirsiniz." },
          { icon: <CheckCircle2 size={20} />, title: "Tamamlayıp Bildirin", description: "Ödevi yaptıktan sonra 'Tamamlandı' deyin. İsterseniz uzmanınıza kısa bir not da bırakabilirsiniz." }
        ]}
      />

      {/* Header Container */}
      <div className="relative overflow-hidden rounded-[2.5rem] border border-slate-200/60 bg-gradient-to-br from-indigo-50/50 to-white p-7 sm:p-10 shadow-[0_20px_60px_rgba(15,23,42,0.03)] hover:shadow-[0_20px_60px_rgba(15,23,42,0.06)] transition-all duration-500">
        <div className="absolute -right-20 -top-20 h-64 w-64 bg-indigo-500/10 rounded-full blur-[80px] pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-[1.5rem] bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-200 shrink-0">
              <ClipboardCheck size={28} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Ödevlerim</h1>
              <p className="text-sm font-medium text-slate-500 mt-1.5">Uzmanınızın size atadığı çalışmalar</p>
            </div>
          </div>
          
          {/* Summary Mini Cards */}
          <div className="flex gap-3">
            <div className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl p-4 text-center min-w-[90px] shadow-sm">
              <p className="text-2xl font-black text-slate-800 leading-none">{pending}</p>
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mt-2">Bekleyen</p>
            </div>
            <div className="bg-emerald-50/80 backdrop-blur-sm border border-emerald-100/60 rounded-2xl p-4 text-center min-w-[90px] shadow-sm">
              <p className="text-2xl font-black text-emerald-700 leading-none">{completed}</p>
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-600/70 mt-2">Tamamlanan</p>
            </div>
          </div>
        </div>

        {/* Progress Section */}
        {tasks.length > 0 && (
          <div className="mt-8 pt-6 border-t border-slate-100 relative z-10">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="font-bold text-slate-500 uppercase tracking-widest text-[10px]">Ne Kadar Tamamlandı</span>
              <span className="font-black text-indigo-600 text-sm">{progressPct}%</span>
            </div>
            <div className="h-3 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200/50 shadow-inner">
              <div
                className="h-full bg-gradient-to-r from-indigo-400 to-indigo-600 rounded-full transition-all duration-1000 ease-out"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            {overdue > 0 && (
              <p className="text-[11px] font-black uppercase tracking-wider text-red-500 mt-3 flex items-center gap-1.5 bg-red-50 inline-flex px-3 py-1.5 rounded-lg">
                <AlertCircle size={14} /> {overdue} görevin son teslim tarihi geçmiş
              </p>
            )}
          </div>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2 p-1.5 bg-slate-100/80 backdrop-blur-md rounded-[1.5rem] shadow-inner">
        {([
          ['all',       `Tüm Görevler (${tasks.length})`],
          ['pending',   `Yapılacaklar (${pending})`],
          ['completed', `Onay & Teslim Edilenler (${completed})`],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`flex-1 min-w-[120px] py-3 rounded-xl text-sm font-bold transition-all duration-300 ${
              filter === key 
                ? 'bg-white text-indigo-600 shadow-sm border border-slate-200/50' 
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Task List */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
          <p className="text-sm font-bold text-slate-400 animate-pulse">Görevler yükleniyor...</p>
        </div>
      ) : displayed.length === 0 ? (
        <div className="text-center py-20 bg-slate-50/50 rounded-[2.5rem] border border-dashed border-slate-200 px-6">
          <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-5 shadow-inner">
            <BookOpen size={32} className="text-slate-300" />
          </div>
          <h3 className="text-lg font-extrabold text-slate-700 mb-2">
            {filter === 'all'
              ? 'Henüz uzman tarafından görev atanmamış'
              : filter === 'pending'
              ? 'Bekleyen harika bir görev bulunmuyor'
              : 'Tamamlanan görev bulunmuyor'}
          </h3>
          <p className="text-sm text-slate-500 font-medium max-w-md mx-auto leading-relaxed">
            Uzmanınız yeni ödev ve rutinler belirlediğinde burada görebilecek ve teslim edebileceksiniz.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:gap-5">
          {displayed.map(task => (
            <TaskCard
              key={task.id}
              task={task}
              onCompleteRequest={setActiveTaskForSubmit}
              completing={isSubmittingTask && activeTaskForSubmit?.id === task.id}
            />
          ))}
        </div>
      )}

      {/* Submission Modal */}
      {activeTaskForSubmit && (
        <TaskSubmissionModal
          isOpen={true}
          onClose={() => setActiveTaskForSubmit(null)}
          taskTitle={activeTaskForSubmit.title}
          isSubmitting={isSubmittingTask}
          onSubmit={(note, url) => submitMut.mutate({ task: activeTaskForSubmit, note, evidenceUrl: url })}
        />
      )}
    </div>
  );
}
