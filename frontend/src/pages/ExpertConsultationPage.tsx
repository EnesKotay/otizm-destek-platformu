import { useState, useEffect, useCallback } from 'react';
import {
  Users, Search, Plus, MessageSquare, Clock,
  Shield, X, CheckCircle, Tag, ChevronRight,
  Send, ArrowLeft, MoreHorizontal, Archive,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { PageOnboarding } from '@/components/ui/PageOnboarding';
import { useAuthStore } from '@/store/authStore';
import { consultationService } from '@/services/consultationService';
import { toast } from '@/store/toastStore';
import type { ConsultationCase, ConsultationReply } from '@/types';

type TabFilter = 'all' | 'OPEN' | 'RESOLVED';

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins} dk önce`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} saat önce`;
  return `${Math.floor(hours / 24)} gün önce`;
}

function AuthorAvatar({ name, imageUrl, size = 'sm' }: { name: string; imageUrl?: string; size?: 'sm' | 'md' }) {
  const dims = size === 'md' ? 'w-10 h-10 text-base' : 'w-8 h-8 text-sm';
  return imageUrl ? (
    <img src={imageUrl} alt={name} className={`${dims} rounded-full object-cover shrink-0`} />
  ) : (
    <div className={`${dims} rounded-full bg-gradient-to-br from-purple-400 to-indigo-500 flex items-center justify-center shrink-0`}>
      <span className="text-white font-bold">{name?.charAt(0)}</span>
    </div>
  );
}

function StatusBadge({ status }: { status: ConsultationCase['status'] }) {
  if (status === 'OPEN') return (
    <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100 uppercase">
      <Clock size={10} /> Tartışmaya Açık
    </span>
  );
  if (status === 'RESOLVED') return (
    <span className="flex items-center gap-1 text-[10px] font-bold text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full border border-gray-200 uppercase">
      <CheckCircle size={10} /> Çözüldü
    </span>
  );
  return (
    <span className="flex items-center gap-1 text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200 uppercase">
      <Archive size={10} /> Arşivlendi
    </span>
  );
}

interface ReplyListProps {
  replies: ConsultationReply[];
  currentUserId?: string;
}

function ReplyList({ replies, currentUserId }: ReplyListProps) {
  if (replies.length === 0) {
    return (
      <p className="text-center text-sm text-gray-400 py-6">
        Henüz görüş eklenmemiş. İlk görüşü sen ekle!
      </p>
    );
  }
  return (
    <div className="space-y-4">
      {replies.map(r => (
        <div key={r.id} className={`flex gap-3 ${r.authorId === currentUserId ? 'flex-row-reverse' : ''}`}>
          <AuthorAvatar name={r.authorName} imageUrl={r.authorImageUrl} />
          <div className={`flex-1 ${r.authorId === currentUserId ? 'items-end' : 'items-start'} flex flex-col`}>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold text-gray-800">{r.authorName}</span>
              {r.authorTitle && <span className="text-[10px] text-purple-600 font-medium">{r.authorTitle}</span>}
              <span className="text-[10px] text-gray-400">{timeAgo(r.createdAt)}</span>
            </div>
            <div className={`text-sm text-gray-700 leading-relaxed px-3 py-2.5 rounded-2xl max-w-[85%] ${
              r.authorId === currentUserId
                ? 'bg-purple-100 text-purple-900 rounded-tr-sm'
                : 'bg-gray-100 rounded-tl-sm'
            }`}>
              {r.content}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

interface CaseDetailViewProps {
  caseItem: ConsultationCase;
  currentUserId?: string;
  onBack: () => void;
  onStatusChange: (id: string, status: 'OPEN' | 'RESOLVED' | 'ARCHIVED') => void;
}

function CaseDetailView({ caseItem, currentUserId, onBack, onStatusChange }: CaseDetailViewProps) {
  const [replies, setReplies] = useState<ConsultationReply[]>(caseItem.replies ?? []);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const isAuthor = caseItem.authorId === currentUserId;

  const handleSendReply = async () => {
    if (!replyText.trim()) return;
    setSending(true);
    try {
      const newReply = await consultationService.addReply(caseItem.id, replyText.trim());
      setReplies(prev => [...prev, newReply]);
      setReplyText('');
      toast.success('Görüşünüz eklendi.');
    } catch {
      toast.error('Görüş eklenemedi.');
    }
    setSending(false);
  };

  const handleStatus = async (status: 'OPEN' | 'RESOLVED' | 'ARCHIVED') => {
    setShowStatusMenu(false);
    try {
      await onStatusChange(caseItem.id, status);
      toast.success('Durum güncellendi.');
    } catch {
      toast.error('Durum güncellenemedi.');
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-purple-600 transition-colors cursor-pointer">
          <ArrowLeft size={16} /> Geri
        </button>
        <div className="flex-1" />
        {isAuthor && (
          <div className="relative">
            <button
              onClick={() => setShowStatusMenu(s => !s)}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors cursor-pointer"
            >
              <MoreHorizontal size={18} />
            </button>
            {showStatusMenu && (
              <div className="absolute right-0 top-8 bg-white border border-gray-200 rounded-xl shadow-lg z-10 min-w-[160px] py-1">
                {caseItem.status !== 'OPEN' && (
                  <button onClick={() => handleStatus('OPEN')} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2 cursor-pointer">
                    <Clock size={14} className="text-emerald-500" /> Tekrar Aç
                  </button>
                )}
                {caseItem.status !== 'RESOLVED' && (
                  <button onClick={() => handleStatus('RESOLVED')} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2 cursor-pointer">
                    <CheckCircle size={14} className="text-blue-500" /> Çözüldü İşaretle
                  </button>
                )}
                {caseItem.status !== 'ARCHIVED' && (
                  <button onClick={() => handleStatus('ARCHIVED')} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2 cursor-pointer">
                    <Archive size={14} className="text-gray-400" /> Arşivle
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
        <div className="flex items-start gap-3 mb-4">
          <AuthorAvatar name={caseItem.authorName} imageUrl={caseItem.authorImageUrl} size="md" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-bold text-gray-900">{caseItem.authorName}</span>
              {caseItem.authorTitle && (
                <span className="text-xs text-purple-600 font-medium">{caseItem.authorTitle}</span>
              )}
              <StatusBadge status={caseItem.status} />
            </div>
            <span className="text-xs text-gray-400">{timeAgo(caseItem.createdAt)}</span>
          </div>
        </div>
        <h2 className="text-lg font-bold text-gray-900 mb-3">{caseItem.title}</h2>
        <p className="text-sm text-gray-700 leading-relaxed">{caseItem.description}</p>
        {caseItem.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {caseItem.tags.map(t => (
              <span key={t} className="flex items-center gap-1 text-[10px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg">
                <Tag size={10} /> {t}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
        <h3 className="font-bold text-sm text-gray-900 mb-4 flex items-center gap-2">
          <MessageSquare size={15} className="text-purple-600" />
          Uzman Görüşleri ({replies.length})
        </h3>
        <ReplyList replies={replies} currentUserId={currentUserId} />
      </div>

      {caseItem.status === 'OPEN' && (
        <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
          <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Görüşünüzü Ekleyin</p>
          <textarea
            value={replyText}
            onChange={e => setReplyText(e.target.value)}
            placeholder="Mesleki görüşünüzü, deneyimlerinizi veya önerilerinizi paylaşın..."
            rows={3}
            className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none"
          />
          <div className="flex justify-end mt-2">
            <Button
              size="sm"
              onClick={handleSendReply}
              loading={sending}
              disabled={!replyText.trim()}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              <Send size={13} className="mr-1.5" /> Gönder
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export function ExpertConsultationPage() {
  const { user } = useAuthStore();
  const [cases, setCases] = useState<ConsultationCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<TabFilter>('all');
  const [selectedCase, setSelectedCase] = useState<ConsultationCase | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);

  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newTagsRaw, setNewTagsRaw] = useState('');
  const [creating, setCreating] = useState(false);

  const loadCases = useCallback(async () => {
    setLoading(true);
    try {
      const res = await consultationService.list(
        activeTab === 'all' ? 'all' : activeTab,
        searchQuery.trim() || undefined,
      );
      setCases(res.content);
    } catch {
      toast.error('Vakalar yüklenemedi.');
    }
    setLoading(false);
  }, [activeTab, searchQuery]);

  useEffect(() => { loadCases(); }, [loadCases]);

  const handleCreate = async () => {
    if (!newTitle.trim() || !newDesc.trim()) {
      toast.error('Başlık ve detaylar zorunludur.');
      return;
    }
    setCreating(true);
    const tags = newTagsRaw.split(',').map(t => t.trim()).filter(Boolean);
    try {
      const created = await consultationService.create({ title: newTitle.trim(), description: newDesc.trim(), tags });
      setCases(prev => [created, ...prev]);
      setShowNewModal(false);
      setNewTitle(''); setNewDesc(''); setNewTagsRaw('');
      toast.success('Vaka paylaşıldı.');
    } catch {
      toast.error('Vaka oluşturulamadı.');
    }
    setCreating(false);
  };

  const handleOpenCase = async (c: ConsultationCase) => {
    try {
      const detail = await consultationService.getDetail(c.id);
      setSelectedCase(detail);
    } catch {
      toast.error('Vaka detayı yüklenemedi.');
    }
  };

  const handleStatusChange = async (id: string, status: 'OPEN' | 'RESOLVED' | 'ARCHIVED') => {
    const updated = await consultationService.updateStatus(id, status);
    setCases(prev => prev.map(c => c.id === id ? { ...c, status: updated.status } : c));
    if (selectedCase?.id === id) setSelectedCase(prev => prev ? { ...prev, status: updated.status } : null);
  };

  if (selectedCase) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-2">
        <CaseDetailView
          caseItem={selectedCase}
          currentUserId={user?.id}
          onBack={() => setSelectedCase(null)}
          onStatusChange={handleStatusChange}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto px-4 py-2 animate-fade-in">
      <PageOnboarding
        pageId="expert_consultation"
        title="Uzman Konsültasyon Odası"
        description="Diğer uzmanlarla vakalarınızı tartışın, multidisipliner yaklaşımlar geliştirin. Bu alan yalnızca uzmanlara özeldir."
        steps={[
          { icon: <Shield size={20} />, title: "Güvenli Alan", description: "Yalnızca doğrulanmış uzmanların erişebildiği bu alanda meslektaşlarınızla fikir alışverişi yapın." },
          { icon: <Users size={20} />, title: "Multidisipliner Yaklaşım", description: "Farklı disiplinlerden uzmanlardan vakalarınız için gerçek zamanlı görüş alın." },
        ]}
      />

      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="text-purple-600" size={24} />
            Vaka Danışma Odası
          </h1>
          <p className="text-gray-500 mt-1 text-sm">Uzmanlar arası multidisipliner vaka değerlendirme ağı</p>
        </div>
        <Button onClick={() => setShowNewModal(true)} className="bg-purple-600 hover:bg-purple-700 text-white shrink-0">
          <Plus size={16} className="mr-2" />
          Yeni Vaka Danış
        </Button>
      </div>

      <div className="flex flex-col md:flex-row gap-3 items-center bg-white p-2 rounded-2xl border border-gray-100 shadow-sm">
        <div className="flex gap-1 w-full md:w-auto p-1 bg-gray-50 rounded-xl">
          {([
            { key: 'all', label: 'Tüm Vakalar' },
            { key: 'OPEN', label: 'Açık' },
            { key: 'RESOLVED', label: 'Çözülenler' },
          ] as { key: TabFilter; label: string }[]).map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                activeTab === tab.key
                  ? 'bg-white text-purple-700 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="relative w-full md:w-64">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Vaka veya etiket ara..."
            className="w-full pl-9 pr-9 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => <SkeletonCard key={i} lines={4} />)}
        </div>
      ) : cases.length === 0 ? (
        <EmptyState
          icon={<Users size={32} />}
          title="Vaka bulunamadı"
          description={searchQuery ? 'Arama kriterlerinize uygun vaka yok.' : 'Henüz paylaşılmış vaka bulunmuyor.'}
          action={
            <Button onClick={() => setShowNewModal(true)} className="bg-purple-600 hover:bg-purple-700 text-white">
              <Plus size={14} className="mr-1.5" /> İlk Vakayı Paylaş
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4">
          {cases.map(c => (
            <Card
              key={c.id}
              className="p-0 overflow-hidden hover:border-purple-200 transition-all hover:shadow-md cursor-pointer group"
              onClick={() => handleOpenCase(c)}
            >
              <div className="p-5">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <AuthorAvatar name={c.authorName} imageUrl={c.authorImageUrl} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-gray-900">{c.authorName}</span>
                        {c.authorTitle && (
                          <span className="text-[10px] text-purple-600 font-medium">{c.authorTitle}</span>
                        )}
                      </div>
                      <span className="text-[10px] text-gray-400">{timeAgo(c.createdAt)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <StatusBadge status={c.status} />
                    <ChevronRight size={15} className="text-gray-300 group-hover:text-purple-500 group-hover:translate-x-0.5 transition-all" />
                  </div>
                </div>

                <h3 className="text-base font-bold text-gray-900 group-hover:text-purple-700 transition-colors mb-2">
                  {c.title}
                </h3>
                <p className="text-sm text-gray-600 line-clamp-2 mb-4">{c.description}</p>

                <div className="flex items-center justify-between border-t border-gray-50 pt-3">
                  <div className="flex flex-wrap gap-2">
                    {c.tags.map(t => (
                      <span key={t} className="flex items-center gap-1 text-[10px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg">
                        <Tag size={10} /> {t}
                      </span>
                    ))}
                  </div>
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-gray-500">
                    <MessageSquare size={14} /> {c.replyCount} Görüş
                  </span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal isOpen={showNewModal} onClose={() => setShowNewModal(false)} title="Yeni Vaka Danış" className="max-w-2xl">
        <div className="space-y-4">
          <div className="p-3 bg-purple-50 rounded-xl border border-purple-100 flex gap-3 text-sm text-purple-800">
            <Shield className="shrink-0 text-purple-600 mt-0.5" size={18} />
            <p>
              <strong>KVKK Hatırlatması:</strong> Vaka paylaşırken çocuğun/ailenin kimliğini açık eden bilgileri (isim, fotoğraf vb.) maskelemeye özen gösterin.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wider">
              Vaka Özeti (Başlık) *
            </label>
            <input
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              placeholder="Örn: 4 Yaş OSB — Yoğun Ekolali ve Yönerge Eksikliği"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wider">
              Detaylar ve Gözlemler *
            </label>
            <textarea
              value={newDesc}
              onChange={e => setNewDesc(e.target.value)}
              rows={5}
              placeholder="Vaka hikayesi, uygulanan yöntemler, yaşanan zorluk ve uzmanlardan beklenen görüş..."
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-colors resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wider">
              Etiketler
            </label>
            <input
              value={newTagsRaw}
              onChange={e => setNewTagsRaw(e.target.value)}
              placeholder="Virgülle ayırın (Örn: Floortime, ABA, Ergoterapi)"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-colors"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowNewModal(false)}>İptal</Button>
            <Button
              onClick={handleCreate}
              loading={creating}
              disabled={!newTitle.trim() || !newDesc.trim()}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              Vakayı Yayınla
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
