import { useEffect, useState, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useInView } from 'react-intersection-observer';
import {
  BookOpen, Plus, MessageSquare, Heart, ArrowLeft, Check, ChevronUp,
  ChevronDown, HelpCircle, Lightbulb, Award, Filter, X, EyeOff,
  ShieldCheck, Tag as TagIcon, Flag, Pencil, Trash2, Reply, Search, Users
} from 'lucide-react';
import { Card, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { Badge } from '@/components/ui/Badge';
import { RichTextEditor } from '@/components/ui/RichTextEditor';
import { ReportModal } from '@/components/forum/ReportModal';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { forumService } from '@/services/forumService';
import { tagService } from '@/services/tagService';
import { formatRelative } from '@/utils/date';
import { useAuthStore } from '@/store/authStore';
import { WeeklyTopicWidget } from '@/components/WeeklyTopicWidget';
import type { WeeklyTopic } from '@/components/WeeklyTopicWidget';
import type { ForumPost, ForumComment, Tag, PostPrivacySettings } from '@/types';
import { toast } from '@/store/toastStore';
import { htmlToPlainText, sanitizeHtml } from '@/utils/sanitizeHtml';
type TabType = 'DENEYIM' | 'QUESTION' | 'TAVSIYE' | 'BASARI_HIKAYESI';

const TABS: { key: TabType; label: string; icon: React.ReactNode }[] = [
  { key: 'DENEYIM', label: 'Deneyimler', icon: <BookOpen size={16} /> },
  { key: 'QUESTION', label: 'Soru-Cevap', icon: <HelpCircle size={16} /> },
  { key: 'TAVSIYE', label: 'Tavsiyeler', icon: <Lightbulb size={16} /> },
  { key: 'BASARI_HIKAYESI', label: 'Başarı Hikayeleri', icon: <Award size={16} /> },
];

const CATEGORY_LABELS: Record<string, string> = {
  ILETISIM: 'İletişim',
  SOSYAL: 'Sosyal',
  DUYUSAL: 'Duyusal',
  DAVRANIS: 'Davranış',
  MOTOR: 'Motor',
  EGITIM: 'Eğitim',
};

const CATEGORY_COLORS: Record<string, string> = {
  ILETISIM: 'bg-blue-100 text-blue-700 border-blue-200',
  SOSYAL: 'bg-green-100 text-green-700 border-green-200',
  DUYUSAL: 'bg-purple-100 text-purple-700 border-purple-200',
  DAVRANIS: 'bg-orange-100 text-orange-700 border-orange-200',
  MOTOR: 'bg-red-100 text-red-700 border-red-200',
  EGITIM: 'bg-teal-100 text-teal-700 border-teal-200',
};

const defaultPrivacy: PostPrivacySettings = {
  showRealName: true,
  showChildAge: true,
  showSymptoms: true,
  showDiagnosis: false,
  allowMatching: true,
};

function emptyForm(postType: string) {
  return { title: '', content: '', category: '', postType, tagIds: [] as string[], anonymous: false, privacySettings: { ...defaultPrivacy } };
}

export function ForumPage() {
  const location = useLocation();
  return <ForumContent location={location} />;
}

function ForumContent({ location }: { location: ReturnType<typeof useLocation> }) {
  const user = useAuthStore(s => s.user);
  const navigate = useNavigate();
  const openPostId = (location.state as { openPostId?: string } | null)?.openPostId;
  const [activeTab, setActiveTab] = useState<TabType>('DENEYIM');
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [selectedPost, setSelectedPost] = useState<ForumPost | null>(null);
  const [comments, setComments] = useState<ForumComment[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [newComment, setNewComment] = useState('');
  const [allTags, setAllTags] = useState<Record<string, Tag[]>>({});
  const [selectedTagIds, setSelectedTagIds] = useState<Set<string>>(new Set());
  const [showTagFilter, setShowTagFilter] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [sortMode, setSortMode] = useState<'new' | 'hot' | 'unanswered' | 'expert'>('new');
  const [showIntro, setShowIntro] = useState(() => {
    const stored = localStorage.getItem('forum_intro_visible');
    return stored === 'true';
  });

  const toggleIntro = () => {
    setShowIntro(prev => {
      const next = !prev;
      localStorage.setItem('forum_intro_visible', String(next));
      return next;
    });
  };

  const [form, setForm] = useState(emptyForm('DENEYIM'));

  // Pagination
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);

  // Edit post
  const [deletePostId, setDeletePostId] = useState<string | null>(null);
  const [editingPost, setEditingPost] = useState<ForumPost | null>(null);
  const [editForm, setEditForm] = useState({ title: '', content: '' });
  const [editLoading, setEditLoading] = useState(false);

  // Reply
  const [replyingTo, setReplyingTo] = useState<ForumComment | null>(null);
  const [replyContent, setReplyContent] = useState('');

  // Edit/delete comment
  const [editingComment, setEditingComment] = useState<ForumComment | null>(null);
  const [editCommentContent, setEditCommentContent] = useState('');
  const [deleteCommentId, setDeleteCommentId] = useState<string | null>(null);

  const [reportModal, setReportModal] = useState<{ open: boolean; targetType: string; targetId: string }>({
    open: false,
    targetType: 'POST',
    targetId: '',
  });

  const { ref: loadMoreRef, inView } = useInView({
    threshold: 0,
  });

  useEffect(() => {
    tagService.getTagsByCategory().then(setAllTags).catch(() => {});
    if (openPostId) {
      forumService.getPost(openPostId).then(post => {
        setSelectedPost(post);
        forumService.getComments(openPostId).then(d => setComments(d.content)).catch(() => {});
      }).catch(() => {});
      window.history.replaceState({}, '');
    }
  }, [openPostId]);

  const loadPosts = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      setPage(0);
      const data = await forumService.getPosts({
        type: activeTab,
        tagIds: selectedTagIds.size > 0 ? Array.from(selectedTagIds) : undefined,
        q: appliedSearch || undefined,
        sort: sortMode,
        page: 0,
      });
      setPosts(data.content);
      setTotalPages(data.totalPages);
    } catch (error) {
      setPosts([]);
      setTotalPages(1);
      setLoadError(error instanceof Error ? error.message : 'Gönderiler yüklenemedi.');
    } finally {
      setLoading(false);
    }
  }, [activeTab, appliedSearch, selectedTagIds, sortMode]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { loadPosts(); }, [loadPosts]);

  const handleLoadMorePosts = useCallback(async () => {
    if (loadingMore) return;
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const data = await forumService.getPosts({
        type: activeTab,
        tagIds: selectedTagIds.size > 0 ? Array.from(selectedTagIds) : undefined,
        q: appliedSearch || undefined,
        sort: sortMode,
        page: nextPage,
      });
      setPosts(prev => [...prev, ...data.content]);
      setPage(nextPage);
      setTotalPages(data.totalPages);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Daha fazla gönderi yüklenemedi.');
    }
    setLoadingMore(false);
  }, [activeTab, appliedSearch, loadingMore, page, selectedTagIds, sortMode]);

  useEffect(() => {
    if (inView && page < totalPages - 1 && !loadingMore) {
      queueMicrotask(() => handleLoadMorePosts());
    }
  }, [handleLoadMorePosts, inView, loadingMore, page, totalPages]);

  const handleViewPost = async (post: ForumPost) => {
    try {
      const fullPost = await forumService.getPost(post.id);
      setSelectedPost(fullPost);
      const data = await forumService.getComments(post.id);
      setComments(data.content);
    } catch { /* ignore */ }
  };

  const handleCreatePost = async () => {
    if (!form.title || !form.content) return;
    setLoading(true);
    try {
      await forumService.createPost({
        title: form.title,
        content: form.content,
        category: form.category,
        postType: form.postType as ForumPost['postType'],
        tagIds: form.tagIds,
        anonymous: form.anonymous,
        privacySettings: form.privacySettings,
      });
      setShowModal(false);
      setForm(emptyForm(activeTab));
      loadPosts();
      toast.success('Gönderi paylaşıldı.');
    } catch { toast.error('Gönderi oluşturulamadı.'); }
    setLoading(false);
  };

  const handleEditPost = async () => {
    if (!editingPost || !editForm.title || !editForm.content) return;
    setEditLoading(true);
    try {
      const updated = await forumService.updatePost(editingPost.id, { title: editForm.title, content: editForm.content });
      if (selectedPost?.id === updated.id) {
        setSelectedPost(updated);
      }
      setPosts(prev => prev.map(p => p.id === updated.id ? updated : p));
      setEditingPost(null);
      toast.success('Gönderi güncellendi.');
    } catch { toast.error('Gönderi güncellenemedi.'); }
    setEditLoading(false);
  };

  const handleDeletePost = async (postId: string) => {
    try {
      await forumService.deletePost(postId);
      if (selectedPost?.id === postId) {
        setSelectedPost(null);
      }
      setPosts(prev => prev.filter(p => p.id !== postId));
      toast.success('Gönderi silindi.');
    } catch { toast.error('Gönderi silinemedi.'); }
    setDeletePostId(null);
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !selectedPost) return;
    try {
      const comment = await forumService.createComment(selectedPost.id, { content: newComment });
      setComments(prev => [...prev, comment]);
      setNewComment('');
      setSelectedPost(prev => prev ? { ...prev, commentCount: prev.commentCount + 1 } : null);
      setPosts(prev => prev.map(p => p.id === selectedPost.id ? { ...p, commentCount: p.commentCount + 1 } : p));
      toast.success('Yorum eklendi.');
    } catch { toast.error('Yorum eklenemedi.'); }
  };

  const handleAddReply = async () => {
    if (!replyContent.trim() || !selectedPost || !replyingTo) return;
    try {
      const comment = await forumService.createComment(selectedPost.id, { content: replyContent, parentCommentId: replyingTo.id });
      setComments(prev => [...prev, comment]);
      setReplyContent('');
      setReplyingTo(null);
      setSelectedPost(prev => prev ? { ...prev, commentCount: prev.commentCount + 1 } : null);
      setPosts(prev => prev.map(p => p.id === selectedPost.id ? { ...p, commentCount: p.commentCount + 1 } : p));
      toast.success('Yanıt eklendi.');
    } catch { toast.error('Yanıt eklenemedi.'); }
  };

  const handleVotePost = async (postId: string, value: number) => {
    try {
      await forumService.toggleVote({ targetType: 'POST', targetId: postId, voteValue: value });
      const updated = await forumService.getPost(postId);
      if (selectedPost?.id === postId) {
        setSelectedPost(updated);
      }
      setPosts(prev => prev.map(p => p.id === postId ? updated : p));
    } catch { /* ignore */ }
  };

  const handleVoteComment = async (commentId: string, value: number) => {
    try {
      await forumService.toggleVote({ targetType: 'COMMENT', targetId: commentId, voteValue: value });
      if (selectedPost) {
        const data = await forumService.getComments(selectedPost.id);
        setComments(data.content);
      }
    } catch { /* ignore */ }
  };

  const handleAcceptAnswer = async (commentId: string) => {
    if (!selectedPost) return;
    try {
      const updated = await forumService.acceptAnswer(selectedPost.id, commentId);
      setSelectedPost(updated);
      setPosts(prev => prev.map(p => p.id === updated.id ? updated : p));
      const data = await forumService.getComments(selectedPost.id);
      setComments(data.content);
      toast.success('En iyi cevap işaretlendi.');
    } catch { toast.error('Cevap kabul edilemedi.'); }
  };

  const handleSaveEditComment = async () => {
    if (!editingComment || !editCommentContent.trim() || !selectedPost) return;
    try {
      const updated = await forumService.updateComment(selectedPost.id, editingComment.id, editCommentContent.trim());
      setComments(prev => prev.map(c => c.id === updated.id ? updated : c));
      setEditingComment(null);
      toast.success('Yorum güncellendi.');
    } catch { toast.error('Yorum güncellenemedi.'); }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!selectedPost) return;
    try {
      await forumService.deleteComment(selectedPost.id, commentId);
      setComments(prev => prev.filter(c => c.id !== commentId));
      setSelectedPost(p => p ? { ...p, commentCount: Math.max(0, (p.commentCount ?? 1) - 1) } : p);
      setPosts(prev => prev.map(p => p.id === selectedPost.id ? { ...p, commentCount: Math.max(0, (p.commentCount ?? 1) - 1) } : p));
      setDeleteCommentId(null);
      toast.success('Yorum silindi.');
    } catch { toast.error('Yorum silinemedi.'); }
  };

  const toggleFormTag = (tagId: string) => {
    setForm(prev => ({
      ...prev,
      tagIds: prev.tagIds.includes(tagId)
        ? prev.tagIds.filter(id => id !== tagId)
        : [...prev.tagIds, tagId],
    }));
  };

  const toggleFilterTag = (tagId: string) => {
    setSelectedTagIds(prev => {
      const next = new Set(prev);
      if (next.has(tagId)) next.delete(tagId);
      else next.add(tagId);
      return next;
    });
  };

  const openCreatePost = (postType: TabType = activeTab, overrides: Partial<ReturnType<typeof emptyForm>> = {}) => {
    setActiveTab(postType);
    setForm({ ...emptyForm(postType), ...overrides });
    setShowModal(true);
  };

  const openAnonymousShare = () => {
    openCreatePost(activeTab, {
      anonymous: true,
      privacySettings: {
        ...defaultPrivacy,
        showRealName: false,
        showDiagnosis: false,
      },
    });
  };

  const handleJoinWeeklyTopic = (topic: WeeklyTopic) => {
    setActiveTab('DENEYIM');
    setForm({
      ...emptyForm('DENEYIM'),
      title: topic.title,
      postType: 'DENEYIM',
    });
    setShowModal(true);
  };

  const communityStats = {
    unansweredQuestions: posts.filter(post => post.postType === 'QUESTION' && !post.answered).length,
    answeredQuestions: posts.filter(post => post.postType === 'QUESTION' && post.answered).length,
    anonymousPosts: posts.filter(post => post.anonymous).length,
    activeTags: new Set(posts.flatMap(post => post.tags?.map(tag => tag.id) ?? [])).size,
  };

  // Group comments: top-level and replies
  const topLevelComments = comments.filter(c => !c.parentCommentId);
  const repliesMap: Record<string, ForumComment[]> = {};
  comments.filter(c => c.parentCommentId).forEach(c => {
    const key = c.parentCommentId!;
    if (!repliesMap[key]) repliesMap[key] = [];
    repliesMap[key].push(c);
  });

  // Post detail view
  if (selectedPost) {
    const isAuthor = !!selectedPost.ownedByMe || user?.id === selectedPost.author?.id;
    const isQuestion = selectedPost.postType === 'QUESTION';

    return (
      <div className="mx-auto max-w-5xl space-y-5 pb-10">
        <button onClick={() => setSelectedPost(null)} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 shadow-sm transition-all hover:border-primary-200 hover:text-primary-700 hover:shadow cursor-pointer">
          <ArrowLeft size={18} /> Geri
        </button>

        <Card className="overflow-hidden border-slate-200 shadow-md shadow-slate-200/60">
          <div className="border-b border-slate-100 bg-gradient-to-r from-primary-50 via-white to-indigo-50 px-6 py-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex min-w-0 items-start gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500 to-indigo-600 text-white shadow-lg shadow-primary-200">
                  <span className="text-lg font-black">{(selectedPost.anonymous ? 'A' : selectedPost.author?.fullName?.charAt(0)) || 'A'}</span>
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-bold text-slate-900">{selectedPost.anonymous ? 'Anonim Kullanıcı' : selectedPost.author?.fullName}</p>
                    {!selectedPost.anonymous && selectedPost.author?.role === 'EXPERT' && (
                      <Badge variant="success" className="py-0 px-1.5 text-[10px] flex items-center gap-1">
                        <Check size={10} /> Uzman{selectedPost.author.expertTitle ? `: ${selectedPost.author.expertTitle}` : ''}
                      </Badge>
                    )}
                    {!selectedPost.anonymous && selectedPost.author?.verified && (
                      <ShieldCheck size={14} className="text-blue-500" />
                    )}
                  </div>
                  <p className="mt-0.5 text-xs font-medium text-slate-400">{formatRelative(selectedPost.createdAt)}</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                {isQuestion && selectedPost.answered && (
                  <Badge variant="success">Cevaplanmış</Badge>
                )}
                <Badge variant="info">
                  {TABS.find(t => t.key === selectedPost.postType)?.label || selectedPost.postType}
                </Badge>
                {isAuthor && (
                  <div className="ml-1 flex items-center gap-1 rounded-xl border border-slate-200 bg-white/80 p-1 shadow-sm">
                    <button
                      onClick={() => { setEditingPost(selectedPost); setEditForm({ title: selectedPost.title, content: selectedPost.content }); }}
                      className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
                      title="Düzenle"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      onClick={() => setDeletePostId(selectedPost.id)}
                      className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500 cursor-pointer"
                      title="Sil"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="px-6 py-6">
            <h2 className="text-2xl font-black leading-tight text-slate-950 sm:text-3xl">{selectedPost.title}</h2>

            {selectedPost.tags && selectedPost.tags.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {selectedPost.tags.map(tag => (
                  <span key={tag.id} className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-bold ${CATEGORY_COLORS[tag.category] || 'bg-gray-100 text-gray-700 border-gray-200'}`}>
                    {tag.name}
                  </span>
                ))}
              </div>
            )}

            <div className="mt-5 rounded-2xl bg-slate-50/70 px-5 py-4 text-[15px] leading-7 text-slate-700 ring-1 ring-inset ring-slate-100 [&_p]:mb-3 [&_p:last-child]:mb-0" dangerouslySetInnerHTML={{ __html: sanitizeHtml(selectedPost.content) }} />
          </div>

          <div className="flex items-center gap-3 border-t border-slate-100 bg-white px-6 py-4 text-sm font-semibold text-slate-500">
            <button
              onClick={() => handleVotePost(selectedPost.id, 1)}
              className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 transition-colors cursor-pointer ${selectedPost.likedByMe ? 'bg-red-50 text-red-600' : 'hover:bg-red-50 hover:text-red-600'}`}
            >
              <Heart size={16} fill={selectedPost.likedByMe ? 'currentColor' : 'none'} /> {selectedPost.likeCount}
            </button>
            <span className="inline-flex items-center gap-2 rounded-xl px-3 py-2"><MessageSquare size={16} /> {selectedPost.commentCount}</span>
          </div>
        </Card>

        <Card className="overflow-hidden border-slate-200 shadow-md shadow-slate-200/50">
          <div className="flex flex-col gap-1 border-b border-slate-100 bg-white px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-xl">
                {isQuestion ? 'Cevaplar' : 'Yorumlar'}
              </CardTitle>
              <p className="mt-1 text-sm text-slate-500">{comments.length} paylaşım var</p>
            </div>
            <Badge variant={isQuestion ? 'info' : 'default'}>{isQuestion ? 'Soru-Cevap' : 'Topluluk'}</Badge>
          </div>

          <div className="border-b border-slate-100 bg-slate-50/80 px-6 py-4">
            <div className="flex gap-3">
              <div className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-sm font-black text-primary-600 shadow-sm ring-1 ring-slate-100 sm:flex">
                {user?.fullName?.charAt(0) || 'Y'}
              </div>
              <div className="flex flex-1 gap-2 rounded-2xl bg-white p-2 shadow-sm ring-1 ring-slate-200 focus-within:ring-2 focus-within:ring-primary-200">
                <input
                  type="text"
                  value={newComment}
                  onChange={e => setNewComment(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddComment()}
                  placeholder={isQuestion ? 'Cevabınızı yazın...' : 'Yorum yazın...'}
                  className="min-w-0 flex-1 bg-transparent px-2 text-sm text-slate-700 outline-none placeholder:text-slate-400"
                />
                <Button onClick={handleAddComment} className="shrink-0 rounded-xl px-5">Gönder</Button>
              </div>
            </div>
          </div>
          <div className="space-y-4 px-6 py-5">
            {topLevelComments.length === 0 && (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 py-8 text-center">
                <p className="text-sm font-bold text-slate-700">{isQuestion ? 'Henüz cevap yok' : 'Henüz yorum yok'}</p>
                <p className="mt-1 text-sm text-slate-500">İlk katkıyı siz bırakabilirsiniz.</p>
              </div>
            )}
            {[...topLevelComments].sort((a, b) => (b.expertApproved ? 1 : 0) - (a.expertApproved ? 1 : 0)).map(comment => (
              <div key={comment.id}>
                <div className={`flex items-start gap-3 rounded-2xl border p-4 transition-all ${comment.expertApproved ? 'bg-indigo-50 border-indigo-100 shadow-sm' : comment.accepted ? 'bg-green-50 border-green-200' : 'bg-white border-slate-100 shadow-sm'}`}>
                  {isQuestion && (
                    <div className="flex min-w-[38px] flex-col items-center gap-1 rounded-xl bg-slate-50 py-1">
                      <button
                        onClick={() => handleVoteComment(comment.id, 1)}
                        className={`p-0.5 rounded cursor-pointer ${comment.upvotedByMe ? 'text-indigo-600' : 'text-gray-400 hover:text-indigo-600'}`}
                      >
                        <ChevronUp size={18} />
                      </button>
                      <span className={`text-sm font-bold ${comment.voteCount > 0 ? 'text-indigo-600' : comment.voteCount < 0 ? 'text-red-500' : 'text-gray-500'}`}>
                        {comment.voteCount}
                      </span>
                      <button
                        onClick={() => handleVoteComment(comment.id, -1)}
                        className={`p-0.5 rounded cursor-pointer ${comment.downvotedByMe ? 'text-red-500' : 'text-gray-400 hover:text-red-500'}`}
                      >
                        <ChevronDown size={18} />
                      </button>
                      {isAuthor && isQuestion && (
                        <button
                          onClick={() => handleAcceptAnswer(comment.id)}
                          className={`p-0.5 rounded cursor-pointer mt-1 ${comment.accepted ? 'text-green-600' : 'text-gray-300 hover:text-green-600'}`}
                          title="En iyi cevap olarak işaretle"
                        >
                          <Check size={18} />
                        </button>
                      )}
                    </div>
                  )}
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-100 ring-1 ring-slate-200">
                    <span className="text-sm font-bold text-slate-600">{comment.author?.fullName?.charAt(0)}</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-bold text-slate-900">{comment.anonymous ? 'Anonim Kullanıcı' : comment.author?.fullName}</p>
                      {!comment.anonymous && comment.author?.role === 'EXPERT' && (
                        <Badge variant="success" className="py-0 px-1.5 text-[10px]">Uzman</Badge>
                      )}
                      <span className="text-xs font-medium text-slate-400">{formatRelative(comment.createdAt)}</span>
                      {comment.expertApproved && (
                        <Badge variant="info" className="bg-indigo-600 text-white border-none shadow-sm flex items-center gap-1">
                          <Check size={12} strokeWidth={3} /> Uzman Onaylı
                        </Badge>
                      )}
                      {comment.accepted && <Badge variant="success">En İyi Cevap</Badge>}
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-700">{comment.content}</p>
                    <div className="flex items-center gap-3 mt-2">
                      {!isQuestion && (
                        <button
                          onClick={() => handleVoteComment(comment.id, 1)}
                          className={`flex items-center gap-1 text-xs cursor-pointer ${comment.upvotedByMe ? 'text-red-500' : 'text-gray-400 hover:text-red-500'}`}
                        >
                          <Heart size={12} fill={comment.upvotedByMe ? 'currentColor' : 'none'} /> {comment.likeCount}
                        </button>
                      )}
                      <button
                        onClick={() => { setReplyingTo(comment); setReplyContent(''); }}
                        className="flex items-center gap-1 text-xs text-gray-400 hover:text-primary-600 transition-colors cursor-pointer"
                      >
                        <Reply size={12} /> Cevapla
                      </button>
                      <button
                        onClick={() => setReportModal({ open: true, targetType: 'COMMENT', targetId: comment.id })}
                        className="flex items-center gap-1 text-xs text-gray-300 hover:text-red-400 transition-colors cursor-pointer"
                        title="Şikayet Et"
                      >
                        <Flag size={12} />
                      </button>
                      {(comment.ownedByMe || (!comment.anonymous && user?.id === comment.author?.id)) && (
                        <>
                          <button
                            onClick={() => { setEditingComment(comment); setEditCommentContent(comment.content); setReplyingTo(null); }}
                            className="flex items-center gap-1 text-xs text-gray-300 hover:text-indigo-500 transition-colors cursor-pointer"
                            title="Düzenle"
                          >
                            <Pencil size={12} />
                          </button>
                          <button
                            onClick={() => setDeleteCommentId(comment.id)}
                            className="flex items-center gap-1 text-xs text-gray-300 hover:text-red-500 transition-colors cursor-pointer"
                            title="Sil"
                          >
                            <Trash2 size={12} />
                          </button>
                        </>
                      )}
                    </div>
                    {editingComment?.id === comment.id && (
                      <div className="mt-2 flex gap-2">
                        <input
                          type="text"
                          value={editCommentContent}
                          onChange={e => setEditCommentContent(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') handleSaveEditComment(); if (e.key === 'Escape') setEditingComment(null); }}
                          className="flex-1 border border-indigo-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                          autoFocus
                        />
                        <button onClick={handleSaveEditComment} className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700">Kaydet</button>
                        <button onClick={() => setEditingComment(null)} className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-500 hover:bg-gray-50">İptal</button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Inline reply input */}
                {replyingTo?.id === comment.id && (
                  <div className="mt-3 flex gap-2 pl-0 sm:ml-14">
                    <input
                      type="text"
                      value={replyContent}
                      onChange={e => setReplyContent(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleAddReply()}
                      placeholder={`@${comment.anonymous ? 'Anonim' : comment.author?.fullName?.split(' ')[0]} cevap yazın...`}
                      className="min-w-0 flex-1 rounded-xl border border-primary-200 bg-primary-50/30 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                      autoFocus
                    />
                    <Button size="sm" onClick={handleAddReply}>Gönder</Button>
                    <button onClick={() => setReplyingTo(null)} className="p-2 text-gray-400 hover:text-gray-600 cursor-pointer">
                      <X size={16} />
                    </button>
                  </div>
                )}

                {/* Nested replies */}
                {repliesMap[comment.id]?.map(reply => (
                  <div key={reply.id} className="mt-2 flex items-start gap-2 rounded-2xl border border-slate-100 bg-slate-50/80 p-3 sm:ml-14">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-white ring-1 ring-slate-200">
                      <span className="text-xs font-bold text-slate-600">{reply.author?.fullName?.charAt(0)}</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-xs font-bold text-slate-900">{reply.anonymous ? 'Anonim' : reply.author?.fullName}</p>
                        <span className="text-[10px] font-medium text-slate-400">{formatRelative(reply.createdAt)}</span>
                      </div>
                      {editingComment?.id === reply.id ? (
                        <div className="mt-2 flex gap-2">
                          <input
                            type="text"
                            value={editCommentContent}
                            onChange={e => setEditCommentContent(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') handleSaveEditComment(); if (e.key === 'Escape') setEditingComment(null); }}
                            className="min-w-0 flex-1 rounded-lg border border-indigo-300 px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-300"
                            autoFocus
                          />
                          <button onClick={handleSaveEditComment} className="rounded-lg bg-indigo-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700">Kaydet</button>
                          <button onClick={() => setEditingComment(null)} className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs text-gray-500 hover:bg-gray-50">İptal</button>
                        </div>
                      ) : (
                        <p className="mt-1 text-xs leading-5 text-slate-700">{reply.content}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setReportModal({ open: true, targetType: 'COMMENT', targetId: reply.id })}
                        className="p-1 text-gray-300 hover:text-red-400 cursor-pointer"
                        title="Şikayet Et"
                      >
                        <Flag size={11} />
                      </button>
                      {reply.ownedByMe && editingComment?.id !== reply.id && (
                        <>
                          <button
                            onClick={() => { setEditingComment(reply); setEditCommentContent(reply.content); }}
                            className="p-1 text-gray-300 hover:text-indigo-500 cursor-pointer"
                            title="Düzenle"
                          >
                            <Pencil size={11} />
                          </button>
                          <button
                            onClick={() => setDeleteCommentId(reply.id)}
                            className="p-1 text-gray-300 hover:text-red-500 cursor-pointer"
                            title="Sil"
                          >
                            <Trash2 size={11} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </Card>

        {/* Report Modal */}
        <ReportModal
          isOpen={reportModal.open}
          onClose={() => setReportModal(m => ({ ...m, open: false }))}
          targetType={reportModal.targetType}
          targetId={reportModal.targetId}
        />

        {/* Edit Post Modal */}
        <Modal isOpen={!!editingPost} onClose={() => setEditingPost(null)} title="Gönderiyi Düzenle">
          <div className="space-y-4">
            <Input
              label="Başlık"
              value={editForm.title}
              onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))}
            />
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">İçerik</label>
              <RichTextEditor
                value={editForm.content}
                onChange={value => setEditForm(f => ({ ...f, content: value }))}
                rows={7}
              />
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setEditingPost(null)} className="flex-1">İptal</Button>
              <Button onClick={handleEditPost} loading={editLoading} className="flex-1">Güncelle</Button>
            </div>
          </div>
        </Modal>
      </div>
    );
  }

  // Main list view
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Forum</h1>
          <p className="text-gray-500 mt-0.5 text-sm">Diğer ailelerle soru sorun, deneyim paylaşın</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleIntro}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-500 hover:bg-slate-100 transition-colors"
          >
            <HelpCircle size={13} />
            {showIntro ? 'Kılavuzu Gizle' : 'Nasıl çalışır?'}
          </button>
          <Button onClick={() => openCreatePost(activeTab)}>
            <Plus size={18} className="mr-2" />
            {activeTab === 'QUESTION' ? 'Soru Sor' : 'Gönderi Paylaş'}
          </Button>
        </div>
      </div>

      {posts.length === 0 && !loading && !loadError && (
        <div className="bg-gradient-to-r from-primary-50 to-indigo-50 border border-primary-100 rounded-2xl p-5 flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center shrink-0">
            <BookOpen size={18} className="text-primary-600" />
          </div>
          <div>
            <p className="font-semibold text-gray-900 mb-1">Topluluk henüz yeni başlıyor!</p>
            <p className="text-sm text-gray-500">İlk gönderiyi siz paylaşın. Deneyimleriniz, sorularınız veya başarı hikayeleriniz diğer ailelere ilham verebilir.</p>
          </div>
        </div>
      )}

      {/* Haftanın Konusu */}
      <WeeklyTopicWidget variant="forum" onJoin={handleJoinWeeklyTopic} />

      {showIntro && (
        <div className="grid gap-3 lg:grid-cols-[1.15fr_0.85fr]">
          <Card className="overflow-hidden border-slate-200">
            <div className="border-b border-slate-100 bg-slate-50/80 px-5 py-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-primary-600">Topluluğa giriş</p>
                  <h2 className="mt-1 text-lg font-black text-slate-950">Sadece akış değil, doğru kapıdan başlama alanı</h2>
                </div>
                <div className="flex flex-wrap gap-2 text-center">
                  {[
                    [communityStats.unansweredQuestions, 'Cevap bekleyen'],
                    [communityStats.answeredQuestions, 'Yanıtlanmış'],
                    [communityStats.anonymousPosts, 'Anonim'],
                    [communityStats.activeTags, 'Etiket'],
                  ].map(([val, label]) => (
                    <div key={String(label)} className="rounded-xl border border-white bg-white px-3 py-1.5 shadow-sm min-w-[64px]">
                      <p className="text-sm font-black text-slate-900">{val}</p>
                      <p className="text-[10px] font-semibold text-slate-500">{label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="grid gap-2 p-4 md:grid-cols-2">
              <button
                onClick={() => openCreatePost('QUESTION')}
                className="group flex items-center gap-3 rounded-xl border border-blue-100 bg-blue-50/70 p-3 text-left transition-all hover:border-blue-200 hover:bg-blue-50"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-blue-600 shadow-sm">
                  <HelpCircle size={16} />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">Uzman cevaplı sorular</p>
                  <p className="text-xs text-slate-500 mt-0.5">Sorunuzu Soru-Cevap'ta uzman onaylı cevap alın</p>
                </div>
              </button>
              <button
                onClick={openAnonymousShare}
                className="group flex items-center gap-3 rounded-xl border border-emerald-100 bg-emerald-50/70 p-3 text-left transition-all hover:border-emerald-200 hover:bg-emerald-50"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-emerald-600 shadow-sm">
                  <EyeOff size={16} />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">Anonim paylaşım</p>
                  <p className="text-xs text-slate-500 mt-0.5">Adınızı gizleyerek rahatça paylaşın</p>
                </div>
              </button>
              <button
                onClick={() => navigate('/benzer-aileler')}
                className="group flex items-center gap-3 rounded-xl border border-violet-100 bg-violet-50/70 p-3 text-left transition-all hover:border-violet-200 hover:bg-violet-50"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-violet-600 shadow-sm">
                  <Users size={16} />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">Benzer aileler</p>
                  <p className="text-xs text-slate-500 mt-0.5">Aynı süreci yaşayan ailelerle tanışın</p>
                </div>
              </button>
              <button
                onClick={() => setSortMode('expert')}
                className="group flex items-center gap-3 rounded-xl border border-amber-100 bg-amber-50/70 p-3 text-left transition-all hover:border-amber-200 hover:bg-amber-50"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-amber-600 shadow-sm">
                  <ShieldCheck size={16} />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">Moderasyon akışı</p>
                  <p className="text-xs text-slate-500 mt-0.5">Uzman onaylı içerikleri öne al</p>
                </div>
              </button>
            </div>
          </Card>

          <Card className="border-slate-200 p-4">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-red-50 text-red-600">
                <Flag size={16} />
              </div>
              <p className="text-sm font-bold text-slate-900">Güvenli topluluk nasıl çalışır?</p>
            </div>
            <div className="space-y-2">
              {[
                ['1', 'İçerik işaretlenir', 'Gönderi veya yorumdan şikayet oluşturulur.'],
                ['2', 'Ekip inceler', 'Uygunsuz içerik ve kişisel veri riski kontrol edilir.'],
                ['3', 'Aksiyon alınır', 'Gerekirse içerik kaldırılır ya da kullanıcı bilgilendirilir.'],
              ].map(([step, title, description]) => (
                <div key={step} className="flex gap-2.5 rounded-xl border border-slate-100 bg-slate-50/70 p-2.5">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-white text-xs font-black text-slate-600 shadow-sm">{step}</span>
                  <div>
                    <p className="text-xs font-bold text-slate-900">{title}</p>
                    <p className="text-xs text-slate-500 leading-4 mt-0.5">{description}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      <div className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-white p-3 shadow-sm md:flex-row md:items-center">
        <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
          <Search size={16} className="shrink-0 text-slate-400" />
          <input
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') setAppliedSearch(searchInput.trim());
              if (e.key === 'Escape') { setSearchInput(''); setAppliedSearch(''); }
            }}
            placeholder="Toplulukta ara..."
            className="min-w-0 flex-1 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
          />
          {appliedSearch && (
            <button onClick={() => { setSearchInput(''); setAppliedSearch(''); }} className="text-slate-400 hover:text-slate-600">
              <X size={14} />
            </button>
          )}
        </div>
        <Button variant="outline" onClick={() => setAppliedSearch(searchInput.trim())} className="md:w-auto">Ara</Button>
        <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
          {[
            ['new', 'Yeni'],
            ['hot', 'Sıcak'],
            ['unanswered', 'Cevapsız'],
            ['expert', 'Uzmanlı'],
          ].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setSortMode(key as typeof sortMode)}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${sortMode === key ? 'bg-white text-primary-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl overflow-x-auto">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap cursor-pointer ${
              activeTab === tab.key
                ? 'bg-white text-primary-700 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Tag filter toggle */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setShowTagFilter(!showTagFilter)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${
            showTagFilter || selectedTagIds.size > 0
              ? 'bg-indigo-100 text-indigo-700'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <Filter size={14} />
          Etiket Filtrele
          {selectedTagIds.size > 0 && (
            <span className="ml-1 bg-indigo-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {selectedTagIds.size}
            </span>
          )}
        </button>
        {selectedTagIds.size > 0 && (
          <button
            onClick={() => setSelectedTagIds(new Set())}
            className="text-xs text-gray-500 hover:text-gray-700 cursor-pointer"
          >
            Temizle
          </button>
        )}
      </div>

      {showTagFilter && (
        <Card>
          <div className="space-y-3">
            {Object.entries(allTags).map(([category, tags]) => (
              <div key={category}>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  {CATEGORY_LABELS[category] || category}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {tags.map(tag => (
                    <button
                      key={tag.id}
                      onClick={() => toggleFilterTag(tag.id)}
                      className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all border cursor-pointer ${
                        selectedTagIds.has(tag.id)
                          ? 'bg-indigo-500 text-white border-indigo-500'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'
                      }`}
                    >
                      {tag.name}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Posts list */}
      {loading ? (
        <Card>
          <div className="flex items-center justify-center gap-3 py-10 text-primary-600">
            <div className="w-5 h-5 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm font-medium">Gönderiler yükleniyor...</span>
          </div>
        </Card>
      ) : loadError ? (
        <EmptyState
          icon={<BookOpen size={32} />}
          title="Gönderiler yüklenemedi"
          description={loadError}
          action={<Button onClick={loadPosts}>Tekrar Dene</Button>}
        />
      ) : posts.length === 0 ? (
        <EmptyState
          icon={<BookOpen size={32} />}
          title="Henüz gönderi yok"
          description={activeTab === 'QUESTION' ? 'İlk soruyu sorarak tartışmayı başlatın' : 'Toplulukla bir deneyiminizi paylaşarak başlayın'}
          action={<Button onClick={() => openCreatePost(activeTab)}>
            {activeTab === 'QUESTION' ? 'İlk Soruyu Sor' : 'İlk Gönderiyi Paylaş'}
          </Button>}
        />
      ) : (
        <div className="space-y-4">
          {posts.map((post, idx) => (
            <Card key={`${post.id}-${idx}`} hover onClick={() => handleViewPost(post)} className="p-5">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center shrink-0 shadow-sm">
                  <span className="text-slate-600 font-semibold text-lg">{post.author?.fullName?.charAt(0) || 'A'}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <p className="text-sm font-semibold text-slate-800">{post.anonymous ? 'Anonim Kullanıcı' : post.author?.fullName}</p>
                    {!post.anonymous && post.author?.role === 'EXPERT' && (
                      <Badge variant="success" className="py-0 px-1.5 text-[10px] bg-green-50 text-green-700 border-green-200">Uzman</Badge>
                    )}
                    <span className="text-[11px] text-slate-400 font-medium tracking-wide">{formatRelative(post.createdAt)}</span>
                    {post.pinned && <Badge variant="warning" className="py-0 px-1.5 text-[10px] bg-amber-50 text-amber-700 border-amber-200">Sabitlenmiş</Badge>}
                    {post.postType === 'QUESTION' && post.answered && <Badge variant="success" className="py-0 px-1.5 text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">Cevaplanmış</Badge>}
                  </div>
                  <h3 className="text-[17px] font-bold text-slate-900 leading-snug">{post.title}</h3>
                  <p className="text-[15px] text-slate-600 mt-1.5 line-clamp-3 leading-relaxed">{htmlToPlainText(post.content)}</p>

                  {post.tags && post.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {post.tags.slice(0, 5).map(tag => (
                        <span key={tag.id} className="px-2.5 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                          {tag.name}
                        </span>
                      ))}
                      {post.tags.length > 5 && (
                        <span className="px-2.5 py-0.5 rounded-md text-[11px] font-medium bg-slate-50 text-slate-500 border border-slate-100">
                          +{post.tags.length - 5}
                        </span>
                      )}
                    </div>
                  )}

                  <div className="flex items-center gap-5 mt-4 text-sm text-slate-500 font-medium">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleVotePost(post.id, 1);
                      }}
                      className="flex items-center gap-1.5 hover:text-red-500 transition-colors"
                    >
                      <Heart size={16} strokeWidth={2.5} fill={post.likedByMe ? 'currentColor' : 'none'} className={post.likedByMe ? 'text-red-500' : ''} />
                      {post.likeCount > 0 ? post.likeCount : 'Beğen'}
                    </button>
                    <button className="flex items-center gap-1.5 hover:text-blue-500 transition-colors">
                      <MessageSquare size={16} strokeWidth={2.5} /> 
                      {post.commentCount > 0 ? post.commentCount : 'Yorum Yap'}
                    </button>
                    {user && !post.ownedByMe && user.id !== post.author?.id ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setReportModal({ open: true, targetType: 'POST', targetId: post.id });
                        }}
                        className="ml-auto flex items-center gap-1.5 text-xs text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
                        title="Şikayet Et"
                      >
                        <Flag size={14} /> Şikayet
                      </button>
                    ) : user && (post.ownedByMe || user.id === post.author?.id) ? (
                      <div className="ml-auto flex items-center gap-3">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingPost(post);
                            setEditForm({ title: post.title, content: post.content });
                          }}
                          className="flex items-center gap-1 text-xs font-medium text-slate-400 hover:text-blue-500 transition-colors cursor-pointer"
                        >
                          <Pencil size={14} /> Düzenle
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeletePostId(post.id);
                          }}
                          className="flex items-center gap-1 text-xs font-medium text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
                        >
                          <Trash2 size={14} /> Sil
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </Card>
          ))}
          {page < totalPages - 1 && (
            <div ref={loadMoreRef} className="flex justify-center pt-4 pb-8">
              {loadingMore ? (
                <div className="flex items-center gap-2 text-primary-600">
                  <div className="w-5 h-5 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm font-medium">Yükleniyor...</span>
                </div>
              ) : (
                <div className="h-10" />
              )}
            </div>
          )}
        </div>
      )}

      {/* Report Modal */}
      <ReportModal
        isOpen={reportModal.open}
        onClose={() => setReportModal(m => ({ ...m, open: false }))}
        targetType={reportModal.targetType}
        targetId={reportModal.targetId}
      />

      {/* Create Post Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={activeTab === 'QUESTION' ? 'Yeni Soru' : 'Yeni Gönderi'}>
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          {/* Post type selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Gönderi Tipi</label>
            <div className="flex flex-wrap gap-2">
              {TABS.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setForm(f => ({ ...f, postType: tab.key }))}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-all cursor-pointer ${
                    form.postType === tab.key
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {tab.icon} {tab.label}
                </button>
              ))}
            </div>
          </div>

          <Input
            label="Başlık *"
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            placeholder={form.postType === 'QUESTION' ? 'Sorunuzu kısaca özetleyin' : 'Gönderinizin başlığı'}
          />

          <div className="mb-4 z-50">
            <label className="block text-sm font-medium text-gray-700 mb-1">İçerik *</label>
            <RichTextEditor
              value={form.content}
              onChange={value => setForm(f => ({ ...f, content: value }))}
              rows={7}
            />
          </div>

          {/* Tag selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <TagIcon size={14} className="inline mr-1" />
              Semptom Etiketleri
            </label>
            <div className="space-y-3 max-h-40 overflow-y-auto">
              {Object.entries(allTags).map(([category, tags]) => (
                <div key={category}>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">
                    {CATEGORY_LABELS[category] || category}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {tags.map(tag => (
                      <button
                        key={tag.id}
                        onClick={() => toggleFormTag(tag.id)}
                        className={`px-2 py-0.5 rounded-full text-xs font-medium transition-all border cursor-pointer ${
                          form.tagIds.includes(tag.id)
                            ? 'bg-indigo-500 text-white border-indigo-500'
                            : 'bg-white text-gray-500 border-gray-200 hover:border-indigo-300'
                        }`}
                      >
                        {tag.name}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Anonymity Toggle */}
          <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.anonymous}
                onChange={e => setForm(f => ({ ...f, anonymous: e.target.checked }))}
                className="w-5 h-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <div>
                <p className="text-sm font-medium text-gray-900">Anonim Olarak Paylaş</p>
                <p className="text-xs text-gray-500">Profil bilgileriniz gizlenir, "Anonim Ebeveyn" olarak görünürsünüz.</p>
              </div>
            </label>
          </div>

          {/* Privacy settings */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <EyeOff size={14} className="inline mr-1" />
              Gizlilik Ayarları
            </label>
            <div className="space-y-2">
              {[
                { key: 'showRealName' as const, label: 'Gerçek adımı göster' },
                { key: 'showChildAge' as const, label: 'Çocuğumun yaş aralığını göster' },
                { key: 'showSymptoms' as const, label: 'Semptom etiketlerini göster' },
                { key: 'showDiagnosis' as const, label: 'Tanı detaylarını göster' },
                { key: 'allowMatching' as const, label: 'Eşleştirme algoritmasında kullanılsın' },
              ].map(item => (
                <label key={item.key} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.privacySettings[item.key]}
                    onChange={e => setForm(f => ({
                      ...f,
                      privacySettings: { ...f.privacySettings, [item.key]: e.target.checked },
                    }))}
                    className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm text-gray-700">{item.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={() => setShowModal(false)} className="flex-1">İptal</Button>
            <Button onClick={handleCreatePost} loading={loading} className="flex-1">
              {form.postType === 'QUESTION' ? 'Soruyu Gönder' : 'Paylaş'}
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmModal
        isOpen={!!deletePostId}
        title="Gönderiyi sil?"
        message="Bu gönderi ve tüm yorumları kalıcı olarak silinecek."
        confirmLabel="Evet, sil"
        onConfirm={() => deletePostId && handleDeletePost(deletePostId)}
        onCancel={() => setDeletePostId(null)}
      />

      <ConfirmModal
        isOpen={!!deleteCommentId}
        title="Yorumu sil?"
        message="Bu yorum kalıcı olarak silinecek."
        confirmLabel="Evet, sil"
        onConfirm={() => deleteCommentId && handleDeleteComment(deleteCommentId)}
        onCancel={() => setDeleteCommentId(null)}
      />

      <Modal isOpen={!!editingPost} onClose={() => setEditingPost(null)} title="Gönderiyi Düzenle">
        <div className="space-y-4">
          <Input
            label="Başlık"
            value={editForm.title}
            onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))}
          />
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">İçerik</label>
            <RichTextEditor
              value={editForm.content}
              onChange={value => setEditForm(f => ({ ...f, content: value }))}
              rows={7}
            />
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setEditingPost(null)} className="flex-1">İptal</Button>
            <Button onClick={handleEditPost} loading={editLoading} className="flex-1">Güncelle</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
