import { Activity, Hand, MessageSquareText, Sparkles } from 'lucide-react';
import type { AppointmentRecord, CalendarEvent, DevelopmentNote } from '@/types';
import type {
  EditableGoal,
  FocusArea,
  FocusKey,
  GameReflection,
  GoalGroup,
  GoalItem,
  GoalStatus,
  SensoryMetric,
  SensoryProfileState,
  SmartSuggestion,
  StoryCard,
  SupportPlan,
  TherapyGame,
  TodayPlanStep,
  TreatmentPageState,
  ToolCard,
} from './types';

export const DEFAULT_SENSORY_PROFILE: SensoryProfileState = {
  sound: 76,
  touch: 54,
  visual: 68,
};

export function splitTherapies(raw?: string) {
  if (!raw) return [];
  return raw
    .split(/[\n,;]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function getDateKey(value: string | Date) {
  const date = typeof value === 'string' ? new Date(value) : value;
  return `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, '0')}-${`${date.getDate()}`.padStart(2, '0')}`;
}

export function readTreatmentPageState(source?: Record<string, unknown>): TreatmentPageState {
  const treatmentPage = source?.treatmentPage as Record<string, unknown> | undefined;
  const customGoals = Array.isArray(treatmentPage?.customGoals) ? treatmentPage?.customGoals as EditableGoal[] : [];
  const sensoryProfile = (treatmentPage?.sensoryProfile as SensoryProfileState | undefined) || DEFAULT_SENSORY_PROFILE;
  const gameFeedback = (treatmentPage?.gameFeedback as Record<string, GameReflection> | undefined) || {};
  const completedGames = Array.isArray(treatmentPage?.completedGames) ? treatmentPage?.completedGames as string[] : [];
  const gameSessions = Array.isArray(treatmentPage?.gameSessions) ? treatmentPage?.gameSessions as TreatmentPageState['gameSessions'] : [];
  const goalProgressHistory = Array.isArray(treatmentPage?.goalProgressHistory)
    ? treatmentPage?.goalProgressHistory as TreatmentPageState['goalProgressHistory']
    : [];

  const migratedSessions = gameSessions.length > 0
    ? gameSessions
    : completedGames.map((gameId) => ({
        gameId,
        status: gameFeedback[gameId] || 'assisted',
        focusKey: 'communication' as FocusKey,
        linkedGoal: 'Genel hedef',
        completedAt: new Date().toISOString(),
      }));

  return {
    customGoals,
    sensoryProfile: {
      sound: sensoryProfile.sound ?? DEFAULT_SENSORY_PROFILE.sound,
      touch: sensoryProfile.touch ?? DEFAULT_SENSORY_PROFILE.touch,
      visual: sensoryProfile.visual ?? DEFAULT_SENSORY_PROFILE.visual,
    },
    gameFeedback,
    gameSessions: migratedSessions,
    goalProgressHistory,
    templateGoalToggles: (treatmentPage?.templateGoalToggles as Record<string, boolean> | undefined) || {},
  };
}

export function percentFromItems(items: GoalItem[]) {
  if (items.length === 0) return 0;
  const doneCount = items.filter((item) => item.status === 'done').length;
  return Math.round((doneCount / items.length) * 100);
}

export function mergeGoalGroups(baseGroups: GoalGroup[], customGoals: EditableGoal[]) {
  return baseGroups.map((group) => {
    const mappedGoals: GoalItem[] = customGoals
      .filter((goal) => goal.focusKey === group.key)
      .map((goal) => ({ label: goal.title, status: goal.done ? 'done' : 'active' }));
    const items = [...group.items, ...mappedGoals];
    return {
      ...group,
      items,
      percent: percentFromItems(items),
    };
  });
}

export function sensoryValueLabel(value: number, reverse = false) {
  if (reverse) {
    if (value >= 70) return 'Normal';
    if (value >= 45) return 'Orta';
    return 'Düşük';
  }

  if (value >= 70) return 'Yüksek';
  if (value >= 45) return 'Orta';
  return 'Düşük';
}

export function buildEditableSensoryMetrics(profile: SensoryProfileState): SensoryMetric[] {
  return [
    {
      label: 'Ses hassasiyeti',
      value: sensoryValueLabel(profile.sound),
      width: `${profile.sound}%`,
      color: 'bg-pink-400',
      note: 'Geçişlerde duyusal mola oyunu ile birlikte izleniyor.',
    },
    {
      label: 'Dokunsal hassasiyet',
      value: sensoryValueLabel(profile.touch),
      width: `${profile.touch}%`,
      color: 'bg-amber-400',
      note: 'Dokunsal uyaranlar sıra alma ve basınç aktiviteleriyle destekleniyor.',
    },
    {
      label: 'Görsel uyarı toleransı',
      value: sensoryValueLabel(profile.visual, true),
      width: `${profile.visual}%`,
      color: 'bg-emerald-400',
      note: 'Görsel hikâyeler ve zaman çizelgesi ile dengede tutuluyor.',
    },
  ];
}

export function getChildInitial(name?: string) {
  return name?.trim()?.charAt(0)?.toUpperCase() || 'Ç';
}

export function normalizeText(value: string) {
  return value
    .toLocaleLowerCase('tr-TR')
    .replace(/ç/g, 'c')
    .replace(/ğ/g, 'g')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ş/g, 's')
    .replace(/ü/g, 'u');
}

export function getMoodLabel(mood?: string) {
  if (!mood) return 'Gözlem';

  const normalized = normalizeText(mood);
  if (normalized.includes('iyi') || normalized.includes('mutlu')) return 'Olumlu';
  if (normalized.includes('zor') || normalized.includes('kayg')) return 'Takip';
  return mood;
}

export function getStatusMeta(status: GoalStatus) {
  if (status === 'done') {
    return {
      dot: 'bg-emerald-400',
      text: 'text-slate-700',
      suffix: 'Tamamlandı',
    };
  }

  if (status === 'active') {
    return {
      dot: 'bg-sky-400',
      text: 'text-slate-700',
      suffix: 'Devam',
    };
  }

  return {
    dot: 'bg-amber-400',
    text: 'text-slate-600',
    suffix: 'Sırada',
  };
}

export function getGameFeedbackMeta(status?: GameReflection) {
  switch (status) {
    case 'easy':
      return {
        label: 'Kolay geldi',
        className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
      };
    case 'assisted':
      return {
        label: 'Yardımla yaptı',
        className: 'border-sky-200 bg-sky-50 text-sky-700',
      };
    case 'independent':
      return {
        label: 'Tek başına yaptı',
        className: 'border-violet-200 bg-violet-50 text-violet-700',
      };
    case 'challenging':
      return {
        label: 'Zorlandı',
        className: 'border-amber-200 bg-amber-50 text-amber-700',
      };
    default:
      return {
        label: 'Henüz sonuç seçilmedi',
        className: 'border-slate-200 bg-slate-50 text-slate-500',
      };
  }
}

function detectFocusAreas(therapies: string[], notes: DevelopmentNote[]): FocusArea[] {
  const joined = normalizeText(therapies.join(' '));
  const recentNoteText = notes
    .slice(0, 3)
    .map((note) => normalizeText(`${note.title} ${note.content || ''}`))
    .join(' ');
  const source = `${joined} ${recentNoteText}`;

  const hasCommunication = source.includes('konus') || source.includes('iletisim') || source.includes('dil') || source.includes('istek');
  const hasSensory = source.includes('duy') || source.includes('ergoter') || source.includes('hassas') || source.includes('regul');
  const hasSocial = source.includes('aba') || source.includes('davran') || source.includes('sosyal') || source.includes('goz temasi');

  const focusAreas: FocusArea[] = [];

  if (hasCommunication || therapies.length === 0) {
    focusAreas.push({
      key: 'communication',
      label: 'İletişim',
      reason: 'İstek belirtme, seçim yapma ve ifade etme desteği',
    });
  }

  if (hasSocial || therapies.length === 0) {
    focusAreas.push({
      key: 'social',
      label: 'Sosyal beceri',
      reason: 'Göz teması, sıra alma ve birlikte oyun akışı',
    });
  }

  if (hasSensory || therapies.length === 0) {
    focusAreas.push({
      key: 'sensory',
      label: 'Duyusal düzenleme',
      reason: 'Geçişler, uyaran toleransı ve sakinleşme desteği',
    });
  }

  if (focusAreas.length === 0) {
    focusAreas.push(
      {
        key: 'communication',
        label: 'İletişim',
        reason: 'Günlük ifade ve seçim yapma becerileri',
      },
      {
        key: 'social',
        label: 'Sosyal beceri',
        reason: 'Birlikte oyun ve ortak dikkat akışı',
      }
    );
  }

  return focusAreas.slice(0, 3);
}

function buildGoalGroups(focusAreas: FocusArea[]): GoalGroup[] {
  return focusAreas.map((focusArea) => {
    if (focusArea.key === 'communication') {
      const templateItems: GoalItem[] = [
        { label: 'İstek cümleleri kurma', status: 'upcoming' },
        { label: 'Selamlama kelimeleri', status: 'upcoming' },
        { label: '2 kelimeli cümle', status: 'upcoming' },
        { label: 'Soru sormayı öğrenme', status: 'upcoming' },
      ];
      return {
        key: 'communication',
        title: 'İletişim hedefleri',
        icon: <MessageSquareText size={22} aria-hidden="true" />,
        percent: percentFromItems(templateItems),
        items: templateItems,
        templateItems,
        tone: 'sky',
        summary: 'PECS, seçim kartları ve istek oyunları aynı hedefi destekler.',
      };
    }

    if (focusArea.key === 'social') {
      const templateItems: GoalItem[] = [
        { label: 'Göz teması kurma', status: 'upcoming' },
        { label: 'Paylaşma becerileri', status: 'upcoming' },
        { label: 'Sıra bekleme', status: 'upcoming' },
        { label: 'Grup oyununa katılım', status: 'upcoming' },
      ];
      return {
        key: 'social',
        title: 'Sosyal Beceriler',
        icon: <Hand size={22} aria-hidden="true" />,
        percent: percentFromItems(templateItems),
        items: templateItems,
        templateItems,
        tone: 'violet',
        summary: 'Sosyal hikâyeler ve sıra alma oyunlarıyla desteklenir.',
      };
    }

    const templateItems: GoalItem[] = [
      { label: 'Ses geçişlerinde sakin kalma', status: 'upcoming' },
      { label: 'Duyusal mola isteme', status: 'upcoming' },
      { label: 'Basınçlı aktiviteye yönelme', status: 'upcoming' },
      { label: 'Uyaran toleransını uzatma', status: 'upcoming' },
    ];
    return {
      key: 'sensory',
      title: 'Duyusal düzenleme',
      icon: <Sparkles size={22} aria-hidden="true" />,
      percent: percentFromItems(templateItems),
      items: templateItems,
      templateItems,
      tone: 'sky',
      summary: 'Duyusal mola, profil ve sakinleşme oyunlarıyla birlikte çalışır.',
    };
  });
}

function buildToolCards(focusAreas: FocusArea[]): ToolCard[] {
  return focusAreas.map((focusArea) => {
    if (focusArea.key === 'communication') {
      return {
        key: 'communication',
        title: 'PECS Kart Kütüphanesi',
        description: 'İstek belirtme ve seçim yapma oyunlarında kullanılan görsel kart seti.',
        badges: ['Yemek (12)', 'Aktivite (18)', 'Duygu (8)', 'Rutin (10)'],
        tone: 'sky',
        linkedGoal: 'İletişim hedefleri',
      };
    }

    if (focusArea.key === 'social') {
      return {
        key: 'social',
        title: 'AAC Dijital Tahta',
        description: 'Birlikte oyun başlatma, sıra alma ve ortak dikkat için görsel destek panosu.',
        badges: ['Seçim', 'İstek', 'Yanıt'],
        tone: 'violet',
        linkedGoal: 'Sosyal Beceriler',
      };
    }

    return {
      key: 'sensory',
      title: 'Duyusal Destek Kutusu',
      description: 'Geçişlerde sakinleşmeye yardım eden görsel ipuçları ve mini mola adımları.',
      badges: ['Mola', 'Basınç', 'Nefes'],
      tone: 'sky',
      linkedGoal: 'Duyusal düzenleme',
    };
  });
}

function buildStories(focusAreas: FocusArea[]): StoryCard[] {
  const stories: StoryCard[] = [];

  if (focusAreas.some((area) => area.key === 'social')) {
    stories.push({
      key: 'social',
      title: 'Okula Gidiyorum',
      meta: '8 görsel adım - Sabah rutini',
      icon: '🏫',
      linkedGoal: 'Sosyal Beceriler',
    });
  }

  if (focusAreas.some((area) => area.key === 'communication')) {
    stories.push({
      key: 'communication',
      title: 'İstediğimi Söylüyorum',
      meta: '6 görsel adım - İletişim rutini',
      icon: '💬',
      linkedGoal: 'İletişim hedefleri',
    });
  }

  stories.push({
    key: 'sensory',
    title: 'Duyusal Mola Veriyorum',
    meta: '5 görsel adım - Geçiş rutini',
    icon: '🧘',
    linkedGoal: 'Duyusal düzenleme',
  });

  return stories;
}

function buildRecommendedGames(focusAreas: FocusArea[]): TherapyGame[] {
  const gameLibrary: Record<FocusKey, TherapyGame[]> = {
    communication: [
      {
        id: 'request-cards',
        key: 'communication',
        title: 'İstek Kartları',
        skill: 'İletişim ve ifade etme',
        approach: 'Seçim yapma',
        benefit: 'Çocuğun isteme, işaret etme ve kelime kullanma becerisini destekler.',
        duration: '5 dk',
        instruction: 'İki seçenek sunun ve çocuktan bakarak, işaret ederek veya söyleyerek birini seçmesini bekleyin.',
        tip: 'Bu oyunda açık uçlu soru yerine iki net seçenek vermek iletişimi kolaylaştırır.',
        tone: 'sky',
        icon: <MessageSquareText size={20} aria-hidden="true" />,
        linkedGoal: 'İletişim hedefleri',
        linkedTool: 'PECS Kart Kütüphanesi',
      },
      {
        id: 'joint-attention-pointing',
        key: 'communication',
        title: 'Bak ve Göster',
        skill: 'Ortak dikkat',
        approach: 'Ortak dikkat',
        benefit: 'Aynı nesneye birlikte odaklanma ve dikkat paylaşma becerisini güçlendirir.',
        duration: '4 dk',
        instruction: 'Sevdiği bir nesneyi uzakta gösterin. Önce siz bakın ve işaret edin, sonra çocuğun bakmasını veya işaret etmesini bekleyin.',
        tip: 'Çocuk nesneye kısa da olsa baktığında hemen sözel olarak fark ettiğinizi belirtin.',
        tone: 'sky',
        icon: <MessageSquareText size={20} aria-hidden="true" />,
        linkedGoal: 'İletişim hedefleri',
        linkedTool: 'AAC Dijital Tahta',
      },
      {
        id: 'mirror-imitation',
        key: 'communication',
        title: 'Ayna Taklidi',
        skill: 'Taklit ve karşılıklı etkileşim',
        approach: 'Taklit',
        benefit: 'Yüz ifadesi, jest ve basit sesleri taklit etmeyi destekler.',
        duration: '5 dk',
        instruction: 'Ayna karşısında el sallama, alkış, dudak büzme gibi çok kısa hareketler yapın ve çocuğun sizi kopyalamasını bekleyin.',
        tip: 'Zor gelirse önce çocuğun yaptığı hareketi siz taklit edin, sonra sırayı yavaşça değiştirin.',
        tone: 'sky',
        icon: <MessageSquareText size={20} aria-hidden="true" />,
        linkedGoal: 'İletişim hedefleri',
        linkedTool: 'PECS Kart Kütüphanesi',
      },
    ],
    social: [
      {
        id: 'turn-taking',
        key: 'social',
        title: 'Sıra Alma Oyunu',
        skill: 'Bekleme ve ortak dikkat',
        approach: 'Sıra alma',
        benefit: 'Önce-ben-sonra-sen ritmini ve kısa bekleme süresini öğretir.',
        duration: '6 dk',
        instruction: 'Top atma veya blok koyma oyunu oynayın. Her turda önce ben sonra sen kalıbını kullanın.',
        tip: 'Sosyal hikâyeyle kısa bir hazırlık yapmak oyunu daha anlaşılır hale getirir.',
        tone: 'emerald',
        icon: <Activity size={20} aria-hidden="true" />,
        linkedGoal: 'Sosyal Beceriler',
        linkedTool: 'AAC Dijital Tahta',
      },
      {
        id: 'build-together',
        key: 'social',
        title: 'Beraber Kule Kur',
        skill: 'Birlikte oyun',
        approach: 'Çocuk liderliğinde oyun',
        benefit: 'Aynı oyunda kalma, partneri fark etme ve küçük ortak hedef kurma becerisini destekler.',
        duration: '7 dk',
        instruction: 'Blokları ortada toplayın. Bir bloğu siz, bir bloğu çocuk koysun. Kule bitince birlikte kutlama yapın.',
        tip: 'Çocuk farklı bir kule kurmak isterse oyunu tamamen bozmak yerine onun fikrine eşlik edin.',
        tone: 'emerald',
        icon: <Activity size={20} aria-hidden="true" />,
        linkedGoal: 'Sosyal Beceriler',
        linkedTool: 'AAC Dijital Tahta',
      },
      {
        id: 'emotion-faces',
        key: 'social',
        title: 'Duygu Yüzleri',
        skill: 'Duygu fark etme',
        approach: 'Sosyal ipucu',
        benefit: 'Mutlu, şaşkın, üzgün gibi temel yüz ifadelerini ayırt etmeye yardım eder.',
        duration: '4 dk',
        instruction: 'İki yüz ifadesi kartı seçin. Siz ifadeyi yapın, çocuk doğru kartı bulsun veya aynı yüzü taklit etsin.',
        tip: 'İlk turda sadece iki duygu kullanın; seçenek sayısını yavaş yavaş artırın.',
        tone: 'emerald',
        icon: <Activity size={20} aria-hidden="true" />,
        linkedGoal: 'Sosyal Beceriler',
        linkedTool: 'Sosyal Hikâye Kartları',
      },
    ],
    sensory: [
      {
        id: 'sensory-break',
        key: 'sensory',
        title: 'Duyusal Mola',
        skill: 'Düzenleme ve sakinleşme',
        approach: 'Kısa düzenleme',
        benefit: 'Geçiş öncesi bedeni sakinleştirip oyuna hazırlar.',
        duration: '4 dk',
        instruction: 'Minder itme, sarılma yastığı veya nefes hareketi ile kısa bir mola verin.',
        tip: 'Duyusal profil kartındaki yüksek uyaranlar görüldüğünde bu oyunu önceleyin.',
        tone: 'amber',
        icon: <Sparkles size={20} aria-hidden="true" />,
        linkedGoal: 'Duyusal düzenleme',
        linkedTool: 'Duyusal Destek Kutusu',
      },
      {
        id: 'heavy-work-station',
        key: 'sensory',
        title: 'Ağır İş İstasyonu',
        skill: 'Vücut farkındalığı',
        approach: 'Basınç ve taşıma',
        benefit: 'İtme, çekme ve taşıma aktiviteleriyle bedensel düzenlemeyi destekler.',
        duration: '6 dk',
        instruction: 'Yastık taşıma, minder itme veya oyuncak kutusunu kısa mesafede götürme gibi iki-üç ağır iş görevi seçin.',
        tip: 'Kısa süreli ve ritmik tekrarlar genelde uzun tek bir etkinlikten daha iyi tolere edilir.',
        tone: 'amber',
        icon: <Sparkles size={20} aria-hidden="true" />,
        linkedGoal: 'Duyusal düzenleme',
        linkedTool: 'Duyusal Destek Kutusu',
      },
      {
        id: 'sound-transition',
        key: 'sensory',
        title: 'Ses Geçiş Provası',
        skill: 'Uyaran toleransı',
        approach: 'Kademeli geçiş',
        benefit: 'Sesli ortamlara hazırlık ve geçişlerde kaygıyı azaltmaya yardımcı olur.',
        duration: '3 dk',
        instruction: 'Kısa bir zamanlayıcı açın, sessizden biraz daha sesli ortama geçmeden önce görsel geri sayım ve kulaklık seçeneği sunun.',
        tip: 'Amaç sese maruz bırakmak değil, geçişi öngörülebilir hale getirmektir.',
        tone: 'amber',
        icon: <Sparkles size={20} aria-hidden="true" />,
        linkedGoal: 'Duyusal düzenleme',
        linkedTool: 'Duyusal Destek Kutusu',
      },
    ],
  };

  return focusAreas.flatMap((focusArea) => gameLibrary[focusArea.key]);
}

function buildTodayPlan(focusAreas: FocusArea[]): TodayPlanStep[] {
  const steps: TodayPlanStep[] = [];

  if (focusAreas.some((area) => area.key === 'sensory')) {
    steps.push({
      id: 'prep-break',
      title: 'Duyusal hazırlık',
      detail: 'Oyuna geçmeden önce 4 dakikalık nefes, baskı veya minder itme molası verin.',
      duration: '4 dk',
      linkedGoal: 'Duyusal düzenleme',
      linkedTool: 'Duyusal Destek Kutusu',
    });
  }

  if (focusAreas.some((area) => area.key === 'communication')) {
    steps.push({
      id: 'request-flow',
      title: 'İstek kartlarıyla seçim',
      detail: 'İki seçenek sunup çocuğun isteme, bakma veya işaret etme cevabını bekleyin.',
      duration: '5 dk',
      linkedGoal: 'İletişim hedefleri',
      linkedTool: 'PECS Kart Kütüphanesi',
    });
  }

  if (focusAreas.some((area) => area.key === 'social')) {
    steps.push({
      id: 'turn-flow',
      title: 'Sıra alma oyunu',
      detail: 'Top, blok ya da kartla önce ben sonra sen ritmi kurun.',
      duration: '6 dk',
      linkedGoal: 'Sosyal Beceriler',
      linkedTool: 'AAC Dijital Tahta',
    });
  }

  steps.push({
    id: 'story-close',
    title: 'Görsel hikâye ile kapanış',
    detail: 'Günlük destek akışını kısa bir sosyal hikâye ile tamamlayın.',
    duration: '3 dk',
    linkedGoal: focusAreas.some((area) => area.key === 'social') ? 'Sosyal Beceriler' : 'Duyusal düzenleme',
    linkedTool: 'Sosyal Hikâye Kartları',
  });

  return steps.slice(0, 4);
}

function buildSmartSuggestions(
  focusAreas: FocusArea[],
  notes: DevelopmentNote[],
  appointments: AppointmentRecord[],
  events: CalendarEvent[],
): SmartSuggestion[] {
  const suggestions: SmartSuggestion[] = [];
  const hasSchedule = appointments.length + events.length > 0;

  if (focusAreas.some((area) => area.key === 'sensory') && hasSchedule) {
    suggestions.push({
      id: 'prep-transition',
      title: 'Geçişlerden önce duyusal mola',
      detail: 'Bugün planlı bir akış görünüyor. Etkinlik veya randevu öncesi kısa mola iyi gelebilir.',
    });
  }

  if (focusAreas.some((area) => area.key === 'communication')) {
    suggestions.push({
      id: 'communication-cue',
      title: 'İki seçenekle iletişim başlat',
      detail: 'Oyun sırasında açık soru yerine iki seçenek sunmak isteme becerisini güçlendirir.',
    });
  }

  if (focusAreas.some((area) => area.key === 'social')) {
    suggestions.push({
      id: 'social-bridge',
      title: 'Hikâye sonra oyun akışı',
      detail: 'Önce görsel hikâyeyi gösterip sonra sıra alma oyununa geçmek sosyal beklentiyi netleştirir.',
    });
  }

  if (notes[0]) {
    suggestions.push({
      id: 'latest-note',
      title: 'Son nottan çıkan odak',
      detail: `${notes[0].title} notuna göre bu hafta aynı beceriyi kısa tekrarlarla desteklemek iyi olur.`,
    });
  }

  return suggestions.slice(0, 3);
}

export function buildSupportPlan(
  therapies: string[],
  notes: DevelopmentNote[],
  appointments: AppointmentRecord[],
  events: CalendarEvent[],
): SupportPlan {
  const focusAreas = detectFocusAreas(therapies, notes);
  const activeProgramLabel = therapies[0] || 'Günlük destek planı';
  const triggerSummary = focusAreas.some((area) => area.key === 'sensory')
    ? 'Son notlarda geçişler ve ses uyaranları duyusal destek ihtiyacını güçlendiriyor.'
    : 'Son notlarda büyük bir duyusal zorlanma sinyali yok, rutin desteği ile ilerleniyor.';

  return {
    focusAreas,
    goalGroups: buildGoalGroups(focusAreas),
    toolCards: buildToolCards(focusAreas),
    sensoryMetrics: buildEditableSensoryMetrics(DEFAULT_SENSORY_PROFILE),
    stories: buildStories(focusAreas),
    games: buildRecommendedGames(focusAreas),
    todayPlan: buildTodayPlan(focusAreas),
    smartSuggestions: buildSmartSuggestions(focusAreas, notes, appointments, events),
    triggerSummary: appointments.length + events.length > 0
      ? `${triggerSummary} Takvim ve seans akışı bu hedeflerle eşleştirildi.`
      : triggerSummary,
    activeProgramLabel,
  };
}
