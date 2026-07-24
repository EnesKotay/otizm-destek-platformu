import { Link } from 'react-router-dom';
import {
  ArrowRight, BookOpen, Flame, Heart, MapPin, MessageCircle,
  ShieldCheck, Sparkles, Users,
} from 'lucide-react';

const areas = [
  { to: '/benzer-aileler', icon: Sparkles, title: 'Sana uygun aileler', text: 'Ortak deneyimleri ve eşleşme nedenlerini gör, güvenli bir tanışma başlat.', tone: 'bg-violet-50 text-violet-700' },
  { to: '/mesajlar', icon: MessageCircle, title: 'Mesajların', text: 'Aileler ve uzmanlarla yaptığın görüşmelere tek yerden devam et.', tone: 'bg-blue-50 text-blue-700' },
  { to: '/gruplar', icon: Users, title: 'Katıldığın gruplar', text: 'Benzer ihtiyaç ve yaş gruplarına odaklanan topluluklara katıl.', tone: 'bg-emerald-50 text-emerald-700' },
  { to: '/bulusmalar', icon: MapPin, title: 'Yakındaki buluşmalar', text: 'Yaklaşık konuma göre güvenli çevrimiçi veya yüz yüze etkinlikleri keşfet.', tone: 'bg-orange-50 text-orange-700' },
  { to: '/forum', icon: BookOpen, title: 'Sorular ve deneyimler', text: 'Topluluğa soru sor, ailelerin ve doğrulanmış uzmanların yanıtlarını oku.', tone: 'bg-indigo-50 text-indigo-700' },
  { to: '/dertlesme-duvari', icon: Heart, title: 'Dertleşme alanı', text: 'Yargılanmadan duygunu paylaş; istersen anonim kal.', tone: 'bg-rose-50 text-rose-700' },
  { to: '/haftalik-soru', icon: Flame, title: 'Haftanın sorusu', text: 'Tek bir konu etrafında kısa deneyim paylaşımlarına katıl.', tone: 'bg-amber-50 text-amber-700' },
];

export function CommunityHubPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <section className="overflow-hidden rounded-[28px] border border-indigo-100 bg-gradient-to-br from-indigo-600 to-violet-700 p-6 text-white shadow-lg sm:p-8">
        <div className="max-w-2xl">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-bold">
            <ShieldCheck size={14} /> Kontrollü ve güvenli iletişim
          </span>
          <h1 className="mt-4 text-3xl font-black">Topluluk</h1>
          <p className="mt-2 leading-7 text-indigo-100">
            Aynı süreci yaşayan aileleri bul, önce mesajlaş, hazır olduğunda grup veya buluşmalara katıl.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link to="/benzer-aileler" className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-indigo-700">
              Bana uygun aileleri göster <ArrowRight size={15} />
            </Link>
            <Link to="/mesajlar" className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-4 py-2.5 text-sm font-bold text-white">
              Mesajları aç
            </Link>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-black text-slate-900">Ne yapmak istersin?</h2>
        <p className="mt-1 text-sm text-slate-500">Bütün topluluk alanları artık bu merkezde.</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {areas.map(({ to, icon: Icon, title, text, tone }) => (
            <Link key={to} to={to} className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md">
              <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${tone}`}><Icon size={19} /></span>
              <h3 className="mt-4 font-extrabold text-slate-900">{title}</h3>
              <p className="mt-1 text-sm leading-6 text-slate-500">{text}</p>
              <span className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-indigo-700">Aç <ArrowRight size={13} /></span>
            </Link>
          ))}
        </div>
      </section>

      <aside className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
        <h2 className="font-extrabold text-emerald-950">Güvenli tanışma önerisi</h2>
        <p className="mt-1 text-sm leading-6 text-emerald-800">
          İlk görüşmede platform içinde yazışın. Telefon, açık adres ve çocuğun özel bilgilerini paylaşmak zorunda değilsiniz.
          Rahatsız olduğunuz kişiyi engelleyebilir veya bildirebilirsiniz.
        </p>
      </aside>
    </div>
  );
}
