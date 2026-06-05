import type { ElementType } from 'react';
import {
  Activity,
  AlertTriangle,
  Baby,
  BookMarked,
  BookOpen,
  Calendar,
  CalendarCheck,
  ClipboardCheck,
  ClipboardList,
  FileText,
  GraduationCap,
  Heart,
  HelpCircle,
  Home,
  Library,
  ListChecks,
  MessageCircle,
  Pill,
  Settings,
  ShieldCheck,
  ShieldAlert,
  Smile,
  Sparkles,
  TrendingUp,
  Users,
  BookCheck,
  Brain,
  Apple,
  Star,
  Map,
  School,
  Scale,
} from 'lucide-react';

export type NavRole = 'PARENT' | 'EXPERT' | 'ADMIN';

export interface NavItemConfig {
  to: string;
  icon: ElementType;
  label: string;
  description?: string;
  keywords?: string[];
  badgeKey?: 'messages' | 'appointments' | 'crisis';
  requiresChild?: boolean;
  requiresVerifiedExpert?: boolean;
  mobile?: boolean;
}

export interface NavGroupConfig {
  label: string;
  defaultOpen?: boolean;
  items: NavItemConfig[];
}

export const NAV_GROUPS: Record<NavRole, NavGroupConfig[]> = {
  PARENT: [
    {
      label: 'Temel Kullanım',
      defaultOpen: true,
      items: [
        { to: '/', icon: Home, label: 'Ana Sayfa', description: 'Güncel özetler ve hızlı başlangıç', keywords: ['dashboard', 'özet', 'başlangıç'], mobile: true },
        { to: '/cocuklarim', icon: Baby, label: 'Çocuklarım', description: 'Çocuk profilleri ve temel bilgiler', keywords: ['profil', 'çocuk', 'bilgi'], mobile: true },
        { to: '/takvim', icon: Calendar, label: 'Takvim', description: 'Seans, görev ve günlük plan', keywords: ['plan', 'etkinlik', 'hatırlatma'], requiresChild: true },
        { to: '/randevular', icon: CalendarCheck, label: 'Randevular', description: 'Uzman görüşmeleri ve uygun saatler', keywords: ['uzman', 'seans', 'görüşme', 'doktor', 'terapist', 'müsaitlik'], requiresChild: true, mobile: true },
        { to: '/mesajlar', icon: MessageCircle, label: 'Mesajlar', description: 'Uzman ve ailelerle yazışmalar', keywords: ['chat', 'iletişim', 'sohbet'], badgeKey: 'messages', mobile: true },
      ],
    },
    {
      label: 'Gelişim Takibi',
      defaultOpen: true,
      items: [
        { to: '/gelisim-paneli', icon: TrendingUp, label: 'Gelişim Paneli', description: 'İlerleme grafikleri ve genel durum', keywords: ['grafik', 'rapor', 'ilerleme'], requiresChild: true },
        { to: '/tedavi', icon: Activity, label: 'Tedavi & Gelişim', description: 'Tedavi hedefleri ve gelişim kayıtları', keywords: ['terapi', 'hedef', 'klinik'], requiresChild: true },
        { to: '/paylasimli-ilerleme', icon: ShieldCheck, label: 'Paylaşımlı İlerleme', description: 'Uzmanla güvenli ilerleme paylaşımı', keywords: ['paylaşım', 'uzman', 'rapor'], requiresChild: true },
        { to: '/tarama', icon: ClipboardList, label: 'Tarama & Aktiviteler', description: 'Tarama sonuçları ve önerilen aktiviteler', keywords: ['test', 'aktivite', 'değerlendirme'], requiresChild: true },
        { to: '/duyusal-profil', icon: Brain, label: 'Duyusal Profil', description: 'Duyusal hassasiyet ve tercih takibi', keywords: ['duyu', 'hassasiyet', 'profil'], requiresChild: true },
        { to: '/davranis-gunlugu', icon: BookCheck, label: 'ABC Davranış Günlüğü', description: 'Davranış öncesi, anı ve sonrası notları', keywords: ['abc', 'davranış', 'günlük'], requiresChild: true },
        { to: '/notlar', icon: FileText, label: 'Gelişim Notları', description: 'Gözlem ve gelişim notları', keywords: ['not', 'gözlem', 'kayıt'], requiresChild: true },
      ],
    },
    {
      label: 'Günlük Rutinler',
      defaultOpen: false,
      items: [
        { to: '/gunluk-takip', icon: Pill, label: 'Günlük Takip', description: 'İlaç, uyku ve günlük rutin kayıtları', keywords: ['ilaç', 'uyku', 'günlük'], requiresChild: true },
        { to: '/gorevler', icon: ClipboardCheck, label: 'Ev Ödevleri', description: 'Uzman tarafından verilen görevler', keywords: ['ödev', 'görev', 'uzman'], requiresChild: true },
        { to: '/rutinler', icon: ListChecks, label: 'Rutin Yönetimi', description: 'Görsel program ve rutin adımları', keywords: ['rutin', 'program', 'adım'], requiresChild: true },
        { to: '/beslenme', icon: Apple, label: 'Beslenme Takibi', description: 'Öğün, tercih ve beslenme notları', keywords: ['yemek', 'öğün', 'beslenme'], requiresChild: true },
        { to: '/okul-defteri', icon: School, label: 'Okul İletişim Defteri', description: 'Okul ve aile arası günlük notlar', keywords: ['okul', 'öğretmen', 'defter'], requiresChild: true },
        { to: '/hedef-token', icon: Star, label: 'Hedef & Token', description: 'Hedefler, ödüller ve token takibi', keywords: ['ödül', 'token', 'hedef'], requiresChild: true },
      ],
    },
    {
      label: 'Topluluk',
      defaultOpen: false,
      items: [
        { to: '/forum', icon: BookOpen, label: 'Forum', description: 'Sorular, yanıtlar ve deneyim paylaşımı', keywords: ['soru', 'cevap', 'paylaşım'] },
        { to: '/gruplar', icon: Users, label: 'Gruplar', description: 'Benzer konulardaki aile toplulukları', keywords: ['topluluk', 'aile', 'grup'] },
        { to: '/dertlesme-duvari', icon: Heart, label: 'Dertleşme Duvarı', description: 'Duygu ve deneyim paylaşım alanı', keywords: ['destek', 'duygu', 'paylaşım'] },
        { to: '/benzer-aileler', icon: Sparkles, label: 'Benzer Aileler', description: 'Ortak ihtiyaçlara sahip aileleri bulma', keywords: ['eşleşme', 'aile', 'benzer'] },
        { to: '/ebeveyn-refahi', icon: Smile, label: 'Ebeveyn Refahı', description: 'Ebeveyn iyi oluş ve stres takibi', keywords: ['stres', 'refah', 'iyi oluş'] },
      ],
    },
    {
      label: 'Uzman & Rehber',
      defaultOpen: false,
      items: [
        { to: '/bilgi-bankasi', icon: Library, label: 'Bilgi Bankası', description: 'Güvenilir yazılar ve rehber içerikler', keywords: ['makale', 'rehber', 'bilgi'] },
        { to: '/uzmanlar', icon: GraduationCap, label: 'Uzmanlar', description: 'Uzman bulma ve profil inceleme', keywords: ['doktor', 'terapist', 'randevu'] },
        { to: '/uzman-harita', icon: Map, label: 'Uzman & Kurum Haritası', description: 'Yakındaki uzman ve kurumları görme', keywords: ['harita', 'kurum', 'yakın'] },
        { to: '/haklar-rehberi', icon: Scale, label: 'Haklar & Kurumlar Rehberi', description: 'Haklar, kurumlar ve başvuru yolları', keywords: ['hak', 'kurum', 'başvuru'] },
        { to: '/sosyal-hikayeler', icon: BookMarked, label: 'Sosyal Hikayeler', description: 'Günlük durumlar için hikaye kartları', keywords: ['hikaye', 'kart', 'hazırlık'] },
        { to: '/acil-kart', icon: ShieldAlert, label: 'Acil Durum Kartı', description: 'Acil durumda paylaşılacak çocuk bilgileri', keywords: ['acil', 'kart', 'güvenlik'], requiresChild: true },
        { to: '/kriz-rehberi', icon: AlertTriangle, label: 'Kriz Rehberi', description: 'Zor anlarda hızlı destek adımları', keywords: ['kriz', 'sakinleşme', 'destek'], badgeKey: 'crisis' },
        { to: '/yardim', icon: HelpCircle, label: 'Yardım Merkezi', description: 'SSS, başlangıç rehberi ve destek', keywords: ['yardım', 'sss', 'destek', 'rehber'] },
      ],
    },
  ],
  EXPERT: [
    {
      label: 'Danışan & Takvim',
      defaultOpen: true,
      items: [
        { to: '/', icon: Home, label: 'Ana Sayfa', description: 'Bugünkü iş akışı ve özetler', keywords: ['özet', 'başlangıç', 'dashboard'], mobile: true },
        { to: '/danisanlarim', icon: Users, label: 'Danışanlarım', description: 'Danışan profilleri, görevler ve notlar', keywords: ['hasta', 'çocuk', 'görev'], mobile: true },
        { to: '/randevular', icon: CalendarCheck, label: 'Randevularım', description: 'Talepler, müsaitlik ve seans takvimi', keywords: ['seans', 'müsaitlik', 'takvim'], mobile: true },
        { to: '/bep-raporu', icon: FileText, label: 'BEP Raporu Yaz', description: 'BEP raporu hazırlama alanı', keywords: ['rapor', 'bep', 'belge'], requiresVerifiedExpert: true },
      ],
    },
    {
      label: 'İletişim & Topluluk',
      defaultOpen: true,
      items: [
        { to: '/mesajlar', icon: MessageCircle, label: 'Gelen Mesajlar', description: 'Ailelerle yazışmalar', keywords: ['chat', 'iletişim', 'sohbet'], badgeKey: 'messages', mobile: true },
        { to: '/forum', icon: BookOpen, label: 'Forum (Soru-Cevap)', description: 'Topluluk sorularına uzman yanıtları', keywords: ['soru', 'cevap', 'forum'] },
        { to: '/gruplar', icon: Users, label: 'Uzman Grupları', description: 'Uzman toplulukları ve tartışmalar', keywords: ['grup', 'topluluk', 'uzman'] },
      ],
    },
    {
      label: 'Kaynaklar',
      defaultOpen: false,
      items: [
        { to: '/bilgi-bankasi', icon: Library, label: 'Bilgi Bankası', description: 'Kaynak yazılar ve rehber içerikler', keywords: ['makale', 'rehber', 'bilgi'] },
        { to: '/yardim', icon: HelpCircle, label: 'Yardım Merkezi', description: 'SSS, başlangıç rehberi ve destek', keywords: ['yardım', 'sss', 'destek'] },
      ],
    },
  ],
  ADMIN: [
    {
      label: 'Yönetim',
      defaultOpen: true,
      items: [
        { to: '/', icon: Home, label: 'Karşılama', description: 'Yönetim paneli özeti', keywords: ['özet', 'admin'], mobile: true },
        { to: '/admin/analytics', icon: TrendingUp, label: 'Analitik', description: 'Kullanım ve sistem metrikleri', keywords: ['grafik', 'metrik', 'istatistik'], mobile: true },
        { to: '/admin/experts', icon: GraduationCap, label: 'Uzman Başvuruları', description: 'Uzman onay ve doğrulama süreci', keywords: ['başvuru', 'onay', 'uzman'], mobile: true },
        { to: '/admin/users', icon: Users, label: 'Kullanıcı Yönetimi', description: 'Kullanıcı hesapları ve roller', keywords: ['kullanıcı', 'rol', 'hesap'] },
        { to: '/admin/content', icon: BookOpen, label: 'İçerik Yönetimi (CMS)', description: 'Bilgi ve kaynak içeriklerini yönetme', keywords: ['cms', 'içerik', 'makale'] },
        { to: '/admin/reports', icon: FileText, label: 'Moderasyon', description: 'Şikayet ve içerik denetimi', keywords: ['şikayet', 'denetim', 'rapor'] },
        { to: '/admin/auditlog', icon: Activity, label: 'Aktivite Kaydı', description: 'Sistem işlem geçmişi', keywords: ['log', 'aktivite', 'geçmiş'] },
        { to: '/admin/settings', icon: Settings, label: 'Ayarlar', description: 'Sistem ayarları', keywords: ['ayar', 'konfigürasyon'] },
      ],
    },
    {
      label: 'Topluluk',
      defaultOpen: true,
      items: [
        { to: '/forum', icon: BookOpen, label: 'Forum Akışı', description: 'Forum içeriklerini izleme', keywords: ['forum', 'soru', 'cevap'] },
        { to: '/gruplar', icon: Users, label: 'Gruplar', description: 'Topluluk gruplarını yönetme', keywords: ['grup', 'topluluk'] },
        { to: '/mesajlar', icon: MessageCircle, label: 'Mesajlar', description: 'Platform mesajlaşması', keywords: ['chat', 'iletişim'], badgeKey: 'messages', mobile: true },
      ],
    },
    {
      label: 'İçerik & Sistem',
      defaultOpen: false,
      items: [
        { to: '/bilgi-bankasi', icon: Library, label: 'Bilgi Bankası', description: 'Yayınlanan kaynak içerikleri', keywords: ['makale', 'rehber', 'bilgi'] },
        { to: '/admin/settings', icon: Settings, label: 'Sistem Ayarları', description: 'Genel sistem konfigürasyonu', keywords: ['ayar', 'konfigürasyon', 'sistem'] },
        { to: '/yardim', icon: HelpCircle, label: 'Yardım Merkezi', description: 'SSS ve kullanıcı destek sayfası', keywords: ['yardım', 'sss', 'destek'] },
      ],
    },
  ],
};

export function getNavGroups(role?: string) {
  if (role === 'ADMIN' || role === 'EXPERT') return NAV_GROUPS[role];
  return NAV_GROUPS.PARENT;
}

export function getMobileNavItems(role?: string) {
  return getNavGroups(role).flatMap((group) => group.items).filter((item) => item.mobile).slice(0, 4);
}

export function isNavItemActive(pathname: string, to: string) {
  if (to === '/') return pathname === '/';
  return pathname === to || pathname.startsWith(`${to}/`);
}
