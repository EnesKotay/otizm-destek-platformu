import type { ElementType } from 'react';
import {
  Activity,
  AlertTriangle,
  Baby,
  BookOpen,
  CalendarCheck,
  ClipboardCheck,
  FileText,
  GraduationCap,
  HelpCircle,
  Home,
  Library,
  MessageCircle,
  Settings,
  ShieldAlert,
  TrendingUp,
  Users,
} from 'lucide-react';

export type NavRole = 'PARENT' | 'EXPERT' | 'TEACHER' | 'ADMIN';

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
  mobileLabel?: string;
  simple?: boolean;
}

export interface NavGroupConfig {
  label: string;
  defaultOpen?: boolean;
  items: NavItemConfig[];
}

export const NAV_GROUPS: Record<NavRole, NavGroupConfig[]> = {
  PARENT: [
    {
      label: 'Günlük',
      defaultOpen: true,
      items: [
        { to: '/anasayfa', icon: Home, label: 'Ana Sayfa', mobileLabel: 'Ana', description: 'Bugün ne yapacaksın?', keywords: ['dashboard', 'özet', 'başlangıç'], mobile: true, simple: true },
        { to: '/kullanici-rehberi', icon: HelpCircle, label: 'Kullanıcı Rehberi', description: 'Sıralı videolarla platformu adım adım öğrenin', keywords: ['tanıtım', 'rehber', 'başlangıç', 'öğrenme yolu', 'video'], simple: true },
        { to: '/gunluk-takip', icon: Activity, label: 'Bugünkü Kayıt', mobileLabel: 'Kayıt', description: 'İlaç, uyku ve duygu notu', keywords: ['ilaç', 'uyku', 'günlük', 'kayıt'], requiresChild: true, mobile: true, simple: true },
        { to: '/mesajlar', icon: MessageCircle, label: 'Mesajlar', description: 'Uzman ve aile yazışmaları', keywords: ['chat', 'iletişim', 'sohbet'], badgeKey: 'messages', mobile: true, simple: true },
        { to: '/randevular', icon: CalendarCheck, label: 'Doktor & Terapi', mobileLabel: 'Randevu', description: 'Randevu al ve uzmanınla konuş', keywords: ['uzman', 'seans', 'görüşme', 'doktor', 'terapist'], requiresChild: true, mobile: true, simple: true },
      ],
    },
    {
      label: 'Çocuğum',
      defaultOpen: false,
      items: [
        { to: '/cocuklarim', icon: Baby, label: 'Çocuğumun Bilgileri', mobileLabel: 'Profil', description: 'Ad, doğum tarihi ve temel bilgiler', keywords: ['profil', 'çocuk', 'bilgi'], mobile: true, simple: true },
        { to: '/gelisim-paneli', icon: TrendingUp, label: 'Nasıl İlerliyoruz?', description: 'Haftalık gelişim özeti', keywords: ['grafik', 'rapor', 'ilerleme'], requiresChild: true },
        { to: '/tedavi', icon: Activity, label: 'Hedefler ve Egzersizler', description: 'Gelişim hedefleri, ev egzersizleri ve çalışma planı', keywords: ['terapi', 'hedef', 'egzersiz', 'oyun', 'klinik'], requiresChild: true },
        { to: '/gorevler', icon: ClipboardCheck, label: 'Ödevler', description: 'Uzman tarafından verilen görevler', keywords: ['ödev', 'görev', 'uzman'], requiresChild: true },
        { to: '/notlar', icon: FileText, label: 'Notlarım', description: 'Gözlem ve gelişim notları', keywords: ['not', 'gözlem', 'kayıt'], requiresChild: true },
      ],
    },
    {
      label: 'Topluluk',
      defaultOpen: true,
      items: [
        { to: '/topluluk', icon: Users, label: 'Topluluk Merkezi', description: 'Aileler, gruplar, buluşmalar ve paylaşımlar tek yerde', keywords: ['aile', 'topluluk', 'merkez'], mobile: true, simple: true },
        { to: '/bilgi-bankasi', icon: Library, label: 'Bilgi Bankası', description: 'Makaleler, rehberler ve kaynaklar', keywords: ['makale', 'rehber', 'bilgi', 'kaynak'] },
      ],
    },
    {
      label: 'Destek & Rehber',
      defaultOpen: false,
      items: [
        { to: '/kriz-rehberi', icon: AlertTriangle, label: 'Zor Anlarda Ne Yapmalı?', description: 'Sakinleşmek için kısa adımlar', keywords: ['kriz', 'sakinleşme', 'destek'], badgeKey: 'crisis', simple: true },
        { to: '/acil-kart', icon: ShieldAlert, label: 'Acil Durum Kartı', description: 'Acil durumda paylaşılacak bilgiler', keywords: ['acil', 'kart', 'güvenlik'], requiresChild: true },
      ],
    },
  ],
  EXPERT: [
    {
      label: 'Çalışma Alanı',
      defaultOpen: true,
      items: [
        { to: '/anasayfa', icon: Home, label: 'Ana Sayfa', description: 'Bugünkü iş akışı ve özetler', keywords: ['özet', 'başlangıç', 'dashboard'], mobile: true },
        { to: '/kullanici-rehberi', icon: HelpCircle, label: 'Kullanıcı Rehberi', description: 'Sıralı videolarla platformu adım adım öğrenin', keywords: ['başlangıç', 'rehber', 'öğrenme yolu', 'video'] },
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
      label: 'Destek & Kaynaklar',
      defaultOpen: false,
      items: [
        { to: '/bilgi-bankasi', icon: Library, label: 'Bilgi Bankası', description: 'Kaynak yazılar ve rehber içerikler', keywords: ['makale', 'rehber', 'bilgi'] },
        { to: '/yardim', icon: HelpCircle, label: 'Yardım Merkezi', description: 'SSS ve destek kanalları', keywords: ['yardım', 'sss', 'destek'] },
      ],
    },
  ],
  TEACHER: [
    {
      label: 'Çalışma Alanı',
      defaultOpen: true,
      items: [
        { to: '/anasayfa', icon: Home, label: 'Ana Sayfa', mobile: true },
        { to: '/kullanici-rehberi', icon: HelpCircle, label: 'Kullanıcı Rehberi', description: 'Sıralı videolarla platformu adım adım öğrenin', keywords: ['başlangıç', 'rehber', 'öğrenme yolu', 'video'] },
        { to: '/mesajlar', icon: MessageCircle, label: 'Mesajlar', badgeKey: 'messages', mobile: true },
        { to: '/bilgi-bankasi', icon: Library, label: 'Bilgi Bankası', mobile: true },
        { to: '/gruplar', icon: Users, label: 'Gruplar', mobile: true },
        { to: '/forum', icon: BookOpen, label: 'Forum' },
        { to: '/ayarlar', icon: Settings, label: 'Ayarlar' },
        { to: '/yardim', icon: HelpCircle, label: 'Yardım Merkezi' },
      ],
    },
  ],
  ADMIN: [
    {
      label: 'Yönetim Paneli',
      defaultOpen: true,
      items: [
        { to: '/anasayfa', icon: Home, label: 'Ana Sayfa', description: 'Yönetim paneli özeti', keywords: ['özet', 'admin'], mobile: true },
        { to: '/kullanici-rehberi', icon: HelpCircle, label: 'Kullanıcı Rehberi', description: 'Sıralı videolarla platformu adım adım öğrenin', keywords: ['başlangıç', 'rehber', 'öğrenme yolu', 'video'] },
        { to: '/admin/analytics', icon: TrendingUp, label: 'Analitik', description: 'Kullanım ve sistem metrikleri', keywords: ['grafik', 'metrik', 'istatistik'], mobile: true },
        { to: '/admin/auditlog', icon: Activity, label: 'Aktivite Kaydı', description: 'Sistem işlem geçmişi', keywords: ['log', 'aktivite', 'geçmiş'] },
      ],
    },
    {
      label: 'Kullanıcı & Doğrulama',
      defaultOpen: true,
      items: [
        { to: '/admin/users', icon: Users, label: 'Kullanıcı Yönetimi', description: 'Kullanıcı hesapları ve roller', keywords: ['kullanıcı', 'rol', 'hesap'] },
        { to: '/admin/experts', icon: GraduationCap, label: 'Uzman Başvuruları', description: 'Uzman onay ve doğrulama süreci', keywords: ['başvuru', 'onay', 'uzman'], mobile: true },
      ],
    },
    {
      label: 'İçerik & Moderasyon',
      defaultOpen: true,
      items: [
        { to: '/admin/content', icon: BookOpen, label: 'İçerik Yönetimi (CMS)', description: 'Bilgi ve kaynak içeriklerini yönetme', keywords: ['cms', 'içerik', 'makale'] },
        { to: '/admin/reports', icon: FileText, label: 'Moderasyon', description: 'Şikayet ve içerik denetimi', keywords: ['şikayet', 'denetim', 'rapor'] },
        { to: '/forum', icon: BookOpen, label: 'Forum Akışı', description: 'Forum içeriklerini izleme', keywords: ['forum', 'soru', 'cevap'] },
        { to: '/gruplar', icon: Users, label: 'Gruplar', description: 'Topluluk gruplarını yönetme', keywords: ['grup', 'topluluk'] },
        { to: '/mesajlar', icon: MessageCircle, label: 'Mesajlar', description: 'Platform mesajlaşması', keywords: ['chat', 'iletişim'], badgeKey: 'messages', mobile: true },
      ],
    },
    {
      label: 'Destek & Sistem',
      defaultOpen: false,
      items: [
        { to: '/bilgi-bankasi', icon: Library, label: 'Bilgi Bankası', description: 'Yayınlanan kaynak içerikleri', keywords: ['makale', 'rehber', 'bilgi'] },
        { to: '/yardim', icon: HelpCircle, label: 'Yardım Merkezi', description: 'SSS ve destek kanalları', keywords: ['yardım', 'sss', 'destek'] },
        { to: '/admin/settings', icon: Settings, label: 'Sistem Ayarları', description: 'Genel sistem konfigürasyonu', keywords: ['ayar', 'konfigürasyon', 'sistem'] },
      ],
    },
  ],
};

export function getNavGroups(role?: string) {
  if (role === 'ADMIN' || role === 'EXPERT' || role === 'TEACHER') return NAV_GROUPS[role];
  return NAV_GROUPS.PARENT;
}

export function getMobileNavItems(role?: string, hasChild = true) {
  const items = getNavGroups(role)
    .flatMap((group) => group.items)
    .filter((item) => item.mobile && (hasChild || !item.requiresChild));
  if (!role || role === 'PARENT') {
    const community = items.find(item => item.to === '/topluluk');
    const essentials = items.filter(item => item.to !== '/topluluk').slice(0, 4);
    return community ? [...essentials, community] : essentials;
  }
  return items.slice(0, 4);
}

export function isNavItemActive(pathname: string, to: string) {
  if (to === '/') return pathname === '/';
  return pathname === to || pathname.startsWith(`${to}/`);
}
