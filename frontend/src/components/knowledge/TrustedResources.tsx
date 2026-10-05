import { BookOpen, ChevronDown, ExternalLink } from 'lucide-react';

const resources = [
  {
    title: 'Özel Eğitim Süreç Rehberi',
    source: 'Millî Eğitim Bakanlığı',
    topic: 'İlk adımlar',
    description: 'Değerlendirme ve özel eğitim sürecinde hangi adımı izleyeceğinizi öğrenin.',
    url: 'https://orgm.meb.gov.tr/www/ozel-egitim-surec-rehberi-aileler-icin-yol-haritasi/icerik/3578',
  },
  {
    title: 'Yaşa Göre Aile Eğitimi Kitap Seti',
    source: 'Millî Eğitim Bakanlığı',
    topic: 'Evde öğrenme',
    description: 'Otizm için 0–3, 4–6 yaş ve okul kademelerine göre hazırlanmış setlere ulaşın.',
    url: 'https://orgm.meb.gov.tr/www/aile-egitimi-kitap-seti/icerik/3109',
  },
  {
    title: 'Otizm Aile Rehberi',
    source: 'T.C. Sağlık Bakanlığı',
    topic: 'Tanı sonrası',
    description: 'Ailelere yönelik resmî rehbere ve indirilebilir belgeye ulaşın.',
    url: 'https://bireyselhizmetdanismanligi.saglik.gov.tr/TR-97012/otizm-spektrum-bozuklugu-aile-rehberi-2022.html',
  },
  {
    title: 'Otizm için Aile Rehber Kitapçığı',
    source: 'Millî Eğitim Bakanlığı',
    topic: 'Eğitim',
    description: 'Özel eğitim aile kitapçıkları arasından otizm başlığını seçin.',
    url: 'https://orgm.meb.gov.tr/www/ozel-egitim-aileleri-icin-rehber-kitapciklar/icerik/3083',
  },
  {
    title: 'Sağlıklı Beslenme Kılavuzu ve Etkinlik Kitabı',
    source: 'Millî Eğitim Bakanlığı',
    topic: 'Beslenme',
    description: 'Özel eğitim öğrencileri için aile ve öğretmenlere yönelik etkinlikleri inceleyin.',
    url: 'https://orgm.meb.gov.tr/www/ozel-egitim-ogrencilerine-yonelik-saglikli-beslenme-kilavuzu-ve-etkinlik-kitabi/icerik/3571/tr',
  },
  {
    title: 'Eğitim ve Terapi Uygulamaları',
    source: 'Tohum Otizm Vakfı',
    topic: 'Destek seçimi',
    description: 'Farklı uygulamaları araştırırken bilimsel dayanaklarına dair bilgi edinin.',
    url: 'https://tohumotizm.org.tr/otizm-nedir/egitim-terapi-ve-tedavi-uygulamalari/',
  },
] as const;

function ResourceCard({ resource }: { resource: (typeof resources)[number] }) {
  return (
    <a
      href={resource.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-indigo-300 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
      aria-label={`${resource.title}, ${resource.source} — yeni sekmede açılır`}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-[11px] font-bold text-indigo-700">{resource.topic}</span>
        <ExternalLink size={16} className="shrink-0 text-slate-400 transition group-hover:text-indigo-600" aria-hidden="true" />
      </div>
      <h3 className="text-sm font-bold text-slate-900">{resource.title}</h3>
      <p className="mt-1 flex-1 text-xs leading-relaxed text-slate-600">{resource.description}</p>
      <span className="mt-3 text-xs font-semibold text-indigo-700">{resource.source}</span>
    </a>
  );
}

export function TrustedResources() {
  return (
    <section aria-labelledby="trusted-resources-title" className="rounded-3xl border border-indigo-100 bg-indigo-50/40 p-4 sm:p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 id="trusted-resources-title" className="flex items-center gap-2 text-lg font-bold text-slate-900">
            <BookOpen size={20} className="text-indigo-600" aria-hidden="true" />
            Aileler için güvenilir kaynaklar
          </h2>
          <p className="mt-1 text-xs text-slate-600">İhtiyacınıza göre resmî rehberlere ve uzman kuruluşların sayfalarına ulaşın.</p>
        </div>
        <span className="rounded-full border border-indigo-100 bg-white px-3 py-1 text-xs font-semibold text-indigo-700">6 kaynak</span>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {resources.slice(0, 3).map(resource => <ResourceCard key={resource.url} resource={resource} />)}
      </div>
      <details className="group mt-3">
        <summary className="flex w-fit cursor-pointer list-none items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold text-indigo-700 hover:bg-indigo-100 focus-visible:outline-2 focus-visible:outline-indigo-600 [&::-webkit-details-marker]:hidden">
          Diğer kaynakları göster <ChevronDown size={15} className="transition group-open:rotate-180" aria-hidden="true" />
        </summary>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          {resources.slice(3).map(resource => <ResourceCard key={resource.url} resource={resource} />)}
        </div>
      </details>
      <p className="mt-3 text-[11px] leading-relaxed text-slate-500">
        Bağlantılar kaynak kuruluşların kendi sitelerine açılır. İçerik, görsel ve dosyalar burada yeniden yayımlanmaz.
      </p>
    </section>
  );
}
