import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { patientService } from '@/services/patientService';
import { useAuthStore } from '@/store/authStore';
import { toast } from '@/store/toastStore';
import {
  ClipboardCheck, CheckCircle2, Clock, ExternalLink,
  ChevronDown, ChevronUp, BookOpen, Star, AlertCircle,
} from 'lucide-react';
import { PageOnboarding } from '@/components/ui/PageOnboarding';
import type { ExpertTask } from '@/types';

const CATEGORY_COLOR: Record<string, string> = {
  'Dil & İletişim': 'bg-blue-50 text-blue-700',
  'Sosyal Beceri':  'bg-purple-50 text-purple-700',
  'Öz Bakım':       'bg-emerald-50 text-emerald-700',
  'Motor Beceri':   'bg-orange-50 text-orange-700',
  'Akademik':       'bg-indigo-50 text-indigo-700',
};

const DIFFICULTY_LABEL: Record<string, string> = {
  EASY: 'Kolay', MEDIUM: 'Orta', HARD: 'Zor',
};
const DIFFICULTY_COLOR: Record<string, string> = {
  EASY: 'text-emerald-600', MEDIUM: 'text-amber-600', HARD: 'text-red-600',
};

// Fix 4: gecikme kontrolü
function isOverdue(dueDate?: string): boolean {
  if (!dueDate) return false;
  return new Date(dueDate) < new Date(new Date().toDateString());
}

interface TaskCardProps {
  task: ExpertTask;
  onComplete: (task: ExpertTask) => void;
  completing: boolean;
}

function TaskCard({ task, onComplete, completing }: TaskCardProps) {
  const [expanded, setExpanded] = useState(false);
  const done = task.status === 'COMPLETED';
  const overdue = !done && isOverdue(task.dueDate); // Fix 4

  const catClass = task.category
    ? (CATEGORY_COLOR[task.category] ?? 'bg-gray-100 text-gray-600')
    : 'bg-gray-100 text-gray-600';

  return (
    <div className={`bg-white rounded-2xl border transition-all ${
      done
        ? 'border-emerald-200 opacity-75'
        : overdue
        ? 'border-red-200 hover:shadow-md'
        : 'border-gray-100 hover:shadow-md'
    }`}>
      {/* Fix 4: gecikme banner */}
      {overdue && (
        <div className="flex items-center gap-2 px-4 pt-3 pb-0">
          <AlertCircle size={13} className="text-red-500 shrink-0" />
          <span className="text-xs font-semibold text-red-600">Son tarih geçti!</span>
        </div>
      )}

      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Fix 2: quick-action tamamlama butonu (her zaman görünür) */}
          <button
            onClick={() => !done && onComplete(task)}
            disabled={done || completing}
            title={done ? 'Tamamlandı' : 'Tamamlandı olarak işaretle'}
            className={`mt-0.5 shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition-all cursor-pointer ${
              done
                ? 'bg-emerald-100 cursor-default'
                : completing
                ? 'bg-gray-100 opacity-50'
                : 'bg-gray-100 hover:bg-emerald-100 hover:ring-2 hover:ring-emerald-300'
            }`}
          >
            {done
              ? <CheckCircle2 size={14} className="text-emerald-600" />
              : completing
              ? <div className="w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin" />
              : <Clock size={14} className="text-gray-400" />
            }
          </button>

          <div className="flex-1 min-w-0">
            {/* Fix 5: başlık satırı tıklanınca expand */}
            <div
              className="flex items-start justify-between gap-2 cursor-pointer"
              onClick={() => setExpanded(v => !v)}
            >
              <h3 className={`text-sm font-semibold ${done ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                {task.title}
              </h3>
              <span className="shrink-0 p-1 hover:bg-gray-50 rounded-lg transition-colors">
                {expanded
                  ? <ChevronUp size={15} className="text-gray-400" />
                  : <ChevronDown size={15} className="text-gray-400" />}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2 mt-1.5">
              {task.category && (
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${catClass}`}>
                  {task.category}
                </span>
              )}
              {task.difficulty && (
                <span className={`text-xs font-medium ${DIFFICULTY_COLOR[task.difficulty] ?? 'text-gray-500'}`}>
                  <Star size={10} className="inline mr-0.5" />
                  {DIFFICULTY_LABEL[task.difficulty] ?? task.difficulty}
                </span>
              )}
              {task.frequency && (
                <span className="text-xs text-gray-400">{task.frequency}</span>
              )}
              {task.dueDate && (
                // Fix 4: gecikmişse kırmızı renk
                <span className={`text-xs font-medium ${overdue ? 'text-red-500' : 'text-gray-400'}`}>
                  Son: {new Date(task.dueDate).toLocaleDateString('tr-TR')}
                </span>
              )}
            </div>
          </div>
        </div>

        {expanded && (
          <div className="mt-3 ml-9 space-y-2">
            {task.description && (
              <p className="text-sm text-gray-600 leading-relaxed">{task.description}</p>
            )}
            {task.materialUrl && (
              <a
                href={task.materialUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-primary-600 hover:text-primary-700 font-medium"
              >
                <ExternalLink size={12} /> Materyal Bağlantısı
              </a>
            )}
            {!done && (
              <button
                onClick={() => onComplete(task)}
                disabled={completing}
                className="mt-1 flex items-center gap-1.5 px-4 py-2 bg-emerald-500 text-white rounded-xl text-xs font-semibold hover:bg-emerald-600 disabled:opacity-50 transition-colors"
              >
                <CheckCircle2 size={13} />
                {completing ? 'Kaydediliyor...' : 'Tamamlandı Olarak İşaretle'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function TasksPage() {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [completingId, setCompletingId] = useState<string | null>(null);

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['my-tasks', user?.id],
    queryFn: () => patientService.getMyTasks(),
    enabled: !!user,
  });

  // Fix 1: onSuccess + onError toast eklendi
  // Fix 3: user!.id → user?.id ile güvenli erişim
  const submitMut = useMutation({
    mutationFn: ({ task }: { task: ExpertTask }) => {
      if (!user?.id) return Promise.reject(new Error('Kullanıcı bulunamadı.'));
      return patientService.submitTask(task.id, user.id);
    },
    onMutate: ({ task }) => setCompletingId(task.id),
    onSuccess: () => {
      toast.success('Görev tamamlandı olarak işaretlendi!');
    },
    onError: () => {
      toast.error('Görev güncellenemedi. Lütfen tekrar deneyin.');
    },
    onSettled: () => {
      setCompletingId(null);
      qc.invalidateQueries({ queryKey: ['my-tasks', user?.id] });
    },
  });

  const pending   = tasks.filter(t => t.status === 'PENDING').length;
  const completed = tasks.filter(t => t.status === 'COMPLETED').length;
  const overdue   = tasks.filter(t => t.status === 'PENDING' && isOverdue(t.dueDate)).length;

  // Fix 8: son tarihe göre sırala (gecikmişler önce, sonra yakın tarih)
  const sortedTasks = useMemo(() => {
    const pending = tasks
      .filter(t => t.status === 'PENDING')
      .sort((a, b) => {
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      });
    const done = tasks.filter(t => t.status === 'COMPLETED');
    return [...pending, ...done];
  }, [tasks]);

  const displayed = sortedTasks.filter(t => {
    if (filter === 'pending')   return t.status === 'PENDING';
    if (filter === 'completed') return t.status === 'COMPLETED';
    return true;
  });

  // Fix 7: tamamlanma yüzdesi
  const progressPct = tasks.length > 0 ? Math.round((completed / tasks.length) * 100) : 0;

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      <PageOnboarding
        pageId="tasks"
        title="Ev Ödevi Paneline Hoş Geldiniz"
        description="Uzmanınız tarafından atanan geliştirici etkinlikleri buradan takip edin."
        steps={[
          { icon: <ClipboardCheck size={20} />, title: "Görevleri Görüntüleyin", description: "Çocuğunuzun gelişimi için önerilen aktivite ve materyalleri detaylıca inceleyin." },
          { icon: <CheckCircle2 size={20} />, title: "Tamamlandı Olarak İşaretleyin", description: "Aktiviteyi uyguladıktan sonra işaretleyerek uzmanın gelişim takibi yapmasını sağlayın." }
        ]}
      />

      {/* header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg">
          <ClipboardCheck size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Ev Ödevi Paneli</h1>
          <p className="text-xs text-gray-500">Uzman tarafından atanan görevler</p>
        </div>
      </div>

      {/* summary bar */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {[
          { label: 'Toplam',     value: tasks.length, color: 'text-gray-700',    bg: 'bg-gray-50'    },
          { label: 'Bekleyen',   value: pending,      color: 'text-amber-700',   bg: 'bg-amber-50'   },
          { label: 'Tamamlanan', value: completed,    color: 'text-emerald-700', bg: 'bg-emerald-50' },
        ].map(({ label, value, color, bg }) => (
          <div key={label} className={`${bg} rounded-2xl p-3 text-center`}>
            <p className={`text-xl font-bold ${color}`}>{value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Fix 7: tamamlanma progress bar */}
      {tasks.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span className="font-medium">Genel İlerleme</span>
            <span className="font-bold text-emerald-600">{progressPct}%</span>
          </div>
          <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          {overdue > 0 && (
            <p className="text-xs text-red-500 font-medium flex items-center gap-1">
              <AlertCircle size={11} /> {overdue} görevin son tarihi geçmiş
            </p>
          )}
        </div>
      )}

      {/* Fix 6: filter tab'larında görev sayısı */}
      <div className="flex gap-1 bg-gray-100 rounded-2xl p-1">
        {([
          ['all',       `Tümü (${tasks.length})`],
          ['pending',   `Bekleyen (${pending})`],
          ['completed', `Tamamlanan (${completed})`],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              filter === key ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* task list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : displayed.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <BookOpen size={40} className="mx-auto mb-3 opacity-40" />
          <p className="text-sm">
            {filter === 'all'
              ? 'Henüz uzman tarafından görev atanmamış.'
              : filter === 'pending'
              ? 'Bekleyen görev bulunmuyor.'
              : 'Tamamlanan görev bulunmuyor.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayed.map(task => (
            <TaskCard
              key={task.id}
              task={task}
              onComplete={t => submitMut.mutate({ task: t })}
              completing={completingId === task.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}
