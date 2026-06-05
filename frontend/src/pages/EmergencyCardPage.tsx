import { useEffect, useState } from 'react';
import { Save, Printer, ShieldAlert, Phone, Heart, AlertTriangle, CheckCircle, User } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { useChildStore } from '@/store/childStore';
import { childService } from '@/services/childService';
import { emergencyCardService } from '@/services/emergencyCardService';
import { toast } from '@/store/toastStore';
import { PageOnboarding } from '@/components/ui/PageOnboarding';
import QRCode from 'react-qr-code';
const QRCodeComp = (QRCode as any).default || QRCode;

export interface EmergencyProfile {
  childId: string;
  updatedAt: string;
  childName: string;
  birthDate: string;
  photo?: string;
  diagnosisInfo: string;
  communicationLevel: string;
  languages: string;
  contactName1: string;
  contactPhone1: string;
  contactRelation1: string;
  contactName2: string;
  contactPhone2: string;
  contactRelation2: string;
  doctorName: string;
  doctorPhone: string;
  hospital: string;
  medications: string;
  allergies: string;
  medicalConditions: string;
  triggersList: string;
  calmingStrategies: string;
  avoidList: string;
  selfInjury: boolean;
  wandering: boolean;
  nonVerbal: boolean;
  specialInstructions: string;
  bloodType: string;
}


const COMM_LEVELS = ['Sözel İletişim Yok', 'Birkaç Kelime', 'Kısa Cümleler', 'Cümle Kurar', 'Akıcı Konuşma', 'AAC Cihazı Kullanır'];
const BLOOD_TYPES = ['', 'A Rh+', 'A Rh-', 'B Rh+', 'B Rh-', 'AB Rh+', 'AB Rh-', '0 Rh+', '0 Rh-', 'Bilinmiyor'];

const empty = (childId: string, childName: string, birthDate: string): EmergencyProfile => ({
  childId, updatedAt: '', childName, birthDate,
  diagnosisInfo: 'Otizm Spektrum Bozukluğu (OSB)',
  communicationLevel: '', languages: 'Türkçe',
  contactName1: '', contactPhone1: '', contactRelation1: 'Anne',
  contactName2: '', contactPhone2: '', contactRelation2: 'Baba',
  doctorName: '', doctorPhone: '', hospital: '',
  medications: '', allergies: '', medicalConditions: '', bloodType: '',
  triggersList: '', calmingStrategies: '', avoidList: '',
  selfInjury: false, wandering: false, nonVerbal: false,
  specialInstructions: '',
});

const DEMO_PROFILE: EmergencyProfile = {
  childId: 'demo-child',
  updatedAt: new Date().toISOString(),
  childName: 'Can Yılmaz',
  birthDate: '2018-05-15',
  diagnosisInfo: 'Otizm Spektrum Bozukluğu (OSB)',
  communicationLevel: 'Birkaç Kelime / Görsel Kart Kullanır',
  languages: 'Türkçe',
  contactName1: 'Ayşe Yılmaz',
  contactPhone1: '0555 123 45 67',
  contactRelation1: 'Anne',
  contactName2: 'Mehmet Yılmaz',
  contactPhone2: '0555 987 65 43',
  contactRelation2: 'Baba',
  doctorName: 'Dr. Ahmet Özkan (Çocuk Psikiyatristi)',
  doctorPhone: '0532 111 22 33',
  hospital: 'Çocuk Sağlığı İhtisas Hastanesi',
  medications: 'Kullanmıyor',
  allergies: 'Glüten hassasiyeti var, yer fıstığı alerjisi (Şiddetli)',
  medicalConditions: 'Epilepsi geçmişi var (Nöbet anında sakin kalınmalı)',
  triggersList: 'Yüksek sesli sirenler, ani fiziksel temaslar, parlak flaş ışıkları',
  calmingStrategies: 'Gürültü önleyici kulaklık takmak, sırtına hafif ve ritmik baskı uygulamak, en sevdiği kırmızı duyusal oyuncağı sunmak',
  avoidList: 'Göz temasına zorlamayın, yüksek sesle komut vermeyin, zorla tutmaya veya kısıtlamaya çalışmayın',
  selfInjury: false,
  wandering: true,
  nonVerbal: true,
  specialInstructions: 'Kaybolması durumunda sesler yerine görsel kartlarla yaklaşılması önerilir. Can sakinleşene kadar elinden kırmızı duyusal oyuncağı alınmamalıdır.',
  bloodType: 'A Rh+',
};

export function EmergencyCardPage() {
  const { children, setChildren, selectedChild, setSelectedChild } = useChildStore();
  const selectedChildId = selectedChild?.id ?? '';
  const [profile, setProfile] = useState<EmergencyProfile | null>(null);
  const [saved, setSaved] = useState(false);
  const [showPrint, setShowPrint] = useState(false);
  const [useDemoMode, setUseDemoMode] = useState(false);

  useEffect(() => {
    if (!children.length) childService.getAll().then(setChildren).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedChild && children.length) setSelectedChild(children[0]);
  }, [children, selectedChild, setSelectedChild]);

  useEffect(() => {
    if (useDemoMode) {
      setProfile(DEMO_PROFILE);
      setSaved(true);
      return;
    }
    if (!selectedChildId) return;
    const child = children.find(c => c.id === selectedChildId);
    emergencyCardService.get(selectedChildId).then(data => {
      if (data) { setProfile(data); setSaved(true); }
      else { setProfile(empty(selectedChildId, child?.name ?? '', child?.birthDate ?? '')); setSaved(false); }
    }).catch(() => {
      // Fallback to empty profile so the page never gets stuck on load error
      setProfile(empty(selectedChildId, child?.name ?? '', child?.birthDate ?? ''));
      setSaved(false);
    });
  }, [selectedChildId, children, useDemoMode]);

  const set = (patch: Partial<EmergencyProfile>) => setProfile(p => p ? { ...p, ...patch } : p);

  const handleSave = async () => {
    if (!profile) return;
    if (useDemoMode) {
      toast.success('Demo modunda değişiklikler geçici olarak kaydedildi.');
      setSaved(true);
      return;
    }
    const toSave = { ...profile, updatedAt: new Date().toISOString() };
    try {
      await emergencyCardService.save(selectedChildId, toSave as unknown as Record<string, unknown>);
      setProfile(toSave); setSaved(true);
      toast.success('Acil durum kartı kaydedildi.');
    } catch { toast.error('Kaydedilemedi.'); }
  };

  const handlePrint = () => {
    setShowPrint(true);
    setTimeout(() => { window.print(); setShowPrint(false); }, 150);
  };

  if (!selectedChildId && !useDemoMode) return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <PageOnboarding
        pageId="emergency-card-empty"
        title="Acil Durum Kartı Sistemi"
        description="Çocuğunuzun tıbbi durumunu, kriz tetikleyicilerini ve acil durum kontaklarını içeren cüzdan boyutu katlanabilir kartlar hazırlayın."
        steps={[
          {
            icon: <ShieldAlert size={20} className="text-red-500" />,
            title: "Tıbbi Kimlik Kartı",
            description: "Alerjiler, kriz anı talimatları ve kan grubu gibi hayati bilgileri tek bir kartta toplayın."
          },
          {
            icon: <Printer size={20} className="text-indigo-500" />,
            title: "Katlanabilir Cüzdan Tasarımı",
            description: "Yazdırıp keserek çocuğunuzun çantasında, cebinde veya cüzdanında taşıyabileceğiniz standart boyutlarda kart çıktısı alın."
          }
        ]}
      />

      <div className="bg-gradient-to-br from-red-50/70 via-red-50/10 to-indigo-50/20 border border-red-100 rounded-3xl p-8 shadow-sm space-y-6 text-center">
        <div className="mx-auto w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-md">
          <ShieldAlert size={32} className="text-red-500 animate-pulse" />
        </div>
        <div className="space-y-2">
          <h2 className="text-lg font-extrabold text-gray-800">Çocuk Profili Bulunmadı</h2>
          <p className="text-sm text-gray-500 leading-relaxed max-w-sm mx-auto">
            Acil durum kartı oluşturabilmeniz için en az 1 adet çocuk profili bulunmalıdır. Sistemi hemen keşfetmek için **Demo Kartı** ile başlayabilirsiniz.
          </p>
        </div>
        
        <div className="flex gap-3 justify-center pt-2 max-w-md mx-auto">
          <button
            onClick={() => setUseDemoMode(true)}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-700 text-xs font-bold hover:bg-gray-50 shadow-sm cursor-pointer"
          >
            ✨ Demo Kartı Gör
          </button>
          <button
            onClick={() => window.location.href = '/cocuklarim'}
            className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-sm cursor-pointer"
          >
            Çocuk Ekle
          </button>
        </div>
      </div>
    </div>
  );

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-[400px] flex-col gap-4">
        <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-500 text-sm font-medium">Acil durum kartı yükleniyor...</p>
      </div>
    );
  }

  const field = (label: string, value: string, setter: (v: string) => void, placeholder?: string, type = 'text') => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input type={type} value={value} onChange={e => setter(e.target.value)}
        placeholder={placeholder}
        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300" />
    </div>
  );

  const textarea = (label: string, value: string, setter: (v: string) => void, placeholder?: string) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <textarea value={value} onChange={e => setter(e.target.value)} rows={3} placeholder={placeholder}
        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300 resize-none" />
    </div>
  );

  return (
    <div className="space-y-6">
      <PageOnboarding
        pageId="emergency-card"
        title="Acil Durum Kartına Hoş Geldiniz"
        description="Çocuğunuzla ilgilenen kişiler ve acil servisler için hayati önem taşıyan bilgileri hazırlayın."
        steps={[
          {
            icon: <ShieldAlert size={20} />,
            title: "Profil Oluşturun",
            description: "Tıbbi bilgileri, alerjileri ve acil durumda ulaşılacak kişileri ekleyin."
          },
          {
            icon: <Printer size={20} />,
            title: "Yazdırın",
            description: "Oluşturduğunuz kartı yazdırarak çocuğunuzun çantasında veya üzerinizde taşıyın."
          }
        ]}
      />

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Acil Durum Profil Kartı</h1>
          <p className="text-gray-500 mt-1">Okul, bakıcı ve acil servis için yazdırılabilir kart</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handlePrint}><Printer size={15} className="mr-1" />Kartı Yazdır</Button>
          <Button onClick={handleSave}><Save size={15} className="mr-1" />Kaydet</Button>
        </div>
      </div>

      {/* Child selector */}
      {children.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {children.map(c => (
            <button key={c.id} onClick={() => { setSelectedChild(c); setProfile(null); setSaved(false); }}
              className={`px-4 py-2 rounded-xl border text-sm font-medium transition-all cursor-pointer ${selectedChildId === c.id ? 'bg-red-600 text-white border-red-600' : 'bg-white border-gray-200 text-gray-600 hover:border-red-300'}`}>
              {c.name}
            </button>
          ))}
        </div>
      )}

      {saved && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-3 flex items-center gap-2">
          <CheckCircle size={16} className="text-green-600 shrink-0" />
          <p className="text-sm text-green-700">Kart kaydedildi. Son güncelleme: {new Date(profile.updatedAt).toLocaleDateString('tr-TR')}</p>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Çocuk Bilgileri */}
        <section className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
          <h2 className="font-bold text-gray-900 flex items-center gap-2"><User size={16} className="text-red-500" />Çocuk Bilgileri</h2>
          {field('Ad Soyad', profile.childName, v => set({ childName: v }))}
          {field('Doğum Tarihi', profile.birthDate, v => set({ birthDate: v }), '', 'date')}
          {field('Tanı', profile.diagnosisInfo, v => set({ diagnosisInfo: v }))}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Kan Grubu</label>
            <select value={profile.bloodType} onChange={e => set({ bloodType: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none bg-white">
              {BLOOD_TYPES.map(b => <option key={b} value={b}>{b || 'Seçin...'}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">İletişim Seviyesi</label>
            <select value={profile.communicationLevel} onChange={e => set({ communicationLevel: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none bg-white">
              <option value="">Seçin...</option>
              {COMM_LEVELS.map(l => <option key={l}>{l}</option>)}
            </select>
          </div>
          {field('Konuşulan Dil(ler)', profile.languages, v => set({ languages: v }))}
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">Özel Durum Uyarıları</p>
            {([
              ['selfInjury', 'Öz-zarar davranışı olabilir'],
              ['wandering', 'Kaçma / kaybolma riski var'],
              ['nonVerbal', 'Sözel iletişim yoktur'],
            ] as [keyof EmergencyProfile, string][]).map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={profile[key] as boolean} onChange={e => set({ [key]: e.target.checked } as any)}
                  className="w-4 h-4 text-red-600 rounded" />
                <span className="text-sm text-gray-700">{label}</span>
              </label>
            ))}
          </div>
        </section>

        {/* Acil İletişim */}
        <section className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
          <h2 className="font-bold text-gray-900 flex items-center gap-2"><Phone size={16} className="text-blue-500" />Acil İletişim</h2>
          <div className="bg-blue-50 rounded-xl p-4 space-y-3">
            <p className="text-xs font-semibold text-blue-700 uppercase">1. Kişi</p>
            {field('Ad Soyad', profile.contactName1, v => set({ contactName1: v }))}
            {field('Telefon', profile.contactPhone1, v => set({ contactPhone1: v }), '', 'tel')}
            {field('Yakınlık', profile.contactRelation1, v => set({ contactRelation1: v }), 'Örn: Anne')}
          </div>
          <div className="bg-indigo-50 rounded-xl p-4 space-y-3">
            <p className="text-xs font-semibold text-indigo-700 uppercase">2. Kişi</p>
            {field('Ad Soyad', profile.contactName2, v => set({ contactName2: v }))}
            {field('Telefon', profile.contactPhone2, v => set({ contactPhone2: v }), '', 'tel')}
            {field('Yakınlık', profile.contactRelation2, v => set({ contactRelation2: v }), 'Örn: Baba')}
          </div>
          <div className="bg-teal-50 rounded-xl p-4 space-y-3">
            <p className="text-xs font-semibold text-teal-700 uppercase">Doktor / Hastane</p>
            {field('Doktor Adı', profile.doctorName, v => set({ doctorName: v }))}
            {field('Doktor Telefonu', profile.doctorPhone, v => set({ doctorPhone: v }), '', 'tel')}
            {field('Hastane', profile.hospital, v => set({ hospital: v }))}
          </div>
        </section>

        {/* Tıbbi Bilgiler */}
        <section className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
          <h2 className="font-bold text-gray-900 flex items-center gap-2"><Heart size={16} className="text-red-500" />Tıbbi Bilgiler</h2>
          {textarea('Kullandığı İlaçlar', profile.medications, v => set({ medications: v }), 'İlaç adı - doz - saat (her satıra bir ilaç)')}
          {textarea('Alerjiler', profile.allergies, v => set({ allergies: v }), 'Gıda, ilaç, madde alerjileri...')}
          {textarea('Diğer Tıbbi Durumlar', profile.medicalConditions, v => set({ medicalConditions: v }), 'Epilepsi, kalp hastalığı vb.')}
        </section>

        {/* Davranışsal Bilgiler */}
        <section className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
          <h2 className="font-bold text-gray-900 flex items-center gap-2"><AlertTriangle size={16} className="text-orange-500" />Davranışsal Bilgiler</h2>
          {textarea('Tetikleyiciler (kaçınılması gerekenler)', profile.triggersList, v => set({ triggersList: v }), 'Neler kriz çıkarır? Örn: ani gürültü, kalabalık...')}
          {textarea('Sakinleştirme Stratejileri', profile.calmingStrategies, v => set({ calmingStrategies: v }), 'Ne işe yarar? Örn: sevdiği müzik, sıkıştırma, sessiz oda...')}
          {textarea('Kesinlikle Yapılmaması Gerekenler', profile.avoidList, v => set({ avoidList: v }), 'Örn: bağırmayın, tutmayın, göz teması kurmaya zorlamayın...')}
          {textarea('Özel Talimatlar', profile.specialInstructions, v => set({ specialInstructions: v }), 'Acil servis veya bakıcı için ek notlar...')}
        </section>

        {/* QR Code */}
        {saved && (
          <section className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4 lg:col-span-2 flex flex-col items-center text-center">
            <h2 className="font-bold text-gray-900 flex items-center gap-2"><ShieldAlert size={16} className="text-indigo-500" />NFC / QR Halka Açık Acil Profil</h2>
            <p className="text-sm text-gray-500 max-w-lg">Bu QR kodu taratarak, belirlediğiniz tıbbi bilgilerin bulunduğu halka açık profil sayfanıza ulaşabilirsiniz. Kodu yazdırıp bir bilekliğe veya çantaya yapıştırabilirsiniz.</p>
            <div className="bg-white p-4 border rounded-2xl shadow-sm inline-block">
              <QRCodeComp value={`${window.location.origin}/acil-profil/${selectedChildId}`} size={150} />
            </div>
            <a href={`/acil-profil/${selectedChildId}`} target="_blank" rel="noreferrer" className="text-sm font-medium text-indigo-600 hover:underline">
              Profili Tarayıcıda Görüntüle
            </a>
          </section>
        )}
      </div>

      {/* Print View */}
      {showPrint && (
        <div className="fixed inset-0 z-50 bg-white p-8 print:block hidden">
          <PrintCard profile={profile} />
        </div>
      )}
      <div className="hidden print:block">
        <PrintCard profile={profile} />
      </div>
    </div>
  );
}

function PrintCard({ profile }: { profile: EmergencyProfile }) {
  return (
    <div className="max-w-4xl mx-auto font-sans p-6 bg-white text-black">
      <div className="text-center mb-6 no-print">
        <p className="text-xs text-gray-400">✂️ Bu alanı kesip ortadan ikiye katlayarak cüzdanda taşıyabileceğiniz standart boyutlarda çift taraflı kart elde edebilirsiniz.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-6 justify-center items-center print:flex-row print:gap-4">
        {/* FRONT SIDE (ÖN YÜZ) */}
        <div className="w-[350px] h-[220px] border-2 border-red-600 rounded-2xl overflow-hidden flex flex-col justify-between shadow-md relative bg-white bg-white">
          <div className="bg-gradient-to-r from-red-600 to-red-700 text-white px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-[9px] font-bold tracking-widest uppercase opacity-85 leading-none">OTİZM TIBBİ KİMLİK KARTI</p>
              <h2 className="text-base font-extrabold leading-none mt-1">{profile.childName}</h2>
            </div>
            <div className="h-7 w-7 bg-white/20 rounded-lg flex items-center justify-center shrink-0">
              <ShieldAlert size={16} className="text-white" />
            </div>
          </div>

          <div className="flex-1 p-3 grid grid-cols-3 gap-2 text-[11px] leading-tight bg-white">
            <div className="col-span-2 space-y-1.5 border-r border-gray-100 pr-2">
              <p><strong className="text-gray-500">Tanı:</strong> <span className="font-semibold text-gray-800">{profile.diagnosisInfo}</span></p>
              <p><strong className="text-gray-500">Doğum:</strong> <span className="font-semibold text-gray-800">{profile.birthDate ? new Date(profile.birthDate).toLocaleDateString('tr-TR') : '—'}</span></p>
              <p><strong className="text-gray-500">İletişim:</strong> <span className="font-semibold text-gray-800">{profile.communicationLevel || 'Sözel Yok'}</span></p>
              <p><strong className="text-gray-500">Ulaşılacak:</strong> <span className="font-semibold text-red-600 font-mono">{profile.contactName1} ({profile.contactRelation1}) - {profile.contactPhone1}</span></p>
            </div>
            <div className="flex flex-col justify-between items-center text-center pl-1">
              <div className="bg-red-50 text-red-700 px-2 py-1.5 rounded-lg border border-red-100 w-full">
                <p className="text-[8px] font-bold uppercase opacity-80 leading-none">Kan Grubu</p>
                <p className="text-xs font-black mt-0.5 leading-none">{profile.bloodType || '—'}</p>
              </div>
              <div className="flex flex-wrap gap-1 justify-center mt-2">
                {profile.selfInjury && <span className="bg-red-100 text-red-700 px-1 rounded text-[8px] font-bold border border-red-200">ÖZ-ZARAR</span>}
                {profile.wandering && <span className="bg-orange-100 text-orange-700 px-1 rounded text-[8px] font-bold border border-orange-200">KAÇMA</span>}
                {profile.nonVerbal && <span className="bg-purple-100 text-purple-700 px-1 rounded text-[8px] font-bold border border-purple-200">SÖZEL YOK</span>}
              </div>
            </div>
          </div>

          <div className="bg-gray-50 border-t border-gray-100 px-4 py-2 flex items-center justify-between text-[9px] text-gray-500 font-semibold uppercase">
            <span>Katlanabilir Acil Kart</span>
            <span>Otizm Destek Platformu</span>
          </div>
        </div>

        {/* BACK SIDE (ARKA YÜZ) */}
        <div className="w-[350px] h-[220px] border-2 border-red-600 rounded-2xl overflow-hidden flex flex-col justify-between shadow-md relative bg-white bg-white">
          <div className="bg-gray-900 text-white px-4 py-2 flex items-center justify-between">
            <p className="text-[9px] font-bold tracking-widest uppercase opacity-85 leading-none">ACİL REHBERLİK & HASSASİYETLER</p>
            <AlertTriangle size={12} className="text-amber-400 shrink-0" />
          </div>

          <div className="flex-1 p-3 grid grid-cols-2 gap-3 text-[10px] leading-tight bg-white">
            <div className="space-y-1.5 border-r border-gray-100 pr-2">
              <div>
                <p className="text-[8px] font-bold uppercase text-red-600 tracking-wide mb-0.5">⚡ Tetikleyiciler</p>
                <p className="text-gray-700 line-clamp-2">{profile.triggersList || 'Belirtilmedi'}</p>
              </div>
              <div>
                <p className="text-[8px] font-bold uppercase text-emerald-600 tracking-wide mb-0.5">🧘 Sakinleştirme</p>
                <p className="text-gray-700 line-clamp-2">{profile.calmingStrategies || 'Belirtilmedi'}</p>
              </div>
            </div>
            <div className="space-y-1.5 pl-1">
              <div>
                <p className="text-[8px] font-bold uppercase text-orange-600 tracking-wide mb-0.5">🚫 Yapılmamalı</p>
                <p className="text-gray-700 line-clamp-2">{profile.avoidList || 'Belirtilmedi'}</p>
              </div>
              <div>
                <p className="text-[8px] font-bold uppercase text-indigo-600 tracking-wide mb-0.5">💊 Tıbbi / İlaçlar</p>
                <p className="text-gray-700 line-clamp-2">
                  {profile.medications ? `İlaç: ${profile.medications}` : ''}
                  {profile.allergies ? ` Alerji: ${profile.allergies}` : 'Belirtilmedi'}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-red-50 border-t border-red-100 px-3 py-1.5 text-[8px] text-red-700 text-center leading-normal">
            <strong>⚠️ LÜTFEN BİZE SAKİN VE DÜŞÜK SES TONUYLA YAKLAŞIN, FİZİKSEL ZORLAMA YAPMAYIN!</strong>
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ title, items, text }: { title: string; items?: string[]; text?: string }) {
  if (!items?.length && !text) return null;
  return (
    <div>
      <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">{title}</p>
      {items ? items.map((item, i) => <p key={i} className="text-sm text-gray-800">{item}</p>) : <p className="text-sm text-gray-800">{text}</p>}
    </div>
  );
}
