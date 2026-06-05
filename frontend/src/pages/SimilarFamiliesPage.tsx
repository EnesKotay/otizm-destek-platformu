import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, MessageSquare, ChevronDown, Sparkles,
  SlidersHorizontal, EyeOff, Eye, ArrowUpDown,
  CalendarDays, MapPin, Video, Handshake, X, Send,
  Smile, GraduationCap, Tag, Activity, Map, UserCheck, Trash2,
  Compass, List, Navigation
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';
import { PageOnboarding } from '@/components/ui/PageOnboarding';
import { childService } from '@/services/childService';
import { matchingService } from '@/services/matchingService';
import { messagingService } from '@/services/messagingService';
import { buddyService, type BuddyDto } from '@/services/buddyService';
import { userService } from '@/services/userService';
import { useAuthStore } from '@/store/authStore';
import { useChildStore } from '@/store/childStore';
import { toast } from '@/store/toastStore';
import type { SimilarFamily, Conversation, Message } from '@/types';

const CATEGORY_COLORS: Record<string, string> = {
  ILETISIM: 'bg-blue-50 text-blue-700 border border-blue-150',
  SOSYAL: 'bg-emerald-50 text-emerald-700 border border-emerald-150',
  DUYUSAL: 'bg-purple-50 text-purple-700 border border-purple-150',
  DAVRANIS: 'bg-orange-50 text-orange-700 border border-orange-150',
  MOTOR: 'bg-rose-50 text-rose-700 border border-rose-150',
  EGITIM: 'bg-teal-50 text-teal-700 border border-teal-150',
};

const AGE_GROUPS = [
  { value: '', label: 'Tüm Yaşlar' },
  { value: '0-2', label: '0-2 yaş' },
  { value: '3-5', label: '3-5 yaş' },
  { value: '6-8', label: '6-8 yaş' },
  { value: '9-12', label: '9-12 yaş' },
  { value: '13-15', label: '13-15 yaş' },
  { value: '16+', label: '16+ yaş' },
];

const SORT_OPTIONS = [
  { value: 'score', label: 'Benzerlik Puanı' },
  { value: 'tags',  label: 'Ortak Etiket Sayısı' },
  { value: 'age',   label: 'Yaş Sırası' },
];

const MEETING_TIMES = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
  '16:00', '16:30', '17:00', '18:00', '19:00', '20:00',
];

interface MeetingTemplate {
  id: string;
  title: string;
  emoji: string;
  description: string;
  type: 'ONLINE' | 'YUZEYUZE';
  location: string;
  message: string;
}

const MEETING_TEMPLATES: MeetingTemplate[] = [
  {
    id: 'online-coffee',
    title: 'Online Kahve Sohbeti',
    emoji: '🌐',
    description: 'Evden ayrılmadan görüntülü konuşun.',
    type: 'ONLINE',
    location: '',
    message: 'Çocuklarımızın gelişim süreçleri hakkında online bir kahve eşliğinde dertleşmek, birbirimizin deneyimlerinden faydalanmak ve karşılıklı destek olmak isterim. Müsait olduğunuzda online bir görüşme planlayabiliriz. 😊'
  },
  {
    id: 'park-meet',
    title: 'Sakin Park Buluşması',
    emoji: '🌳',
    description: 'Açık havada, sakin ortamda tanışın.',
    type: 'YUZEYUZE',
    location: 'Ortak seçilecek sakin bir park veya bahçe',
    message: 'Çocuklarımızın gürültüsüz, duyusal hassasiyetlerine uygun açık havada birlikte vakit geçirebileceği sakin bir parkta buluşup tanışmak isterim.'
  },
  {
    id: 'playdate',
    title: 'Evde Oyun Arkadaşlığı',
    emoji: '🧸',
    description: 'Çocukları güvenli odada kaynaştırın.',
    type: 'YUZEYUZE',
    location: 'Ortak kararlaştırılacak bir oyun salonu veya ev',
    message: 'Çocuklarımızın güvenli bir ev/oyun ortamında akran etkileşimi kurabilmesi, bizim de ebeveyn olarak dertleşebilmemiz için bir oyun buluşması planlamayı öneriyorum.'
  },
  {
    id: 'parent-chat',
    title: 'Ebeveyn Sohbeti',
    emoji: '☕',
    description: 'Sadece veliler olarak dertleşin.',
    type: 'YUZEYUZE',
    location: 'Sakin bir cafe',
    message: 'Sadece ebeveynler olarak birer çay/kahve içip karşılıklı deneyimlerimizi paylaşmak, benzer yollardan geçmiş bir dost olarak birbirimize destek olmak isterim.'
  }
];

function ScoreBar({ label, value, color, icon }: { label: string; value: number; color: string; icon: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 text-xs bg-slate-50 p-2 rounded-xl border border-slate-100">
      <span className="text-gray-400 shrink-0">{icon}</span>
      <span className="w-14 font-medium text-gray-500 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-gray-200/80 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${Math.round(value * 100)}%` }}
        />
      </div>
      <span className="w-8 text-right font-bold text-gray-700">%{Math.round(value * 100)}</span>
    </div>
  );
}

function formatPercent(value: number) {
  return `%${Math.round(Math.max(0, Math.min(1, value)) * 100)}`;
}

function getInitial(name?: string) {
  return name?.trim().charAt(0).toLocaleUpperCase('tr-TR') || '?';
}

function getAffinityPill(score: number) {
  if (score >= 0.75) {
    return {
      text: 'Çok Yüksek Uyum 🔥',
      bg: 'bg-emerald-50 text-emerald-700 border-emerald-250',
      dot: 'bg-emerald-500 animate-pulse'
    };
  } else if (score >= 0.50) {
    return {
      text: 'Yüksek Sinerji ✨',
      bg: 'bg-violet-50 text-violet-700 border-violet-250',
      dot: 'bg-violet-500 animate-pulse'
    };
  } else if (score >= 0.25) {
    return {
      text: 'Orta Uyum 🤝',
      bg: 'bg-indigo-50 text-indigo-700 border-indigo-250',
      dot: 'bg-indigo-500'
    };
  } else {
    return {
      text: 'Gelişim Uyumu 🌱',
      bg: 'bg-slate-50 text-slate-700 border-slate-200',
      dot: 'bg-slate-400'
    };
  }
}

type MeetingType = 'ONLINE' | 'YUZEYUZE';

interface MeetingForm {
  type: MeetingType;
  date: string;
  time: string;
  location: string;
  message: string;
}

function FamilyMatchCard({
  family,
  selectedChildName,
  currentCity,
  messaging,
  onMessage,
  onOpenMeeting,
  onSendBuddyRequest,
}: {
  family: SimilarFamily;
  selectedChildName?: string;
  currentCity?: string;
  messaging: boolean;
  onMessage: (parentId: string) => void;
  onOpenMeeting: (family: SimilarFamily) => void;
  onSendBuddyRequest: (parentId: string, isMentor: boolean) => void;
}) {
  const pill = getAffinityPill(family.similarityScore);
  const sameCity = !!currentCity && !!family.parentCity && family.parentCity.toLocaleLowerCase('tr-TR') === currentCity.toLocaleLowerCase('tr-TR');
  const relationshipStatus = family.relationshipStatus || 'NONE';
  const hasRelationship = relationshipStatus === 'PENDING' || relationshipStatus === 'ACCEPTED';
  const relationLabel = relationshipStatus === 'ACCEPTED'
    ? (family.mentorRelation ? 'Mentor bağlantısı' : 'Buddy bağlantısı')
    : relationshipStatus === 'PENDING'
      ? 'İstek bekliyor'
      : null;
  const insight = (family.commonTags?.length || 0) > 0
    ? `${family.childName || family.parentName} ile ${selectedChildName || 'çocuğunuz'} ${family.commonTags!.slice(0, 3).map(t => t.name).join(', ')} alanlarında ortaklık gösteriyor.`
    : `${family.childName || 'Bu çocuk'} ile ${selectedChildName || 'çocuğunuz'} yakın gelişim evresinde görünüyor.`;

  return (
    <Card className="border border-slate-100 hover:border-indigo-200 hover:shadow-md transition-all">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_180px]">
        <div className="min-w-0">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white font-bold text-xl shrink-0">
              {getInitial(family.parentName)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg font-bold text-slate-950 truncate">{family.parentName}</h3>
                <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${pill.bg}`}>
                  {pill.text.replace(/[🔥✨🤝🌱]/g, '').trim()}
                </span>
                {sameCity && (
                  <span className="px-2.5 py-1 rounded-full text-[11px] font-bold border border-emerald-200 bg-emerald-50 text-emerald-700">
                    Aynı şehir
                  </span>
                )}
                {relationLabel && (
                  <span className="px-2.5 py-1 rounded-full text-[11px] font-bold border border-slate-200 bg-slate-50 text-slate-600">
                    {relationLabel}
                  </span>
                )}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span>{family.childName || 'Çocuk profili'} · {family.childAgeRange}</span>
                {family.parentCity && <span>· {family.parentCity}</span>}
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-2xl bg-slate-50 border border-slate-100 p-3">
            <div className="flex items-start gap-2">
              <Sparkles size={15} className="text-indigo-500 mt-0.5 shrink-0" />
              <p className="text-sm leading-6 text-slate-600">{insight}</p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
            <ScoreBar label="Etiket" value={family.tagScore} color="bg-indigo-500" icon={<Tag size={12} />} />
            <ScoreBar label="Yaş" value={family.ageScore} color="bg-blue-500" icon={<Smile size={12} />} />
            <ScoreBar label="Terapi" value={family.therapyScore} color="bg-teal-500" icon={<Activity size={12} />} />
            <ScoreBar label="Eğitim" value={family.educationScore} color="bg-emerald-500" icon={<GraduationCap size={12} />} />
          </div>

          {(family.commonTags?.length || 0) > 0 && (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {family.commonTags!.slice(0, 8).map(tag => (
                <span key={tag.id} className={`px-2.5 py-1 rounded-full text-xs font-semibold ${CATEGORY_COLORS[tag.category] || 'bg-gray-100 text-gray-700'}`}>
                  {tag.name}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="lg:border-l lg:border-slate-100 lg:pl-5 flex flex-col justify-between gap-4">
          <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4 text-center">
            <p className="text-xs font-semibold text-slate-400">Toplam uyum</p>
            <p className="mt-1 text-3xl font-bold text-slate-950">{formatPercent(family.similarityScore)}</p>
            <div className="mt-3 h-2 rounded-full bg-slate-200 overflow-hidden">
              <div className="h-full rounded-full bg-indigo-500" style={{ width: formatPercent(family.similarityScore) }} />
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-1 gap-2">
            <Button
              size="sm"
              variant="outline"
              loading={messaging}
              onClick={() => onMessage(family.parentId)}
              className="rounded-xl border-slate-200 text-xs"
            >
              <MessageSquare size={13} className="mr-1.5" /> Mesaj
            </Button>
            <button
              onClick={() => onOpenMeeting(family)}
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 transition-colors cursor-pointer"
            >
              <CalendarDays size={13} /> Buluşma
            </button>
            <button
              onClick={() => onSendBuddyRequest(family.parentId, false)}
              disabled={hasRelationship}
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-100 transition-colors cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
            >
              <Handshake size={13} /> Buddy
            </button>
            <button
              onClick={() => onSendBuddyRequest(family.parentId, true)}
              disabled={hasRelationship}
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-violet-50 hover:bg-violet-100 text-violet-700 border border-violet-100 transition-colors cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
            >
              <GraduationCap size={13} /> Mentor
            </button>
          </div>
        </div>
      </div>
    </Card>
  );
}

export function SimilarFamiliesPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { children, setChildren, selectedChild, setSelectedChild } = useChildStore();
  const selectedChildId = selectedChild?.id ?? '';
  const [results, setResults] = useState<SimilarFamily[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [matchingEnabled, setMatchingEnabled] = useState(true);
  const [togglingOptOut, setTogglingOptOut] = useState(false);
  const [messagingId, setMessagingId] = useState<string | null>(null);

  // Tab State
  const [activeTab, setActiveTab] = useState<'ai-match' | 'nearby' | 'my-circle'>('ai-match');
  const [myBuddies, setMyBuddies] = useState<BuddyDto[]>([]);
  const [pendingBuddies, setPendingBuddies] = useState<BuddyDto[]>([]);
  const [nearbyBuddies, setNearbyBuddies] = useState<BuddyDto[]>([]);
  const [buddiesLoading, setBuddiesLoading] = useState(false);
  const [maxDistance, setMaxDistance] = useState(15.0);
  const [viewMode, setViewMode] = useState<'radar' | 'list'>('radar');
  const [selectedBlip, setSelectedBlip] = useState<BuddyDto | null>(null);
  const [locating, setLocating] = useState(false);

  // AI priority sort focus state
  const [priorityFocus, setPriorityFocus] = useState<'BALANCED' | 'SYMPTOMS' | 'AGE' | 'THERAPY'>('BALANCED');

  // Quick-Chat Drawer states
  const [activeChatBuddy, setActiveChatBuddy] = useState<BuddyDto | null>(null);
  const [drawerConversation, setDrawerConversation] = useState<Conversation | null>(null);
  const [drawerMessages, setDrawerMessages] = useState<Message[]>([]);
  const [drawerNewMessage, setDrawerNewMessage] = useState('');
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [drawerSending, setDrawerSending] = useState(false);

  // Radar animated logs state
  const [radarLogs, setRadarLogs] = useState<string[]>([]);

  // Buluşma İsteği
  const [meetingFamily, setMeetingFamily] = useState<SimilarFamily | null>(null);
  const [meetingLoading, setMeetingLoading] = useState(false);
  const [meetingForm, setMeetingForm] = useState<MeetingForm>({
    type: 'ONLINE',
    date: '',
    time: '10:00',
    location: '',
    message: '',
  });

  // Filters
  const [minScore, setMinScore] = useState(0.05);
  const [ageGroup, setAgeGroup] = useState('');
  const [sortBy, setSortBy] = useState('score');
  const [cityOnly, setCityOnly] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    childService.getAll().then(data => {
      const childrenData = data || [];
      setChildren(childrenData);
      if (childrenData.length > 0 && !selectedChild) setSelectedChild(childrenData[0]);
    }).catch(() => {});
    matchingService.getMatchingStatus().then(setMatchingEnabled).catch(() => {});
  }, []);

  const doSearch = useCallback(async (childId: string) => {
    if (!childId) return;
    setLoading(true);
    setSearched(true);
    try {
      const data = await matchingService.findSimilarFamilies(childId, {
        minScore, ageGroup: ageGroup || undefined, sortBy,
      });
      setResults(data || []);
    } catch {
      setResults([]);
      toast.error('Eşleştirme sırasında bir hata oluştu.');
    }
    setLoading(false);
  }, [minScore, ageGroup, sortBy]);

  const fetchBuddiesData = useCallback(async () => {
    setBuddiesLoading(true);
    try {
      const [list, pending, near] = await Promise.all([
        buddyService.getMyBuddies(),
        buddyService.getPendingRequests(),
        buddyService.getNearbyBuddies(maxDistance),
      ]);
      setMyBuddies(list || []);
      setPendingBuddies(pending || []);
      setNearbyBuddies(near || []);
    } catch {
      // ignore
    }
    setBuddiesLoading(false);
  }, [maxDistance]);
  const getAngleFromId = (id: string) => {
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
      hash = id.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs(hash) % 360;
  };

  const handleGeolocate = () => {
    if (!navigator.geolocation) {
      toast.error("Tarayıcınız coğrafi konumu desteklemiyor.");
      return;
    }
    setLocating(true);
    toast.info("Cihaz konumunuz alınıyor...");
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const updatedUser = await userService.updateProfile({
            latitude: latitude.toFixed(6),
            longitude: longitude.toFixed(6),
            city: user?.city || undefined
          });
          useAuthStore.setState({ user: updatedUser });
          toast.success("Konumunuz başarıyla algılandı ve kaydedildi.");
          fetchBuddiesData();
        } catch {
          toast.error("Konum profilinize kaydedilemedi.");
        } finally {
          setLocating(false);
        }
      },
      (error) => {
        console.error(error);
        toast.error("Konum izni reddedildi veya konum belirlenemedi.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const loadDrawerChat = useCallback(async (buddyId: string) => {
    setDrawerLoading(true);
    try {
      const conv = await messagingService.getOrCreateDirect(buddyId);
      setDrawerConversation(conv);
      const history = await messagingService.getMessages(conv.id);
      setDrawerMessages(history.content.reverse());
      setTimeout(() => {
        const scroller = document.getElementById('drawer-chat-scroller');
        if (scroller) scroller.scrollTop = scroller.scrollHeight;
      }, 150);
    } catch {
      toast.error("Sohbet yüklenirken bir hata oluştu.");
    }
    setDrawerLoading(false);
  }, []);

  useEffect(() => {
    if (activeChatBuddy) {
      loadDrawerChat(activeChatBuddy.buddyId);
    } else {
      setDrawerConversation(null);
      setDrawerMessages([]);
    }
  }, [activeChatBuddy, loadDrawerChat]);

  // Radar animated logs
  useEffect(() => {
    if (user?.latitude && user?.longitude && activeTab === 'nearby') {
      setRadarLogs([`[${new Date().toLocaleTimeString('tr-TR', {hour: '2-digit', minute:'2-digit'})}] 📡 Proximity radar arayüzü başlatıldı.`]);
      const events = [
        "📍 Cihaz koordinatları doğrulandı.",
        "🔍 15 km çapındaki kapsama alanı taranıyor...",
        "🟢 Moda bölgesinde benzer gelişim profiline sahip ebeveynler aranıyor...",
        `✨ ${nearbyBuddies.length} potansiyel buddy/mentor eşleşmesi tespit edildi!`,
        "💡 Detayları görmek için radar üzerindeki noktalara tıklayabilirsiniz."
      ];
      let i = 0;
      const interval = setInterval(() => {
        if (i < events.length) {
          setRadarLogs(prev => [...prev, `[${new Date().toLocaleTimeString('tr-TR', {hour: '2-digit', minute:'2-digit'})}] ${events[i]}`]);
          i++;
        } else {
          clearInterval(interval);
        }
      }, 2500);
      return () => clearInterval(interval);
    }
  }, [user?.latitude, user?.longitude, activeTab, nearbyBuddies.length]);

  useEffect(() => {
    if (selectedChildId) doSearch(selectedChildId);
  }, [selectedChildId, doSearch]);

  useEffect(() => {
    fetchBuddiesData();
  }, [fetchBuddiesData]);

  const handleSearch = () => doSearch(selectedChildId);

  const handleToggleOptOut = async () => {
    setTogglingOptOut(true);
    try {
      const enabled = await matchingService.toggleMatching();
      setMatchingEnabled(enabled);
    } catch { toast.error('Eşleştirme ayarı değiştirilemedi.'); }
    setTogglingOptOut(false);
  };

  const handleMessage = async (parentId: string) => {
    setMessagingId(parentId);
    try {
      await messagingService.getOrCreateDirect(parentId);
      navigate('/mesajlar');
    } catch { toast.error('Mesaj başlatılamadı.'); }
    setMessagingId(null);
  };

  // Buddy & Mentor Operations
  const handleSendBuddyRequest = async (receiverId: string, isMentor: boolean) => {
    try {
      await buddyService.sendRequest(receiverId, isMentor);
      toast.success(isMentor ? 'Mentorluk isteği gönderildi! 🌟' : 'Buddy eşleşme isteği gönderildi! 🤝');
      setResults(prev => prev.map(family => family.parentId === receiverId
        ? { ...family, relationshipStatus: 'PENDING', mentorRelation: isMentor }
        : family
      ));
      fetchBuddiesData();
      if (selectedChildId) doSearch(selectedChildId);
    } catch (e: any) {
      toast.error(e?.message || 'İstek gönderilemedi.');
    }
  };

  const handleAcceptRequest = async (relationshipId: string) => {
    try {
      await buddyService.acceptRequest(relationshipId);
      toast.success('Eşleşme isteği kabul edildi! Canlı sohbet odanız açıldı. 🎉');
      fetchBuddiesData();
    } catch {
      toast.error('İstek kabul edilemedi.');
    }
  };

  const handleRejectRequest = async (relationshipId: string) => {
    try {
      await buddyService.rejectRequest(relationshipId);
      toast.success('İstek reddedildi.');
      fetchBuddiesData();
    } catch {
      toast.error('İşlem başarısız oldu.');
    }
  };

  const handleRemoveBuddy = async (relationshipId: string) => {
    if (!window.confirm('Bu eşleşmeyi kaldırmak istediğinize emin misiniz?')) return;
    try {
      await buddyService.removeBuddy(relationshipId);
      toast.success('Eşleşme kaldırıldı.');
      fetchBuddiesData();
    } catch {
      toast.error('İşlem başarısız oldu.');
    }
  };

  const handleOpenMeeting = (family: SimilarFamily) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const defaultDate = tomorrow.toISOString().slice(0, 10);
    setMeetingForm({ type: 'ONLINE', date: defaultDate, time: '10:00', location: '', message: '' });
    setMeetingFamily(family);
  };

  const handleSendMeeting = async () => {
    if (!meetingFamily || !meetingForm.date || !meetingForm.time) {
      toast.error('Lütfen tarih ve saat seçin.');
      return;
    }
    setMeetingLoading(true);
    try {
      const conv = await messagingService.getOrCreateDirect(meetingFamily.parentId);
      const typeLabel = meetingForm.type === 'ONLINE' ? '🌐 Online (görüntülü)' : '🤝 Yüz Yüze';
      const dateFormatted = new Date(meetingForm.date).toLocaleDateString('tr-TR', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
      });
      const lines = [
        '📅 Buluşma İsteği',
        '',
        'Merhaba! Benzer çocuklarımızın deneyimlerini paylaşmak için bir buluşma önermek istedim.',
        '',
        `🗓 Tarih: ${dateFormatted}`,
        `⏰ Saat: ${meetingForm.time}`,
        `📍 Tür: ${typeLabel}`,
        ...(meetingForm.type === 'YUZEYUZE' && meetingForm.location
          ? [`🗺 Konum: ${meetingForm.location}`]
          : []),
        ...(meetingForm.message ? ['', `💬 ${meetingForm.message}`] : []),
        '',
        'Bu tarihe uygunsa yanıtlayabilir, farklı bir tarih önermek isterseniz yazabilirsiniz. 😊',
      ];
      await messagingService.sendMessage(conv.id, lines.join('\n'));
      setMeetingFamily(null);
      toast.success('Buluşma isteği gönderildi! 🎉');
      navigate('/mesajlar', { state: { openConversationId: conv.id } });
    } catch {
      toast.error('Buluşma isteği gönderilemedi.');
    }
    setMeetingLoading(false);
  };

  const hasNoTags = selectedChild && (!selectedChild.tags || selectedChild.tags.length === 0);
  const filteredResults = cityOnly && user?.city
    ? results.filter(r => r.parentCity === user.city)
    : results;

  const getSortedResults = () => {
    const baseList = [...filteredResults];
    if (priorityFocus === 'SYMPTOMS') {
      return baseList.sort((a, b) => b.tagScore - a.tagScore);
    }
    if (priorityFocus === 'AGE') {
      return baseList.sort((a, b) => b.ageScore - a.ageScore);
    }
    if (priorityFocus === 'THERAPY') {
      return baseList.sort((a, b) => b.therapyScore - a.therapyScore);
    }
    return baseList.sort((a, b) => b.similarityScore - a.similarityScore);
  };
  const finalResults = getSortedResults();
  const bestMatch = finalResults[0];

  return (
    <div className="max-w-[92rem] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">
      <PageOnboarding
        pageId="similar-families"
        title="🤝 Ortak Yolculukta Birlikte Güçlüyüz: Benzer Aileler ve Buddy Sistemi"
        description="Yapay zeka destekli eşleştirme motorumuz, çocuğunuzun gelişim seyrini, semptomlarını ve terapi hedeflerini analiz ederek sizinle en uyumlu aileleri bulur. Ayrıca 'Buddy & Mentorluk' altyapımızla 15 km yakınınızdaki velileri keşfedebilir, karşılıklı destek bağları kurabilirsiniz."
        steps={[
          {
            icon: <Sparkles size={20} />,
            title: "🧩 Akıllı Klinik Benzerlik",
            description: "Çocuğunuzun gelişimsel özellikleri, terapi hedefleri, yaş aralığı ve tanı etiketleri yapay zekamız tarafından güvenle işlenerek en yüksek sinerjiye sahip aileleri listeler."
          },
          {
            icon: <MapPin size={20} />,
            title: "📍 Mahalle Bazlı Eşleşme (Buddy)",
            description: "Enlem ve boylam konum verilerini kullanarak en yakınınızdaki benzer hedeflere sahip otizmli velileri bulun, sosyal bir destek çemberi oluşturun."
          },
          {
            icon: <Handshake size={20} />,
            title: "🌟 Veli Mentorluk Ağı",
            description: "Süreçleri yeni tanıyan velilere rehberlik etmek için Mentor olun veya tecrübeli velilerden rehberlik talep ederek buddy yol arkadaşlığı kurun."
          }
        ]}
      />

      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500 to-primary-600 flex items-center justify-center text-white shadow-lg shadow-indigo-100 shrink-0">
            <Users size={22} />
          </div>
          <div>
          <h1 className="text-2xl font-bold text-slate-950 tracking-tight">
            Benzer Aileler
          </h1>
          <p className="text-sm text-slate-500 mt-1 max-w-3xl">
            Benzer gelişim alanlarına sahip aileleri bulun, güvenli bağlantı kurun ve sosyal destek çemberinizi yönetin.
          </p>
          </div>
        </div>
        {children.length > 0 && (
          <div className="grid grid-cols-3 gap-2 w-full xl:w-auto">
            <div className="rounded-2xl bg-white border border-slate-100 px-4 py-3 shadow-sm">
              <p className="text-[11px] font-semibold text-slate-400">AI eşleşme</p>
              <p className="text-lg font-bold text-slate-950">{finalResults.length}</p>
            </div>
            <div className="rounded-2xl bg-white border border-slate-100 px-4 py-3 shadow-sm">
              <p className="text-[11px] font-semibold text-slate-400">En iyi uyum</p>
              <p className="text-lg font-bold text-slate-950">{bestMatch ? formatPercent(bestMatch.similarityScore) : '—'}</p>
            </div>
            <div className="rounded-2xl bg-white border border-slate-100 px-4 py-3 shadow-sm">
              <p className="text-[11px] font-semibold text-slate-400">Bekleyen</p>
              <p className="text-lg font-bold text-slate-950">{pendingBuddies.length}</p>
            </div>
          </div>
        )}
      </div>

      {/* Premium Eşleşme Aktiflik Kartı (Status Hub) */}
      {children.length > 0 && (
        <div className={`p-4 rounded-2xl border transition-all duration-300 ${
          matchingEnabled
            ? 'bg-white border-emerald-100 text-slate-900 shadow-sm'
            : 'bg-amber-50 border-amber-200 text-amber-950 shadow-sm'
        }`}>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${matchingEnabled ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-100 text-amber-700'}`}>
                {matchingEnabled ? <Eye size={18} /> : <EyeOff size={18} />}
              </div>
              <div>
                <h4 className="font-semibold text-sm">
                  {matchingEnabled ? 'Eşleşme görünürlüğü açık' : 'Eşleşme görünürlüğü kapalı'}
                </h4>
                <p className="text-xs text-slate-500 leading-relaxed max-w-2xl mt-1">
                  {matchingEnabled
                    ? 'Profiliniz benzer aileler tarafından bulunabilir. İstediğiniz zaman görünürlüğü kapatabilirsiniz.'
                    : 'Diğer aileler sizi eşleşme sonuçlarında göremez. Destek ağına katılmak için görünürlüğü açabilirsiniz.'}
                </p>
              </div>
            </div>
            <button
              onClick={handleToggleOptOut}
              disabled={togglingOptOut}
              className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer shrink-0 ${
                matchingEnabled
                  ? 'bg-white hover:bg-emerald-50 border-emerald-200 text-emerald-700 shadow-sm'
                  : 'bg-indigo-600 hover:bg-indigo-700 border-transparent text-white shadow-md shadow-indigo-100/50'
              }`}
            >
              {matchingEnabled ? <EyeOff size={13} /> : <Eye size={13} />}
              {matchingEnabled ? 'Eşleşmeden Gizlen' : 'Eşleşmeyi Aktif Et'}
            </button>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      {children.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 bg-slate-100 p-1 rounded-2xl">
          <button
            onClick={() => setActiveTab('ai-match')}
            className={`h-11 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'ai-match' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Sparkles size={16} /> Akıllı Uyum
          </button>
          <button
            onClick={() => setActiveTab('nearby')}
            className={`h-11 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'nearby' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <MapPin size={16} /> Yakındaki Veliler
          </button>
          <button
            onClick={() => setActiveTab('my-circle')}
            className={`h-11 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer relative ${
              activeTab === 'my-circle' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Handshake size={16} /> Sosyal Çember
            {pendingBuddies.length > 0 && (
              <span className="absolute top-1 right-2 bg-red-500 text-white rounded-full min-w-5 h-5 px-1 text-[10px] font-bold flex items-center justify-center">
                {pendingBuddies.length}
              </span>
            )}
          </button>
        </div>
      )}

      {/* No children state */}
      {children.length === 0 && (
        <div className="text-center py-12">
          <div className="w-16 h-16 rounded-2xl bg-indigo-100 flex items-center justify-center mx-auto mb-4">
            <Users size={28} className="text-indigo-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Önce çocuk profili ekleyin</h3>
          <p className="text-gray-500 text-sm mb-6 max-w-sm mx-auto">
            Benzer aileler özelliğini kullanmak için çocuğunuzun profilini ve semptom etiketlerini ekleyin.
          </p>
          <button
            onClick={() => navigate('/cocuklarim')}
            className="px-6 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 transition-colors cursor-pointer"
          >
            Çocuk Profili Ekle
          </button>
        </div>
      )}

      {/* TAB 1: AI MATCHING */}
      {children.length > 0 && activeTab === 'ai-match' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Child selector + search */}
          <Card className="shadow-xs hover:shadow-sm transition-all duration-300">
            <div className="flex flex-col sm:flex-row gap-4 items-end">
              <div className="flex-1 w-full">
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Çocuk Profili Seçin</label>
                <div className="relative">
                  <select
                    value={selectedChildId}
                    onChange={e => { const c = children.find(ch => ch.id === e.target.value); if (c) setSelectedChild(c); }}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm appearance-none bg-white font-medium text-slate-700 cursor-pointer shadow-xs"
                  >
                    {children.map(child => (
                      <option key={child.id} value={child.id}>{child.name}</option>
                    ))}
                  </select>
                  <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>
              <div className="flex gap-2 w-full sm:w-auto shrink-0 justify-end">
                <button
                  onClick={() => setShowFilters(v => !v)}
                  className={`flex items-center gap-1.5 px-4 py-3 rounded-xl border text-sm font-semibold transition-all cursor-pointer ${
                    showFilters ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'border-slate-200 text-slate-650 hover:bg-slate-50'
                  }`}
                >
                  <SlidersHorizontal size={14} /> Filtreler
                </button>
                <Button onClick={handleSearch} loading={loading} disabled={!selectedChildId || !!hasNoTags} className="shadow-md shadow-indigo-100/50">
                  <Sparkles size={16} className="mr-2" />
                  Yenile
                </Button>
              </div>
            </div>

            {/* Filters panel */}
            {showFilters && (
              <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    Min. Benzerlik: %{Math.round(minScore * 100)}
                  </label>
                  <input
                    type="range"
                    min={0} max={80} step={5}
                    value={Math.round(minScore * 100)}
                    onChange={e => setMinScore(Number(e.target.value) / 100)}
                    className="w-full accent-indigo-600 cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Yaş Grubu</label>
                  <div className="relative">
                    <select
                      value={ageGroup}
                      onChange={e => setAgeGroup(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm font-medium appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                    >
                      {AGE_GROUPS.map(ag => (
                        <option key={ag.value} value={ag.value}>{ag.label}</option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Sıralama</label>
                  <div className="relative">
                    <select
                      value={sortBy}
                      onChange={e => setSortBy(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm font-medium appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                    >
                      {SORT_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                    <ArrowUpDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>
                </div>
                {user?.city && (
                  <div className="col-span-1 sm:col-span-3 mt-2 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-slate-700">Sadece {user.city} içindeki aileleri göster</p>
                      <p className="text-[11px] text-slate-450 mt-0.5">Aynı şehirde yaşadığınız velilerle kolayca yüz yüze buluşun</p>
                    </div>
                    <button
                      onClick={() => setCityOnly(v => !v)}
                      className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer shrink-0 ${cityOnly ? 'bg-indigo-600' : 'bg-slate-200'}`}
                    >
                      <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-xs transition-transform ${cityOnly ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </div>
                )}

                {/* AI Matching Priority Focus Panel */}
                <div className="col-span-1 sm:col-span-3 mt-2 pt-3 border-t border-slate-100 flex flex-col gap-2.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <span className="text-[10px] font-black text-indigo-950 bg-indigo-50 border border-indigo-150 px-2 py-0.5 rounded-md uppercase tracking-wider select-none shrink-0 w-fit">
                      🤖 Yapay Zeka Eşleştirme Odak Önceliği
                    </span>
                    <span className="text-[10px] font-medium text-slate-400">
                      Sıralama sıraları seçilen odağa göre otomatik olarak yeniden hesaplanır.
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { id: 'BALANCED', label: '⚖️ Dengeli Analiz', desc: 'Genel klinik ve sosyal sinerji dengesi' },
                      { id: 'SYMPTOMS', label: '🧬 Belirtiler & Hassasiyetler', desc: 'Benzer semptom ve duyusal hassasiyetler' },
                      { id: 'AGE', label: '🧸 Akran Etkileşimi (Yaş)', desc: 'Yakın yaş aralığı ve gelişim evresi' },
                      { id: 'THERAPY', label: '🩺 Terapi & Eğitim', desc: 'Ortak konuşma, duyu bütünleme veya ergoterapi' }
                    ].map(focus => (
                      <button
                        key={focus.id}
                        type="button"
                        onClick={() => {
                          setPriorityFocus(focus.id as any);
                          toast.success(`Eşleştirme motoru önceliği "${focus.label}" olarak güncellendi! 🚀`);
                        }}
                        title={focus.desc}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer select-none ${
                          priorityFocus === focus.id
                            ? 'bg-indigo-650 border-transparent text-white shadow-xs'
                            : 'bg-white border-slate-200 text-slate-650 hover:bg-slate-50'
                        }`}
                      >
                        {focus.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {hasNoTags && (
              <div className="mt-4 p-4 rounded-xl bg-amber-50 border border-amber-200 shadow-inner">
                <div className="flex items-start gap-2 mb-3">
                  <span className="text-amber-500 mt-0.5 shrink-0 text-base">⚠</span>
                  <p className="text-sm text-amber-800">
                    <strong>{selectedChild?.name}</strong> için henüz semptom veya gelişim etiketleri eklenmemiş.
                    Benzer aileleri bulabilmek için önce çocuğunuzun profilinde etiket seçmeniz gerekiyor.
                  </p>
                </div>
                <button
                  onClick={() => navigate(`/cocuklarim/${selectedChildId}`, { state: { openTagEditor: true } })}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold rounded-xl transition-colors cursor-pointer shadow-xs"
                >
                  {selectedChild?.name} için etiket ekle →
                </button>
              </div>
            )}

            {selectedChild && !hasNoTags && (
              <div className="mt-4 p-3 bg-indigo-50/30 rounded-2xl border border-indigo-100/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 shrink-0">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-extrabold text-sm shadow-xs select-none">
                    {selectedChild.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-xs font-black text-indigo-950">{selectedChild.name}</p>
                    <p className="text-[10px] text-indigo-500 font-medium leading-normal mt-0.5">
                      {selectedChild.birthDate ? `${new Date().getFullYear() - new Date(selectedChild.birthDate).getFullYear()} Yaşında` : 'Yaş Belirtilmemiş'}
                      {selectedChild.educationProgram ? ` • ${selectedChild.educationProgram}` : ''}
                    </p>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  {selectedChild.tags && selectedChild.tags.length > 0 ? (
                    <div className="flex flex-wrap gap-1 justify-start sm:justify-end">
                      {selectedChild.tags.map(tag => (
                        <span key={tag.id} className={`px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wide uppercase ${CATEGORY_COLORS[tag.category] || 'bg-gray-100 text-gray-700'}`}>
                          {tag.name}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-amber-600 italic text-right">Henüz etiket tanımlanmamış.</p>
                  )}
                </div>
              </div>
            )}
          </Card>

          {loading && (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-3">
              <Sparkles size={24} className="animate-spin text-indigo-500" />
              <p className="text-xs font-semibold tracking-wider text-slate-500 uppercase animate-pulse">Uyumlu Aileler Eşleştiriliyor...</p>
            </div>
          )}

          {!loading && searched && finalResults.length === 0 && (
            <EmptyState
              icon={<Users size={32} />}
              title="Uyumlu Aile Bulunamadı"
              description="Arama kriterlerinizi genişletmek için min. benzerlik oranını düşürmeyi veya çocuk profilindeki gelişim etiketlerini artırmayı deneyin."
            />
          )}

          {!loading && finalResults.length > 0 && (
            <div className="space-y-4 animate-fadeIn">
              {finalResults.map((family) => (
                <FamilyMatchCard
                  key={family.parentId}
                  family={family}
                  selectedChildName={selectedChild?.name}
                  currentCity={user?.city}
                  messaging={messagingId === family.parentId}
                  onMessage={handleMessage}
                  onOpenMeeting={handleOpenMeeting}
                  onSendBuddyRequest={handleSendBuddyRequest}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: NEARBY PARENTS */}
      {children.length > 0 && activeTab === 'nearby' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Radar Sweep & Pulse Keyframes */}
          <style>{`
            @keyframes radar-sweep {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }
            @keyframes radar-pulse-glow {
              0% { transform: scale(0.9); opacity: 0.1; }
              50% { transform: scale(1.4); opacity: 0.5; }
              100% { transform: scale(0.9); opacity: 0.1; }
            }
            @keyframes slide-left {
              from { transform: translateX(100%); }
              to { transform: translateX(0); }
            }
            .animate-radar-sweep {
              animation: radar-sweep 8s linear infinite;
            }
            .animate-radar-pulse {
              animation: radar-pulse-glow 2.5s cubic-bezier(0.24, 0, 0.38, 1) infinite;
            }
            .animate-slideLeft {
              animation: slide-left 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
            }
          `}</style>

          {/* Konum Belirleme Hub / Parametre Paneli */}
          <Card className="p-5 border border-slate-100 shadow-sm relative overflow-hidden backdrop-blur-md bg-white/95">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none" />
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div className="space-y-1.5 flex-1">
                <h3 className="font-extrabold text-slate-800 text-lg flex items-center gap-2.5">
                  <Compass className="text-indigo-650 animate-spin" style={{ animationDuration: '8s' }} size={22} />
                  Mesafe Bazlı Veli Arama & Radar
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed max-w-xl">
                  Enlem ve boylam koordinatlarınızı kullanarak çevrenizdeki diğer otizmli velileri bulun. 
                  Birbirinize destek olabilir, çocuklar için oyun arkadaşlığı veya sosyal buluşmalar düzenleyebilirsiniz.
                </p>
              </div>

              {/* Parametre Ayarları (Sadece Konum Tanımlıysa Göster) */}
              {user?.latitude != null && user?.longitude != null && (
                <div className="w-full md:w-72 shrink-0 space-y-2 bg-slate-50/60 p-3 rounded-2xl border border-slate-100">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
                      Maksimum Arama Mesafesi
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-[10px] font-black text-indigo-700 border border-indigo-150 animate-pulse">
                      {maxDistance} km
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min={2} max={100} step={2}
                      value={maxDistance}
                      onChange={e => setMaxDistance(Number(e.target.value))}
                      className="w-full accent-indigo-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg appearance-none"
                    />
                    <button
                      onClick={fetchBuddiesData}
                      className="px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl cursor-pointer text-xs font-bold shadow-xs select-none transition-all text-slate-700 shrink-0"
                    >
                      Yenile
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Simulated Coordinate Setter for KVKK / Test */}
            {(user?.latitude == null || user?.longitude == null) && (
              <div className="mt-5 p-5 bg-gradient-to-r from-slate-900 to-indigo-950 rounded-2xl shadow-xl border border-slate-800 text-white relative overflow-hidden">
                {/* Visual Fake Radar Scanner Preview */}
                <div className="absolute right-[-40px] bottom-[-40px] w-48 h-48 rounded-full border border-indigo-500/20 bg-indigo-500/5 flex items-center justify-center pointer-events-none select-none">
                  <div className="w-36 h-36 rounded-full border border-indigo-500/10 flex items-center justify-center">
                    <div className="w-24 h-24 rounded-full border border-indigo-500/10 flex items-center justify-center animate-pulse">
                      <div className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                    </div>
                  </div>
                </div>

                <div className="relative z-10 max-w-xl space-y-3">
                  <h4 className="text-base font-black flex items-center gap-2 tracking-wide text-indigo-200">
                    📍 Coğrafi Konumunuz Henüz Tanımlanmamış
                  </h4>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Yakındaki velileri mesafe hesabı ve etkileşimli radar ekranında görebilmek için konum erişimi vermeli veya simüle bir konum atamalısınız. 
                    <strong>"Konumumu Simüle Et"</strong> butonuna tıklayarak İstanbul Kadıköy koordinatlarını veritabanına atayabilir veya gerçek tarayıcı konumunuzu kullanabilirsiniz.
                  </p>
                  <div className="flex flex-wrap gap-2.5 pt-1.5">
                    <button
                      onClick={async () => {
                        try {
                          const updatedUser = await userService.updateProfile({
                            latitude: '40.9901',
                            longitude: '29.0224',
                            city: 'İstanbul'
                          });
                          useAuthStore.setState({ user: updatedUser });
                          toast.success("İstanbul Kadıköy konum koordinatları başarıyla simüle edildi! (40.9901, 29.0224) 📍");
                          fetchBuddiesData();
                        } catch {
                          toast.error("Konum atanamadı.");
                        }
                      }}
                      className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-750 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer transition-all hover:-translate-y-0.5 animate-pulse"
                    >
                      Konumumu Simüle Et
                    </button>
                    <button
                      onClick={handleGeolocate}
                      disabled={locating}
                      className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-xl text-xs font-bold cursor-pointer transition-all hover:-translate-y-0.5 flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <Navigation size={13} className={locating ? 'animate-spin' : ''} />
                      {locating ? 'Alınıyor...' : 'Gerçek Konumumu Kullan (GPS)'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </Card>

          {/* Konum Tanımlıysa ve Sonuçlar Yüklendiyse */}
          {user?.latitude != null && user?.longitude != null && (
            <div className="space-y-4 animate-fadeIn">
              {/* Görünüm Değiştirici Sekmeler */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200/85 pb-3 gap-3">
                <div className="flex gap-1.5 bg-slate-100 p-1 rounded-xl shrink-0">
                  <button
                    onClick={() => setViewMode('radar')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all select-none ${
                      viewMode === 'radar'
                        ? 'bg-white text-indigo-700 shadow-xs'
                        : 'text-slate-500 hover:text-slate-850'
                    }`}
                  >
                    <Compass size={14} /> 🛰 Etkileşimli Radar Haritası
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all select-none ${
                      viewMode === 'list'
                        ? 'bg-white text-indigo-700 shadow-xs'
                        : 'text-slate-500 hover:text-slate-850'
                    }`}
                  >
                    <List size={14} /> 📋 Klasik Liste Görünümü
                  </button>
                </div>
                
                <div className="flex items-center justify-end gap-2.5">
                  <span className="text-[10px] font-bold text-slate-450">
                    Mevcut Konum: {user.city || 'İstanbul'} ({Number(user.latitude ?? 41.008).toFixed(3)}, {Number(user.longitude ?? 28.978).toFixed(3)})
                  </span>
                  <button
                    onClick={handleGeolocate}
                    disabled={locating}
                    className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-500 cursor-pointer text-xs transition-colors shadow-2xs bg-white"
                    title="Cihaz Konumunu Yenile"
                  >
                    <Navigation size={12} className={locating ? 'animate-spin text-indigo-500' : ''} />
                  </button>
                </div>
              </div>

              {buddiesLoading ? (
                <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-3">
                  <Sparkles size={24} className="animate-spin text-indigo-500" />
                  <p className="text-xs font-semibold uppercase animate-pulse">Yakındaki Veliler Taranıyor...</p>
                </div>
              ) : nearbyBuddies.length === 0 ? (
                <EmptyState
                  icon={<Map size={32} />}
                  title="Yakınınızda Veli Bulunmamaktadır"
                  description="Konum filtre mesafesini artırmayı deneyebilir veya koordinat tanımlarınızı güncelleyebilirsiniz."
                />
              ) : viewMode === 'radar' ? (
                /* RADAR MAP INTERACTIVE VIEW */
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                  
                  {/* LEFT: SVG Radar Scanner screen */}
                  <div className="lg:col-span-6 flex flex-col items-center justify-center bg-slate-950 rounded-3xl p-6 shadow-2xl border-4 border-slate-900 relative overflow-hidden">
                    {/* Grid texture overlay */}
                    <div className="absolute inset-0 opacity-[0.03] bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:24px_24px]" />
                    
                    {/* Radar Scanning sweep container */}
                    <div className="relative w-full max-w-[340px] aspect-square rounded-full border border-slate-800/80 bg-slate-950 relative shadow-inner overflow-hidden">
                      {/* Sweeping glowing radial cone */}
                      <div className="absolute inset-0 origin-center animate-radar-sweep pointer-events-none" style={{
                        background: 'conic-gradient(from 0deg at 50% 50%, rgba(99, 102, 241, 0.25) 0deg, rgba(99, 102, 241, 0) 120deg)',
                        borderRadius: '50%'
                      }} />
                      
                      {/* Concentric grid lines and crosshair labels inside SVG */}
                      <svg viewBox="0 0 400 400" className="absolute inset-0 w-full h-full pointer-events-none">
                        {/* Rings */}
                        <circle cx="200" cy="200" r="180" stroke="rgba(99, 102, 241, 0.15)" strokeWidth="1" fill="none" />
                        <circle cx="200" cy="200" r="135" stroke="rgba(99, 102, 241, 0.12)" strokeWidth="1" fill="none" />
                        <circle cx="200" cy="200" r="90" stroke="rgba(99, 102, 241, 0.12)" strokeWidth="1" fill="none" />
                        <circle cx="200" cy="200" r="45" stroke="rgba(99, 102, 241, 0.12)" strokeWidth="1" fill="none" />
                        
                        {/* Axes */}
                        <line x1="20" y1="200" x2="380" y2="200" stroke="rgba(99, 102, 241, 0.15)" strokeWidth="1" strokeDasharray="3 3" />
                        <line x1="200" y1="20" x2="200" y2="380" stroke="rgba(99, 102, 241, 0.15)" strokeWidth="1" strokeDasharray="3 3" />
                        
                        {/* Distance labels in green/indigo */}
                        <text x="205" y="213" fill="rgba(99, 102, 241, 0.5)" fontSize="9" fontWeight="bold">{(maxDistance * 0.25).toFixed(1)} km</text>
                        <text x="205" y="268" fill="rgba(99, 102, 241, 0.5)" fontSize="9" fontWeight="bold">{(maxDistance * 0.50).toFixed(1)} km</text>
                        <text x="205" y="323" fill="rgba(99, 102, 241, 0.5)" fontSize="9" fontWeight="bold">{(maxDistance * 0.75).toFixed(1)} km</text>
                        <text x="205" y="375" fill="rgba(99, 102, 241, 0.5)" fontSize="9" fontWeight="bold">{maxDistance.toFixed(1)} km</text>
                        
                        {/* Self coordinates dot */}
                        <circle cx="200" cy="200" r="6" fill="#6366f1" />
                        <circle cx="200" cy="200" r="12" fill="none" stroke="#6366f1" strokeWidth="1" className="animate-pulse" />
                        <circle cx="200" cy="200" r="2" fill="#ffffff" />
                      </svg>
                      
                      {/* Interactive Radar Blips representing Veliler */}
                      {nearbyBuddies.map((buddy) => {
                        const angle = getAngleFromId(buddy.buddyId);
                        const angleRad = (angle * Math.PI) / 180;
                        const rPercent = Math.min((buddy.distanceKm || 0) / maxDistance, 1.0);
                        // Scale so the radius stays within the 180px radius (45% of 400px viewbox)
                        const radiusPercent = rPercent * 45;
                        const leftPercent = 50 + radiusPercent * Math.cos(angleRad);
                        const topPercent = 50 + radiusPercent * Math.sin(angleRad);
                        
                        const isSelected = selectedBlip?.buddyId === buddy.buddyId;
                        
                        return (
                          <button
                            key={buddy.buddyId}
                            onClick={() => setSelectedBlip(buddy)}
                            className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer group focus:outline-none focus:ring-0 z-20"
                            style={{
                              left: `${leftPercent}%`,
                              top: `${topPercent}%`
                            }}
                          >
                            {/* Glowing rings */}
                            <span className={`absolute -inset-2.5 rounded-full border transition-all duration-300 ${
                              isSelected
                                ? 'border-pink-500 bg-pink-500/20 animate-radar-pulse'
                                : buddy.isMentorRelation
                                  ? 'border-violet-500/30 bg-violet-500/10 group-hover:scale-150 group-hover:bg-violet-500/20'
                                  : 'border-emerald-500/30 bg-emerald-500/10 group-hover:scale-150 group-hover:bg-emerald-500/20'
                            }`} />

                            {/* Core glowing dot */}
                            <span className={`relative block w-3.5 h-3.5 rounded-full border-2 border-slate-950 shadow-lg transition-all duration-300 ${
                              isSelected
                                ? 'bg-pink-500 scale-125'
                                : buddy.isMentorRelation
                                  ? 'bg-violet-500 group-hover:bg-violet-400'
                                  : 'bg-emerald-500 group-hover:bg-emerald-400'
                            }`} />

                            {/* Quick name hover tooltip */}
                            <span className="absolute left-6 top-1/2 -translate-y-1/2 bg-slate-900/95 text-white text-[9px] font-black px-2 py-0.5 rounded-md border border-slate-700 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-md z-30 tracking-wide">
                              {buddy.fullName} ({buddy.distanceKm} km)
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    
                    {/* Color indicators */}
                    <div className="flex gap-4 mt-5 text-[10px] font-bold text-slate-450 tracking-wide select-none">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 border border-slate-900" /> Buddy Adayı
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-violet-500 border border-slate-900" /> Tecrübeli Mentor
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-pink-500 border border-slate-900 animate-pulse" /> Seçili Veli
                      </span>
                    </div>

                    {/* High-tech Radar Logs Console */}
                    <div className="w-full mt-4 bg-slate-900/60 border border-slate-800 rounded-2xl p-3 font-mono text-[9px] text-emerald-400/90 space-y-1 select-none overflow-y-auto max-h-[85px] text-left leading-normal">
                      {radarLogs.map((log, index) => (
                        <div key={index} className="flex items-start gap-1.5 animate-fadeIn">
                          <span className="text-emerald-500 font-extrabold shrink-0">›</span>
                          <p className="break-words">{log}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* RIGHT: Detail card for the selected candidate */}
                  <div className="lg:col-span-6 flex flex-col justify-between">
                    {!selectedBlip ? (
                      <div className="p-8 border border-dashed border-slate-200 rounded-3xl text-center h-full min-h-[340px] flex flex-col justify-center items-center bg-slate-50/40">
                        <div className="w-16 h-16 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-650 mb-4 animate-bounce">
                          <Compass size={28} />
                        </div>
                        <h4 className="font-extrabold text-slate-800 text-base">Radar Veli Detayları</h4>
                        <p className="text-xs text-slate-500 mt-2 max-w-sm leading-relaxed">
                          Yandaki radar ekranında yer alan renkli noktalara tıklayarak size yakın olan velilerin profillerini görüntüleyebilir, 
                          direkt mesaj başlatabilir, buddy veya mentorluk teklif edebilirsiniz.
                        </p>
                      </div>
                    ) : (
                      <Card className="border border-indigo-150 p-6 flex flex-col h-full min-h-[340px] justify-between relative overflow-hidden backdrop-blur-md bg-white/95 animate-fadeIn">
                        {/* Watermark gradient */}
                        <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-indigo-500/10 to-transparent rounded-full pointer-events-none" />
                        
                        <div className="space-y-4">
                          {/* Selected parent profile and stats */}
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-center gap-3">
                              <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-md text-white font-extrabold text-xl relative shrink-0">
                                {selectedBlip.fullName?.charAt(0)}
                                <div className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white" />
                              </div>
                              <div>
                                <h3 className="font-black text-slate-800 text-base flex items-center gap-2">
                                  {selectedBlip.fullName}
                                </h3>
                                <p className="text-xs font-bold text-slate-450 mt-0.5">
                                  📍 {selectedBlip.city || 'İstanbul'}
                                </p>
                              </div>
                            </div>
                            
                            <div className="text-right">
                              <span className="px-3 py-1 bg-indigo-50 border border-indigo-150 text-[10px] font-black text-indigo-755 rounded-full uppercase tracking-wider block shadow-2xs select-none">
                                📍 {selectedBlip.distanceKm} km
                              </span>
                            </div>
                          </div>

                          {/* Quick AI Affinity Insight / Badges */}
                          <div className="p-3.5 bg-gradient-to-r from-purple-50/50 via-indigo-50/30 to-slate-50/50 rounded-2xl border border-indigo-100/30 relative overflow-hidden">
                            <div className="flex items-start gap-2.5">
                              <div className="w-7 h-7 rounded-lg bg-indigo-100/70 border border-indigo-200/50 flex items-center justify-center text-indigo-650 mt-0.5 shrink-0 select-none">
                                <Sparkles size={13} className="animate-pulse" />
                              </div>
                              <div className="space-y-0.5">
                                <p className="text-[10px] font-black text-indigo-900 uppercase tracking-wider">
                                  Konum ve Klinik Yakınlık Analizi
                                </p>
                                <p className="text-xs text-slate-600 leading-relaxed mt-1">
                                  <strong>{selectedBlip.fullName}</strong> sizinle çok yakın bir bölgede ikamet ediyor. Buluşmalar ve akran etkileşimi kurmak için en ideal adaylardan biridir.
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Matching summary metrics */}
                          <div className="grid grid-cols-2 gap-3">
                            <div className="bg-slate-50/80 p-2.5 rounded-xl border border-slate-100 text-center">
                              <p className="text-[10px] text-slate-400 font-bold uppercase">Mesafe Durumu</p>
                              <p className="text-xs font-extrabold text-slate-700 mt-1 select-none">
                                {selectedBlip.distanceKm! <= 1.0 ? 'Aynı Mahallede' :
                                 selectedBlip.distanceKm! <= 5.0 ? 'Çok Yakında' :
                                 selectedBlip.distanceKm! <= 10.0 ? 'Aynı Bölgede' : 'Biraz Uzakta'}
                              </p>
                            </div>
                            <div className="bg-slate-50/80 p-2.5 rounded-xl border border-slate-100 text-center">
                              <p className="text-[10px] text-slate-400 font-bold uppercase">Yardımlaşma Rolü</p>
                              <p className="text-xs font-extrabold text-slate-700 mt-1">
                                {selectedBlip.isMentorRelation ? 'Tecrübeli Mentor' : 'Buddy Yol Arkadaşı'}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Large Action triggers for the selected blip */}
                        <div className="flex flex-wrap sm:flex-nowrap gap-2 pt-4 border-t border-slate-100 mt-4">
                          <button
                            onClick={() => setActiveChatBuddy(selectedBlip)}
                            className="flex-1 flex items-center justify-center gap-1.5 py-3 px-2 rounded-xl text-xs font-extrabold bg-indigo-650 hover:bg-indigo-700 text-white cursor-pointer shadow-md shadow-indigo-100 transition-all select-none animate-pulse"
                          >
                            <MessageSquare size={13} /> Hızlı Sohbet
                          </button>
                          
                          <button
                            onClick={() => handleSendBuddyRequest(selectedBlip.buddyId, false)}
                            className="flex-1 flex items-center justify-center gap-1.5 py-3 px-2 rounded-xl text-xs font-extrabold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-150 transition-all cursor-pointer select-none"
                          >
                            <Handshake size={13} /> Buddy İsteği
                          </button>

                          <button
                            onClick={() => handleSendBuddyRequest(selectedBlip.buddyId, true)}
                            className="flex-1 flex items-center justify-center gap-1.5 py-3 px-2 rounded-xl text-xs font-extrabold bg-violet-50 hover:bg-violet-100 text-violet-755 border border-violet-150 transition-all cursor-pointer select-none"
                            title="Mentorluk İsteği Gönder"
                          >
                            <GraduationCap size={13} /> Mentorluk
                          </button>
                        </div>
                      </Card>
                    )}
                  </div>
                </div>
              ) : (
                /* CLASSIC LIST GRID VIEW */
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fadeIn">
                  {nearbyBuddies.map((buddy, idx) => (
                    <Card key={idx} className="hover:-translate-y-1 hover:shadow-md border border-slate-100 hover:border-indigo-150 transition-all duration-300 bg-white/90 backdrop-blur-md relative overflow-hidden group">
                      <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-indigo-500/5 to-transparent rounded-full pointer-events-none" />
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white font-extrabold text-base relative shrink-0">
                          {buddy.fullName?.charAt(0)}
                          <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white animate-pulse" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-1.5 flex-wrap">
                            <h4 className="font-extrabold text-slate-800 text-base truncate group-hover:text-indigo-950 transition-colors">{buddy.fullName}</h4>
                            <span className="text-[10px] font-black text-indigo-700 bg-indigo-50 border border-indigo-150 px-2 py-0.5 rounded-full shrink-0 select-none">
                              📍 {buddy.distanceKm} km yakında
                            </span>
                          </div>
                          <p className="text-xs text-slate-450 mt-0.5">{buddy.city || 'İstanbul'}</p>
                          
                          {/* Role tag */}
                          <div className="flex gap-1.5 mt-2.5">
                            <span className="px-2 py-0.5 rounded-md bg-slate-50 text-[9px] font-black text-slate-500 border border-slate-150 select-none uppercase tracking-wide">
                              {buddy.isMentorRelation ? '🌟 Tecrübeli Mentor' : '🤝 Buddy Adayı'}
                            </span>
                          </div>

                          <div className="flex gap-2 mt-4 pt-3 border-t border-slate-100/60">
                            <button
                              onClick={() => setActiveChatBuddy(buddy)}
                              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold bg-indigo-650 hover:bg-indigo-700 text-white cursor-pointer shadow-sm shadow-indigo-100 transition-all select-none"
                            >
                              <MessageSquare size={12} /> Hızlı Sohbet
                            </button>
                            <button
                              onClick={() => handleSendBuddyRequest(buddy.buddyId, false)}
                              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-150 transition-all cursor-pointer select-none"
                            >
                              <Handshake size={12} /> Buddy
                            </button>
                            <button
                              onClick={() => handleSendBuddyRequest(buddy.buddyId, true)}
                              className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 cursor-pointer transition-all shrink-0"
                              title="Mentorluk İsteği Gönder"
                            >
                              <GraduationCap size={13} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: SOCIAL CIRCLE & REQUESTS */}
      {children.length > 0 && activeTab === 'my-circle' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Pending Requests Section */}
          {pendingBuddies.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-black text-red-500 uppercase tracking-wider flex items-center gap-2">
                🔔 Gelen Bekleyen Eşleşme İstekleri ({pendingBuddies.length})
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {pendingBuddies.map((req, idx) => (
                  <Card key={idx} className="border-red-150 bg-red-50/10 hover:shadow-md transition-all duration-300">
                    <div className="flex items-start gap-4">
                      <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-pink-400 to-red-400 flex items-center justify-center text-white font-extrabold shrink-0">
                        {req.fullName?.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-extrabold text-slate-800 text-sm truncate">{req.fullName}</h4>
                          <span className="text-[9px] font-bold text-red-650 bg-red-50 border border-red-150 px-1.5 py-0.2 rounded-full uppercase tracking-wider">
                            {req.isMentorRelation ? 'Mentorluk İsteği' : 'Buddy İsteği'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-450 mt-1">{req.city || 'Şehir Belirtilmemiş'}</p>
                        
                        <div className="flex gap-2 mt-4">
                          <button
                            onClick={() => handleAcceptRequest(req.relationshipId!)}
                            className="flex-1 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs cursor-pointer transition-colors"
                          >
                            Kabul Et
                          </button>
                          <button
                            onClick={() => handleRejectRequest(req.relationshipId!)}
                            className="flex-1 py-1.5 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer transition-colors"
                          >
                            Reddet
                          </button>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Active Circle Section */}
          <div className="space-y-3">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-2">
              🤝 Aktif Velilerim & Mentörlerim ({myBuddies.length})
            </h3>

            {buddiesLoading ? (
              <div className="flex items-center justify-center py-12">
                <Sparkles size={20} className="animate-spin text-indigo-500" />
              </div>
            ) : myBuddies.length === 0 ? (
              <EmptyState
                icon={<UserCheck size={28} />}
                title="Sosyal Çemberiniz Henüz Boş"
                description="Diğer ailelerle 'Akıllı Uyum' veya 'Yakındaki Veliler' sekmelerinden istek göndererek bağ kurmaya başlayın."
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {myBuddies.map((buddy, idx) => (
                  <Card key={idx} className="hover:-translate-y-0.5 hover:shadow-md border border-slate-100 transition-all duration-300">
                    <div className="flex flex-col h-full justify-between">
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white font-extrabold shrink-0 relative">
                          {buddy.fullName?.charAt(0)}
                          <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h4 className="font-extrabold text-slate-800 text-sm truncate">{buddy.fullName}</h4>
                            {buddy.isMentorRelation && (
                              <span className="text-[8px] font-black text-violet-700 bg-violet-50 border border-violet-150 px-1 rounded-full uppercase">
                                MENTÖR
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-450 mt-0.5">{buddy.city || 'Şehir Belirtilmemiş'}</p>
                          {buddy.distanceKm && (
                            <p className="text-[10px] text-indigo-600 font-semibold mt-1">📍 {buddy.distanceKm} km yakında</p>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-2 mt-4 pt-3 border-t border-slate-100/60 shrink-0">
                        <button
                          onClick={() => setActiveChatBuddy(buddy)}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer transition-colors shadow-sm shadow-indigo-100 select-none"
                        >
                          <MessageSquare size={12} /> Hızlı Sohbet
                        </button>
                        <button
                          onClick={() => handleRemoveBuddy(buddy.relationshipId!)}
                          className="p-2 rounded-xl border border-red-200 text-red-500 hover:bg-red-50 cursor-pointer transition-colors shrink-0"
                          title="Eşleşmeyi Kaldır"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Buluşma İsteği Modal */}
      <Modal
        isOpen={!!meetingFamily}
        onClose={() => setMeetingFamily(null)}
        title="Buluşma İsteği Gönder"
      >
        {meetingFamily && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-indigo-50/50 rounded-xl border border-indigo-100/40">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center shrink-0">
                <span className="text-white font-extrabold">{meetingFamily.parentName?.charAt(0)}</span>
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900">{meetingFamily.parentName}</p>
                <p className="text-xs text-indigo-600 font-semibold">%{Math.round(meetingFamily.similarityScore * 100)} Uyumlu Veli</p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">
                ⚡ Pratik Buluşma Konsepti Seç (Tek Tıkla Doldur)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {MEETING_TEMPLATES.map(tmpl => (
                  <button
                    key={tmpl.id}
                    type="button"
                    onClick={() => {
                      setMeetingForm(f => ({
                        ...f,
                        type: tmpl.type,
                        location: tmpl.location,
                        message: tmpl.message
                      }));
                      toast.success(`"${tmpl.title}" şablonu uygulandı! ✨`);
                    }}
                    className="text-left p-2.5 rounded-xl border border-slate-200 hover:border-indigo-350 hover:bg-indigo-50/20 transition-all flex items-start gap-2.5 cursor-pointer group"
                  >
                    <span className="text-xl select-none shrink-0 mt-0.5">{tmpl.emoji}</span>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-800 group-hover:text-indigo-900 transition-colors leading-tight">
                        {tmpl.title}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5 truncate leading-none font-medium">
                        {tmpl.description}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Buluşma Türü</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setMeetingForm(f => ({ ...f, type: 'ONLINE' }))}
                  className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 text-xs font-bold transition-all cursor-pointer ${
                    meetingForm.type === 'ONLINE'
                      ? 'border-indigo-500 bg-indigo-50/50 text-indigo-700'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  <Video size={15} /> Online Görüşme
                </button>
                <button
                  onClick={() => setMeetingForm(f => ({ ...f, type: 'YUZEYUZE' }))}
                  className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 text-xs font-bold transition-all cursor-pointer ${
                    meetingForm.type === 'YUZEYUZE'
                      ? 'border-indigo-500 bg-indigo-50/50 text-indigo-700'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  <Handshake size={15} /> Yüz Yüze Buluşma
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  <CalendarDays size={12} className="inline mr-1" />Tarih *
                </label>
                <input
                  type="date"
                  value={meetingForm.date}
                  min={new Date().toISOString().slice(0, 10)}
                  onChange={e => setMeetingForm(f => ({ ...f, date: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Saat *</label>
                <div className="relative">
                  <select
                    value={meetingForm.time}
                    onChange={e => setMeetingForm(f => ({ ...f, time: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs font-medium appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                  >
                    {MEETING_TIMES.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>
            </div>

            {meetingForm.type === 'YUZEYUZE' && (
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  <MapPin size={12} className="inline mr-1" />Konum / Mekan Önerisi
                </label>
                <input
                  type="text"
                  value={meetingForm.location}
                  onChange={e => setMeetingForm(f => ({ ...f, location: e.target.value }))}
                  placeholder="Örn: Kadıköy Sahil Parkı, Sakin Çay Bahçesi vb."
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Kişisel Not / Davet Mesajı</label>
              <textarea
                value={meetingForm.message}
                onChange={e => setMeetingForm(f => ({ ...f, message: e.target.value }))}
                rows={3}
                placeholder="Buluşma hakkında eklemek istediğiniz bir şey var mı?"
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none leading-relaxed"
              />
            </div>

            <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-100">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Gönderilecek Davet Özeti:</p>
              <p className="text-xs text-slate-650 leading-normal font-semibold">
                📅 Buluşma İsteği · {meetingForm.type === 'ONLINE' ? '🌐 Online' : '🤝 Yüz Yüze'}{' '}
                {meetingForm.date && `· ${new Date(meetingForm.date).toLocaleDateString('tr-TR')}`}{' '}
                {meetingForm.time && `· ${meetingForm.time}`}
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setMeetingFamily(null)} className="flex-1 font-semibold rounded-xl text-xs">
                <X size={14} className="mr-1" /> İptal
              </Button>
              <Button
                onClick={handleSendMeeting}
                loading={meetingLoading}
                disabled={!meetingForm.date || !meetingForm.time}
                className="flex-1 font-bold rounded-xl text-xs shadow-md shadow-indigo-100/50"
              >
                <Send size={14} className="mr-1" /> İsteği Gönder
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Quick-Chat Sliding Drawer */}
      {activeChatBuddy && (
        <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
          {/* Backdrop overlay */}
          <div 
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity cursor-pointer" 
            onClick={() => setActiveChatBuddy(null)}
          />
          
          {/* Drawer Panel */}
          <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col justify-between z-10 animate-slideLeft border-l border-slate-100">
            
            {/* Drawer Header */}
            <div className="p-4 border-b border-slate-150 flex items-center justify-between bg-gradient-to-r from-indigo-50/50 to-purple-50/30">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center text-white font-extrabold shadow-sm relative">
                  {activeChatBuddy.fullName?.charAt(0)}
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white" />
                </div>
                <div>
                  <h4 className="font-extrabold text-slate-800 text-sm leading-tight">{activeChatBuddy.fullName}</h4>
                  <p className="text-[10px] text-slate-450 mt-0.5">Aktif Buddy · Canlı Sohbet</p>
                </div>
              </div>
              
              <button 
                onClick={() => setActiveChatBuddy(null)}
                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Drawer Message History */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/40" id="drawer-chat-scroller">
              {drawerLoading ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-450 gap-2">
                  <Sparkles size={20} className="animate-spin text-indigo-500" />
                  <p className="text-[10px] font-bold uppercase tracking-wider animate-pulse">Sohbet Yükleniyor...</p>
                </div>
              ) : drawerMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-6 text-slate-400">
                  <MessageSquare size={24} className="mb-2 text-slate-350" />
                  <p className="text-xs font-bold">Henüz mesajlaşma başlatılmamış.</p>
                  <p className="text-[10px] text-slate-400 mt-1">İlk mesajı aşağıdan yazarak ebeveyn buddy yol arkadaşınızla tanışın!</p>
                </div>
              ) : (
                drawerMessages.map((msg) => {
                  const isMe = msg.senderId === user?.id;
                  return (
                    <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed shadow-2xs ${
                        isMe
                          ? 'bg-indigo-600 text-white rounded-br-none'
                          : 'bg-white border border-slate-100 text-slate-800 rounded-bl-none'
                      }`}>
                        <p className="break-words font-medium">{msg.content}</p>
                        <p className={`text-[8px] text-right mt-1.5 font-bold ${isMe ? 'text-indigo-200' : 'text-slate-400'}`}>
                          {new Date(msg.sentAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Drawer Input Area */}
            <form 
              onSubmit={async (e) => {
                e.preventDefault();
                if (!drawerNewMessage.trim() || !drawerConversation || drawerSending) return;
                setDrawerSending(true);
                const text = drawerNewMessage.trim();
                setDrawerNewMessage('');
                try {
                  const sent = await messagingService.sendMessage(drawerConversation.id, text);
                  setDrawerMessages(prev => [...prev, sent]);
                  setTimeout(() => {
                    const scroller = document.getElementById('drawer-chat-scroller');
                    if (scroller) scroller.scrollTop = scroller.scrollHeight;
                  }, 100);
                } catch {
                  toast.error("Mesaj iletilemedi.");
                } finally {
                  setDrawerSending(false);
                }
              }}
              className="p-3 border-t border-slate-150 bg-white flex gap-2 items-center"
            >
              <input
                type="text"
                value={drawerNewMessage}
                onChange={e => setDrawerNewMessage(e.target.value)}
                placeholder="Mesajınızı buraya yazın..."
                className="flex-1 px-3 py-2.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
              />
              <button
                type="submit"
                disabled={!drawerNewMessage.trim() || drawerSending}
                className="p-2.5 bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl shadow-md disabled:opacity-50 cursor-pointer transition-all hover:scale-105 shrink-0"
              >
                <Send size={14} />
              </button>
            </form>

          </div>
        </div>
      )}
    </div>
  );
}
