import { useEffect, useRef, useState } from 'react';
import {
  Users, Plus, Search, CheckCircle, LogIn, LogOut as LogOutIcon,
  MessageCircle, X, Send, Loader2, ArrowRight, MoreVertical, Calendar,
  Edit, Trash2, Volume2, VolumeX, ShieldCheck, UserMinus, Ban
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { TextArea } from '@/components/ui/TextArea';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { Badge } from '@/components/ui/Badge';
import { PageOnboarding } from '@/components/ui/PageOnboarding';
import { groupService } from '@/services/groupService';
import { messagingService } from '@/services/messagingService';
import { adminService } from '@/services/adminService';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useAuthStore } from '@/store/authStore';
import type { Group, Message, GroupMeeting, User } from '@/types';
import { toast } from '@/store/toastStore';

const groupCategories = [
  'Konuşma Gecikmesi', 'Duyusal İşleme', 'Sosyal Beceriler',
  'Erken Müdahale', 'Okul Dönemi', 'Ergen Dönemi', 'Genel',
];

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
}

interface ChatState {
  group: Group;
  conversationId: string;
  muted?: boolean;
}

// ─── Inline Group Chat Panel ──────────────────────────────────────────────────
function GroupChatPanel({ chatState, onClose }: { chatState: ChatState; onClose: () => void }) {
  const { group, conversationId } = chatState;
  const currentUser = useAuthStore(s => s.user);
  const { subscribe, unsubscribe, send } = useWebSocket();

  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [isMuted, setIsMuted] = useState(chatState.muted || false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const handleToggleMute = async () => {
    try {
      await messagingService.muteConversation(conversationId, !isMuted);
      setIsMuted(!isMuted);
      toast.success(isMuted ? 'Sohbetin sesi açıldı.' : 'Sohbet sessize alındı.');
    } catch {
      toast.error('İşlem başarısız.');
    }
  };

  // Load initial messages
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoadingMessages(true);
    messagingService.getMessages(conversationId, 0, 50)
      .then(res => {
        setMessages(res.content.slice().reverse());
        messagingService.markAsRead(conversationId).catch(() => {});
      })
      .catch(() => toast.error('Mesajlar yüklenemedi.'))
      .finally(() => setLoadingMessages(false));
  }, [conversationId]);

  // Real-time messages via WebSocket
  useEffect(() => {
    const topic = `/topic/conversation/${conversationId}`;
    subscribe(topic, (body: unknown) => {
      const msg = body as Message;
      setMessages(prev => {
        if (prev.some(m => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    });
    return () => unsubscribe(topic);
  }, [conversationId, subscribe, unsubscribe]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleDeleteMessage = async (messageId: string) => {
    if (!window.confirm('Bu mesajı tamamen silmek istediğinize emin misiniz?')) return;
    try {
      await messagingService.deleteMessage(messageId);
      setMessages(prev => prev.filter(m => m.id !== messageId));
      toast.success('Mesaj silindi.');
    } catch {
      toast.error('Mesaj silinemedi. Yetkiniz olmayabilir.');
    }
  };

  const handleSend = async () => {
    const content = text.trim();
    if (!content || sending) return;
    setSending(true);
    setText('');
    try {
      // Sadece WS üzerinden gönder — backend /topic/conversation/{id}'ye broadcast yapar,
      // WS subscription'ı mesajı alır ve UI'ya ekler. Çift kayıt olmaz.
      send(`/app/chat/${conversationId}`, { content });
    } catch {
      toast.error('Mesaj gönderilemedi.');
      setText(content);
    }
    setSending(false);
  };

  return (
    <div
      className="fixed inset-y-0 right-0 z-40 flex flex-col w-full sm:w-[420px] bg-slate-50/95 backdrop-blur-2xl border-l border-white/40 shadow-[-20px_0_40px_-10px_rgba(0,0,0,0.1)] transition-transform duration-500 animate-in slide-in-from-right-full"
      style={{ top: 0 }}
      role="dialog"
      aria-label={`${group.name} grup sohbeti`}
    >
      {/* Header */}
      <div className="relative overflow-hidden flex items-center gap-3 px-6 py-5 bg-gradient-to-br from-primary-600 via-primary-500 to-indigo-600 shadow-md z-10 shrink-0">
        <div className="absolute inset-0 bg-black/5 opacity-10 mix-blend-overlay"></div>
        <div className="flex-1 min-w-0 relative z-10">
          <p className="text-lg font-extrabold text-white truncate tracking-tight">{group.name}</p>
          <p className="text-xs font-medium text-primary-50 flex items-center gap-1.5 mt-1 opacity-90">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            {group.memberCount} üye
          </p>
        </div>
        <div className="flex items-center gap-2 relative z-10">
          <button
            onClick={handleToggleMute}
            className="p-2.5 rounded-full text-white bg-white/10 hover:bg-white/20 border border-white/10 transition-all backdrop-blur-md shadow-sm cursor-pointer"
            aria-label={isMuted ? "Sesi Aç" : "Sessize Al"}
          >
            {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
          <button
            onClick={onClose}
            className="p-2.5 rounded-full text-white bg-white/10 hover:bg-white/20 border border-white/10 transition-all backdrop-blur-md shadow-sm cursor-pointer"
            aria-label="Sohbeti kapat"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2 bg-gray-50">
        {loadingMessages ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 size={24} className="animate-spin text-primary-400" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8 animate-in fade-in zoom-in-95 duration-500">
            <div className="relative w-24 h-24 mb-6">
              <div className="absolute inset-0 bg-primary-200 rounded-full blur-xl opacity-50 animate-pulse"></div>
              <div className="relative w-full h-full bg-gradient-to-br from-primary-50 to-white border border-primary-100 rounded-3xl flex items-center justify-center shadow-lg rotate-3 hover:rotate-0 transition-transform duration-300">
                <MessageCircle size={40} className="text-primary-500" />
              </div>
            </div>
            <h3 className="text-xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent mb-2">Sohbete Başlayın</h3>
            <p className="text-sm text-gray-500 max-w-[250px] leading-relaxed">Topluluğa merhaba diyerek ilk mesajı gönderin ve etkileşimi başlatın.</p>
          </div>
        ) : (
          messages.map(msg => {
            const isMe = msg.senderId === currentUser?.id;
            const senderName = msg.senderName || 'Kullanıcı';
            return (
              <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-3 duration-500 mb-4`}>
                <div className={`max-w-[80%] ${isMe ? 'items-end' : 'items-start'} flex flex-col group`}>
                  {!isMe && (
                    <span className="text-[11px] font-medium text-gray-500 mb-1 px-1.5 ml-1">{senderName}</span>
                  )}
                  <div
                    className={`px-4 py-2.5 text-sm leading-relaxed break-words relative shadow-sm transition-all hover:shadow-md ${
                      isMe
                        ? 'bg-gradient-to-br from-primary-500 to-primary-600 text-white rounded-2xl rounded-br-sm border border-primary-400/30'
                        : msg.senderRole === 'EXPERT'
                          ? 'bg-gradient-to-br from-emerald-50 to-emerald-100/50 text-emerald-950 rounded-2xl rounded-bl-sm border border-emerald-200/60'
                          : 'bg-white text-gray-800 rounded-2xl rounded-bl-sm border border-gray-100/80'
                    }`}
                  >
                    {msg.senderRole === 'EXPERT' && !isMe && (
                      <div className="text-[10px] font-bold text-emerald-600 mb-1 flex items-center gap-1 uppercase tracking-wide">
                        <ShieldCheck size={12} className="text-emerald-500" /> Uzman
                      </div>
                    )}
                    <span className="relative z-10">{msg.content}</span>
                  </div>
                  <div className={`flex items-center opacity-0 group-hover:opacity-100 transition-opacity mt-1 ${isMe ? 'mr-1' : 'ml-1'}`}>
                    {(isMe || currentUser?.role === 'ADMIN' || group.createdByUserId === currentUser?.id) && (
                      <button
                        onClick={() => handleDeleteMessage(msg.id)}
                        className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors mr-1"
                        title="Mesajı Sil"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                    <span className={`text-[10px] text-gray-400 px-1.5`}>{msg.sentAt ? formatTime(msg.sentAt) : ''}</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-5 py-4 bg-white/90 backdrop-blur-xl border-t border-gray-200/60 shadow-[0_-10px_40px_-10px_rgba(0,0,0,0.05)] z-10 shrink-0">
        <div className="flex items-end gap-3 bg-white p-1.5 rounded-[24px] border border-gray-200 shadow-sm focus-within:shadow-md focus-within:border-primary-300 focus-within:ring-4 focus-within:ring-primary-500/10 transition-all duration-300">
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
            }}
            placeholder="Mesaj yaz…"
            rows={1}
            className="flex-1 resize-none bg-transparent px-4 py-2.5 text-[15px] text-gray-800 placeholder-gray-400 focus:outline-none max-h-32 overflow-y-auto leading-relaxed"
            aria-label="Mesaj içeriği"
          />
          <button
            onClick={handleSend}
            disabled={!text.trim() || sending}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-indigo-600 text-white shadow-md transition-all duration-300 hover:shadow-lg hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 disabled:hover:shadow-md cursor-pointer"
            aria-label="Gönder"
          >
            {sending ? <Loader2 size={20} className="animate-spin" /> : <Send size={18} className="ml-0.5" />}
          </button>
        </div>
        <p className="mt-2.5 text-[11px] font-medium text-gray-400 text-center">Enter ile gönder · Shift+Enter yeni satır</p>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export function GroupsPage() {
  const [myGroups, setMyGroups] = useState<Group[]>([]);
  const [searchResults, setSearchResults] = useState<Group[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'my' | 'discover'>('my');
  const [form, setForm] = useState({ name: '', description: '', category: '' });
  const [openingChatId, setOpeningChatId] = useState<string | null>(null);
  const [chatState, setChatState] = useState<ChatState | null>(null);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [selectedDetailGroup, setSelectedDetailGroup] = useState<Group | null>(null);

  const currentUser = useAuthStore(s => s.user);

  useEffect(() => {
    groupService.getMyGroups().then(setMyGroups).catch(() => {});
    groupService.search('').then(setSearchResults).catch(() => {});
  }, []);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSelectedCategory(null); // Arama yapıldığında kategori filtresini temizle
    try {
      const results = await groupService.search(searchQuery);
      setSearchResults(results);
    } catch { /* ignore */ }
  };

  const handleCategorySelect = async (category: string | null) => {
    setSelectedCategory(category);
    setSearchQuery(''); // Kategori seçildiğinde arama metnini temizle
    try {
      if (category) {
        const results = await groupService.getByCategory(category);
        setSearchResults(results);
      } else {
        const results = await groupService.search('');
        setSearchResults(results);
      }
    } catch { /* ignore */ }
  };

  const handleSubmit = async () => {
    if (!form.name) return;
    setLoading(true);
    try {
      if (editingGroup) {
        const updated = await groupService.updateGroup(editingGroup.id, form);
        setMyGroups(prev => prev.map(g => g.id === editingGroup.id ? updated : g));
        setSearchResults(prev => prev.map(g => g.id === editingGroup.id ? updated : g));
        toast.success('Grup güncellendi.');
      } else {
        const group = await groupService.create(form);
        setMyGroups(prev => [...prev, group]);
        setSearchResults(prev => [group, ...prev]);
        toast.success('Grup oluşturuldu.');
      }
      setShowModal(false);
      setForm({ name: '', description: '', category: '' });
      setEditingGroup(null);
    } catch {
      toast.error(editingGroup ? 'Grup güncellenemedi.' : 'Grup oluşturulamadı.');
    }
    setLoading(false);
  };

  const handleOpenEdit = (group: Group) => {
    setEditingGroup(group);
    setForm({
      name: group.name,
      description: group.description || '',
      category: group.category || '',
    });
    setShowModal(true);
  };

  const handleDeleteGroup = async (groupId: string) => {
    if (!window.confirm('Bu grubu silmek istediğinize emin misiniz? Tüm konuşma geçmişi ve toplantılar silinecektir.')) return;
    try {
      await groupService.deleteGroup(groupId);
      setMyGroups(prev => prev.filter(g => g.id !== groupId));
      setSearchResults(prev => prev.filter(g => g.id !== groupId));
      if (chatState?.group.id === groupId) setChatState(null);
      toast.success('Grup silindi.');
    } catch {
      toast.error('Grup silinemedi.');
    }
  };

  const handleToggleVerify = async (groupId: string) => {
    try {
      const updated = await groupService.toggleVerify(groupId);
      setMyGroups(prev => prev.map(g => g.id === groupId ? updated : g));
      setSearchResults(prev => prev.map(g => g.id === groupId ? updated : g));
      toast.success('Grup doğrulama durumu güncellendi.');
    } catch {
      toast.error('İşlem başarısız.');
    }
  };

  const handleJoin = async (groupId: string) => {
    try {
      await groupService.join(groupId);
      setSearchResults(prev => prev.map(g => g.id === groupId ? { ...g, isMember: true, memberCount: g.memberCount + 1 } : g));
      groupService.getMyGroups().then(setMyGroups).catch(() => {});
      toast.success('Gruba katıldınız.');
    } catch { toast.error('Gruba katılınamadı.'); }
  };

  const handleLeave = async (groupId: string) => {
    if (chatState?.group.id === groupId) setChatState(null);
    try {
      await groupService.leave(groupId);
      setMyGroups(prev => prev.filter(g => g.id !== groupId));
      setSearchResults(prev => prev.map(g => g.id === groupId ? { ...g, isMember: false, memberCount: Math.max(0, g.memberCount - 1) } : g));
      toast.success('Gruptan ayrıldınız.');
    } catch { toast.error('Gruptan ayrılınamadı.'); }
  };

  const handleOpenChat = async (groupId: string) => {
    // Toggle: close if already open for this group
    if (chatState?.group.id === groupId) { setChatState(null); return; }
    const group = myGroups.find(g => g.id === groupId) || searchResults.find(g => g.id === groupId);
    if (!group) return;
    setOpeningChatId(groupId);
    try {
      const conv = await messagingService.getOrCreateGroup(groupId);
      setChatState({ group, conversationId: conv.id, muted: !!conv.muted });
    } catch { toast.error('Grup sohbeti açılamadı.'); }
    setOpeningChatId(null);
  };

  return (
    <div className={`space-y-8 transition-all duration-500 ease-out ${chatState ? 'xl:mr-[400px]' : ''}`}>
      <PageOnboarding
        pageId="groups"
        title="Gruplara Hoş Geldiniz"
        description="Benzer deneyimlere sahip ailelerle iletişime geçin ve kapalı sohbet gruplarına katılın."
        steps={[
          {
            icon: <Search size={20} />,
            title: "Grup Keşfedin",
            description: "Çocuğunuzun durumuna uygun grupları bulun ve deneyim paylaşımına başlayın."
          },
          {
            icon: <MessageCircle size={20} />,
            title: "Canlı Sohbet Edin",
            description: "Grup kartındaki 'Sohbet' butonuna tıklayarak grup içi canlı sohbeti açın."
          }
        ]}
      />

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 bg-gradient-to-br from-primary-50 via-white to-indigo-50 rounded-2xl shadow-sm border border-primary-100/60">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">Gruplar</h1>
          <p className="text-gray-600 mt-2 text-sm max-w-lg leading-relaxed">Benzer deneyimler yaşayan ailelerle bağlantı kurun, bilgi alışverişinde bulunun ve birbirinize destek olun.</p>
        </div>
        <Button onClick={() => setShowModal(true)} className="rounded-xl shadow-md shadow-primary-200 hover:shadow-lg transition-all hover:-translate-y-0.5 whitespace-nowrap">
          <Plus size={18} className="mr-2" /> Grup Oluştur
        </Button>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab('my')}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer ${
            activeTab === 'my' ? 'bg-primary-600 text-white' : 'bg-white text-gray-600 border border-gray-200'
          }`}
        >
          Gruplarım ({myGroups.length})
        </button>
        <button
          onClick={() => setActiveTab('discover')}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer ${
            activeTab === 'discover' ? 'bg-primary-600 text-white' : 'bg-white text-gray-600 border border-gray-200'
          }`}
        >
          Keşfet
        </button>
      </div>
      {activeTab === 'discover' && (
        <div className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder="Grup ara..."
              className="flex-1"
            />
            <Button onClick={handleSearch}>
              <Search size={18} />
            </Button>
          </div>
          
          {/* Category Filter Pills */}
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
            <button
              onClick={() => handleCategorySelect(null)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                selectedCategory === null ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Hepsi
            </button>
            {groupCategories.map(cat => (
              <button
                key={cat}
                onClick={() => handleCategorySelect(cat)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                  selectedCategory === cat ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'my' ? (
        myGroups.length === 0 ? (
          <EmptyState
            icon={<Users size={32} />}
            title="Henüz bir gruba katılmadınız"
            description="Gruplar aracılığıyla benzer deneyimler yaşayan ailelerle iletişime geçin"
            action={<Button onClick={() => setActiveTab('discover')}>Grup Keşfet</Button>}
          />
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {myGroups.map(group => (
              <GroupCard
                key={group.id}
                group={group}
                onLeave={handleLeave}
                onChat={handleOpenChat}
                onDetails={() => setSelectedDetailGroup(group)}
                onEdit={handleOpenEdit}
                onDelete={handleDeleteGroup}
                onVerify={handleToggleVerify}
                currentUser={currentUser}
                openingChatId={openingChatId}
                activeChatGroupId={chatState?.group.id ?? null}
              />
            ))}
          </div>
        )
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {searchResults.map(group => (
            <GroupCard
              key={group.id}
              group={group}
              onJoin={handleJoin}
              onLeave={handleLeave}
              onChat={handleOpenChat}
              onDetails={() => setSelectedDetailGroup(group)}
              onEdit={handleOpenEdit}
              onDelete={handleDeleteGroup}
              onVerify={handleToggleVerify}
              currentUser={currentUser}
              openingChatId={openingChatId}
              activeChatGroupId={chatState?.group.id ?? null}
            />
          ))}
        </div>
      )}

      {selectedDetailGroup && (
        <GroupDetailsModal
          group={selectedDetailGroup}
          currentUser={currentUser}
          onClose={() => setSelectedDetailGroup(null)}
        />
      )}

      {/* Inline Group Chat Panel */}
      {chatState && (
        <GroupChatPanel chatState={chatState} onClose={() => setChatState(null)} />
      )}

      {/* Backdrop for small screens up to xl */}
      {chatState && (
        <div
          className="fixed inset-0 z-30 bg-slate-900/20 backdrop-blur-sm xl:hidden animate-in fade-in duration-300"
          onClick={() => setChatState(null)}
        />
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Yeni Grup Oluştur">
        <div className="space-y-4">
          <Input label="Grup Adı *" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Örn: 3-5 Yaş Konuşma Gecikmesi" />
          <TextArea label="Açıklama" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Grubun amacını açıklayın" />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Kategori</label>
            <div className="flex flex-wrap gap-2">
              {groupCategories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setForm(f => ({ ...f, category: f.category === cat ? '' : cat }))}
                  className={`px-3 py-1.5 rounded-lg text-sm transition-all cursor-pointer ${
                    form.category === cat ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={() => setShowModal(false)} className="flex-1">İptal</Button>
            <Button onClick={handleSubmit} loading={loading} className="flex-1">Oluştur</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ─── Group Card ───────────────────────────────────────────────────────────────
function GroupCard({
  group,
  onJoin,
  onLeave,
  onChat,
  onDetails,
  onEdit,
  onDelete,
  onVerify,
  currentUser,
  openingChatId,
  activeChatGroupId,
}: {
  group: Group;
  onJoin?: (id: string) => void;
  onLeave?: (id: string) => void;
  onChat?: (id: string) => void;
  onDetails?: () => void;
  onEdit?: (group: Group) => void;
  onDelete?: (id: string) => void;
  onVerify?: (id: string) => void;
  currentUser: User | null;
  openingChatId?: string | null;
  activeChatGroupId?: string | null;
}) {
  const isChatOpen = activeChatGroupId === group.id;
  const isCreatorOrAdmin = group.createdByUserId === currentUser?.id || currentUser?.role === 'ADMIN';
  const isAdmin = currentUser?.role === 'ADMIN';
  const [menuOpen, setMenuOpen] = useState(false);

  // Kategori bazlı özel renk temaları ve degrade (gradient) çizgileri
  const getCategoryTheme = (cat?: string) => {
    switch (cat) {
      case 'Konuşma Gecikmesi':
        return { bg: 'bg-blue-50 text-blue-600', badge: 'bg-blue-50 text-blue-700 border-blue-100', gradient: 'from-blue-500 to-indigo-500' };
      case 'Duyusal İşleme':
        return { bg: 'bg-purple-50 text-purple-600', badge: 'bg-purple-50 text-purple-700 border-purple-100', gradient: 'from-purple-500 to-pink-500' };
      case 'Sosyal Beceriler':
        return { bg: 'bg-emerald-50 text-emerald-600', badge: 'bg-emerald-50 text-emerald-700 border-emerald-100', gradient: 'from-emerald-500 to-teal-500' };
      case 'Erken Müdahale':
        return { bg: 'bg-amber-50 text-amber-600', badge: 'bg-amber-50 text-amber-700 border-amber-100', gradient: 'from-amber-500 to-orange-500' };
      case 'Okul Dönemi':
        return { bg: 'bg-cyan-50 text-cyan-600', badge: 'bg-cyan-50 text-cyan-700 border-cyan-100', gradient: 'from-cyan-500 to-blue-500' };
      case 'Ergen Dönemi':
        return { bg: 'bg-rose-50 text-rose-600', badge: 'bg-rose-50 text-rose-700 border-rose-100', gradient: 'from-rose-500 to-red-500' };
      default:
        return { bg: 'bg-slate-50 text-slate-600', badge: 'bg-slate-50 text-slate-700 border-slate-100', gradient: 'from-slate-500 to-gray-500' };
    }
  };

  const theme = getCategoryTheme(group.category);

  return (
    <div className="relative group overflow-hidden rounded-2xl bg-white border border-slate-100 p-5 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between h-full min-h-[220px]">
      <div className={`absolute top-0 inset-x-0 h-1 bg-gradient-to-r ${theme.gradient}`} />

      <div>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl ${theme.bg} flex items-center justify-center transition-transform group-hover:scale-110 duration-300`}>
              <Users size={22} />
            </div>
            {group.verified && (
              <Badge variant="success" className="animate-pulse shadow-sm">
                <CheckCircle size={12} className="mr-1" /> Doğrulanmış
              </Badge>
            )}
          </div>
          
          {(isCreatorOrAdmin || isAdmin) && (
            <div className="relative">
              <button 
                onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                <MoreVertical size={18} />
              </button>
              {menuOpen && (
                <div className="absolute right-0 mt-1 w-36 bg-white border border-slate-100 shadow-lg rounded-xl z-10 py-1 overflow-hidden">
                  {onEdit && isCreatorOrAdmin && (
                    <button onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onEdit(group); }} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"><Edit size={14} /> Düzenle</button>
                  )}
                  {onVerify && isAdmin && (
                    <button onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onVerify(group.id); }} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"><ShieldCheck size={14} /> {group.verified ? 'Kaldır' : 'Doğrula'}</button>
                  )}
                  {onDelete && isCreatorOrAdmin && (
                    <button onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onDelete(group.id); }} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 cursor-pointer"><Trash2 size={14} /> Sil</button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <h3 className="font-bold text-slate-900 mt-4 group-hover:text-primary-600 transition-colors duration-200 text-lg leading-snug cursor-pointer" onClick={onDetails}>
          {group.name}
        </h3>

        {group.description ? (
          <p className="text-sm text-slate-500 mt-2 line-clamp-2 leading-relaxed cursor-pointer" onClick={onDetails}>
            {group.description}
          </p>
        ) : (
          <p className="text-sm text-slate-300 mt-2 italic cursor-pointer" onClick={onDetails}>Açıklama belirtilmemiş.</p>
        )}

        <div className="flex items-center gap-2 mt-3 cursor-pointer" onClick={onDetails}>
          {group.category && (
            <span className={`inline-block px-2.5 py-1 rounded-lg text-xs font-semibold border ${theme.badge}`}>
              {group.category}
            </span>
          )}
          {group.expertCount > 0 && (
            <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold border bg-emerald-50 text-emerald-700 border-emerald-100">
              <ShieldCheck size={12} className="mr-1" /> {group.expertCount} Uzman
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mt-5 pt-4 border-t border-slate-100/80 gap-3">
        <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-500 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-100 cursor-pointer hover:bg-slate-100 transition-colors" onClick={onDetails}>
          <Users size={16} className="text-primary-500" />
          <span>{group.memberCount} üye</span>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 w-full sm:w-auto">
          {group.isMember && onChat && (
            <Button size="sm" variant={isChatOpen ? 'primary' : 'outline'} onClick={() => onChat(group.id)} loading={openingChatId === group.id} className={`rounded-xl transition-all flex-1 sm:flex-none justify-center shadow-sm hover:shadow-md ${!isChatOpen ? 'hover:bg-primary-50 hover:text-primary-600 hover:border-primary-200' : 'shadow-primary-200 shadow-md'}`}>
              {isChatOpen ? <><X size={14} className="mr-1.5" /> Kapat</> : <><MessageCircle size={14} className="mr-1.5" /> Sohbet</>}
            </Button>
          )}
          {group.isMember ? (
            <Button variant="outline" size="sm" onClick={() => onLeave?.(group.id)} className="rounded-xl text-red-600 border-red-100 hover:bg-red-50 hover:text-red-700 hover:border-red-200 shadow-sm flex-1 sm:flex-none justify-center">
              <LogOutIcon size={14} className="mr-1.5" /> Ayrıl
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={() => onJoin?.(group.id)}
              className="rounded-xl shadow-md shadow-primary-200 hover:shadow-lg transition-all hover:-translate-y-0.5 flex-1 sm:flex-none justify-center"
            >
              <LogIn size={14} className="mr-1.5" /> Katıl
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Group Details Modal ──────────────────────────────────────────────────────
function GroupDetailsModal({ group, currentUser, onClose }: { group: Group, currentUser: User | null, onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<'info'|'members'|'meetings'>('info');
  const [members, setMembers] = useState<User[]>([]);
  const [meetings, setMeetings] = useState<GroupMeeting[]>([]);
  const [loading, setLoading] = useState(false);

  const isCreatorOrAdmin = group.createdByUserId === currentUser?.id || currentUser?.role === 'ADMIN';

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        if (activeTab === 'members' && members.length === 0) {
          const res = await groupService.getMembers(group.id);
          setMembers(res);
        } else if (activeTab === 'meetings' && meetings.length === 0) {
          const res = await groupService.getMeetings(group.id);
          setMeetings(res);
        }
      } catch {
        toast.error('Bilgiler yüklenemedi.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [activeTab, group.id]);

  const handleKickMember = async (userId: string, userName: string) => {
    if (!window.confirm(`${userName} isimli kullanıcıyı gruptan çıkarmak istediğinize emin misiniz?`)) return;
    try {
      const conv = await messagingService.getOrCreateGroup(group.id);
      await messagingService.removeMember(conv.id, userId);
      setMembers(prev => prev.filter(m => m.id !== userId));
      toast.success(`${userName} gruptan çıkarıldı.`);
    } catch {
      toast.error('Kullanıcı çıkarılamadı. Yetkiniz olmayabilir.');
    }
  };

  const handleBanUser = async (userId: string, userName: string, isActive: boolean) => {
    const action = isActive ? 'yasaklamak' : 'yasağını kaldırmak';
    if (!window.confirm(`${userName} isimli kullanıcının ${action} istediğinize emin misiniz?`)) return;
    try {
      await adminService.toggleUserStatus(userId);
      setMembers(prev => prev.map(m => m.id === userId ? { ...m, isActive: !isActive } : m));
      toast.success(`Kullanıcı durumu güncellendi.`);
    } catch {
      toast.error('Kullanıcı durumu güncellenemedi.');
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="Grup Detayları" size="lg">
      <div className="flex gap-4 mb-6 border-b border-gray-100 pb-2">
        <button onClick={() => setActiveTab('info')} className={`pb-2 font-medium text-sm transition-colors relative ${activeTab==='info'?'text-primary-600':'text-gray-500 hover:text-gray-700'}`}>Bilgiler{activeTab==='info' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-primary-600 rounded-full" />}</button>
        <button onClick={() => setActiveTab('members')} className={`pb-2 font-medium text-sm transition-colors relative ${activeTab==='members'?'text-primary-600':'text-gray-500 hover:text-gray-700'}`}>Üyeler ({group.memberCount}){activeTab==='members' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-primary-600 rounded-full" />}</button>
        <button onClick={() => setActiveTab('meetings')} className={`pb-2 font-medium text-sm transition-colors relative ${activeTab==='meetings'?'text-primary-600':'text-gray-500 hover:text-gray-700'}`}>Toplantılar{activeTab==='meetings' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-primary-600 rounded-full" />}</button>
      </div>

      <div className="min-h-[250px]">
        {activeTab === 'info' && (
          <div className="space-y-4">
            <div><h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-1">Grup Adı</h4><p className="text-gray-900 font-medium">{group.name}</p></div>
            <div><h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-1">Açıklama</h4><p className="text-gray-700 leading-relaxed">{group.description || 'Açıklama yok'}</p></div>
            <div><h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-1">Kategori</h4><Badge>{group.category}</Badge></div>
          </div>
        )}

        {activeTab === 'members' && (
          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
            {loading ? (
              <div className="flex justify-center py-8"><Loader2 size={24} className="animate-spin text-primary-400" /></div>
            ) : members.length === 0 ? (
              <p className="text-center text-gray-500 py-8">Henüz üye bulunmuyor.</p>
            ) : (
              members.map(member => (
                <div key={member.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100 transition-colors hover:bg-gray-100 group">
                  <div className="flex items-center gap-3">
                    {member.profileImageUrl ? (
                      <img src={member.profileImageUrl} alt={member.fullName} className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center font-bold text-sm">
                        {member.fullName.charAt(0)}
                      </div>
                    )}
                    <div>
                      <p className="font-semibold text-gray-900 flex items-center gap-2">
                        {member.fullName}
                        {member.role === 'EXPERT' && (
                          <Badge variant="success" className="text-[10px] px-1.5 py-0 h-4 shadow-sm">Uzman</Badge>
                        )}
                        {member.isActive === false && (
                          <Badge variant="danger" className="text-[10px] px-1.5 py-0 h-4 shadow-sm">Banlı</Badge>
                        )}
                      </p>
                      <p className="text-xs text-gray-500">{member.role === 'EXPERT' ? member.expertTitle || 'Uzman' : 'Ebeveyn'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {group.createdByUserId === member.id && (
                      <Badge variant="warning" className="text-[10px] px-1.5 py-0 h-4 shadow-sm">Kurucu</Badge>
                    )}
                    {(isCreatorOrAdmin || currentUser?.role === 'ADMIN') && group.createdByUserId !== member.id && currentUser?.id !== member.id && (
                      <div className="flex opacity-0 group-hover:opacity-100 transition-opacity gap-1">
                        <button onClick={() => handleKickMember(member.id, member.fullName)} className="p-1.5 text-orange-600 hover:bg-orange-100 rounded-lg transition-colors" title="Gruptan Çıkar">
                          <UserMinus size={16} />
                        </button>
                        {currentUser?.role === 'ADMIN' && (
                           <button onClick={() => handleBanUser(member.id, member.fullName, member.isActive !== false)} className="p-1.5 text-red-600 hover:bg-red-100 rounded-lg transition-colors" title={member.isActive !== false ? "Kullanıcıyı Yasakla (Ban)" : "Yasağı Kaldır"}>
                             <Ban size={16} />
                           </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'meetings' && (
          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
            <p className="text-sm text-gray-500 mb-4">Toplantılar şu anda geliştirme aşamasındadır.</p>
          </div>
        )}
      </div>
    </Modal>
  );
}
