import { useEffect, useState, useRef, useCallback } from 'react';
import { useSearchParams, useLocation } from 'react-router-dom';
import {
  MessageCircle, Send, ArrowLeft, Plus, Search, X, WifiOff,
  CheckCheck, Check, Users, ChevronRight, Paperclip, FileText,
  Download, RefreshCw, BellOff, Bell, Archive, ArchiveRestore,
  Reply, UserPlus, UserMinus, Settings, CornerUpLeft,
  Flag,
} from 'lucide-react';
import { uploadService } from '@/services/uploadService';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { useAuthStore } from '@/store/authStore';
import { useWebSocket } from '@/hooks/useWebSocket';
import { messagingService } from '@/services/messagingService';
import { userService } from '@/services/userService';
import { reportService } from '@/services/reportService';
import { toast } from '@/store/toastStore';
import { formatRelative, formatTime } from '@/utils/date';
import { cn } from '@/utils/cn';
import type { Conversation, Message, User } from '@/types';

// ─── Yardımcı fonksiyonlar ─────────────────────────────────────────────────

function normalizeTR(s: string) {
  return s.toLocaleLowerCase('tr-TR')
    .replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ı/g, 'i')
    .replace(/ö/g, 'o').replace(/ş/g, 's').replace(/ü/g, 'u');
}

function getSenderColor(name: string) {
  const colors = [
    'text-red-600', 'text-orange-600', 'text-amber-600', 'text-emerald-600',
    'text-teal-600', 'text-blue-600', 'text-indigo-600', 'text-violet-600',
    'text-fuchsia-600', 'text-pink-600'
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

function buildGroupTitle(conv: Conversation, myId?: string) {
  const names = conv.participants.filter(p => p.id !== myId)
    .map(p => p.fullName?.split(' ')[0]).filter(Boolean) as string[];
  if (!names.length) return 'Grup';
  if (names.length <= 3) return names.join(', ');
  return `${names.slice(0, 3).join(', ')} +${names.length - 3}`;
}

/** Mesajları tarihe göre grupla → [{ date, messages[] }] */
function groupByDate(messages: Message[]) {
  const groups: { label: string; messages: Message[] }[] = [];
  let lastLabel = '';
  for (const msg of messages) {
    const d = new Date(msg.sentAt);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
    const msgDay = new Date(d); msgDay.setHours(0, 0, 0, 0);

    let label: string;
    if (msgDay.getTime() === today.getTime()) label = 'Bugün';
    else if (msgDay.getTime() === yesterday.getTime()) label = 'Dün';
    else label = d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });

    if (label !== lastLabel) {
      groups.push({ label, messages: [] });
      lastLabel = label;
    }
    groups[groups.length - 1].messages.push(msg);
  }
  return groups;
}

function getReadReceiptInfo(msg: Message, myId?: string) {
  const readers = (msg.readBy ?? []).filter(reader => reader.id !== myId && reader.id !== msg.senderId);
  const readerNames = readers.map(reader => reader.fullName?.trim()).filter(Boolean);
  const isRead = msg.read || readers.length > 0;

  if (!isRead) return { isRead: false, label: 'Gönderildi' };
  if (readerNames.length === 1) return { isRead: true, label: `${readerNames[0]} okudu` };
  if (readerNames.length > 1) {
    const visibleNames = readerNames.slice(0, 2).join(', ');
    const extraCount = readerNames.length - 2;
    return { isRead: true, label: extraCount > 0 ? `${visibleNames} ve ${extraCount} kişi okudu` : `${visibleNames} okudu` };
  }
  return { isRead: true, label: 'Okundu' };
}

const QUICK_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];
const MESSAGE_UNREAD_REFRESH_EVENT = 'message-unread-refresh';
type ConvFilter = 'all' | 'unread' | 'groups' | 'experts' | 'archived';
type ReadReceiptEvent = {
  type?: 'READ_RECEIPT';
  readBy?: string;
};
type MessageDeletedEvent = {
  type?: 'MESSAGE_DELETED';
  messageId?: string;
};
type BrowserAudioWindow = Window & {
  webkitAudioContext?: typeof AudioContext;
};

const PECS_CARDS = [
  { id: 'happy', label: 'Mutluyum', emoji: '😊', category: 'Duygular', color: 'bg-yellow-50 text-yellow-800 border-yellow-200 hover:bg-yellow-100' },
  { id: 'sad', label: 'Üzgünüm', emoji: '😢', category: 'Duygular', color: 'bg-blue-50 text-blue-800 border-blue-200 hover:bg-blue-100' },
  { id: 'angry', label: 'Öfkeliyim', emoji: '😠', category: 'Duygular', color: 'bg-red-50 text-red-800 border-red-200 hover:bg-red-100' },
  { id: 'scared', label: 'Korkuyorum', emoji: '😨', category: 'Duygular', color: 'bg-purple-50 text-purple-800 border-purple-200 hover:bg-purple-100' },
  { id: 'hungry', label: 'Açım', emoji: '🍔', category: 'İhtiyaçlar', color: 'bg-orange-50 text-orange-800 border-orange-200 hover:bg-orange-100' },
  { id: 'thirsty', label: 'Susadım', emoji: '🥤', category: 'İhtiyaçlar', color: 'bg-cyan-50 text-cyan-800 border-cyan-200 hover:bg-cyan-100' },
  { id: 'toilet', label: 'Tuvalet', emoji: '🚽', category: 'İhtiyaçlar', color: 'bg-indigo-50 text-indigo-800 border-indigo-200 hover:bg-indigo-100' },
  { id: 'help', label: 'Yardım', emoji: '🙋', category: 'İhtiyaçlar', color: 'bg-indigo-50 text-indigo-800 border-indigo-200 hover:bg-indigo-100' },
  { id: 'rest', label: 'Dinlenmek', emoji: '🛌', category: 'İhtiyaçlar', color: 'bg-teal-50 text-teal-800 border-teal-200 hover:bg-teal-100' },
  { id: 'play', label: 'Oynamak', emoji: '🧸', category: 'Günlük', color: 'bg-pink-50 text-pink-800 border-pink-200 hover:bg-pink-100' },
  { id: 'sleep', label: 'Uyumak', emoji: '😴', category: 'Günlük', color: 'bg-violet-50 text-violet-800 border-violet-200 hover:bg-violet-100' },
  { id: 'home', label: 'Eve Gitmek', emoji: '🏠', category: 'Günlük', color: 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100' },
];

function playSoftPop() {
  try {
    const AudioContextClass = window.AudioContext || (window as BrowserAudioWindow).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.1);
    osc.start();
    osc.stop(ctx.currentTime + 0.12);
  } catch {
    // Ignore context blocked or not supported
  }
}

function dispatchUnreadRefresh() {
  window.dispatchEvent(new Event(MESSAGE_UNREAD_REFRESH_EVENT));
}

// ─── Bileşen ───────────────────────────────────────────────────────────────

export function MessagesPage() {
  const { user } = useAuthStore();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { subscribe, unsubscribe, send, isConnected } = useWebSocket();

  const sensoryMuteRef = useRef(false);
  const sensoryReduceAnimRef = useRef(false);

  // Konuşma listesi
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [convLoading, setConvLoading] = useState(true);
  const [convFilter, setConvFilter] = useState<ConvFilter>('all');
  const [convSearch, setConvSearch] = useState('');

  // Seçili konuşma & mesajlar
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const selectedConvRef = useRef<Conversation | null>(null);
  useEffect(() => { selectedConvRef.current = selectedConv; }, [selectedConv]);

  const [messages, setMessages] = useState<Message[]>([]);
  const [msgLoading, setMsgLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  // Gönderme
  const [newMessage, setNewMessage] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);


  // Reply
  const [replyTo, setReplyTo] = useState<Message | null>(null);

  // Emoji reaksiyon picker
  const [pickerMsgId, setPickerMsgId] = useState<string | null>(null);

  // Duyusal Erişim Ayarları
  const [sensoryFont, setSensoryFont] = useState(() => localStorage.getItem('sensoryFont') === 'true');
  const [sensoryMute, setSensoryMute] = useState(() => localStorage.getItem('sensoryMute') === 'true');
  const [sensoryReduceAnim, setSensoryReduceAnim] = useState(() => localStorage.getItem('sensoryReduceAnim') === 'true');
  const [showSensoryMenu, setShowSensoryMenu] = useState(false);

  useEffect(() => { sensoryMuteRef.current = sensoryMute; }, [sensoryMute]);
  useEffect(() => { sensoryReduceAnimRef.current = sensoryReduceAnim; }, [sensoryReduceAnim]);

  const updateSensoryFont = (val: boolean) => { setSensoryFont(val); localStorage.setItem('sensoryFont', String(val)); };
  const updateSensoryMute = (val: boolean) => { setSensoryMute(val); localStorage.setItem('sensoryMute', String(val)); };
  const updateSensoryReduceAnim = (val: boolean) => { setSensoryReduceAnim(val); localStorage.setItem('sensoryReduceAnim', String(val)); };

  // PECS Galerisi
  const [showPecsPanel, setShowPecsPanel] = useState(false);

  // WS
  // WS
  const [wsConnected, setWsConnected] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Map<string, {name: string, timestamp: number}>>(new Map());
  const lastTypingSent = useRef<number>(0);
  const processedMessageIds = useRef<Set<string>>(new Set());

  // Çevrimiçi (Presence)
  const [onlineStatuses, setOnlineStatuses] = useState<Map<string, boolean>>(new Map());

  // Mesaj İçi Arama
  const [msgSearchQuery, setMsgSearchQuery] = useState('');
  const [isMsgSearching, setIsMsgSearching] = useState(false);
  const [showMsgSearch, setShowMsgSearch] = useState(false);
  const msgSearchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Paneller
  const [showGroupPanel, setShowGroupPanel] = useState(false);
  const [showGroupSettings, setShowGroupSettings] = useState(false);
  const [groupEditName, setGroupEditName] = useState('');
  const [addMemberQuery, setAddMemberQuery] = useState('');
  const [addMemberResults, setAddMemberResults] = useState<User[]>([]);
  const addMemberTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Yeni mesaj modal
  const [showNewModal, setShowNewModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [searching, setSearching] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Yeni GRUP oluşturma modal
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupParticipants, setGroupParticipants] = useState<User[]>([]);
  const [groupSearchQuery, setGroupSearchQuery] = useState('');
  const [groupSearchResults, setGroupSearchResults] = useState<User[]>([]);
  const [groupSearching, setGroupSearching] = useState(false);
  const [creatingGroup, setCreatingGroup] = useState(false);
  const groupSearchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // ── Scroll ─────────────────────────────────────────────────────────────────

  const isNearBottom = useCallback(() => {
    const el = messagesContainerRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < 120;
  }, []);

  const scrollToBottom = useCallback((force = false) => {
    if (force || isNearBottom()) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [isNearBottom]);

  const topObserverRef = useRef<HTMLDivElement>(null);

  // ── Konuşmaları yükle ───────────────────────────────────────────────────────

   
  const loadConversations = useCallback(async (silent = false) => {
    if (!silent) setConvLoading(true);
    try {
      const convs = await messagingService.getConversations();
      setConversations(convs);
      const convParam = searchParams.get('conv') ?? (location.state?.openConversationId as string | undefined);
      setSelectedConv(current => {
        const currentFresh = current ? convs.find(c => c.id === current.id) : null;
        if (currentFresh) return currentFresh;

        if (convParam) {
          const target = convs.find(c => c.id === convParam);
          if (target) return target;
        }

        return convs[0] ?? null;
      });
    } catch {
      if (!silent) toast.error('Konuşmalar yüklenemedi.');
    } finally {
      if (!silent) setConvLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]); // location.state referans kararlılığı için searchParams yeterli

  useEffect(() => {
    queueMicrotask(() => loadConversations());
  }, [loadConversations]);

  // ── Çevrimiçi Durumu (Presence) ──────────────────────────────────────────
  useEffect(() => {
    if (conversations.length === 0) return;
    const fetchPresence = async () => {
      const userIds = new Set<string>();
      conversations.forEach(c => c.participants.forEach(p => userIds.add(p.id)));
      if (userIds.size === 0) return;
      try {
        const data = await userService.getOnlineStatusBatch(Array.from(userIds));
        setOnlineStatuses(new Map(Object.entries(data)));
      } catch { /* sessiz hata — presence zorunlu değil */ }
    };
    fetchPresence();
    const interval = setInterval(fetchPresence, 30000);
    return () => clearInterval(interval);
  }, [conversations]);

  // ── Typing Durumu Temizleyici ─────────────────────────────────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      setTypingUsers(prev => {
        let changed = false;
        const next = new Map(prev);
        const now = Date.now();
        for (const [id, data] of next.entries()) {
          if (now - data.timestamp > 3000) {
            next.delete(id);
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // ── WS yeniden bağlantı ─────────────────────────────────────────────────────

  useEffect(() => {
    const onReconnect = () => {
      setWsConnected(true);
      // Sessiz mod ile konuşmaları yenile — toast gösterme
      loadConversations(true);
      const conv = selectedConvRef.current;
      if (conv) {
        messagingService.getMessages(conv.id, 0)
          .then(data => {
            setMessages(data.content.reverse());
            setHasMore(data.totalPages > 1);
            setCurrentPage(0);
            setTimeout(() => messagesEndRef.current?.scrollIntoView(), 50);
          }).catch(() => {});
      }
    };
    window.addEventListener('ws-reconnected', onReconnect);
    return () => window.removeEventListener('ws-reconnected', onReconnect);
  }, [loadConversations]);

  // ── Kişisel kanal (unread badge) ───────────────────────────────────────────

  useEffect(() => {
    if (!user?.id) return;
    const topic = '/user/queue/conversation-update';
    subscribe(topic, (payload) => {
      const update = payload as { conversationId?: string; lastMessage?: Message };
      if (!update?.conversationId || !update.lastMessage) return;
      setConversations(prev => prev.map(c => {
        if (c.id !== update.conversationId) return c;
        const isActive = selectedConvRef.current?.id === update.conversationId;
        return {
          ...c,
          lastMessage: update.lastMessage,
          lastMessageAt: update.lastMessage!.sentAt,
          unreadCount: isActive ? 0 : c.unreadCount + 1,
        };
      }));
    });
    return () => unsubscribe(topic);
  }, [user?.id, subscribe, unsubscribe]);

  // ── Konuşma seçilince mesajları yükle & WS abone ol ───────────────────────

  useEffect(() => {
    if (!selectedConv) return;
    queueMicrotask(() => {
      setMessages([]);
      setCurrentPage(0);
      setHasMore(false);
      setMsgLoading(true);
      setShowGroupPanel(false);
      setShowGroupSettings(false);
      setReplyTo(null);
      setMsgSearchQuery('');
      setShowMsgSearch(false);
      setIsMsgSearching(false);
      processedMessageIds.current.clear();
    });

    messagingService.getMessages(selectedConv.id, 0)
      .then(data => {
        setMessages(data.content.reverse());
        data.content.forEach((m: Message) => processedMessageIds.current.add(m.id));
        setHasMore(data.totalPages > 1);
        setTimeout(() => messagesEndRef.current?.scrollIntoView(), 50);
      })
      .catch(() => toast.error('Mesajlar yüklenemedi.'))
      .finally(() => setMsgLoading(false));

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setConversations(prev => prev.map(c =>
      c.id === selectedConv.id ? { ...c, unreadCount: 0 } : c
    ));
    setSelectedConv(prev => prev ? { ...prev, unreadCount: 0 } : null);
    messagingService.markAsRead(selectedConv.id)
      .then(dispatchUnreadRefresh)
      .catch(() => {});

    const msgTopic = `/topic/conversation/${selectedConv.id}`;
    const typingTopic = `/topic/conversation/${selectedConv.id}/typing`;
    const reactionTopic = `/topic/conversation/${selectedConv.id}/reactions`;

    subscribe(msgTopic, (msg) => {
      // Read receipt event — mesaj okundu bilgisini güncelle
      const maybeReadReceipt = msg as ReadReceiptEvent;
      if (maybeReadReceipt?.type === 'READ_RECEIPT') {
        const readBy = maybeReadReceipt.readBy;
        if (readBy && readBy !== user?.id) {
          setMessages(prev => prev.map(m => m.senderId === user?.id ? { ...m, read: true } : m));
        }
        return;
      }

      const maybeDeleted = msg as MessageDeletedEvent;
      if (maybeDeleted?.type === 'MESSAGE_DELETED' && maybeDeleted.messageId) {
        setMessages(prev => prev.filter(m => m.id !== maybeDeleted.messageId));
        return;
      }

      const incoming = msg as Message;
      if (!incoming?.id) return;

      if (processedMessageIds.current.has(incoming.id)) return;
      processedMessageIds.current.add(incoming.id);

      setMessages(prev => [...prev, incoming]);

      setConversations(prev => prev.map(c =>
        c.id === selectedConv.id
          ? { ...c, lastMessage: incoming, lastMessageAt: incoming.sentAt, unreadCount: 0 }
          : c
      ));
      if (incoming.senderId !== user?.id) {
        messagingService.markAsRead(selectedConv.id)
          .then(dispatchUnreadRefresh)
          .catch(() => {});
      }
      setWsConnected(true);
      scrollToBottom(incoming.senderId === user?.id);

      if (incoming.senderId !== user?.id && !sensoryMuteRef.current) {
        playSoftPop();
      }
    });

    subscribe(typingTopic, (payload) => {
      if (sensoryReduceAnimRef.current) return;
      const senderId = (payload as { senderId?: string })?.senderId
        ?? (typeof payload === 'string' ? payload : null);
      if (!senderId || senderId === user?.id) return;
      const name = selectedConv.participants.find(p => p.id === senderId)?.fullName?.split(' ')[0] ?? 'Birisi';
      setTypingUsers(prev => new Map([...prev, [senderId, {name, timestamp: Date.now()}]]));
    });

    subscribe(reactionTopic, (payload) => {
      const updated = payload as Message;
      if (!updated?.id) return;
      setMessages(prev => prev.map(m => m.id === updated.id ? updated : m));
    });

    setWsConnected(isConnected());
    return () => {
      unsubscribe(msgTopic);
      unsubscribe(typingTopic);
      unsubscribe(reactionTopic);
    };
  }, [selectedConv?.id, user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { scrollToBottom(); }, [messages.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Eski mesaj yükle ────────────────────────────────────────────────────────

  const loadMoreMessages = useCallback(async () => {
    if (!selectedConv || loadingMore || !hasMore || isMsgSearching) return;
    const container = messagesContainerRef.current;
    const prevScrollHeight = container?.scrollHeight ?? 0;
    setLoadingMore(true);
    try {
      const nextPage = currentPage + 1;
      const data = await messagingService.getMessages(selectedConv.id, nextPage);
      data.content.forEach((m: Message) => processedMessageIds.current.add(m.id));
      setMessages(prev => [...data.content.reverse(), ...prev]);
      setCurrentPage(nextPage);
      setHasMore(nextPage + 1 < data.totalPages);
      if (container) requestAnimationFrame(() => { container.scrollTop = container.scrollHeight - prevScrollHeight; });
    } catch { toast.error('Eski mesajlar yüklenemedi.'); }
    finally { setLoadingMore(false); }
  }, [selectedConv, loadingMore, hasMore, currentPage, isMsgSearching]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && !loadingMore && hasMore && !isMsgSearching) {
          loadMoreMessages();
        }
      },
      { root: messagesContainerRef.current, threshold: 0.1 }
    );
    if (topObserverRef.current) observer.observe(topObserverRef.current);
    return () => observer.disconnect();
  }, [loadingMore, hasMore, loadMoreMessages, isMsgSearching]);

  // ── Mesaj İçi Arama ───────────────────────────────────────────────────────

  useEffect(() => {
    if (!selectedConv) return;
    if (msgSearchTimeout.current) clearTimeout(msgSearchTimeout.current);
    
    if (!msgSearchQuery.trim()) {
      if (isMsgSearching) {
        queueMicrotask(() => {
          setIsMsgSearching(false);
          setMessages([]); setCurrentPage(0); setHasMore(false); setMsgLoading(true); processedMessageIds.current.clear();
          messagingService.getMessages(selectedConv.id, 0).then(data => {
            setMessages(data.content.reverse());
            data.content.forEach((m: Message) => processedMessageIds.current.add(m.id));
            setHasMore(data.totalPages > 1);
            setTimeout(() => messagesEndRef.current?.scrollIntoView(), 50);
          }).finally(() => setMsgLoading(false));
        });
      }
      if (msgSearchTimeout.current) clearTimeout(msgSearchTimeout.current);
      return;
    }

    msgSearchTimeout.current = setTimeout(async () => {
      setIsMsgSearching(true);
      setMsgLoading(true);
      try {
        const data = await messagingService.searchMessages(selectedConv.id, msgSearchQuery.trim(), 0, 50);
        setMessages(data.content.reverse());
        setHasMore(false); // Arama sonucunda infinite scroll yapmiyoruz
        setCurrentPage(0);
      } catch { toast.error('Mesajlar aranamadı.'); }
      finally { setMsgLoading(false); }
    }, 500);

    return () => { if (msgSearchTimeout.current) clearTimeout(msgSearchTimeout.current); };
  }, [msgSearchQuery, selectedConv, isMsgSearching]);

  // ── Kullanıcı arama (yeni mesaj modal) ────────────────────────────────────

  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (searchQuery.trim().length < 2) { queueMicrotask(() => setSearchResults([])); return; }
    searchTimeout.current = setTimeout(async () => {
      setSearching(true);
      try {
        const results = await userService.searchUsers(searchQuery.trim());
        setSearchResults(results.filter(u => u.id !== user?.id));
      } catch { setSearchResults([]); }
      setSearching(false);
    }, 400);
    return () => { if (searchTimeout.current) clearTimeout(searchTimeout.current); };
  }, [searchQuery, user?.id]);

  // ── Grup oluşturma - üye araması ───────────────────────────────────────────

  useEffect(() => {
    if (groupSearchTimeout.current) clearTimeout(groupSearchTimeout.current);
    if (groupSearchQuery.trim().length < 2) { queueMicrotask(() => setGroupSearchResults([])); return; }
    groupSearchTimeout.current = setTimeout(async () => {
      setGroupSearching(true);
      try {
        const results = await userService.searchUsers(groupSearchQuery.trim());
        const alreadyIn = new Set(groupParticipants.map(p => p.id));
        alreadyIn.add(user?.id ?? '');
        setGroupSearchResults(results.filter(u => !alreadyIn.has(u.id)));
      } catch { setGroupSearchResults([]); }
      setGroupSearching(false);
    }, 400);
    return () => { if (groupSearchTimeout.current) clearTimeout(groupSearchTimeout.current); };
  }, [groupSearchQuery, groupParticipants, user?.id]);

  // ── Üye ekleme araması (grup yönetimi) ────────────────────────────────────

  useEffect(() => {
    if (addMemberTimeout.current) clearTimeout(addMemberTimeout.current);
    if (addMemberQuery.trim().length < 2) { queueMicrotask(() => setAddMemberResults([])); return; }
    addMemberTimeout.current = setTimeout(async () => {
      try {
        const results = await userService.searchUsers(addMemberQuery.trim());
        const memberIds = new Set(selectedConv?.participants.map(p => p.id) ?? []);
        setAddMemberResults(results.filter(u => !memberIds.has(u.id)));
      } catch { setAddMemberResults([]); }
    }, 400);
    return () => { if (addMemberTimeout.current) clearTimeout(addMemberTimeout.current); };
  }, [addMemberQuery, selectedConv?.participants]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleSend = async () => {
    if (!newMessage.trim() && !selectedFile) return;
    if (!selectedConv) return;
    const content = newMessage.trim();
    const replyToId = replyTo?.id;
    setNewMessage('');
    setReplyTo(null);
    setIsUploading(true);

    try {
      let fileAttachment;
      let messageType: string | undefined;
      if (selectedFile) {
        const url = await uploadService.upload(selectedFile, 'PRIVATE', { type: 'CONVERSATION', id: selectedConv.id });
        // fileType MIME öneki ile saklanır (mesaj listesinde "image/..." kontrolü için);
        // messageType ise backend'in kabul ettiği TEXT/FILE/IMAGE/PECS setine ait olmalı.
        fileAttachment = { fileUrl: url, fileName: selectedFile.name, fileType: selectedFile.type };
        messageType = selectedFile.type.startsWith('image/') ? 'IMAGE' : 'FILE';
        setSelectedFile(null);
      }

      const msg = await messagingService.sendMessage(
        selectedConv.id, content,
        fileAttachment,
        replyToId,
        messageType,
      );
      // Backend yine WebSocket broadcast yapıyor; bu ekleme aynı sekmede boş kalmayı önler.
      processedMessageIds.current.add(msg.id);
      setMessages(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, msg]);
      setConversations(prev => prev.map(c =>
        c.id === selectedConv.id ? { ...c, lastMessage: msg, lastMessageAt: msg.sentAt } : c
      ));
      scrollToBottom(true);
    } catch {
      setNewMessage(content);
      toast.error('Mesaj gönderilemedi.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSendPecs = async (label: string) => {
    if (!selectedConv) return;
    try {
      const msg = await messagingService.sendMessage(
        selectedConv.id, label, undefined, undefined, 'PECS'
      );
      processedMessageIds.current.add(msg.id);
      setMessages(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, msg]);
      setConversations(prev => prev.map(c =>
        c.id === selectedConv.id ? { ...c, lastMessage: msg, lastMessageAt: msg.sentAt } : c
      ));
      scrollToBottom(true);
    } catch {
      toast.error('PECS kartı gönderilemedi.');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter ile gönder (Shift+Enter = yeni satır)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
      return;
    }
    // Typing debounce — 3s
    const now = Date.now();
    if (selectedConv && now - lastTypingSent.current > 3000) {
      lastTypingSent.current = now;
      send(`/app/chat/${selectedConv.id}/typing`, { senderId: user?.id });
    }
  };

  // ── Emoji reaksiyon ──────────────────────────────────────────────────────

  const handleReact = async (messageId: string, emoji: string) => {
    setPickerMsgId(null);
    try {
      const updated = await messagingService.toggleReaction(messageId, emoji);
      setMessages(prev => prev.map(m => m.id === updated.id ? updated : m));
    } catch { toast.error('Reaksiyon eklenemedi.'); }
  };

  // ── Mute / Archive ───────────────────────────────────────────────────────

  const handleMute = async (conv: Conversation) => {
    const next = !conv.muted;
    try {
      await messagingService.muteConversation(conv.id, next);
      setConversations(prev => prev.map(c => c.id === conv.id ? { ...c, muted: next } : c));
      if (selectedConvRef.current?.id === conv.id) setSelectedConv(c => c ? { ...c, muted: next } : c);
      toast.success(next ? 'Konuşma sessize alındı' : 'Ses açıldı');
    } catch { toast.error('İşlem başarısız.'); }
  };

  const handleArchive = async (conv: Conversation) => {
    const next = !conv.archived;
    try {
      await messagingService.archiveConversation(conv.id, next);
      setConversations(prev => prev.map(c => c.id === conv.id ? { ...c, archived: next } : c));
      if (selectedConvRef.current?.id === conv.id && next) {
        // Arşivlenince seçili konuşmayı kapat ama küçük bir gecikmeyle (UX)
        setTimeout(() => setSelectedConv(null), 300);
      }
      toast.success(next ? 'Arşivlendi' : 'Arşivden çıkarıldı');
    } catch { toast.error('İşlem başarısız.'); }
  };

  // ── Yeni konuşma ─────────────────────────────────────────────────────────

  const handleStartConversation = async (targetUser: User) => {
    try {
      const conv = await messagingService.getOrCreateDirect(targetUser.id);
      setShowNewModal(false); setSearchQuery(''); setSearchResults([]);
      setConversations(prev => prev.find(c => c.id === conv.id) ? prev : [conv, ...prev]);
      setSelectedConv(conv);
    } catch { toast.error('Konuşma başlatılamadı.'); }
  };

  // ── Grup oluşturma ───────────────────────────────────────────────────────

  const handleCreateGroup = async () => {
    if (!groupName.trim()) { toast.error('Grup adı giriniz.'); return; }
    if (groupParticipants.length === 0) { toast.error('En az bir katılımcı ekleyin.'); return; }
    setCreatingGroup(true);
    try {
      const conv = await messagingService.createGroup(
        groupName.trim(),
        groupParticipants.map(p => p.id)
      );
      setConversations(prev => [conv, ...prev]);
      setSelectedConv(conv);
      setShowCreateGroupModal(false);
      setGroupName('');
      setGroupParticipants([]);
      setGroupSearchQuery('');
      toast.success('Grup oluşturuldu!');
    } catch { toast.error('Grup oluşturulamadı.'); }
    setCreatingGroup(false);
  };

  // ── Grup yönetimi ────────────────────────────────────────────────────────

  const handleUpdateGroup = async () => {
    if (!selectedConv || !groupEditName.trim()) return;
    try {
      const updated = await messagingService.updateGroupTitle(selectedConv.id, groupEditName.trim());
      setConversations(prev => prev.map(c => c.id === updated.id ? updated : c));
      setSelectedConv(updated);
      toast.success('Grup adı güncellendi.');
    } catch { toast.error('Grup adı güncellenemedi.'); }
  };

  const handleAddMember = async (targetUser: User) => {
    if (!selectedConv) return;
    try {
      const updated = await messagingService.addMember(selectedConv.id, targetUser.id);
      setSelectedConv(updated);
      setConversations(prev => prev.map(c => c.id === updated.id ? updated : c));
      setAddMemberQuery('');
      setAddMemberResults([]);
      toast.success(`${targetUser.fullName} gruba eklendi.`);
    } catch { toast.error('Üye eklenemedi.'); }
  };

  const handleRemoveMember = async (targetUser: User) => {
    if (!selectedConv) return;
    try {
      const updated = await messagingService.removeMember(selectedConv.id, targetUser.id);
      setSelectedConv(updated);
      setConversations(prev => prev.map(c => c.id === updated.id ? updated : c));
      toast.success(`${targetUser.fullName} gruptan çıkarıldı.`);
    } catch { toast.error('Üye çıkarılamadı.'); }
  };

  // ── Yardımcı getter'lar ──────────────────────────────────────────────────

  const getOtherUser = (conv: Conversation) =>
    conv.participants.find(p => p.id !== user?.id) ?? conv.participants[0];

  const getTitle = (conv: Conversation) =>
    conv.type === 'GROUP'
      ? (conv.title || buildGroupTitle(conv, user?.id))
      : (getOtherUser(conv)?.fullName ?? '?');

  const getInitial = (conv: Conversation) =>
    conv.type === 'GROUP' ? '#' : (getOtherUser(conv)?.fullName?.charAt(0) ?? '?');

  const filteredConvs = conversations
    .filter(c => {
      if (convFilter === 'unread') return c.unreadCount > 0 && !c.archived;
      if (convFilter === 'archived') return c.archived;
      if (convFilter === 'groups') return c.type === 'GROUP' && !c.archived;
      if (convFilter === 'experts') return c.type !== 'GROUP' && getOtherUser(c)?.role === 'EXPERT' && !c.archived;
      return !c.archived;
    })
    .filter(c => !convSearch.trim() || normalizeTR(getTitle(c)).includes(normalizeTR(convSearch)))
    .sort((a, b) => (b.lastMessageAt ?? '') > (a.lastMessageAt ?? '') ? 1 : -1);

  const unreadCount = conversations.filter(c => c.unreadCount > 0 && !c.archived).length;
  const messageGroups = groupByDate(messages);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] min-h-[600px]" onClick={() => setPickerMsgId(null)}>
      {/* Başlık */}
      <div className="flex items-center justify-between pb-3 shrink-0">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-gray-900">Mesajlar</h1>
          {unreadCount > 0 && (
            <span className="h-5 min-w-[20px] px-1.5 rounded-full bg-primary-600 text-white text-[10px] font-bold flex items-center justify-center">
              {unreadCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setShowCreateGroupModal(true)} variant="outline" size="sm">
            <Users size={15} className="mr-1.5" /> Yeni Grup
          </Button>
          <Button onClick={() => setShowNewModal(true)} size="sm">
            <Plus size={15} className="mr-1.5" /> Yeni Mesaj
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-4 flex-1 min-h-0">

        {/* ── Sol panel: konuşma listesi ─────────────────────────────────── */}
        <Card className={cn('lg:col-span-1 p-0 overflow-hidden flex flex-col min-h-0', selectedConv && 'hidden lg:flex')}>
          <div className="p-3 border-b border-gray-100 shrink-0 space-y-2">
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={convSearch} onChange={e => setConvSearch(e.target.value)}
                placeholder="Konuşma ara..."
                className="w-full pl-8 pr-7 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-400 bg-gray-50" />
              {convSearch && <button onClick={() => setConvSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2"><X size={12} className="text-gray-400" /></button>}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {([['all', 'Tümü'], ['unread', 'Okunmamış'], ['experts', 'Uzmanlar'], ['groups', 'Gruplar'], ['archived', 'Arşiv']] as [ConvFilter, string][]).map(([key, label]) => (
                <button key={key} onClick={() => setConvFilter(key)}
                  className={cn('px-3 py-1.5 rounded-xl text-[11px] font-semibold transition-all shrink-0',
                    convFilter === key ? 'bg-primary-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}>
                  {label}
                  {key === 'unread' && unreadCount > 0 && <span className="ml-1 opacity-90">({unreadCount})</span>}
                </button>
              ))}
            </div>
          </div>

          {convLoading ? (
            <div className="p-3 space-y-1">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl animate-pulse">
                  <div className="w-10 h-10 rounded-full bg-gray-200 shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 bg-gray-200 rounded w-3/4" />
                    <div className="h-2.5 bg-gray-100 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredConvs.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-100 to-indigo-100 flex items-center justify-center mb-4 shadow-sm">
                <MessageCircle size={24} className="text-primary-400" />
              </div>
              <p className="text-sm font-semibold text-gray-600">
                {convFilter === 'archived' ? 'Arşiv boş' : convFilter === 'unread' ? 'Okunmamış mesaj yok' : convFilter === 'groups' ? 'Henüz bir gruba dahil değilsiniz' : convFilter === 'experts' ? 'Uzmanlarla mesajınız yok' : 'Konuşma bulunamadı'}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {convFilter === 'archived' ? 'Arşivlenen konuşmalar burada görünür' : convFilter === 'all' ? 'Yeni bir konuşma başlatın' : ''}
              </p>
              {convFilter === 'all' && (
                <button onClick={() => setShowNewModal(true)} className="mt-4 flex items-center gap-1.5 px-4 py-2 bg-primary-600 text-white rounded-xl text-xs font-semibold hover:bg-primary-700 transition-colors shadow-sm">
                  <Plus size={13} /> Yeni mesaj başlat
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-gray-50 overflow-y-auto flex-1">
              {filteredConvs.map(conv => {
                const isUnread = conv.unreadCount > 0;
                const otherUser = conv.type !== 'GROUP' ? getOtherUser(conv) : null;
                const preview = conv.lastMessage ? (conv.lastMessage.fileUrl ? '📎 Dosya' : conv.lastMessage.content) : null;
                return (
                  <div key={conv.id} className="group relative">
                    <button
                      onClick={() => setSelectedConv(conv)}
                      className={cn(
                        'w-full px-3 py-3 flex items-start gap-3 hover:bg-gray-50 transition-colors text-left cursor-pointer',
                        selectedConv?.id === conv.id && 'bg-primary-50 border-l-2 border-primary-500'
                      )}
                    >
                      <div className={cn('w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 relative',
                        conv.type === 'GROUP' ? 'bg-emerald-100 text-emerald-700' : 'bg-primary-100 text-primary-700')}>
                        {conv.type === 'GROUP' ? <Users size={16} /> : getInitial(conv)}
                        {conv.type !== 'GROUP' && otherUser && onlineStatuses.get(otherUser.id) && (
                          <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full"></span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-1">
                          <div className="min-w-0">
                            <p className={cn('text-sm truncate', isUnread ? 'font-bold text-gray-900' : 'font-medium text-gray-800')}>
                              {getTitle(conv)}
                              {conv.muted && <BellOff size={10} className="inline ml-1 text-gray-400" />}
                            </p>
                            {otherUser?.role && (
                              <span className="text-[10px] font-semibold text-primary-500">
                                {otherUser.role === 'EXPERT' ? '👨‍⚕️ Uzman' : '👨‍👩‍👧 Aile'}
                              </span>
                            )}
                            {conv.type === 'GROUP' && (
                              <span className="text-[10px] text-emerald-600 font-medium">{conv.participants.length} üye</span>
                            )}
                          </div>
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            {conv.lastMessageAt && <span className="text-[10px] text-gray-400">{formatRelative(conv.lastMessageAt)}</span>}
                            {isUnread && (
                              <span className="w-4 h-4 rounded-full bg-primary-600 text-white text-[9px] flex items-center justify-center font-black transition-opacity duration-150 group-hover:opacity-0 group-focus-within:opacity-0">
                                {conv.unreadCount > 9 ? '9+' : conv.unreadCount}
                              </span>
                            )}
                          </div>
                        </div>
                        {preview && (
                          <p className={cn('text-xs truncate mt-0.5', isUnread ? 'text-gray-700 font-medium' : 'text-gray-400')}>
                            {conv.type === 'GROUP' && conv.lastMessage?.senderName
                              ? `${conv.lastMessage.senderName.split(' ')[0]}: ${preview}`
                              : preview}
                          </p>
                        )}
                      </div>
                    </button>
                    {/* Hover aksiyonları */}
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 hidden group-hover:flex group-focus-within:flex items-center gap-1 rounded-lg border border-gray-100 bg-white px-1.5 py-1 shadow-sm">
                      <button onClick={e => { e.stopPropagation(); handleMute(conv); }}
                        title={conv.muted ? 'Sesi aç' : 'Sessize al'}
                        className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600">
                        {conv.muted ? <Bell size={13} /> : <BellOff size={13} />}
                      </button>
                      <button onClick={e => { e.stopPropagation(); handleArchive(conv); }}
                        title={conv.archived ? 'Arşivden çıkar' : 'Arşivle'}
                        className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600">
                        {conv.archived ? <ArchiveRestore size={13} /> : <Archive size={13} />}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* ── Sağ panel: chat ───────────────────────────────────────────── */}
        <Card className={cn('lg:col-span-2 p-0 flex flex-col min-h-0', !selectedConv && 'hidden lg:flex')}>
          {selectedConv ? (
            <>
              {/* Header */}
              <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-3 shrink-0">
                <button onClick={() => setSelectedConv(null)} className="lg:hidden p-1"><ArrowLeft size={20} /></button>
                <div className={cn('w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-sm font-bold',
                  selectedConv.type === 'GROUP' ? 'bg-emerald-100 text-emerald-700' : 'bg-primary-100 text-primary-700')}>
                  {selectedConv.type === 'GROUP' ? <Users size={15} /> : getInitial(selectedConv)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="font-semibold text-gray-900 truncate text-sm">{getTitle(selectedConv)}</p>
                    {selectedConv.muted && <BellOff size={12} className="text-gray-400 shrink-0" />}
                  </div>
                  <div className="flex items-center gap-1.5">
                    {wsConnected
                      ? <span className="flex items-center gap-1 text-[10px] text-emerald-600 font-semibold"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />Canlı</span>
                      : <span className="flex items-center gap-1 text-[10px] text-gray-400"><WifiOff size={10} />Bağlantı kesildi</span>}
                    {selectedConv.type === 'GROUP' && <span className="text-[10px] text-gray-400">· {selectedConv.participants.length} üye</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {selectedConv.type === 'GROUP' && (
                    <>
                      <button onClick={() => { setShowGroupPanel(v => !v); setShowGroupSettings(false); }}
                        className={cn('flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer',
                          showGroupPanel ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500 hover:bg-gray-200')}>
                        <Users size={13} /> Üyeler
                        <ChevronRight size={11} className={cn('transition-transform', showGroupPanel && 'rotate-90')} />
                      </button>
                      <button onClick={() => { setShowGroupSettings(v => !v); setShowGroupPanel(false); setGroupEditName(getTitle(selectedConv)); setAddMemberQuery(''); setAddMemberResults([]); }}
                        className={cn('p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 cursor-pointer',
                          showGroupSettings && 'bg-gray-100 text-gray-700')}>
                        <Settings size={14} />
                      </button>
                    </>
                  )}
                  <button onClick={() => { setShowMsgSearch(v => !v); if (showMsgSearch) setMsgSearchQuery(''); }} title="Mesajlarda Ara"
                    className={cn("p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 cursor-pointer", showMsgSearch && "bg-gray-100 text-gray-700")}>
                    <Search size={14} />
                  </button>
                  <button onClick={() => setShowSensoryMenu(v => !v)} title="Duyusal Erişim Ayarları"
                    className={cn("p-1.5 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-gray-100 cursor-pointer", showSensoryMenu && "bg-primary-50 text-primary-600")}>
                    <span className="text-sm">♿</span>
                  </button>
                  <button onClick={() => handleMute(selectedConv)} title={selectedConv.muted ? 'Sesi aç' : 'Sessize al'}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 cursor-pointer">
                    {selectedConv.muted ? <Bell size={13} /> : <BellOff size={13} />}
                  </button>
                  <button onClick={() => loadConversations()} title="Yenile" className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 cursor-pointer">
                    <RefreshCw size={13} />
                  </button>
                </div>
              </div>

              {showMsgSearch && (
                <div className="px-4 py-2 border-b border-gray-100 bg-gray-50 flex items-center shrink-0">
                  <div className="relative flex-1">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input autoFocus value={msgSearchQuery} onChange={e => setMsgSearchQuery(e.target.value)}
                      placeholder="Bu konuşmada mesaj ara..."
                      className="w-full pl-9 pr-8 py-1.5 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-1 focus:ring-primary-500 bg-white" />
                    {msgSearchQuery && (
                      <button onClick={() => setMsgSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                        <X size={14} />
                      </button>
                    )}
                  </div>
                </div>
              )}

              {showSensoryMenu && (
                <div className="px-4 py-2.5 bg-primary-50/70 border-b border-primary-100 flex flex-wrap gap-4 items-center justify-between text-xs shrink-0 select-none">
                  <div className="flex items-center gap-1.5 text-primary-800 font-bold">
                    <span>♿ Duyusal Erişim Ayarları:</span>
                  </div>
                  <div className="flex gap-4 flex-wrap">
                    <label className="flex items-center gap-1.5 cursor-pointer font-semibold text-gray-700 hover:text-primary-700">
                      <input type="checkbox" checked={sensoryFont} onChange={e => updateSensoryFont(e.target.checked)} className="rounded border-gray-300 text-primary-600 focus:ring-primary-400 cursor-pointer" />
                      Disleksi Fontu (Geniş & Net)
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer font-semibold text-gray-700 hover:text-primary-700">
                      <input type="checkbox" checked={sensoryMute} onChange={e => updateSensoryMute(e.target.checked)} className="rounded border-gray-300 text-primary-600 focus:ring-primary-400 cursor-pointer" />
                      Yumuşak Ses / Sessiz
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer font-semibold text-gray-700 hover:text-primary-700">
                      <input type="checkbox" checked={sensoryReduceAnim} onChange={e => updateSensoryReduceAnim(e.target.checked)} className="rounded border-gray-300 text-primary-600 focus:ring-primary-400 cursor-pointer" />
                      Animasyonları Azalt
                    </label>
                  </div>
                  <button onClick={() => setShowSensoryMenu(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer"><X size={13} /></button>
                </div>
              )}

              {/* Mesaj akışı */}
              <div ref={messagesContainerRef}
                className={cn("flex-1 overflow-y-auto p-4 min-h-0", sensoryFont && "tracking-wide font-medium")}
                style={sensoryFont ? { fontFamily: 'Outfit, Inter, sans-serif', fontSize: '15px', lineHeight: '1.9', letterSpacing: '0.06em', wordSpacing: '0.08em' } : {}}>
                <div ref={topObserverRef} className="h-1 w-full" />
                
                {hasMore && (
                  <div className="flex justify-center py-1 mb-2">
                    <button onClick={loadMoreMessages} disabled={loadingMore}
                      className="text-xs text-primary-600 hover:underline font-semibold disabled:opacity-50 flex items-center gap-1">
                      {loadingMore ? <><span className="w-3 h-3 border border-primary-400 border-t-transparent rounded-full animate-spin" />Yükleniyor...</> : '↑ Eski mesajları yükle'}
                    </button>
                  </div>
                )}

                {msgLoading ? (
                  <div className="flex-1 flex flex-col justify-end gap-4 pb-4">
                    {[1, 2, 3].map(i => (
                      <div key={i} className={cn("flex", i % 2 === 0 ? "justify-end" : "justify-start")}>
                        <div className={cn("max-w-[70%] space-y-1", i % 2 === 0 ? "items-end flex flex-col" : "items-start")}>
                          <div className={cn("h-10 rounded-2xl animate-pulse", i % 2 === 0 ? "bg-primary-100 w-48 rounded-br-sm" : "bg-gray-100 w-64 rounded-bl-sm")} />
                          <div className="h-3 bg-gray-100 rounded w-16 animate-pulse" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full gap-3 opacity-80">
                    <div className="w-16 h-16 rounded-3xl bg-primary-50 flex items-center justify-center mb-1">
                      <MessageCircle size={28} className="text-primary-300" />
                    </div>
                    <p className="text-sm font-semibold text-gray-700">Burada henüz mesaj yok</p>
                    <p className="text-xs text-gray-400 max-w-[200px] text-center">
                      Mesaj göndererek iletişime geçebilirsiniz.
                    </p>
                  </div>
                ) : (
                  messageGroups.map(group => (
                    <div key={group.label}>
                      {/* Tarih ayırıcı */}
                      <div className="flex items-center gap-3 my-4">
                        <div className="flex-1 h-px bg-gray-100" />
                        <span className="text-[10px] font-semibold text-gray-400 bg-white px-2">{group.label}</span>
                        <div className="flex-1 h-px bg-gray-100" />
                      </div>

                      <div className="space-y-2.5">
                        {group.messages.map(msg => {
                          const isMine = msg.senderId === user?.id;
                          const isGroup = selectedConv?.type === 'GROUP';
                          const hasReactions = msg.reactions && Object.keys(msg.reactions).length > 0;
                          const readReceipt = isMine ? getReadReceiptInfo(msg, user?.id) : null;
                          return (
                            <div key={msg.id} className={cn('flex group/msg', isMine ? 'justify-end' : 'justify-start')}>
                              <div className={cn('max-w-[72%]', !isMine && isGroup && 'flex gap-2 items-end')}>
                                {!isMine && isGroup && (
                                  <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center shrink-0 text-xs font-bold text-gray-600 mb-1">
                                    {msg.senderName?.charAt(0) ?? '?'}
                                  </div>
                                )}
                                <div className="relative" onClick={e => e.stopPropagation()}>
                                  {/* Reply göster butonu (hover) */}
                                  <button
                                    onClick={e => { e.stopPropagation(); setReplyTo(msg); }}
                                    className={cn('absolute top-1 opacity-0 group-hover/msg:opacity-100 transition-opacity z-10',
                                      isMine ? '-left-7' : '-right-7')}
                                    title="Yanıtla">
                                    <CornerUpLeft size={14} className="text-gray-400 hover:text-primary-600" />
                                  </button>
                                  {!isMine && (
                                    <button
                                      onClick={async e => {
                                        e.stopPropagation();
                                        const reason = window.prompt('Bu mesajı neden şikâyet ediyorsunuz?');
                                        if (!reason?.trim()) return;
                                        try { await reportService.create('MESSAGE', msg.id, reason.trim()); toast.success('Mesaj incelemeye alındı.'); }
                                        catch { toast.error('Şikâyet gönderilemedi.'); }
                                      }}
                                      className="absolute -right-14 top-1 opacity-0 group-hover/msg:opacity-100 text-gray-400 hover:text-red-600"
                                      title="Mesajı şikâyet et"
                                    >
                                      <Flag size={14} />
                                    </button>
                                  )}

                                  <div className={cn('px-3.5 py-2.5 rounded-2xl',
                                    isMine ? 'bg-primary-600 text-white rounded-br-sm' : 'bg-gray-100 text-gray-900 rounded-bl-sm')}>
                                    {!isMine && isGroup && (
                                      <p className={cn("text-[11px] font-bold mb-0.5 flex items-center gap-1", getSenderColor(msg.senderName || ''))}>
                                        {msg.senderName}
                                        {(msg.senderRole === 'EXPERT' || selectedConv?.participants.find(p => p.id === msg.senderId)?.role === 'EXPERT') && (
                                          <span className="text-[9px] bg-primary-100 text-primary-700 px-1 py-0.5 rounded flex items-center font-extrabold leading-none">UZMAN</span>
                                        )}
                                      </p>
                                    )}

                                    {/* Reply alıntı */}
                                    {msg.replyToId && (
                                      <div className={cn('mb-2 px-2 py-1.5 rounded-lg border-l-2 text-xs',
                                        isMine ? 'border-primary-300 bg-primary-700/40' : 'border-primary-400 bg-gray-200')}>
                                        <p className="font-semibold text-[10px] opacity-80">{msg.replyToSenderName}</p>
                                        <p className="truncate opacity-75">
                                          {msg.replyToFileUrl ? '📎 Dosya' : msg.replyToContent}
                                        </p>
                                      </div>
                                    )}

                                    {/* Dosya */}
                                    {msg.fileUrl && (
                                      <div className="mb-1.5">
                                        {msg.fileType?.startsWith('image/') ? (
                                          <a href={msg.fileUrl} target="_blank" rel="noopener noreferrer">
                                            <img src={msg.fileUrl} alt={msg.fileName ?? 'Görsel'} className="max-w-[200px] rounded-xl object-cover" />
                                          </a>
                                        ) : (
                                          <a href={msg.fileUrl} download={msg.fileName} target="_blank" rel="noopener noreferrer"
                                            className={cn('flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium',
                                              isMine ? 'bg-primary-700 text-white' : 'bg-white border border-gray-200 text-gray-700')}>
                                            <FileText size={13} />
                                            <span className="truncate max-w-[140px]">{msg.fileName}</span>
                                            <Download size={11} className="shrink-0" />
                                          </a>
                                        )}
                                      </div>
                                    )}

                                    {msg.messageType === 'PECS' ? (
                                      <div className="flex flex-col items-center justify-center p-3 bg-white border-2 border-indigo-200 rounded-xl shadow-sm my-1 text-gray-800 text-center w-36 select-none">
                                        <span className="text-4xl mb-1.5" role="img" aria-label={msg.content}>
                                          {PECS_CARDS.find(c => c.label === msg.content)?.emoji || '💬'}
                                        </span>
                                        <span className="text-xs font-extrabold tracking-wide uppercase text-indigo-950">{msg.content}</span>
                                      </div>
                                    ) : (
                                      msg.content && <p className="text-sm break-words whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                                    )}

                                    <div className={cn('flex items-center justify-end gap-1 mt-0.5', isMine ? 'text-primary-200' : 'text-gray-400')}>
                                      <span className="text-[9px] opacity-75 mr-0.5 truncate max-w-[100px]">{msg.senderName}</span>
                                      <span className="text-[10px]">{formatTime(msg.sentAt)}</span>
                                      {isMine && (readReceipt?.isRead
                                        ? (
                                          <span title={readReceipt.label} aria-label={readReceipt.label} className="inline-flex h-4 w-4 cursor-help items-center justify-center rounded-full transition-colors hover:bg-white/10">
                                            <CheckCheck size={12} className="text-sky-300" />
                                          </span>
                                        )
                                        : <Check size={12} className="opacity-70" aria-label="Gönderildi" />)}
                                    </div>
                                  </div>

                                  {/* Reaksiyonlar */}
                                  {hasReactions && (
                                    <div className={cn('flex flex-wrap gap-1 mt-1', isMine ? 'justify-end' : 'justify-start')}>
                                      {Object.entries(msg.reactions!).map(([emoji, summary]) => (
                                        <button key={emoji} onClick={e => { e.stopPropagation(); handleReact(msg.id, emoji); }}
                                          className={cn('flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs border transition-colors',
                                            summary.reactedByMe ? 'bg-primary-50 border-primary-300 text-primary-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50')}>
                                          {emoji} <span className="text-[10px] font-semibold">{summary.count}</span>
                                        </button>
                                      ))}
                                    </div>
                                  )}

                                  {/* Emoji picker */}
                                  {pickerMsgId === msg.id && (
                                    <div className={cn('absolute bottom-full mb-1 z-20 bg-white shadow-lg border border-gray-200 rounded-xl px-2 py-1.5 flex gap-1',
                                      isMine ? 'right-0' : 'left-0')}
                                      onClick={e => e.stopPropagation()}>
                                      {QUICK_EMOJIS.map(em => (
                                        <button key={em} onClick={() => handleReact(msg.id, em)}
                                          className="text-lg hover:scale-125 transition-transform p-0.5">{em}</button>
                                      ))}
                                    </div>
                                  )}

                                  {/* Emoji picker aç butonu (hover) */}
                                  <button
                                    onClick={e => { e.stopPropagation(); setPickerMsgId(pickerMsgId === msg.id ? null : msg.id); }}
                                    className={cn('absolute -bottom-1 opacity-0 group-hover/msg:opacity-100 transition-opacity z-10 bg-white border border-gray-200 rounded-full w-5 h-5 flex items-center justify-center text-gray-400 hover:text-primary-600 shadow-sm',
                                      isMine ? 'right-2' : 'left-2')}>
                                    <span className="text-[10px]">😊</span>
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))
                )}

                {/* Typing indicator */}
                {typingUsers.size > 0 && (
                  <div className="flex justify-start items-center gap-2 mt-2">
                    <div className="bg-gray-100 px-4 py-2.5 rounded-2xl rounded-bl-sm flex gap-1 items-center">
                      {[0, 150, 300].map(d => <span key={d} className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />)}
                    </div>
                    <span className="text-[11px] text-gray-400 font-medium">
                      {[...typingUsers.values()].map(u => u.name).join(', ')} yazıyor...
                    </span>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="p-3 border-t border-gray-100 shrink-0 space-y-2">
                {/* Reply önizleme */}
                {replyTo && (
                  <div className="flex items-center gap-2 bg-primary-50 border border-primary-200 rounded-xl px-3 py-2">
                    <Reply size={13} className="text-primary-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-bold text-primary-600">{replyTo.senderName}</p>
                      <p className="text-xs text-primary-700 truncate">{replyTo.fileUrl ? '📎 Dosya' : replyTo.content}</p>
                    </div>
                    <button onClick={() => setReplyTo(null)} className="text-primary-400 hover:text-red-500 shrink-0">
                      <X size={13} />
                    </button>
                  </div>
                )}

                {/* Dosya Önizleme */}
                {selectedFile && (
                  <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
                    <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0">
                      {selectedFile.type.startsWith('image/') ? (
                        <img src={URL.createObjectURL(selectedFile)} alt="preview" className="w-full h-full object-cover rounded-lg" />
                      ) : selectedFile.type.startsWith('video/') ? (
                        <span className="text-indigo-600 text-xs font-bold">VİDEO</span>
                      ) : (
                        <Paperclip size={16} className="text-indigo-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-gray-700 truncate">{selectedFile.name}</p>
                      <p className="text-[10px] text-gray-400">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                    <button onClick={() => setSelectedFile(null)} className="text-gray-400 hover:text-red-500 shrink-0 cursor-pointer">
                      <X size={14} />
                    </button>
                  </div>
                )}

                {/* PECS Seçim Galerisi */}
                {showPecsPanel && (
                  <div className="p-3 bg-white border border-gray-200 rounded-xl shadow-sm space-y-2">
                    <div className="flex items-center justify-between border-b border-gray-100 pb-1.5">
                      <span className="text-xs font-bold text-gray-700 flex items-center gap-1">
                        🧸 PECS Görsel İletişim Kartları
                      </span>
                      <button onClick={() => setShowPecsPanel(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer">
                        <X size={13} />
                      </button>
                    </div>
                    <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
                      {['Duygular', 'İhtiyaçlar', 'Günlük'].map(category => (
                        <div key={category} className="space-y-1">
                          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">{category}</p>
                          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                            {PECS_CARDS.filter(c => c.category === category).map(card => (
                              <button key={card.id} onClick={() => { handleSendPecs(card.label); setShowPecsPanel(false); }}
                                className={cn("flex flex-col items-center justify-center p-1.5 rounded-xl border bg-white cursor-pointer shadow-sm transition-all transform hover:scale-105 active:scale-95", card.color)}>
                                <span className="text-xl mb-0.5">{card.emoji}</span>
                                <span className="text-[9px] font-bold truncate w-full text-center">{card.label}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-end gap-2">
                  <input type="file" className="hidden" ref={fileInputRef} onChange={handleFileSelect} />
                  <button onClick={() => fileInputRef.current?.click()}
                    className="p-2 rounded-xl border border-gray-200 text-gray-400 hover:text-indigo-600 hover:border-indigo-300 transition-colors cursor-pointer shrink-0 self-end"
                    title="Dosya/Medya Ekle">
                    <Paperclip size={18} />
                  </button>
                  <button onClick={() => setShowPecsPanel(v => !v)}
                    className={cn("p-2 rounded-xl border border-gray-200 text-gray-400 hover:text-indigo-600 hover:border-indigo-300 transition-colors cursor-pointer shrink-0 self-end", showPecsPanel && "bg-indigo-50 border-indigo-300 text-indigo-600")}
                    title="PECS Görsel Kartı Gönder">
                    <span className="text-sm">🧸</span>
                  </button>
                  <textarea rows={1} value={newMessage}
                    onChange={e => { setNewMessage(e.target.value); e.target.style.height = 'auto'; e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`; }}
                    onKeyDown={handleKeyDown}
                    placeholder="Mesaj yazın… (Enter: gönder, Shift+Enter: yeni satır)"
                    className="flex-1 px-3.5 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-400 text-sm resize-none overflow-hidden leading-5 bg-gray-50 focus:bg-white transition-colors"
                    style={{ minHeight: '44px', maxHeight: '120px' }} />
                  <button onClick={handleSend} disabled={(!newMessage.trim() && !selectedFile) || isUploading}
                    className="p-2.5 rounded-xl bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-40 transition-colors cursor-pointer shrink-0 self-end">
                    {isUploading ? <RefreshCw size={16} className="animate-spin" /> : <Send size={16} />}
                  </button>
                </div>
              </div>

              {/* Grup üyeleri paneli */}
              {selectedConv.type === 'GROUP' && showGroupPanel && (
                <div className="border-t border-gray-100 p-3 bg-emerald-50/60 shrink-0 max-h-40 overflow-y-auto">
                  <h4 className="text-[10px] font-extrabold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Users size={11} /> {selectedConv.participants.length} Üye
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedConv.participants.map(p => (
                      <div key={p.id} className="flex items-center gap-1.5 px-2.5 py-1 bg-white rounded-full border border-emerald-100 shadow-sm">
                        <div className={cn('w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0',
                          p.id === user?.id ? 'bg-primary-100 text-primary-700' : 'bg-emerald-100 text-emerald-700')}>
                          {p.fullName?.charAt(0) ?? '?'}
                        </div>
                        <span className="text-xs font-medium text-gray-700">
                          {p.fullName?.split(' ')[0] ?? p.email}
                          {p.id === user?.id && <span className="text-gray-400 ml-1">(Sen)</span>}
                        </span>
                        {p.role === 'EXPERT' && <span className="text-[9px] text-primary-500 font-bold">Uzman</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Grup ayarları paneli */}
              {selectedConv.type === 'GROUP' && showGroupSettings && (
                <div className="border-t border-gray-100 p-4 bg-gray-50/80 shrink-0 space-y-4 max-h-64 overflow-y-auto">
                  <h4 className="text-[10px] font-extrabold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                    <Settings size={11} /> Grup Ayarları
                  </h4>

                  {/* İsim düzenleme */}
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-gray-600">Grup Adı</p>
                    <div className="flex gap-2">
                      <input value={groupEditName} onChange={e => setGroupEditName(e.target.value)}
                        className="flex-1 px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-400 bg-white" />
                      <button onClick={handleUpdateGroup}
                        className="px-3 py-1.5 bg-primary-600 text-white text-xs font-semibold rounded-lg hover:bg-primary-700 transition-colors">
                        Kaydet
                      </button>
                    </div>
                  </div>

                  {/* Üye ekle */}
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-gray-600 flex items-center gap-1"><UserPlus size={11} /> Üye Ekle</p>
                    <input value={addMemberQuery} onChange={e => setAddMemberQuery(e.target.value)}
                      placeholder="İsim veya e-posta..."
                      className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-400 bg-white" />
                    {addMemberResults.length > 0 && (
                      <div className="space-y-1">
                        {addMemberResults.slice(0, 4).map(u => (
                          <button key={u.id} onClick={() => handleAddMember(u)}
                            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-white border border-transparent hover:border-gray-200 text-left transition-colors">
                            <div className="w-6 h-6 rounded-full bg-primary-100 flex items-center justify-center text-[10px] font-bold text-primary-700 shrink-0">
                              {u.fullName?.charAt(0) ?? '?'}
                            </div>
                            <span className="text-xs font-medium text-gray-800 truncate">{u.fullName}</span>
                            <UserPlus size={11} className="ml-auto text-primary-500 shrink-0" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Mevcut üyeler — çıkarma */}
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-gray-600 flex items-center gap-1"><UserMinus size={11} /> Üyeleri Yönet</p>
                    <div className="space-y-1">
                      {selectedConv.participants.filter(p => p.id !== user?.id).map(p => (
                        <div key={p.id} className="flex items-center gap-2 px-2.5 py-1.5 bg-white rounded-lg border border-gray-100">
                          <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-600 shrink-0">
                            {p.fullName?.charAt(0) ?? '?'}
                          </div>
                          <span className="text-xs font-medium text-gray-800 flex-1 truncate">{p.fullName}</span>
                          {p.role === 'EXPERT' && <span className="text-[9px] text-primary-500 font-bold">Uzman</span>}
                          <button
                            onClick={() => handleRemoveMember(p)}
                            className="p-1 rounded hover:bg-red-50 text-gray-300 hover:text-red-500 transition-colors" title="Üyeyi çıkar">
                            <UserMinus size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            /* Boş durum */
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center gap-5">
              <div className="w-14 h-14 rounded-2xl bg-primary-50 flex items-center justify-center">
                <MessageCircle size={24} className="text-primary-500" />
              </div>
              <div>
                <p className="font-semibold text-gray-800">Konuşma seçin</p>
                <p className="text-sm text-gray-400 mt-1">Soldaki listeden açın ya da yeni başlatın</p>
              </div>
              <button onClick={() => setShowNewModal(true)}
                className="flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white rounded-xl text-sm font-semibold hover:bg-primary-700 transition-colors">
                <Plus size={15} /> Yeni Mesaj Başlat
              </button>
              {conversations.filter(c => !c.archived).length > 0 && (
                <div className="w-full max-w-xs space-y-1">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Son Konuşmalar</p>
                  {conversations.filter(c => !c.archived).slice(0, 3).map(conv => (
                    <button key={conv.id} onClick={() => setSelectedConv(conv)}
                      className="w-full flex items-center gap-2 p-2.5 rounded-xl hover:bg-gray-50 transition-colors text-left">
                      <div className={cn('w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0',
                        conv.type === 'GROUP' ? 'bg-emerald-100 text-emerald-700' : 'bg-primary-100 text-primary-700')}>
                        {conv.type === 'GROUP' ? <Users size={12} /> : getInitial(conv)}
                      </div>
                      <p className="text-xs font-semibold text-gray-800 truncate flex-1">{getTitle(conv)}</p>
                      {conv.unreadCount > 0 && (
                        <span className="w-4 h-4 rounded-full bg-primary-600 text-white text-[9px] flex items-center justify-center font-black shrink-0">
                          {conv.unreadCount}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </Card>
      </div>

      {/* ── Yeni Mesaj Modal ──────────────────────────────────────────────────── */}
      <Modal isOpen={showNewModal} onClose={() => { setShowNewModal(false); setSearchQuery(''); setSearchResults([]); }} title="Yeni Mesaj">
        <div className="space-y-4">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-3 text-gray-400" />
            <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              placeholder="İsim veya e-posta ile ara..."
              className="w-full pl-9 pr-9 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" autoFocus />
            {searchQuery && (
              <button onClick={() => { setSearchQuery(''); setSearchResults([]); }} className="absolute right-3 top-3">
                <X size={14} className="text-gray-400" />
              </button>
            )}
          </div>
          {searching && <p className="text-sm text-gray-400 text-center py-2">Aranıyor...</p>}
          {!searching && searchResults.length === 0 && searchQuery.length >= 2 && <p className="text-sm text-gray-400 text-center py-4">Sonuç bulunamadı.</p>}
          {!searching && searchResults.length === 0 && searchQuery.length < 2 && <p className="text-sm text-gray-400 text-center py-4">Mesaj göndermek istediğiniz kişiyi arayın.</p>}
          <div className="space-y-1 max-h-64 overflow-y-auto">
            {searchResults.map(u => (
              <button key={u.id} onClick={() => handleStartConversation(u)}
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors text-left cursor-pointer">
                <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center shrink-0">
                  <span className="text-primary-700 font-medium text-sm">{u.fullName?.charAt(0) ?? '?'}</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{u.fullName}</p>
                  <p className="text-xs text-gray-400">{u.email}</p>
                  {u.role === 'EXPERT' && <p className="text-[10px] text-primary-500 font-semibold">👨‍⚕️ Uzman</p>}
                </div>
              </button>
            ))}
          </div>
        </div>
      </Modal>

      {/* ── Grup Oluşturma Modal ──────────────────────────────────────────────── */}
      <Modal isOpen={showCreateGroupModal} onClose={() => { setShowCreateGroupModal(false); setGroupName(''); setGroupParticipants([]); setGroupSearchQuery(''); }} title="Yeni Grup Oluştur">
        <div className="space-y-4">
          {/* Grup adı */}
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">Grup Adı *</label>
            <input value={groupName} onChange={e => setGroupName(e.target.value)}
              placeholder="Örn: Terapistler, Aile Grubu..."
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>

          {/* Katılımcı ara */}
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">Katılımcı Ekle</label>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-3 text-gray-400" />
              <input value={groupSearchQuery} onChange={e => setGroupSearchQuery(e.target.value)}
                placeholder="İsim veya e-posta ile ara..."
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
            {groupSearching && <p className="text-xs text-gray-400 mt-1">Aranıyor...</p>}
            {groupSearchResults.length > 0 && (
              <div className="mt-1 space-y-1 max-h-32 overflow-y-auto border border-gray-100 rounded-xl p-1">
                {groupSearchResults.slice(0, 5).map(u => (
                  <button key={u.id} onClick={() => { setGroupParticipants(prev => [...prev, u]); setGroupSearchQuery(''); setGroupSearchResults([]); }}
                    className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-gray-50 text-left transition-colors">
                    <div className="w-6 h-6 rounded-full bg-primary-100 flex items-center justify-center text-[10px] font-bold text-primary-700 shrink-0">
                      {u.fullName?.charAt(0) ?? '?'}
                    </div>
                    <span className="text-sm font-medium text-gray-800 truncate flex-1">{u.fullName}</span>
                    <UserPlus size={13} className="text-primary-500 shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Seçilen katılımcılar */}
          {groupParticipants.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-600 mb-1.5">Seçilen Katılımcılar ({groupParticipants.length})</p>
              <div className="flex flex-wrap gap-2">
                {groupParticipants.map(p => (
                  <div key={p.id} className="flex items-center gap-1.5 px-2.5 py-1 bg-primary-50 border border-primary-200 rounded-full text-sm">
                    <span className="font-medium text-primary-700">{p.fullName?.split(' ')[0]}</span>
                    <button onClick={() => setGroupParticipants(prev => prev.filter(x => x.id !== p.id))}
                      className="text-primary-400 hover:text-red-500">
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button onClick={handleCreateGroup} disabled={creatingGroup || !groupName.trim() || groupParticipants.length === 0}
            className="w-full py-2.5 bg-primary-600 text-white rounded-xl text-sm font-semibold hover:bg-primary-700 disabled:opacity-40 transition-colors flex items-center justify-center gap-2">
            {creatingGroup ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Oluşturuluyor...</> : <><Users size={15} /> Grubu Oluştur</>}
          </button>
        </div>
      </Modal>
    </div>
  );
}
