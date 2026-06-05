import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  Search, ChevronDown, ChevronUp, ExternalLink, Phone,
  FileText, Award, Heart, Bookmark, BookmarkCheck, Printer,
  CheckSquare, Square, AlertTriangle, Info, Scale,
  GraduationCap, Baby, Briefcase, Stethoscope,
  ClipboardList, Copy, Check, ArrowUpDown, Clock,
  AlertCircle, Lightbulb, Link2, X
} from 'lucide-react';
import { PageOnboarding } from '@/components/ui/PageOnboarding';

// ─── Persisted Store ──────────────────────────────────────────────────────────

interface RightsGuideStore {
  bookmarks: string[];
  checkedItems: string[];
  onboardingDismissed: boolean; // Fix 4
  toggleBookmark: (id: string) => void;
  toggleCheck: (id: string) => void;
  clearAll: () => void;
  dismissOnboarding: () => void; // Fix 4
}

const useRightsStore = create<RightsGuideStore>()(
  persist(
    (set) => ({
      bookmarks: [],
      checkedItems: [],
      onboardingDismissed: false,
      toggleBookmark: (id) =>
        set((s) => ({
          bookmarks: s.bookmarks.includes(id)
            ? s.bookmarks.filter((b) => b !== id)
            : [...s.bookmarks, id],
        })),
      toggleCheck: (id) =>
        set((s) => ({
          checkedItems: s.checkedItems.includes(id)
            ? s.checkedItems.filter((c) => c !== id)
            : [...s.checkedItems, id],
        })),
      clearAll: () => set({ bookmarks: [], checkedItems: [] }),
      dismissOnboarding: () => set({ onboardingDismissed: true }),
    }),
    { name: 'rights-guide-storage' }
  )
);

// ─── Types ────────────────────────────────────────────────────────────────────

interface RelatedArticle { id: string; label: string }

interface RightsArticle {
  id: string;
  category: string;
  icon: string;
  title: string;
  summary: string;
  content: string[];
  steps?: { title: string; description: string }[];
  template?: { title: string; body: string };
  faq?: { q: string; a: string }[];
  warnings?: string[];
  links?: { label: string; url?: string; phone?: string }[];
  tags: string[];
  priority?: 'high' | 'medium' | 'low';
  difficulty?: 'kolay' | 'orta' | 'zor';
  duration?: string;
  law?: string;
  related?: RelatedArticle[];
}

interface ChecklistItem {
  id: string;
  label: string;
  category: string;
}

type SortKey = 'priority' | 'alpha' | 'category';

// ─── Data ────────────────────────────────────────────────────────────────────

const RIGHTS_LAST_UPDATED = 'Haziran 2026';

const RIGHTS_SOURCES = [
  { label: 'MEB Özel Eğitim', url: 'https://orgm.meb.gov.tr' },
  { label: 'Resmî Gazete', url: 'https://www.resmigazete.gov.tr/eskiler/2018/07/20180707-8.htm' },
  { label: 'Aile Bakanlığı', url: 'https://www.aile.gov.tr' },
  { label: 'SGK', url: 'https://www.sgk.gov.tr' },
  { label: 'CİMER', url: 'https://www.cimer.gov.tr' },
];

const ARTICLES: RightsArticle[] = [
  {
    id: 'bep',
    category: 'Eğitim Hakkı',
    icon: '📋',
    title: 'BEP — Bireyselleştirilmiş Eğitim Programı Hakkı',
    summary: 'Otizm tanısı olan her çocuk, ücretsiz BEP hazırlanması ve uygulanması hakkına sahiptir.',
    priority: 'high',
    difficulty: 'orta',
    duration: '2–4 hafta',
    law: 'Özel Eğitim Hizmetleri Yönetmeliği, Md. 14–24',
    content: [
      'Özel eğitim ihtiyacı olan her öğrenciye BEP hazırlanması 573 sayılı KHK ve Özel Eğitim Hizmetleri Yönetmeliği ile güvence altına alınmıştır.',
      'BEP ekibi: öğretmen, okul yönetimi, RAM uzmanı, aile ve gerektiğinde terapistlerden oluşur. Aile de BEP ekibinin zorunlu üyesidir.',
      'BEP en az yılda bir kez gözden geçirilmelidir. İstek üzerine daha sık revize edilebilir.',
      'BEP\'e dahil edilmesi gereken unsurlar: mevcut performans düzeyi, yıllık hedefler, özel eğitim hizmetleri, genel eğitime katılım oranı, değerlendirme kriterleri.',
      'Okul, BEP\'i uygulamakla yükümlüdür. Uygulanmadığı durumlarda RAM ya da İl MEB\'e şikayet hakkınız vardır.',
      'BEP sürecinde ailenin yazılı onayı zorunludur. İmza atmadan önce belgeyi okuma ve soru sorma hakkınız var.',
    ],
    warnings: [
      'BEP\'i aceleyle imzalamayın — imzaladıktan sonra itiraz süreci zorlaşır. Okumak için ek süre isteme hakkınız var.',
      'Okulun sizi "toplantı yapılmadan imzalayın" demesi hukuka aykırıdır.',
      'BEP hedefleri çok genel yazılırsa (Örn: "sosyal becerilerini geliştirir") uygulamayı takip etmek güçleşir. Ölçülebilir hedefler talep edin.',
    ],
    steps: [
      { title: 'RAM\'a Başvurun', description: 'Çocuğunuzun tanı belgesiyle bölgenizdeki RAM\'a giderek BEP talep edin.' },
      { title: 'Değerlendirme', description: 'RAM uzmanları çocuğunuzu değerlendirir ve uygun eğitim ortamını belirler.' },
      { title: 'BEP Toplantısı', description: 'Okul, öğretmen, RAM uzmanı ve ailece BEP toplantısı yapılır. Hedefler belirlenir.' },
      { title: 'Onay ve Uygulama', description: 'Belgeyi dikkatlice okuyup onaylayın. Okul uygulamaya başlar.' },
      { title: 'Periyodik İzleme', description: 'En az yılda bir kez gözden geçirilir. İlerlemeyi kayıt altına alın.' },
    ],
    faq: [
      { q: 'BEP toplantısına katılmak zorunda mıyım?', a: 'Evet, aile BEP ekibinin zorunlu üyesidir. Toplantıya katılmak ve kararlarda söz hakkı kullanmak yasal hakkınızdır.' },
      { q: 'BEP\'i beğenmediysem ne yapabilirim?', a: 'İmzalamadan önce değişiklik talep edebilirsiniz. Anlaşmazlık durumunda RAM müdürlüğüne itiraz dilekçesi verebilirsiniz.' },
      { q: 'BEP ne sıklıkla güncellenir?', a: 'Zorunlu minimum yılda bir kez; ancak çocuğunuzun ihtiyaçları değiştikçe daha sık güncelleme talep edebilirsiniz.' },
    ],
    template: {
      title: 'BEP Revizyon Talep Dilekçesi',
      body: `[OKUL ADI] MÜDÜRLÜĞÜNE

Okulunuzda [SINIF] sınıfında kayıtlı olan [ÖĞRENCİ ADI SOYADI] (T.C.: [TC NO]) adlı öğrencinin velisiyim.

Çocuğumun Bireyselleştirilmiş Eğitim Programı'nın (BEP) güncellenmesi amacıyla yeni bir BEP toplantısı yapılmasını talep ediyorum.

Güncelleme gerekçem: [GEREKÇENİZİ YAZIN]

Özel Eğitim Hizmetleri Yönetmeliği kapsamında BEP toplantısına davet edilmemi ve görüşlerimin belgeye yansıtılmasını saygıyla arz ederim.

[TARİH]
[AD SOYAD — İMZA]
İletişim: [TELEFON / E-POSTA]`,
    },
    links: [{ label: 'Özel Eğitim Hizmetleri Yönetmeliği', url: 'https://www.resmigazete.gov.tr/eskiler/2018/07/20180707-8.htm' }],
    tags: ['BEP', 'eğitim', 'okul', 'hak'],
    related: [
      { id: 'ram', label: 'RAM Başvurusu' },
      { id: 'kaynastirma', label: 'Kaynaştırma Hakkı' },
    ],
  },
  {
    id: 'ram',
    category: 'Değerlendirme',
    icon: '🏫',
    title: 'RAM — Rehberlik ve Araştırma Merkezleri',
    summary: 'RAM, tanı sonrası ücretsiz eğitsel değerlendirme ve yönlendirme yapan resmi kurumdur.',
    priority: 'high',
    difficulty: 'kolay',
    duration: '2–6 hafta',
    law: 'Özel Eğitim Hizmetleri Yönetmeliği, Md. 8–13',
    content: [
      'Tüm illerde MEB bünyesinde RAM bulunmaktadır. Her türlü özel eğitim başvurusu RAM üzerinden yapılır.',
      'Çocuğunuzun otizm tanısı varsa önce RAM\'a başvurarak Özel Eğitim Değerlendirme Kurulu\'na gönderilmeniz gerekir.',
      'RAM, çocuğunuzun hangi okul ve program türüne yerleşeceğine karar verir: kaynaştırma, özel eğitim sınıfı, otizm sınıfı veya özel eğitim okulu.',
      'Değerlendirme süreci tamamen ücretsizdir. Gerekli belgeler: tıbbi tanı raporu, nüfus cüzdanı fotokopisi, önceki eğitim bilgileri.',
      'RAM kararına itiraz hakkınız bulunmaktadır. İtiraz dilekçesini RAM müdürlüğüne veya il MEB müdürlüğüne iletebilirsiniz.',
      'RAM aynı zamanda aile danışmanlığı ve psikolojik destek hizmetleri de sunmaktadır.',
    ],
    warnings: [
      'RAM\'a girerken tüm tıbbi belgelerinizi, tanı raporlarınızı ve varsa önceki eğitim belgelerini yanınızda bulundurun — eksik belgeyle süreç uzayabilir.',
      'RAM değerlendirmesi için bekleme süresi illere göre değişir; erken başvurmak önemlidir.',
    ],
    steps: [
      { title: 'Randevu Alın', description: 'Bölgenizdeki RAM\'ı bulun ve randevu alın (veya doğrudan gelin).' },
      { title: 'Belgeleri Hazırlayın', description: 'Tıbbi tanı raporu, T.C. kimlik, nüfus cüzdanı fotokopisi, okul bilgileri.' },
      { title: 'Değerlendirme', description: 'RAM psikologu çocuğunuzu gözlemler ve standart testler uygular.' },
      { title: 'Rapor ve Yönlendirme', description: 'RAM, hangi eğitim ortamına yerleşileceğine karar vererek resmi yönlendirme belgesi verir.' },
    ],
    faq: [
      { q: 'RAM değerlendirmesi ücretli mi?', a: 'Hayır, tamamen ücretsizdir.' },
      { q: 'RAM kararını beğenmezsem ne yapabilirim?', a: 'RAM müdürlüğüne veya İl MEB Müdürlüğüne yazılı itiraz dilekçesi verebilirsiniz.' },
      { q: 'RAM değerlendirmesini tekrar yaptırabilir miyim?', a: 'Evet, çocuğunuzun gelişimi değiştikçe yeni değerlendirme talep edebilirsiniz.' },
    ],
    links: [{ label: 'MEB Özel Eğitim ve Rehberlik', url: 'https://orgm.meb.gov.tr' }],
    tags: ['RAM', 'değerlendirme', 'kaynaştırma', 'MEB'],
    related: [
      { id: 'bep', label: 'BEP Hakkı' },
      { id: 'ozel-egitim-kurumu', label: 'Özel Eğitim Desteği' },
    ],
  },
  {
    id: 'kaynastirma',
    category: 'Eğitim Hakkı',
    icon: '🤝',
    title: 'Kaynaştırma / Bütünleştirme Eğitimi Hakkı',
    summary: 'Otizm tanılı çocuğunuzun akranlarıyla aynı sınıfta eğitim alma hakkı vardır.',
    priority: 'high',
    difficulty: 'orta',
    duration: '1–3 ay',
    law: 'Özel Eğitim Hizmetleri Yönetmeliği, Md. 23–28',
    content: [
      'Kaynaştırma eğitimi, özel eğitim ihtiyacı olan öğrencilerin normal gelişim gösteren akranlarıyla aynı sınıfta eğitim almasıdır.',
      'Kaynaştırma öğrencisi için özel eğitim sınıfına ek olarak destek odası hizmeti sunulabilir.',
      'Okul, kaynaştırma öğrencisi için "Bireysel Destek Planı" hazırlamakla yükümlüdür.',
      'Sınıf mevcudu yönetmeliğe göre sınırlıdır: kaynaştırma öğrencisi bulunan sınıfta en fazla 2 kaynaştırma öğrencisi ve toplam 25 öğrenci olabilir.',
      'Kaynaştırma kararı RAM tarafından verilir, ancak aile de talep edebilir ve bu talep değerlendirilmek zorundadır.',
      'Kaynaştırmanın başarısı için okul-aile-uzman işbirliği şarttır. Düzenli toplantı hakkınız var.',
    ],
    warnings: [
      'Okul "yer yok" diyerek kaynaştırmayı reddedemez — bu durum hukuka aykırıdır.',
      'Kaynaştırma yerleştirilmesi yapılsa da destek odası hizmeti sunulmuyorsa bunu yazılı olarak talep edin.',
    ],
    faq: [
      { q: 'Okul kaynaştırmayı reddedebilir mi?', a: 'RAM kararıyla belirlenen kaynaştırma yerleştirmesini okul reddedemez. Hukuki itiraz hakkınız bulunmaktadır.' },
      { q: 'Destek odası hizmeti zorunlu mu?', a: 'Kaynaştırma öğrencisinin ihtiyacına göre destek odası hizmeti sağlanması zorunludur.' },
    ],
    tags: ['kaynaştırma', 'bütünleştirme', 'eğitim', 'akran'],
    related: [
      { id: 'bep', label: 'BEP Hakkı' },
      { id: 'okul-haklar', label: 'Okul Hakları' },
    ],
  },
  {
    id: 'engelli-kimlik',
    category: 'Sosyal Haklar',
    icon: '🪪',
    title: 'Engelli Sağlık Kurulu Raporu ve Engelli Kimlik Kartı',
    summary: 'Devlet desteklerinden yararlanmak için gerekli olan rapor ve kartın nasıl alınacağını öğrenin.',
    priority: 'high',
    difficulty: 'kolay',
    duration: '1–4 hafta',
    law: '3713 sayılı Kanun, Engelli Haklarına İlişkin Yönetmelik',
    content: [
      'Engelli sağlık kurulu raporu, devlet hastanelerindeki sağlık kurulundan alınır. Özel hastane raporları artık kabul edilmektedir.',
      'Başvuru için gerekli belgeler: T.C. kimlik, nüfus cüzdanı, varsa mevcut tıbbi belgeler (tanı raporları, epikriz).',
      'Raporda engellilik oranı ve ağır engellilik durumu belirtilir. Oran ve kategoriler çeşitli haklardan yararlanmayı belirler.',
      'Engelli Kimlik Kartı, rapora dayanarak Sosyal Hizmetler İl Müdürlüğü ya da e-Devlet üzerinden alınabilir.',
      'Engelli kimlik kartıyla elde edilen haklar: ücretsiz toplu taşıma, telefon aboneliği indirimi, elektrik desteği, müze ücretsiz giriş ve daha fazlası.',
      '2022\'den itibaren engelli kimlik kartı dijital olarak e-Devlet\'te de görüntülenebilmektedir.',
    ],
    warnings: [
      'Raporu almadan önce tüm tanı belgelerinizi toplayın — eksik belgeyle rapor düşük engellilik oranıyla çıkabilir.',
      'Engellilik oranı %40\'ın altında çıkarsa pek çok destekten yararlanamayabilirsiniz. İtiraz hakkınız var.',
    ],
    steps: [
      { title: 'Hastaneye Başvuru', description: 'Devlet hastanesine giderek "Engelli Sağlık Kurulu Raporu" talep edin.' },
      { title: 'Sağlık Kurulu', description: 'Psikiyatri, nöroloji gibi ilgili uzmanlar çocuğunuzu değerlendirir.' },
      { title: 'Rapor Onayı', description: 'Rapor hazırlanır. Engellilik oranını ve kategorisini dikkatli inceleyin.' },
      { title: 'Kimlik Kartı', description: 'e-Devlet (turkiye.gov.tr) veya Sosyal Hizmetler İl Müdürlüğü\'nden başvurun.' },
    ],
    links: [{ label: 'e-Devlet Engelli Kartı', url: 'https://www.turkiye.gov.tr' }],
    tags: ['engelli kimlik', 'rapor', 'kart', 'sosyal hak'],
    related: [
      { id: 'maas', label: 'Bakım Ücreti' },
      { id: 'ulasim', label: 'Ulaşım Hakları' },
    ],
  },
  {
    id: 'maas',
    category: 'Mali Destek',
    icon: '💰',
    title: 'Engelli Bakım Ücreti ve Aylık Hakları',
    summary: 'Engelli çocuğunuz için başvurabileceğiniz mali destek programları.',
    priority: 'high',
    difficulty: 'orta',
    duration: '1–3 ay',
    law: '2828 sayılı Sosyal Hizmetler Kanunu, 5510 sayılı SGK Kanunu',
    content: [
      'Evde bakım aylığı: Ağır engellilik raporuna sahip bireylere bakım veren aile üyelerine Aile ve Sosyal Hizmetler Bakanlığı tarafından aylık bakım ücreti ödenir.',
      'Yetim aylığı ve engelli aylığı: SGK\'ya bağlı olmayan, 18 yaş altı ağır engelli çocuklar için belirli şartlarda aylık bağlanabilir.',
      '2828 sayılı Sosyal Hizmetler Kanunu kapsamında sosyoekonomik duruma göre ek destekler mevcuttur.',
      'Başvurular Aile ve Sosyal Hizmetler İl Müdürlükleri\'ne yapılır.',
      'Özel eğitim kurumlarına ödenen ücretlerde KDV muafiyeti ve gelir vergisi indirimi avantajından yararlanılabilir.',
      'Özel kreş ve gündüz bakımevi ücretleri için devlet teşviki (Özel Kreş Teşvik Programı) mevcuttur.',
    ],
    warnings: [
      'Gelir testi yapılır: ailenin kişi başı geliri asgari ücretin 2/3\'ünü aşıyorsa bakım ücreti ödenmiyor. Hesaplamanızı dikkatli yapın.',
      'Bakım ücreti alan birinin çalışmaya başlaması durumunda bildirme yükümlülüğünüz var — bildirmemek geri ödeme kararına yol açar.',
    ],
    faq: [
      { q: 'Evde bakım aylığı için gelir sınırı var mı?', a: 'Evet, ailenin kişi başına düşen gelirinin asgari ücretin 2/3\'ünden fazla olmaması gerekir.' },
      { q: 'Bakım ücreti ne kadar?', a: 'Güncel tutarlar her yıl Ocak\'ta güncellenir. Aile Bakanlığı İl Müdürlüğü\'nden veya ALO 183\'ten öğrenebilirsiniz.' },
    ],
    links: [
      { label: 'Aile ve Sosyal Hizmetler Bakanlığı', url: 'https://www.aile.gov.tr' },
      { label: 'ALO 183 Sosyal Destek', phone: '183' },
    ],
    tags: ['bakım ücreti', 'aylık', 'mali destek', 'sosyal yardım'],
    related: [
      { id: 'engelli-kimlik', label: 'Engelli Kimlik Kartı' },
      { id: 'ozel-egitim-kurumu', label: 'Özel Eğitim Desteği' },
    ],
  },
  {
    id: 'ozel-egitim-kurumu',
    category: 'Eğitim Hakkı',
    icon: '🏛️',
    title: 'Özel Eğitim Kurumları ve Devlet Desteği',
    summary: 'Özel eğitim, terapi ve rehabilitasyon merkezi seçimi ile devlet katkısı.',
    priority: 'medium',
    difficulty: 'orta',
    duration: '2–6 hafta',
    law: '5580 sayılı Özel Öğretim Kurumları Kanunu',
    content: [
      'MEB onaylı özel eğitim ve rehabilitasyon merkezlerinde hizmet alan çocuklar için devlet tarafından belirlenen tarifeye kadar ücret desteği sağlanır.',
      'Destek kapsamındaki hizmetler: dil-konuşma terapisi, özel eğitim, fizik tedavi, ergoterapi, psikolojik destek.',
      'Bu desteğe başvuru için önce RAM yönlendirmesi, ardından MEB onaylı kurumla sözleşme gereklidir.',
      'Kurumun "Özel Öğretim Kurumu" lisansına sahip olmasına dikkat edin. Lisanssız kurumlar devlet desteği kapsamında değildir.',
      'Aylık destek miktarı, engellilik türü ve hizmet süresine göre değişmektedir. Güncel miktarlar her yıl güncellenir.',
      'Çocuğunuzun ihtiyaçları değiştikçe alınan hizmetleri güncelleyebilir, RAM\'dan revize yönlendirme alabilirsiniz.',
    ],
    warnings: [
      'Kurumun lisansını bizzat kontrol edin (MEB e-Özel Öğretim Kurumları sistemi üzerinden). Lisanssız kurumlara yapılan ödemeler devlet desteğinden karşılanmaz.',
      'Devlet desteğinin kurum ücretini tam karşılamayabileceğini göz önünde bulundurun; fark size ait olur.',
    ],
    tags: ['rehabilitasyon', 'özel eğitim', 'terapi', 'devlet desteği'],
    related: [
      { id: 'ram', label: 'RAM Yönlendirmesi' },
      { id: 'maas', label: 'Mali Destekler' },
    ],
  },
  {
    id: 'okul-haklar',
    category: 'Eğitim Hakkı',
    icon: '📚',
    title: 'Okulda Bilmeniz Gereken Haklar',
    summary: 'Okul sürecinde ailenin yasal hakları ve okulun yükümlülükleri.',
    priority: 'high',
    difficulty: 'kolay',
    law: 'Millî Eğitim Temel Kanunu, Özel Eğitim Hizmetleri Yönetmeliği',
    content: [
      'Fiziksel erişilebilirlik: Okul binaları erişilebilir olmalıdır. Asansör, rampa, engelli WC zorunludur.',
      'Sınav uyarlaması: Gereksinime göre uzatılmış sınav süresi, ayrı sınav salonu ve özel materyal hakkı vardır.',
      'Sınıf geçme: Otizmli öğrenciler için farklı değerlendirme ölçütleri uygulanabilir; BEP\'te belirlenen hedefler esas alınır.',
      'Disiplin uygulamaları: Engellilik durumu disiplin kararlarında göz önünde bulundurulmalıdır.',
      'Velinin bilgilendirilmesi: Tüm BEP toplantılarına davet edilme, kararlara itiraz etme ve yazılı bilgi talep etme hakkınız var.',
      'Şiddet ve zorbalık: Okul, otizmli öğrenciye yönelik zorbalığı önlemek ve raporlamakla yükümlüdür.',
    ],
    warnings: [
      'Sözlü vaatler işe yaramaz — her talebinizi ve okul yanıtını yazılı/e-posta ile belgeleyin.',
      'Okul müdürünün "sınav uyarlaması yapamayız" demesi hukuka aykırıdır; bu haklar BEP\'te yer aldığında uygulanmak zorundadır.',
    ],
    faq: [
      { q: 'Çocuğum sınav kaygısı yaşıyor, ne yapabilirim?', a: 'BEP\'te uzatılmış sınav süresi ve ayrı sınav ortamı talep edilebilir. Bu yasal bir haktır.' },
      { q: 'Okul disiplin cezası tehdidinde bulunuyor, ne yapabilirim?', a: 'Engellilik durumu dikkate alınmak zorundadır. Okul müdürüne yazılı başvurun; sonuç alınamazsa İlçe MEB\'e bildirin.' },
    ],
    template: {
      title: 'Sınav Uyarlama Talep Dilekçesi',
      body: `[OKUL ADI] MÜDÜRLÜĞÜNE

[ÖĞRENCİ ADI SOYADI] adlı öğrencinin velisiyim. Çocuğum, [TANISI] tanısına sahip olup BEP kapsamında eğitim almaktadır.

Yaklaşan sınavlarda aşağıdaki uyarlamaların yapılmasını talep ediyorum:
- [ ] Uzatılmış sınav süresi (%50 ek süre)
- [ ] Ayrı sınav salonu
- [ ] Soru kağıdının büyük punto ile basılması
- [ ] Özel materyal kullanımına izin verilmesi

Özel Eğitim Hizmetleri Yönetmeliği'nin ilgili maddeleri uyarınca talebimin karşılanmasını saygıyla arz ederim.

[TARİH]
[AD SOYAD — İMZA]`,
    },
    tags: ['okul', 'sınav', 'disiplin', 'erişilebilirlik', 'zorbalık'],
    related: [
      { id: 'bep', label: 'BEP Hakkı' },
      { id: 'kaynastirma', label: 'Kaynaştırma' },
    ],
  },
  {
    id: 'sigorta',
    category: 'Sağlık Hakkı',
    icon: '🏥',
    title: 'SGK Sağlık Hakları ve Otizm Tedavisi',
    summary: 'SGK kapsamındaki tedavi ve ürünlerden nasıl yararlanırsınız?',
    priority: 'medium',
    difficulty: 'orta',
    law: '5510 sayılı SGK Kanunu, Sağlık Uygulama Tebliği (SUT)',
    content: [
      'Otizm tanısı için SGK kapsamında hekim yönlendirmesiyle psikolog, psikiyatrist ve çocuk nörolojisi görüşmeleri karşılanmaktadır.',
      'İlaç tedavileri: SGK, çocuk psikiyatristi tarafından yazılan ilaçların büyük bölümünü karşılar.',
      'Görme/işitme engeli eşliğindeki otizmde işitme cihazı vb. yardımcı araçlar SGK tarafından karşılanabilir.',
      'Özel hastane farkı: Anlaşmalı özel hastanelerde katılım payı ödenir; anlaşmasız hastanelerde SGK geri ödemesi sınırlıdır.',
      'İkinci görüş hakkı: Tanı veya tedavi planı konusunda başka bir devlet hastanesinde ikinci görüş talep edebilirsiniz.',
      'Sağlık kurulu raporu, SGK\'nın bazı ürün ve hizmetleri karşılaması için zorunludur.',
    ],
    warnings: [
      'Özel hastaneye gitmeden önce SGK anlaşması olup olmadığını mutlaka sorun — anlaşmasız hastanede büyük ücretler cebinizden çıkabilir.',
    ],
    links: [{ label: 'SGK ALO 170', phone: '170' }],
    tags: ['SGK', 'sağlık', 'ilaç', 'sigorta'],
    related: [{ id: 'engelli-kimlik', label: 'Engelli Raporu' }],
  },
  {
    id: 'ulasim',
    category: 'Sosyal Haklar',
    icon: '🚌',
    title: 'Ulaşım ve Seyahat İndirimleri',
    summary: 'Engelli kimlik kartıyla yararlanabileceğiniz ulaşım hakları.',
    priority: 'medium',
    difficulty: 'kolay',
    law: '5378 sayılı Engelliler Hakkında Kanun, Md. 32',
    content: [
      'Belediye otobüsleri, metro ve tramvay gibi şehiriçi toplu taşıma araçlarında ücretsiz ya da indirimli seyahat hakkı bulunmaktadır.',
      'Ağır engellilik raporuna sahip kişi ve bir refakatçisi yurt içi havayolu tarifeli seferlerde %25 indirimden yararlanabilir.',
      'TCDD (Devlet Demiryolları) seferlerinde ağır engelliler için %50 indirim uygulanmaktadır.',
      'Çocuğun bakıcı veya anne/babası da bazı ulaşım haklarında ücretsiz ya da indirimli faydalanabilir.',
      'Yurt dışı seyahatlerde uluslararası yeşil engelli kartı (ISMNI) bazı ayrıcalıklar sağlar.',
    ],
    warnings: [
      'Her şehirde ulaşım uygulaması farklıdır — bulunduğunuz ilin belediyesinin engelli ulaşım kartı prosedürünü ayrıca öğrenin.',
    ],
    tags: ['ulaşım', 'toplu taşıma', 'uçak', 'tren', 'indirim'],
    related: [{ id: 'engelli-kimlik', label: 'Engelli Kimlik Kartı' }],
  },
  {
    id: 'istihdam',
    category: 'İstihdam',
    icon: '👔',
    title: 'Engelli Bireylerin İstihdam Hakları',
    summary: 'Büyümekte olan otizmli bireyler için iş hayatındaki yasal güvenceler.',
    priority: 'low',
    difficulty: 'zor',
    law: '4857 sayılı İş Kanunu, Md. 30; 5378 sayılı Engelliler Kanunu',
    content: [
      '50 ve üzeri çalışanı olan işyerleri toplam çalışanlarının %3\'ü oranında engelli işçi çalıştırmak zorundadır (4857 sayılı İş Kanunu).',
      'Engelli bireyin çalışmaya başlaması, bazı sosyal yardımlarda kesintiye yol açabilir. Kurum danışmanlığı alın.',
      'İŞKUR engelli istihdamına yönelik destekler sunmaktadır: mesleki eğitim, iş ve meslek danışmanlığı, işe yerleştirme.',
      'Korumalı iş yerleri: Ağır engelliler için özel çalışma ortamları düzenleyen korumalı işyeri desteği mevcuttur.',
      'Engelli çalışan, ayrımcılığa karşı yasal güvenceye sahiptir. İşyerinde makul düzenleme talep etme hakkı bulunmaktadır.',
    ],
    warnings: [
      'Çalışmaya başlamadan önce bakım ücreti, aylık gibi mevcut yardımların kesilip kesilmeyeceğini İl Müdürlüğü\'ne danışın.',
    ],
    links: [{ label: 'İŞKUR Engelli İstihdamı', url: 'https://www.iskur.gov.tr' }],
    tags: ['istihdam', 'iş', 'İŞKUR', '4857'],
    related: [{ id: 'maas', label: 'Mali Destekler' }],
  },
  {
    id: 'cocuk-haklar',
    category: 'Çocuk Hakları',
    icon: '🧒',
    title: 'BM Çocuk Hakları Sözleşmesi ve Türkiye',
    summary: 'Uluslararası sözleşmelerle güvence altındaki çocuk hakları.',
    priority: 'medium',
    difficulty: 'kolay',
    law: 'BM Çocuk Hakları Sözleşmesi (1989), CRPD (2009)',
    content: [
      'Türkiye, BM Çocuk Hakları Sözleşmesi\'ni onaylamıştır. Bu sözleşme, engelli çocukların eğitim, sağlık ve sosyal katılım haklarını güvence altına alır.',
      'Engelli Hakları Sözleşmesi (CRPD): Türkiye 2009\'da imzaladı. Engelli çocukların kapsayıcı eğitim hakkı açıkça belirtilmiştir.',
      'Çocuğun yüksek yararı ilkesi: Herhangi bir devlet kurumunun kararında çocuğun yüksek yararı öncelikli olmak zorundadır.',
      'Çocuğun görüşü: Gelişim düzeyine uygun şekilde çocuğun kendi geleceğine dair görüşü alınmalıdır.',
      'Ayrımcılık yasağı: Engellilik nedeniyle hiçbir hizmet, eğitim veya sosyal olaydan dışlanamaz.',
    ],
    tags: ['BM', 'çocuk hakları', 'sözleşme', 'uluslararası'],
    related: [{ id: 'sikayet-yollari', label: 'Hak İhlali Şikayeti' }],
  },
  {
    id: 'sikayet-yollari',
    category: 'Başvuru & Şikayet',
    icon: '⚖️',
    title: 'Hak İhlali Durumunda Ne Yapmalısınız?',
    summary: 'Haklarınız çiğnendiğinde başvurabileceğiniz yollar ve kurumlar.',
    priority: 'high',
    difficulty: 'orta',
    law: '2577 sayılı İdari Yargılama Kanunu, Ombudsman Kanunu',
    content: [
      'Önce ilgili kuruma yazılı başvuru yapın ve yanıt süresini (genellikle 30 gün) bekleyin.',
      'CİMER: Kurumların yanıt vermediği durumlarda cimer.gov.tr üzerinden şikayet.',
      'Kamu Denetçiliği Kurumu (Ombudsman): İdari işlemlerdeki hak ihlalleri için bağımsız inceleme.',
      'İdare Mahkemesi: İdari kararlara karşı iptal davası açılabilir.',
      'Türkiye İnsan Hakları ve Eşitlik Kurumu (TİHEK): Ayrımcılık vakalarında başvurulabilir.',
      'MEBİM 444 0 632 — Eğitim haklarıyla ilgili bilgi ve başvuru yönlendirmesi için.',
    ],
    warnings: [
      'Tüm yazışmaları saklayın — ileride mahkeme veya ombudsman başvurusunda kanıt olarak gerekecek.',
      'Şikayet dilekçenizi teslim ederken mutlaka imzalı alındı belgesi alın.',
    ],
    steps: [
      { title: 'Yazılı Başvuru', description: 'İlgili kuruma yazılı dilekçe verin. İmzalı alındı belgesi isteyin.' },
      { title: 'Yanıt Bekleyin', description: 'Devlet kurumları 30 gün içinde yanıt vermek zorundadır.' },
      { title: 'Üst Kuruma Başvuru', description: 'Okul yanıt vermezse İlçe MEB, vermezse İl MEB\'e çıkın.' },
      { title: 'CİMER / Ombudsman', description: 'Tüm yollar tıkandıysa CİMER veya Kamu Denetçiliği\'ne başvurun.' },
      { title: 'Hukuki Destek', description: 'Gerekirse baro üzerinden adli yardım veya ücretsiz hukuki danışmanlık alın.' },
    ],
    template: {
      title: 'Genel Hak İhlali Şikayet Dilekçesi',
      body: `[KURUM ADI VE ADRESİ]

KONU: [Örn: BEP Toplantısına Davet Edilmeme Şikayeti]
[TARİH]

Sayın Yetkili,

[ÖĞRENCİ ADI] (T.C.: [TC NO]) adlı çocuğumun velisiyim.
[YAŞANAN SORUNU AÇIKLAYIN].

Söz konusu durum, [İLGİLİ MEVZUAT] kapsamındaki haklarımı ihlal etmektedir.

[TALEBİNİZİ YAZIN] talebimi saygıyla arz eder, yazılı yanıt beklediğimi bildiririm.

[AD SOYAD — İMZA]
İletişim: [TELEFON / E-POSTA]
Ek: [BELGELERİ LİSTELEYİN]`,
    },
    links: [
      { label: 'CİMER Online', url: 'https://www.cimer.gov.tr' },
      { label: 'Ombudsman', url: 'https://www.ombudsman.gov.tr' },
      { label: 'MEBİM', phone: '4440632' },
    ],
    tags: ['şikayet', 'hak ihlali', 'ombudsman', 'CİMER', 'mahkeme'],
    related: [
      { id: 'destek-kurumlar', label: 'Destek Kurumlar' },
    ],
  },
  {
    id: 'destek-kurumlar',
    category: 'Başvuru & Şikayet',
    icon: '📞',
    title: 'Destek Kurum ve Hatları',
    summary: 'Sorun yaşadığınızda nereden yardım alacağınızı bilin.',
    priority: 'high',
    difficulty: 'kolay',
    content: [
      'ALO 183 — Sosyal Destek Hattı: Bakanlığın sosyal yardım ve destek bilgi hattı.',
      'MEBİM 444 0 632 — Eğitim hakları ve başvuru yönlendirmeleri için.',
      'CİMER — Cumhurbaşkanlığı İletişim Merkezi: Çözülemeyen sorunlar için.',
      'Kamu Denetçiliği Kurumu (Ombudsman): İdari işlemlerdeki hak ihlalleri için.',
      'Türkiye Otizm Derneği (OTİZM-DER): Destek, bilgi ve hukuki danışmanlık.',
      'Tohum Otizm Vakfı: Eğitim, aile destek programları ve bilgi kaynakları.',
      'AÇEV: Aile ve çocuk eğitimi konusunda kaynaklar sunar.',
    ],
    links: [
      { label: 'ALO 183', phone: '183' },
      { label: 'MEBİM', phone: '4440632' },
      { label: 'CİMER', url: 'https://www.cimer.gov.tr' },
      { label: 'Tohum Otizm Vakfı', url: 'https://www.tohumotizm.org.tr' },
      { label: 'OTİZM-DER', url: 'https://www.otizmder.org' },
    ],
    tags: ['yardım', 'iletişim', 'şikayet', 'dernek', 'vakıf'],
    related: [{ id: 'sikayet-yollari', label: 'Şikayet Yolları' }],
  },
];

// ─── Onboarding steps ─────────────────────────────────────────────────────────

const ONBOARDING_STEPS = [
  { step: 1, icon: '🔬', title: 'Tanı Alın', desc: 'Çocuk psikiyatristi veya nörologdan resmi otizm tanısı alın.', articleId: 'sigorta' },
  { step: 2, icon: '🏫', title: 'RAM\'a Başvurun', desc: 'Tanı belgesiyle bölgenizdeki RAM\'a giderek eğitim değerlendirmesi yaptırın.', articleId: 'ram' },
  { step: 3, icon: '🪪', title: 'Engelli Raporu Alın', desc: 'Devlet hastanesinden engelli sağlık kurulu raporu alarak hakları aktive edin.', articleId: 'engelli-kimlik' },
];

// ─── Checklist ────────────────────────────────────────────────────────────────

const CHECKLIST_ITEMS: ChecklistItem[] = [
  { id: 'c1', label: 'Engelli sağlık kurulu raporunu aldım', category: 'Belgeler' },
  { id: 'c2', label: 'Engelli kimlik kartı başvurusu yaptım', category: 'Belgeler' },
  { id: 'c3', label: 'RAM\'a başvurdum ve değerlendirme raporumu aldım', category: 'Eğitim' },
  { id: 'c4', label: 'BEP toplantısına katıldım ve BEP\'i inceledim', category: 'Eğitim' },
  { id: 'c5', label: 'Özel eğitim desteği başvurusu yaptım', category: 'Eğitim' },
  { id: 'c6', label: 'Bakım ücreti başvurusu için Aile Bakanlığı\'na gittim', category: 'Mali' },
  { id: 'c7', label: 'SGK haklarımı öğrendim ve gerekli adımları attım', category: 'Sağlık' },
  { id: 'c8', label: 'Ücretsiz toplu taşıma kartı edindim', category: 'Sosyal' },
];

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES = [
  'Tümü', 'Eğitim Hakkı', 'Değerlendirme', 'Sosyal Haklar',
  'Mali Destek', 'Sağlık Hakkı', 'İstihdam', 'Çocuk Hakları', 'Başvuru & Şikayet',
];

const CATEGORY_META: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  'Eğitim Hakkı':      { icon: GraduationCap, color: 'text-blue-600',   bg: 'bg-blue-50 border-blue-200' },
  'Değerlendirme':     { icon: ClipboardList,  color: 'text-violet-600', bg: 'bg-violet-50 border-violet-200' },
  'Sosyal Haklar':     { icon: Heart,          color: 'text-pink-600',   bg: 'bg-pink-50 border-pink-200' },
  'Mali Destek':       { icon: Award,          color: 'text-amber-600',  bg: 'bg-amber-50 border-amber-200' },
  'Sağlık Hakkı':      { icon: Stethoscope,    color: 'text-red-600',    bg: 'bg-red-50 border-red-200' },
  'İstihdam':          { icon: Briefcase,      color: 'text-teal-600',   bg: 'bg-teal-50 border-teal-200' },
  'Çocuk Hakları':     { icon: Baby,           color: 'text-orange-600', bg: 'bg-orange-50 border-orange-200' },
  'Başvuru & Şikayet': { icon: Scale,          color: 'text-indigo-600', bg: 'bg-indigo-50 border-indigo-200' },
};

const PRIORITY_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 };

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Fix 2: Türkçe normalize arama
function normalizeTR(str: string): string {
  return str
    .toLocaleLowerCase('tr-TR')
    .replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ı/g, 'i')
    .replace(/ö/g, 'o').replace(/ş/g, 's').replace(/ü/g, 'u');
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  // Fix 5: clipboard hata yönetimi
  const copy = useCallback(() => {
    navigator.clipboard.writeText(text)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => {
        // HTTPS zorunluluğu veya izin reddi durumunda fallback
        try {
          const ta = document.createElement('textarea');
          ta.value = text;
          ta.style.position = 'fixed';
          ta.style.opacity = '0';
          document.body.appendChild(ta);
          ta.select();
          document.execCommand('copy');
          document.body.removeChild(ta);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          alert('Kopyalama desteklenmiyor. Lütfen metni manuel olarak seçin.');
        }
      });
  }, [text]);
  return (
    <button onClick={copy}
      className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-indigo-600 transition-colors px-2 py-1 rounded-lg hover:bg-indigo-50">
      {copied ? <><Check size={12} className="text-green-500" />Kopyalandı</> : <><Copy size={12} />Kopyala</>}
    </button>
  );
}

// ─── ArticleCard ──────────────────────────────────────────────────────────────

function ArticleCard({
  article, isExpanded, isBookmarked, onToggle, onBookmark, onTagClick, onRelatedClick,
}: {
  article: RightsArticle;
  isExpanded: boolean;
  isBookmarked: boolean;
  onToggle: () => void;
  onBookmark: () => void;
  onTagClick: (tag: string) => void;
  onRelatedClick: (id: string) => void;
}) {
  const [activeTab, setActiveTab] = useState<'content' | 'steps' | 'faq' | 'template' | 'warnings'>('content');
  const catMeta = CATEGORY_META[article.category];
  const CatIcon = catMeta?.icon ?? FileText;

  const priorityMeta = article.priority === 'high'
    ? { label: 'Öncelikli', cls: 'text-red-600 bg-red-50 border-red-200' }
    : article.priority === 'medium'
    ? { label: 'Önemli', cls: 'text-amber-600 bg-amber-50 border-amber-200' }
    : { label: 'Bilgi', cls: 'text-gray-500 bg-gray-50 border-gray-200' };

  const difficultyMeta = article.difficulty === 'kolay'
    ? 'text-green-600 bg-green-50'
    : article.difficulty === 'orta'
    ? 'text-amber-600 bg-amber-50'
    : 'text-red-600 bg-red-50';

  const tabs = [
    { key: 'content', label: 'Detay', show: true },
    { key: 'warnings', label: `⚠️ Uyarılar (${article.warnings?.length ?? 0})`, show: !!article.warnings?.length },
    { key: 'steps', label: 'Adım Adım', show: !!article.steps },
    { key: 'faq', label: 'SSS', show: !!article.faq },
    { key: 'template', label: '📄 Dilekçe', show: !!article.template },
  ] as const;

  // Reset tab when card collapses
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!isExpanded) setActiveTab('content');
  }, [isExpanded]);

  return (
    <div
      id={`article-${article.id}`}
      className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all duration-200 ${
        isExpanded ? 'border-indigo-200 shadow-indigo-100 shadow-md' : 'border-gray-100 hover:border-indigo-100 hover:shadow-md'
      }`}
    >
      {/* Card Header — tüm alan tıklanabilir */}
      <button
        onClick={onToggle}
        className="w-full text-left p-5 hover:bg-gray-50 transition-colors cursor-pointer"
      >
        <div className="flex items-start gap-4">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 text-xl border ${catMeta?.bg ?? 'bg-gray-50 border-gray-200'}`}>
            {article.icon}
          </div>
          <div className="flex-1 min-w-0">
            {/* Badges */}
            <div className="flex items-center gap-2 flex-wrap mb-1.5">
              <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${catMeta?.bg} ${catMeta?.color}`}>
                <CatIcon size={10} />{article.category}
              </span>
              {article.priority && (
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${priorityMeta.cls}`}>
                  {priorityMeta.label}
                </span>
              )}
              {article.difficulty && (
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${difficultyMeta}`}>
                  {article.difficulty}
                </span>
              )}
              {article.duration && (
                <span className="inline-flex items-center gap-1 text-xs text-gray-500 bg-gray-50 px-2 py-0.5 rounded-full">
                  <Clock size={9} />⏱ {article.duration}
                </span>
              )}
            </div>
            <h3 className="font-bold text-gray-900 leading-snug text-sm sm:text-base">{article.title}</h3>
            <p className="text-sm text-gray-500 mt-1 leading-relaxed">{article.summary}</p>
            {article.law && (
              <p className="text-[11px] text-indigo-500 mt-1.5 font-medium">📜 {article.law}</p>
            )}
          </div>
          {/* Bookmark + Expand */}
          <div className="flex items-center gap-1 shrink-0">
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => { e.stopPropagation(); onBookmark(); }}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); onBookmark(); } }}
              className={`p-2 rounded-xl transition-all ${isBookmarked ? 'text-indigo-600 bg-indigo-50' : 'text-gray-400 hover:text-indigo-500 hover:bg-indigo-50'}`}
            >
              {isBookmarked ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
            </span>
            <span className="p-2 rounded-xl text-gray-400 group-hover:text-gray-600 transition-all">
              {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </span>
          </div>
        </div>
      </button>

      {/* Expanded body */}
      {isExpanded && (
        <div className="border-t border-gray-100">
          {/* Tabs */}
          <div className="flex gap-0 border-b border-gray-100 px-4 overflow-x-auto">
            {tabs.filter((t) => t.show).map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as typeof activeTab)}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.key ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="p-5 space-y-4">
            {/* Content */}
            {activeTab === 'content' && (
              <ul className="space-y-3">
                {article.content.map((item, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="w-5 h-5 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">{i + 1}</span>
                    <p className="text-sm text-gray-700 leading-relaxed">{item}</p>
                  </li>
                ))}
              </ul>
            )}

            {/* Warnings */}
            {activeTab === 'warnings' && article.warnings && (
              <div className="space-y-3">
                {article.warnings.map((w, i) => (
                  <div key={i} className="flex gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
                    <AlertCircle size={16} className="text-amber-500 shrink-0 mt-0.5" />
                    <p className="text-sm text-amber-800 leading-relaxed">{w}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Steps */}
            {activeTab === 'steps' && article.steps && (
              <div className="space-y-0">
                {article.steps.map((step, i) => (
                  <div key={i} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center text-sm font-bold shrink-0">
                        {i + 1}
                      </div>
                      {i < article.steps!.length - 1 && <div className="w-0.5 flex-1 bg-indigo-100 my-1" />}
                    </div>
                    <div className="pb-5">
                      <p className="font-semibold text-gray-900 text-sm">{step.title}</p>
                      <p className="text-sm text-gray-600 mt-0.5 leading-relaxed">{step.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* FAQ */}
            {activeTab === 'faq' && article.faq && (
              <div className="space-y-3">
                {article.faq.map((item, i) => (
                  <div key={i} className="bg-gray-50 rounded-xl p-4">
                    <p className="font-semibold text-gray-900 text-sm flex gap-2">
                      <span className="text-indigo-500 shrink-0">S:</span>{item.q}
                    </p>
                    <p className="text-sm text-gray-600 mt-2 leading-relaxed flex gap-2">
                      <span className="text-green-600 font-bold shrink-0">C:</span>{item.a}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Template */}
            {activeTab === 'template' && article.template && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="font-semibold text-gray-800 text-sm">{article.template.title}</p>
                  <CopyButton text={article.template.body} />
                </div>
                <pre className="text-xs text-gray-700 bg-gray-50 rounded-xl p-4 whitespace-pre-wrap font-mono leading-relaxed border border-gray-200">
                  {article.template.body}
                </pre>
                <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                  <Info size={11} />Köşeli parantez içindeki alanları kendi bilgilerinizle doldurun.
                </p>
              </div>
            )}

            {/* Links */}
            {article.links && article.links.length > 0 && (
              <div className="pt-2 border-t border-gray-100">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Başvuru & Kaynaklar</p>
                <div className="flex flex-wrap gap-2">
                  {article.links.map((link, i) =>
                    link.url ? (
                      <a key={i} href={link.url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-xl transition-colors">
                        <ExternalLink size={13} />{link.label}
                      </a>
                    ) : (
                      <a key={i} href={`tel:${link.phone}`}
                        className="flex items-center gap-1.5 text-sm text-green-700 bg-green-50 hover:bg-green-100 px-3 py-1.5 rounded-xl transition-colors">
                        <Phone size={13} />{link.label}: {link.phone}
                      </a>
                    )
                  )}
                </div>
              </div>
            )}

            {/* Tags — clickable */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {article.tags.map((tag) => (
                <button key={tag} onClick={() => onTagClick(tag)}
                  className="text-[11px] bg-gray-100 hover:bg-indigo-100 hover:text-indigo-600 text-gray-500 px-2 py-0.5 rounded-full transition-colors cursor-pointer">
                  #{tag}
                </button>
              ))}
            </div>

            {/* Related articles */}
            {article.related && article.related.length > 0 && (
              <div className="pt-2 border-t border-gray-100">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1">
                  <Link2 size={11} />Bunları da inceleyin
                </p>
                <div className="flex flex-wrap gap-2">
                  {article.related.map((rel) => (
                    <button key={rel.id} onClick={() => onRelatedClick(rel.id)}
                      className="flex items-center gap-1.5 text-sm text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-xl transition-colors">
                      <ChevronDown size={12} className="-rotate-90" />{rel.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function RightsGuidePage() {
  // Fix 3 + Fix 4: clearAll ve dismissOnboarding store'dan alınıyor
  const { bookmarks, checkedItems, onboardingDismissed, toggleBookmark, toggleCheck, clearAll, dismissOnboarding } = useRightsStore();
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('Tümü');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showOnlyBookmarks, setShowOnlyBookmarks] = useState(false);
  const [activeView, setActiveView] = useState<'guide' | 'checklist'>('guide');
  const [sortKey, setSortKey] = useState<SortKey>('priority');
  const [showSortMenu, setShowSortMenu] = useState(false);
  // Fix 1: sort dropdown click-outside ref
  const sortMenuRef = useRef<HTMLDivElement>(null);

  const bookmarkSet = useMemo(() => new Set(bookmarks), [bookmarks]);
  const checkedSet = useMemo(() => new Set(checkedItems), [checkedItems]);

  // Fix 1: sort dropdown click-outside ile kapat
  useEffect(() => {
    if (!showSortMenu) return;
    const handleClick = (e: MouseEvent) => {
      if (sortMenuRef.current && !sortMenuRef.current.contains(e.target as Node)) {
        setShowSortMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showSortMenu]);

  const handleTagClick = useCallback((tag: string) => {
    setSearch(tag);
    setActiveCategory('Tümü');
    setActiveView('guide');
  }, []);

  const handleRelatedClick = useCallback((id: string) => {
    setExpandedId(id);
    setActiveCategory('Tümü');
    setSearch('');
    setTimeout(() => {
      document.getElementById(`article-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  }, []);

  const filtered = useMemo(() => {
    let list = ARTICLES.filter((a) => {
      if (showOnlyBookmarks && !bookmarkSet.has(a.id)) return false;
      const matchCat = activeCategory === 'Tümü' || a.category === activeCategory;
      // Fix 2: Türkçe normalize ile arama
      const q = normalizeTR(search);
      const matchSearch = !q
        || normalizeTR(a.title).includes(q)
        || normalizeTR(a.summary).includes(q)
        || a.tags.some((t) => normalizeTR(t).includes(q))
        || a.content.some((c) => normalizeTR(c).includes(q));
      return matchCat && matchSearch;
    });

    if (sortKey === 'priority') {
      list = [...list].sort((a, b) => (PRIORITY_ORDER[a.priority ?? 'low'] ?? 2) - (PRIORITY_ORDER[b.priority ?? 'low'] ?? 2));
    } else if (sortKey === 'alpha') {
      list = [...list].sort((a, b) => a.title.localeCompare(b.title, 'tr'));
    } else if (sortKey === 'category') {
      list = [...list].sort((a, b) => a.category.localeCompare(b.category, 'tr'));
    }
    return list;
  }, [search, activeCategory, bookmarkSet, showOnlyBookmarks, sortKey]);

  const checklistProgress = Math.round((checkedItems.length / CHECKLIST_ITEMS.length) * 100);

  const stats = useMemo(() => ({
    total: ARTICLES.length,
    categories: CATEGORIES.length - 1,
    highPriority: ARTICLES.filter((a) => a.priority === 'high').length,
    withTemplate: ARTICLES.filter((a) => a.template).length,
  }), []);

  const sortLabels: Record<SortKey, string> = { priority: 'Önceliğe göre', alpha: 'Alfabetik', category: 'Kategoriye göre' };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageOnboarding
        pageId="rights_guide"
        title="Haklar ve Kurumlar Rehberi"
        description="Otizmli bireylerin yasal hakları, eğitim güvenceleri ve başvuru süreçleri hakkında detaylı bilgi edinin."
        steps={[
          {
            icon: <Scale size={20} />,
            title: "Yasal Hakları Öğrenin",
            description: "Eğitim, sağlık ve sosyal yaşam alanındaki haklarınızı ilgili yasal dayanaklarıyla inceleyin."
          },
          {
            icon: <CheckSquare size={20} />,
            title: "Kontrol Listesini Kullanın",
            description: "Tanı sonrası yapılması gereken resmi işlemleri adım adım takip edin."
          },
          {
            icon: <FileText size={20} />,
            title: "Dilekçe Şablonları",
            description: "Resmi kurumlara başvururken kullanabileceğiniz hazır dilekçe şablonlarını kopyalayın."
          }
        ]}
      />

      {/* Hero */}
      <div className="relative bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-700 rounded-3xl p-6 sm:p-8 text-white overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: 'radial-gradient(circle at 80% 20%, white 1px, transparent 1px), radial-gradient(circle at 20% 80%, white 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }} />
        <div className="relative">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center shrink-0">
                <Scale size={20} />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold">Haklar & Kurumlar Rehberi</h1>
                <p className="text-indigo-200 text-sm">Türkiye'de otizm ailelerinin yasal hakları</p>
              </div>
            </div>
            <div className="shrink-0 text-right hidden sm:block">
              <span className="inline-flex items-center gap-1.5 bg-white/15 border border-white/20 rounded-xl px-3 py-1.5 text-xs text-indigo-100">
                <Clock size={11} />Son güncelleme: {RIGHTS_LAST_UPDATED}
              </span>
              <p className="text-indigo-300 text-[10px] mt-1">Kaynak: MEB · SGK · Aile Bakanlığı · CİMER</p>
            </div>
          </div>
          <div className="flex items-center gap-2 mb-3 sm:hidden">
            <span className="inline-flex items-center gap-1 bg-white/15 rounded-lg px-2 py-1 text-[11px] text-indigo-100">
              <Clock size={10} />{RIGHTS_LAST_UPDATED}
            </span>
            <span className="text-[11px] text-indigo-300">MEB · SGK · Aile · CİMER</span>
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-4">
            <span className="inline-flex items-center gap-1.5 bg-emerald-400/20 border border-emerald-200/30 rounded-xl px-3 py-1.5 text-xs text-emerald-50 font-semibold">
              <Check size={12} />Doğrulanmış veri
            </span>
            {RIGHTS_SOURCES.map((source) => (
              <a
                key={source.url}
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 bg-white/10 hover:bg-white/15 border border-white/15 rounded-xl px-3 py-1.5 text-xs text-indigo-50 transition-colors"
              >
                {source.label}<ExternalLink size={11} />
              </a>
            ))}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
            {[
              { label: 'Hak & Bilgi', value: stats.total },
              { label: 'Kategori', value: stats.categories },
              { label: 'Öncelikli', value: stats.highPriority },
              { label: 'Dilekçe', value: stats.withTemplate },
            ].map((s) => (
              <div key={s.label} className="bg-white/10 rounded-2xl p-3 backdrop-blur-sm">
                <p className="text-2xl font-bold">{s.value}</p>
                <p className="text-indigo-200 text-xs mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Onboarding Banner — Fix 4: persist store kullanılıyor ── */}
      {!onboardingDismissed && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-indigo-200 rounded-2xl p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <Lightbulb size={18} className="text-indigo-500" />
              <p className="font-semibold text-indigo-800 text-sm">Nereden Başlamalıyım?</p>
            </div>
            <button onClick={dismissOnboarding} className="text-gray-400 hover:text-gray-600 transition-colors">
              <X size={16} />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {ONBOARDING_STEPS.map((s) => (
              <button key={s.step} onClick={() => { handleRelatedClick(s.articleId); setActiveView('guide'); }}
                className="text-left bg-white rounded-xl p-4 border border-indigo-100 hover:border-indigo-300 hover:shadow-sm transition-all group">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="w-5 h-5 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-xs font-bold">{s.step}</span>
                  <span className="text-base">{s.icon}</span>
                  <span className="font-semibold text-gray-800 text-sm group-hover:text-indigo-700 transition-colors">{s.title}</span>
                </div>
                <p className="text-xs text-gray-500 leading-relaxed">{s.desc}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Warning */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex gap-3">
        <AlertTriangle size={18} className="text-amber-500 shrink-0 mt-0.5" />
        <p className="text-sm text-amber-800 leading-relaxed">
          Bu rehber <strong>genel bilgi amaçlıdır</strong>. Hukuki süreçler için bağımsız bir avukata veya ilgili kurumlara başvurun.
        </p>
      </div>

      {/* View toggle */}
      <div className="flex gap-2 bg-gray-100 p-1 rounded-xl w-fit">
        <button onClick={() => setActiveView('guide')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeView === 'guide' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
          📚 Rehber
        </button>
        <button onClick={() => setActiveView('checklist')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeView === 'checklist' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
          ✅ Kontrol Listesi {checkedItems.length > 0 && `(${checkedItems.length}/${CHECKLIST_ITEMS.length})`}
        </button>
      </div>

      {/* ══ GUIDE VIEW ══ */}
      {activeView === 'guide' && (
        <div className="space-y-4">
          {/* Search + actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="BEP, RAM, engelli kimlik, bakım ücreti…"
                className="w-full pl-9 pr-9 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white" />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X size={14} />
                </button>
              )}
            </div>
            {/* Sort — Fix 1: ref ile click-outside */}
            <div className="relative" ref={sortMenuRef}>
              <button onClick={() => setShowSortMenu((v) => !v)}
                className="flex items-center gap-2 text-sm font-medium px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-600 hover:border-gray-300 transition-all w-full sm:w-auto">
                <ArrowUpDown size={14} />{sortLabels[sortKey]}
              </button>
              {showSortMenu && (
                <div className="absolute right-0 top-full mt-1 bg-white rounded-xl border border-gray-200 shadow-lg z-10 min-w-[170px]">
                  {(Object.entries(sortLabels) as [SortKey, string][]).map(([k, label]) => (
                    <button key={k} onClick={() => { setSortKey(k); setShowSortMenu(false); }}
                      className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 first:rounded-t-xl last:rounded-b-xl transition-colors ${sortKey === k ? 'font-semibold text-indigo-600' : 'text-gray-700'}`}>
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button onClick={() => setShowOnlyBookmarks((v) => !v)}
              className={`flex items-center gap-2 text-sm font-medium px-4 py-2.5 rounded-xl border transition-all ${showOnlyBookmarks ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'}`}>
              <Bookmark size={14} />Kaydedilenler {bookmarks.length > 0 && `(${bookmarks.length})`}
            </button>
            <button onClick={() => window.print()}
              className="flex items-center gap-2 text-sm font-medium px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-600 hover:border-gray-300 transition-all">
              <Printer size={14} />Yazdır
            </button>
          </div>

          {/* Category pills */}
          <div className="flex gap-2 flex-wrap">
            {CATEGORIES.map((cat) => {
              const meta = CATEGORY_META[cat];
              const Icon = meta?.icon;
              return (
                <button key={cat} onClick={() => setActiveCategory(cat)}
                  className={`flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-full border transition-all cursor-pointer ${
                    activeCategory === cat
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300 hover:text-indigo-600'
                  }`}>
                  {Icon && <Icon size={12} />}{cat}
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              {filtered.length} sonuç {showOnlyBookmarks && '· Kaydedilenleri gösteriyor'}
            </p>
            {search && (
              <button onClick={() => setSearch('')} className="text-sm text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
                <X size={12} />Aramayı temizle
              </button>
            )}
          </div>

          {/* Articles */}
          <div className="space-y-3">
            {filtered.map((article) => (
              <ArticleCard
                key={article.id}
                article={article}
                isExpanded={expandedId === article.id}
                isBookmarked={bookmarkSet.has(article.id)}
                onToggle={() => setExpandedId(expandedId === article.id ? null : article.id)}
                onBookmark={() => toggleBookmark(article.id)}
                onTagClick={handleTagClick}
                onRelatedClick={handleRelatedClick}
              />
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
              <p className="text-5xl mb-4">🔍</p>
              <p className="text-gray-700 font-medium">Sonuç bulunamadı</p>
              <p className="text-gray-400 text-sm mt-1">
                {showOnlyBookmarks ? 'Kaydedilen içerik yok.' : 'Farklı anahtar kelimeler deneyin.'}
              </p>
              {/* Fix 6: aktif filtreler varsa tam temizle butonu */}
              {(search || activeCategory !== 'Tümü' || showOnlyBookmarks) && (
                <button
                  onClick={() => { setSearch(''); setActiveCategory('Tümü'); setShowOnlyBookmarks(false); }}
                  className="mt-4 inline-flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-800 font-medium px-4 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 transition-colors"
                >
                  <X size={13} /> Tüm Filtreleri Temizle
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* ══ CHECKLIST VIEW ══ */}
      {activeView === 'checklist' && (
        <div className="space-y-4">
          {/* Progress card */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="font-bold text-gray-900">İlerleme Durumunuz</h2>
                <p className="text-sm text-gray-500 mt-0.5">{checkedItems.length} / {CHECKLIST_ITEMS.length} adım tamamlandı</p>
              </div>
              <div className="relative w-14 h-14">
                <svg className="w-14 h-14 -rotate-90" viewBox="0 0 56 56">
                  <circle cx="28" cy="28" r="22" fill="none" stroke="#e5e7eb" strokeWidth="5" />
                  <circle cx="28" cy="28" r="22" fill="none" stroke="#4f46e5" strokeWidth="5"
                    strokeDasharray={`${2 * Math.PI * 22}`}
                    strokeDashoffset={`${2 * Math.PI * 22 * (1 - checklistProgress / 100)}`}
                    strokeLinecap="round" className="transition-all duration-500" />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-indigo-600">{checklistProgress}%</span>
              </div>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2">
              <div className="bg-indigo-600 h-2 rounded-full transition-all duration-500" style={{ width: `${checklistProgress}%` }} />
            </div>
            <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
              <Info size={10} />İlerlemeniz otomatik olarak kaydedilmektedir.
            </p>
          </div>

          {/* Fix 3: clearAll butonu */}
          {(bookmarks.length > 0 || checkedItems.length > 0) && (
            <div className="flex justify-end">
              <button
                onClick={() => { if (window.confirm('Tüm kaydedilenler ve kontrol listesi ilerlemeniz sıfırlanacak. Devam edilsin mi?')) clearAll(); }}
                className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-700 font-medium px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors border border-red-100"
              >
                <X size={12} /> Tümünü Sıfırla
              </button>
            </div>
          )}

          {/* Grouped checklist */}
          {['Belgeler', 'Eğitim', 'Mali', 'Sağlık', 'Sosyal'].map((group) => {
            const items = CHECKLIST_ITEMS.filter((i) => i.category === group);
            const doneCount = items.filter((i) => checkedSet.has(i.id)).length;
            return (
              <div key={group} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-800">{group}</h3>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${doneCount === items.length ? 'bg-green-100 text-green-700' : 'text-gray-400 bg-gray-100'}`}>
                    {doneCount}/{items.length}
                  </span>
                </div>
                <div className="space-y-2">
                  {items.map((item) => (
                    <button key={item.id} onClick={() => toggleCheck(item.id)}
                      className={`w-full flex items-start gap-3 p-3 rounded-xl text-left transition-all ${
                        checkedSet.has(item.id) ? 'bg-green-50 border border-green-200' : 'bg-gray-50 hover:bg-gray-100 border border-transparent'
                      }`}>
                      {checkedSet.has(item.id)
                        ? <CheckSquare size={18} className="text-green-600 shrink-0 mt-0.5" />
                        : <Square size={18} className="text-gray-400 shrink-0 mt-0.5" />}
                      <span className={`text-sm leading-relaxed ${checkedSet.has(item.id) ? 'text-green-700 line-through' : 'text-gray-700'}`}>
                        {item.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}

          {checklistProgress === 100 && (
            <div className="bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl p-5 text-white text-center">
              <p className="text-3xl mb-2">🎉</p>
              <p className="font-bold text-lg">Tüm adımları tamamladınız!</p>
              <p className="text-green-100 text-sm mt-1">Haklarınızı kullanma konusunda harika bir başlangıç yaptınız.</p>
            </div>
          )}
        </div>
      )}

      {/* Quick contacts */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Hızlı İletişim</p>
        <div className="flex flex-wrap gap-2">
          {[
            { label: 'ALO 183 Sosyal', phone: '183', color: 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100' },
            { label: 'MEBİM 444 0 632', phone: '4440632', color: 'text-blue-700 bg-blue-50 hover:bg-blue-100' },
            { label: 'SGK 170', phone: '170', color: 'text-purple-700 bg-purple-50 hover:bg-purple-100' },
          ].map((c) => (
            <a key={c.phone} href={`tel:${c.phone}`}
              className={`flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-xl transition-colors ${c.color}`}>
              <Phone size={13} />{c.label}
            </a>
          ))}
          <a href="https://www.cimer.gov.tr" target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-xl text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition-colors">
            <ExternalLink size={13} />CİMER Şikayet
          </a>
        </div>
      </div>
    </div>
  );
}
