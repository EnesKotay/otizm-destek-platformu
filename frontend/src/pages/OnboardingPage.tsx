import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Baby, Tag as TagIcon, Users, ChevronRight,
  ChevronLeft, Check, Sparkles, ArrowRight, Activity, GraduationCap,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { TextArea } from '@/components/ui/TextArea';
import { childService } from '@/services/childService';
import { tagService } from '@/services/tagService';
import { groupService } from '@/services/groupService';
import { expertService } from '@/services/expertService';
import { useAuthStore } from '@/store/authStore';
import { toast } from '@/store/toastStore';
import type { Tag, Group, User } from '@/types';

const CATEGORY_LABELS: Record<string, string> = {
  ILETISIM: 'İletişim',
  SOSYAL: 'Sosyal',
  DUYUSAL: 'Duyusal',
  DAVRANIS: 'Davranış',
  MOTOR: 'Motor',
  EGITIM: 'Eğitim',
};

const CATEGORY_SELECTED_COLORS: Record<string, string> = {
  ILETISIM: 'bg-blue-600 border-blue-600 text-white',
  SOSYAL: 'bg-green-600 border-green-600 text-white',
  DUYUSAL: 'bg-purple-600 border-purple-600 text-white',
  DAVRANIS: 'bg-orange-500 border-orange-500 text-white',
  MOTOR: 'bg-red-500 border-red-500 text-white',
  EGITIM: 'bg-teal-600 border-teal-600 text-white',
};

const CATEGORY_IDLE_COLORS: Record<string, string> = {
  ILETISIM: 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100',
  SOSYAL: 'border-green-200 bg-green-50 text-green-700 hover:bg-green-100',
  DUYUSAL: 'border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100',
  DAVRANIS: 'border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100',
  MOTOR: 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100',
  EGITIM: 'border-teal-200 bg-teal-50 text-teal-700 hover:bg-teal-100',
};

const STEPS = [
  { label: 'Çocuk Profili',   icon: Baby,           color: 'text-indigo-600', bg: 'bg-indigo-100' },
  { label: 'Semptomlar',      icon: TagIcon,         color: 'text-purple-600', bg: 'bg-purple-100' },
  { label: 'Topluluk',        icon: Users,           color: 'text-green-600',  bg: 'bg-green-100'  },
  { label: 'Terapi Programı', icon: Activity,        color: 'text-orange-600', bg: 'bg-orange-100' },
  { label: 'Uzman Eşleştir',  icon: GraduationCap,  color: 'text-teal-600',   bg: 'bg-teal-100'   },
];

const THERAPY_OPTIONS = [
  'ABA Terapisi',
  'Dil ve Konuşma Terapisi',
  'Mesleki Terapi (OT)',
  'Özel Eğitim',
  'Duyu Bütünleme',
  'Sosyal Beceri Eğitimi',
  'Davranış Desteği',
  'Müzik Terapisi',
  'Spor ve Fizik Egzersiz',
];

const FOCUS_OPTIONS = ['İletişim', 'Sosyal oyun', 'Duyusal düzenleme', 'Davranış takibi'];
const COMMUNICATION_OPTIONS = ['Tek sözcük', 'Kısa cümle', 'Jest/mimik', 'Henüz sınırlı'];
const SUPPORT_OPTIONS = ['Görsel destek', 'Kısa yönerge', 'Rutin planı', 'Duyusal mola'];

export function OnboardingPage() {
  const navigate = useNavigate();
  const { setOnboardingCompleted, user, isOnboardingCompleted } = useAuthStore();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Step 1
  const [form, setForm] = useState({
    name: '',
    birthDate: '',
    diagnosisInfo: '',
    primaryFocus: '',
    communicationLevel: '',
    supportNeed: '',
  });
  const [nameError, setNameError] = useState('');
  const [createdChildId, setCreatedChildId] = useState<string | null>(null);

  // Step 2
  const [tagsByCategory, setTagsByCategory] = useState<Record<string, Tag[]>>({});
  const [selectedTagIds, setSelectedTagIds] = useState<Set<string>>(new Set());

  // Step 3
  const [groups, setGroups] = useState<Group[]>([]);
  const [joinedIds, setJoinedIds] = useState<Set<string>>(new Set());
  const [joiningId, setJoiningId] = useState<string | null>(null);

  // Step 4
  const [selectedTherapies, setSelectedTherapies] = useState<Set<string>>(new Set());
  const [therapyFrequency, setTherapyFrequency] = useState('');

  // Step 5
  const [experts, setExperts] = useState<User[]>([]);

  useEffect(() => {
    tagService.getTagsByCategory().then(setTagsByCategory).catch(() => {});
  }, []);

  useEffect(() => {
    if (step === 3) groupService.search('').then(setGroups).catch(() => {});
    if (step === 5) expertService.getAll().then(exps => setExperts(exps.slice(0, 3))).catch(() => {});
  }, [step]);

  const handleStep1 = async () => {
    if (!form.name.trim()) {
      setNameError('Çocuğun adı zorunludur.');
      return;
    }
    setNameError('');
    setLoading(true);
    try {
      const child = await childService.create({
        name: form.name,
        birthDate: form.birthDate,
        diagnosisInfo: form.diagnosisInfo,
        educationProgram: form.primaryFocus ? `Başlangıç odağı: ${form.primaryFocus}` : undefined,
        therapies: [form.communicationLevel, form.supportNeed].filter(Boolean).join(' · ') || undefined,
        privacySettings: {
          onboardingPlan: {
            primaryFocus: form.primaryFocus,
            communicationLevel: form.communicationLevel,
            supportNeed: form.supportNeed,
          },
        },
      });
      setCreatedChildId(child.id);
      setStep(2);
    } catch {
      toast.error('Profil oluşturulamadı. Lütfen tekrar deneyin.');
    }
    setLoading(false);
  };

  const handleStep2 = async () => {
    if (createdChildId && selectedTagIds.size > 0) {
      setLoading(true);
      try {
        await childService.update(createdChildId, { tagIds: Array.from(selectedTagIds) });
      } catch { /* skip */ }
      setLoading(false);
    }
    setStep(3);
  };

  const handleJoinGroup = async (id: string) => {
    setJoiningId(id);
    try {
      await groupService.join(id);
      setJoinedIds(prev => new Set([...prev, id]));
    } catch { toast.error('Gruba katılınamadı.'); }
    setJoiningId(null);
  };

  const handleStep4 = async () => {
    if (createdChildId && selectedTherapies.size > 0) {
      setLoading(true);
      try {
        const therapiesStr = [
          ...Array.from(selectedTherapies),
          therapyFrequency ? `Sıklık: ${therapyFrequency}` : '',
        ].filter(Boolean).join(' · ');
        await childService.update(createdChildId, { therapies: therapiesStr });
      } catch { /* skip */ }
      setLoading(false);
    }
    setStep(5);
  };

  const handleFinish = () => {
    setOnboardingCompleted();
    navigate('/', { replace: true });
  };

  // Guard: eğer bu kullanıcı zaten tamamladıysa direkt dashboard'a
  if (isOnboardingCompleted()) {
    navigate('/', { replace: true });
    return null;
  }

  const progress = ((step - 1) / (STEPS.length - 1)) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex flex-col">

      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/60 bg-white/40 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
            <span className="text-white font-bold text-sm">O</span>
          </div>
          <span className="font-semibold text-gray-800 hidden sm:block">Otizm Destek Platformu</span>
        </div>
        <button
          onClick={handleFinish}
          className="text-sm text-gray-400 hover:text-gray-600 transition-colors cursor-pointer flex items-center gap-1"
        >
          Şimdilik atla
          <ArrowRight size={14} />
        </button>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-gray-100">
        <div
          className="h-full bg-indigo-500 transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Step pills */}
      <div className="flex justify-center gap-2 sm:gap-6 px-4 py-6">
        {STEPS.map((s, i) => {
          const n = i + 1;
          const done = step > n;
          const active = step === n;
          const Icon = s.icon;
          return (
            <div key={n} className="flex items-center gap-2">
              <div className={`flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium transition-all ${
                active ? `${s.bg} ${s.color}` :
                done   ? 'bg-indigo-600 text-white' :
                         'bg-gray-100 text-gray-400'
              }`}>
                {done
                  ? <Check size={14} />
                  : <Icon size={14} />
                }
                <span className="hidden sm:block">{s.label}</span>
                <span className="sm:hidden">{n}</span>
              </div>
              {i < STEPS.length - 1 && (
                <ChevronRight size={14} className={step > n ? 'text-indigo-400' : 'text-gray-300'} />
              )}
            </div>
          );
        })}
      </div>

      <div className="mx-auto mb-6 grid w-full max-w-3xl gap-2 px-4 sm:grid-cols-3">
        {[
          'Önce çocuk profili',
          'Sonra ihtiyaçları seç',
          'Ana sayfada günlük adımlar',
        ].map((item, index) => (
          <div key={item} className="rounded-2xl border border-indigo-100 bg-white/70 px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm">
            <span className="mr-2 text-indigo-600">{index + 1}.</span>
            {item}
          </div>
        ))}
      </div>

      {/* Card content */}
      <div className="flex-1 flex items-start justify-center px-4 pb-16">
        <div className="w-full max-w-lg">

          {/* ──── STEP 1 ──── */}
          {step === 1 && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-8 pt-8 pb-6 border-b border-gray-50">
                <div className="w-12 h-12 rounded-2xl bg-indigo-100 flex items-center justify-center mb-4">
                  <Baby size={24} className="text-indigo-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">Merhaba, {user?.fullName?.split(' ')[0]}!</h2>
                <p className="text-gray-500 text-sm mt-1">
                  İlk olarak çocuğunuzun profilini oluşturalım. Bu bilgiler benzer ailelerle eşleşmenize yardımcı olur.
                </p>
              </div>
              <div className="px-8 py-6 space-y-4">
                <div>
                  <Input
                    label="Çocuğun Adı *"
                    value={form.name}
                    onChange={e => { setForm(f => ({ ...f, name: e.target.value })); setNameError(''); }}
                    placeholder="Adını giriniz"
                  />
                  {nameError && (
                    <p className="mt-1.5 text-sm text-red-600 flex items-center gap-1">
                      <span className="w-1 h-1 rounded-full bg-red-500 inline-block shrink-0" />
                      {nameError}
                    </p>
                  )}
                </div>
                <Input
                  label="Doğum Tarihi"
                  type="date"
                  value={form.birthDate}
                  onChange={e => setForm(f => ({ ...f, birthDate: e.target.value }))}
                />
                <TextArea
                  label="Tanı Bilgisi"
                  value={form.diagnosisInfo}
                  onChange={e => setForm(f => ({ ...f, diagnosisInfo: e.target.value }))}
                  placeholder="Otizm spektrum bozukluğu, seviye... gibi"
                />
                <div className="space-y-3 rounded-2xl bg-indigo-50/60 border border-indigo-100 p-4">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Başlangıç odağı</p>
                    <p className="text-xs text-gray-500 mt-0.5">Ana sayfa ve tedavi önerileri bu bilgiyle daha kişisel başlar.</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {FOCUS_OPTIONS.map(option => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => setForm(f => ({ ...f, primaryFocus: f.primaryFocus === option ? '' : option }))}
                        className={`px-3 py-1.5 rounded-full border text-sm font-medium transition-all ${
                          form.primaryFocus === option
                            ? 'bg-indigo-600 border-indigo-600 text-white'
                            : 'bg-white border-indigo-100 text-indigo-700 hover:border-indigo-300'
                        }`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">İletişim düzeyi</label>
                    <select
                      value={form.communicationLevel}
                      onChange={e => setForm(f => ({ ...f, communicationLevel: e.target.value }))}
                      className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                    >
                      <option value="">Seçiniz</option>
                      {COMMUNICATION_OPTIONS.map(option => <option key={option} value={option}>{option}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Evde en gerekli destek</label>
                    <select
                      value={form.supportNeed}
                      onChange={e => setForm(f => ({ ...f, supportNeed: e.target.value }))}
                      className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                    >
                      <option value="">Seçiniz</option>
                      {SUPPORT_OPTIONS.map(option => <option key={option} value={option}>{option}</option>)}
                    </select>
                  </div>
                </div>
              </div>
              <div className="px-8 pb-8">
                <Button onClick={handleStep1} loading={loading} className="w-full">
                  Devam Et <ChevronRight size={16} className="ml-1" />
                </Button>
              </div>
            </div>
          )}

          {/* ──── STEP 2 ──── */}
          {step === 2 && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-8 pt-8 pb-6 border-b border-gray-50">
                <div className="w-12 h-12 rounded-2xl bg-purple-100 flex items-center justify-center mb-4">
                  <TagIcon size={24} className="text-purple-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">Semptom Etiketleri</h2>
                <p className="text-gray-500 text-sm mt-1">
                  Çocuğunuzda gözlemlenen belirtileri işaretleyin. Bu bilgi yalnızca eşleştirme için kullanılır.
                </p>
              </div>
              <div className="px-8 py-6 space-y-5 max-h-[360px] overflow-y-auto">
                {Object.keys(tagsByCategory).length === 0 && (
                  <p className="text-sm text-gray-400 text-center py-6">Etiketler yükleniyor...</p>
                )}
                {Object.entries(tagsByCategory).map(([cat, tags]) => (
                  <div key={cat}>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
                      {CATEGORY_LABELS[cat] || cat}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {tags.map(tag => {
                        const sel = selectedTagIds.has(tag.id);
                        return (
                          <button
                            key={tag.id}
                            onClick={() => setSelectedTagIds(prev => {
                              const next = new Set(prev);
                              if (next.has(tag.id)) next.delete(tag.id);
                              else next.add(tag.id);
                              return next;
                            })}
                            className={`px-3 py-1.5 rounded-full text-sm border font-medium transition-all cursor-pointer flex items-center gap-1 ${
                              sel
                                ? (CATEGORY_SELECTED_COLORS[cat] || 'bg-indigo-600 border-indigo-600 text-white')
                                : (CATEGORY_IDLE_COLORS[cat] || 'border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100')
                            }`}
                          >
                            {sel && <Check size={11} />}
                            {tag.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
              {selectedTagIds.size > 0 && (
                <div className="px-8 pb-2">
                  <p className="text-sm text-indigo-600 font-medium">{selectedTagIds.size} etiket seçildi</p>
                </div>
              )}
              <div className="px-8 pb-8 flex gap-3">
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                  <ChevronLeft size={16} className="mr-1" /> Geri
                </Button>
                <Button onClick={handleStep2} loading={loading} className="flex-1">
                  {selectedTagIds.size === 0 ? 'Atla' : 'Devam Et'}
                  <ChevronRight size={16} className="ml-1" />
                </Button>
              </div>
            </div>
          )}

          {/* ──── STEP 3 ──── */}
          {step === 3 && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-8 pt-8 pb-6 border-b border-gray-50">
                <div className="w-12 h-12 rounded-2xl bg-green-100 flex items-center justify-center mb-4">
                  <Users size={24} className="text-green-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">Gruplara Katılın</h2>
                <p className="text-gray-500 text-sm mt-1">
                  Benzer deneyimler yaşayan ailelerin olduğu gruplara katılarak destek alın ve paylaşın.
                </p>
              </div>
              <div className="px-8 py-6 space-y-3 max-h-[340px] overflow-y-auto">
                {groups.length === 0 && (
                  <div className="text-center py-8">
                    <Users size={32} className="mx-auto text-gray-200 mb-3" />
                    <p className="text-sm text-gray-400">Henüz grup bulunmuyor.</p>
                    <p className="text-xs text-gray-300 mt-1">Platformda gruplar oluştukça burada görünecek.</p>
                  </div>
                )}
                {groups.map(group => (
                  <div
                    key={group.id}
                    className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0 font-bold text-indigo-700">
                      {group.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 text-sm truncate">{group.name}</p>
                      <p className="text-xs text-gray-400">
                        {group.memberCount} üye
                        {group.category ? ` · ${group.category}` : ''}
                      </p>
                    </div>
                    <button
                      onClick={() => handleJoinGroup(group.id)}
                      disabled={joinedIds.has(group.id) || joiningId === group.id}
                      className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        joinedIds.has(group.id)
                          ? 'bg-green-100 text-green-700'
                          : 'bg-indigo-600 text-white hover:bg-indigo-700'
                      } disabled:opacity-50`}
                    >
                      {joiningId === group.id
                        ? '...'
                        : joinedIds.has(group.id)
                        ? <span className="flex items-center gap-1"><Check size={11} />Katıldı</span>
                        : 'Katıl'}
                    </button>
                  </div>
                ))}
              </div>
              <div className="px-8 pb-8 flex gap-3">
                <Button variant="outline" onClick={() => setStep(2)} className="flex-1">
                  <ChevronLeft size={16} className="mr-1" /> Geri
                </Button>
                <Button onClick={() => setStep(4)} className="flex-1">
                  Devam Et <ChevronRight size={16} className="ml-1" />
                </Button>
              </div>
            </div>
          )}

          {/* ──── STEP 4 ──── */}
          {step === 4 && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-8 pt-8 pb-6 border-b border-gray-50">
                <div className="w-12 h-12 rounded-2xl bg-orange-100 flex items-center justify-center mb-4">
                  <Activity size={24} className="text-orange-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">Terapi Programı</h2>
                <p className="text-gray-500 text-sm mt-1">
                  Çocuğunuzun aldığı veya planladığınız terapileri seçin.
                </p>
              </div>
              <div className="px-8 py-6 space-y-5">
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-3">Terapi türleri</p>
                  <div className="flex flex-wrap gap-2">
                    {THERAPY_OPTIONS.map(t => {
                      const sel = selectedTherapies.has(t);
                      return (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setSelectedTherapies(prev => {
                            const next = new Set(prev);
                            if (next.has(t)) next.delete(t); else next.add(t);
                            return next;
                          })}
                          className={`px-3 py-1.5 rounded-full border text-sm font-medium transition-all cursor-pointer flex items-center gap-1 ${
                            sel
                              ? 'bg-orange-500 border-orange-500 text-white'
                              : 'border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100'
                          }`}
                        >
                          {sel && <Check size={11} />}{t}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Haftalık seans sıklığı</label>
                  <select
                    value={therapyFrequency}
                    onChange={e => setTherapyFrequency(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                  >
                    <option value="">Seçiniz</option>
                    <option value="Haftada 1">Haftada 1</option>
                    <option value="Haftada 2-3">Haftada 2-3</option>
                    <option value="Haftada 4-5">Haftada 4-5</option>
                    <option value="Her gün">Her gün</option>
                  </select>
                </div>
              </div>
              <div className="px-8 pb-8 flex gap-3">
                <Button variant="outline" onClick={() => setStep(3)} className="flex-1">
                  <ChevronLeft size={16} className="mr-1" /> Geri
                </Button>
                <Button onClick={handleStep4} loading={loading} className="flex-1">
                  {selectedTherapies.size === 0 ? 'Atla' : 'Kaydet ve Devam'} <ChevronRight size={16} className="ml-1" />
                </Button>
              </div>
            </div>
          )}

          {/* ──── STEP 5 ──── */}
          {step === 5 && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-8 pt-8 pb-6 border-b border-gray-50">
                <div className="w-12 h-12 rounded-2xl bg-teal-100 flex items-center justify-center mb-4">
                  <GraduationCap size={24} className="text-teal-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">Uzman Eşleştirme</h2>
                <p className="text-gray-500 text-sm mt-1">
                  Platformumuzdaki uzmanlarla tanışın ve randevu alın.
                </p>
              </div>
              <div className="px-8 py-6 space-y-3">
                {experts.length === 0 && (
                  <div className="text-center py-6">
                    <GraduationCap size={32} className="mx-auto text-gray-200 mb-2" />
                    <p className="text-sm text-gray-400">Uzmanlar yükleniyor...</p>
                  </div>
                )}
                {experts.map(expert => (
                  <div key={expert.id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors">
                    <div className="w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center shrink-0 font-bold text-teal-700">
                      {expert.fullName?.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900">{expert.fullName}</p>
                      <p className="text-xs text-gray-400">{expert.expertTitle || 'Uzman'}</p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${expert.verified ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {expert.verified ? '✓ Onaylı' : 'Beklemede'}
                    </span>
                  </div>
                ))}
                <div className="bg-teal-50 border border-teal-100 rounded-xl p-4 mt-2">
                  <p className="text-sm text-teal-800 font-medium">💡 İpucu</p>
                  <p className="text-xs text-teal-700 mt-1">
                    Platforma girdikten sonra <strong>Uzmanlar</strong> sayfasından tüm uzmanları görebilir, profil inceleyebilir ve randevu alabilirsiniz.
                  </p>
                </div>
              </div>
              <div className="px-8 pb-8 flex gap-3">
                <Button variant="outline" onClick={() => setStep(4)} className="flex-1">
                  <ChevronLeft size={16} className="mr-1" /> Geri
                </Button>
                <Button onClick={handleFinish} className="flex-1">
                  <Sparkles size={15} className="mr-2" />
                  Platforma Başla
                </Button>
              </div>
            </div>
          )}

          {/* Bottom hint */}
          <p className="text-center text-xs text-gray-400 mt-4">
            Adım {step} / {STEPS.length} · İstediğiniz zaman bu adımları atlayabilirsiniz
          </p>
        </div>
      </div>
    </div>
  );
}
