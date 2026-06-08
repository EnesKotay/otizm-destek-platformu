import { useEffect, useState, useMemo } from 'react';
import {
  Plus, Trash2, ChevronDown, ChevronUp, Search,
  TrendingUp, AlertCircle, BookOpen, X, Pencil, BarChart2,
  Sparkles, Printer, Clock, MapPin, Download,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { PageOnboarding } from '@/components/ui/PageOnboarding';
import { useChildStore } from '@/store/childStore';
import { childService } from '@/services/childService';
import { behaviorJournalService } from '@/services/behaviorJournalService';
import { toast } from '@/store/toastStore';
import type { ABCEntry } from '@/types';

const CATEGORIES = [
  'Agresyon', 'Öz-Zarar', 'Kaçma / Kaçınma', 'Tantrum / Ağlama',
  'Stereotipik Davranış', 'Uyumsuzluk', 'Sosyal Geri Çekilme',
  'Yeme Reddi', 'Uyku Sorunu', 'Diğer',
];

const LOCATIONS = ['Ev', 'Okul', 'Terapi Merkezi', 'Dışarı', 'Araç', 'Market', 'Diğer'];

const ANTECEDENTS = [
  'İstek reddedildi', 'Rutin değişti', 'Yeni ortam', 'Kalabalık/Gürültü',
  'Geçiş (aktivite değişimi)', 'Bekleme süresi', 'Sosyal talep', 'Fiziksel rahatsızlık',
  'Açlık/Yorgunluk', 'Ekran süresi bitti', 'Oyun bitti', 'Ev ödevi',
];

const CONSEQUENCES = [
  'Talep iptal edildi', 'Dikkat verildi', 'Ayrıldım', 'Sakinleştirme uygulandı',
  'Yönlendirme yapıldı', 'Tercih verildi', 'Görmezden gelindi', 'Ceza uygulandı',
  'Ödül verildi', 'Uzlaşı sağlandı',
];

const INTENSITY_CONFIG = [
  { level: 1, label: 'Çok Hafif', color: 'bg-green-100 text-green-700 border-green-300' },
  { level: 2, label: 'Hafif',     color: 'bg-lime-100 text-lime-700 border-lime-300' },
  { level: 3, label: 'Orta',      color: 'bg-yellow-100 text-yellow-700 border-yellow-300' },
  { level: 4, label: 'Şiddetli',  color: 'bg-orange-100 text-orange-700 border-orange-300' },
  { level: 5, label: 'Çok Şiddetli', color: 'bg-red-100 text-red-700 border-red-300' },
] as const;

function exportCsvABC(entries: ABCEntry[], childName: string) {
  if (!entries.length) return;
  const header = 'Tarih,Saat,Kategori,Yer,Şiddet,A-Tetikleyici,B-Davranış,C-Sonuç,Notlar';
  const rows = entries.map(e =>
    [e.date, e.time, e.category, e.location, e.intensity,
      `"${e.antecedent.replace(/"/g, '""')}"`,
      `"${e.behavior.replace(/"/g, '""')}"`,
      `"${e.consequence.replace(/"/g, '""')}"`,
      `"${(e.notes || '').replace(/"/g, '""')}"`
    ].join(',')
  );
  const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `abc-davranis-${childName}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function intensityConfig(level: number) {
  return INTENSITY_CONFIG.find(c => c.level === level) ?? INTENSITY_CONFIG[2];
}

const EMPTY_FORM = {
  date: new Date().toISOString().split('T')[0],
  time: new Date().toTimeString().slice(0, 5),
  antecedent: '',
  antecedentCustom: '',
  behavior: '',
  consequence: '',
  consequenceCustom: '',
  intensity: 3 as ABCEntry['intensity'],
  category: '',
  location: '',
  notes: '',
};

export function BehaviorJournalPage() {
  const { children, setChildren, selectedChild, setSelectedChild } = useChildStore();
  const selectedChildId = selectedChild?.id ?? '';
  const [entries, setEntries] = useState<ABCEntry[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState<ABCEntry | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [filterIntensity, setFilterIntensity] = useState(0);
  const [showStats, setShowStats] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isLoadingEntries, setIsLoadingEntries] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

   
  useEffect(() => {
    if (!children.length) childService.getAll().then(setChildren).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedChild && children.length) setSelectedChild(children[0]);
  }, [children, selectedChild, setSelectedChild]);

  useEffect(() => {
    if (!selectedChildId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setEntries([]);
      return;
    }
    let cancelled = false;
    setIsLoadingEntries(true);
    behaviorJournalService.getByChild(selectedChildId)
      .then(data => {
        if (!cancelled) setEntries(data);
      })
      .catch((error) => toast.error(error.message || 'ABC kayıtları yüklenemedi.'))
      .finally(() => {
        if (!cancelled) setIsLoadingEntries(false);
      });
    return () => { cancelled = true; };
  }, [selectedChildId]);

  const openAdd = () => {
    setEditingEntry(null);
    setForm({ ...EMPTY_FORM });
    setShowModal(true);
  };

  const openEdit = (e: ABCEntry) => {
    setEditingEntry(e);
    setForm({
      date: e.date, time: e.time,
      antecedent: ANTECEDENTS.includes(e.antecedent) ? e.antecedent : 'Diğer',
      antecedentCustom: ANTECEDENTS.includes(e.antecedent) ? '' : e.antecedent,
      behavior: e.behavior,
      consequence: CONSEQUENCES.includes(e.consequence) ? e.consequence : 'Diğer',
      consequenceCustom: CONSEQUENCES.includes(e.consequence) ? '' : e.consequence,
      intensity: e.intensity,
      category: e.category,
      location: e.location,
      notes: e.notes ?? '',
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (isSaving) return;
    const ant = form.antecedent === 'Diğer' ? form.antecedentCustom : form.antecedent;
    const con = form.consequence === 'Diğer' ? form.consequenceCustom : form.consequence;
    if (!ant || !form.behavior || !con || !form.category || !form.location) {
      toast.error('Lütfen tüm zorunlu alanları doldurun.');
      return;
    }
    const payload = {
      childId: selectedChildId,
      date: form.date,
      time: form.time,
      antecedent: ant,
      behavior: form.behavior,
      consequence: con,
      intensity: form.intensity,
      category: form.category,
      location: form.location,
      notes: form.notes,
    };

    setIsSaving(true);
    try {
      const saved = editingEntry
        ? await behaviorJournalService.update(editingEntry.id, payload)
        : await behaviorJournalService.create(payload);
      const updated = editingEntry
        ? entries.map(e => e.id === saved.id ? saved : e)
        : [saved, ...entries];
      updated.sort((a, b) => `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`));
      setEntries(updated);
      setShowModal(false);
      toast.success(editingEntry ? 'Kayıt güncellendi.' : 'ABC kaydı eklendi.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'ABC kaydı kaydedilemedi.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await behaviorJournalService.delete(id);
      setEntries(entries.filter(e => e.id !== id));
      setDeleteId(null);
      toast.success('Kayıt silindi.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Kayıt silinemedi.');
    }
  };

  const filtered = useMemo(() => entries.filter(e => {
    const q = search.toLowerCase();
    const matchSearch = !q || e.antecedent.toLowerCase().includes(q) || e.behavior.toLowerCase().includes(q) || e.consequence.toLowerCase().includes(q);
    const matchCat = !filterCat || e.category === filterCat;
    const matchInt = !filterIntensity || e.intensity === filterIntensity;
    return matchSearch && matchCat && matchInt;
  }), [entries, search, filterCat, filterIntensity]);

  const stats = useMemo(() => {
    const byCategory: Record<string, number> = {};
    const byDay: Record<string, number> = {};
    const byIntensity: Record<number, number> = {};
    entries.forEach(e => {
      byCategory[e.category] = (byCategory[e.category] ?? 0) + 1;
      byDay[e.date] = (byDay[e.date] ?? 0) + 1;
      byIntensity[e.intensity] = (byIntensity[e.intensity] ?? 0) + 1;
    });
    const topCat = Object.entries(byCategory).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const last7 = Object.entries(byDay)
      // eslint-disable-next-line react-hooks/purity
      .filter(([d]) => d >= new Date(Date.now() - 7 * 864e5).toISOString().split('T')[0])
      .sort((a, b) => a[0].localeCompare(b[0]));
    const avgIntensity = entries.length ? (entries.reduce((s, e) => s + e.intensity, 0) / entries.length).toFixed(1) : '—';
    return { byCategory, topCat, last7, byIntensity, avgIntensity };
  }, [entries]);

  const insights = useMemo(() => {
    const list = [];
    if (entries.length === 0) return [];

    if (entries.length < 3) {
      list.push({
        type: 'info',
        title: 'Akıllı Analiz İçin Kayıt Girişi Yapın',
        description: 'Çocuğunuzun davranış örüntülerini (tetikleyiciler, yorgunluk pik noktaları, yer hassasiyetleri) yapay zekâ desteğiyle analiz edebilmemiz için en az 3 adet ABC kaydı girilmelidir. Kayıtlarınız arttıkça bu alanda özel öneriler listelenecektir.',
        color: 'bg-indigo-50/50 border-indigo-100 text-indigo-800',
        badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-200',
        icon: <Sparkles className="text-indigo-600 animate-pulse" size={18} />
      });
      return list;
    }

    // Rule 1: Sensory Overload (Gürültü / Kalabalık)
    const sensoryCount = entries.filter(e =>
      e.antecedent.toLowerCase().includes('gürültü') ||
      e.antecedent.toLowerCase().includes('kalabalık')
    ).length;
    const sensoryPct = Math.round((sensoryCount / entries.length) * 100);
    if (sensoryPct >= 20) {
      list.push({
        type: 'sensory',
        title: 'Duyusal Hassasiyet Örüntüsü (Gürültü / Kalabalık)',
        description: `Çocuğunuzun davranışlarının %${sensoryPct}'si gürültülü veya kalabalık ortamlarda tetiklenmiş. Dışarı çıkarken gürültü önleyici kulaklık kullanmak, kalabalık saatlerden kaçınmak ve sakin duyusal mola alanları belirlemek regülasyonu destekleyebilir.`,
        color: 'bg-blue-50 border-blue-200 text-blue-900',
        badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
        icon: <AlertCircle className="text-blue-600" size={18} />
      });
    }

    // Rule 2: Routine and Transitions
    const transitionCount = entries.filter(e =>
      e.antecedent.toLowerCase().includes('rutin') ||
      e.antecedent.toLowerCase().includes('geçiş') ||
      e.antecedent.toLowerCase().includes('değişti')
    ).length;
    const transitionPct = Math.round((transitionCount / entries.length) * 100);
    if (transitionPct >= 20) {
      list.push({
        type: 'transition',
        title: 'Geçiş Süreçleri ve Rutin Yönetimi İpucu',
        description: `Zorlayıcı davranışların %${transitionPct}'si rutin değişiklikleri veya aktivite geçişlerinde gözlemleniyor. Yeni bir aktiviteye geçmeden önce görsel zamanlayıcı (visual timer) kullanmak veya geçiş kartlarıyla (örn: 'Önce Yemek, Sonra Park') bilgilendirme yapmak çocuğunuzun kaygısını önemli ölçüde azaltabilir.`,
        color: 'bg-purple-50 border-purple-200 text-purple-900',
        badgeColor: 'bg-purple-100 text-purple-800 border-purple-200',
        icon: <TrendingUp className="text-purple-600" size={18} />
      });
    }

    // Rule 3: Time-based Fatigue Analysis
    const fatigueCount = entries.filter(e => {
      if (!e.time) return false;
      const hour = parseInt(e.time.split(':')[0], 10);
      return hour >= 15 && hour <= 18;
    }).length;
    const fatiguePct = Math.round((fatigueCount / entries.length) * 100);
    if (fatiguePct >= 30) {
      list.push({
        type: 'fatigue',
        title: 'Öğleden Sonra Yorgunluk Pik Noktası',
        description: `Kayıtlar, davranışların %${fatiguePct} oranında öğleden sonra (15:00 - 18:00) yoğunlaştığını gösteriyor. Okul veya terapi sonrası dinlenme süresini uzatmak, duyusal yük oluşturmayan etkinlikleri tercih etmek ve hafif bir ara öğün eklemek bu saatlerdeki krizlerin önüne geçebilir.`,
        color: 'bg-amber-50 border-amber-200 text-amber-900',
        badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
        icon: <Clock className="text-amber-600" size={18} />
      });
    }

    // Rule 4: Location Trigger Analysis
    const locationCount = entries.filter(e =>
      e.location.toLowerCase().includes('market') ||
      e.location.toLowerCase().includes('dışarı')
    ).length;
    const locationPct = Math.round((locationCount / entries.length) * 100);
    if (locationPct >= 25) {
      list.push({
        type: 'location',
        title: 'Dış Ortam & Market Rutini Önerisi',
        description: `Kayıtların %${locationPct}'si dışarıda veya market ortamlarında gerçekleşiyor. Dışarı çıkmadan önce sosyal öyküler (örn: 'Markete Gidiyoruz') okumak, çocuğunuza markette somut bir görev vermek (örn: '3 adet muz seçip sepete koyma') dikkatini olumlu yönde odaklayabilir.`,
        color: 'bg-rose-50 border-rose-200 text-rose-900',
        badgeColor: 'bg-rose-100 text-rose-800 border-rose-200',
        icon: <MapPin className="text-rose-600" size={18} />
      });
    }

    // Rule 5: Successful Intervention Analysis
    const successCount = entries.filter(e =>
      e.consequence.toLowerCase().includes('sakinleştirme') ||
      e.consequence.toLowerCase().includes('uzlaşı') ||
      e.consequence.toLowerCase().includes('yönlendirme')
    ).length;
    const successPct = Math.round((successCount / entries.length) * 100);
    if (successPct >= 30) {
      list.push({
        type: 'success',
        title: 'Başarılı Sakinleştirme Yöntemi Yakalandı',
        description: `Kayıtlarınızda sakinleştirme ve uzlaşı arama gibi olumlu yaklaşımlar %${successPct} oranında tercih edilmiş. Bu yöntemler kriz anlarını azaltmada en etkili çözümdür. Kriz öncesi erken uyarı sinyallerinde derin nefes ve duyusal regülasyon oyuncaklarını kullanmaya devam edin.`,
        color: 'bg-emerald-50 border-emerald-200 text-emerald-900',
        badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        icon: <BookOpen className="text-emerald-600" size={18} />
      });
    }

    // Default if no patterns are high enough
    if (list.length === 0) {
      list.push({
        type: 'general',
        title: 'Davranış Gözlem İpucu',
        description: 'Şu ana kadar eklediğiniz kayıtlar incelendiğinde baskın bir tetikleyici veya hassasiyet tespit edilememiştir. Davranışları tam zamanında, öncesi (tetikleyici) ve sonrası (yapılan müdahale) detaylarıyla tam olarak kaydetmeye devam ederek örüntü keşfini hızlandırabilirsiniz.',
        color: 'bg-teal-50 border-teal-200 text-teal-900',
        badgeColor: 'bg-teal-100 text-teal-800 border-teal-200',
        icon: <Sparkles className="text-teal-600" size={18} />
      });
    }

    return list;
  }, [entries]);

  return (
    <>
      <div className="space-y-6 print:hidden">
        <PageOnboarding
          pageId="behavior-journal"
          title="Davranış Günlüğüne Hoş Geldiniz"
          description="Çocuğunuzun olumlu veya zorlayıcı davranışlarını (ABC modeliyle) kayıt altına alın."
          steps={[
            {
              icon: <Plus size={20} />,
              title: "Tetikleyiciyi (A) Belirleyin",
              description: "Davranıştan hemen önce ne oldu? Çevresel faktörleri veya talepleri not edin."
            },
            {
              icon: <AlertCircle size={20} />,
              title: "Davranışı (B) Gözlemleyin",
              description: "Çocuğun tam olarak ne yaptığını ve davranışın şiddetini objektif olarak yazın."
            },
            {
              icon: <BookOpen size={20} />,
              title: "Sonucu (C) Kaydedin",
              description: "Davranıştan hemen sonra sizin ne yaptığınızı veya ne olduğunu ekleyin."
            }
          ]}
        />

        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Davranış ABC Günlüğü</h1>
            <p className="text-gray-500 mt-1">Antecedent → Behavior → Consequence kaydı</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 bg-white text-gray-600 hover:text-gray-800 hover:bg-gray-50 text-sm font-medium transition-all cursor-pointer shadow-sm"
            >
              <Printer size={15} /> Raporu Yazdır
            </button>
            {entries.length > 0 && (
              <button
                onClick={() => exportCsvABC(entries, selectedChild?.name ?? 'cocuk')}
                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 bg-white text-gray-600 hover:text-gray-800 hover:bg-gray-50 text-sm font-medium transition-all cursor-pointer shadow-sm"
              >
                <Download size={15} /> CSV
              </button>
            )}
            <button
              onClick={() => setShowStats(s => !s)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition-all cursor-pointer ${showStats ? 'bg-indigo-50 border-indigo-300 text-indigo-700' : 'bg-white border-gray-200 text-gray-600'}`}
            >
              <BarChart2 size={15} /> İstatistikler
            </button>
            <Button onClick={openAdd}><Plus size={15} className="mr-1" /> Kayıt Ekle</Button>
          </div>
        </div>

        {/* Child selector */}
        {children.length > 1 && (
          <div className="flex gap-2 flex-wrap">
            {children.map(c => (
              <button key={c.id} onClick={() => setSelectedChild(c)}
                className={`px-4 py-2 rounded-xl border text-sm font-medium transition-all cursor-pointer ${selectedChildId === c.id ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white border-gray-200 text-gray-600 hover:border-indigo-300'}`}>
                {c.name}
              </button>
            ))}
          </div>
        )}

        {/* AI Insights & Guidance Panel */}
        {selectedChildId && insights.length > 0 && (
          <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 p-[1.5px] rounded-2xl shadow-md shadow-indigo-100/50">
            <div className="bg-white rounded-[15px] p-5">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <div className="bg-indigo-50 p-2 rounded-xl text-indigo-600">
                    <Sparkles size={20} className="animate-pulse" />
                  </div>
                  <div>
                    <h2 className="text-md font-bold text-gray-800 flex items-center gap-1.5">
                      Yapay Zekâ Destekli Davranış Analizi & Öneriler
                    </h2>
                    <p className="text-xs text-gray-500">{selectedChild?.name} için güncel davranış örüntüsü bulguları</p>
                  </div>
                </div>
                <span className="text-[10px] bg-purple-50 text-purple-700 font-semibold px-2.5 py-1 rounded-full border border-purple-100">
                  Klinik Analiz
                </span>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                {insights.map((insight, idx) => (
                  <div key={idx} className={`p-4 rounded-xl border flex gap-3 transition-all hover:shadow-sm ${insight.color}`}>
                    <div className="shrink-0 mt-0.5">{insight.icon}</div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-bold text-gray-800 leading-tight">{insight.title}</h3>
                        <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${insight.badgeColor}`}>
                          Öneri
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 leading-relaxed">{insight.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {!selectedChildId ? (
          <EmptyState icon={<BookOpen size={28} />} title="Çocuk profili bulunamadı" description="Lütfen önce Çocuklarım sayfasından profil ekleyin." />
        ) : (
          <>
            {isLoadingEntries && (
              <Card className="p-4 text-sm text-gray-500">
                ABC kayıtları yükleniyor...
              </Card>
            )}

            {/* Top antecedents quick summary */}
            {entries.length >= 3 && stats.topCat.length > 0 && (
              <div className="flex flex-wrap gap-2 items-center">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">En sık tetikleyici:</span>
                {Object.entries(
                  entries.reduce<Record<string, number>>((acc, e) => {
                    acc[e.antecedent] = (acc[e.antecedent] ?? 0) + 1;
                    return acc;
                  }, {})
                )
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 3)
                  .map(([ant, count]) => (
                    <span key={ant} className="flex items-center gap-1 text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100 px-3 py-1 rounded-full">
                      {ant}
                      <span className="bg-blue-200 text-blue-800 rounded-full px-1.5 py-0.5 text-[10px] font-bold">{count}</span>
                    </span>
                  ))}
              </div>
            )}

            {/* Stats Panel */}
            {showStats && (
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="p-4">
                  <p className="text-xs text-gray-500 mb-1">Toplam Kayıt</p>
                  <p className="text-3xl font-bold text-indigo-600">{entries.length}</p>
                </Card>
                <Card className="p-4">
                  <p className="text-xs text-gray-500 mb-1">Son 7 Gün</p>
                  <p className="text-3xl font-bold text-purple-600">{stats.last7.reduce((s, [, n]) => s + n, 0)}</p>
                </Card>
                <Card className="p-4">
                  <p className="text-xs text-gray-500 mb-1">Ort. Şiddet</p>
                  <p className="text-3xl font-bold text-orange-500">{stats.avgIntensity}</p>
                </Card>
                <Card className="p-4">
                  <p className="text-xs text-gray-500 mb-1">En Sık Kategori</p>
                  <p className="text-base font-bold text-gray-800 leading-tight">{stats.topCat[0]?.[0] ?? '—'}</p>
                  {stats.topCat[0] && <p className="text-xs text-gray-400 mt-0.5">{stats.topCat[0][1]} kez</p>}
                </Card>
                {stats.topCat.length > 0 && (
                  <Card className="sm:col-span-2 p-4">
                    <p className="text-xs font-semibold text-gray-600 mb-3 uppercase tracking-wide">Kategoriye Göre Dağılım</p>
                    <div className="space-y-2">
                      {stats.topCat.map(([cat, count]) => {
                        const pct = Math.round((count / entries.length) * 100);
                        return (
                          <div key={cat}>
                            <div className="flex justify-between text-xs text-gray-600 mb-0.5">
                              <span>{cat}</span><span>{count} kayıt ({pct}%)</span>
                            </div>
                            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </Card>
                )}
                {stats.last7.length > 0 && (
                  <Card className="sm:col-span-2 p-4">
                    <p className="text-xs font-semibold text-gray-600 mb-3 uppercase tracking-wide">Son 7 Gün</p>
                    <div className="flex items-end gap-1 h-16">
                      {stats.last7.map(([date, count]) => {
                        const maxCount = Math.max(...stats.last7.map(([, n]) => n));
                        const h = maxCount > 0 ? Math.round((count / maxCount) * 100) : 0;
                        return (
                          <div key={date} className="flex-1 flex flex-col items-center gap-1">
                            <span className="text-[9px] text-gray-500">{count}</span>
                            <div className="w-full bg-indigo-400 rounded-t" style={{ height: `${Math.max(h, 6)}%` }} title={`${date}: ${count}`} />
                            <span className="text-[9px] text-gray-400">{date.slice(5)}</span>
                          </div>
                        );
                      })}
                    </div>
                  </Card>
                )}
              </div>
            )}

            {/* Filters */}
            <div className="flex gap-2 flex-wrap">
              <div className="relative flex-1 min-w-48">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Davranış, tetikleyici ara..."
                  className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white" />
              </div>
              <select value={filterCat} onChange={e => setFilterCat(e.target.value)}
                className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white cursor-pointer">
                <option value="">Tüm Kategoriler</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <select value={filterIntensity} onChange={e => setFilterIntensity(Number(e.target.value))}
                className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white cursor-pointer">
                <option value={0}>Tüm Şiddetler</option>
                {INTENSITY_CONFIG.map(c => <option key={c.level} value={c.level}>{c.level} - {c.label}</option>)}
              </select>
              {(search || filterCat || filterIntensity > 0) && (
                <button onClick={() => { setSearch(''); setFilterCat(''); setFilterIntensity(0); }}
                  className="flex items-center gap-1 px-3 py-2 text-sm text-gray-500 hover:text-red-500 cursor-pointer">
                  <X size={14} /> Temizle
                </button>
              )}
            </div>

            {filtered.length === 0 ? (
              <EmptyState icon={<BookOpen size={28} />}
                title="Kayıt bulunamadı"
                description={entries.length === 0 ? `${selectedChild?.name} için henüz ABC kaydı eklenmedi.` : 'Arama kriterlerine uygun kayıt yok.'}
                action={entries.length === 0 ? <Button onClick={openAdd}><Plus size={14} className="mr-1" />İlk Kaydı Ekle</Button> : undefined} />
            ) : (
              <div className="space-y-3">
                {filtered.map(entry => {
                  const ic = intensityConfig(entry.intensity);
                  const isExpanded = expandedId === entry.id;
                  return (
                    <div key={entry.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden transition-all hover:border-gray-200">
                      <button className="w-full text-left p-4 hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : entry.id)}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span className="text-xs font-semibold text-gray-500">{new Date(entry.date + 'T' + entry.time).toLocaleDateString('tr-TR', { day:'numeric', month:'short', year:'numeric' })} {entry.time}</span>
                              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${ic.color}`}>{entry.intensity} — {ic.label}</span>
                              <span className="text-[11px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full">{entry.category}</span>
                              <span className="text-[11px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{entry.location}</span>
                            </div>
                            <p className="text-sm text-gray-800 font-medium truncate">{entry.behavior}</p>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button onClick={e => { e.stopPropagation(); openEdit(entry); }} className="p-1.5 rounded-lg hover:bg-indigo-50 text-gray-400 hover:text-indigo-600 cursor-pointer"><Pencil size={13} /></button>
                            <button onClick={e => { e.stopPropagation(); setDeleteId(entry.id); }} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 cursor-pointer"><Trash2 size={13} /></button>
                            {isExpanded ? <ChevronUp size={15} className="text-gray-400" /> : <ChevronDown size={15} className="text-gray-400" />}
                          </div>
                        </div>
                      </button>
                      {isExpanded && (
                        <div className="px-4 pb-4 grid grid-cols-1 sm:grid-cols-3 gap-3 border-t border-gray-100 pt-3">
                          <div className="bg-blue-50 rounded-xl p-3">
                            <p className="text-[10px] font-bold text-blue-500 uppercase tracking-wide mb-1">A — Öncesi (Tetikleyici)</p>
                            <p className="text-sm text-blue-900">{entry.antecedent}</p>
                          </div>
                          <div className="bg-orange-50 rounded-xl p-3">
                            <p className="text-[10px] font-bold text-orange-500 uppercase tracking-wide mb-1">B — Davranış</p>
                            <p className="text-sm text-orange-900">{entry.behavior}</p>
                          </div>
                          <div className="bg-green-50 rounded-xl p-3">
                            <p className="text-[10px] font-bold text-green-600 uppercase tracking-wide mb-1">C — Sonuç (Yapılan)</p>
                            <p className="text-sm text-green-900">{entry.consequence}</p>
                          </div>
                          {entry.notes && (
                            <div className="sm:col-span-3 bg-gray-50 rounded-xl p-3">
                              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1">Notlar</p>
                              <p className="text-sm text-gray-700">{entry.notes}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* Add/Edit Modal */}
        <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editingEntry ? 'Kaydı Düzenle' : 'Yeni ABC Kaydı'} className="max-w-2xl">
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tarih</label>
                <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Saat</label>
                <input type="time" value={form.time} onChange={e => setForm(f => ({ ...f, time: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kategori *</label>
                <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white cursor-pointer">
                  <option value="">Seçin...</option>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Yer *</label>
                <select value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white cursor-pointer">
                  <option value="">Seçin...</option>
                  {LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
            </div>

            <div className="bg-blue-50 rounded-xl p-4 space-y-3">
              <p className="text-sm font-semibold text-blue-700">A — Öncesi (Tetikleyici) *</p>
              <div className="flex flex-wrap gap-2">
                {ANTECEDENTS.map(a => (
                  <button key={a} type="button" onClick={() => setForm(f => ({ ...f, antecedent: a }))}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-all cursor-pointer ${form.antecedent === a ? 'bg-blue-600 text-white border-blue-600' : 'bg-white border-gray-200 text-gray-600 hover:border-blue-300'}`}>
                    {a}
                  </button>
                ))}
                <button type="button" onClick={() => setForm(f => ({ ...f, antecedent: 'Diğer' }))}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-all cursor-pointer ${form.antecedent === 'Diğer' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white border-gray-200 text-gray-600 hover:border-blue-300'}`}>
                  Diğer...
                </button>
              </div>
              {form.antecedent === 'Diğer' && (
                <input value={form.antecedentCustom} onChange={e => setForm(f => ({ ...f, antecedentCustom: e.target.value }))}
                  placeholder="Tetikleyiciyi açıklayın..."
                  className="w-full border border-blue-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white" />
              )}
            </div>

            <div className="bg-orange-50 rounded-xl p-4 space-y-2">
              <p className="text-sm font-semibold text-orange-700">B — Davranış (Ne oldu?) *</p>
              <textarea value={form.behavior} onChange={e => setForm(f => ({ ...f, behavior: e.target.value }))}
                rows={2} placeholder="Davranışı ayrıntılı açıklayın..."
                className="w-full border border-orange-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white resize-none" />
            </div>

            <div className="bg-green-50 rounded-xl p-4 space-y-3">
              <p className="text-sm font-semibold text-green-700">C — Sonuç (Ne yaptınız?) *</p>
              <div className="flex flex-wrap gap-2">
                {CONSEQUENCES.map(c => (
                  <button key={c} type="button" onClick={() => setForm(f => ({ ...f, consequence: c }))}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-all cursor-pointer ${form.consequence === c ? 'bg-green-600 text-white border-green-600' : 'bg-white border-gray-200 text-gray-600 hover:border-green-300'}`}>
                    {c}
                  </button>
                ))}
                <button type="button" onClick={() => setForm(f => ({ ...f, consequence: 'Diğer' }))}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-all cursor-pointer ${form.consequence === 'Diğer' ? 'bg-green-600 text-white border-green-600' : 'bg-white border-gray-200 text-gray-600 hover:border-green-300'}`}>
                  Diğer...
                </button>
              </div>
              {form.consequence === 'Diğer' && (
                <input value={form.consequenceCustom} onChange={e => setForm(f => ({ ...f, consequenceCustom: e.target.value }))}
                  placeholder="Uyguladığınız müdahaleyi açıklayın..."
                  className="w-full border border-green-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 bg-white" />
              )}
            </div>

            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Şiddet Düzeyi *</p>
              <div className="flex gap-2">
                {INTENSITY_CONFIG.map(ic => (
                  <button key={ic.level} type="button" onClick={() => setForm(f => ({ ...f, intensity: ic.level as ABCEntry['intensity'] }))}
                    className={`flex-1 py-2 rounded-xl border-2 text-xs font-semibold transition-all cursor-pointer ${form.intensity === ic.level ? ic.color + ' border-current' : 'bg-gray-50 border-gray-200 text-gray-500'}`}>
                    {ic.level}<br />{ic.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ek Notlar</label>
              <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                rows={2} placeholder="Varsa ek gözlemleriniz..."
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none bg-white font-sans" />
            </div>

            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setShowModal(false)} className="flex-1">İptal</Button>
              <Button onClick={handleSave} loading={isSaving} className="flex-1">Kaydet</Button>
            </div>
          </div>
        </Modal>

        <ConfirmModal isOpen={!!deleteId} title="Kaydı sil?" message="Bu ABC kaydı kalıcı olarak silinecek." confirmLabel="Evet, sil" variant="danger"
          onConfirm={() => deleteId && handleDelete(deleteId)} onCancel={() => setDeleteId(null)} />
      </div>

      {/* Clinical Print Report Template - Only visible when printing */}
      <div className="hidden print:block p-8 space-y-6 bg-white text-black min-h-screen font-sans" id="clinical-print-report">
        <div className="flex justify-between items-center border-b-2 border-indigo-600 pb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">OTİZM DESTEK PLATFORMU</h1>
            <p className="text-xs text-indigo-600 uppercase tracking-widest font-semibold">Klinik Davranış Gözlem ve ABC Raporu</p>
          </div>
          <div className="text-right text-xs text-gray-500">
            <p>Rapor Tarihi: {new Date().toLocaleDateString('tr-TR')}</p>
            <p>Çocuk Profili: <strong className="text-gray-800">{selectedChild?.name}</strong></p>
          </div>
        </div>

        {/* Quick Stats Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border border-gray-200 rounded-xl p-4 bg-gray-50/50">
          <div>
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Toplam Gözlem Kaydı</p>
            <p className="text-lg font-extrabold text-indigo-700 mt-0.5">{entries.length} Kayıt</p>
          </div>
          <div>
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Ortalama Davranış Şiddeti</p>
            <p className="text-lg font-extrabold text-orange-600 mt-0.5">{stats.avgIntensity} / 5</p>
          </div>
          <div>
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Baskın Kategori (En Sık)</p>
            <p className="text-lg font-extrabold text-gray-800 mt-0.5">{stats.topCat[0]?.[0] ?? 'Yetersiz Kayıt'}</p>
          </div>
        </div>

        {/* AI Insights Summary */}
        {insights.length > 0 && insights[0]?.type !== 'info' && (
          <div className="border border-indigo-100 rounded-xl p-4 space-y-3 bg-indigo-50/20">
            <h2 className="text-xs font-bold text-indigo-800 uppercase tracking-wider">✨ Sistem Tarafından Tespit Edilen Davranış Örüntüleri</h2>
            <div className="space-y-2">
              {insights.map((ins, idx) => (
                <div key={idx} className="text-xs text-gray-700 leading-relaxed">
                  <strong className="text-indigo-900">• {ins.title}:</strong> {ins.description}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Full List of ABC logs */}
        <div className="space-y-3">
          <h2 className="text-xs font-bold text-gray-800 uppercase tracking-wider border-b border-gray-200 pb-1.5">📋 Detaylı Günlük Davranış Gözlem Listesi</h2>
          <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
          <table className="w-full text-left text-xs border-collapse min-w-[600px]">
            <thead>
              <tr className="bg-gray-100 text-gray-700 uppercase font-semibold border-b border-gray-200">
                <th className="p-2 border border-gray-200 w-24">Tarih / Saat</th>
                <th className="p-2 border border-gray-200 w-32">Kategori / Şiddet</th>
                <th className="p-2 border border-gray-200 w-40">A — Öncesi (Tetikleyici)</th>
                <th className="p-2 border border-gray-200">B — Gözlemlenen Davranış</th>
                <th className="p-2 border border-gray-200 w-44">C — Sonuç (Yapılan Müdahale)</th>
              </tr>
            </thead>
            <tbody>
              {entries.map(e => {
                const ic = intensityConfig(e.intensity);
                return (
                  <tr key={e.id} className="border-b border-gray-100 hover:bg-gray-50/50">
                    <td className="p-2 border border-gray-200 align-top text-gray-600">
                      {new Date(e.date + 'T' + e.time).toLocaleDateString('tr-TR', { day:'numeric', month:'short' })}<br/>
                      <span className="text-gray-400 font-semibold">{e.time}</span>
                    </td>
                    <td className="p-2 border border-gray-200 align-top">
                      <span className="font-semibold text-gray-800">{e.category}</span><br/>
                      <span className="text-[10px] text-gray-500 block">Konum: {e.location}</span>
                      <span className="text-[10px] font-semibold text-orange-600 block mt-0.5">Şiddet: {e.intensity}/5 ({ic.label})</span>
                    </td>
                    <td className="p-2 border border-gray-200 align-top text-blue-900 font-medium bg-blue-50/10">{e.antecedent}</td>
                    <td className="p-2 border border-gray-200 align-top">
                      <span className="text-gray-800 block leading-relaxed">{e.behavior}</span>
                      {e.notes && <p className="text-[10px] text-gray-400 italic mt-1 bg-gray-50 p-1.5 rounded">Gözlemci Notu: {e.notes}</p>}
                    </td>
                    <td className="p-2 border border-gray-200 align-top text-green-900 font-medium bg-green-50/10">{e.consequence}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        </div>

        {/* Signature Section */}
        <div className="pt-16 flex justify-between text-xs text-gray-500">
          <div>
            <p className="font-medium text-gray-700">Raporu Hazırlayan Ebeveyn / Vasi</p>
            <p className="mt-12 border-t border-gray-300 pt-1 w-48 text-center">İmza</p>
          </div>
          <div className="text-right">
            <p className="font-medium text-gray-700">Klinik Takip Terapisti / Hekim</p>
            <p className="mt-12 border-t border-gray-300 pt-1 w-48 text-center">Tarih / İmza</p>
          </div>
        </div>
      </div>
    </>
  );
}
