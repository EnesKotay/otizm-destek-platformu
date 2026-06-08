import { useState, useMemo, useEffect } from 'react';
import {
  Search, MapPin, Phone, Globe, Heart, X, Info,
  Stethoscope, BookOpen, Users, Landmark, Mail,
  ExternalLink, ChevronDown, ChevronUp,
  CheckCircle2,
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { toast } from '@/store/toastStore';
import { PageOnboarding } from '@/components/ui/PageOnboarding';
import { institutionService, type Institution } from '@/services/institutionService';

type InstCategory = Institution['category'];


// ─── Sabitler ─────────────────────────────────────────────────────────────────

const CAT_META: Record<InstCategory, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  'university-hospital': { label: 'Üniversite Hastanesi', color: 'text-blue-700',   bg: 'bg-blue-100',   icon: Stethoscope },
  'private-hospital':    { label: 'Özel Hastane',         color: 'text-teal-700',   bg: 'bg-teal-100',   icon: Stethoscope },
  'private-rehab':       { label: 'Rehabilitasyon',       color: 'text-indigo-700', bg: 'bg-indigo-100', icon: BookOpen },
  state:                 { label: 'Devlet Kurumu',         color: 'text-green-700',  bg: 'bg-green-100',  icon: Landmark },
  ngo:                   { label: 'STK & Vakıf',          color: 'text-orange-700', bg: 'bg-orange-100', icon: Users },
};

const EXPERT_MAP_LAST_UPDATED = 'Haziran 2026';

const EXPERT_MAP_SOURCES = [
  { label: 'MEB Özel Eğitim', url: 'https://orgm.meb.gov.tr' },
  { label: 'MHRS', url: 'https://www.mhrs.gov.tr' },
  { label: 'Aile Bakanlığı', url: 'https://www.aile.gov.tr' },
  { label: 'SGK', url: 'https://www.sgk.gov.tr' },
  { label: 'CİMER', url: 'https://www.cimer.gov.tr' },
];

const CATEGORY_SOURCE_FALLBACK: Partial<Record<InstCategory, { label: string; url: string }>> = {
  'university-hospital': { label: 'MHRS / kurum kaydı', url: 'https://www.mhrs.gov.tr' },
  'private-rehab': { label: 'MEB Özel Eğitim', url: 'https://orgm.meb.gov.tr' },
  state: { label: 'Resmi kurum kaynağı', url: 'https://www.turkiye.gov.tr' },
};

function getSourceLink(inst: Institution) {
  const fallback = CATEGORY_SOURCE_FALLBACK[inst.category];
  const url = inst.sourceUrl || inst.website || fallback?.url;
  if (!url) return null;
  return {
    label: inst.sourceLabel || (inst.website ? 'Kurum web sitesi' : fallback?.label || 'Kaynak'),
    url,
  };
}

type TabKey = 'all' | 'hospital' | 'rehab' | 'state' | 'ngo' | 'favorites';
type SortKey = 'default' | 'az' | 'city';

const TABS: { key: TabKey; label: string; cats?: InstCategory[] }[] = [
  { key: 'all',       label: 'Tümü' },
  { key: 'hospital',  label: 'Hastaneler',        cats: ['university-hospital', 'private-hospital'] },
  { key: 'rehab',     label: 'Rehabilitasyon',    cats: ['private-rehab'] },
  { key: 'state',     label: 'Devlet Kurumları',  cats: ['state'] },
  { key: 'ngo',       label: 'STK & Vakıflar',    cats: ['ngo'] },
  { key: 'favorites', label: 'Favoriler' },
];

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'default', label: 'Varsayılan' },
  { key: 'az',      label: 'A → Z' },
  { key: 'city',    label: 'Şehre Göre' },
];

const CITIES = [
  'Tümü',
  'İstanbul', 'Ankara', 'İzmir', 'Bursa', 'Adana', 'Antalya', 'Konya',
  'Gaziantep', 'Kayseri', 'Eskişehir', 'Samsun', 'Trabzon', 'Diyarbakır',
  'Erzurum', 'Kocaeli', 'Sakarya', 'Edirne', 'Manisa', 'Denizli', 'Mersin',
  'Malatya', 'Elazığ', 'Van', 'Sivas', 'Zonguldak', 'Rize', 'Bolu',
  'Isparta', 'Hatay', 'Balıkesir', 'Şanlıurfa', 'Tüm İller',
];

const FAV_KEY = 'expert_map_favorites';
const loadFavs = (): string[] => { try { return JSON.parse(localStorage.getItem(FAV_KEY) || '[]'); } catch { return []; } };
const saveFavs = (ids: string[]) => localStorage.setItem(FAV_KEY, JSON.stringify(ids));

// ─── Küçük bileşenler ─────────────────────────────────────────────────────────

function CatBadge({ cat }: { cat: InstCategory }) {
  const m = CAT_META[cat];
  const Icon = m.icon;
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${m.bg} ${m.color}`}>
      <Icon size={10} />{m.label}
    </span>
  );
}

function FavBtn({ id, favs, toggle }: { id: string; favs: string[]; toggle: (id: string) => void }) {
  const on = favs.includes(id);
  return (
    <button
      onClick={e => { e.stopPropagation(); toggle(id); }}
      className={`p-1.5 rounded-lg transition-colors cursor-pointer ${on ? 'text-red-500' : 'text-gray-300 hover:text-red-400'}`}
    >
      <Heart size={14} fill={on ? 'currentColor' : 'none'} />
    </button>
  );
}

// ─── Kart ─────────────────────────────────────────────────────────────────────

function InstCard({ inst, favs, toggle, onClick }: {
  inst: Institution; favs: string[]; toggle: (id: string) => void; onClick: () => void;
}) {
  const m = CAT_META[inst.category];
  const Icon = m.icon;
  const source = getSourceLink(inst);
  return (
    <div
      onClick={onClick}
      className="bg-white rounded-2xl border border-gray-100 p-4 hover:shadow-md hover:border-gray-200 transition-all cursor-pointer flex flex-col gap-3"
    >
      <div className="flex items-start justify-between gap-2">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${m.bg}`}>
          <Icon size={16} className={m.color} />
        </div>
        <FavBtn id={inst.id} favs={favs} toggle={toggle} />
      </div>

      <div>
        <h3 className="font-semibold text-gray-900 text-sm leading-snug">{inst.name}</h3>
        <div className="flex items-center gap-1 mt-1 text-xs text-gray-400">
          <MapPin size={11} />
          <span>{inst.city === 'Tüm İller' ? 'Türkiye Geneli' : inst.city}</span>
          {inst.ageRange && <><span>·</span><span>{inst.ageRange}</span></>}
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <CatBadge cat={inst.category} />
        {inst.free && (
          <span className="text-[11px] font-semibold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full">Ücretsiz</span>
        )}
        {inst.sgkContract === true && !inst.free && (
          <span className="text-[11px] font-semibold bg-green-50 text-green-700 px-2 py-0.5 rounded-full">SGK</span>
        )}
        {source && (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-slate-50 text-slate-600 px-2 py-0.5 rounded-full">
            <CheckCircle2 size={10} />Kaynaklı
          </span>
        )}
      </div>

      <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">{inst.description}</p>

      {(inst.phone || inst.website || source) && (
        <div className="flex gap-2 flex-wrap mt-auto pt-1">
          {inst.phone && (
            <a href={`tel:${inst.phone}`} onClick={e => e.stopPropagation()}
              className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 bg-blue-50 px-2.5 py-1.5 rounded-lg transition-colors">
              <Phone size={11} />{inst.phone}
            </a>
          )}
          {inst.website && (
            <a href={inst.website} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
              className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-2.5 py-1.5 rounded-lg transition-colors">
              <Globe size={11} />Web
            </a>
          )}
          {source && source.url !== inst.website && (
            <a href={source.url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
              className="flex items-center gap-1 text-xs text-slate-600 hover:text-slate-800 bg-slate-50 px-2.5 py-1.5 rounded-lg transition-colors">
              <ExternalLink size={11} />Kaynak
            </a>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Detay Modalı ─────────────────────────────────────────────────────────────

function DetailModal({ inst, onClose, favs, toggle }: {
  inst: Institution; onClose: () => void; favs: string[]; toggle: (id: string) => void;
}) {
  const m = CAT_META[inst.category];
  const Icon = m.icon;
  const source = getSourceLink(inst);
  return (
    <Modal isOpen onClose={onClose} title="" className="max-w-xl">
      <div className="space-y-5">
        <div className="flex items-start gap-3">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${m.bg}`}>
            <Icon size={22} className={m.color} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h2 className="font-bold text-gray-900 leading-snug">{inst.name}</h2>
              <FavBtn id={inst.id} favs={favs} toggle={toggle} />
            </div>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              <CatBadge cat={inst.category} />
              {inst.free && (
                <span className="text-[11px] font-semibold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full">✓ Ücretsiz</span>
              )}
              {inst.sgkContract === true && !inst.free && (
                <span className="text-[11px] font-semibold bg-green-50 text-green-700 px-2 py-0.5 rounded-full">✓ SGK Anlaşmalı</span>
              )}
              {inst.sgkContract === false && (
                <span className="text-[11px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">SGK yok</span>
              )}
              {source && (
                <span className="inline-flex items-center gap-1 text-[11px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                  <CheckCircle2 size={10} />Kaynak doğrulandı
                </span>
              )}
            </div>
          </div>
        </div>

        {(inst.address || inst.ageRange) && (
          <div className="flex flex-wrap gap-3 text-sm text-gray-600">
            {inst.address && <span className="flex items-center gap-1.5"><MapPin size={13} className="text-gray-400" />{inst.address}</span>}
            {inst.ageRange && <span className="font-medium text-indigo-600">{inst.ageRange}</span>}
          </div>
        )}

        <p className="text-sm text-gray-700 leading-relaxed bg-gray-50 rounded-xl p-3">{inst.description}</p>

        <div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Uzmanlık Alanları</p>
          <div className="flex flex-wrap gap-1.5">
            {inst.specialties.map(s => (
              <span key={s} className="text-xs bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-full font-medium">{s}</span>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Sunulan Hizmetler</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
            {inst.services.map(s => (
              <span key={s} className="text-sm text-gray-600 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-300 shrink-0" />{s}
              </span>
            ))}
          </div>
        </div>

        {(inst.phone || inst.website || inst.email || source) && (
          <div className="flex flex-wrap gap-2">
            {inst.phone && (
              <a href={`tel:${inst.phone}`} className="flex items-center gap-2 text-sm bg-blue-50 text-blue-700 px-3 py-2 rounded-xl hover:bg-blue-100 transition-colors font-medium">
                <Phone size={14} />{inst.phone}
              </a>
            )}
            {inst.email && (
              <a href={`mailto:${inst.email}`} className="flex items-center gap-2 text-sm bg-gray-50 text-gray-700 px-3 py-2 rounded-xl hover:bg-gray-100 transition-colors">
                <Mail size={14} />{inst.email}
              </a>
            )}
            {inst.website && (
              <a href={inst.website} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm bg-indigo-50 text-indigo-700 px-3 py-2 rounded-xl hover:bg-indigo-100 transition-colors">
                <ExternalLink size={14} />Web Sitesi
              </a>
            )}
            {source && source.url !== inst.website && (
              <a href={source.url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm bg-slate-50 text-slate-700 px-3 py-2 rounded-xl hover:bg-slate-100 transition-colors">
                <ExternalLink size={14} />{source.label}
              </a>
            )}
          </div>
        )}

        {inst.notes && (
          <div className="flex gap-2.5 bg-amber-50 border border-amber-100 rounded-xl p-3">
            <Info size={14} className="text-amber-500 shrink-0 mt-0.5" />
            <p className="text-sm text-amber-800">{inst.notes}</p>
          </div>
        )}
      </div>
    </Modal>
  );
}

// ─── Nereden başlamalıyım? Banner ─────────────────────────────────────────────

const GUIDE_STEPS = [
  { id: 'step-1', step: '1', title: 'Çocuk Psikiyatristi Tanısı', desc: 'Hastanelerin çocuk psikiyatrisi bölümlerinden Sağlık Kurulu Raporu (ÇÖZGER) alınması özel eğitimin yasal zeminidir.', color: 'from-blue-50 to-sky-50 border-sky-100', num: 'bg-sky-600' },
  { id: 'step-2', step: '2', title: 'RAM Eğitsel Değerlendirme', desc: 'Tanı belgenizle ilçenizdeki Rehberlik ve Araştırma Merkezi\'ne (RAM) başvurun. Ücretsiz eğitsel değerlendirme ve yönlendirme raporu çıkartın.', color: 'from-indigo-50 to-indigo-50/50 border-indigo-100', num: 'bg-indigo-600' },
  { id: 'step-3', step: '3', title: 'Devlet Ödeneği & SGK Onayı', desc: 'RAM raporuyla devlet destekli (aylık 8 seans bireysel, 4 seans grup) ücretsiz özel eğitim alma hakkınız aktifleşir.', color: 'from-purple-50 to-fuchsia-50/30 border-purple-100', num: 'bg-purple-600' },
  { id: 'step-4', step: '4', title: 'Terapi ve Rehabilitasyon', desc: 'SGK anlaşmalı MEB onaylı özel eğitim merkezine kaydolun; çocuğunuzun gelişimine uygun ABA, Ergoterapi ve Konuşma Terapisi planlayın.', color: 'from-emerald-50 to-teal-50 border-emerald-100', num: 'bg-emerald-600' },
];

function StartGuide() {
  const [open, setOpen] = useState(false);
  const [progress, setProgress] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('expert_map_checklist_progress') || '[]');
    } catch {
      return [];
    }
  });

  const [showCalculator, setShowCalculator] = useState(false);
  const [sessionPrice, setSessionPrice] = useState('800');

  const toggleStep = (id: string) => {
    const next = progress.includes(id) ? progress.filter(x => x !== id) : [...progress, id];
    setProgress(next);
    localStorage.setItem('expert_map_checklist_progress', JSON.stringify(next));
    if (next.length === GUIDE_STEPS.length) {
      toast.success('🎉 Tüm yasal adımları başarıyla tamamladınız.');
    }
  };

  const calculatedSavings = useMemo(() => {
    const price = Number(sessionPrice) || 0;
    const monthly = price * 8;
    const yearly = monthly * 12;
    return { monthly, yearly };
  }, [sessionPrice]);

  return (
    <div className="rounded-3xl border border-amber-200/80 bg-gradient-to-br from-amber-50 via-amber-50/70 to-orange-50/30 overflow-hidden shadow-sm">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left cursor-pointer hover:bg-amber-100/55 transition-all duration-300"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center text-lg shadow-sm">
            🧭
          </div>
          <div>
            <p className="text-sm font-extrabold text-amber-950 tracking-tight">Devlet Destekli Özel Eğitim Yol Haritası</p>
            <p className="text-xs text-amber-700/90 font-medium">İlk kez tanı aldıysanız — Adım adım yasal ve klinik haklar rehberi</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {progress.length > 0 && (
            <span className="text-xs bg-amber-200/80 text-amber-900 px-2 py-0.5 rounded-full font-bold">
              {progress.length}/{GUIDE_STEPS.length} Adım
            </span>
          )}
          {open ? <ChevronUp size={16} className="text-amber-600 shrink-0" /> : <ChevronDown size={16} className="text-amber-600 shrink-0" />}
        </div>
      </button>
      
      {open && (
        <div className="px-5 pb-5 border-t border-amber-200/60 pt-4 space-y-4">
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-amber-800 font-bold">
              <span>İlerleme Seviyeniz</span>
              <span>%{Math.round((progress.length / GUIDE_STEPS.length) * 100)}</span>
            </div>
            <div className="h-2 bg-amber-100/80 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-500 rounded-full transition-all duration-500"
                style={{ width: `${(progress.length / GUIDE_STEPS.length) * 100}%` }}
              />
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {GUIDE_STEPS.map((s) => {
              const isDone = progress.includes(s.id);
              return (
                <div
                  key={s.id}
                  onClick={() => toggleStep(s.id)}
                  className={`group flex gap-3.5 p-4 rounded-2xl border-2 text-left cursor-pointer transition-all duration-300 ${
                    isDone
                      ? 'bg-white border-green-500 shadow-sm opacity-90'
                      : 'bg-white/80 backdrop-blur-sm border-gray-100 hover:border-amber-300 hover:bg-white hover:shadow-md'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-2xl ${isDone ? 'bg-green-500 text-white' : `${s.num} text-white`} text-xs font-extrabold flex items-center justify-center shrink-0 shadow-sm transition-all group-hover:scale-105`}>
                    {isDone ? '✓' : s.step}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-extrabold tracking-tight transition-colors ${isDone ? 'text-green-700 line-through' : 'text-gray-900'}`}>
                      {s.title}
                    </p>
                    <p className="text-[11px] leading-relaxed text-gray-500 mt-1">{s.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex gap-2 flex-wrap pt-2 border-t border-amber-200/40">
            <button
              onClick={() => setShowCalculator(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition-all text-xs font-bold shadow-sm cursor-pointer"
            >
              📊 SGK Tasarruf Hesaplayıcı
            </button>
            <a
              href="https://orgm.meb.gov.tr"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-amber-200 text-amber-950 hover:bg-amber-100/30 transition-all text-xs font-bold shadow-sm"
            >
              🔗 Resmi MEB Özel Eğitim Sayfası
            </a>
          </div>
        </div>
      )}

      {/* SGK Calculator Modal */}
      <Modal isOpen={showCalculator} onClose={() => setShowCalculator(false)} title="SGK Devlet Ödeneği Hesaplayıcı" className="max-w-md">
        <div className="space-y-4">
          <div className="bg-gradient-to-br from-indigo-500 to-indigo-700 text-white p-5 rounded-2xl shadow-sm text-center">
            <p className="text-xs font-bold tracking-wider uppercase opacity-85">Aylık Devlet Yardımı (8 Seans)</p>
            <p className="text-3xl font-black mt-1 font-mono">+{calculatedSavings.monthly.toLocaleString('tr-TR')} TL</p>
            <p className="text-[10px] opacity-75 mt-1">Yıllık toplam devlet desteği: <strong>{calculatedSavings.yearly.toLocaleString('tr-TR')} TL</strong></p>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide">
              Seans Başı Ortalama Özel Eğitim Ücreti (TL)
            </label>
            <input
              type="number"
              value={sessionPrice}
              onChange={e => setSessionPrice(e.target.value)}
              placeholder="Örn: 800"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono bg-white"
            />
          </div>

          <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 text-xs text-gray-500 leading-relaxed space-y-2">
            <p>💡 <strong>Nasıl Çalışır?</strong></p>
            <p>Türkiye'de çocuk psikiyatristi tanısı ve RAM raporu alan her çocuk için devlet, <strong>ayda 8 seans bireysel özel eğitim ve 4 seans grup eğitim ücretini</strong> doğrudan rehabilitasyon merkezine öder.</p>
            <p>Yukarıdaki hesaplama, ortalama özel ders/seans maliyetine göre cebinizden çıkmayıp devlet tarafından finanse edilen toplam maddi kazanımı gösterir.</p>
          </div>

          <div className="flex gap-2">
            <Button onClick={() => setShowCalculator(false)} className="w-full bg-indigo-600 hover:bg-indigo-700">Anladım</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ─── Ana bileşen ──────────────────────────────────────────────────────────────

export function ExpertMapPage() {
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [loadingInstitutions, setLoadingInstitutions] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCity, setFilterCity] = useState('Tümü');
  const [onlySgk, setOnlySgk] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>('default');
  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [selectedInst, setSelectedInst] = useState<Institution | null>(null);
  const [favs, setFavs] = useState<string[]>(() => loadFavs());

  useEffect(() => {
    institutionService.getAll()
      .then(setInstitutions)
      .finally(() => setLoadingInstitutions(false));
  }, []);

  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 9;

  const toggleFav = (id: string) => {
    const next = favs.includes(id) ? favs.filter(f => f !== id) : [...favs, id];
    setFavs(next);
    saveFavs(next);
    toast.success(favs.includes(id) ? 'Favorilerden çıkarıldı.' : '❤️ Favorilere eklendi.');
  };

  // Reset page to 1 on filter changes
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCurrentPage(1);
  }, [search, filterCity, activeTab, onlySgk, sortKey]);

  // Filtre + sıralama
  const filtered = useMemo(() => {
    const tab = TABS.find(t => t.key === activeTab);
    return institutions.filter(inst => {
      const q = search.toLowerCase();
      const matchSearch = !q
        || inst.name.toLowerCase().includes(q)
        || inst.city.toLowerCase().includes(q)
        || inst.specialties.some(s => s.toLowerCase().includes(q))
        || inst.services.some(s => s.toLowerCase().includes(q));
      const matchCity = filterCity === 'Tümü' || inst.city === filterCity || inst.city === 'Tüm İller';
      const matchCat = !tab?.cats || tab.cats.includes(inst.category);
      const matchFav = activeTab !== 'favorites' || favs.includes(inst.id);
      const matchSgk = !onlySgk || inst.sgkContract === true || inst.free === true;
      return matchSearch && matchCity && matchCat && matchFav && matchSgk;
    });
  }, [institutions, search, filterCity, activeTab, favs, onlySgk]);

  const visible = useMemo(() => {
    const list = [...filtered];
    if (sortKey === 'az') list.sort((a, b) => a.name.localeCompare(b.name, 'tr'));
    if (sortKey === 'city') list.sort((a, b) => a.city.localeCompare(b.city, 'tr'));
    return list;
  }, [filtered, sortKey]);

  const totalPages = Math.ceil(visible.length / ITEMS_PER_PAGE);

  const paginatedVisible = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return visible.slice(start, start + ITEMS_PER_PAGE);
  }, [visible, currentPage]);

  // Sekme sayıları
  const tabCounts = useMemo(() => {
    const counts: Record<TabKey, number> = { all: 0, hospital: 0, rehab: 0, state: 0, ngo: 0, favorites: 0 };
    institutions.forEach(inst => {
      const matchSearch = !search || inst.name.toLowerCase().includes(search.toLowerCase()) || inst.city.toLowerCase().includes(search.toLowerCase());
      const matchCity = filterCity === 'Tümü' || inst.city === filterCity || inst.city === 'Tüm İller';
      const matchSgk = !onlySgk || inst.sgkContract === true || inst.free === true;
      if (!matchSearch || !matchCity || !matchSgk) return;
      counts.all++;
      if (inst.category === 'university-hospital' || inst.category === 'private-hospital') counts.hospital++;
      if (inst.category === 'private-rehab') counts.rehab++;
      if (inst.category === 'state') counts.state++;
      if (inst.category === 'ngo') counts.ngo++;
      if (favs.includes(inst.id)) counts.favorites++;
    });
    return counts;
  }, [institutions, search, filterCity, favs, onlySgk]);

  return (
    <div className="space-y-6 max-w-5xl mx-auto px-4 py-6">
      <PageOnboarding
        pageId="expert_map"
        title="Kurum Rehberine Hoş Geldiniz"
        description="Türkiye genelindeki üniversite hastaneleri, özel hastaneler, rehabilitasyon merkezleri, devlet kurumları ve sivil toplum kuruluşlarını keşfedin."
        steps={[
          {
            icon: <Search size={20} />,
            title: "Kurum Arayın",
            description: "Kategori, şehir veya kurum adına göre filtreleme yaparak en uygun seçenekleri bulun."
          },
          {
            icon: <MapPin size={20} />,
            title: "Detayları İnceleyin",
            description: "Kurumların sunduğu hizmetleri, yaş aralıklarını ve SGK anlaşmalarını görüntüleyin."
          },
          {
            icon: <Heart size={20} />,
            title: "Favorilere Ekleyin",
            description: "Size uygun olan kurumları favorilerinize ekleyerek daha sonra kolayca ulaşın."
          }
        ]}
      />

      {/* Başlık */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Kurum Rehberi</h1>
          <p className="text-gray-500 mt-1">{loadingInstitutions ? '…' : institutions.length} kurum — Türkiye geneli hastaneler, merkezler ve sivil toplum kuruluşları</p>
        </div>
        <div className="shrink-0 text-right">
          <span className="inline-flex items-center gap-1.5 bg-gray-100 border border-gray-200 rounded-xl px-3 py-1.5 text-xs text-gray-600 font-medium">
            <Info size={11} className="text-gray-400" />Son güncelleme: {EXPERT_MAP_LAST_UPDATED}
          </span>
          <p className="text-[11px] text-gray-400 mt-1">Kaynak: resmi kurum ve kurum web siteleri</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
          <CheckCircle2 size={12} />Doğrulanmış kaynaklar
        </span>
        {EXPERT_MAP_SOURCES.map((source) => (
          <a
            key={source.url}
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:border-indigo-200 hover:text-indigo-700 transition-colors"
          >
            {source.label}<ExternalLink size={11} />
          </a>
        ))}
      </div>

      {/* Nereden başlamalıyım? */}
      <StartGuide />

      {/* Arama + Şehir + SGK toggle + Sıralama */}
      <div className="space-y-2">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Kurum, şehir, uzmanlık veya hizmet ara..."
              className="w-full pl-9 pr-9 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer">
                <X size={14} />
              </button>
            )}
          </div>
          <div className={`relative flex items-center rounded-xl border transition-colors ${filterCity !== 'Tümü' ? 'border-indigo-400 bg-indigo-50' : 'border-gray-200 bg-white'}`}>
            <MapPin size={14} className={`absolute left-3 pointer-events-none shrink-0 ${filterCity !== 'Tümü' ? 'text-indigo-500' : 'text-gray-400'}`} />
            <select
              value={filterCity} onChange={e => setFilterCity(e.target.value)}
              className={`pl-8 pr-8 py-2.5 text-sm focus:outline-none bg-transparent appearance-none cursor-pointer font-medium ${filterCity !== 'Tümü' ? 'text-indigo-700' : 'text-gray-600'}`}
            >
              <option value="Tümü">Tüm Şehirler</option>
              {CITIES.filter(c => c !== 'Tümü').map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <ChevronDown size={13} className={`absolute right-2.5 pointer-events-none ${filterCity !== 'Tümü' ? 'text-indigo-400' : 'text-gray-400'}`} />
            {filterCity !== 'Tümü' && (
              <button
                onClick={() => setFilterCity('Tümü')}
                className="absolute right-6 text-indigo-400 hover:text-indigo-600 cursor-pointer"
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 flex-wrap">
          {/* SGK toggle */}
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <button
              type="button"
              role="switch"
              aria-checked={onlySgk}
              onClick={() => setOnlySgk(v => !v)}
              className={`relative w-9 h-5 rounded-full transition-colors cursor-pointer ${onlySgk ? 'bg-green-500' : 'bg-gray-200'}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${onlySgk ? 'translate-x-4' : ''}`} />
            </button>
            <span className={`text-sm font-medium ${onlySgk ? 'text-green-700' : 'text-gray-600'}`}>
              Sadece SGK / Ücretsiz
            </span>
          </label>

          {/* Sıralama */}
          <select
            value={sortKey} onChange={e => setSortKey(e.target.value as SortKey)}
            className="border border-gray-200 rounded-xl px-3 py-1.5 text-sm focus:outline-none bg-white text-gray-600"
          >
            {SORT_OPTIONS.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
          </select>
        </div>
      </div>

      {/* Sekmeler */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
        {TABS.map(tab => {
          const count = tabCounts[tab.key];
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer whitespace-nowrap ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-white border border-gray-200 text-gray-600 hover:border-indigo-200 hover:text-indigo-600'
              }`}
            >
              {tab.label}
              <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${
                isActive
                  ? 'bg-white/20 text-white'
                  : tab.key === 'favorites' && count > 0
                    ? 'bg-red-50 text-red-500'
                    : 'bg-gray-100 text-gray-400'
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Sonuçlar */}
      {visible.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
          <p className="text-4xl mb-3">{activeTab === 'favorites' ? '❤️' : '🔍'}</p>
          <p className="font-semibold text-gray-700">
            {activeTab === 'favorites' ? 'Henüz favori eklenmedi' : 'Sonuç bulunamadı'}
          </p>
          <p className="text-sm text-gray-400 mt-1">
            {activeTab === 'favorites'
              ? 'Kartlardaki ❤️ ikonuna tıklayarak favorilere ekleyebilirsiniz.'
              : 'Arama veya filtre kriterlerini değiştirin.'}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {paginatedVisible.map(inst => (
              <InstCard key={inst.id} inst={inst} favs={favs} toggle={toggleFav} onClick={() => setSelectedInst(inst)} />
            ))}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-gray-100 mt-6">
              <p className="text-xs text-gray-500 font-medium">
                Toplam <span className="font-semibold text-gray-800">{visible.length}</span> kurum arasından{' '}
                <span className="font-semibold text-gray-800">
                  {Math.min(visible.length, (currentPage - 1) * ITEMS_PER_PAGE + 1)}-
                  {Math.min(visible.length, currentPage * ITEMS_PER_PAGE)}
                </span>{' '}
                arası gösteriliyor
              </p>
              
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 bg-white hover:bg-gray-50 hover:border-indigo-300 disabled:opacity-40 disabled:hover:border-gray-200 disabled:hover:bg-white transition-all cursor-pointer select-none"
                >
                  Önceki
                </button>
                
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => {
                  const isActive = currentPage === page;
                  return (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`w-9 h-9 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        isActive
                          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100'
                          : 'bg-white border border-gray-200 text-gray-600 hover:border-indigo-300 hover:text-indigo-600'
                      }`}
                    >
                      {page}
                    </button>
                  );
                })}
                
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 bg-white hover:bg-gray-50 hover:border-indigo-300 disabled:opacity-40 disabled:hover:border-gray-200 disabled:hover:bg-white transition-all cursor-pointer select-none"
                >
                  Sonraki
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <p className="text-xs text-gray-400 text-center pt-2">
        Bilgiler genel rehber amaçlıdır. Randevu için kurumları doğrudan arayın.
      </p>

      {selectedInst && (
        <DetailModal inst={selectedInst} onClose={() => setSelectedInst(null)} favs={favs} toggle={toggleFav} />
      )}
    </div>
  );
}
