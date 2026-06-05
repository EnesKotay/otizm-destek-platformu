import { useEffect, useState, useCallback } from 'react';
import {
  Heart, MessageSquare, Plus, ArrowLeft, Send, Sparkles,
  ShieldCheck, Users, HelpCircle, Pencil, Trash2, Flag
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { TextArea } from '@/components/ui/TextArea';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { ReportModal } from '@/components/forum/ReportModal';
import { PageOnboarding } from '@/components/ui/PageOnboarding';
import { forumService } from '@/services/forumService';
import { formatRelative } from '@/utils/date';
import { useAuthStore } from '@/store/authStore';
import type { ForumPost, ForumComment } from '@/types';
import { toast } from '@/store/toastStore';

export function SupportWallPage() {
  const user = useAuthStore(s => s.user);
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [selectedPost, setSelectedPost] = useState<ForumPost | null>(null);
  const [comments, setComments] = useState<ForumComment[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [form, setForm] = useState({ title: '', content: '', anonymous: true });

  // Edit/delete post state
  const [editingPost, setEditingPost] = useState<ForumPost | null>(null);
  const [editForm, setEditForm] = useState({ title: '', content: '' });
  const [editLoading, setEditLoading] = useState(false);
  const [deletingPostId, setDeletingPostId] = useState<string | null>(null);
  const [reportPostId, setReportPostId] = useState<string | null>(null);

  // Edit/delete comment state
  const [editingComment, setEditingComment] = useState<ForumComment | null>(null);
  const [editCommentContent, setEditCommentContent] = useState('');
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);

  const loadPosts = useCallback(async () => {
    try {
      const data = await forumService.getPostsByCategory('SUPPORT_WALL');
      setPosts(data.content);
    } catch { /* ignore */ }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { loadPosts(); }, [loadPosts]);

  const handleViewPost = async (post: ForumPost) => {
    try {
      const fullPost = await forumService.getPost(post.id);
      setSelectedPost(fullPost);
      const data = await forumService.getComments(post.id);
      setComments(data.content);
    } catch { /* ignore */ }
  };

  const handleCreatePost = async () => {
    if (!form.content) return;
    setLoading(true);
    try {
      await forumService.createPost({
        title: form.title || 'Dertleşme Paylaşımı',
        content: form.content,
        category: 'SUPPORT_WALL',
        postType: 'DENEYIM',
        anonymous: form.anonymous,
      });
      setShowModal(false);
      setForm({ title: '', content: '', anonymous: true });
      loadPosts();
      toast.success('Paylaşımınız duvara eklendi.');
    } catch { toast.error('Paylaşım oluşturulamadı.'); }
    setLoading(false);
  };

  const handleEditPost = async () => {
    if (!editingPost || !editForm.content) return;
    setEditLoading(true);
    try {
      const updated = await forumService.updatePost(editingPost.id, { title: editForm.title || 'Dertleşme Paylaşımı', content: editForm.content });
      setSelectedPost(updated);
      setPosts(prev => prev.map(p => p.id === updated.id ? updated : p));
      setEditingPost(null);
      toast.success('Paylaşım güncellendi.');
    } catch { toast.error('Paylaşım güncellenemedi.'); }
    setEditLoading(false);
  };

  const handleDeletePost = async () => {
    if (!deletingPostId) return;
    try {
      await forumService.deletePost(deletingPostId);
      if (selectedPost?.id === deletingPostId) setSelectedPost(null);
      setPosts(prev => prev.filter(p => p.id !== deletingPostId));
      toast.success('Paylaşım silindi.');
    } catch { toast.error('Paylaşım silinemedi.'); }
    setDeletingPostId(null);
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !selectedPost) return;
    try {
      const comment = await forumService.createComment(selectedPost.id, {
        content: newComment,
        anonymous: true,
      });
      setComments(prev => [...prev, comment]);
      setNewComment('');
      setSelectedPost(prev => prev ? { ...prev, commentCount: prev.commentCount + 1 } : null);
      toast.success('Destek mesajı gönderildi.');
    } catch { toast.error('Yorum eklenemedi.'); }
  };

  const handleSaveEditComment = async () => {
    if (!editingComment || !editCommentContent.trim() || !selectedPost) return;
    try {
      const updated = await forumService.updateComment(selectedPost.id, editingComment.id, editCommentContent.trim());
      setComments(prev => prev.map(c => c.id === updated.id ? updated : c));
      setEditingComment(null);
      toast.success('Mesaj güncellendi.');
    } catch { toast.error('Mesaj güncellenemedi.'); }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!selectedPost) return;
    try {
      await forumService.deleteComment(selectedPost.id, commentId);
      setComments(prev => prev.filter(c => c.id !== commentId));
      setSelectedPost(p => p ? { ...p, commentCount: Math.max(0, p.commentCount - 1) } : p);
      setDeletingCommentId(null);
      toast.success('Mesaj silindi.');
    } catch { toast.error('Mesaj silinemedi.'); }
  };

  const handleSupport = async (postId: string) => {
    try {
      await forumService.toggleVote({ targetType: 'POST', targetId: postId, voteValue: 1 });
      if (selectedPost?.id === postId) {
        const updated = await forumService.getPost(postId);
        setSelectedPost(updated);
      }
      loadPosts();
    } catch { /* ignore */ }
  };

  if (selectedPost) {
    const isAuthor = user?.id === selectedPost.author?.id;

    return (
      <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-500">
        <button onClick={() => setSelectedPost(null)} className="flex items-center gap-2 text-rose-600 hover:text-rose-700 font-medium cursor-pointer">
          <ArrowLeft size={18} /> Duvara Dön
        </button>

        <div className="bg-white rounded-3xl p-8 shadow-sm border border-rose-100 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Sparkles size={120} className="text-rose-300" />
          </div>

          <div className="flex items-start gap-3 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-500 shrink-0">
              <Users size={24} />
            </div>
            <div className="flex-1">
              <p className="font-bold text-gray-900">{selectedPost.anonymous ? 'Anonim Kullanıcı' : selectedPost.author?.fullName}</p>
              <p className="text-xs text-rose-400 font-medium">{formatRelative(selectedPost.createdAt)}</p>
            </div>
            <div className="flex gap-1">
              {!isAuthor && (
                <button
                  onClick={() => setReportPostId(selectedPost.id)}
                  className="p-2 rounded-xl hover:bg-red-50 text-gray-300 hover:text-red-400 transition-colors cursor-pointer"
                  title="Şikayet Et"
                >
                  <Flag size={16} />
                </button>
              )}
              {isAuthor && (
                <>
                  <button
                    onClick={() => { setEditingPost(selectedPost); setEditForm({ title: selectedPost.title, content: selectedPost.content }); }}
                    className="p-2 rounded-xl hover:bg-rose-50 text-gray-400 hover:text-rose-500 transition-colors cursor-pointer"
                    title="Düzenle"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    onClick={() => setDeletingPostId(selectedPost.id)}
                    className="p-2 rounded-xl hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors cursor-pointer"
                    title="Sil"
                  >
                    <Trash2 size={16} />
                  </button>
                </>
              )}
            </div>
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-4 leading-tight">{selectedPost.title}</h2>
          <p className="text-lg text-gray-700 whitespace-pre-wrap leading-relaxed">{selectedPost.content}</p>

          <div className="flex items-center gap-6 mt-8 pt-6 border-t border-rose-50">
            <button
              onClick={() => handleSupport(selectedPost.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-2xl transition-all cursor-pointer ${selectedPost.likedByMe ? 'bg-rose-500 text-white shadow-lg shadow-rose-200' : 'bg-rose-50 text-rose-600 hover:bg-rose-100'}`}
            >
              <Heart size={20} fill={selectedPost.likedByMe ? 'currentColor' : 'none'} />
              <span className="font-bold">{selectedPost.likeCount} Destek</span>
            </button>
            <div className="flex items-center gap-2 text-gray-400 font-medium">
              <MessageSquare size={20} />
              <span>{selectedPost.commentCount} Mesaj</span>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 px-2">
            <Send size={18} className="text-rose-500" /> Destek Mesajları
          </h3>
          <div className="space-y-4">
            {comments.map(comment => {
              const isCommentAuthor = !comment.anonymous && user?.id === comment.author?.id;
              const isEditing = editingComment?.id === comment.id;
              return (
                <div key={comment.id} className="bg-white/60 backdrop-blur-sm rounded-2xl p-5 border border-white shadow-sm hover:shadow-md transition-all">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-bold text-gray-700">{comment.anonymous ? 'Anonim Kullanıcı' : comment.author?.fullName}</span>
                    <span className="text-[10px] text-gray-400 font-medium">{formatRelative(comment.createdAt)}</span>
                    {isCommentAuthor && !isEditing && (
                      <div className="ml-auto flex gap-1">
                        <button
                          onClick={() => { setEditingComment(comment); setEditCommentContent(comment.content); }}
                          className="p-1.5 rounded-lg hover:bg-rose-50 text-gray-300 hover:text-rose-400 transition-colors cursor-pointer"
                          title="Düzenle"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={() => setDeletingCommentId(comment.id)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-400 transition-colors cursor-pointer"
                          title="Sil"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    )}
                  </div>
                  {isEditing ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={editCommentContent}
                        onChange={e => setEditCommentContent(e.target.value)}
                        className="w-full bg-gray-50 px-3 py-2 rounded-xl border border-rose-200 focus:ring-2 focus:ring-rose-400 text-sm"
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <Button onClick={handleSaveEditComment} className="bg-rose-500 hover:bg-rose-600 h-8 text-xs px-4">Kaydet</Button>
                        <Button variant="outline" onClick={() => setEditingComment(null)} className="h-8 text-xs px-4">İptal</Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-700 leading-relaxed">{comment.content}</p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Yorum Silme Onay Modalı */}
          <Modal isOpen={!!deletingCommentId} onClose={() => setDeletingCommentId(null)} title="Mesajı Sil">
            <div className="space-y-4">
              <p className="text-sm text-gray-700">Bu destek mesajını silmek istediğinizden emin misiniz?</p>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setDeletingCommentId(null)} className="flex-1">İptal</Button>
                <Button variant="danger" onClick={() => deletingCommentId && handleDeleteComment(deletingCommentId)} className="flex-1">Sil</Button>
              </div>
            </div>
          </Modal>

          {user && (
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-rose-50 flex gap-3">
              <input
                type="text"
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddComment()}
                placeholder="Bir destek mesajı bırakın..."
                className="flex-1 bg-gray-50 px-4 py-3 rounded-xl border-none focus:ring-2 focus:ring-rose-500 text-sm"
              />
              <Button onClick={handleAddComment} className="bg-rose-500 hover:bg-rose-600 rounded-xl px-6">
                Gönder
              </Button>
            </div>
          )}
        </div>

        {/* Düzenle Modalı */}
        <Modal isOpen={!!editingPost} onClose={() => setEditingPost(null)} title="Paylaşımı Düzenle">
          <div className="space-y-4">
            <Input
              label="Başlık"
              value={editForm.title}
              onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))}
              placeholder="Kısa bir başlık..."
            />
            <TextArea
              label="İçerik *"
              value={editForm.content}
              onChange={e => setEditForm(f => ({ ...f, content: e.target.value }))}
              rows={6}
            />
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setEditingPost(null)} className="flex-1">İptal</Button>
              <Button onClick={handleEditPost} loading={editLoading} className="flex-1 bg-rose-500 hover:bg-rose-600">Güncelle</Button>
            </div>
          </div>
        </Modal>

        {/* Silme Onay Modalı */}
        <Modal isOpen={!!deletingPostId} onClose={() => setDeletingPostId(null)} title="Paylaşımı Sil">
          <div className="space-y-4">
            <p className="text-sm text-gray-700">Bu paylaşımı silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.</p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setDeletingPostId(null)} className="flex-1">İptal</Button>
              <Button variant="danger" onClick={handleDeletePost} className="flex-1">Sil</Button>
            </div>
          </div>
        </Modal>

        <ReportModal
          isOpen={!!reportPostId}
          onClose={() => setReportPostId(null)}
          targetType="POST"
          targetId={reportPostId || ''}
        />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-700">
      <PageOnboarding
        pageId="support-wall"
        title="Dertleşme Duvarına Hoş Geldiniz"
        description="Burası yargılanmadan içinizi dökebileceğiniz güvenli alanınız."
        steps={[
          {
            icon: <Heart size={20} />,
            title: "Anonim Paylaşım",
            description: "İstediğiniz zaman kimliğinizi gizleyerek paylaşım yapabilirsiniz."
          },
          {
            icon: <MessageSquare size={20} />,
            title: "Destek Olun",
            description: "Diğer ebeveynlerin yazılarına kalp gönderin veya destekleyici yorumlar yapın."
          }
        ]}
      />

      <div className="text-center space-y-4 py-8">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-rose-50 text-rose-600 rounded-full text-sm font-bold border border-rose-100">
          <ShieldCheck size={16} /> Güvenli ve Anonim Alan
        </div>
        <h1 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tight">
          Dertleşme Duvarı
        </h1>
        <p className="text-gray-500 max-w-xl mx-auto text-lg">
          Burada yalnız değilsiniz. İçinizi dökün, diğer ailelerden güç alın.
          Tüm paylaşımlar anonim olarak yapılabilir.
        </p>
        {user ? (
          <Button
            onClick={() => setShowModal(true)}
            className="bg-rose-500 hover:bg-rose-600 text-white px-8 py-6 rounded-2xl text-lg font-bold shadow-xl shadow-rose-200 transition-all hover:scale-105 active:scale-95"
          >
            <Plus size={24} className="mr-2" /> İçini Dök
          </Button>
        ) : (
          <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl inline-flex items-center gap-2 text-amber-700 text-sm">
            <HelpCircle size={18} /> Paylaşım yapmak için giriş yapmalısınız, ancak tüm desteği okuyabilirsiniz.
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {posts.map(post => (
          <div
            key={post.id}
            onClick={() => handleViewPost(post)}
            className="group cursor-pointer bg-white rounded-3xl p-6 shadow-sm border border-gray-100 hover:border-rose-200 hover:shadow-xl hover:shadow-rose-100 transition-all duration-300 relative overflow-hidden"
          >
            <div className="flex items-center justify-between mb-4">
              {post.anonymous ? (
                <Badge variant="default" className="bg-rose-50 text-rose-600 border-none font-bold">
                  Anonim Paylaşım
                </Badge>
              ) : (
                <span className="text-sm font-semibold text-gray-700">{post.author?.fullName}</span>
              )}
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-gray-400 font-medium">
                  {formatRelative(post.createdAt)}
                </span>
                {user && user.id !== post.author?.id && (
                  <button
                    onClick={e => { e.stopPropagation(); setReportPostId(post.id); }}
                    className="flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
                    title="Şikayet Et"
                  >
                    <Flag size={14} /> Şikayet
                  </button>
                )}
                {user && user.id === post.author?.id && (
                  <div className="flex gap-3 items-center">
                    <button
                      onClick={e => { e.stopPropagation(); setEditingPost(post); setEditForm({ title: post.title, content: post.content }); }}
                      className="flex items-center gap-1 text-xs font-medium text-slate-400 hover:text-blue-500 transition-colors cursor-pointer"
                      title="Düzenle"
                    >
                      <Pencil size={14} /> Düzenle
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); setDeletingPostId(post.id); }}
                      className="flex items-center gap-1 text-xs font-medium text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
                      title="Sil"
                    >
                      <Trash2 size={14} /> Sil
                    </button>
                  </div>
                )}
              </div>
            </div>
            <h3 className="text-xl font-bold text-gray-900 group-hover:text-rose-600 transition-colors line-clamp-2 mb-3">
              {post.title}
            </h3>
            <p className="text-gray-600 line-clamp-3 leading-relaxed mb-6">
              {post.content}
            </p>
            <div className="flex items-center gap-4 text-sm font-bold">
              <span className="flex items-center gap-1.5 text-rose-500">
                <Heart size={16} fill={post.likedByMe ? 'currentColor' : 'none'} /> {post.likeCount} Destek
              </span>
              <span className="flex items-center gap-1.5 text-gray-400">
                <MessageSquare size={16} /> {post.commentCount} Mesaj
              </span>
            </div>
          </div>
        ))}
      </div>

      <ReportModal
        isOpen={!!reportPostId}
        onClose={() => setReportPostId(null)}
        targetType="POST"
        targetId={reportPostId || ''}
      />

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="İçini Dök"
      >
        <div className="space-y-6">
          <p className="text-sm text-gray-500">
            Duygularınızı, zorluklarınızı veya mutluluklarınızı paylaşın.
            Buradaki herkes sizinle benzer yollardan geçiyor.
          </p>
          <Input
            label="Kısa Bir Başlık"
            placeholder="Örn: Bugün çok yorgunum ama..."
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
          />
          <TextArea
            label="Neler Hissediyorsunuz? *"
            placeholder="Buraya istediğiniz her şeyi yazabilirsiniz..."
            rows={6}
            value={form.content}
            onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
          />
          <div className="p-4 bg-rose-50 rounded-2xl flex items-center gap-3">
            <input
              type="checkbox"
              checked={form.anonymous}
              onChange={e => setForm(f => ({ ...f, anonymous: e.target.checked }))}
              className="w-5 h-5 rounded border-rose-300 text-rose-600 focus:ring-rose-500"
            />
            <div>
              <p className="text-sm font-bold text-rose-900">Anonim Paylaş</p>
              <p className="text-xs text-rose-600">İsminiz kimse tarafından görülmez.</p>
            </div>
          </div>
          <Button
            onClick={handleCreatePost}
            loading={loading}
            className="w-full bg-rose-500 hover:bg-rose-600 h-14 text-lg font-bold rounded-2xl"
          >
            Duvara As
          </Button>
        </div>
      </Modal>

      {/* Düzenle Modalı */}
      <Modal isOpen={!!editingPost} onClose={() => setEditingPost(null)} title="Paylaşımı Düzenle">
        <div className="space-y-4">
          <Input
            label="Başlık"
            value={editForm.title}
            onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))}
            placeholder="Kısa bir başlık..."
          />
          <TextArea
            label="İçerik *"
            value={editForm.content}
            onChange={e => setEditForm(f => ({ ...f, content: e.target.value }))}
            rows={6}
          />
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setEditingPost(null)} className="flex-1">İptal</Button>
            <Button onClick={handleEditPost} loading={editLoading} className="flex-1 bg-rose-500 hover:bg-rose-600">Güncelle</Button>
          </div>
        </div>
      </Modal>

      {/* Silme Onay Modalı */}
      <Modal isOpen={!!deletingPostId} onClose={() => setDeletingPostId(null)} title="Paylaşımı Sil">
        <div className="space-y-4">
          <p className="text-sm text-gray-700">Bu paylaşımı silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.</p>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setDeletingPostId(null)} className="flex-1">İptal</Button>
            <Button variant="danger" onClick={handleDeletePost} className="flex-1">Sil</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
