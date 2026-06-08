import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { socialStoryService } from '@/services/socialStoryService';
import { childService } from '@/services/childService';
import { useAuthStore } from '@/store/authStore';
import { toast } from '@/store/toastStore';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import {
  BookOpen, Plus, Globe, Lock, Eye, Trash2, Edit3, ChevronRight,
  ChevronLeft, X, Check, Sparkles, Play, Pause, Search, AArrowUp, AArrowDown,
  Image, AlertCircle, RotateCcw, Users, Layers, FilterX, FileText
} from 'lucide-react';
import type { SocialStory, StoryPage } from '@/types';
import { PageOnboarding } from '@/components/ui/PageOnboarding';
import { formatRelative } from '@/utils/date';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';

const CATEGORIES = ['Günlük Yaşam', 'Sosyal Beceri', 'Duygu Yönetimi', 'Okul', 'Aile', 'Diğer'];

function StoryViewer({ story, onClose }: { story: SocialStory; onClose: () => void }) {
  const [page, setPage] = useState(0);
  const pages = story.pages || [];
  const current = pages[page];
  const { user } = useAuthStore();
  const [commentText, setCommentText] = useState('');
  const [autoPlay, setAutoPlay] = useState(false);
  const [fontSize, setFontSize] = useState<'sm' | 'md' | 'lg'>('md');
  const autoPlayRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (autoPlay && pages.length > 1) {
      autoPlayRef.current = setInterval(() => {
        setPage(p => {
          if (p >= pages.length - 1) { setAutoPlay(false); return p; }
          return p + 1;
        });
      }, 3500);
    }
    return () => { if (autoPlayRef.current) clearInterval(autoPlayRef.current); };
  }, [autoPlay, pages.length]);

  const fontClass = fontSize === 'sm' ? 'text-base' : fontSize === 'lg' ? 'text-2xl' : 'text-lg';

  const { data: comments = [], refetch } = useQuery({
    queryKey: ['social-story-comments', story.id],
    queryFn: () => socialStoryService.getComments(story.id),
  });

  const addCommentMut = useMutation({
    mutationFn: (content: string) => socialStoryService.addComment(story.id, content),
    onSuccess: () => { setCommentText(''); refetch(); },
  });

  const deleteCommentMut = useMutation({
    mutationFn: (id: string) => socialStoryService.deleteComment(id),
    onSuccess: () => refetch(),
  });

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <h2 className="text-base font-bold text-gray-800 truncate pr-4">{story.title}</h2>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setFontSize(s => s === 'sm' ? 'md' : s === 'md' ? 'lg' : 'sm')}
              className="p-1.5 hover:bg-gray-100 rounded-xl transition-colors text-gray-500"
              title="Yazı boyutu"
            >
              {fontSize === 'lg' ? <AArrowDown size={16} /> : <AArrowUp size={16} />}
            </button>
            {pages.length > 1 && (
              <button
                onClick={() => setAutoPlay(v => !v)}
                className={`p-1.5 rounded-xl transition-colors ${autoPlay ? 'bg-primary-100 text-primary-600' : 'hover:bg-gray-100 text-gray-500'}`}
                title="Otomatik oynat"
              >
                {autoPlay ? <Pause size={16} /> : <Play size={16} />}
              </button>
            )}
            <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-xl transition-colors ml-1">
              <X size={18} className="text-gray-500" />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto flex-1 p-6 flex flex-col">
          {/* page content */}
          <div className="flex-1 flex flex-col items-center justify-center gap-4 min-h-[250px]">
            {current?.imageUrl && (
              <img
                src={current.imageUrl}
                alt={`Sayfa ${page + 1}`}
                className="max-h-64 rounded-2xl object-contain shadow-sm border border-gray-100"
              />
            )}
            {current?.text && (
              <p className={`text-center text-gray-700 ${fontClass} leading-relaxed font-medium transition-all`}>{current.text}</p>
            )}
            {pages.length === 0 && (
              <p className="text-gray-400 text-sm">Bu hikayede henüz sayfa yok.</p>
            )}
          </div>

          {/* comments section (only show if public or owner) */}
          {(story.isPublic || story.authorId === user?.id) && (
            <div className="mt-8 pt-6 border-t border-gray-100">
              <h3 className="text-sm font-bold text-gray-800 mb-4">Mesajlar ve Yorumlar ({comments.length})</h3>
              
              <div className="space-y-4 mb-4">
                {comments.map(c => (
                  <div key={c.id} className="flex gap-3 text-sm">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-100 to-indigo-100 flex items-center justify-center shrink-0">
                      <span className="font-bold text-purple-700 text-xs">{c.authorName.charAt(0)}</span>
                    </div>
                    <div className="flex-1 bg-gray-50 rounded-2xl rounded-tl-none p-3 relative group">
                      <p className="font-semibold text-gray-800 text-xs mb-0.5">{c.authorName}</p>
                      <p className="text-gray-700">{c.content}</p>
                      <span className="text-[10px] text-gray-400 block mt-1">{formatRelative(c.createdAt)}</span>
                      
                      {c.authorId === user?.id && (
                        <button
                          onClick={() => deleteCommentMut.mutate(c.id)}
                          className="absolute top-2 right-2 p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {comments.length === 0 && <p className="text-xs text-center text-gray-400">Henüz yorum yapılmamış. İlk yorumu siz yazın!</p>}
              </div>

              {/* add comment */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  placeholder="Bir mesaj yazın..."
                  className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
                  onKeyDown={e => {
                    if (e.key === 'Enter' && commentText.trim()) addCommentMut.mutate(commentText);
                  }}
                />
                <button
                  onClick={() => addCommentMut.mutate(commentText)}
                  disabled={!commentText.trim() || addCommentMut.isPending}
                  className="px-4 py-2 bg-primary-600 text-white rounded-xl text-sm font-semibold hover:bg-primary-700 disabled:opacity-50 transition-colors"
                >
                  Gönder
                </button>
              </div>
            </div>
          )}
        </div>

        {/* nav */}
        {pages.length > 0 && (
          <div className="flex items-center justify-between px-5 py-4 border-t border-gray-100 shrink-0 bg-gray-50">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="flex items-center gap-1 px-4 py-2 rounded-xl text-sm font-semibold text-gray-700 hover:bg-white border border-transparent hover:border-gray-200 hover:shadow-sm disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <ChevronLeft size={16} /> Önceki
            </button>
            <div className="flex gap-1.5">
              {pages.map((_, i) => (
                <div key={i} className={`h-1.5 rounded-full transition-all ${page === i ? 'w-4 bg-primary-500' : 'w-1.5 bg-gray-300'}`} />
              ))}
            </div>
            <button
              onClick={() => setPage(p => Math.min(pages.length - 1, p + 1))}
              disabled={page === pages.length - 1}
              className="flex items-center gap-1 px-4 py-2 rounded-xl text-sm font-semibold text-gray-700 hover:bg-white border border-transparent hover:border-gray-200 hover:shadow-sm disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              Sonraki <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function StoryEditor({ initial, onSave, onClose, children, saving }: {
  initial?: Partial<SocialStory>;
  onSave: (data: Partial<SocialStory>) => void;
  onClose: () => void;
  children: { id: string; name: string }[];
  saving?: boolean;
}) {
  const [title, setTitle] = useState(initial?.title || '');
  const [category, setCategory] = useState(initial?.category || CATEGORIES[0]);
  const [description, setDescription] = useState(initial?.description || '');
  const [isPublic, setIsPublic] = useState(initial?.isPublic ?? false);
  const [childId, setChildId] = useState(initial?.childId || '');
  const [pages, setPages] = useState<StoryPage[]>(initial?.pages || [{ order: 1, text: '' }]);

  const addPage = () => setPages(ps => [...ps, { order: ps.length + 1, text: '' }]);
  const removePage = (i: number) => setPages(ps => ps.filter((_, idx) => idx !== i).map((p, idx) => ({ ...p, order: idx + 1 })));
  const updatePage = (i: number, text: string) => setPages(ps => ps.map((p, idx) => idx === i ? { ...p, text } : p));
  const updatePageImage = (i: number, imageUrl: string) => setPages(ps => ps.map((p, idx) => idx === i ? { ...p, imageUrl } : p));

  const handleSave = () => {
    const cleanPages = pages
      .map((page) => ({
        ...page,
        text: page.text.trim(),
        imageUrl: page.imageUrl?.trim() || undefined,
      }))
      .filter((page) => page.text || page.imageUrl)
      .map((page, index) => ({ ...page, order: index + 1 }));

    if (!title.trim()) {
      toast.error('Hikaye başlığı gerekli.');
      return;
    }

    if (cleanPages.length === 0) {
      toast.error('En az bir sayfaya metin veya resim ekleyin.');
      return;
    }

    onSave({
      title: title.trim(),
      category,
      description: description.trim(),
      isPublic,
      childId: childId || undefined,
      pages: cleanPages,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <h2 className="text-base font-bold text-gray-800">
            {initial?.id ? 'Hikayeyi Düzenle' : 'Yeni Hikaye Oluştur'}
          </h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-xl transition-colors">
            <X size={18} className="text-gray-500" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Hikaye Başlığı *</label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Örn: Okula İlk Gün"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Kategori</label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
              >
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Çocuk (opsiyonel)</label>
              <select
                value={childId}
                onChange={e => setChildId(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
              >
                <option value="">Seçiniz</option>
                {children.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Açıklama</label>
            <input
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Kısa açıklama..."
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <div
              onClick={() => setIsPublic(v => !v)}
              className={`w-10 h-5.5 rounded-full transition-colors relative ${isPublic ? 'bg-primary-500' : 'bg-gray-200'}`}
            >
              <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${isPublic ? 'left-5' : 'left-0.5'}`} />
            </div>
            <span className="text-sm text-gray-700">Herkese açık yayımla</span>
          </label>

          {/* pages editor */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-gray-600">Sayfalar ({pages.length})</label>
              <button
                onClick={addPage}
                className="text-xs text-primary-600 font-medium flex items-center gap-1 hover:text-primary-700"
              >
                <Plus size={12} /> Sayfa Ekle
              </button>
            </div>
            <div className="space-y-3">
              {pages.map((p, i) => (
                <div key={i} className="border border-gray-100 rounded-2xl p-3 bg-gray-50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-500">Sayfa {i + 1}</span>
                    {pages.length > 1 && (
                      <button
                        onClick={() => removePage(i)}
                        className="p-1 hover:bg-red-50 rounded-lg text-gray-300 hover:text-red-400 transition-colors"
                      >
                        <X size={13} />
                      </button>
                    )}
                  </div>
                  <textarea
                    value={p.text}
                    onChange={e => updatePage(i, e.target.value)}
                    rows={2}
                    placeholder={`Sayfa ${i + 1} metni...`}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 resize-none bg-white"
                  />
                  <div className="flex items-center gap-2">
                    <Image size={12} className="text-gray-400 shrink-0" />
                    <input
                      type="url"
                      value={p.imageUrl || ''}
                      onChange={e => updatePageImage(i, e.target.value)}
                      placeholder="Resim URL (opsiyonel)"
                      className="flex-1 border border-gray-200 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary-300 bg-white"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-3 px-5 py-4 border-t border-gray-100 shrink-0">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            İptal
          </button>
          <button
            onClick={handleSave}
            disabled={!title.trim() || saving}
            className="flex-1 py-2.5 bg-primary-600 text-white rounded-xl text-sm font-semibold hover:bg-primary-700 disabled:opacity-40 transition-colors flex items-center justify-center gap-2"
          >
            <Check size={16} /> {saving ? 'Kaydediliyor...' : 'Kaydet'}
          </button>
        </div>
      </div>
    </div>
  );
}

function StoryCard({ story, onView, onEdit, onDelete, isOwner }: {
  story: SocialStory;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  isOwner: boolean;
}) {
  const thumbnail = story.pages?.find(p => p.imageUrl)?.imageUrl;
  const pageCount = story.pages?.length || 0;

  return (
    <div
      className="group flex h-full cursor-pointer flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary-200 hover:shadow-md"
      onClick={onView}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onView();
        }
      }}
      role="button"
      tabIndex={0}
    >
      {thumbnail ? (
        <div className="h-36 overflow-hidden bg-slate-50">
          <img src={thumbnail} alt={story.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        </div>
      ) : (
        <div className="flex h-36 items-center justify-center bg-gradient-to-br from-indigo-50 via-sky-50 to-emerald-50">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-indigo-400 shadow-sm ring-1 ring-indigo-100">
            <BookOpen size={28} />
          </div>
        </div>
      )}

      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-gray-800 truncate">{story.title}</h3>
            {story.description && (
              <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{story.description}</p>
            )}
          </div>
          <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${story.isPublic ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-500'}`}>
            {story.isPublic ? <><Globe size={10} className="inline mr-1" />Açık</> : <><Lock size={10} className="inline mr-1" />Özel</>}
          </span>
        </div>

        <div className="flex items-center gap-3 text-xs text-gray-400 mb-3">
          {story.category && <span className="bg-primary-50 text-primary-600 px-2 py-0.5 rounded-full">{story.category}</span>}
          <span>{pageCount} sayfa</span>
          <span className="flex items-center gap-0.5"><Eye size={10} /> {story.viewCount}</span>
        </div>

        <div className="mt-auto flex items-center gap-2" onClick={e => e.stopPropagation()}>
          <button
            type="button"
            onClick={onView}
            className="flex-1 py-2 bg-primary-50 text-primary-700 rounded-xl text-xs font-semibold hover:bg-primary-100 transition-colors flex items-center justify-center gap-1"
          >
            <BookOpen size={13} /> Oku
          </button>
          {isOwner && (
            <>
              <button
                type="button"
                onClick={onEdit}
                aria-label="Hikayeyi düzenle"
                className="p-2 hover:bg-gray-50 rounded-xl text-gray-400 hover:text-gray-600 transition-colors"
              >
                <Edit3 size={15} />
              </button>
              <button
                type="button"
                onClick={onDelete}
                aria-label="Hikayeyi sil"
                className="p-2 hover:bg-red-50 rounded-xl text-gray-400 hover:text-red-500 transition-colors"
              >
                <Trash2 size={15} />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function StoryGridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-0">
          <Skeleton className="h-36 rounded-none" />
          <div className="space-y-3 p-4">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-2/3" />
            <div className="flex gap-2 pt-2">
              <Skeleton className="h-9 flex-1 rounded-xl" />
              <Skeleton className="h-9 w-9 rounded-xl" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

interface StoryWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: { id: string; name: string }[];
  onSuccess: () => void;
}

const SCENARIOS = [
  {
    id: 'HAIRCUT',
    title: 'Berber Günü 💇‍♂️',
    category: 'Günlük Yaşam',
    description: 'Tıraş makinesi sesleri, saç kesimi ve koltukta sakin kalma rutini.',
    icon: '💇‍♂️',
    color: 'from-blue-500 to-indigo-500',
  },
  {
    id: 'DENTIST',
    title: 'Diş Hekimi Muayenesi 🦷',
    category: 'Günlük Yaşam',
    description: 'Parlak ışıklar, diş aletleri ve hekimle tanışma süreci.',
    icon: '🦷',
    color: 'from-teal-500 to-emerald-500',
  },
  {
    id: 'SHARING',
    title: 'Oyuncak Paylaşımı 🧸',
    category: 'Sosyal Beceri',
    description: 'Arkadaşlarla sıra bekleme, paylaşma ve sosyal etkileşim.',
    icon: '🧸',
    color: 'from-purple-500 to-pink-500',
  },
  {
    id: 'SCHOOL',
    title: 'Okulda İlk Gün 🎒',
    category: 'Okul',
    description: 'Sınıf ortamı, öğretmenle tanışma ve veliden ayrılma rutini.',
    icon: '🎒',
    color: 'from-orange-500 to-red-500',
  },
  {
    id: 'VACCINE',
    title: 'Aşı ve Kan Verme 💉',
    category: 'Duygu Yönetimi',
    description: 'Hafif bir çimdik hissi, cesur duruş ve cesaret ödülü.',
    icon: '💉',
    color: 'from-pink-500 to-rose-500',
  },
  {
    id: 'SHOPPING',
    title: 'Markette Alışveriş 🛒',
    category: 'Günlük Yaşam',
    description: 'Kalabalık market ortamı, beklemek ve sırada durmak.',
    icon: '🛒',
    color: 'from-yellow-500 to-orange-500',
  },
  {
    id: 'RESTAURANT',
    title: 'Restoranda Yemek 🍽️',
    category: 'Sosyal Beceri',
    description: 'Masada oturmak, sipariş vermek ve beklemeyi öğrenmek.',
    icon: '🍽️',
    color: 'from-green-500 to-teal-500',
  },
  {
    id: 'PARK',
    title: 'Parkta Oynamak 🛝',
    category: 'Sosyal Beceri',
    description: 'Sıra beklemek, diğer çocuklarla paylaşmak ve güvende kalmak.',
    icon: '🛝',
    color: 'from-sky-500 to-blue-500',
  },
];

function StoryWizardModal({ isOpen, onClose, children, onSuccess }: StoryWizardModalProps) {
  const [step, setStep] = useState(1);
  const [selectedChildId, setSelectedChildId] = useState('');
  const [customChildName, setCustomChildName] = useState('');
  const [selectedScenarioId, setSelectedScenarioId] = useState('');
  const [specialistName, setSpecialistName] = useState('');
  const [comfortItem, setComfortItem] = useState('');
  const [parentRole, setParentRole] = useState('Annem');
  const [generating, setGenerating] = useState(false);

  if (!isOpen) return null;

  const handleNext = () => {
    if (step === 1 && !selectedChildId && !customChildName.trim()) return;
    if (step === 2 && !selectedScenarioId) return;
    setStep(s => s + 1);
  };

  const handlePrev = () => setStep(s => Math.max(1, s - 1));

  const getActiveChildName = () => {
    if (selectedChildId) {
      const child = children.find(c => c.id === selectedChildId);
      return child ? child.name : 'Çocuğum';
    }
    return customChildName.trim() || 'Çocuğum';
  };

  const handleGenerate = async () => {
    setGenerating(true);
    const childName = getActiveChildName();
    const scenario = SCENARIOS.find(s => s.id === selectedScenarioId);
    if (!scenario) return;

    const specName = specialistName.trim() || (selectedScenarioId === 'HAIRCUT' ? 'Berber Ahmet' : selectedScenarioId === 'DENTIST' ? 'Diş Hekimi Ayşe Abla' : selectedScenarioId === 'SCHOOL' ? 'Öğretmenim' : 'Hemşire');
    const comfort = comfortItem.trim() || 'en sevdiği oyuncağını';

    let pages: { order: number; text: string; imageUrl?: string }[] = [];

    if (selectedScenarioId === 'HAIRCUT') {
      pages = [
        {
          order: 1,
          text: `Bugün ${childName} saçlarını kestirmek için berbere gidiyor. ${parentRole} de onunla birlikte gidiyor. ${childName} yanına en sevdiği oyuncağı olan ${comfort}ı alabilir.`,
          imageUrl: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=400&q=80',
        },
        {
          order: 2,
          text: `${childName}, berber koltuğuna oturur. Berber ${specName}, saçlarını yumuşakça tarar. Makas veya tıraş makinesi biraz gürültü yapabilir ama bu sesler tamamen güvenlidir ve canını acıtmaz.`,
          imageUrl: 'https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=400&q=80',
        },
        {
          order: 3,
          text: `${specName}, ${childName}'in saçlarını yavaşça keserken, ${childName} ${comfort}a sarılabilir veya onu tutabilir. Kıpırdamadan beklemek saç kesimini çok daha hızlı bitirecektir.`,
          imageUrl: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=400&q=80',
        },
        {
          order: 4,
          text: `Saç kesimi bittiğinde ${childName} pırıl pırıl ve çok şık olur! ${parentRole} ve ${specName} onu tebrik eder. ${childName} kendiyle gurur duyabilir!`,
          imageUrl: 'https://images.unsplash.com/photo-1582213782179-e0d53f98f2ca?w=400&q=80',
        },
      ];
    } else if (selectedScenarioId === 'DENTIST') {
      pages = [
        {
          order: 1,
          text: `${childName} bugün dişlerinin sağlıklı kalması için diş hekimine gidiyor. ${parentRole} onunla el ele yürüyor. ${childName} ${comfort}ı yanında taşıyabilir.`,
          imageUrl: 'https://images.unsplash.com/photo-1447433589675-4adf5662007a?w=400&q=80',
        },
        {
          order: 2,
          text: `${childName} muayene koltuğuna oturur. Diş hekimi ${specName}, parlak bir ışık açarak ${childName}'in dişlerine küçük bir ayna ile bakar. Işık gözünü almasın diye güneş gözlüğü takabilir.`,
          imageUrl: 'https://images.unsplash.com/photo-1579684389782-64d84b5e901a?w=400&q=80',
        },
        {
          order: 3,
          text: `${specName}, ${childName}'in dişlerini fırçalar ve temizler. Aletlerin çıkardığı sesler dişleri parlatmak içindir. Bu esnada ${childName} ${comfort}ı kucağunda dinlendirebilir.`,
          imageUrl: 'https://images.unsplash.com/photo-1606811971618-4486d14f3f99?w=400&q=80',
        },
        {
          order: 4,
          text: `Muayene bitti! ${childName}'in dişleri tertemiz ve sağlıklı. ${specName} ona büyük bir gülümsemeyle cesaret yıldızı verir. Diş fırçalamak çok eğlenceli!`,
          imageUrl: 'https://images.unsplash.com/photo-1516627145497-ae6968895b74?w=400&q=80',
        },
      ];
    } else if (selectedScenarioId === 'SHARING') {
      pages = [
        {
          order: 1,
          text: `${childName} oyun oynamayı çok seviyor. Bugün arkadaşlarıyla birlikte oyun oynayacaklar. ${childName} yanına ${comfort}ı da alabilir.`,
          imageUrl: 'https://images.unsplash.com/photo-1596464716127-f2a82984de30?w=400&q=80',
        },
        {
          order: 2,
          text: `Bazen arkadaşı ${childName}'in oynadığı oyuncağı isteyebilir. Paylaşmak, oyuncağı tamamen vermek değildir. Sadece sıra ile oynamaktır.`,
          imageUrl: 'https://images.unsplash.com/photo-1567524804188-7a3864f88cd5?w=400&q=80',
        },
        {
          order: 3,
          text: `${childName}, "Sıram bitince sana vereceğim" diyebilir. Sırasını beklerken ${comfort} ile oynayarak zaman geçirebilir. Sıra arkadaşına geldiğinde oyuncağı ona uzatır.`,
          imageUrl: 'https://images.unsplash.com/photo-1485546246426-74dc88dec4d9?w=400&q=80',
        },
        {
          order: 4,
          text: `Arkadaşı oyuncağı alınca çok mutlu olur ve ${childName}'e teşekkür eder. Paylaşım yapmak arkadaşlıkları güçlendirir ve herkesin keyif almasını sağlar!`,
          imageUrl: 'https://images.unsplash.com/photo-1516627145497-ae6968895b74?w=400&q=80',
        },
      ];
    } else if (selectedScenarioId === 'SCHOOL') {
      pages = [
        {
          order: 1,
          text: `Bugün ${childName} için heyecanlı bir gün, çünkü okul başlıyor! ${parentRole} onu sınıf kapısına kadar götürüyor ve "İyi dersler" diyerek öpüyor. ${childName} kucağında ${comfort}ı taşıyabilir.`,
          imageUrl: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=400&q=80',
        },
        {
          order: 2,
          text: `Sınıfta öğretmen ${specName} ve yeni arkadaşlar vardır. ${specName} güler yüzle ${childName}'i karşılar. Sınıfta herkesin kendi sırası ve dolabı bulunur.`,
          imageUrl: 'https://images.unsplash.com/photo-1577896851231-70ef18881754?w=400&q=80',
        },
        {
          order: 3,
          text: `Gün boyunca boyama yapacaklar, şarkı söyleyecekler ve oyunlar oynayacaklar. ${childName} yardıma ihtiyaç duyduğunda ${specName} öğretmene sorabilir.`,
          imageUrl: 'https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?w=400&q=80',
        },
        {
          order: 4,
          text: `Okul günü bittiğinde ${parentRole} ${childName}'i almak için sınıfın kapısında bekliyor olacaktır. ${childName} okulda yaptığı güzel şeyleri ${parentRole} ile paylaşabilir!`,
          imageUrl: 'https://images.unsplash.com/photo-1516627145497-ae6968895b74?w=400&q=80',
        },
      ];
    } else if (selectedScenarioId === 'VACCINE') {
      pages = [
        {
          order: 1,
          text: `${childName} bugün daha sağlıklı ve güçlü büyümek için sağlık merkezine gidiyor. ${parentRole} da her zamanki gibi onun yanında. ${childName} ${comfort}ı kollarının arasına alabilir.`,
          imageUrl: 'https://images.unsplash.com/photo-1584515901387-a7a1a7f16cdb?w=400&q=80',
        },
        {
          order: 2,
          text: `Hemşire ${specName}, ${childName}'in kolunu alkollü pamukla siler. Bu kolunu serinletir. ${childName} bu sırada başka bir yöne bakabilir veya ${comfort}a sarılabilir.`,
          imageUrl: 'https://images.unsplash.com/photo-1579684389782-64d84b5e901a?w=400&q=80',
        },
        {
          order: 3,
          text: `İğne değdiğinde hafif bir çimdiklenme hissi olabilir. Bu his sadece birkaç saniye sürer. ${childName} burnundan derin bir nefes alıp yavaşça verebilir.`,
          imageUrl: 'https://images.unsplash.com/photo-1628771065518-0d82f1938462?w=400&q=80',
        },
        {
          order: 4,
          text: `İşte bitti! ${specName} onun koluna renkli ve şirin bir yara bandı yapıştırır. ${childName} çok cesur davrandı! ${parentRole} ve ${specName} onunla gurur duyuyor.`,
          imageUrl: 'https://images.unsplash.com/photo-1516627145497-ae6968895b74?w=400&q=80',
        },
      ];
    } else if (selectedScenarioId === 'SHOPPING') {
      pages = [
        {
          order: 1,
          text: `${childName} bugün ${parentRole} ile markete gidiyor. Market biraz kalabalık olabilir ama ${childName} ${comfort}ını yanına alabilir.`,
          imageUrl: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&q=80',
        },
        {
          order: 2,
          text: `Markette rafların arasında yürürken ${parentRole}'in elini tutmak veya arabayı itmek ${childName}'in işini kolaylaştırır. Bir şey almak istediğinde ${parentRole}'e söyleyebilir.`,
          imageUrl: 'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=400&q=80',
        },
        {
          order: 3,
          text: `Kasada sıra beklenir. Herkes sırasını bekler. ${childName} de sırasını beklerken ${comfort}ına bakabilir veya rafları inceleyebilir.`,
          imageUrl: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=400&q=80',
        },
        {
          order: 4,
          text: `Alışveriş tamamlandı! ${childName} bugün ${parentRole}'e çok yardımcı oldu. Eve dönerken ${parentRole} onu tebrik eder!`,
          imageUrl: 'https://images.unsplash.com/photo-1516627145497-ae6968895b74?w=400&q=80',
        },
      ];
    } else if (selectedScenarioId === 'RESTAURANT') {
      pages = [
        {
          order: 1,
          text: `Bugün ${childName} ailesiyle birlikte dışarıda yemek yiyecek. Restoranda masalara oturulur ve garson gelene kadar beklenir. ${childName} ${comfort}ını kucağına alabilir.`,
          imageUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&q=80',
        },
        {
          order: 2,
          text: `Garson geldiğinde menüden bir şey seçilir. ${childName} ne istediğini söyleyebilir ya da ${parentRole} sipariş verebilir. Yemek gelene kadar biraz beklemek gerekir.`,
          imageUrl: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&q=80',
        },
        {
          order: 3,
          text: `Yemek geldiğinde masada oturarak yenilir. Restoranda sessizce konuşulur, koşulmaz. ${childName} yemek yerken ${parentRole} ile güzel konuşmalar yapabilir.`,
          imageUrl: 'https://images.unsplash.com/photo-1498654896293-37aacf113fd9?w=400&q=80',
        },
        {
          order: 4,
          text: `Yemek bitti! ${childName} bugün restoranda harika davrandı. ${parentRole} onu çok sevdiğini söyler ve birlikte eve dönerler.`,
          imageUrl: 'https://images.unsplash.com/photo-1516627145497-ae6968895b74?w=400&q=80',
        },
      ];
    } else if (selectedScenarioId === 'PARK') {
      pages = [
        {
          order: 1,
          text: `${childName} bugün parka gidiyor! Parkta kaydırak, salıncak ve tırmanma aletleri vardır. ${childName} ${comfort}ını çantasına koyup ${parentRole} ile birlikte yürüyerek gider.`,
          imageUrl: 'https://images.unsplash.com/photo-1575783970733-1aaedde1db74?w=400&q=80',
        },
        {
          order: 2,
          text: `Kaydırakta veya salıncakta sıra beklemek gerekebilir. ${childName} diğer çocukların sırasını bekler, sonra kendi sırası gelir. Bu çok güzel bir kuraldır!`,
          imageUrl: 'https://images.unsplash.com/photo-1519331379826-f10be5486c6f?w=400&q=80',
        },
        {
          order: 3,
          text: `Parkta başka çocuklar da oyun oynuyor olabilir. ${childName} onlara katılabilir ya da kendi başına oynayabilir. Birinin kucağına ya da yerine çıkılmaz, itmek doğru olmaz.`,
          imageUrl: 'https://images.unsplash.com/photo-1516627145497-ae6968895b74?w=400&q=80',
        },
        {
          order: 4,
          text: `Parka gitme vakti geldiğinde ${parentRole} "Gidiyoruz" der. ${childName} oyununu tamamlar ve ${parentRole} ile birlikte parktan ayrılır. Yarın tekrar gelebilirler!`,
          imageUrl: 'https://images.unsplash.com/photo-1545558014-8692077e9b5c?w=400&q=80',
        },
      ];
    }

    try {
      await socialStoryService.create({
        title: `${childName} - ${scenario.title}`,
        category: scenario.category,
        description: scenario.description,
        isPublic: false,
        childId: selectedChildId || undefined,
        pages,
      });
      onSuccess();
    } catch {
      toast.error('Hikaye üretilirken bir sorun oluştu.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl flex flex-col max-h-[85vh] overflow-hidden animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0 bg-gradient-to-r from-purple-50 to-indigo-50">
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-indigo-600" />
            <h2 className="text-sm font-bold text-gray-800">Sosyal Hikaye Şablon Sihirbazı</h2>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-xl transition-colors">
            <X size={18} className="text-gray-500" />
          </button>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center justify-between px-6 py-3 bg-gray-50 shrink-0 border-b border-gray-100 text-xs">
          <span className="font-semibold text-primary-600">Adım {step} / 3</span>
          <div className="flex gap-1.5">
            {[1, 2, 3].map(s => (
              <div key={s} className={`h-1.5 w-6 rounded-full transition-all ${step >= s ? 'bg-primary-600' : 'bg-gray-200'}`} />
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 p-6 space-y-4">
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-gray-800 mb-1">Çocuğunuzu Seçin</h3>
                <p className="text-xs text-gray-500 mb-3">Hikaye hangi çocuğunuz için kişiselleştirilecek?</p>
                {children.length > 0 ? (
                  <div className="grid grid-cols-2 gap-2">
                    {children.map(c => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => { setSelectedChildId(c.id); setCustomChildName(''); }}
                        className={`p-3 rounded-2xl border text-left text-sm font-semibold transition-all ${selectedChildId === c.id ? 'bg-indigo-50 border-indigo-500 text-indigo-700 shadow-sm' : 'bg-white border-gray-200 text-gray-700 hover:border-indigo-300'}`}
                      >
                        👶 {c.name}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => { setSelectedChildId(''); setCustomChildName(''); }}
                      className={`p-3 rounded-2xl border text-left text-sm font-semibold transition-all ${!selectedChildId ? 'bg-indigo-50 border-indigo-500 text-indigo-700 shadow-sm' : 'bg-white border-gray-200 text-gray-700 hover:border-indigo-300'}`}
                    >
                      ✏️ Diğer İsim
                    </button>
                  </div>
                ) : (
                  <p className="text-xs text-gray-400">Kayıtlı çocuğunuz bulunamadı. Lütfen aşağıya ismi el ile yazın.</p>
                )}
              </div>

              {!selectedChildId && (
                <div className="animate-fade-in">
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Çocuğunuzun Adı *</label>
                  <input
                    type="text"
                    value={customChildName}
                    onChange={e => setCustomChildName(e.target.value)}
                    placeholder="Örn: Can"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
                  />
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-gray-800 mb-1">Bir Senaryo Seçin</h3>
              <p className="text-xs text-gray-500 mb-3">Çocuğunuzun hazırlık yapması gereken durum hangisi?</p>
              <div className="space-y-2">
                {SCENARIOS.map(s => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSelectedScenarioId(s.id)}
                    className={`w-full p-4 rounded-2xl border text-left flex items-start gap-3 transition-all ${selectedScenarioId === s.id ? 'bg-indigo-50 border-indigo-500 text-indigo-900 shadow-md scale-[1.01]' : 'bg-white border-gray-100 text-gray-700 hover:border-indigo-200'}`}
                  >
                    <span className="text-2xl p-2 rounded-xl bg-white border border-gray-100 shrink-0">{s.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-800">{s.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{s.description}</p>
                      <span className="inline-block mt-1.5 text-[10px] font-semibold bg-gray-100 px-2 py-0.5 rounded-full text-gray-500">{s.category}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-gray-800 mb-1">Detayları Kişiselleştirin</h3>
              <p className="text-xs text-gray-500 mb-3">Hikayeyi daha tanıdık hale getirmek için ayrıntıları girin.</p>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  {selectedScenarioId === 'HAIRCUT' ? 'Berberin İsmi' : selectedScenarioId === 'DENTIST' ? 'Diş Hekiminin İsmi' : selectedScenarioId === 'SCHOOL' ? 'Öğretmenin İsmi' : 'Uzmanın İsmi'}
                </label>
                <input
                  type="text"
                  value={specialistName}
                  onChange={e => setSpecialistName(e.target.value)}
                  placeholder={selectedScenarioId === 'HAIRCUT' ? 'Örn: Ahmet Abi' : selectedScenarioId === 'DENTIST' ? 'Örn: Pelin Abla' : 'Örn: Canan Öğretmen'}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">En Sevdiği Konfor Oyuncağı / Rahatlatıcı Eşya *</label>
                <input
                  type="text"
                  value={comfortItem}
                  onChange={e => setComfortItem(e.target.value)}
                  placeholder="Örn: Mavi Ayıcık, Kırmızı Araba"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Eşlik Edecek Ebeveyn / Kişi</label>
                <select
                  value={parentRole}
                  onChange={e => setParentRole(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 bg-white"
                >
                  <option value="Annem">Annem</option>
                  <option value="Babam">Babam</option>
                  <option value="Annem ve Babam">Annem ve Babam</option>
                  <option value="Ablam">Ablam</option>
                  <option value="Abim">Abim</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50 shrink-0">
          {step > 1 && (
            <button
              type="button"
              onClick={handlePrev}
              className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
            >
              Geri
            </button>
          )}
          {step < 3 ? (
            <button
              type="button"
              onClick={handleNext}
              disabled={
                (step === 1 && !selectedChildId && !customChildName.trim()) ||
                (step === 2 && !selectedScenarioId)
              }
              className="flex-1 py-2.5 bg-primary-600 text-white rounded-xl text-sm font-semibold hover:bg-primary-700 disabled:opacity-40 transition-colors flex items-center justify-center gap-1.5"
            >
              İleri <ChevronRight size={16} />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleGenerate}
              disabled={generating || !comfortItem.trim()}
              className="flex-1 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl text-sm font-semibold hover:from-purple-700 hover:to-indigo-700 disabled:opacity-40 transition-colors flex items-center justify-center gap-1.5"
            >
              {generating ? 'Hikaye oluşturuluyor...' : 'Hikaye Üret'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function SocialStoriesPage() {
  const { accessToken, user } = useAuthStore();
  const qc = useQueryClient();
  const [tab, setTab] = useState<'mine' | 'public'>('mine');
  const [filterCat, setFilterCat] = useState('');
  const [filterChild, setFilterChild] = useState('');
  const [search, setSearch] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [viewing, setViewing] = useState<SocialStory | null>(null);
  const [editing, setEditing] = useState<SocialStory | null | 'new'>('new' as never);
  const [showEditor, setShowEditor] = useState(false);
  const [showWizard, setShowWizard] = useState(false);

  const {
    data: mine = [],
    isLoading: mineLoading,
    isError: mineError,
    refetch: refetchMine,
  } = useQuery({
    queryKey: ['social-stories-mine'],
    queryFn: () => socialStoryService.getMine(),
    enabled: Boolean(accessToken),
  });

  const {
    data: publicStories = [],
    isLoading: publicLoading,
    isError: publicError,
    refetch: refetchPublic,
  } = useQuery({
    queryKey: ['social-stories-public', filterCat],
    queryFn: () => socialStoryService.getPublic(filterCat || undefined),
  });

  const { data: children = [] } = useQuery({
    queryKey: ['children', user?.id],
    queryFn: () => childService.getAll(),
    enabled: Boolean(accessToken && user?.id),
  });

  const createMut = useMutation({
    mutationFn: (data: Partial<SocialStory>) => socialStoryService.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['social-stories-mine'] });
      qc.invalidateQueries({ queryKey: ['social-stories-public'] });
      setShowEditor(false);
      toast.success('Hikaye kaydedildi.');
    },
    onError: () => toast.error('Hikaye kaydedilemedi. Lütfen tekrar deneyin.'),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<SocialStory> }) =>
      socialStoryService.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['social-stories-mine'] });
      qc.invalidateQueries({ queryKey: ['social-stories-public'] });
      setShowEditor(false);
      toast.success('Hikaye güncellendi.');
    },
    onError: () => toast.error('Hikaye güncellenemedi. Lütfen tekrar deneyin.'),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => socialStoryService.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['social-stories-mine'] });
      qc.invalidateQueries({ queryKey: ['social-stories-public'] });
      toast.success('Hikaye silindi.');
    },
    onError: () => toast.error('Hikaye silinemedi. Lütfen tekrar deneyin.'),
  });

  const handleSave = (data: Partial<SocialStory>) => {
    if (editing && editing !== 'new' && (editing as SocialStory).id) {
      updateMut.mutate({ id: (editing as SocialStory).id, data });
    } else {
      createMut.mutate(data);
    }
  };

  const displayed = (tab === 'mine' ? mine : publicStories).filter(s => {
    if (tab === 'mine' && filterChild && s.childId !== filterChild) return false;
    if (tab === 'mine' && filterCat && s.category !== filterCat) return false;
    if (search && !s.title.toLowerCase().includes(search.toLowerCase()) && !s.description?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const totalViews = mine.reduce((sum, s) => sum + (s.viewCount || 0), 0);
  const isLoading = tab === 'mine' ? mineLoading : publicLoading;
  const isError = tab === 'mine' ? mineError : publicError;
  const hasFilters = Boolean(search || filterCat || (tab === 'mine' && filterChild));
  const isSaving = createMut.isPending || updateMut.isPending;
  const clearFilters = () => {
    setSearch('');
    setFilterCat('');
    setFilterChild('');
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 space-y-6">
      <PageOnboarding
        pageId="social_stories"
        title="Sosyal Hikayeler"
        description="Sosyal hikayeler, çocukların günlük yaşam becerilerini, sosyal etkileşimleri ve duyguları daha kolay anlamalarına yardımcı olan görsel ve metinsel rehberlerdir."
        steps={[
          {
            icon: <BookOpen size={20} />,
            title: "Hikayeleri Okuyun",
            description: "Farklı kategorilerdeki hazır sosyal hikayeleri inceleyin ve çocuğunuza uygun olanları okuyun."
          },
          {
            icon: <Plus size={20} />,
            title: "Kendi Hikayenizi Yazın",
            description: "Çocuğunuzun özel ihtiyaçlarına yönelik resimli veya metin tabanlı yeni sosyal hikayeler oluşturun."
          },
          {
            icon: <Globe size={20} />,
            title: "Toplulukla Paylaşın",
            description: "Yazdığınız hikayeleri herkese açık hale getirerek diğer ailelere destek olun."
          }
        ]}
      />

      {/* header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg">
            <BookOpen size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Sosyal Hikayeler</h1>
            <p className="text-xs text-gray-500">Hikaye oluştur ve keşfet</p>
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            onClick={() => setShowWizard(true)}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-md transition-all duration-150 hover:from-purple-700 hover:to-indigo-700 hover:shadow-lg active:scale-95"
          >
            <Sparkles size={16} /> Sihirbazla Üret
          </button>
          <button
            onClick={() => { setEditing(null); setShowEditor(true); }}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-700"
          >
            <Plus size={16} /> Yeni Hikaye
          </button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: 'Hikayelerim', value: mine.length, icon: <BookOpen size={17} />, tone: 'text-indigo-600 bg-indigo-50' },
          { label: 'Toplam Okunma', value: totalViews, icon: <Eye size={17} />, tone: 'text-emerald-600 bg-emerald-50' },
          { label: 'Açık Paylaşım', value: mine.filter(s => s.isPublic).length, icon: <Users size={17} />, tone: 'text-sky-600 bg-sky-50' },
        ].map(stat => (
          <div key={stat.label} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${stat.tone}`}>
              {stat.icon}
            </div>
            <div className="min-w-0">
              <p className="text-xl font-bold text-slate-900">{stat.value}</p>
              <p className="truncate text-xs font-medium text-slate-500">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-2xl p-1">
        {([['mine', 'Hikayelerim'], ['public', 'Herkese Açık']] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${tab === key ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Çocuk filtresi */}
      {tab === 'mine' && children.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setFilterChild('')}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${!filterChild ? 'bg-indigo-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            Tüm Çocuklar
          </button>
          {children.map(c => (
            <button
              key={c.id}
              onClick={() => setFilterChild(c.id === filterChild ? '' : c.id)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${filterChild === c.id ? 'bg-indigo-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              {c.name}
            </button>
          ))}
        </div>
      )}

      {/* search + category filter */}
      <div className="space-y-3">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Hikaye ara..."
            className="w-full pl-8 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 bg-white"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setFilterCat('')}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${!filterCat ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            Tüm Kategoriler
          </button>
          {CATEGORIES.map(c => (
            <button
              key={c}
              onClick={() => setFilterCat(c === filterCat ? '' : c)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${filterCat === c ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* story grid */}
      {isLoading ? (
        <StoryGridSkeleton />
      ) : isError ? (
        <EmptyState
          icon={<AlertCircle size={24} />}
          title="Hikayeler yüklenemedi"
          description="Bağlantı ya da sunucu yanıtı nedeniyle liste alınamadı."
          action={
            <button
              type="button"
              onClick={() => (tab === 'mine' ? refetchMine() : refetchPublic())}
              className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-700"
            >
              <RotateCcw size={15} /> Tekrar Dene
            </button>
          }
        />
      ) : displayed.length === 0 ? (
        <EmptyState
          icon={hasFilters ? <FilterX size={24} /> : tab === 'mine' ? <FileText size={24} /> : <Layers size={24} />}
          title={hasFilters ? 'Eşleşen hikaye yok' : tab === 'mine' ? 'Henüz hikaye oluşturmadınız' : 'Bu alanda hikaye yok'}
          description={
            hasFilters
              ? 'Arama veya filtreleri değiştirerek daha fazla hikaye görebilirsiniz.'
              : tab === 'mine'
                ? 'İlk hikayenizi sıfırdan yazabilir veya sihirbazla hızlıca kişiselleştirilmiş bir taslak oluşturabilirsiniz.'
                : 'Topluluk hikayeleri paylaşıldığında burada listelenecek.'
          }
          action={
            hasFilters ? (
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
              >
                <FilterX size={15} /> Filtreleri Temizle
              </button>
            ) : tab === 'mine' ? (
              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={() => setShowWizard(true)}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-700"
                >
                  <Sparkles size={15} /> Sihirbazla Başla
                </button>
                <button
                  type="button"
                  onClick={() => { setEditing(null); setShowEditor(true); }}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                >
                  <Plus size={15} /> Yeni Hikaye
                </button>
              </div>
            ) : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {displayed.map(story => (
            <StoryCard
              key={story.id}
              story={story}
              isOwner={story.authorId === user?.id}
              onView={() => setViewing(story)}
              onEdit={() => { setEditing(story); setShowEditor(true); }}
              onDelete={() => setDeleteId(story.id)}
            />
          ))}
        </div>
      )}

      <ConfirmModal
        isOpen={!!deleteId}
        title="Hikayeyi sil?"
        message="Bu hikaye kalıcı olarak silinecek."
        confirmLabel="Evet, sil"
        onConfirm={() => { if (deleteId) { deleteMut.mutate(deleteId); setDeleteId(null); } }}
        onCancel={() => setDeleteId(null)}
      />

      {/* viewer modal */}
      {viewing && <StoryViewer story={viewing} onClose={() => setViewing(null)} />}

      {/* editor modal */}
      {showEditor && (
        <StoryEditor
          initial={editing && editing !== 'new' ? (editing as SocialStory) : undefined}
          onSave={handleSave}
          onClose={() => setShowEditor(false)}
          children={children.map(c => ({ id: c.id, name: c.name }))}
          saving={isSaving}
        />
      )}

      {/* wizard modal */}
      {showWizard && (
        <StoryWizardModal
          isOpen={showWizard}
          onClose={() => setShowWizard(false)}
          children={children.map(c => ({ id: c.id, name: c.name }))}
          onSuccess={() => {
            qc.invalidateQueries({ queryKey: ['social-stories-mine'] });
            qc.invalidateQueries({ queryKey: ['social-stories-public'] });
            setShowWizard(false);
            toast.success('Sosyal hikaye başarıyla üretildi.');
          }}
        />
      )}
    </div>
  );
}
