/**
 * Tanıtım sayfalarının metin içeriği.
 *
 * Markup'tan ayrı tutuluyor çünkü (a) aynı veriler birden fazla yerde kullanılıyor
 * — örneğin SSS listesi hem sayfada render ediliyor hem de RouteMetadata içinde
 * FAQPage JSON-LD şemasına dönüştürülüyor; ikisinin ayrışması Google'a yanlış
 * yapılandırılmış veri göndermek demek — ve (b) metin güncellemek için JSX
 * okumak gerekmesin.
 */
import {
  Baby,
  BarChart3,
  BookOpen,
  CalendarCheck,
  Database,
  Eye,
  FileText,
  HeartPulse,
  LifeBuoy,
  LockKeyhole,
  MessageCircle,
  NotebookTabs,
  QrCode,
  Settings2,
  ShieldCheck,
  Stethoscope,
  TrendingUp,
  UserCheck,
  Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type AccentColor = 'blue' | 'violet' | 'emerald' | 'orange' | 'indigo' | 'teal' | 'rose';

export const accentMap: Record<AccentColor, { iconBg: string; iconText: string; border: string }> = {
  blue:    { iconBg: 'bg-blue-50',    iconText: 'text-blue-700',    border: 'border-blue-100 hover:border-blue-300' },
  violet:  { iconBg: 'bg-violet-50',  iconText: 'text-violet-700',  border: 'border-violet-100 hover:border-violet-300' },
  emerald: { iconBg: 'bg-emerald-50', iconText: 'text-emerald-700', border: 'border-emerald-100 hover:border-emerald-300' },
  orange:  { iconBg: 'bg-orange-50',  iconText: 'text-orange-700',  border: 'border-orange-100 hover:border-orange-300' },
  indigo:  { iconBg: 'bg-indigo-50',  iconText: 'text-indigo-700',  border: 'border-indigo-100 hover:border-indigo-300' },
  teal:    { iconBg: 'bg-teal-50',    iconText: 'text-teal-700',    border: 'border-teal-100 hover:border-teal-300' },
  rose:    { iconBg: 'bg-rose-50',    iconText: 'text-rose-700',    border: 'border-rose-100 hover:border-rose-300' },
};

export interface GuideStep {
  icon: LucideIcon;
  screen: string;
  title: string;
  intro: string;
  tasks: string[];
  result: string;
}

export const guideSteps: GuideStep[] = [
  {
    icon: UserCheck,
    screen: 'Kayıt',
    title: 'Hesabınızı seçin',
    intro: 'Aile hesabı günlük takip için, uzman hesabı danışan yönetimi için kullanılır.',
    tasks: ['Rolünüzü seçin', 'Temel hesap bilgilerini girin', 'Giriş yaptıktan sonra başlangıç ekranına geçin'],
    result: 'Platform size rolünüze uygun menüleri gösterir.',
  },
  {
    icon: Baby,
    screen: 'Çocuklarım',
    title: 'Çocuk profilini oluşturun',
    intro: 'Tüm günlük kayıtlar, randevular, notlar ve uzman paylaşımları bu profile bağlanır.',
    tasks: ['Temel bilgileri ekleyin', 'İletişim düzeyi ve hassasiyetleri yazın', 'Terapi ve okul notlarını tamamlayın'],
    result: 'Dağınık bilgiler tek güvenli profilde toplanır.',
  },
  {
    icon: NotebookTabs,
    screen: 'Günlük takip',
    title: 'Kısa gözlemler ekleyin',
    intro: 'Her gün uzun rapor yazmak zorunda değilsiniz; küçük ama düzenli kayıtlar yeterlidir.',
    tasks: ['Duygu, uyku veya ilaç durumunu işaretleyin', 'Önemli davranış veya beslenme notu girin', 'O gün işe yarayan şeyi kısa yazın'],
    result: 'Uzman görüşmelerine net ve güncel bilgiyle gidersiniz.',
  },
  {
    icon: CalendarCheck,
    screen: 'Takvim',
    title: 'Randevu ve görevleri planlayın',
    intro: 'Seanslar, ev çalışmaları ve hatırlatmalar aynı takvimde görünür.',
    tasks: ['Seans tarihini ekleyin', 'Ev çalışmasını görev olarak yazın', 'Yaklaşan işleri ana sayfadan kontrol edin'],
    result: 'Aile rutini ve uzman planı karışmadan ilerler.',
  },
  {
    icon: MessageCircle,
    screen: 'Uzmanlar ve mesajlar',
    title: 'Uzmanla güvenli iletişim kurun',
    intro: 'Gerektiğinde uzman bulun, mesaj gönderin veya randevu talebi oluşturun.',
    tasks: ['Uygun uzmanı inceleyin', 'Bağlantı veya randevu talebi gönderin', 'Sadece gerekli bilgileri paylaşın'],
    result: 'Uzman yalnızca yetkili olduğu bilgiler üzerinden takip yapar.',
  },
  {
    icon: TrendingUp,
    screen: 'Gelişim paneli',
    title: 'İlerlemeyi birlikte görün',
    intro: 'Kayıtlar zamanla anlamlı hale gelir; tekrar eden zorlanmalar ve küçük gelişmeler görünür olur.',
    tasks: ['Haftalık özeti inceleyin', 'Tekrar eden konuları fark edin', 'Bir sonraki görüşmeye not hazırlayın'],
    result: 'Takip, tahmine değil düzenli veriye dayanır.',
  },
];

export interface ToolModule {
  icon: LucideIcon;
  title: string;
  text: string;
  color: AccentColor;
}

/** Sıralama bilinçli: önce ayırt edici araçlar, sonra her takip uygulamasında
 *  bulunan temel modüller. */
export const modules: ToolModule[] = [
  { icon: QrCode,        title: 'Acil durum kartı',   text: 'QR ile paylaşılan, çocuğa özel acil bilgi kartı',   color: 'rose' },
  { icon: LifeBuoy,      title: 'Kriz rehberi',       text: 'Zor anlarda adım adım müdahale ve acil numaralar',  color: 'orange' },
  { icon: FileText,      title: 'BEP hazırlığı',      text: 'Eğitim planı için yapılandırılmış rapor çıktısı',   color: 'indigo' },
  { icon: Users,         title: 'Benzer aileler',     text: 'Benzer deneyimdeki ailelerle güvenli topluluk',     color: 'teal' },
  { icon: NotebookTabs,  title: 'Günlük takip',       text: 'Duygu, uyku, davranış ve beslenme kayıtları',       color: 'violet' },
  { icon: Baby,          title: 'Çocuk profili',      text: 'Temel bilgiler, hassasiyetler ve duyusal profil',   color: 'blue' },
  { icon: CalendarCheck, title: 'Takvim ve görevler', text: 'Randevu, ev çalışması ve hatırlatmalar',            color: 'emerald' },
  { icon: MessageCircle, title: 'Uzman iletişimi',    text: 'Doğrulanmış uzmanlarla mesaj ve randevu',           color: 'orange' },
  { icon: BookOpen,      title: 'Bilgi bankası',      text: 'Haklar, okul süreçleri ve pratik rehberler',        color: 'indigo' },
];

/** Hero altındaki güven satırı — ürün mekaniği değil, kullanıcı kazancı anlatır. */
export const heroHighlights = ['Ücretsiz aile hesabı', 'Kontrollü paylaşım', 'İstediğiniz zaman veri silme'];

export interface HeroStat {
  value: string;
  label: string;
}

/** Kanıtlanamayan kullanım metriği vermiyoruz; bunlar ürünün doğrulanabilir
 *  nitelikleri. */
export const heroStats: HeroStat[] = [
  { value: 'Ücretsiz', label: 'Aile hesabı' },
  { value: '9 araç', label: 'Tek panelde' },
  { value: 'KVKK', label: 'Uyumlu altyapı' },
];

export interface Faq {
  question: string;
  answer: string;
}

export const faqs: Faq[] = [
  {
    question: 'Aile hesabı gerçekten ücretsiz mi?',
    answer:
      'Evet. Aile hesabını ücretsiz oluşturabilir, çocuk profili ve temel takip araçlarını kullanmaya başlayabilirsiniz. Kredi kartı bilgisi istenmez.',
  },
  {
    question: 'Uzmanlar nasıl doğrulanıyor?',
    answer:
      'Uzmanların kimlik, diploma ve mesleki yetkinlik bilgileri incelenir. Onay durumu profilde açıkça gösterilir; doğrulanmamış hesaplar aile verisine erişemez.',
  },
  {
    question: 'Çocuğumun bilgilerini kimler görebilir?',
    answer:
      'Bilgileriniz varsayılan olarak hesabınıza özeldir. Bir uzman ancak sizin verdiğiniz kapsam ve süre içindeki yetkiyle ilgili kayıtlara erişebilir. Bu yetkiyi Ayarlar ekranından dilediğiniz an geri çekebilirsiniz.',
  },
  {
    question: 'Platform tanı veya tedavi öneriyor mu?',
    answer:
      'Hayır. Platform takip, düzenleme ve iletişim desteği sağlar; tanı, acil yardım veya tıbbi karar mekanizması değildir. Acil durumlarda 112 aranmalıdır.',
  },
  {
    question: 'Verilerimi dışa aktarabilir veya silebilir miyim?',
    answer:
      'Evet. Hesap verilerinizin dışa aktarımını ve hesabınızın silinmesini Ayarlar ekranından talep edebilirsiniz. Talepler KVKK kapsamında işlenir.',
  },
  {
    question: 'Üyelik olmadan kullanabileceğim bir şey var mı?',
    answer:
      'Kriz rehberi üyelik gerektirmez; zor bir anda doğrudan açıp adım adım yönergeleri ve acil numaraları görebilirsiniz.',
  },
];

export interface Safeguard {
  icon: LucideIcon;
  title: string;
  text: string;
  color: AccentColor;
}

export const safeguards: Safeguard[] = [
  {
    icon: ShieldCheck,
    title: 'Kontrollü paylaşım',
    text: 'Çocuk bilgileri hesap bazlı tutulur; uzman erişimi yetkilendirme ile ilerler.',
    color: 'emerald',
  },
  {
    icon: LockKeyhole,
    title: 'Rol bazlı kullanım',
    text: 'Aile, uzman ve admin ekranları birbirinden ayrıdır.',
    color: 'blue',
  },
  {
    icon: Stethoscope,
    title: 'Tıbbi karar değildir',
    text: 'Platform takip ve iletişim desteği sağlar; tanı veya tedavi yerine geçmez.',
    color: 'violet',
  },
];

export const trustSteps = [
  { icon: Eye, title: 'Ne paylaştığınızı görün', text: 'Uzman erişimleri Ayarlar içinden görüntülenir ve yönetilir.' },
  { icon: Settings2, title: 'Yetkiyi siz yönetin', text: 'Paylaşım iznini ihtiyaç değiştiğinde geri çekebilirsiniz.' },
  { icon: Database, title: 'Verinizi taşıyın veya silin', text: 'Hesap verisi dışa aktarma ve hesap silme talepleri kullanıcı kontrolündedir.' },
];

/**
 * Doğrulanabilir kullanıcı yorumu bulunana kadar sosyal kanıt yerine tasarım
 * gerekçesi gösteriliyor. Atıfsız ("Aile kullanıcısı") uydurma izlenimi veren
 * alıntılar, sağlık bitişik bir üründe güveni artırmak yerine düşürür.
 */
export interface DesignRationale {
  icon: LucideIcon;
  title: string;
  text: string;
}

export const designRationale: DesignRationale[] = [
  {
    icon: HeartPulse,
    title: 'Günlük kayıt bir dakikayı geçmemeli',
    text: 'Yorgun bir günün sonunda uzun form doldurulmaz. Kayıt ekranı işaretlemeyle ilerler, yazı yazmak isteğe bağlıdır.',
  },
  {
    icon: ShieldCheck,
    title: 'Paylaşım varsayılan olarak kapalı',
    text: 'Hiçbir kayıt siz açıkça yetki vermeden uzmana görünmez. Yetki kapsamlı ve sürelidir, tek tuşla geri alınır.',
  },
  {
    icon: BarChart3,
    title: 'Grafik değil, kullanılabilir özet',
    text: 'Amaç güzel tablolar üretmek değil; görüşmeye giderken "şu üç şey değişti" diyebilmenizi sağlamak.',
  },
];

/** Uzman tarafı landing sayfası içeriği. */
export const expertBenefits = [
  {
    icon: NotebookTabs,
    title: 'Görüşmeye hazırlıklı başlayın',
    text: 'Ailenin paylaştığı günlük kayıtlar ve haftalık özet, seans öncesi tek ekranda toplanır.',
  },
  {
    icon: ShieldCheck,
    title: 'Yetki sınırları net',
    text: 'Yalnızca ailenin açıkça yetki verdiği kayıtları görürsünüz; kapsam ve süre kayıt altındadır.',
  },
  {
    icon: CalendarCheck,
    title: 'Randevu ve danışan yönetimi',
    text: 'Randevu talepleri, danışan listesi ve seans notları aynı yerde ilerler.',
  },
  {
    icon: FileText,
    title: 'Rapor ve BEP desteği',
    text: 'Aile kayıtlarından yapılandırılmış çıktı üretilir; rapor hazırlığı elle veri toplamaya bağlı kalmaz.',
  },
];

export const expertVerificationSteps = [
  'Kimlik ve iletişim bilgileri kontrol edilir',
  'Diploma ve uzmanlık belgeleri incelenir',
  'Onay durumu uzman profilinde gösterilir',
];
