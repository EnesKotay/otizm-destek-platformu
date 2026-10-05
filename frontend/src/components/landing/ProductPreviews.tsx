import { CalendarCheck, Moon, MessageSquare, NotebookTabs, ShieldCheck, TrendingUp, Undo2, AlertTriangle, Search, Users, BookOpen, CheckCircle2 } from 'lucide-react';

/**
 * Ürün önizlemeleri.
 *
 * Sayfada iki önizleme var ve bilinçli olarak farklı hikâyeler anlatıyorlar:
 * hero'daki günlük akışı, aşağıdaki ise uzmanla paylaşılan haftalık özeti ve
 * yetki kapsamını gösterir. (Önceden ikisi de aynı düzende, aynı 7 çubuklu
 * grafikle çizildiği için tekrar hissi veriyordu.)
 */

export function DailyFlowPreview() {
  return (
    <div className="relative mx-auto w-full max-w-xl">
      <div className="pointer-events-none absolute -inset-6 -z-10 rounded-[2.5rem] bg-gradient-to-br from-primary-200/60 to-indigo-200/60 blur-2xl" />
      <div className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white p-3 shadow-lg shadow-primary-900/10">
        <div className="rounded-2xl bg-slate-50 p-4 sm:p-6">
          <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-4">
            <div>
              <p className="text-xs font-bold text-slate-600">Örnek ekran · Bugün</p>
              <p className="mt-1 text-lg font-extrabold text-slate-950">Birlikte küçük adımlar</p>
            </div>
            <span className="shrink-0 rounded-full bg-emerald-100 px-3 py-1 text-xs font-extrabold text-emerald-800">
              2 kayıt tamam
            </span>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-700">
                <NotebookTabs size={20} aria-hidden="true" />
              </span>
              <p className="mt-3 text-xs font-bold text-slate-600">Günlük gözlem</p>
              <p className="mt-1 text-sm font-extrabold text-slate-900">Sakin ve iletişime açık</p>
            </div>
            <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                <CalendarCheck size={20} aria-hidden="true" />
              </span>
              <p className="mt-3 text-xs font-bold text-slate-600">Sıradaki görüşme</p>
              <p className="mt-1 text-sm font-extrabold text-slate-900">Yarın, 14:30</p>
            </div>
          </div>
          <div className="mt-3 rounded-2xl bg-primary-600 p-5 text-white">
            <div className="flex items-center justify-between">
              <p className="flex items-center gap-2 text-sm font-extrabold">
                <TrendingUp size={18} aria-hidden="true" /> Kayıt girilen günler
              </p>
              <span className="text-xs font-bold text-primary-50">5 / 7 gün</span>
            </div>
            <div className="mt-5 grid grid-cols-7 gap-2" aria-hidden="true">
              {[true, true, false, true, true, false, true].map((recorded, index) => (
                <span key={index} className={`h-10 rounded-md ${recorded ? 'bg-white/80' : 'bg-white/20'}`} />
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="absolute -bottom-5 left-2 flex items-center gap-3 rounded-2xl border border-emerald-100 bg-white px-4 py-3 shadow-md sm:-left-8">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-800">
          <ShieldCheck size={18} aria-hidden="true" />
        </span>
        <span>
          <span className="block text-xs font-extrabold text-slate-900">Paylaşım sizde</span>
          <span className="block text-[11px] font-semibold text-slate-600">Yetkiyi dilediğiniz an yönetin</span>
        </span>
      </div>
    </div>
  );
}

export function CommunitySupportPreview() {
  return (
    <div className="relative mx-auto w-full max-w-xl">
      <div className="pointer-events-none absolute -inset-6 -z-10 rounded-[2.5rem] bg-gradient-to-br from-violet-200/70 to-indigo-200/70 blur-2xl" />
      <div className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white p-3 shadow-xl shadow-indigo-900/10">
        <div className="rounded-2xl bg-slate-50 p-4 sm:p-6">
          <div className="border-b border-slate-200 pb-4">
            <p className="text-xs font-bold text-violet-700">Örnek destek araması</p>
            <p className="mt-1 text-lg font-extrabold text-slate-950">Başka aileler ne denedi?</p>
            <div className="mt-4 flex items-center gap-3 rounded-xl border border-violet-200 bg-white px-4 py-3 shadow-sm">
              <Search size={18} className="shrink-0 text-violet-700" aria-hidden="true" />
              <span className="text-sm font-semibold text-slate-800">Gece sık uyanıyor, ne yapabiliriz?</span>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            <div className="rounded-2xl border border-violet-100 bg-white p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-700"><MessageSquare size={17} aria-hidden="true" /></span>
                <div>
                  <p className="text-xs font-extrabold text-violet-700">AİLE DENEYİMİ</p>
                  <p className="mt-1 text-sm font-extrabold text-slate-950">Akşam rutinini görselleştirince uyanmalar azaldı</p>
                  <p className="mt-1 text-xs font-medium leading-5 text-slate-600">4 aile yanıtladı · 1 yanıt çözüm olarak işaretlendi</p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-indigo-100 bg-indigo-50/70 p-4">
                <Users size={18} className="text-indigo-700" aria-hidden="true" />
                <p className="mt-2 text-xs font-bold text-slate-600">Benzer aileler</p>
                <p className="mt-1 text-sm font-extrabold text-slate-950">3 eşleşme bulundu</p>
              </div>
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4">
                <BookOpen size={18} className="text-emerald-700" aria-hidden="true" />
                <p className="mt-2 text-xs font-bold text-slate-600">Güvenilir kaynak</p>
                <p className="mt-1 text-sm font-extrabold text-slate-950">Uyku rehberi</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="absolute -bottom-5 left-2 flex items-center gap-3 rounded-2xl border border-emerald-100 bg-white px-4 py-3 shadow-md sm:-left-8">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-800"><CheckCircle2 size={18} aria-hidden="true" /></span>
        <span>
          <span className="block text-xs font-extrabold text-slate-900">Yanıt bulamazsan sor</span>
          <span className="block text-[11px] font-semibold text-slate-600">İstersen anonim paylaş</span>
        </span>
      </div>
    </div>
  );
}

const weeklyFindings = [
  { icon: Moon, tone: 'bg-indigo-50 text-indigo-700', label: 'Uyku', value: '7 günün 5’inde düzenli' },
  { icon: MessageSquare, tone: 'bg-emerald-50 text-emerald-700', label: 'İletişim', value: '3 yeni kelime kaydedildi' },
  { icon: AlertTriangle, tone: 'bg-orange-50 text-orange-700', label: 'Zorlanma', value: 'Kalabalık saatte market' },
];

export function WeeklyReportPreview() {
  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-100 p-3 shadow-lg shadow-slate-200/70">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <p className="text-xs font-bold text-slate-600">Örnek haftalık özet · 12–18 Mayıs</p>
            <p className="mt-1 text-lg font-extrabold text-slate-950">Görüşmeye hazır</p>
          </div>
          <span className="shrink-0 rounded-full bg-primary-50 px-3 py-1 text-xs font-extrabold text-primary-800">
            Uzmanla paylaşıldı
          </span>
        </div>

        <ul className="mt-4 space-y-2.5">
          {weeklyFindings.map(({ icon: Icon, tone, label, value }) => (
            <li key={label} className="flex items-center gap-3 rounded-2xl border border-slate-100 px-4 py-3">
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${tone}`}>
                <Icon size={17} aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="block text-xs font-bold text-slate-600">{label}</span>
                <span className="block text-sm font-extrabold text-slate-900">{value}</span>
              </span>
            </li>
          ))}
        </ul>

        {/* Kontrollü paylaşım vaadinin somut karşılığı: kim, ne kadar süre, ne kapsamda. */}
        <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4">
          <div className="flex items-center gap-2 text-sm font-extrabold text-emerald-900">
            <ShieldCheck size={17} aria-hidden="true" />
            Erişim kapsamı
          </div>
          <p className="mt-2 text-xs font-semibold leading-5 text-emerald-900/90">
            Dil ve konuşma terapisti · yalnızca günlük kayıtlar · 30 gün
          </p>
          <span className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-emerald-800 ring-1 ring-emerald-200">
            <Undo2 size={13} aria-hidden="true" />
            Yetkiyi geri al
          </span>
        </div>
      </div>
    </div>
  );
}
