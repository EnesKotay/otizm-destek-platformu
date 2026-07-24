import { useEffect, useState } from 'react';
import { Save, Printer, ShieldAlert, Phone, Heart, AlertTriangle, CheckCircle, User, Share2, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';

import { useChildStore } from '@/store/childStore';
import { childService } from '@/services/childService';
import { emergencyCardService } from '@/services/emergencyCardService';
import { toast } from '@/store/toastStore';
import { PageOnboarding } from '@/components/ui/PageOnboarding';
import QRCode from 'react-qr-code';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
        title="Acil Durum Kartı"
        description="Acil bir durumda çocuğunuzla karşılaşan kişilere gösterebileceğiniz bir kart hazırlayın. Önce çocuğunuzu eklemeniz yeterli."
        steps={[
          {
            icon: <ShieldAlert size={20} className="text-red-500" />,
            title: "Önemli Bilgileri Girin",
            description: "Alerjiler, ilaçlar ve acil durumda aranacak kişiler gibi bilgileri doldurun."
          },
          {
            icon: <Printer size={20} className="text-indigo-500" />,
            title: "Yazdırın ve Yanınızda Taşıyın",
            description: "Kartı yazdırıp çocuğunuzun çantasına veya cebine koyabilirsiniz."
          }
        ]}
      />

      <div className="bg-gradient-to-br from-red-50/70 via-red-50/10 to-indigo-50/20 border border-red-100 rounded-3xl p-8 shadow-sm space-y-6 text-center">
        <div className="mx-auto w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-md">
          <ShieldAlert size={32} className="text-red-500 animate-pulse" />
        </div>
        <div className="space-y-2">
          <h2 className="text-lg font-extrabold text-gray-800">Önce çocuğunuzu ekleyin</h2>
          <p className="text-sm text-gray-500 leading-relaxed max-w-sm mx-auto">
            Acil durum kartı oluşturmak için önce çocuğunuzu eklemeniz gerekiyor. Nasıl göründüğünü merak ediyorsanız demo kartına bakabilirsiniz.
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
    <div className="group">
      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5 group-focus-within:text-red-500 transition-colors">{label}</label>
      <input type={type} value={value} onChange={e => setter(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-800 placeholder:text-slate-400 placeholder:font-normal focus:outline-none focus:bg-white focus:ring-4 focus:ring-red-400/10 focus:border-red-400 transition-all shadow-inner" />
    </div>
  );

  const textarea = (label: string, value: string, setter: (v: string) => void, placeholder?: string) => (
    <div className="group flex flex-col">
      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5 group-focus-within:text-red-500 transition-colors">{label}</label>
      <textarea value={value} onChange={e => setter(e.target.value)} rows={3} placeholder={placeholder}
        className="w-full flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-800 placeholder:text-slate-400 placeholder:font-normal focus:outline-none focus:bg-white focus:ring-4 focus:ring-red-400/10 focus:border-red-400 transition-all shadow-inner resize-none" />
    </div>
  );

  return (
    <div className="space-y-6">
      <PageOnboarding
        pageId="emergency-card"
        title="Acil Durum Kartı"
        description="Çocuğunuzla karşılaşan herkesin anlayabileceği bir kart hazırlayın. Okulda, dışarıda veya acil serviste gösterebilirsiniz."
        steps={[
          {
            icon: <ShieldAlert size={20} />,
            title: "Bilgileri Doldurun",
            description: "İlaçlar, alerjiler ve aranacak kişileri girin. İstediğiniz zaman değiştirebilirsiniz."
          },
          {
            icon: <Printer size={20} />,
            title: "Yazdırın ve Taşıyın",
            description: "Kartı yazdırıp çocuğunuzun çantasına veya üzerinize koyun."
          }
        ]}
      />

      <div className="flex items-start justify-between gap-4 flex-wrap bg-white/80 backdrop-blur-xl p-6 sm:p-8 rounded-[32px] border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-red-400/10 via-indigo-400/5 to-transparent rounded-bl-full pointer-events-none" />
        <div className="relative z-10">
          <h1 className="text-3xl font-black bg-gradient-to-r from-red-600 to-indigo-600 bg-clip-text text-transparent tracking-tight">Acil Durum Kartım</h1>
          <p className="text-slate-500 mt-2 font-medium">Okul, bakıcı veya acil servis için yazdırıp taşıyabileceğiniz kart</p>
        </div>
        <div className="flex gap-3 relative z-10 flex-wrap">
          <Button
            variant="outline"
            onClick={() => {
              if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
              if (window.speechSynthesis.speaking) {
                window.speechSynthesis.cancel();
                toast.info('Sesli okuma durduruldu.');
              } else {
                window.speechSynthesis.cancel();
                const text = `Acil Durum Kartı. Çocuğun Adı: ${profile.childName}. Tanı: ${profile.diagnosisInfo}. Acil Durum Kişisi: ${profile.contactName1}, Telefon: ${profile.contactPhone1}. Sakinleştirme Yöntemleri: ${profile.calmingStrategies || 'Belirtilmedi'}.`;
                const utterance = new SpeechSynthesisUtterance(text);
                utterance.lang = 'tr-TR';
                utterance.rate = 0.9;
                window.speechSynthesis.speak(utterance);
                toast.success('Acil durum kartı sesli okunuyor 🔊');
              }
            }}
            className="rounded-xl font-bold bg-white hover:bg-slate-50 border-slate-200 shadow-sm transition-all"
          >
            <Volume2 size={16} className="mr-2 text-emerald-600" />
            Kartı Sesli Dinle
          </Button>
          <Button variant="outline" onClick={handlePrint} className="rounded-xl font-bold bg-white hover:bg-slate-50 border-slate-200 shadow-sm hover:shadow transition-all"><Printer size={16} className="mr-2 text-indigo-500" />Kartı Yazdır</Button>
          <Button onClick={handleSave} className="rounded-xl font-bold bg-red-600 hover:bg-red-700 shadow-lg shadow-red-600/20 transition-all active:scale-95"><Save size={16} className="mr-2" />Kaydet</Button>
        </div>
      </div>

      {/* Child selector */}
      {children.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {children.map(c => (
            <button key={c.id} onClick={() => { setSelectedChild(c); setProfile(null); setSaved(false); }}
              className={`px-5 py-2.5 rounded-xl border text-sm font-bold transition-all cursor-pointer shadow-sm active:scale-95 ${selectedChildId === c.id ? 'bg-indigo-600 text-white border-indigo-600 shadow-indigo-200' : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-300 hover:text-indigo-600'}`}>
              {c.name}
            </button>
          ))}
        </div>
      )}

      {saved && (
        <div className="bg-emerald-50/80 backdrop-blur-sm border border-emerald-200/60 rounded-2xl p-4 flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300 shadow-sm">
          <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
            <CheckCircle size={18} className="text-emerald-600" />
          </div>
          <p className="text-sm text-emerald-800 font-medium">Kart başarıyla kaydedildi. Son güncelleme: <strong className="font-extrabold">{new Date(profile.updatedAt).toLocaleDateString('tr-TR')}</strong></p>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Çocuk Bilgileri */}
        <section className="bg-white/80 backdrop-blur-xl rounded-[28px] border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all p-6 sm:p-8 space-y-5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-red-50/50 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
          <h2 className="text-lg font-black text-slate-900 flex items-center gap-2.5 relative z-10">
            <div className="w-8 h-8 rounded-xl bg-red-100 text-red-500 flex items-center justify-center"><User size={16} /></div>
            Çocuk Bilgileri
          </h2>
          
          <div className="relative z-10 space-y-5">
            {field('Ad Soyad', profile.childName, v => set({ childName: v }))}
            {field('Doğum Tarihi', profile.birthDate, v => set({ birthDate: v }), '', 'date')}
            {field('Tanı', profile.diagnosisInfo, v => set({ diagnosisInfo: v }))}
            <div className="group">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5 group-focus-within:text-red-500 transition-colors">Kan Grubu</label>
              <select value={profile.bloodType} onChange={e => set({ bloodType: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-800 focus:outline-none focus:bg-white focus:ring-4 focus:ring-red-400/10 focus:border-red-400 transition-all shadow-inner appearance-none cursor-pointer">
                {BLOOD_TYPES.map(b => <option key={b} value={b}>{b || 'Seçin...'}</option>)}
              </select>
            </div>
            <div className="group">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5 group-focus-within:text-red-500 transition-colors">İletişim Seviyesi</label>
              <select value={profile.communicationLevel} onChange={e => set({ communicationLevel: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-800 focus:outline-none focus:bg-white focus:ring-4 focus:ring-red-400/10 focus:border-red-400 transition-all shadow-inner appearance-none cursor-pointer">
                <option value="">Seçin...</option>
                {COMM_LEVELS.map(l => <option key={l}>{l}</option>)}
              </select>
            </div>
            {field('Konuşulan Dil(ler)', profile.languages, v => set({ languages: v }))}
            <div className="space-y-3 pt-2">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Özel Durum Uyarıları</p>
              <div className="space-y-2">
                {([
                  ['selfInjury', 'Öz-zarar davranışı olabilir'],
                  ['wandering', 'Kaçma / kaybolma riski var'],
                  ['nonVerbal', 'Sözel iletişim yoktur'],
                ] as [keyof EmergencyProfile, string][]).map(([key, label]) => (
                  <label key={key} className="flex items-center justify-between gap-3 p-3.5 rounded-xl border border-slate-100 bg-slate-50/50 hover:border-red-200 hover:bg-red-50/50 cursor-pointer transition-all">
                    <span className="text-sm font-bold text-slate-700">{label}</span>
                    <div className={`w-11 h-6 rounded-full p-1 transition-colors duration-300 ease-in-out shadow-inner ${profile[key] ? 'bg-red-500' : 'bg-slate-300'}`}>
                      <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-300 ease-in-out ${profile[key] ? 'translate-x-5' : 'translate-x-0'}`} />
                    </div>
                    <input type="checkbox" className="hidden" checked={profile[key] as boolean} onChange={e => set({ [key]: e.target.checked } as Partial<EmergencyProfile>)} />
                  </label>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Acil İletişim */}
        <section className="bg-white/80 backdrop-blur-xl rounded-[28px] border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all p-6 sm:p-8 space-y-5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-blue-50/50 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
          <h2 className="text-lg font-black text-slate-900 flex items-center gap-2.5 relative z-10">
            <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-500 flex items-center justify-center"><Phone size={16} /></div>
            Acil İletişim
          </h2>
          <div className="relative z-10 space-y-4">
            <div className="bg-gradient-to-br from-blue-50 to-blue-50/30 border border-blue-100 rounded-2xl p-5 space-y-4 shadow-sm">
              <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-2">
                <span className="w-5 h-5 rounded-md bg-blue-200/50 flex items-center justify-center text-blue-700">1</span> Birinci Kişi
              </p>
              <div className="space-y-4">
                {field('Ad Soyad', profile.contactName1, v => set({ contactName1: v }))}
                {field('Telefon', profile.contactPhone1, v => set({ contactPhone1: v }), '', 'tel')}
                {field('Yakınlık', profile.contactRelation1, v => set({ contactRelation1: v }), 'Örn: Anne')}
              </div>
            </div>
            <div className="bg-gradient-to-br from-indigo-50 to-indigo-50/30 border border-indigo-100 rounded-2xl p-5 space-y-4 shadow-sm">
              <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-2">
                <span className="w-5 h-5 rounded-md bg-indigo-200/50 flex items-center justify-center text-indigo-700">2</span> İkinci Kişi
              </p>
              <div className="space-y-4">
                {field('Ad Soyad', profile.contactName2, v => set({ contactName2: v }))}
                {field('Telefon', profile.contactPhone2, v => set({ contactPhone2: v }), '', 'tel')}
                {field('Yakınlık', profile.contactRelation2, v => set({ contactRelation2: v }), 'Örn: Baba')}
              </div>
            </div>
            <div className="bg-gradient-to-br from-teal-50 to-teal-50/30 border border-teal-100 rounded-2xl p-5 space-y-4 shadow-sm">
              <p className="text-[10px] font-black text-teal-600 uppercase tracking-widest flex items-center gap-2">
                <span className="w-5 h-5 rounded-md bg-teal-200/50 flex items-center justify-center text-teal-700">3</span> Doktor / Hastane
              </p>
              <div className="space-y-4">
                {field('Doktor Adı', profile.doctorName, v => set({ doctorName: v }))}
                {field('Doktor Telefonu', profile.doctorPhone, v => set({ doctorPhone: v }), '', 'tel')}
                {field('Hastane', profile.hospital, v => set({ hospital: v }))}
              </div>
            </div>
          </div>
        </section>

        {/* Tıbbi Bilgiler */}
        <section className="bg-white/80 backdrop-blur-xl rounded-[28px] border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all p-6 sm:p-8 flex flex-col relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-rose-50/50 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
          <h2 className="text-lg font-black text-slate-900 flex items-center gap-2.5 mb-5 relative z-10">
            <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-500 flex items-center justify-center"><Heart size={16} /></div>
            Tıbbi Bilgiler
          </h2>
          <div className="relative z-10 flex-1 space-y-5 flex flex-col">
            {textarea('Kullandığı İlaçlar', profile.medications, v => set({ medications: v }), 'İlaç adı - doz - saat (her satıra bir ilaç)')}
            {textarea('Alerjiler', profile.allergies, v => set({ allergies: v }), 'Gıda, ilaç, madde alerjileri...')}
            {textarea('Diğer Tıbbi Durumlar', profile.medicalConditions, v => set({ medicalConditions: v }), 'Epilepsi, kalp hastalığı vb.')}
          </div>
        </section>

        {/* Davranışsal Bilgiler */}
        <section className="bg-white/80 backdrop-blur-xl rounded-[28px] border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all p-6 sm:p-8 flex flex-col relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-amber-50/50 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
          <h2 className="text-lg font-black text-slate-900 flex items-center gap-2.5 mb-5 relative z-10">
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-500 flex items-center justify-center"><AlertTriangle size={16} /></div>
            Davranışsal Bilgiler
          </h2>
          <div className="relative z-10 flex-1 space-y-5 flex flex-col">
            {textarea('Tetikleyiciler (kaçınılması gerekenler)', profile.triggersList, v => set({ triggersList: v }), 'Neler kriz çıkarır? Örn: ani gürültü, kalabalık...')}
            {textarea('Sakinleştirme Stratejileri', profile.calmingStrategies, v => set({ calmingStrategies: v }), 'Ne işe yarar? Örn: sevdiği müzik, sıkıştırma, sessiz oda...')}
            {textarea('Kesinlikle Yapılmaması Gerekenler', profile.avoidList, v => set({ avoidList: v }), 'Örn: bağırmayın, tutmayın, göz teması kurmaya zorlamayın...')}
            {textarea('Özel Talimatlar', profile.specialInstructions, v => set({ specialInstructions: v }), 'Acil servis veya bakıcı için ek notlar...')}
          </div>
        </section>

        {/* QR Code */}
        {saved && (
          <section className="bg-gradient-to-br from-indigo-50/80 via-white to-purple-50/80 rounded-[32px] border border-indigo-100 p-8 lg:col-span-2 flex flex-col items-center text-center shadow-sm relative overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-indigo-400 to-purple-500" />
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-indigo-50 mb-4">
              <ShieldAlert size={24} className="text-indigo-600" />
            </div>
            <h2 className="text-xl font-black text-slate-900 mb-2">QR Kod ile Paylaş</h2>
            <p className="text-sm font-semibold text-slate-500 max-w-lg mb-6 leading-relaxed">
              Bu QR kodu telefon kamerasıyla okutunca çocuğunuzun bilgileri açılır. Kodu yazdırıp bilekliğe, çantaya veya okul kartına yapıştırabilirsiniz.
            </p>
            <div className="bg-white p-5 rounded-[24px] shadow-lg shadow-indigo-200/50 border border-indigo-50 mb-6 group hover:scale-105 transition-transform duration-300">
              <QRCodeComp value={`${window.location.origin}/acil-profil/${selectedChildId}`} size={160} className="rounded-xl" />
            </div>
            <div className="flex flex-wrap gap-3 justify-center">
              <a
                href={`/acil-profil/${selectedChildId}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 text-sm font-extrabold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 hover:text-indigo-700 px-5 py-2.5 rounded-xl transition-all border border-indigo-100"
              >
                Profili Görüntüle →
              </a>
              <a
                href={`https://wa.me/?text=${encodeURIComponent(`Çocuğumun acil durum kartını buradan görüntüleyebilirsiniz:\n${window.location.origin}/acil-profil/${selectedChildId}`)}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 text-sm font-extrabold text-white bg-[#25D366] hover:bg-[#1fbd5a] px-5 py-2.5 rounded-xl transition-all shadow-sm shadow-green-200"
              >
                <Share2 size={16} />
                WhatsApp'ta Paylaş
              </a>
              {navigator.share && (
                <button
                  type="button"
                  onClick={() => navigator.share({
                    title: `${profile.childName} — Acil Durum Kartı`,
                    text: 'Çocuğumun acil durum kartını buradan görüntüleyebilirsiniz.',
                    url: `${window.location.origin}/acil-profil/${selectedChildId}`,
                  }).catch(() => {})}
                  className="inline-flex items-center gap-2 text-sm font-extrabold text-slate-700 bg-slate-100 hover:bg-slate-200 px-5 py-2.5 rounded-xl transition-all border border-slate-200"
                >
                  <Share2 size={16} />
                  Paylaş
                </button>
              )}
            </div>
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
