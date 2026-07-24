import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, FileText, HeartHandshake, ShieldCheck } from 'lucide-react';

type InfoPageKind = 'kvkk' | 'privacy' | 'terms' | 'medical' | 'trust';

interface PublicInfoPageProps {
  kind: InfoPageKind;
}

const content: Record<InfoPageKind, {
  eyebrow: string;
  title: string;
  summary: string;
  icon: typeof ShieldCheck;
  sections: Array<{ title: string; body: string[] }>;
}> = {
  trust: {
    eyebrow: 'Şeffaflık ve kullanıcı kontrolü',
    title: 'Güven Merkezi',
    summary: 'Çocuk ve aile verilerinin kimlerle, hangi amaçla ve ne kadar süreyle paylaşılacağını anlamanız için temel kontrolleri tek yerde açıklıyoruz.',
    icon: ShieldCheck,
    sections: [
      {
        title: 'Erişim nasıl çalışır?',
        body: [
          'Aile, uzman ve yönetici rolleri ayrı yetkilere sahiptir. Bir uzman yalnızca bağlantı ve paylaşım izni verilen danışan bilgilerine erişebilir.',
          'Mevcut paylaşım izinleri hesap ayarlarından görüntülenebilir; ihtiyaç sona erdiğinde erişim geri alınabilir.',
        ],
      },
      {
        title: 'Uzman doğrulaması',
        body: [
          'Uzman başvurularında mesleki bilgiler ve yüklenen belgeler yönetici incelemesine alınır. Onay durumu profil üzerinde görünür; doğrulanmamış hesaplar klinik yetki gerektiren araçlara erişemez.',
        ],
      },
      {
        title: 'Veri güvenliği',
        body: [
          'Hesap erişimi kimlik doğrulama ve rol tabanlı yetkilendirmeyle korunur. Hassas alanlar uygulama seviyesinde şifreleme, aktarım sırasında ise güvenli bağlantı kullanacak şekilde tasarlanmıştır.',
          'Güvenlik mutlak bir garanti değildir; şüpheli hesap hareketleri ve güvenlik sorunları destek kanalı üzerinden bildirilmelidir.',
        ],
      },
      {
        title: 'Veri dışa aktarma ve silme',
        body: [
          'Kullanıcılar Ayarlar alanından hesap verilerinin dışa aktarılmasını veya hesabın silinmesini talep edebilir. Yasal saklama zorunluluğu bulunmayan veriler silinir ya da anonimleştirilir.',
        ],
      },
      {
        title: 'Yapay zekâ ve tıbbi sınır',
        body: [
          'Yapay zekâ destekli özetler yalnızca kayıtları düzenlemeye yardımcı olur; tanı koymaz, tedavi planlamaz ve sağlık profesyonelinin kararının yerine geçmez.',
        ],
      },
      {
        title: 'Destek ve başvuru',
        body: [
          'Gizlilik, erişim veya hesapla ilgili talepler giriş yaptıktan sonra Yardım Merkezi ve Ayarlar alanından iletilebilir. Acil sağlık durumlarında platform destek kanalı yerine resmi acil yardım hattı kullanılmalıdır.',
        ],
      },
    ],
  },
  kvkk: {
    eyebrow: 'KVKK ve açık rıza',
    title: 'KVKK Aydınlatma Metni',
    summary: 'Bu metin, 6698 sayılı Kişisel Verilerin Korunması Kanunu (KVKK) uyarınca platformda işlenen kişisel veriler hakkında kullanıcıları bilgilendirmek için hazırlanmıştır.',
    icon: ShieldCheck,
    sections: [
      {
        title: 'Veri sorumlusu',
        body: [
          '[Şirket/kurum unvanı ve iletişim bilgileri buraya eklenecektir.] Veri sorumlusu, işbu platform üzerinden sunulan hizmetin işleteni olan tüzel kişidir.',
        ],
      },
      {
        title: 'Hangi veriler işlenir?',
        body: [
          'Kimlik ve iletişim bilgileri (ad soyad, e-posta, telefon), hesap ve giriş bilgileri, çocuk profili (doğum tarihi, cinsiyet, tanı/gelişim bilgileri), gelişim ve davranış notları, ilaç ve uyku takip kayıtları, randevu ve uzman iletişim kayıtları, mesajlaşma içerikleri, bildirim tercihleri, cihaz/push token bilgileri ve platform kullanım (log) kayıtları işlenebilir.',
          'Çocuğa ait sağlık, gelişim ve davranış verileri KVKK md. 6 kapsamında özel nitelikli kişisel veri sayılır; bu veriler yalnızca açık rıza alınarak ve hizmetin gerektirdiği ölçüde işlenir.',
        ],
      },
      {
        title: 'İşleme amacı ve hukuki sebep',
        body: [
          'Veriler; hesap oluşturma ve kimlik doğrulama, çocuğun gelişim takibi, uzman-aile iletişim akışının kurulması, randevu ve tedavi planı yönetimi, platform güvenliğinin sağlanması, bildirim gönderimi, destek taleplerinin yanıtlanması ve yasal yükümlülüklerin yerine getirilmesi amacıyla işlenir.',
          'İşleme faaliyeti; KVKK md. 5/2 kapsamında sözleşmenin kurulması/ifası, hukuki yükümlülük ve meşru menfaat hukuki sebeplerine, özel nitelikli veriler için ise md. 6 kapsamında açık rızaya dayanır.',
        ],
      },
      {
        title: 'Aktarım',
        body: [
          'Kişisel veriler; kullanıcının yetki verdiği uzmanlar, barındırma/altyapı sağlayıcıları ve yapay zeka destekli özellikler için kullanılan servis sağlayıcılar ile (yalnızca hizmetin gerektirdiği ölçüde) ve kanunen yetkili kamu kurum ve kuruluşlarıyla paylaşılabilir.',
          '[Kullanılan altyapı/servis sağlayıcılarının (barındırma, e-posta, push bildirim, yapay zeka vb.) yurt içi/yurt dışı konumu ve varsa aktarım garanti mekanizmaları hukuk danışmanınca netleştirilip buraya eklenmelidir.]',
        ],
      },
      {
        title: 'Saklama süresi',
        body: [
          'Kişisel veriler, ilgili mevzuatta öngörülen süreler ile hesabın aktif olduğu süre boyunca saklanır; hesap silindiğinde veya yasal saklama süresi dolduğunda silinir, yok edilir ya da anonim hale getirilir.',
        ],
      },
      {
        title: 'Haklarınız',
        body: [
          'KVKK md. 11 uyarınca; verilerinizin işlenip işlenmediğini öğrenme, işlenmişse buna ilişkin bilgi talep etme, işlenme amacına uygun kullanılıp kullanılmadığını öğrenme, yurt içi/yurt dışı aktarıldığı üçüncü kişileri bilme, eksik/yanlış işlenmişse düzeltilmesini isteme, silinmesini/yok edilmesini isteme, düzeltme-silme işlemlerinin aktarılan üçüncü kişilere bildirilmesini isteme, otomatik sistemlerle analiz sonucu aleyhinize bir sonucun ortaya çıkmasına itiraz etme ve zarara uğramanız halinde zararın giderilmesini talep etme haklarına sahipsiniz.',
          'Başvurularınızı Ayarlar sayfası üzerinden veya destek kanalı aracılığıyla iletebilirsiniz.',
        ],
      },
    ],
  },
  privacy: {
    eyebrow: 'Gizlilik',
    title: 'Gizlilik Politikası',
    summary: 'Bu politika, platformun kullanıcı ve çocuk mahremiyetini korumak için benimsediği temel yaklaşımı açıklar.',
    icon: ShieldCheck,
    sections: [
      {
        title: 'Veri minimizasyonu',
        body: [
          'Platform yalnızca hizmeti sunmak, güvenliği sağlamak ve kullanıcı deneyimini iyileştirmek için gerekli verileri toplamayı hedefler; amacı aşan veri toplanmaz.',
        ],
      },
      {
        title: 'Paylaşım ve erişim',
        body: [
          'Çocuk ve aile verileri, kullanıcının yetki verdiği uzmanlar veya kanunen yetkili kurumlar dışında üçüncü kişilerle paylaşılmaz.',
          'Uzman, admin ve aile rolleri birbirinden ayrı, en az yetki ilkesine dayanan erişim sınırlarına sahiptir; adminler yalnızca platformun işletilmesi için gerekli ölçüde veriye erişebilir.',
        ],
      },
      {
        title: 'Üçüncü taraf servisler',
        body: [
          'Platform; barındırma, e-posta/bildirim gönderimi, push bildirim ve yapay zeka destekli içerik/öneri özellikleri için üçüncü taraf servis sağlayıcılardan yararlanabilir. Bu servislere yalnızca ilgili özelliğin çalışması için gerekli veri aktarılır.',
          '[Kullanılan üçüncü taraf servislerin (örn. yapay zeka sağlayıcısı, e-posta/push altyapısı) güncel listesi ve bu servislerin kendi gizlilik politikaları hukuk danışmanınca gözden geçirilip buraya eklenmelidir.]',
        ],
      },
      {
        title: 'Çerezler ve benzer teknolojiler',
        body: [
          'Platform; oturum yönetimi, güvenlik ve tercihlerin hatırlanması amacıyla zorunlu çerezler/yerel depolama kullanabilir. Zorunlu olmayan izleme/analitik çerezleri kullanılıyorsa ayrı bir çerez politikasıyla ayrıntılandırılmalıdır.',
        ],
      },
      {
        title: 'Güvenlik önlemleri',
        body: [
          'Hesap erişimi kimlik doğrulama ile korunur, veriler yetkilendirme kontrolleriyle sınırlandırılır ve iletişim şifreli bağlantılar üzerinden yapılır. Buna rağmen internet üzerinden hiçbir sistemin mutlak güvenliği garanti edilemez.',
        ],
      },
      {
        title: 'Saklama ve silme',
        body: [
          'Veriler, hizmetin gerektirdiği süre boyunca saklanır. Kullanıcı talebi veya yasal gereklilik durumunda silme ya da anonimleştirme süreci işletilir.',
        ],
      },
      {
        title: 'Politika güncellemeleri',
        body: [
          'Bu politika, platformdaki değişikliklere veya mevzuat güncellemelerine bağlı olarak revize edilebilir; önemli değişiklikler kullanıcılara bildirilir.',
        ],
      },
    ],
  },
  terms: {
    eyebrow: 'Kullanım koşulları',
    title: 'Kullanım Şartları',
    summary: 'Platformu kullanırken ailelerin, uzmanların ve yöneticilerin uyması beklenen temel kuralları özetler.',
    icon: FileText,
    sections: [
      {
        title: 'Hizmetin kapsamı',
        body: [
          'Otizm Destek; takip, planlama, iletişim, bilgi bankası ve topluluk özellikleri sunan yardımcı bir dijital platformdur.',
          'Platform, tanı koymaz, tedavi sağlamaz ve tek başına tedavi kararı vermez; sağlık profesyonellerinin yerini almaz.',
        ],
      },
      {
        title: 'Hesap ve kullanıcı sorumlulukları',
        body: [
          'Kullanıcılar paylaştıkları bilgilerin doğruluğundan, hesap güvenliğinden (şifre gizliliği dahil) ve topluluk kurallarına uygun davranmaktan sorumludur.',
          'Uzman hesapları mesleki bilgilerini doğru sunmalı ve gerekli durumlarda platformun doğrulama süreçlerine tabi olmalıdır. Yanlış/yanıltıcı bilgi verilmesi hesabın askıya alınmasına veya kapatılmasına yol açabilir.',
        ],
      },
      {
        title: 'Topluluk ve içerik kuralları',
        body: [
          'Hakaret, ayrımcılık, kişileri hedef gösteren paylaşımlar, yanıltıcı tıbbi iddialar ve gizlilik ihlali oluşturan içerikler bildirim üzerine veya doğrudan kaldırılabilir; tekrarlanan ihlallerde hesap kısıtlanabilir.',
          'Kullanıcılar, paylaştıkları içerikler üzerindeki fikri mülkiyet haklarını korurken, platforma bu içerikleri hizmetin sunulması amacıyla barındırma ve gösterme hakkı tanır.',
        ],
      },
      {
        title: 'Hesap askıya alma ve fesih',
        body: [
          'Platform; kullanım şartlarının ihlali, güvenlik riski veya yasal zorunluluk hâllerinde bir hesabı askıya alabilir veya kapatabilir. Kullanıcılar da hesaplarını dilediği zaman Ayarlar üzerinden kapatma talebinde bulunabilir.',
        ],
      },
      {
        title: 'Sorumluluğun sınırlandırılması',
        body: [
          'Platform üzerinden sunulan bilgi, hatırlatıcı ve takip araçları destekleyici niteliktedir; bunlara dayanarak alınan tıbbi kararlardan platform sorumlu tutulamaz.',
          '[Uygulanacak hukuk, yetkili mahkeme/uyuşmazlık çözüm yöntemi ve sorumluluk sınırlarına ilişkin nihai madde metinleri hukuk danışmanınca belirlenip buraya eklenmelidir.]',
        ],
      },
      {
        title: 'Değişiklik hakkı',
        body: [
          'Bu kullanım şartları, hizmet kapsamındaki değişikliklere bağlı olarak güncellenebilir; önemli değişiklikler kullanıcılara bildirilir.',
        ],
      },
    ],
  },
  medical: {
    eyebrow: 'Tıbbi güvenlik',
    title: 'Tıbbi Güvenlik Uyarıları',
    summary: 'Kriz rehberi, ilaç takibi ve tarama alanlarının güvenli kullanımı için bu uyarılar görünür olmalıdır.',
    icon: AlertTriangle,
    sections: [
      {
        title: 'Doktor veya uzman yerine geçmez',
        body: [
          'Platformdaki bilgiler, taramalar, aktiviteler, kriz adımları ve takip kayıtları bilgilendirme ve düzenleme amaçlıdır; tıbbi tavsiye, tanı veya tedavi niteliği taşımaz.',
          'Tanı, tedavi, ilaç başlama, ilaç bırakma veya doz değişikliği kararları yalnızca yetkili sağlık profesyonelleri tarafından verilmelidir.',
        ],
      },
      {
        title: 'Tarama ve yapay zeka destekli içerikler',
        body: [
          'Platformdaki tarama araçları ve yapay zeka destekli öneriler/özetler klinik tanı aracı değildir; yalnızca farkındalık ve ön bilgilendirme amaçlıdır. Sonuçlar mutlaka bir uzmanla değerlendirilmelidir.',
        ],
      },
      {
        title: 'Acil durumda',
        body: [
          'Kendine zarar verme, başkasına zarar verme, bilinç kaybı, ciddi alerji, solunum güçlüğü, nöbet, şiddetli kriz veya ani kötüleşme durumunda yerel acil yardım hattına başvurun.',
          'Türkiye için acil yardım hattını 112 olarak düşünün. Bulunduğunuz ülkedeki resmi acil numarayı kullanın.',
        ],
      },
      {
        title: 'İlaç ve kriz kayıtları',
        body: [
          'İlaç hatırlatıcıları destek amaçlıdır; tek güvenlik mekanizması olarak kullanılmamalıdır. Doz ve program bilgileri kullanıcı tarafından girilir; platform bu bilgilerin tıbbi doğruluğunu denetlemez.',
          'Kriz rehberi genel sakinleştirme ve hazırlık adımları sunar; çocuğun bireysel risk planının veya hekim talimatlarının yerini alamaz.',
        ],
      },
      {
        title: 'Veri doğruluğu',
        body: [
          'Takip, günlük ve tarama verilerinin doğruluğundan veriyi giren kullanıcı sorumludur; platform bu verileri klinik olarak doğrulamaz.',
        ],
      },
    ],
  },
};

export function PublicInfoPage({ kind }: PublicInfoPageProps) {
  const page = content[kind];
  const Icon = page.icon;

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-5 py-4">
          <Link to="/tanitim" className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white">
              <HeartHandshake size={20} />
            </span>
            <span className="text-sm font-extrabold">Otizm Destek</span>
          </Link>
          <Link to="/tanitim" className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50">
            <ArrowLeft size={16} /> Tanıtım
          </Link>
        </div>
      </header>

      <article className="mx-auto max-w-4xl px-5 py-12">
        <div className="mb-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
            <Icon size={24} />
          </div>
          <p className="text-xs font-extrabold uppercase tracking-wide text-blue-700">{page.eyebrow}</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950">{page.title}</h1>
          <p className="mt-4 text-sm leading-6 text-slate-600">{page.summary}</p>
        </div>

        <div className="space-y-4">
          {page.sections.map((section) => (
            <section key={section.title} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-extrabold text-slate-950">{section.title}</h2>
              <div className="mt-3 space-y-3">
                {section.body.map((paragraph) => (
                  <p key={paragraph} className="text-sm leading-6 text-slate-600">{paragraph}</p>
                ))}
              </div>
            </section>
          ))}
        </div>

        <p className="mt-8 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-900">
          Bu sayfa ürün içinde kullanılacak temel metin taslağıdır. Canlı kullanıma geçmeden önce hukuk danışmanı ve ilgili sağlık/etik uzmanları tarafından gözden geçirilmelidir.
        </p>
      </article>
    </main>
  );
}
