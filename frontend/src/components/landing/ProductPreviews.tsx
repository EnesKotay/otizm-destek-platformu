import { CalendarCheck, Moon, MessageSquare, NotebookTabs, ShieldCheck, TrendingUp, Undo2, AlertTriangle } from 'lucide-react';

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
      <div className="overflow-hidden rounded-[1.75rem] border border-white bg-white p-3 shadow-2xl shadow-primary-900/15">
        <div className="rounded-2xl bg-slate-50 p-4 sm:p-6">
          <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-4">
            <div>
              <p className="text-xs font-bold text-slate-600">Bugün</p>
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
                <TrendingUp size={18} aria-hidden="true" /> Haftalık gelişim
              </p>
              <span className="text-xs font-bold text-primary-50">7 gün</span>
            </div>
            <div className="mt-5 flex h-20 items-end gap-2" aria-hidden="true">
              {[38, 54, 48, 68, 63, 82, 76].map((height, index) => (
                <span key={index} className="flex-1 rounded-t-md bg-white/75" style={{ height: `${height}%` }} />
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="absolute -bottom-5 left-2 flex items-center gap-3 rounded-2xl border border-emerald-100 bg-white px-4 py-3 shadow-xl sm:-left-8">
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

const weeklyFindings = [
  { icon: Moon, tone: 'bg-indigo-50 text-indigo-700', label: 'Uyku', value: '7 günün 5’inde düzenli' },
  { icon: MessageSquare, tone: 'bg-emerald-50 text-emerald-700', label: 'İletişim', value: '3 yeni kelime kaydedildi' },
  { icon: AlertTriangle, tone: 'bg-orange-50 text-orange-700', label: 'Zorlanma', value: 'Kalabalık saatte market' },
];

export function WeeklyReportPreview() {
  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-100 p-3 shadow-2xl shadow-slate-200/70">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <p className="text-xs font-bold text-slate-600">Haftalık özet · 12–18 Mayıs</p>
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
