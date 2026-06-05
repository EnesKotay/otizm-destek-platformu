import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, FileText, HeartHandshake, ShieldCheck } from 'lucide-react';

type InfoPageKind = 'kvkk' | 'privacy' | 'terms' | 'medical';

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
  kvkk: {
    eyebrow: 'KVKK ve açık rıza',
    title: 'KVKK Aydınlatma Metni',
    summary: 'Bu metin, platformda işlenen kişisel veriler hakkında kullanıcıları bilgilendirmek için hazırlanmıştır.',
    icon: ShieldCheck,
    sections: [
      {
        title: 'Hangi veriler işlenir?',
        body: [
          'Hesap bilgileri, iletişim bilgileri, çocuk profili, gelişim notları, randevu kayıtları, mesajlaşma içerikleri, bildirim tercihleri ve platform kullanım kayıtları işlenebilir.',
          'Sağlık ve gelişimle ilgili bilgiler özel nitelikli veri sayılabileceği için yalnızca kullanıcı onayı ve hizmetin gerektirdiği ölçüde işlenmelidir.',
        ],
      },
      {
        title: 'İşleme amacı',
        body: [
          'Veriler; hesap oluşturma, gelişim takibi, uzman iletişim akışı, randevu yönetimi, güvenlik, bildirim, destek ve yasal yükümlülüklerin yerine getirilmesi için kullanılır.',
        ],
      },
      {
        title: 'Haklarınız',
        body: [
          'Verilerinize erişim, düzeltme, silme, işlenmesini kısıtlama, rızanızı geri alma ve veri silme talebi haklarınızı kullanabilirsiniz.',
          'Veri silme talebi için Ayarlar sayfasından veya destek kanalı üzerinden başvuru yapılabilmelidir.',
        ],
      },
    ],
  },
  privacy: {
    eyebrow: 'Gizlilik',
    title: 'Gizlilik Politikası',
    summary: 'Bu politika, platformun kullanıcı mahremiyetini korumak için benimsediği temel yaklaşımı açıklar.',
    icon: ShieldCheck,
    sections: [
      {
        title: 'Veri minimizasyonu',
        body: [
          'Platform yalnızca hizmeti sunmak, güvenliği sağlamak ve kullanıcı deneyimini iyileştirmek için gerekli verileri toplamayı hedefler.',
        ],
      },
      {
        title: 'Paylaşım ve erişim',
        body: [
          'Çocuk ve aile verileri, kullanıcının yetki verdiği uzmanlar veya kanunen yetkili kurumlar dışında paylaşılmamalıdır.',
          'Uzman, admin ve aile rolleri farklı erişim sınırlarına sahip olmalıdır.',
        ],
      },
      {
        title: 'Saklama ve silme',
        body: [
          'Veriler, hizmetin gerektirdiği süre boyunca saklanır. Kullanıcı talebi veya yasal gereklilik durumunda silme ya da anonimleştirme süreci işletilir.',
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
          'Platform, tanı koymaz ve tek başına tedavi kararı vermez.',
        ],
      },
      {
        title: 'Kullanıcı sorumlulukları',
        body: [
          'Kullanıcılar paylaştıkları bilgilerin doğruluğundan, hesap güvenliğinden ve topluluk kurallarına uygun davranmaktan sorumludur.',
          'Uzman hesapları mesleki bilgilerini doğru sunmalı ve gerekli durumlarda platform doğrulama süreçlerine tabi olmalıdır.',
        ],
      },
      {
        title: 'Topluluk ve içerik',
        body: [
          'Hakaret, ayrımcılık, kişileri hedef gösteren paylaşımlar, yanıltıcı tıbbi iddialar ve gizlilik ihlali oluşturan içerikler kaldırılabilir.',
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
          'Platformdaki bilgiler, taramalar, aktiviteler, kriz adımları ve takip kayıtları bilgilendirme ve düzenleme amaçlıdır.',
          'Tanı, tedavi, ilaç başlama, ilaç bırakma veya doz değişikliği kararları yalnızca yetkili sağlık profesyonelleri tarafından verilmelidir.',
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
          'İlaç hatırlatıcıları destek amaçlıdır; tek güvenlik mekanizması olarak kullanılmamalıdır.',
          'Kriz rehberi genel sakinleştirme ve hazırlık adımları sunar; çocuğun bireysel risk planının yerini alamaz.',
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
