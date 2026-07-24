import { useState } from 'react';
import {
  Sparkles,
  CheckCircle2,
  Upload,
  Paperclip,
  Lightbulb,
  Loader2,
  ChevronRight,
  ChevronLeft,
  Trophy,
  Target,
  RefreshCw,
} from 'lucide-react';
import { uploadService } from '@/services/uploadService';
import { toast } from '@/store/toastStore';
import type { ExpertTask } from '@/types';

interface DailyExerciseWizardProps {
  tasks: ExpertTask[];
  onCompleteTask: (taskId: string, outcome: 'EASY' | 'SUPPORTED' | 'HARD', note?: string, evidenceUrl?: string) => Promise<void>;
  loading?: boolean;
}

const LEVEL_STAGES = [
  { stage: 0, label: 'Tohum', emoji: '🌱', desc: 'Yeni bir yolculuk başlıyor' },
  { stage: 1, label: 'Filiz', emoji: '🌿', desc: 'Farkındalık ve alışma evresi' },
  { stage: 2, label: 'Çiçek', emoji: '🌸', desc: 'Birlikte düzenli pratik yapılıyor' },
  { stage: 3, label: 'Ağaç', emoji: '🌳', desc: 'Harika! Beceri tam bağımsızlaştı' },
];

export function DailyExerciseWizard({ tasks, onCompleteTask }: DailyExerciseWizardProps) {
  const [activeTaskIndex, setActiveTaskIndex] = useState(0);
  const [outcome, setOutcome] = useState<'EASY' | 'SUPPORTED' | 'HARD' | null>(null);
  const [parentNote, setParentNote] = useState('');
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [aiTipOpen, setAiTipOpen] = useState(false);

  const activeTask = tasks[activeTaskIndex] as ExpertTask | undefined;

  const handleFileUpload = async (file: File) => {
    setUploading(true);
    try {
      const url = await uploadService.upload(file, 'AUTHENTICATED');
      setEvidenceUrl(url);
      toast.success('Fotoğraf / Görsel başarıyla eklendi 🎉');
    } catch {
      toast.error('Görsel yüklenirken bir hata oluştu.');
    } finally {
      setUploading(false);
    }
  };

  const handleSelectOutcome = (type: 'EASY' | 'SUPPORTED' | 'HARD') => {
    setOutcome(type);
    if (type === 'HARD') {
      setAiTipOpen(true);
    } else {
      setAiTipOpen(false);
    }
  };

  const handleSubmitCurrentTask = async () => {
    if (!activeTask || !outcome) return;
    setSubmitting(true);
    try {
      await onCompleteTask(activeTask.id, outcome, parentNote, evidenceUrl);
      toast.success('Tebrikler! Günlük egzersiz tamamlandı 🎉');
      setOutcome(null);
      setParentNote('');
      setEvidenceUrl('');
      setAiTipOpen(false);
      if (activeTaskIndex < tasks.length - 1) {
        setActiveTaskIndex(prev => prev + 1);
      }
    } catch {
      toast.error('İşlem tamamlanamadı.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!tasks || tasks.length === 0) {
    return (
      <div className="bg-gradient-to-br from-indigo-50/60 via-purple-50/40 to-pink-50/30 rounded-[2.5rem] p-8 border border-indigo-100/80 text-center space-y-4 shadow-sm">
        <div className="w-16 h-16 rounded-3xl bg-white shadow-md shadow-indigo-100 flex items-center justify-center mx-auto text-indigo-500">
          <Trophy size={32} />
        </div>
        <div className="max-w-md mx-auto space-y-1.5">
          <h3 className="text-xl font-extrabold text-slate-900">Harika İş! Bugünün Tüm Egzersizleri Tamam</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Çocuğunuzla geçirdiğiniz her nitelikli dakika onun gelişimine büyük bir katkı sağlıyor. Yeni görevler atandığında burada görünecektir.
          </p>
        </div>
      </div>
    );
  }

  const completedCount = tasks.filter(t => t.status === 'COMPLETED').length;
  const progressPercent = Math.round((completedCount / tasks.length) * 100);

  let currentStage = 0;
  if (progressPercent >= 75) currentStage = 3;
  else if (progressPercent >= 50) currentStage = 2;
  else if (progressPercent >= 25) currentStage = 1;

  const stageMeta = LEVEL_STAGES[currentStage];

  return (
    <div className="space-y-6 max-w-4xl mx-auto">

      {/* ── Header: 3-Step Daily Journey Banner ── */}
      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 rounded-[2.5rem] p-6 sm:p-8 text-white shadow-xl shadow-indigo-200/50 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-bold text-indigo-100">
              <Sparkles size={14} className="text-amber-300 animate-pulse" />
              <span>Günlük Gelişim Akışı</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight">Bugünün Egzersiz Rehberi</h2>
            <p className="text-xs sm:text-sm text-indigo-100 max-w-lg leading-relaxed">
              Çocuğunuzla adımları takip ederek pratik yapın. Tamamlayınca aşağıdaki emojiye dokunmanız yeterli!
            </p>
          </div>

          {/* Progress Badge */}
          <div className="bg-white/15 backdrop-blur-md rounded-2xl p-4 border border-white/20 text-center shrink-0 min-w-[140px]">
            <span className="text-3xl">{stageMeta.emoji}</span>
            <p className="text-sm font-extrabold mt-1">{stageMeta.label} Seviyesi</p>
            <p className="text-[10px] text-indigo-100">{completedCount} / {tasks.length} Egzersiz Tamamlandı</p>
          </div>
        </div>
      </div>

      {/* ── Egzersiz Kartı (Active Task Card) ── */}
      {activeTask && (
        <div className="bg-white rounded-[2.5rem] border border-slate-200/80 shadow-xl shadow-slate-100/80 p-6 sm:p-9 space-y-6 transition-all duration-300">
          
          {/* Card Step Header */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-5 flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-sm">
                {activeTaskIndex + 1}/{tasks.length}
              </div>
              <div>
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-indigo-500">
                  {activeTask.category || 'Gelişim Egzersizi'}
                </span>
                <h3 className="text-xl font-black text-slate-900">{activeTask.title}</h3>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                disabled={activeTaskIndex === 0}
                onClick={() => setActiveTaskIndex(prev => prev - 1)}
                className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 disabled:opacity-30 cursor-pointer transition-colors"
                title="Önceki Egzersiz"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                disabled={activeTaskIndex === tasks.length - 1}
                onClick={() => setActiveTaskIndex(prev => prev + 1)}
                className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 disabled:opacity-30 cursor-pointer transition-colors"
                title="Sonraki Egzersiz"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>

          {/* 1. ADIM: Egzersiz Açıklaması & Rehber Adımlar */}
          <div className="space-y-3 bg-slate-50/70 p-5 rounded-2xl border border-slate-100">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Target size={15} className="text-indigo-500" /> Nasıl Uygulanır? (Adım Adım)
            </h4>
            <p className="text-sm font-medium text-slate-700 leading-relaxed whitespace-pre-line">
              {activeTask.description || 'Çocuğunuzla sakin bir ortamda bu çalışmayı 5-10 dakika deneyin.'}
            </p>
            {activeTask.frequency && (
              <p className="text-xs font-bold text-indigo-600 flex items-center gap-1 pt-1">
                <RefreshCw size={12} /> Sıklık: {activeTask.frequency}
              </p>
            )}
          </div>

          {/* 2. ADIM: Sonuç Bildirimi (3 Emoji Button) */}
          <div className="space-y-3">
            <label className="text-xs font-black uppercase tracking-wider text-slate-600 block">
              Bugün Bu Egzersiz Nasıl Geçti?
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => handleSelectOutcome('EASY')}
                className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between ${
                  outcome === 'EASY'
                    ? 'border-emerald-500 bg-emerald-50/80 shadow-md shadow-emerald-100 ring-2 ring-emerald-200'
                    : 'border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/30'
                }`}
              >
                <span className="text-2xl mb-2">🎉</span>
                <div>
                  <p className="font-extrabold text-slate-900 text-sm">Kolayca Yaptık</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Çocuğum rahatça başardı</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleSelectOutcome('SUPPORTED')}
                className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between ${
                  outcome === 'SUPPORTED'
                    ? 'border-amber-500 bg-amber-50/80 shadow-md shadow-amber-100 ring-2 ring-amber-200'
                    : 'border-slate-200 hover:border-amber-300 hover:bg-amber-50/30'
                }`}
              >
                <span className="text-2xl mb-2">🙂</span>
                <div>
                  <p className="font-extrabold text-slate-900 text-sm">Destekle Yaptık</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Biraz ipucuyla tamamladık</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleSelectOutcome('HARD')}
                className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between ${
                  outcome === 'HARD'
                    ? 'border-rose-500 bg-rose-50/80 shadow-md shadow-rose-100 ring-2 ring-rose-200'
                    : 'border-slate-200 hover:border-rose-300 hover:bg-rose-50/30'
                }`}
              >
                <span className="text-2xl mb-2">💬</span>
                <div>
                  <p className="font-extrabold text-slate-900 text-sm">Bugün Zorlandık</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Henüz tam hazır değildik</p>
                </div>
              </button>
            </div>
          </div>

          {/* AutiBot AI İpucu Kartı (Zorlandık Seçildiğinde Açılır) */}
          {aiTipOpen && (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/80 text-amber-950 animate-in fade-in duration-300 space-y-2">
              <div className="flex items-center gap-2">
                <Lightbulb size={18} className="text-amber-600 shrink-0" />
                <h5 className="font-bold text-xs uppercase tracking-wider text-amber-900">AutiBot İpucu</h5>
              </div>
              <p className="text-xs leading-relaxed text-amber-900/90">
                Hiç sorun değil! Otizm spektrumundaki çocukların bazı günlerde motivasyonu değişebilir. Egzersizi küçük parçalara bölüp yarın 2 dakikalık daha kısa bir süre ile tekrar deneyebilirsiniz. Uzmanınıza not bırakabilirsiniz.
              </p>
            </div>
          )}

          {/* 3. ADIM: İsteğe Bağlı Not ve Görsel Ekleme */}
          <div className="space-y-3 pt-2">
            <div>
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1.5">
                Uzmanınıza Bırakmak İstediğiniz Not (Opsiyonel)
              </label>
              <textarea
                value={parentNote}
                onChange={e => setParentNote(e.target.value)}
                placeholder="Örn: Çalışırken çok keyif aldı veya dikkati çabuk dağıldı..."
                className="w-full rounded-2xl border border-slate-200 p-3 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all resize-y"
                rows={2}
              />
            </div>

            {/* Dosya / Fotoğraf Yükleme */}
            <div className="flex items-center gap-3">
              <div className="relative">
                <input
                  type="file"
                  accept="image/*"
                  onChange={e => {
                    const f = e.target.files?.[0];
                    if (f) handleFileUpload(f);
                  }}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
                <button
                  type="button"
                  disabled={uploading}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white text-xs font-bold text-slate-700 transition-colors cursor-pointer"
                >
                  {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} className="text-indigo-500" />}
                  <span>{evidenceUrl ? 'Fotoğraf Değiştir' : 'Fotoğraf / Çalışma Anı Ekle'}</span>
                </button>
              </div>

              {evidenceUrl && (
                <span className="text-xs font-bold text-emerald-600 flex items-center gap-1 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                  <Paperclip size={13} /> Fotoğraf Eklendi
                </span>
              )}
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <button
              onClick={handleSubmitCurrentTask}
              disabled={!outcome || submitting}
              className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-extrabold text-sm shadow-lg shadow-indigo-200/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              {submitting ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={18} />}
              <span>Egzersizi Kaydet ve Tamamla</span>
            </button>
          </div>

        </div>
      )}

      {/* ── İlerleme Ağacı ve Rozetler (Progress Tree) ── */}
      <div className="bg-white rounded-[2.5rem] border border-slate-200/80 p-6 sm:p-8 space-y-4">
        <h4 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
          <Trophy size={18} className="text-amber-500" /> Çocuğunuzun İlerleme Ağacı
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {LEVEL_STAGES.map((stg) => {
            const isActive = currentStage >= stg.stage;
            return (
              <div
                key={stg.stage}
                className={`p-4 rounded-2xl border text-center transition-all ${
                  isActive
                    ? 'bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-200 shadow-sm'
                    : 'bg-slate-50/50 border-slate-100 opacity-50'
                }`}
              >
                <span className="text-3xl block mb-1">{stg.emoji}</span>
                <p className="font-extrabold text-xs text-slate-800">{stg.label}</p>
                <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">{stg.desc}</p>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
