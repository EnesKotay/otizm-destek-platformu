import { useCallback, useEffect, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import {
  BookOpen, Plus, Search, Eye, CheckCircle, XCircle, Edit2, Trash2, ArrowLeft, ChevronLeft, ChevronRight,
  FileText, Video, Mic, MessageCircle, Send, ShieldCheck, Sparkles, Clock, Printer, Volume2, VolumeX,
  ExternalLink, LayoutGrid, Brain, GraduationCap, HeartPulse, Apple, Users, Home, Scale, Info, Bookmark, Star,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { RichTextEditor } from '@/components/ui/RichTextEditor';
import { knowledgeService } from '@/services/knowledgeService';
import { tagService } from '@/services/tagService';
import { useAuthStore } from '@/store/authStore';
import { formatRelative, formatDate } from '@/utils/date';
import type { KnowledgeArticle, ExpertAnalytics, ArticleComment, Tag } from '@/types';
import { toast } from '@/store/toastStore';
import { PageOnboarding } from '@/components/ui/PageOnboarding';

const CATEGORIES = [
  { key: '', label: 'Tümü' },
  { key: 'İletişim', label: 'İletişim' },
  { key: 'Davranış', label: 'Davranış' },
  { key: 'Eğitim', label: 'Eğitim' },
  { key: 'Sağlık', label: 'Sağlık' },
  { key: 'Beslenme', label: 'Beslenme & Diyet' },
  { key: 'Duyusal Gelişim', label: 'Duyusal Gelişim' },
  { key: 'Sosyal Beceriler', label: 'Sosyal Beceriler' },
  { key: 'Aile', label: 'Aile & Ebeveynlik' },
  { key: 'Yasal Haklar', label: 'Yasal Haklar & Haklar' },
  { key: 'Erken Tanı', label: 'Erken Tanı & Takip' },
  { key: 'Genel', label: 'Genel' },
];

const CATEGORY_COLORS: Record<string, string> = {
  'İletişim': 'bg-blue-50 text-blue-700 border border-blue-200/40',
  'Davranış': 'bg-orange-50 text-orange-700 border border-orange-200/40',
  'Eğitim': 'bg-teal-50 text-teal-700 border border-teal-200/40',
  'Sağlık': 'bg-red-50 text-red-700 border border-red-200/40',
  'Beslenme': 'bg-rose-50 text-rose-700 border border-rose-200/40',
  'Duyusal Gelişim': 'bg-emerald-50 text-emerald-700 border border-emerald-200/40',
  'Sosyal Beceriler': 'bg-cyan-50 text-cyan-700 border border-cyan-200/40',
  'Aile': 'bg-purple-50 text-purple-700 border border-purple-200/40',
  'Yasal Haklar': 'bg-amber-50 text-amber-700 border border-amber-200/40',
  'Erken Tanı': 'bg-indigo-50 text-indigo-700 border border-indigo-200/40',
  'Genel': 'bg-gray-50 text-gray-700 border border-gray-200/40',
};

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  '': LayoutGrid,
  'İletişim': MessageCircle,
  'Davranış': Brain,
  'Eğitim': GraduationCap,
  'Sağlık': HeartPulse,
  'Beslenme': Apple,
  'Duyusal Gelişim': Sparkles,
  'Sosyal Beceriler': Users,
  'Aile': Home,
  'Yasal Haklar': Scale,
  'Erken Tanı': Search,
  'Genel': Info,
};

const CATEGORY_ACTIVE_COLORS: Record<string, string> = {
  '': 'bg-indigo-50 text-indigo-700 border-indigo-200/60 shadow-sm',
  'İletişim': 'bg-blue-50 text-blue-700 border-blue-200/60 shadow-sm',
  'Davranış': 'bg-orange-50 text-orange-700 border-orange-200/60 shadow-sm',
  'Eğitim': 'bg-teal-50 text-teal-700 border-teal-200/60 shadow-sm',
  'Sağlık': 'bg-red-50 text-red-700 border-red-200/60 shadow-sm',
  'Beslenme': 'bg-rose-50 text-rose-700 border-rose-200/60 shadow-sm',
  'Duyusal Gelişim': 'bg-emerald-50 text-emerald-700 border-emerald-200/60 shadow-sm',
  'Sosyal Beceriler': 'bg-cyan-50 text-cyan-700 border-cyan-200/60 shadow-sm',
  'Aile': 'bg-purple-50 text-purple-700 border-purple-200/60 shadow-sm',
  'Yasal Haklar': 'bg-amber-50 text-amber-700 border-amber-200/60 shadow-sm',
  'Erken Tanı': 'bg-indigo-50 text-indigo-700 border-indigo-200/60 shadow-sm',
  'Genel': 'bg-gray-100 text-gray-700 border-gray-200/60 shadow-sm',
};

type ContentType = 'makale' | 'video' | 'podcast';

const CONTENT_TYPE_TABS: { key: ContentType | ''; label: string; icon: React.ReactNode }[] = [
  { key: '', label: 'Tümü', icon: <BookOpen size={14} /> },
  { key: 'makale', label: 'Makale', icon: <FileText size={14} /> },
  { key: 'video', label: 'Video', icon: <Video size={14} /> },
  { key: 'podcast', label: 'Podcast', icon: <Mic size={14} /> },
];

const CONTENT_TYPE_COLORS: Record<ContentType, string> = {
  makale: 'bg-blue-100 text-blue-700',
  video: 'bg-red-100 text-red-700',
  podcast: 'bg-purple-100 text-purple-700',
};

const CONTENT_TYPE_LABELS: Record<ContentType, string> = {
  makale: '📄 Makale',
  video: '🎬 Video',
  podcast: '🎙 Podcast',
};

const WATCHED_VIDEOS_KEY = 'knowledge-watched-video-ids';

function readWatchedVideos() {
  try {
    return new Set(JSON.parse(localStorage.getItem(WATCHED_VIDEOS_KEY) ?? '[]') as string[]);
  } catch {
    return new Set<string>();
  }
}

function writeWatchedVideos(ids: Set<string>) {
  try {
    localStorage.setItem(WATCHED_VIDEOS_KEY, JSON.stringify([...ids]));
  } catch {
    // localStorage may be unavailable in restricted browser contexts.
  }
}

const FORMAT_TO_TYPE: Record<string, ContentType> = { TEXT: 'makale', VIDEO: 'video', PODCAST: 'podcast', STORY: 'makale' };
const TYPE_TO_FORMAT: Record<ContentType, string> = { makale: 'TEXT', video: 'VIDEO', podcast: 'PODCAST' };

/** Derives the content type/media/text view of an article from its format & mediaUrl fields */
function getArticleView(article: Pick<KnowledgeArticle, 'format' | 'mediaUrl' | 'content'>): { type: ContentType; mediaUrl: string; text: string } {
  return {
    type: FORMAT_TO_TYPE[article.format || 'TEXT'] || 'makale',
    mediaUrl: article.mediaUrl || '',
    text: article.content || '',
  };
}

/** Extract YouTube video ID from various URL formats */
function getYouTubeId(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&?/\s]+)/);
  return match ? match[1] : null;
}

/** Render a video external link card for YouTube or generic video URL to avoid embed restrictions and copyright issues */
function VideoPlayer({ url, onWatched }: { url: string; onWatched?: () => void }) {
  return (
    <div className="p-5 bg-gradient-to-r from-red-50 to-red-100/30 border border-red-100 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-12 h-12 rounded-full bg-red-600 flex items-center justify-center text-white shadow-md shadow-red-200 shrink-0">
          <Video size={22} />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-red-950">Eğitici Video İçeriği</p>
          <p className="text-xs text-red-600 truncate max-w-xs sm:max-w-md">{url}</p>
        </div>
      </div>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={onWatched}
        className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-semibold text-xs rounded-xl flex items-center gap-2 transition-all shadow-sm shadow-red-200 hover:shadow-md shrink-0 cursor-pointer text-center w-full sm:w-auto justify-center"
      >
        <Video size={14} />
        Videoyu Kaynağında İzle
      </a>
    </div>
  );
}

/** Render an audio player */
function AudioPlayer({ url }: { url: string }) {
  return (
    <div className="p-4 bg-purple-50 border border-purple-100 rounded-xl">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center">
          <Mic size={18} className="text-white" />
        </div>
        <div>
          <p className="text-sm font-semibold text-purple-900">Podcast</p>
          <p className="text-xs text-purple-600 truncate max-w-xs">{url}</p>
        </div>
      </div>
      <audio controls className="w-full">
        <source src={url} />
        <p className="text-sm text-gray-500">Tarayıcınız ses oynatmayı desteklemiyor.</p>
      </audio>
    </div>
  );
}

function getReadingTime(htmlContent: string): number {
  if (!htmlContent) return 1;
  const text = htmlContent.replace(/<[^>]*>/g, '');
  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
  const time = Math.ceil(wordCount / 200);
  return time > 0 ? time : 1;
}

function isForeignResource(article: KnowledgeArticle): boolean {
  if (!article) return false;
  const sourceUrl = article.sourceUrl?.trim();
  const sourceName = article.sourceName?.trim();
  
  if (!sourceUrl && !sourceName) {
    return false; // Yerli Kaynak
  }
  
  if (sourceUrl) {
    try {
      const url = new URL(sourceUrl);
      const hostname = url.hostname.toLowerCase();
      if (hostname.endsWith('.tr') || hostname.includes('.gov.tr') || hostname.includes('.edu.tr') || hostname.includes('.org.tr')) {
        return false; // Yerli Kaynak
      }
    } catch {
      const lowerUrl = sourceUrl.toLowerCase();
      if (lowerUrl.includes('.tr')) {
        return false;
      }
    }
  }
  
  if (sourceName) {
    const lowerName = sourceName.toLowerCase();
    const turkishIndicators = ['vakfı', 'vakfi', 'derneği', 'dernegi', 'bakanlığı', 'bakanligi', 'müdürlüğü', 'mudurlugu', 'üniversitesi', 'universitesi', 'hastanesi', 'türkiye', 'turkiye', 'türk', 'turk', 'yerli', 'meb'];
    if (turkishIndicators.some(indicator => lowerName.includes(indicator))) {
      return false; // Yerli Kaynak
    }
  }
  
  if (sourceUrl) {
    return true; // Yabancı Kaynak
  }
  
  if (sourceName) {
    const lowerName = sourceName.toLowerCase();
    const foreignNames = ['autism speaks', 'cdc', 'nhs', 'who', 'pubmed', 'ncbi', 'webmd', 'mayo clinic', 'nature', 'psychology today', 'healthline', 'sciencedirect', 'cochrane', 'scholar', 'springer', 'elsevier', 'healthychildren', 'autism.org', 'star institute', 'sensory', 'pyramid', 'pecs'];
    if (foreignNames.some(name => lowerName.includes(name))) {
      return true; // Yabancı Kaynak
    }
  }
  
  return false;
}

export function KnowledgePage() {
  const location = useLocation();
  return <KnowledgeContent location={location} />;
}

function KnowledgeContent({ location }: { location: ReturnType<typeof useLocation> }) {
  const user = useAuthStore(s => s.user);
  const isExpert = user?.role === 'EXPERT' || user?.role === 'ADMIN';

  const [articles, setArticles] = useState<KnowledgeArticle[]>([]);
  const [recommendations, setRecommendations] = useState<KnowledgeArticle[]>([]);
  const [selectedArticle, setSelectedArticle] = useState<KnowledgeArticle | null>(null);
  const [isPlayingSpeech, setIsPlayingSpeech] = useState(false);

  const toggleSpeech = useCallback((textToRead: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      toast.error('Tarayıcınız sesli okumayı desteklemiyor.');
      return;
    }
    if (isPlayingSpeech) {
      window.speechSynthesis.cancel();
      setIsPlayingSpeech(false);
      toast.info('Sesli okuma durduruldu.');
    } else {
      window.speechSynthesis.cancel();
      const cleanText = textToRead.replace(/<[^>]*>?/gm, '');
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = 'tr-TR';
      utterance.rate = 0.92;
      utterance.onend = () => setIsPlayingSpeech(false);
      utterance.onerror = () => setIsPlayingSpeech(false);
      window.speechSynthesis.speak(utterance);
      setIsPlayingSpeech(true);
      toast.success('Sesli okuma başlatıldı 🔊');
    }
  }, [isPlayingSpeech]);

  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedArticleId = searchParams.get('id');
  const [activeCategory, setActiveCategory] = useState('');
  const [activeContentType, setActiveContentType] = useState<ContentType | ''>('');
  const [showMyArticles, setShowMyArticles] = useState(false);
  const [showBookmarksOnly, setShowBookmarksOnly] = useState(false);
  const [isExperience, setIsExperience] = useState(false);
  const [durationTried, setDurationTried] = useState('1 hafta');
  const [effectivenessRating, setEffectivenessRating] = useState(5);
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [analytics, setAnalytics] = useState<ExpertAnalytics | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [relatedArticles, setRelatedArticles] = useState<KnowledgeArticle[]>([]);
  const [comments, setComments] = useState<ArticleComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingArticle, setEditingArticle] = useState<KnowledgeArticle | null>(null);
  const [loading, setLoading] = useState(false);
  const [deleteArticleId, setDeleteArticleId] = useState<string | null>(null);
  const [watchedVideoIds, setWatchedVideoIds] = useState(() => readWatchedVideos());
  const [form, setForm] = useState({
    title: '',
    content: '',
    category: 'Genel',
    contentType: 'makale' as ContentType,
    mediaUrl: '',
    sourceName: '',
    sourceUrl: '',
  });

  const [aiPrompt, setAiPrompt] = useState('');
  const [generatingDraft, setGeneratingDraft] = useState(false);

  const handleGenerateAiDraft = async () => {
    if (!aiPrompt.trim()) return;
    setGeneratingDraft(true);
    try {
      const draft = await knowledgeService.generateAiDraft(aiPrompt);
      setForm({
        title: draft.title,
        category: draft.category || 'Genel',
        content: draft.content,
        contentType: 'makale',
        mediaUrl: '',
        sourceName: '',
        sourceUrl: '',
      });
      setAiPrompt('');
      if (draft.aiGenerated) {
        toast.success('Yapay zeka taslağı başarıyla oluşturuldu ve forma yüklendi!');
      } else {
        toast.warning('Yapay zeka servisi şu anda yapılandırılmamış — forma örnek bir şablon yüklendi, yayınlamadan önce içeriği mutlaka kendiniz yazın.');
      }
    } catch {
      toast.error('Taslak oluşturulurken bir hata oluştu.');
    } finally {
      setGeneratingDraft(false);
    }
  };

  const loadArticles = async () => {
    try {
      let data;
      if (showBookmarksOnly) {
        const bookmarksData = await knowledgeService.getBookmarks();
        setArticles(bookmarksData);
        setTotalPages(1);
        return;
      }
      if (showMyArticles) {
        data = await knowledgeService.getMy(page);
        if (isExpert && page === 0) {
          const stats = await knowledgeService.getMyAnalytics();
          setAnalytics(stats);
        }
      } else {
        data = await knowledgeService.search({
          q: debouncedSearch || undefined,
          category: activeCategory || undefined,
          format: activeContentType ? TYPE_TO_FORMAT[activeContentType] : undefined,
          tagIds: selectedTagIds.length > 0 ? selectedTagIds : undefined,
          page,
        });
      }
      setArticles(data.content);
      setTotalPages(data.totalPages);
    } catch { /* ignore */ }
  };

  const loadComments = useCallback(async (articleId: string) => {
    setLoadingComments(true);
    try {
      const data = await knowledgeService.getComments(articleId);
      setComments(data.content);
    } catch { /* ignore */ }
    setLoadingComments(false);
  }, []);

  useEffect(() => {
    if (selectedArticle) {
      queueMicrotask(() => loadComments(selectedArticle.id));
      knowledgeService.getRelated(selectedArticle.id).then(setRelatedArticles).catch(() => setRelatedArticles([]));
    } else {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRelatedArticles([]);
    }
  }, [loadComments, selectedArticle]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
      setPage(0);
    }, 400);
    return () => clearTimeout(timeout);
  }, [searchQuery]);

  const handleToggleBookmark = async (articleId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const bookmarked = await knowledgeService.toggleBookmark(articleId);
      setArticles(prev => prev.map(a => a.id === articleId ? { ...a, bookmarked } : a));
      setSelectedArticle(prev => prev && prev.id === articleId ? { ...prev, bookmarked } : prev);
      setRecommendations(prev => prev.map(a => a.id === articleId ? { ...a, bookmarked } : a));
      toast.success(bookmarked ? 'Yer imlerine kaydedildi.' : 'Yer imlerinden kaldırıldı.');
    } catch {
      toast.error('İşlem başarısız oldu.');
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !selectedArticle) return;
    setSubmittingComment(true);
    try {
      const experienceData = isExperience ? {
        isExperience: true,
        durationTried,
        effectivenessRating
      } : undefined;
      const comment = await knowledgeService.addComment(selectedArticle.id, newComment, experienceData);
      setComments([comment, ...comments]);
      setNewComment('');
      setIsExperience(false);
      toast.success('Yorumunuz eklendi.');
    } catch {
      toast.error('Yorum eklenirken hata oluştu.');
    }
    setSubmittingComment(false);
  };

  useEffect(() => {
    if (user?.role === 'PARENT') {
      knowledgeService.getRecommendations()
        .then(setRecommendations)
        .catch(() => setRecommendations([]));
    } else {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRecommendations([]);
    }
  }, [user]);

  useEffect(() => {
    tagService.getAllTags()
      .then(setAvailableTags)
      .catch(() => setAvailableTags([]));
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadArticles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCategory, activeContentType, debouncedSearch, page, showMyArticles, showBookmarksOnly, selectedTagIds]);

  useEffect(() => {
    if (selectedArticleId) {
      knowledgeService.getOne(selectedArticleId)
        .then(setSelectedArticle)
        .catch(() => {
          setSelectedArticle(null);
          setSearchParams({});
        });
    } else {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedArticle(null);
    }
  }, [selectedArticleId, setSearchParams]);

  useEffect(() => {
    const openArticleId = (location.state as { openArticleId?: string } | null)?.openArticleId;
    if (openArticleId) {
      setSearchParams({ id: openArticleId }, { replace: true });
      window.history.replaceState({}, '');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleViewArticle = (article: KnowledgeArticle) => {
    setSearchParams({ id: article.id });
  };

  const handleOpenCreate = () => {
    setEditingArticle(null);
    setForm({ title: '', content: '', category: 'Genel', contentType: 'makale', mediaUrl: '', sourceName: '', sourceUrl: '' });
    setAiPrompt('');
    setShowModal(true);
  };

  const handleOpenEdit = (article: KnowledgeArticle, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingArticle(article);
    const view = getArticleView(article);
    setForm({
      title: article.title,
      content: view.text,
      category: article.category || 'Genel',
      contentType: view.type,
      mediaUrl: view.mediaUrl,
      sourceName: article.sourceName || '',
      sourceUrl: article.sourceUrl || '',
    });
    setShowModal(true);
  };

  const handleSave = async (publish: boolean) => {
    if (!form.title || (form.contentType === 'makale' && !form.content) || (form.contentType !== 'makale' && !form.mediaUrl)) {
      toast.error('Lütfen gerekli alanları doldurun.');
      return;
    }
    setLoading(true);
    try {
      const payload = {
        title: form.title,
        content: form.content,
        category: form.category,
        format: TYPE_TO_FORMAT[form.contentType],
        mediaUrl: form.contentType !== 'makale' ? form.mediaUrl : undefined,
        published: publish,
        sourceName: form.sourceName || undefined,
        sourceUrl: form.sourceUrl || undefined,
      };

      if (editingArticle) {
        await knowledgeService.update(editingArticle.id, payload);
        setShowModal(false);
        loadArticles();
        toast.success(publish ? 'İçerik güncellendi ve yayınlandı.' : 'İçerik güncellendi.');
      } else {
        await knowledgeService.create(payload);
        setShowModal(false);
        setActiveCategory('');
        setPage(0);
        setShowMyArticles(true);
        toast.success(publish ? 'İçerik başarıyla yayınlandı.' : 'İçerik taslak olarak kaydedildi.');
      }
    } catch {
      toast.error('İçerik kaydedilirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await knowledgeService.delete(id);
      loadArticles();
      toast.success('İçerik silindi.');
    } catch { toast.error('İçerik silinemedi.'); }
    setDeleteArticleId(null);
  };

  const handleTogglePublish = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await knowledgeService.togglePublish(id);
      loadArticles();
      toast.success('Yayın durumu güncellendi.');
    } catch { toast.error('Yayın durumu değiştirilemedi.'); }
  };

  const markVideoWatched = (articleId: string) => {
    setWatchedVideoIds((current) => {
      const next = new Set(current);
      next.add(articleId);
      writeWatchedVideos(next);
      return next;
    });
  };

  // "İçeriklerim" sekmesinde arama/kategori/tür backend'den gelmediği için client-side filtrelenir;
  // diğer durumlarda backend zaten filtrelemiş olsa da bu filtre zararsız bir ek güvencedir.
  const filteredArticles = articles.filter(a => {
    const matchesSearch = !searchQuery ||
      a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = !activeContentType || getArticleView(a).type === activeContentType;
    const matchesCategory = !showMyArticles || !activeCategory || a.category === activeCategory;
    return matchesSearch && matchesType && matchesCategory;
  });

  // Article detail view
  if (selectedArticle) {
    const parsed = getArticleView(selectedArticle);
    const isWatchedVideo = parsed.type === 'video' && watchedVideoIds.has(selectedArticle.id);
    const readingTime = getReadingTime(parsed.text);

    return (
      <div className="max-w-3xl mx-auto space-y-8 pb-12 animate-in fade-in slide-in-from-bottom-6 duration-300">
        {/* Navigation Bar */}
        <div className="flex items-center justify-between print:hidden">
          <button
            onClick={() => setSearchParams({})}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-100 rounded-full shadow-sm hover:text-indigo-600 hover:border-indigo-100 hover:shadow-md transition-all cursor-pointer group"
          >
            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform duration-200" />
            <span>Geri Dön</span>
          </button>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => toggleSpeech(`${selectedArticle.title}. ${parsed.text}`)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-full shadow-sm transition-all cursor-pointer ${
                isPlayingSpeech 
                  ? 'bg-amber-500 text-white shadow-amber-200 ring-2 ring-amber-300 animate-pulse'
                  : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-100'
              }`}
            >
              {isPlayingSpeech ? <VolumeX size={16} /> : <Volume2 size={16} />}
              <span>{isPlayingSpeech ? 'Durdur' : 'Sesli Dinle'}</span>
            </button>

            <button
              onClick={(e) => handleToggleBookmark(selectedArticle.id, e)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-100 rounded-full shadow-sm hover:text-indigo-600 hover:border-indigo-100 hover:shadow-md transition-all cursor-pointer"
            >
              <Bookmark size={16} className={selectedArticle.bookmarked ? 'fill-indigo-600 text-indigo-600' : 'text-gray-400'} />
              <span>{selectedArticle.bookmarked ? 'Kaydedildi' : 'Kaydet'}</span>
            </button>

            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-100 rounded-full shadow-sm hover:text-indigo-600 hover:border-indigo-100 hover:shadow-md transition-all cursor-pointer"
            >
              <Printer size={16} />
              <span>Yazdır</span>
            </button>
          </div>
        </div>

        {/* Article Details Card */}
        <div className="bg-white rounded-3xl border border-gray-100/80 shadow-md shadow-gray-100/50 p-6 sm:p-10 overflow-hidden">
          <div className="flex items-center gap-2 mb-6 flex-wrap">
            {isForeignResource(selectedArticle) ? (
              <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200/50 flex items-center gap-1">
                🌍 Yabancı Kaynak
              </span>
            ) : (
              <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-sky-50 text-sky-700 border border-sky-200/50 flex items-center gap-1">
                🇹🇷 Yerli Kaynak
              </span>
            )}
            {parsed.type !== 'makale' && (
              <span className={`px-3 py-1 rounded-full text-[11px] font-semibold tracking-wide uppercase ${CONTENT_TYPE_COLORS[parsed.type]}`}>
                {CONTENT_TYPE_LABELS[parsed.type]}
              </span>
            )}
            {selectedArticle.category && (
              <span className={`px-3 py-1 rounded-full text-[11px] font-semibold tracking-wide uppercase ${CATEGORY_COLORS[selectedArticle.category] || 'bg-gray-100 text-gray-700'}`}>
                {selectedArticle.category}
              </span>
            )}
            {selectedArticle.reviewedAt && selectedArticle.reviewedBy && (
              <span className="px-3 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100 flex items-center gap-1">
                <CheckCircle size={12} className="fill-emerald-50 text-emerald-600" /> Editöryal İncelemeli
              </span>
            )}
            {selectedArticle.aiGenerated && (
              <span className="px-3 py-1 rounded-full text-[11px] font-semibold bg-violet-50 text-violet-700 border border-violet-100">
                Yapay zekâ destekli taslak
              </span>
            )}
            <span className="flex items-center gap-1 text-xs text-gray-400 ml-auto">
              <Eye size={12} /> {selectedArticle.viewCount} görüntülenme
            </span>
          </div>

          {/* Title */}
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-6 leading-tight tracking-tight">
            {selectedArticle.title}
          </h1>

          {/* Author info */}
          {selectedArticle.author && (
            <div className="flex items-center justify-between border-b border-gray-100 pb-6 mb-8">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-indigo-500 to-blue-600 flex items-center justify-center text-white shadow-sm font-semibold text-base ring-4 ring-indigo-50">
                  {selectedArticle.author.fullName?.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900">{selectedArticle.author.fullName}</p>
                  {selectedArticle.author.expertTitle ? (
                    <p className="text-xs text-gray-500 font-medium">{selectedArticle.author.expertTitle}</p>
                  ) : (
                    <p className="text-xs text-gray-400">Yazar</p>
                  )}
                </div>
              </div>
              <div className="text-right text-xs text-gray-400 space-y-1 font-medium">
                <p className="flex items-center justify-end gap-1">
                  <Clock size={12} />
                  <span>{readingTime} dk okuma süresi</span>
                </p>
                <p>{formatDate(selectedArticle.createdAt)}</p>
              </div>
            </div>
          )}

          {/* Media players */}
          {parsed.type === 'video' && parsed.mediaUrl && (
            <div className="mb-8 space-y-4">
              <div className="shadow-lg rounded-2xl overflow-hidden">
                <VideoPlayer url={parsed.mediaUrl} />
              </div>
              <div className="rounded-2xl border border-rose-100 bg-rose-50/50 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 text-sm font-bold text-rose-950">
                      <Video size={15} className="text-rose-600" />
                      Video Rehber
                    </p>
                    <p className="mt-1 text-xs font-semibold leading-relaxed text-rose-700">
                      İzlerken kısa not alın; kişisel tanı, tedavi veya ilaç kararı için mutlaka kendi uzmanınıza danışın.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => markVideoWatched(selectedArticle.id)}
                    className={`inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition-all shadow-sm cursor-pointer ${
                      isWatchedVideo
                        ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                        : 'bg-white text-rose-700 ring-1 ring-rose-100 hover:bg-rose-100'
                    }`}
                  >
                    <CheckCircle size={14} />
                    {isWatchedVideo ? 'İzlendi' : 'İzlendi olarak işaretle'}
                  </button>
                </div>
              </div>
            </div>
          )}
          {parsed.type === 'podcast' && parsed.mediaUrl && (
            <div className="mb-8 shadow-sm">
              <AudioPlayer url={parsed.mediaUrl} />
            </div>
          )}

          {/* Prose Content */}
          {parsed.text && (
            <div 
              className="prose max-w-none prose-indigo hover:prose-a:text-indigo-500 mb-8"
              dangerouslySetInnerHTML={{ __html: parsed.text }}
            />
          )}

          {/* Source Citation */}
          {(selectedArticle.sourceName || selectedArticle.usageType === 'ORIGINAL') && (
            <div className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-4 sm:p-5 flex gap-3 shadow-sm mb-6">
              <BookOpen size={20} className="text-indigo-600 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-sm font-bold text-indigo-950">
                  Kaynak ve kullanım beyanı
                </p>
                {selectedArticle.sourceUrl ? (
                  <a
                     href={selectedArticle.sourceUrl}
                     target="_blank"
                     rel="noopener noreferrer"
                     className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-indigo-700 hover:text-indigo-900 hover:underline break-words"
                  >
                    {selectedArticle.sourceName || 'Platform özgün içeriği'}
                    <ExternalLink size={12} className="shrink-0" />
                  </a>
                ) : (
                  <p className="mt-1 text-xs font-semibold text-indigo-800">
                    {selectedArticle.sourceName || 'Platform özgün içeriği'}
                  </p>
                )}
                <p className="mt-1 text-[11px] text-indigo-600/80">
                  {selectedArticle.usageType === 'ORIGINAL'
                    ? 'Bu metin platform için özgün olarak hazırlanmıştır.'
                    : 'Bu içerik kaynak metnin yerine geçmez; ayrıntılar için özgün yayını inceleyin.'}
                </p>
                <dl className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-[11px] text-indigo-900">
                  {selectedArticle.sourceAuthor && <div><dt className="font-bold inline">Yazar: </dt><dd className="inline">{selectedArticle.sourceAuthor}</dd></div>}
                  {selectedArticle.sourcePublication && <div><dt className="font-bold inline">Yayın: </dt><dd className="inline">{selectedArticle.sourcePublication}</dd></div>}
                  {selectedArticle.doi && <div><dt className="font-bold inline">DOI: </dt><dd className="inline">{selectedArticle.doi}</dd></div>}
                  {selectedArticle.licenseType && <div><dt className="font-bold inline">Lisans: </dt><dd className="inline">{selectedArticle.licenseType.replaceAll('_', ' ')}</dd></div>}
                  {selectedArticle.evidenceLevel && <div><dt className="font-bold inline">Kanıt türü: </dt><dd className="inline">{selectedArticle.evidenceLevel.replaceAll('_', ' ')}</dd></div>}
                  {selectedArticle.sourceAccessedAt && <div><dt className="font-bold inline">Erişim: </dt><dd className="inline">{formatDate(selectedArticle.sourceAccessedAt)}</dd></div>}
                </dl>
              </div>
            </div>
          )}

          {selectedArticle.reviewedAt && selectedArticle.reviewedBy && (
            <div className="mb-6 rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4 text-xs text-emerald-900">
              <p className="font-bold">Editöryal inceleme</p>
              <p className="mt-1">{selectedArticle.reviewedBy.fullName} tarafından {formatDate(selectedArticle.reviewedAt)} tarihinde incelendi.</p>
              {selectedArticle.reviewNotes && <p className="mt-1 text-emerald-800">{selectedArticle.reviewNotes}</p>}
            </div>
          )}

          {/* Secure Usage Note */}
          <div className="rounded-2xl border-l-4 border-amber-500 bg-amber-50/40 p-4 sm:p-5 flex gap-3 shadow-sm">
            <ShieldCheck size={20} className="text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-amber-950">
                Güvenli Kullanım Notu
              </p>
              <p className="mt-1 text-xs font-semibold leading-relaxed text-amber-800">
                Bu içerik bilgilendirme amaçlıdır; tanı, tedavi, ilaç veya kriz müdahalesi kararı yerine geçmez. Sağlık durumunuzla ilgili kararları bir uzmana danışarak almalısınız.
              </p>
            </div>
          </div>

          {/* Author Admin Action buttons */}
          {((isExpert && selectedArticle.author?.id === user?.id) || user?.role === 'ADMIN') && (
            <div className="flex gap-3 mt-8 pt-6 border-t border-gray-100 print:hidden">
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => { setSearchParams({}); handleOpenEdit(selectedArticle, e); }}
                className="rounded-xl px-4 font-semibold text-gray-700 border-gray-200 hover:bg-gray-50 flex items-center gap-1.5"
              >
                <Edit2 size={14} /> Düzenle
              </Button>
              <Button
                variant={selectedArticle.published ? 'ghost' : 'outline'}
                size="sm"
                onClick={async () => {
                  try {
                    const updated = await knowledgeService.togglePublish(selectedArticle.id);
                    setSelectedArticle(updated);
                    loadArticles();
                  } catch { /* ignore */ }
                }}
                className="rounded-xl px-4 font-semibold flex items-center gap-1.5"
              >
                {selectedArticle.published ? (
                  <><XCircle size={14} className="text-red-500" /> Yayından Kaldır</>
                ) : (
                  <><CheckCircle size={14} className="text-emerald-600" /> Yayınla</>
                )}
              </Button>
            </div>
          )}
        </div>

        {/* Related Articles */}
        {relatedArticles.length > 0 && (
          <div className="bg-white rounded-3xl border border-gray-100/80 shadow-md shadow-gray-100/50 p-6 sm:p-8 print:hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <BookOpen size={18} className="text-indigo-600" />
              <span>İlgili İçerikler</span>
            </h3>
            <div className="grid sm:grid-cols-2 gap-4">
              {relatedArticles.map(ra => {
                const raView = getArticleView(ra);
                return (
                  <button
                    key={ra.id}
                    type="button"
                    onClick={() => setSearchParams({ id: ra.id })}
                    className="text-left flex flex-col gap-1 p-4 rounded-2xl border border-gray-100 hover:border-indigo-200 hover:shadow-sm transition-all cursor-pointer"
                  >
                    <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-wide">{ra.category}</span>
                    <span className="text-sm font-bold text-gray-900 line-clamp-2">{ra.title}</span>
                    <span className="flex items-center gap-1 text-xs text-gray-400 mt-1">
                      {raView.type === 'video' ? <Video size={12} /> : raView.type === 'podcast' ? <Mic size={12} /> : <FileText size={12} />}
                      {CONTENT_TYPE_LABELS[raView.type]}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Comments Section */}
        <div className="bg-white rounded-3xl border border-gray-100/80 shadow-md shadow-gray-100/50 p-6 sm:p-10 print:hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg sm:text-xl font-extrabold text-gray-900 flex items-center gap-2.5">
              <MessageCircle size={22} className="text-indigo-600 animate-pulse" />
              <span>Sorular & Tartışmalar</span>
              <span className="relative flex h-5 min-w-5 items-center justify-center">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-400 opacity-20"></span>
                <span className="relative inline-flex items-center justify-center text-xs font-bold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full border border-indigo-100">
                  {comments.length}
                </span>
              </span>
            </h3>
          </div>

          {/* New Comment Input Row */}
          <div className="space-y-3 mb-8">
            <div className="flex gap-3">
              <div className="relative shrink-0">
                <img 
                  src={user?.profileImageUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.fullName || 'U')}&background=random`} 
                  alt="Profil" 
                  className="w-10 h-10 rounded-2xl object-cover ring-2 ring-indigo-50/70 shadow-sm"
                />
                {(user?.role === 'EXPERT' || user?.role === 'ADMIN') && (
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-indigo-600 border-2 border-white rounded-full flex items-center justify-center shadow-sm">
                    <ShieldCheck size={9} className="text-white" />
                  </div>
                )}
              </div>
              <div className="flex-1 flex gap-2">
                <input
                  type="text"
                  value={newComment}
                  onChange={e => setNewComment(e.target.value)}
                  placeholder="Aklınıza takılan bir soru sorun veya yorum yapın..."
                  className="flex-1 px-4 py-3 bg-gray-50/80 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all text-sm placeholder:text-gray-400"
                  onKeyDown={e => e.key === 'Enter' && handleAddComment()}
                />
                <Button 
                  onClick={handleAddComment} 
                  loading={submittingComment}
                  className="rounded-2xl px-5 bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-200 transition-all cursor-pointer group/btn flex items-center justify-center"
                >
                  <Send size={16} className="group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" />
                </Button>
              </div>
            </div>

            {/* Experience Inputs */}
            {user?.role === 'PARENT' && (
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-3 shadow-inner">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isExperience}
                    onChange={e => setIsExperience(e.target.checked)}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                  />
                  <span className="text-xs font-bold text-slate-700">Evde deneme deneyimi paylaş (Deneyim Köşesi)</span>
                </label>
                
                {isExperience && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-200/50 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Deneme Süresi</label>
                      <select
                        value={durationTried}
                        onChange={e => setDurationTried(e.target.value)}
                        className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-400 transition-all font-semibold text-slate-700 cursor-pointer"
                      >
                        <option value="Birkaç gün">Birkaç gün</option>
                        <option value="1 hafta">1 hafta</option>
                        <option value="2-4 hafta">2-4 hafta</option>
                        <option value="1-3 ay">1-3 ay</option>
                        <option value="3 ay+">3 ay+</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Fayda Derecesi</label>
                      <div className="flex items-center gap-1.5 mt-2">
                        {[1, 2, 3, 4, 5].map(rating => (
                          <button
                            key={rating}
                            type="button"
                            onClick={() => setEffectivenessRating(rating)}
                            className="p-0.5 text-amber-400 hover:scale-110 transition-transform cursor-pointer"
                          >
                            <Star size={20} className={rating <= effectivenessRating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'} />
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="space-y-4">
            {loadingComments ? (
              <div className="flex justify-center py-10">
                <div className="w-8 h-8 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
              </div>
            ) : comments.length === 0 ? (
              <div className="relative overflow-hidden text-center py-16 px-4 bg-slate-50/40 rounded-3xl border border-slate-100/80">
                <div className="absolute top-1/2 left-1/2 w-48 h-48 bg-indigo-50/40 rounded-full -translate-x-1/2 -translate-y-1/2 blur-2xl pointer-events-none" />
                <div className="relative">
                  <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 border border-slate-100 shadow-md shadow-slate-100/60">
                    <MessageCircle size={28} className="text-slate-300" />
                  </div>
                  <p className="text-sm text-slate-700 font-extrabold">Henüz yorum yapılmamış</p>
                  <p className="text-xs text-slate-400 mt-1.5 max-w-[280px] mx-auto leading-relaxed">
                    İlk soruyu sorarak diğer aileler ve uzmanlarla tartışmayı başlatın!
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4 max-h-[550px] overflow-y-auto pr-1.5 scrollbar-thin">
                {comments.map(comment => {
                  const isAuthorExpert = comment.author?.role === 'EXPERT' || comment.author?.role === 'ADMIN';
                  const isExp = comment.isExperience;
                  return (
                    <div 
                      key={comment.id} 
                      className={`flex gap-3.5 p-5 rounded-3xl border transition-all duration-300 hover:shadow-md hover:shadow-indigo-500/5 ${
                        isExp
                          ? 'bg-gradient-to-br from-emerald-50/50 via-white to-emerald-50/10 border-emerald-100 shadow-sm'
                          : isAuthorExpert
                            ? 'bg-gradient-to-br from-indigo-50/40 via-indigo-50/20 to-primary-50/10 border-indigo-100/60 shadow-sm'
                            : 'bg-white border-slate-100'
                      }`}
                    >
                      <div className="relative shrink-0">
                        <img 
                          src={comment.author?.profileImageUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(comment.author?.fullName || 'U')}&background=random`} 
                          alt="Profil" 
                          className="w-10 h-10 rounded-2xl object-cover ring-2 ring-white shadow-sm"
                        />
                        {isAuthorExpert && (
                          <div className="absolute -bottom-1 -right-1 w-4.5 h-4.5 bg-indigo-600 border-2 border-white rounded-full flex items-center justify-center shadow-sm">
                            <ShieldCheck size={9} className="text-white" />
                          </div>
                        )}
                        {isExp && !isAuthorExpert && (
                          <div className="absolute -bottom-1 -right-1 w-4.5 h-4.5 bg-emerald-600 border-2 border-white rounded-full flex items-center justify-center shadow-sm">
                            <HeartPulse size={9} className="text-white" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 flex-wrap mb-2">
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-slate-900 text-xs sm:text-sm truncate">
                                {comment.author?.fullName}
                              </span>
                              {isAuthorExpert && (
                                <span className="bg-indigo-600 text-white text-[8px] px-2 py-0.5 rounded-md font-extrabold uppercase tracking-wider">
                                  UZMAN
                                </span>
                              )}
                              {isExp && (
                                <span className="bg-emerald-600 text-white text-[8px] px-2 py-0.5 rounded-md font-extrabold uppercase tracking-wider flex items-center gap-0.5">
                                  <Star size={8} className="fill-white" /> EV DENEYİMİ
                                </span>
                              )}
                            </div>
                            {isAuthorExpert && comment.author?.expertTitle && (
                              <p className="text-[10px] font-semibold text-indigo-600/80 mt-0.5">
                                {comment.author.expertTitle}
                              </p>
                            )}
                          </div>
                          <span className="text-[10px] font-medium text-slate-400 whitespace-nowrap">
                            {formatRelative(comment.createdAt)}
                          </span>
                        </div>
                        {isExp && (
                          <div className="flex items-center gap-3 mt-1 mb-2 bg-emerald-50/50 px-2.5 py-1 rounded-xl w-fit border border-emerald-100/30 text-[10px] font-bold text-emerald-800">
                            <span>Deneme Süresi: {comment.durationTried}</span>
                            <span className="w-1 h-1 bg-emerald-300 rounded-full" />
                            <span className="flex items-center gap-0.5">
                              Fayda: 
                              {[1, 2, 3, 4, 5].map(star => (
                                <Star key={star} size={9} className={star <= (comment.effectivenessRating || 0) ? 'fill-emerald-600 text-emerald-600' : 'text-slate-300'} />
                              ))}
                            </span>
                          </div>
                        )}
                        <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap font-medium">
                          {comment.content}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageOnboarding
        pageId="knowledge"
        title="Bilgi Bankası"
        description="Uzmanların hazırladığı makaleleri, videoları ve rehberleri buradan okuyabilirsiniz. Otizm hakkında merak ettiğiniz her şeyi arayabilirsiniz."
        steps={[
          {
            icon: <BookOpen size={20} />,
            title: "İstediğinizi Arayın",
            description: "Konuya veya türe göre filtreleyebilirsiniz. Arama kutusuna yazmak da işe yarar."
          },
          {
            icon: <Eye size={20} />,
            title: "Okuyun veya İzleyin",
            description: "Makale, video ya da podcast — size en uygun olanı seçebilirsiniz."
          }
        ]}
      />

      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-50 via-white to-primary-50 border border-primary-100/60 shadow-sm p-6 sm:p-8">
        {/* Dekoratif arka plan öğeleri */}
        <div className="absolute top-0 right-0 -translate-y-1/4 translate-x-1/4 w-64 h-64 bg-primary-200/40 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 translate-y-1/4 -translate-x-1/4 w-48 h-48 bg-indigo-200/40 rounded-full blur-2xl" />

        <div className="relative z-10 flex flex-col md:flex-row gap-6 md:items-center justify-between">
          <div className="flex-1">
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight mb-2">Bilgi Bankası</h1>
            <p className="text-gray-600 text-sm max-w-lg leading-relaxed">
              Uzmanların hazırladığı makaleler, videolar ve podcastler ile çocuğunuzun gelişimini destekleyin.
            </p>
            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              {[
                { icon: Video, label: 'Video rehberler', text: 'YouTube veya direkt video' },
                { icon: CheckCircle, label: 'Uzman onayı', text: 'Yazar ve kategori görünür' },
                { icon: ShieldCheck, label: 'Güvenli not', text: 'Tıbbi karar yerine geçmez' },
              ].map(({ icon: Icon, label, text }) => (
                <div key={label} className="rounded-2xl border border-white/70 bg-white/75 px-3 py-2 shadow-sm">
                  <p className="flex items-center gap-1.5 text-xs font-black text-slate-800">
                    <Icon size={13} className="text-primary-600" />
                    {label}
                  </p>
                  <p className="mt-0.5 text-[10px] font-semibold text-slate-500">{text}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            {/* Search */}
            <div className="relative flex-1 md:w-72 group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search size={18} className="text-gray-400 group-focus-within:text-primary-500 transition-colors" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="İçeriklerde ara..."
                className="w-full pl-10 pr-4 py-3 bg-white/80 backdrop-blur-sm border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-primary-500/10 focus:border-primary-300 transition-all shadow-sm"
              />
            </div>

            <div className="flex gap-2">
              <Button 
                variant={showBookmarksOnly ? 'primary' : 'outline'} 
                onClick={() => { setShowBookmarksOnly(!showBookmarksOnly); setShowMyArticles(false); setActiveCategory(''); setPage(0); }}
                className="rounded-xl shadow-sm whitespace-nowrap"
              >
                <Bookmark size={18} className="mr-2" />
                Kaydedilenler
              </Button>
              {isExpert && (
                <>
                  <Button 
                    variant={showMyArticles ? 'primary' : 'outline'} 
                    onClick={() => { setShowMyArticles(!showMyArticles); setShowBookmarksOnly(false); setActiveCategory(''); setPage(0); }}
                    className="rounded-xl shadow-sm whitespace-nowrap"
                  >
                    <FileText size={18} className="mr-2" />
                    İçeriklerim
                  </Button>
                  <Button onClick={handleOpenCreate} className="rounded-xl shadow-md shadow-primary-200 hover:-translate-y-0.5 transition-transform whitespace-nowrap">
                    <Plus size={18} className="mr-2" />
                    Yeni İçerik
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Category and Content Type Filters */}
      <div className="bg-slate-50/50 border border-slate-100/80 rounded-3xl p-3 sm:p-4 my-3 space-y-4">
        {/* Category Tabs */}
        <div>
          <div className="flex items-center justify-between mb-2.5 px-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Kategoriye Göre Filtrele</span>
            {activeCategory && (
              <button
                onClick={() => { setActiveCategory(''); setPage(0); setShowMyArticles(false); }}
                className="text-[11px] font-bold text-indigo-600 hover:text-indigo-700 transition-colors cursor-pointer"
              >
                Filtreyi Temizle
              </button>
            )}
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1.5 scrollbar-none">
            {CATEGORIES.map(cat => {
              const IconComponent = CATEGORY_ICONS[cat.key] || LayoutGrid;
              const isActive = activeCategory === cat.key && !showMyArticles;
              return (
                <button
                  key={cat.key}
                  onClick={() => { setActiveCategory(cat.key); setPage(0); setShowMyArticles(false); }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer border-2 hover:-translate-y-0.5 transform duration-200 shrink-0 ${
                    isActive
                      ? CATEGORY_ACTIVE_COLORS[cat.key] || 'bg-indigo-50 text-indigo-700 border-indigo-200/60 shadow-sm'
                      : 'bg-white border-slate-100 hover:border-slate-200 text-slate-500 hover:text-slate-700 shadow-sm'
                  }`}
                >
                  <IconComponent size={14} className={isActive ? 'opacity-90' : 'text-slate-400'} />
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Content Type Filter */}
        <div className="border-t border-slate-200/40 pt-3">
          <div className="flex items-center justify-between mb-2.5 px-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">İçerik Türüne Göre Filtrele</span>
            {activeContentType && (
              <button
                onClick={() => { setActiveContentType(''); setPage(0); }}
                className="text-[11px] font-bold text-indigo-600 hover:text-indigo-700 transition-colors cursor-pointer"
              >
                Filtreyi Temizle
              </button>
            )}
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1.5 scrollbar-none">
            {CONTENT_TYPE_TABS.map(tab => {
              const isActive = activeContentType === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => { setActiveContentType(tab.key); setPage(0); }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer border-2 hover:-translate-y-0.5 transform duration-200 shrink-0 ${
                    isActive
                      ? 'bg-indigo-50 text-indigo-700 border-indigo-200/60 shadow-sm'
                      : 'bg-white border-slate-100 hover:border-slate-200 text-slate-500 hover:text-slate-700 shadow-sm'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tag Filter */}
        {availableTags.length > 0 && (
          <div className="border-t border-slate-200/40 pt-3 animate-in fade-in duration-200">
            <div className="flex items-center justify-between mb-2.5 px-1">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">Etiketlere Göre Daralt</span>
              {selectedTagIds.length > 0 && (
                <button
                  onClick={() => { setSelectedTagIds([]); setPage(0); }}
                  className="text-[11px] font-bold text-indigo-600 hover:text-indigo-700 transition-colors cursor-pointer"
                >
                  Filtreleri Temizle
                </button>
              )}
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1.5 scrollbar-none">
              {availableTags.map(tag => {
                const isActive = selectedTagIds.includes(tag.id);
                return (
                  <button
                    key={tag.id}
                    onClick={() => {
                      setSelectedTagIds(prev =>
                        prev.includes(tag.id) ? prev.filter(id => id !== tag.id) : [...prev, tag.id]
                      );
                      setPage(0);
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-2xl text-[11px] font-bold transition-all whitespace-nowrap cursor-pointer border hover:-translate-y-0.5 transform duration-150 shrink-0 ${
                      isActive
                        ? 'bg-indigo-50 text-indigo-700 border-indigo-200/60 shadow-sm'
                        : 'bg-white border-slate-100 hover:border-slate-200 text-slate-500 hover:text-slate-700 shadow-sm'
                    }`}
                  >
                    <span>{tag.name}</span>
                    {isActive && <span className="text-[8px] bg-indigo-600 text-white w-3 h-3 rounded-full flex items-center justify-center">✓</span>}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Recommendations */}
      {user?.role === 'PARENT' && recommendations.length > 0 && !showBookmarksOnly && !showMyArticles && (
        <div className="bg-gradient-to-br from-indigo-50/80 via-white to-primary-50/50 border border-primary-100/50 rounded-3xl p-5 sm:p-6 my-4 shadow-sm animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-center gap-2 mb-4 px-1">
            <Brain size={20} className="text-indigo-600 animate-pulse" />
            <span className="text-sm font-extrabold text-slate-800">Çocuğunuzun Gelişim Alanlarına Özel Öneriler</span>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recommendations.map(article => {
              const view = getArticleView(article);
              return (
                <div
                  key={article.id}
                  onClick={() => handleViewArticle(article)}
                  className="group relative flex flex-col bg-white rounded-2xl border border-slate-100 p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
                >
                  <button
                    onClick={(e) => handleToggleBookmark(article.id, e)}
                    className="absolute right-3 top-3 p-1.5 rounded-xl bg-slate-50/80 hover:bg-slate-100 hover:text-indigo-600 border border-slate-100/50 transition-colors z-10 cursor-pointer"
                  >
                    <Bookmark size={14} className={article.bookmarked ? 'fill-indigo-600 text-indigo-600' : 'text-slate-400'} />
                  </button>
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${CATEGORY_COLORS[article.category || 'Genel'] || 'bg-gray-100 text-gray-700'}`}>
                      {article.category}
                    </span>
                  </div>
                  <h4 className="font-bold text-xs sm:text-sm text-slate-900 line-clamp-2 pr-6 mb-1 group-hover:text-indigo-600 transition-colors">{article.title}</h4>
                  <p className="text-xs text-slate-500 line-clamp-2 mt-1 flex-1">{view.text ? view.text.replace(/<[^>]+>/g, '').substring(0, 80) : ''}...</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Analytics Dashboard */}
      {showMyArticles && analytics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-in fade-in slide-in-from-top-4">
          <div className="bg-white p-5 rounded-3xl border border-indigo-100/50 shadow-sm shadow-indigo-100/20 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center shrink-0">
              <FileText size={24} className="text-indigo-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium mb-0.5">Toplam İçerik</p>
              <h3 className="text-2xl font-bold text-gray-900 leading-none">{analytics.totalArticles}</h3>
            </div>
          </div>
          <div className="bg-white p-5 rounded-3xl border border-green-100/50 shadow-sm shadow-green-100/20 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-green-50 flex items-center justify-center shrink-0">
              <CheckCircle size={24} className="text-green-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium mb-0.5">Yayında</p>
              <h3 className="text-2xl font-bold text-gray-900 leading-none">{analytics.publishedArticles}</h3>
            </div>
          </div>
          <div className="bg-white p-5 rounded-3xl border border-blue-100/50 shadow-sm shadow-blue-100/20 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center shrink-0">
              <Eye size={24} className="text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium mb-0.5">Görüntülenme</p>
              <h3 className="text-2xl font-bold text-gray-900 leading-none">{analytics.totalViews}</h3>
            </div>
          </div>
          <div className="bg-white p-5 rounded-3xl border border-orange-100/50 shadow-sm shadow-orange-100/20 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-orange-50 flex items-center justify-center shrink-0">
              <MessageCircle size={24} className="text-orange-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium mb-0.5">Etkileşim</p>
              <h3 className="text-2xl font-bold text-gray-900 leading-none">{analytics.totalComments}</h3>
            </div>
          </div>
        </div>
      )}

      {/* Articles grid */}
      {filteredArticles.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center animate-in fade-in zoom-in-95 duration-500 bg-white rounded-3xl border border-gray-100 shadow-sm">
          <div className="relative w-24 h-24 mb-6">
            <div className="absolute inset-0 bg-primary-100 rounded-full blur-2xl opacity-60 animate-pulse"></div>
            <div className="relative w-full h-full bg-gradient-to-br from-indigo-50 to-white border border-indigo-100 rounded-3xl flex items-center justify-center shadow-lg rotate-3 hover:rotate-0 transition-transform duration-300">
              <BookOpen size={40} className="text-primary-500" />
            </div>
          </div>
          <h3 className="text-xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent mb-2">Henüz İçerik Yok</h3>
          <p className="text-sm text-gray-500 max-w-xs leading-relaxed mb-6">
            {isExpert ? 'Sistemde henüz içerik bulunmuyor. İlk içeriği siz oluşturun.' : 'Bu kategoride veya aramada henüz içerik bulunmuyor.'}
          </p>
          {isExpert && (
            <Button onClick={handleOpenCreate} className="rounded-xl shadow-md shadow-primary-200">
              <Plus size={16} className="mr-1.5" />İçerik Oluştur
            </Button>
          )}
        </div>
      ) : (
        <>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredArticles.map((article, index) => {
              const parsed = getArticleView(article);
              return (
                <div 
                  key={article.id} 
                  onClick={() => handleViewArticle(article)} 
                  className="group relative flex flex-col bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer animate-in fade-in slide-in-from-bottom-4"
                  style={{ animationFillMode: 'both', animationDelay: `${index * 40}ms` }}
                >
                  <button
                    onClick={(e) => handleToggleBookmark(article.id, e)}
                    className="absolute right-4 top-4 p-1.5 rounded-xl bg-white/80 backdrop-blur-sm hover:bg-white hover:text-indigo-600 border border-slate-100 transition-all z-10 cursor-pointer shadow-sm"
                  >
                    <Bookmark size={15} className={article.bookmarked ? 'fill-indigo-600 text-indigo-600' : 'text-slate-400'} />
                  </button>
                  {/* Content type preview thumbnail for video */}
                  {parsed.type === 'video' && parsed.mediaUrl && (() => {
                    const ytId = getYouTubeId(parsed.mediaUrl);
                    return (
                      <div className="relative w-full rounded-xl overflow-hidden bg-gray-900 mb-3" style={{ paddingTop: '52%' }}>
                        {ytId && (
                        <img
                          src={`https://img.youtube.com/vi/${ytId}/mqdefault.jpg`}
                          alt=""
                          className="absolute inset-0 w-full h-full object-cover opacity-80"
                        />
                        )}
                        {!ytId && (
                          <div className="absolute inset-0 bg-gradient-to-br from-red-700 to-slate-950" />
                        )}
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-12 h-12 rounded-full bg-red-600 flex items-center justify-center shadow-lg">
                            <div className="w-0 h-0 border-t-[8px] border-b-[8px] border-l-[16px] border-t-transparent border-b-transparent border-l-white ml-1" />
                          </div>
                        </div>
                        <div className="absolute left-3 top-3 rounded-full bg-black/60 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-white">
                          Video rehber
                        </div>
                        {watchedVideoIds.has(article.id) && (
                          <div className="absolute right-3 top-3 rounded-full bg-emerald-500 px-2.5 py-1 text-[10px] font-black text-white">
                            İzlendi
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* Podcast icon for podcast type */}
                  {parsed.type === 'podcast' && (
                    <div className="w-full h-20 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 flex items-center justify-center mb-3">
                      <Mic size={32} className="text-white" />
                    </div>
                  )}

                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {isForeignResource(article) ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200/50 flex items-center gap-1">
                          🌍 Yabancı Kaynak
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200/50 flex items-center gap-1">
                          🇹🇷 Yerli Kaynak
                        </span>
                      )}
                      {parsed.type !== 'makale' && (
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${CONTENT_TYPE_COLORS[parsed.type]}`}>
                          {CONTENT_TYPE_LABELS[parsed.type]}
                        </span>
                      )}
                      {article.category && (
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${CATEGORY_COLORS[article.category] || 'bg-gray-100 text-gray-700'}`}>
                          {article.category}
                        </span>
                      )}
                      {article.tags && article.tags.map(t => (
                        <span key={t.id} className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-slate-50 text-slate-400 border border-slate-100">
                          #{t.name}
                        </span>
                      ))}
                      {article.author?.expertTitle && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                          <CheckCircle size={10} className="fill-emerald-100" /> Uzman Onaylı
                        </span>
                      )}
                    </div>
                    <span className="flex items-center gap-1 text-xs text-gray-400 shrink-0">
                      <Eye size={12} /> {article.viewCount}
                    </span>
                  </div>

                  <h3 className="font-semibold text-gray-900 line-clamp-2 mb-2">{article.title}</h3>
                  {parsed.text && (() => {
                    const plainText = parsed.text.replace(/<[^>]+>/g, '');
                    return (
                      <p className="text-sm text-gray-600 line-clamp-3 flex-1 mt-1">
                        {plainText.substring(0, 150)}{plainText.length > 150 ? '...' : ''}
                      </p>
                    );
                  })()}
                  {!parsed.text && parsed.type !== 'makale' && (
                    <p className="text-sm text-gray-400 italic flex-1">
                      {parsed.type === 'video' ? 'Video içeriği' : 'Podcast içeriği'}
                    </p>
                  )}

                  {article.author && (
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
                      <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                        <span className="text-indigo-700 text-[10px] font-medium">{article.author.fullName?.charAt(0)}</span>
                      </div>
                      <p className="text-xs text-gray-500 truncate">{article.author.fullName}</p>
                      <span className="text-xs text-gray-400 ml-auto shrink-0">{formatRelative(article.createdAt)}</span>
                    </div>
                  )}

                  {((isExpert && article.author?.id === user?.id) || user?.role === 'ADMIN') && (
                    <div className="flex gap-1 mt-2" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={(e) => handleTogglePublish(article.id, e)}
                        className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs cursor-pointer transition-colors ${
                          article.published
                            ? 'text-green-600 bg-green-50 hover:bg-green-100'
                            : 'text-gray-500 bg-gray-100 hover:bg-gray-200'
                        }`}
                      >
                        {article.published ? <><CheckCircle size={12} /> Yayında</> : <><XCircle size={12} /> Taslak</>}
                      </button>
                      <button
                        onClick={(e) => handleOpenEdit(article, e)}
                        className="p-1 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-indigo-600 cursor-pointer transition-colors"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setDeleteArticleId(article.id); }}
                        className="p-1 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600 cursor-pointer transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 disabled:opacity-40 cursor-pointer"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-sm text-gray-600">{page + 1} / {totalPages}</span>
              <button
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 disabled:opacity-40 cursor-pointer"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </>
      )}

      {/* Create/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingArticle ? 'İçeriği Düzenle' : 'Yeni İçerik'}
        size="xl"
      >
        <div className="space-y-6 px-1 py-1">
          {/* AI Drafting Section */}
          {!editingArticle && (
            <div className="p-4 bg-gradient-to-r from-indigo-50/70 to-primary-50/50 rounded-2xl border border-indigo-100/50 flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-primary-600 animate-pulse" />
                <span className="text-sm font-bold text-gray-800">Yapay Zeka ile Taslak Oluştur</span>
              </div>
              <p className="text-xs text-gray-500">
                Makale yazmak istediğiniz konuyu kısaca belirtin (örn: "Otizmde beslenme düzeni"), yapay zeka taslak olarak başlığı ve içeriği otomatik doldursun.
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={aiPrompt}
                  onChange={e => setAiPrompt(e.target.value)}
                  placeholder="Konu veya makale başlığı girin..."
                  className="flex-1 px-4 py-2.5 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-400/50 focus:border-primary-400"
                  disabled={generatingDraft}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleGenerateAiDraft();
                    }
                  }}
                />
                <Button
                  onClick={handleGenerateAiDraft}
                  loading={generatingDraft}
                  disabled={!aiPrompt.trim()}
                  className="px-4 py-2.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-sm cursor-pointer whitespace-nowrap"
                >
                  Taslak Üret
                </Button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left side inputs: Title, Type, Category, Source */}
            <div className="lg:col-span-5 space-y-5">
              <Input
                label="Başlık *"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="İçerik başlığı"
              />

              {/* Kategori ve İçerik Türü Side-by-Side */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Kategori</label>
                  <select
                    value={form.category}
                    onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-primary-500/10 focus:border-primary-400 bg-gray-50/50 hover:bg-white transition-all cursor-pointer font-medium"
                  >
                    {CATEGORIES.filter(c => c.key).map(c => (
                      <option key={c.key} value={c.key}>{c.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">İçerik Türü</label>
                  <div className="flex bg-slate-100/70 dark:bg-slate-900/50 p-1 rounded-xl border border-slate-200/50">
                    {[
                      { key: 'makale', label: 'Makale' },
                      { key: 'video', label: 'Video' },
                      { key: 'podcast', label: 'Pod' }
                    ].map(t => (
                      <button
                        key={t.key}
                        type="button"
                        onClick={() => setForm(f => ({ ...f, contentType: t.key as ContentType }))}
                        className={`flex-1 py-1.5 px-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          form.contentType === t.key
                            ? 'bg-white text-indigo-700 shadow-sm border border-slate-200/40'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Media URL if Video/Podcast */}
              {form.contentType !== 'makale' && (
                <Input
                  label={form.contentType === 'video' ? 'Video URL *' : 'Podcast Medya URL *'}
                  value={form.mediaUrl}
                  onChange={e => setForm(f => ({ ...f, mediaUrl: e.target.value }))}
                  placeholder={form.contentType === 'video' ? 'Örn: https://www.youtube.com/watch?v=...' : 'Örn: https://example.com/audio.mp3'}
                />
              )}

              {/* Source fields - Clean and modern container */}
              <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl space-y-4">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                  <span>Kaynak Bilgileri (Opsiyonel)</span>
                  <span className="text-[10px] font-medium text-slate-400 normal-case">Yerli/Yabancı tespiti için</span>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  <Input
                    label="Kaynak Kuruluş / Yazar"
                    value={form.sourceName}
                    onChange={e => setForm(f => ({ ...f, sourceName: e.target.value }))}
                    placeholder="Örn: National Autistic Society"
                    className="bg-white"
                  />
                  <Input
                    label="Kaynak Adresi / URL"
                    value={form.sourceUrl}
                    onChange={e => setForm(f => ({ ...f, sourceUrl: e.target.value }))}
                    placeholder="Örn: https://www.autism.org.uk/..."
                    className="bg-white"
                  />
                </div>
              </div>
            </div>

            {/* Right side: Rich Text Editor */}
            <div className="lg:col-span-7 flex flex-col h-full self-stretch">
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                İçerik {form.contentType === 'makale' ? '*' : '(Açıklama/Özet)'}
              </label>
              <div className="flex-1 flex flex-col min-h-[350px] lg:min-h-[420px]">
                <RichTextEditor
                  value={form.content}
                  onChange={content => setForm(f => ({ ...f, content }))}
                  placeholder={form.contentType === 'makale' ? 'Makale içeriğini buraya yazın...' : 'İçeriğin kısa açıklamasını veya özetini buraya yazın...'}
                  rows={15}
                  textareaClassName="flex-1 min-h-[300px] lg:min-h-[370px]"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t border-gray-100">
            <Button variant="outline" onClick={() => setShowModal(false)} className="px-6 rounded-2xl">İptal</Button>
            <Button variant="outline" onClick={() => handleSave(false)} loading={loading} className="flex-1 rounded-2xl">
              Taslak Olarak Kaydet
            </Button>
            <Button onClick={() => handleSave(true)} loading={loading} className="flex-1 rounded-2xl shadow-md shadow-primary-200 bg-gradient-to-r from-primary-600 to-indigo-600 hover:from-primary-700 hover:to-indigo-700 text-white">
              {editingArticle ? 'Güncelle ve Yayınla' : 'Hemen Yayınla'}
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmModal
        isOpen={!!deleteArticleId}
        title="İçeriği sil?"
        message="Bu içerik kalıcı olarak silinecek."
        confirmLabel="Evet, sil"
        onConfirm={() => deleteArticleId && handleDelete(deleteArticleId)}
        onCancel={() => setDeleteArticleId(null)}
      />
    </div>
  );
}
