import { useCallback, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  BookOpen, Plus, Search, Eye, CheckCircle, XCircle, Edit2, Trash2, ArrowLeft, ChevronLeft, ChevronRight,
  FileText, Video, Mic, Link as LinkIcon, MessageCircle, Send, ShieldCheck
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { RichTextEditor } from '@/components/ui/RichTextEditor';
import { knowledgeService } from '@/services/knowledgeService';
import { useAuthStore } from '@/store/authStore';
import { formatRelative, formatDate } from '@/utils/date';
import type { KnowledgeArticle, ExpertAnalytics, ArticleComment } from '@/types';
import { toast } from '@/store/toastStore';
import { PageOnboarding } from '@/components/ui/PageOnboarding';

const CATEGORIES = [
  { key: '', label: 'Tümü' },
  { key: 'İletişim', label: 'İletişim' },
  { key: 'Davranış', label: 'Davranış' },
  { key: 'Eğitim', label: 'Eğitim' },
  { key: 'Sağlık', label: 'Sağlık' },
  { key: 'Aile', label: 'Aile' },
  { key: 'Genel', label: 'Genel' },
];

const CATEGORY_COLORS: Record<string, string> = {
  'İletişim': 'bg-blue-100 text-blue-700',
  'Davranış': 'bg-orange-100 text-orange-700',
  'Eğitim': 'bg-teal-100 text-teal-700',
  'Sağlık': 'bg-red-100 text-red-700',
  'Aile': 'bg-purple-100 text-purple-700',
  'Genel': 'bg-gray-100 text-gray-700',
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

/** Parses the content field to detect embedded media prefix */
function parseContent(content: string): { type: ContentType; mediaUrl: string; text: string } {
  if (!content) return { type: 'makale', mediaUrl: '', text: '' };
  const match = content.match(/^\[MEDIA:(video|podcast):([^\]]+)\]\n?([\s\S]*)$/);
  if (match) {
    return {
      type: match[1] as ContentType,
      mediaUrl: match[2].trim(),
      text: match[3],
    };
  }
  return { type: 'makale', mediaUrl: '', text: content };
}

/** Builds content string with media prefix */
function buildContent(type: ContentType, mediaUrl: string, text: string): string {
  if (type !== 'makale' && mediaUrl.trim()) {
    return `[MEDIA:${type}:${mediaUrl.trim()}]\n${text}`;
  }
  return text;
}

/** Extract YouTube video ID from various URL formats */
function getYouTubeId(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&?/\s]+)/);
  return match ? match[1] : null;
}

/** Render a video embed for YouTube or generic video URL */
function VideoPlayer({ url }: { url: string }) {
  const ytId = getYouTubeId(url);
  if (ytId) {
    return (
      <div className="relative w-full rounded-xl overflow-hidden bg-black" style={{ paddingTop: '56.25%' }}>
        <iframe
          className="absolute inset-0 w-full h-full"
          src={`https://www.youtube.com/embed/${ytId}`}
          title="Video"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }
  // Generic video file
  return (
    <video controls className="w-full rounded-xl bg-black max-h-96">
      <source src={url} />
      <p className="text-sm text-gray-500 p-4">Tarayıcınız bu video formatını desteklemiyor.</p>
    </video>
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

export function KnowledgePage() {
  const location = useLocation();
  return <KnowledgeContent location={location} />;
}

function KnowledgeContent({ location }: { location: ReturnType<typeof useLocation> }) {
  const user = useAuthStore(s => s.user);
  const isExpert = user?.role === 'EXPERT' || user?.role === 'ADMIN';

  const [articles, setArticles] = useState<KnowledgeArticle[]>([]);
  const [selectedArticle, setSelectedArticle] = useState<KnowledgeArticle | null>(null);
  const [activeCategory, setActiveCategory] = useState('');
  const [activeContentType, setActiveContentType] = useState<ContentType | ''>('');
  const [showMyArticles, setShowMyArticles] = useState(false);
  const [analytics, setAnalytics] = useState<ExpertAnalytics | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
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
  });

  const loadArticles = async () => {
    try {
      let data;
      if (showMyArticles) {
        data = await knowledgeService.getMy(page);
        if (isExpert && page === 0) {
          const stats = await knowledgeService.getMyAnalytics();
          setAnalytics(stats);
        }
      } else if (activeCategory) {
        data = await knowledgeService.getByCategory(activeCategory, page);
      } else {
        data = await knowledgeService.getAll(page);
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
    }
  }, [loadComments, selectedArticle]);

  const handleAddComment = async () => {
    if (!newComment.trim() || !selectedArticle) return;
    setSubmittingComment(true);
    try {
      const comment = await knowledgeService.addComment(selectedArticle.id, newComment);
      setComments([comment, ...comments]);
      setNewComment('');
      toast.success('Yorumunuz eklendi.');
    } catch {
      toast.error('Yorum eklenirken hata oluştu.');
    }
    setSubmittingComment(false);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadArticles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCategory, page, showMyArticles]);

  useEffect(() => {
    const openArticleId = (location.state as { openArticleId?: string } | null)?.openArticleId;
    if (openArticleId) {
      knowledgeService.getOne(openArticleId).then(setSelectedArticle).catch(() => {});
      window.history.replaceState({}, '');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleViewArticle = async (article: KnowledgeArticle) => {
    try {
      const full = await knowledgeService.getOne(article.id);
      setSelectedArticle(full);
    } catch { /* ignore */ }
  };

  const handleOpenCreate = () => {
    setEditingArticle(null);
    setForm({ title: '', content: '', category: 'Genel', contentType: 'makale', mediaUrl: '' });
    setShowModal(true);
  };

  const handleOpenEdit = (article: KnowledgeArticle, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingArticle(article);
    const parsed = parseContent(article.content);
    setForm({
      title: article.title,
      content: parsed.text,
      category: article.category || 'Genel',
      contentType: parsed.type,
      mediaUrl: parsed.mediaUrl,
    });
    setShowModal(true);
  };

  const handleSave = async (publish: boolean) => {
    if (!form.title || (!form.content && !form.mediaUrl)) {
      toast.error('Başlık ve içerik gerekli.');
      return;
    }
    setLoading(true);
    try {
      const finalContent = buildContent(form.contentType, form.mediaUrl, form.content);
      if (editingArticle) {
        await knowledgeService.update(editingArticle.id, { title: form.title, content: finalContent, category: form.category, published: publish });
        setShowModal(false);
        loadArticles();
        toast.success(publish ? 'İçerik güncellendi ve yayınlandı.' : 'İçerik güncellendi.');
      } else {
        await knowledgeService.create({ title: form.title, content: finalContent, category: form.category, published: publish });
        setShowModal(false);
        setActiveCategory('');
        setPage(0);
        setShowMyArticles(true);
        toast.success(publish ? 'İçerik başarıyla yayınlandı.' : 'İçerik taslak olarak kaydedildi.');
        // loadArticles will be triggered via useEffect because showMyArticles changes
      }
    } catch { toast.error('İçerik kaydedilemedi.'); }
    setLoading(false);
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

  // Filter articles by content type (client-side)
  const filteredArticles = articles.filter(a => {
    const matchesSearch = !searchQuery ||
      a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.content.toLowerCase().includes(searchQuery.toLowerCase());
    const parsed = parseContent(a.content);
    const matchesType = !activeContentType || parsed.type === activeContentType;
    const matchesCategory = !showMyArticles || !activeCategory || a.category === activeCategory;
    return matchesSearch && matchesType && matchesCategory;
  });

  // Article detail view
  if (selectedArticle) {
    const parsed = parseContent(selectedArticle.content);
    const isWatchedVideo = parsed.type === 'video' && watchedVideoIds.has(selectedArticle.id);
    return (
      <div className="space-y-6">
        <button
          onClick={() => setSelectedArticle(null)}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 cursor-pointer"
        >
          <ArrowLeft size={18} /> Geri
        </button>

        <Card>
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              {/* Content type badge */}
              {parsed.type !== 'makale' && (
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${CONTENT_TYPE_COLORS[parsed.type]}`}>
                  {CONTENT_TYPE_LABELS[parsed.type]}
                </span>
              )}
              {selectedArticle.category && (
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${CATEGORY_COLORS[selectedArticle.category] || 'bg-gray-100 text-gray-700'}`}>
                  {selectedArticle.category}
                </span>
              )}
              {selectedArticle.author?.expertTitle && (
                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                  <CheckCircle size={12} className="fill-emerald-100" /> Uzman Onaylı
                </span>
              )}
              <span className="flex items-center gap-1 text-xs text-gray-400">
                <Eye size={12} /> {selectedArticle.viewCount} görüntülenme
              </span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{selectedArticle.title}</h1>
            {selectedArticle.author && (
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
                  <span className="text-indigo-700 text-sm font-medium">{selectedArticle.author.fullName?.charAt(0)}</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{selectedArticle.author.fullName}</p>
                  {selectedArticle.author.expertTitle && (
                    <p className="text-xs text-gray-500">{selectedArticle.author.expertTitle}</p>
                  )}
                </div>
                <span className="text-xs text-gray-400 ml-2">{formatDate(selectedArticle.createdAt)}</span>
              </div>
            )}
          </div>

          {/* Media player */}
          {parsed.type === 'video' && parsed.mediaUrl && (
            <div className="mb-6 space-y-3">
              <VideoPlayer url={parsed.mediaUrl} />
              <div className="rounded-2xl border border-red-100 bg-red-50/70 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 text-sm font-bold text-red-950">
                      <Video size={15} />
                      Video rehber
                    </p>
                    <p className="mt-1 text-xs font-semibold leading-5 text-red-700">
                      İzlerken kısa not alın; kişisel tanı, tedavi veya ilaç kararı için mutlaka kendi uzmanınıza danışın.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => markVideoWatched(selectedArticle.id)}
                    className={`inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition-colors ${
                      isWatchedVideo
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-white text-red-700 ring-1 ring-red-100 hover:bg-red-100'
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
            <div className="mb-6">
              <AudioPlayer url={parsed.mediaUrl} />
            </div>
          )}

          {/* Text content */}
          {parsed.text && (
            <div 
              className="prose max-w-none prose-indigo prose-a:text-indigo-600 hover:prose-a:text-indigo-500"
              dangerouslySetInnerHTML={{ __html: parsed.text }}
            />
          )}

          <div className="mt-6 rounded-2xl border border-amber-100 bg-amber-50/70 p-4">
            <p className="flex items-center gap-1.5 text-sm font-bold text-amber-950">
              <ShieldCheck size={15} />
              Güvenli kullanım notu
            </p>
            <p className="mt-1 text-xs font-semibold leading-5 text-amber-800">
              Bu içerik bilgilendirme amaçlıdır; tanı, tedavi, ilaç veya kriz müdahalesi kararı yerine geçmez.
            </p>
          </div>

          {isExpert && selectedArticle.author?.id === user?.id && (
            <div className="flex gap-2 mt-6 pt-4 border-t border-gray-100">
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => { setSelectedArticle(null); handleOpenEdit(selectedArticle, e); }}
              >
                <Edit2 size={14} className="mr-1" /> Düzenle
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
              >
                {selectedArticle.published ? (
                  <><XCircle size={14} className="mr-1" /> Yayından Kaldır</>
                ) : (
                  <><CheckCircle size={14} className="mr-1" /> Yayınla</>
                )}
              </Button>
            </div>
          )}
        </Card>

        {/* Comments Section */}
        <div className="mt-8 bg-white rounded-3xl p-6 sm:p-10 border border-gray-100 shadow-sm animate-in fade-in slide-in-from-bottom-4">
          <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <MessageCircle className="text-indigo-600" />
            Sorular ve Yorumlar ({comments.length})
          </h3>

          <div className="flex gap-4 mb-8">
            <img 
              src={user?.profileImageUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.fullName || 'U')}&background=random`} 
              alt="Profil" 
              className="w-10 h-10 rounded-full object-cover shrink-0 ring-2 ring-indigo-50"
            />
            <div className="flex-1 flex gap-2">
              <input
                type="text"
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                placeholder="Aklınıza takılan bir soru sorun veya yorum yapın..."
                className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all text-sm"
                onKeyDown={e => e.key === 'Enter' && handleAddComment()}
              />
              <Button 
                onClick={handleAddComment} 
                loading={submittingComment}
                className="rounded-2xl px-6 bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-200"
              >
                <Send size={18} />
              </Button>
            </div>
          </div>

          <div className="space-y-6">
            {loadingComments ? (
              <div className="flex justify-center py-8">
                <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
              </div>
            ) : comments.length === 0 ? (
              <div className="text-center py-10 text-gray-500">
                <MessageCircle size={48} className="mx-auto mb-3 text-gray-200" />
                <p>İlk soruyu siz sorun!</p>
              </div>
            ) : (
              comments.map(comment => (
                <div key={comment.id} className="flex gap-4 p-4 rounded-2xl hover:bg-gray-50 transition-colors">
                  <img 
                    src={comment.author?.profileImageUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(comment.author?.fullName || 'U')}&background=random`} 
                    alt="Profil" 
                    className="w-10 h-10 rounded-full object-cover shrink-0 ring-2 ring-gray-100"
                  />
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-gray-900 text-sm">{comment.author?.fullName}</span>
                      {comment.author?.role === 'EXPERT' && (
                        <span className="bg-indigo-100 text-indigo-700 text-[10px] px-2 py-0.5 rounded-full font-bold">UZMAN</span>
                      )}
                      <span className="text-xs text-gray-400">• {formatRelative(comment.createdAt)}</span>
                    </div>
                    <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">{comment.content}</p>
                  </div>
                </div>
              ))
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

            {isExpert && (
              <div className="flex gap-2">
                <Button 
                  variant={showMyArticles ? 'primary' : 'outline'} 
                  onClick={() => { setShowMyArticles(!showMyArticles); setActiveCategory(''); setPage(0); }}
                  className="rounded-xl shadow-sm whitespace-nowrap"
                >
                  <FileText size={18} className="mr-2" />
                  İçeriklerim
                </Button>
                <Button onClick={handleOpenCreate} className="rounded-xl shadow-md shadow-primary-200 hover:-translate-y-0.5 transition-transform whitespace-nowrap">
                  <Plus size={18} className="mr-2" />
                  Yeni İçerik
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {/* Content type filter */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
          {CONTENT_TYPE_TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveContentType(tab.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap cursor-pointer ${
                activeContentType === tab.key
                  ? 'bg-primary-600 text-white shadow-md shadow-primary-200 scale-105'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <div className={`${activeContentType === tab.key ? 'text-primary-100' : 'text-gray-400'}`}>
                {tab.icon}
              </div>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Category tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
          {CATEGORIES.map(cat => (
            <button
              key={cat.key}
              onClick={() => { setActiveCategory(cat.key); setPage(0); setShowMyArticles(false); }}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap cursor-pointer border ${
                activeCategory === cat.key && !showMyArticles
                  ? 'bg-indigo-50 text-indigo-700 border-indigo-200 shadow-sm'
                  : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

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
              const parsed = parseContent(article.content);
              return (
                <div 
                  key={article.id} 
                  onClick={() => handleViewArticle(article)} 
                  className="group flex flex-col bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer animate-in fade-in slide-in-from-bottom-4"
                  style={{ animationFillMode: 'both', animationDelay: `${index * 40}ms` }}
                >
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

                  {isExpert && article.author?.id === user?.id && (
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
      >
        <div className="space-y-5 px-1 py-2">
          <Input
            label="Başlık *"
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            placeholder="İçerik başlığı"
          />

          {/* Content type selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">İçerik Türü</label>
            <div className="grid grid-cols-3 gap-3">
              {(['makale', 'video', 'podcast'] as ContentType[]).map(type => (
                <button
                  key={type}
                  onClick={() => setForm(f => ({ ...f, contentType: type, mediaUrl: '' }))}
                  className={`flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border-2 text-sm font-semibold transition-all cursor-pointer ${
                    form.contentType === type
                      ? 'border-primary-500 bg-primary-50/50 text-primary-700 shadow-md shadow-primary-100 scale-[1.02]'
                      : 'border-gray-100 bg-white text-gray-500 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className={`p-2 rounded-xl ${form.contentType === type ? 'bg-primary-100 text-primary-600' : 'bg-gray-100 text-gray-400'}`}>
                    {type === 'makale' && <FileText size={22} />}
                    {type === 'video' && <Video size={22} />}
                    {type === 'podcast' && <Mic size={22} />}
                  </div>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Kategori</label>
            <select
              value={form.category}
              onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
              className="w-full px-4 py-3 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-4 focus:ring-primary-500/10 focus:border-primary-400 bg-gray-50/50 hover:bg-white transition-all cursor-pointer"
            >
              {CATEGORIES.filter(c => c.key).map(c => (
                <option key={c.key} value={c.key}>{c.label}</option>
              ))}
            </select>
          </div>

          {/* Media URL for video/podcast */}
          {form.contentType !== 'makale' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                <LinkIcon size={14} className="inline mr-1.5 text-gray-400" />
                {form.contentType === 'video' ? 'Video URL (YouTube veya direkt link) *' : 'Podcast URL (ses dosyası) *'}
              </label>
              <input
                type="url"
                value={form.mediaUrl}
                onChange={e => setForm(f => ({ ...f, mediaUrl: e.target.value }))}
                placeholder={
                  form.contentType === 'video'
                    ? 'https://www.youtube.com/watch?v=...'
                    : 'https://example.com/podcast.mp3'
                }
                className="w-full px-4 py-3 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-4 focus:ring-primary-500/10 focus:border-primary-400 bg-gray-50/50 hover:bg-white transition-all"
              />
              {form.contentType === 'video' && form.mediaUrl && getYouTubeId(form.mediaUrl) && (
                <div className="mt-3 p-3 bg-gradient-to-r from-red-50 to-red-100/50 border border-red-100 rounded-2xl flex items-center gap-3 animate-in fade-in zoom-in-95">
                  <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                    <Video size={16} className="text-red-600" />
                  </div>
                  <span className="text-sm font-semibold text-red-800">YouTube videosu algılandı ✓</span>
                </div>
              )}
            </div>
          )}

          {/* Text content */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              {form.contentType === 'makale' ? 'İçerik *' : 'Açıklama (isteğe bağlı)'}
            </label>
            {form.contentType === 'makale' ? (
              <RichTextEditor
                value={form.content}
                onChange={content => setForm(f => ({ ...f, content }))}
                placeholder="Makale içeriğini buraya yazın..."
                rows={12}
                textareaClassName="min-h-[250px]"
              />
            ) : (
              <textarea
                value={form.content}
                onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                rows={4}
                placeholder="Bu içerik hakkında kısa bir açıklama..."
                className="w-full px-4 py-3 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-4 focus:ring-primary-500/10 focus:border-primary-400 bg-gray-50/50 hover:bg-white transition-all resize-none"
              />
            )}
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
