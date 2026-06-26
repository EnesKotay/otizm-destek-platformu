import { useEffect, useMemo, useState, type ElementType } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Baby,
  BarChart2,
  BookOpen,
  Calendar,
  CalendarCheck,
  ClipboardCheck,
  ClipboardList,
  FileText,
  Flame,
  GraduationCap,
  Heart,
  HelpCircle,
  LayoutDashboard,
  ListChecks,
  MapPin,
  MessageCircle,
  NotebookTabs,
  Search,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Smile,
  Star,
  TrendingUp,
  Users,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import type { UserRole } from '@/config/roleAccess';
import { cn } from '@/utils/cn';

type GuidePage = {
  icon: ElementType;
  title: string;
  to: string;
  purpose: string;
  useWhen: string;
  badge?: string;
  keywords: string[];
};

type GuideGroup = {
  title: string;
  description: string;
  pages: GuidePage[];
};

const VISITED_KEY = 'guide-visited-routes';

const PARENT_GUIDE: GuideGroup[] = [
  {
    title: 'Günlük',
    description: 'Her gün kullanacağınız ana sayfa, takip ve hızlı destek sayfaları.',
    pages: [
      {
        icon: LayoutDashboard,
        title: 'Ana Sayfa',
        to: '/anasayfa',
        purpose: 'Bugün yapılacakları, hatırlatmaları ve kısa günlük planı tek yerde gösterir.',
        useWhen: 'Siteye her girişte “bugün ne yapacağım?” diye bakmak istediğinde.',
        badge: 'Her gün',
        keywords: ['ana sayfa', 'başlangıç', 'görev', 'bugün', 'dashboard'],
      },
      {
        icon: ClipboardList,
        title: 'Bugünkü Kayıt',
        to: '/gunluk-takip',
        purpose: 'Ruh hali, uyku, ilaç ve kısa günlük gözlemleri kaydetmek için kullanılır.',
        useWhen: 'Günün sonunda veya önemli bir değişiklik olduğunda kısa kayıt girmek istediğinde.',
        badge: 'Kısa kayıt',
        keywords: ['günlük', 'ruh hali', 'uyku', 'ilaç', 'kayıt', 'bugünkü kayıt'],
      },
      {
        icon: MessageCircle,
        title: 'Mesajlar',
        to: '/mesajlar',
        purpose: 'Uzmanlar ve platformdaki kişilerle güvenli yazışma alanıdır.',
        useWhen: 'Randevu, soru veya takip için mesajlaşmak istediğinde.',
        keywords: ['mesaj', 'sohbet', 'iletişim', 'uzman', 'chat'],
      },
      {
        icon: CalendarCheck,
        title: 'Doktor & Terapi',
        to: '/randevular',
        purpose: 'Randevu talepleri, seans zamanı ve görüşme akışını yönetir.',
        useWhen: 'Uzmanla görüşme planlamak veya yaklaşan randevuları görmek istediğinde.',
        keywords: ['randevu', 'takvim', 'seans', 'görüşme', 'uzman', 'doktor', 'terapi'],
      },
      {
        icon: AlertTriangle,
        title: 'Zor Anlarda Ne Yapmalı?',
        to: '/kriz-rehberi',
        purpose: 'Zorlayıcı anlarda sakinleşme ve müdahale adımlarını hızlı gösterir.',
        useWhen: 'Kriz, yoğun stres veya hızlı yönlendirme gereken bir durum olduğunda.',
        badge: 'Hızlı destek',
        keywords: ['kriz', 'zor an', 'sakinleşme', 'acil', 'destek', 'zor anlarda ne yapmalı'],
      },
      {
        icon: HelpCircle,
        title: 'Kullanıcı Rehberi',
        to: '/kullanici-rehberi',
        purpose: 'Platformdaki tüm sayfaları, özellik gruplarını ve ne zaman kullanılacaklarını özetleyen rehberdir.',
        useWhen: 'Platformu nasıl kullanacağınızı öğrenmek ve özelliklerin amacını anlamak istediğinizde.',
        badge: 'Rehber',
        keywords: ['rehber', 'başlangıç', 'yardım', 'kullanıcı rehberi'],
      },
      {
        icon: HelpCircle,
        title: 'Yardım Merkezi',
        to: '/yardim',
        purpose: 'Sıkça sorulan sorulara, platform kullanım kılavuzlarına ve teknik destek bilgilerine ulaşmanızı sağlar.',
        useWhen: 'Sitede bir özelliğin nasıl çalıştığını bulamadığınızda veya sistemle ilgili yardıma ihtiyaç duyduğunuzda.',
        keywords: ['yardım', 'sss', 'destek', 'sorun', 'kılavuz', 'yardım merkezi'],
      },
      {
        icon: Settings,
        title: 'Ayarlar',
        to: '/ayarlar',
        purpose: 'Profilinizi, çocuk erişim izinlerini, şifrenizi ve bildirim tercihlerinizi düzenler.',
        useWhen: 'Kişisel bilgilerinizi değiştirmek veya uzmana veri paylaşım izinlerini yönetmek istediğinizde.',
        keywords: ['ayarlar', 'profil', 'şifre', 'gizlilik', 'izinler'],
      },
    ],
  },
  {
    title: 'Çocuğum',
    description: 'Çocuğunuzun gelişimi, profil bilgileri, egzersizleri ve özel durum kayıtları.',
    pages: [
      {
        icon: Baby,
        title: 'Çocuğumun Bilgileri',
        to: '/cocuklarim',
        purpose: 'Çocuğun temel bilgilerini, tanı notlarını, terapi ve ihtiyaç bilgilerini tutar.',
        useWhen: 'İlk kurulumda veya çocukla ilgili bilgileri güncellemek istediğinde.',
        badge: 'İlk adım',
        keywords: ['çocuk', 'profil', 'tanı', 'terapi', 'bilgi', 'çocuğumun bilgileri'],
      },
      {
        icon: TrendingUp,
        title: 'Nasıl İlerliyoruz?',
        to: '/gelisim-paneli',
        purpose: 'Günlük kayıtları grafiklere ve haftalık eğilimlere dönüştürür.',
        useWhen: 'Tek tek kayıtlardan daha büyük resmi görmek istediğinde.',
        keywords: ['ilerleme', 'grafik', 'analiz', 'trend', 'gelişim', 'nasıl ilerliyoruz'],
      },
      {
        icon: Activity,
        title: 'Hedefler ve Egzersizler',
        to: '/tedavi',
        purpose: 'Küçük hedefler, ev çalışmaları ve günlük destek akışını toplar.',
        useWhen: 'Bugün evde uygulanabilecek kısa etkinlik veya hedef aradığında.',
        keywords: ['tedavi', 'plan', 'hedef', 'aktivite', 'ev çalışması', 'hedefler ve egzersizler'],
      },
      {
        icon: ClipboardCheck,
        title: 'Ödevler',
        to: '/gorevler',
        purpose: 'Uzman tarafından verilen görevleri ve tamamlanma durumunu gösterir.',
        useWhen: 'Seans sonrası verilen çalışmaları takip etmek istediğinde.',
        keywords: ['görev', 'ödev', 'uzman', 'tamamlandı', 'takip', 'ödevler'],
      },
      {
        icon: NotebookTabs,
        title: 'Notlarım',
        to: '/notlar',
        purpose: 'Davranış, gelişim, görüşme veya dikkat çeken olayları serbest not olarak saklar.',
        useWhen: 'Uzmanla paylaşmak veya sonra hatırlamak istediğin kısa gözlemler olduğunda.',
        keywords: ['not', 'gözlem', 'gelişim', 'davranış', 'hatırlatma', 'notlarım'],
      },
      {
        icon: ShieldAlert,
        title: 'Acil Durum Kartı',
        to: '/acil-kart',
        purpose: 'Acil durumda paylaşılacak temel çocuk bilgilerini hazır tutar.',
        useWhen: 'Dışarıda, okulda veya acil durumda hızlı bilgi paylaşımı gerekebileceğinde.',
        keywords: ['acil', 'kart', 'güvenlik', 'bilgi', 'qr', 'acil durum kartı'],
      },
      {
        icon: BookOpen,
        title: 'Davranış Notu',
        to: '/davranis-gunlugu',
        purpose: 'Davranışın öncesi, davranış ve sonrasını daha düzenli kaydetmeye yarar.',
        useWhen: 'Tekrarlayan bir davranışı anlamak ve örüntü görmek istediğinde.',
        keywords: ['davranış', 'abc', 'öncesi', 'sonrası', 'örüntü', 'davranış notu'],
      },
      {
        icon: ShieldCheck,
        title: 'Uzmanla Paylaş',
        to: '/paylasimli-ilerleme',
        purpose: 'Hangi gelişim bilgisinin uzmanla paylaşılacağını kontrol etmeni sağlar.',
        useWhen: 'Uzmanın kayıtları görmesini istiyor ama kontrol sende kalsın istiyorsan.',
        keywords: ['paylaşım', 'uzman', 'izin', 'gizlilik', 'ilerleme', 'uzmanla paylaş'],
      },
      {
        icon: Calendar,
        title: 'Takvim',
        to: '/takvim',
        purpose: 'Randevu, okul, etkinlik ve hatırlatmaları tarihli şekilde tutar.',
        useWhen: 'Yaklaşan planları unutmak istemediğinde.',
        keywords: ['takvim', 'etkinlik', 'hatırlatma', 'plan', 'randevu'],
      },
      {
        icon: ListChecks,
        title: 'Rutinler',
        to: '/rutinler',
        purpose: 'Günlük rutinleri adım adım takip etmeye yardımcı olur.',
        useWhen: 'Sabah, okul, uyku veya geçiş rutinini görselleştirmek istediğinde.',
        keywords: ['rutin', 'program', 'adım', 'görsel', 'geçiş', 'rutinler'],
      },
    ],
  },
  {
    title: 'Topluluk',
    description: 'Deneyim paylaşımı, forum, yerel buluşmalar ve diğer ailelerle iletişim.',
    pages: [
      {
        icon: BookOpen,
        title: 'Forum',
        to: '/forum',
        purpose: 'Ebeveynlerin ve uzmanların soru sorup deneyimlerini paylaştığı ortak tartışma alanıdır.',
        useWhen: 'Kafanıza takılan bir soruyu topluluğa danışmak veya diğer soruları incelemek istediğinizde.',
        keywords: ['forum', 'soru', 'cevap', 'topluluk', 'deneyim', 'tartışma'],
      },
      {
        icon: Heart,
        title: 'Dertleşme Duvarı',
        to: '/dertlesme-duvari',
        purpose: 'Duygu ve deneyim paylaşımı için daha serbest bir destek alanıdır.',
        useWhen: 'Soru sormaktan çok içini dökmek veya diğer ailelerden destek görmek istediğinde.',
        keywords: ['dertleşme', 'duygu', 'paylaşım', 'destek', 'aile', 'dertleşme duvarı'],
      },
      {
        icon: MapPin,
        title: 'Yerel Buluşmalar',
        to: '/bulusmalar',
        purpose: 'Aynı şehirde yaşayan diğer ailelerle gerçek hayatta tanışıp bir araya gelmenizi sağlar.',
        useWhen: 'Çevrenizdeki diğer ailelerle yüz yüze etkinlikler veya yürüyüşler planlamak istediğinizde.',
        keywords: ['buluşma', 'etkinlik', 'şehir', 'tanışma', 'topluluk', 'yerel', 'yerel buluşmalar'],
      },
      {
        icon: Flame,
        title: 'Haftanın Sorusu',
        to: '/haftalik-soru',
        purpose: 'Her hafta belirlenen ortak bir konu hakkında diğer tüm ailelerin yanıtlarını listeler.',
        useWhen: 'Diğer ailelerin belirli bir konuda ne düşündüğünü görmek veya kendi deneyiminizi yazmak için.',
        keywords: ['haftanın sorusu', 'topluluk', 'deneyim', 'paylaşım', 'anket'],
      },
      {
        icon: Users,
        title: 'Benzer Aileler',
        to: '/benzer-aileler',
        purpose: 'Çocuğunun yaşı, tanı özellikleri veya yaşadığı yer açısından benzer süreçleri paylaşan ailelerle tanıştırır.',
        useWhen: 'Sizinle en çok ortak noktası olan akran aileleri bulup doğrudan iletişime geçmek istediğinizde.',
        keywords: ['benzer aileler', 'topluluk', 'aile', 'tanışma', 'akran'],
      },
      {
        icon: BookOpen,
        title: 'Bilgi Bankası',
        to: '/bilgi-bankasi',
        purpose: 'Güvenilir yazılar, rehberler ve kaynak içerikleri toplar.',
        useWhen: 'Bir konuyu sakin sakin okumak ve öğrenmek istediğinde.',
        keywords: ['bilgi', 'makale', 'rehber', 'kaynak', 'öğrenme', 'bilgi bankası'],
      },
      {
        icon: Smile,
        title: 'Ebeveyn Refahı',
        to: '/ebeveyn-refahi',
        purpose: 'Ebeveynin iyi oluşu, stres ve öz bakım takibi için ayrılmıştır.',
        useWhen: 'Sadece çocuğun değil kendi yükünü de izlemek istediğinde.',
        keywords: ['ebeveyn', 'refah', 'stres', 'iyi oluş', 'öz bakım', 'ebeveyn refahı'],
      },
    ],
  },
];

const EXPERT_GUIDE: GuideGroup[] = [
  {
    title: 'Danışan & Takvim',
    description: 'Randevu, danışan takibi, BEP raporlama ve klinik karar destek.',
    pages: [
      {
        icon: HelpCircle,
        title: 'Kullanıcı Rehberi',
        to: '/kullanici-rehberi',
        purpose: 'Platform başlangıç akışını ve uzman araçlarının nasıl kullanılacağını özetler.',
        useWhen: 'Platformu tanımak veya özelliklerin amacını öğrenmek istediğinizde.',
        badge: 'Rehber',
        keywords: ['rehber', 'kullanıcı rehberi', 'başlangıç', 'yardım'],
      },
      {
        icon: LayoutDashboard,
        title: 'Ana Sayfa',
        to: '/anasayfa',
        purpose: 'Bugünkü randevuları, bekleyen onayları ve mesajları özetler.',
        useWhen: 'Güne başlarken çalışma akışını görmek istediğinde.',
        badge: 'Her gün',
        keywords: ['ana sayfa', 'özet', 'randevu', 'mesaj', 'dashboard'],
      },
      {
        icon: Users,
        title: 'Danışanlarım',
        to: '/danisanlarim',
        purpose: 'Danışan profilleri, görevleri, notları ve seans geçmişini toplar.',
        useWhen: 'Bir danışanın durumuna veya görevlerine bakmak istediğinde.',
        keywords: ['danışan', 'hasta', 'çocuk', 'görev', 'not'],
      },
      {
        icon: CalendarCheck,
        title: 'Randevularım',
        to: '/randevular',
        purpose: 'Çalışma saatlerini, randevu taleplerini ve programı yönetir.',
        useWhen: 'Müsaitlik ayarlamak veya randevu onaylamak istediğinde.',
        keywords: ['randevu', 'müsaitlik', 'takvim', 'onay', 'program', 'randevularım'],
      },
      {
        icon: FileText,
        title: 'BEP Raporu Yaz',
        to: '/bep-raporu',
        purpose: 'BEP ve gelişim raporlarını yapılandırılmış şekilde hazırlamaya yarar.',
        useWhen: 'Danışan için yapılandırılmış rapor üretmek istediğinde.',
        badge: 'Belge',
        keywords: ['rapor', 'bep', 'gelişim raporu', 'çıktı', 'belge', 'bep raporu yaz'],
      },
      {
        icon: ClipboardList,
        title: 'Klinik Takip',
        to: '/danisanlarim',
        purpose: 'Danışanın son görüşme notları, görevleri ve seans geçmişini klinik bağlamda toplar.',
        useWhen: 'Muayene öncesi hastanın son durumunu görmek veya görüşme sonrası kısa not düşmek istediğinde.',
        keywords: ['klinik takip', 'muayene', 'seans', 'hasta özeti', 'not'],
      },
      {
        icon: ShieldAlert,
        title: 'Risk ve Öncelik Uyarıları',
        to: '/danisanlarim',
        purpose: 'Acil dikkat isteyen davranış, gerileme, yoğun kriz veya aile mesajlarını öne almanı sağlar.',
        useWhen: 'Hangi danışana önce bakmalıyım sorusunu hızlı yanıtlamak istediğinde.',
        keywords: ['risk', 'uyarı', 'öncelik', 'kriz', 'gerileme', 'yan etki'],
      },
      {
        icon: Activity,
        title: 'Terapi ve Ev Planı',
        to: '/gorevler',
        purpose: 'Seans hedeflerini, ev çalışmalarını ve tamamlanma durumunu izler.',
        useWhen: 'Tedavi hedefi vermek, takip etmek veya aileye uygulanabilir görev bırakmak istediğinde.',
        keywords: ['terapi', 'tedavi', 'ev planı', 'hedef', 'görev'],
      },
    ],
  },
  {
    title: 'İletişim & Topluluk',
    description: 'Ailelerle yazışmalar, mesleki gruplar ve forum paylaşımları.',
    pages: [
      {
        icon: MessageCircle,
        title: 'Mesajlar',
        to: '/mesajlar',
        purpose: 'Danışan aileleriyle güvenli yazışma alanıdır.',
        useWhen: 'Ailelerden gelen soruları ve takip mesajlarını yanıtlamak istediğinde.',
        keywords: ['mesaj', 'aile', 'iletişim', 'sohbet', 'danışan'],
      },
      {
        icon: BookOpen,
        title: 'Forum',
        to: '/forum',
        purpose: 'Topluluk sorularını ve uzman yanıtlarını bir araya getirir.',
        useWhen: 'Genel sorulara katkı vermek veya topluluk nabzını görmek istediğinde.',
        keywords: ['forum', 'soru', 'cevap', 'topluluk', 'uzman'],
      },
      {
        icon: Users,
        title: 'Uzman Grupları',
        to: '/gruplar',
        purpose: 'Diğer uzmanlarla vaka tartışmaları yapabileceğiniz kapalı gruplardır.',
        useWhen: 'Mesleki paylaşımlar yapmak veya diğer uzmanların görüşlerini almak istediğinizde.',
        keywords: ['gruplar', 'uzman', 'meslektaş', 'vaka', 'tartışma'],
      },
    ],
  },
  {
    title: 'Kaynaklar',
    description: 'Bilgi bankası, yardım merkezi, ayarlar ve mahremiyet yönetimi.',
    pages: [
      {
        icon: BookOpen,
        title: 'Bilgi Bankası',
        to: '/bilgi-bankasi',
        purpose: 'Ailelere yönlendirebileceğin güvenilir içerikleri gösterir.',
        useWhen: 'Bir konuyu destekleyen kaynak paylaşmak istediğinde.',
        keywords: ['bilgi', 'kaynak', 'makale', 'rehber', 'aile'],
      },
      {
        icon: HelpCircle,
        title: 'Yardım Merkezi',
        to: '/yardim',
        purpose: 'Sıkça sorulan sorulara, platform kullanım kılavuzlarına ve uzman destek bilgilerine ulaşmanızı sağlar.',
        useWhen: 'Teknik bir desteğe veya platformun işleyişiyle ilgili yardıma ihtiyaç duyduğunuzda.',
        keywords: ['yardım', 'sss', 'destek', 'uzman', 'kılavuz'],
      },
      {
        icon: Settings,
        title: 'Ayarlar',
        to: '/ayarlar',
        purpose: 'Profil, uzmanlık, hesap ve tercih bilgilerini düzenler.',
        useWhen: 'Görünür profilini veya hesap tercihlerini güncellemek istediğinde.',
        keywords: ['ayarlar', 'profil', 'hesap', 'uzmanlık', 'tercih'],
      },
      {
        icon: ShieldCheck,
        title: 'Paylaşım ve Mahremiyet',
        to: '/paylasimli-ilerleme',
        purpose: 'Aileyle paylaşılan ilerleme notlarını ve uzman-aile bilgi akışını kontrollü tutar.',
        useWhen: 'Hangi bilginin aileyle paylaşıldığını kontrol etmek veya ortak kayıt oluşturmak istediğinde.',
        keywords: ['mahremiyet', 'kvkk', 'izin', 'paylaşım', 'gizlilik'],
      },
    ],
  },
];

const ADMIN_GUIDE: GuideGroup[] = [
  {
    title: 'Yönetim',
    description: 'Sistem durumunu izleme, kullanıcı rolleri ve başvuru onay süreçleri.',
    pages: [
      {
        icon: HelpCircle,
        title: 'Kullanıcı Rehberi',
        to: '/kullanici-rehberi',
        purpose: 'Yeni kullanıcı başlangıç akışını ve admin yönetim yetkilerini açıklar.',
        useWhen: 'Sistem yönetimini ve rehber sayfalarını tanımak istediğinizde.',
        badge: 'Rehber',
        keywords: ['rehber', 'başlangıç', 'yardım', 'kullanıcı rehberi'],
      },
      {
        icon: LayoutDashboard,
        title: 'Ana Sayfa',
        to: '/anasayfa',
        purpose: 'Platform kullanıcıları, uzmanlar ve raporlarla ilgili günlük özeti gösterir.',
        useWhen: 'Sistemin genel durumunu hızlıca kontrol etmek istediğinde.',
        badge: 'Her gün',
        keywords: ['ana sayfa', 'özet', 'platform', 'admin', 'durum'],
      },
      {
        icon: BarChart2,
        title: 'Analitik',
        to: '/admin/analytics',
        purpose: 'Kullanım, büyüme ve sistem metriklerini takip eder.',
        useWhen: 'Platformun nasıl kullanıldığını görmek istediğinde.',
        keywords: ['analitik', 'metrik', 'grafik', 'kullanım', 'büyüme'],
      },
      {
        icon: GraduationCap,
        title: 'Uzman Başvuruları',
        to: '/admin/experts',
        purpose: 'Uzman onay, doğrulama ve başvuru süreçlerini yönetir.',
        useWhen: 'Yeni uzmanları incelemek veya doğrulama yapmak gerektiğinde.',
        keywords: ['uzman', 'başvuru', 'onay', 'doğrulama', 'admin'],
      },
      {
        icon: Users,
        title: 'Kullanıcı Yönetimi',
        to: '/admin/users',
        purpose: 'Kullanıcı hesapları, roller ve aktiflik durumlarını gösterir.',
        useWhen: 'Bir kullanıcı hesabını kontrol etmek veya rolünü görmek istediğinde.',
        keywords: ['kullanıcı', 'rol', 'hesap', 'aktif', 'admin'],
      },
      {
        icon: BookOpen,
        title: 'İçerik Yönetimi',
        to: '/admin/content',
        purpose: 'Bilgi bankası ve kaynak içeriklerinin yönetildiği alandır.',
        useWhen: 'İçerik eklemek, düzenlemek veya yayına almak istediğinde.',
        keywords: ['içerik', 'cms', 'makale', 'bilgi', 'yayın'],
      },
      {
        icon: AlertTriangle,
        title: 'Moderasyon',
        to: '/admin/reports',
        purpose: 'Şikayetleri, raporları ve incelenmesi gereken içerikleri toplar.',
        useWhen: 'Platform güvenliği için bildirilen bir durumu incelemek gerektiğinde.',
        keywords: ['moderasyon', 'şikayet', 'rapor', 'güvenlik', 'inceleme'],
      },
      {
        icon: Activity,
        title: 'Aktivite Kaydı',
        to: '/admin/auditlog',
        purpose: 'Sistemdeki önemli işlem geçmişlerini takip eder.',
        useWhen: 'Kim ne yaptı sorusuna kayıt üzerinden bakmak istediğinde.',
        keywords: ['aktivite', 'log', 'geçmiş', 'işlem', 'denetim'],
      },
      {
        icon: Settings,
        title: 'Ayarlar',
        to: '/admin/settings',
        purpose: 'Platform ayarları ve genel yapılandırmalar için kullanılır.',
        useWhen: 'Sistemin davranışını etkileyen ayarları düzenlemek gerektiğinde.',
        keywords: ['ayar', 'sistem', 'konfigürasyon', 'admin', 'tercih'],
      },
    ],
  },
  {
    title: 'Topluluk',
    description: 'Forum, topluluk grupları ve sistem mesajlaşma denetimleri.',
    pages: [
      {
        icon: BookOpen,
        title: 'Forum Akışı',
        to: '/forum',
        purpose: 'Forumdaki tüm paylaşımları, soruları ve yanıtları takip eder.',
        useWhen: 'Forumda genel denetleme veya topluluk düzenini koruma çalışmaları yaparken.',
        keywords: ['forum', 'soru', 'denetim', 'admin'],
      },
      {
        icon: Users,
        title: 'Gruplar',
        to: '/gruplar',
        purpose: 'Platformdaki topluluk gruplarının denetimini ve ayarlarını yönetir.',
        useWhen: 'Grupları incelemek veya yeni grup taleplerini onaylamak gerektiğinde.',
        keywords: ['grup', 'topluluk', 'yönetim', 'admin'],
      },
      {
        icon: MessageCircle,
        title: 'Mesajlar',
        to: '/mesajlar',
        purpose: 'Kullanıcılar ve uzmanlar arasındaki genel yazışmaları izler.',
        useWhen: 'İletişim akışını denetlemek veya destek amaçlı iletişim kurmak gerektiğinde.',
        keywords: ['mesaj', 'destek', 'iletişim', 'admin'],
      },
    ],
  },
  {
    title: 'İçerik & Sistem',
    description: 'Genel sistem konfigürasyonları, yardım merkezi ve makaleler.',
    pages: [
      {
        icon: BookOpen,
        title: 'Bilgi Bankası',
        to: '/bilgi-bankasi',
        purpose: 'Yayınlanan tüm makalelerin genel listesi ve kontrolü.',
        useWhen: 'Bilgi bankası içeriklerini denetlemek istediğinizde.',
        keywords: ['bilgi bankası', 'makale', 'rehber', 'admin'],
      },
      {
        icon: HelpCircle,
        title: 'Yardım Merkezi',
        to: '/yardim',
        purpose: 'Yardım Merkezi içeriklerini ve kullanıcı SSS dökümanlarını gösterir.',
        useWhen: 'Destek dökümanlarını güncellemek veya SSS sayfasını incelemek istediğinizde.',
        keywords: ['yardım', 'sss', 'destek', 'admin'],
      },
    ],
  },
];

const GUIDE_BY_ROLE: Record<UserRole, GuideGroup[]> = {
  PARENT: PARENT_GUIDE,
  EXPERT: EXPERT_GUIDE,
  ADMIN: ADMIN_GUIDE,
};

function readVisitedRoutes() {
  try {
    return new Set(JSON.parse(localStorage.getItem(VISITED_KEY) ?? '[]') as string[]);
  } catch {
    return new Set<string>();
  }
}

function writeVisitedRoute(to: string) {
  try {
    const visited = readVisitedRoutes();
    visited.add(to);
    localStorage.setItem(VISITED_KEY, JSON.stringify([...visited]));
    return visited;
  } catch {
    // localStorage may be unavailable in restricted browser contexts.
    return new Set<string>();
  }
}

function PageCard({ page, onVisit }: { page: GuidePage; onVisit: (to: string) => void }) {
  const Icon = page.icon;
  return (
    <Link
      to={page.to}
      onClick={() => onVisit(page.to)}
      className="group flex h-full flex-col rounded-3xl border border-slate-200 bg-white p-5 transition-all duration-300 hover:-translate-y-1 hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-500/5"
    >
      <div className="flex items-start justify-between gap-3">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100 transition-colors group-hover:bg-indigo-600 group-hover:text-white">
          <Icon size={20} />
        </span>
        {page.badge && (
          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-emerald-700 ring-1 ring-emerald-100">
            {page.badge}
          </span>
        )}
      </div>
      <h3 className="mt-4 text-base font-extrabold text-slate-900 group-hover:text-indigo-950 transition-colors">{page.title}</h3>
      <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-600 flex-1">{page.purpose}</p>
      <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 ring-1 ring-slate-100/80">
        <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Ne zaman kullanılır?</p>
        <p className="mt-1 text-xs font-semibold leading-relaxed text-slate-500">{page.useWhen}</p>
      </div>
      <span className="mt-4 inline-flex items-center gap-1.5 text-xs font-extrabold text-indigo-600 group-hover:text-indigo-700">
        Sayfaya git
        <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
      </span>
    </Link>
  );
}

export function UserGuidePage() {
  const user = useAuthStore((s) => s.user);
  const role = user?.role ?? 'PARENT';
  const groups = GUIDE_BY_ROLE[role];
  const [query, setQuery] = useState('');
  const [activeGroupIndex, setActiveGroupIndex] = useState(0);

  useEffect(() => {
    writeVisitedRoute('/kullanici-rehberi');
  }, []);

  const handleRouteVisit = (to: string) => {
    writeVisitedRoute(to);
  };

  const filteredGroups = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('tr-TR');
    if (!q) return groups;
    return groups
      .map((group) => ({
        ...group,
        pages: group.pages.filter((page) => {
          const haystack = [
            page.title,
            page.purpose,
            page.useWhen,
            ...page.keywords,
          ].join(' ').toLocaleLowerCase('tr-TR');
          return haystack.includes(q);
        }),
      }))
      .filter((group) => group.pages.length > 0);
  }, [groups, query]);

  const totalPageCount = groups.reduce((count, group) => count + group.pages.length, 0);
  const visiblePageCount = filteredGroups.reduce((count, group) => count + group.pages.length, 0);
  const isSearching = query.trim().length > 0;
  const activeGroup = groups[activeGroupIndex] ?? groups[0];
  const visibleGroups = isSearching ? filteredGroups : activeGroup ? [activeGroup] : [];
  const featuredPages = groups.flatMap((group) => group.pages).filter((page) => page.badge).slice(0, 4);

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header + Search */}
      <section className="space-y-5">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-950">Kullanıcı Rehberi</h1>
          <p className="mt-1 text-sm font-medium text-slate-500">Platformdaki tüm sayfaları, özellik gruplarını ve ne zaman kullanılacaklarını buradan keşfet.</p>
        </div>

        {/* Search Bar */}
        <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-center">
          <label className="relative block flex-1">
            <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Sayfa, konu veya işlem ara..."
              className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm font-semibold text-slate-700 outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-indigo-300 focus:bg-white focus:ring-4 focus:ring-indigo-100"
            />
          </label>
          <span className="h-12 inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 px-5 text-xs font-bold text-slate-500 shadow-sm">
            {visiblePageCount} / {totalPageCount} sayfa
          </span>
        </div>

        {/* Categories Bar */}
        {!isSearching && (
          <div className="mt-6 rounded-[24px] border border-slate-200 bg-slate-50/50 p-4 sm:p-5">
            <div className="mb-4 flex flex-col gap-1 px-1 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md inline-block">Kategori bazlı filtrele</p>
                <p className="mt-1 text-xs font-semibold text-slate-500">Aşağıda sadece seçtiğin bölümün sayfaları gösterilir.</p>
              </div>
              <span className="hidden rounded-full bg-white px-3.5 py-1 text-[11px] font-extrabold text-slate-500 ring-1 ring-slate-200 shadow-sm sm:inline-flex">
                {groups.length} Kategori
              </span>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {groups.map((group, index) => {
                const selected = index === activeGroupIndex;
                const FirstIcon = group.pages[0]?.icon ?? BookOpen;
                return (
                  <button
                    key={group.title}
                    type="button"
                    onClick={() => setActiveGroupIndex(index)}
                    aria-pressed={selected}
                    className={cn(
                      "group relative rounded-2xl border px-4 py-3.5 text-left transition-all duration-300 cursor-pointer",
                      selected
                        ? "border-indigo-500 bg-white text-indigo-950 shadow-md shadow-indigo-500/5 ring-4 ring-indigo-500/5 scale-[1.02]"
                        : "border-slate-200 bg-white text-slate-600 hover:border-indigo-300 hover:bg-indigo-50/10 hover:scale-[1.01]"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <span className={cn(
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-all duration-300 shadow-sm",
                        selected
                          ? "bg-indigo-600 text-white"
                          : "bg-slate-100 text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600"
                      )}>
                        <FirstIcon size={16} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-extrabold leading-5 truncate">{group.title}</span>
                        <span className={cn(
                          "mt-1 block text-xs font-extrabold",
                          selected ? "text-indigo-600" : "text-slate-400"
                        )}>
                          {group.pages.length} sayfa
                        </span>
                      </span>
                    </div>
                    {selected && (
                      <span className="absolute right-3 top-3 rounded-full bg-indigo-50 px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-indigo-700 ring-1 ring-indigo-100 shadow-inner">
                        Seçili
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {!isSearching && featuredPages.length > 0 && activeGroupIndex === 0 && (
        <section className="grid gap-3 md:grid-cols-4">
          {featuredPages.map((page) => {
            const Icon = page.icon;
            return (
              <Link
                key={page.to}
                to={page.to}
                onClick={() => handleRouteVisit(page.to)}
                className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3.5 transition-all duration-300 hover:border-indigo-200 hover:bg-indigo-50/10 hover:shadow-sm"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 shadow-sm">
                  <Icon size={16} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-extrabold text-slate-900">{page.title}</span>
                  <span className="text-[10px] font-black uppercase text-emerald-600 tracking-wider mt-0.5 block">{page.badge}</span>
                </span>
              </Link>
            );
          })}
        </section>
      )}

      {visibleGroups.length === 0 ? (
        <section className="rounded-[28px] border border-dashed border-slate-200 bg-white p-10 text-center shadow-inner">
          <HelpCircle size={36} className="mx-auto text-slate-300 animate-bounce" />
          <h2 className="mt-4 text-base font-extrabold text-slate-900">Sonuç bulunamadı</h2>
          <p className="mt-2 text-sm font-medium text-slate-500">Aramayı daha kısa veya farklı bir kelimeyle tekrar deneyin.</p>
        </section>
      ) : (
        visibleGroups.map((group) => (
          <section key={group.title} className="space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between px-1">
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  {isSearching ? 'Arama sonucu' : 'Seçili kategori'}
                </p>
                <h2 className="mt-1 text-xl font-black text-slate-950 tracking-tight">{group.title}</h2>
                <p className="mt-1 text-sm font-semibold leading-relaxed text-slate-500">{group.description}</p>
              </div>
              {!isSearching && (
                <span className="text-xs font-extrabold text-slate-400 bg-slate-100 px-3 py-1 rounded-full shadow-sm">
                  {group.pages.length} sayfa listelendi
                </span>
              )}
            </div>
            <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
              {group.pages.map((page) => (
                <PageCard key={page.to} page={page} onVisit={handleRouteVisit} />
              ))}
            </div>
          </section>
        ))
      )}

      {/* Summary Box */}
      <section className="rounded-3xl border border-emerald-100 bg-gradient-to-br from-emerald-50/60 to-teal-50/40 p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-emerald-600 shadow-sm border border-emerald-100">
            <Star size={18} />
          </span>
          <div>
            <p className="text-sm font-extrabold text-emerald-950">Faydalı İpucu</p>
            <p className="mt-1 text-sm font-semibold leading-relaxed text-emerald-800">
              <strong>Ana Sayfa:</strong> Günlük yapılacak işleri ve çocuk hedeflerini sunan yol haritanızdır.<br />
              <strong>Kullanıcı Rehberi:</strong> Platformdaki tüm sayfaları, özellik gruplarını ve ne zaman kullanılacaklarını özetleyen haritanızdır.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
