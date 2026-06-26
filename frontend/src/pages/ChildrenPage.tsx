import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Baby, Plus, Trash2, Edit, Search, X, ClipboardList, GraduationCap, Bell, ShieldCheck } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { TextArea } from '@/components/ui/TextArea';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { PageOnboarding } from '@/components/ui/PageOnboarding';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { useChildStore } from '@/store/childStore';
import { childService } from '@/services/childService';
import { patientService } from '@/services/patientService';
import { toast } from '@/store/toastStore';
import { formatDateTime } from '@/utils/date';
import type { Child, ExpertConnectionRequest } from '@/types';

const GENDER_LABELS: Record<string, string> = { ERKEK: 'Erkek', KIZ: 'Kız' };

// Fix 1: yaş hesaplama
function calcAge(birthDate?: string): string {
  if (!birthDate) return '';
  const birth = new Date(birthDate);
  if (Number.isNaN(birth.getTime())) return '';
  const today = new Date();
  let months = (today.getFullYear() - birth.getFullYear()) * 12 + today.getMonth() - birth.getMonth();
  if (today.getDate() < birth.getDate()) months -= 1;
  if (months < 0) return '';
  if (months < 24) return `${months} aylık`;
  const years = Math.floor(months / 12);
  const extra = months % 12;
  return extra > 0 ? `${years} yaş ${extra} ay` : `${years} yaş`;
}

// Fix 4: Türkçe normalize arama
function normalizeTR(str: string): string {
  return str
    .toLocaleLowerCase('tr-TR')
    .replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ı/g, 'i')
    .replace(/ö/g, 'o').replace(/ş/g, 's').replace(/ü/g, 'u');
}

// Fix 5: terapileri parse et
function parseTherapies(raw?: string): string[] {
  if (!raw?.trim()) return [];
  return raw.split(/[\n,;]+/).map(t => t.trim()).filter(Boolean);
}

export function ChildrenPage() {
  const { children, setChildren, addChild, removeChild } = useChildStore();
  const { hash } = useLocation();
  const requestsSectionRef = useRef<HTMLElement>(null);
  const profilesSectionRef = useRef<HTMLDivElement>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fieldError, setFieldError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Child | null>(null);
  const [search, setSearch] = useState('');
  const [connectionRequests, setConnectionRequests] = useState<ExpertConnectionRequest[]>([]);
  const [form, setForm] = useState({
    name: '', birthDate: '', diagnosisInfo: '', educationProgram: '', therapies: '', gender: '' as '' | 'ERKEK' | 'KIZ',
  });

  useEffect(() => {
    childService.getAll()
      .then(setChildren)
      .catch(() => {})
      .finally(() => setInitialLoading(false));

    patientService.getConnectionRequests()
      .then(setConnectionRequests)
      .catch(() => {});
  }, [setChildren]);

  useEffect(() => {
    if (hash === '#uzman-istekleri' && requestsSectionRef.current) {
      setTimeout(() => {
        requestsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 150);
    }
  }, [hash]);

  const handleCreate = async () => {
    if (!form.name.trim()) {
      setFieldError('Çocuğun adı zorunludur.');
      return;
    }
    setFieldError('');
    setSaving(true);
    try {
      const child = await childService.create({ ...form, gender: form.gender || undefined });
      addChild(child);
      setShowModal(false);
      setForm({ name: '', birthDate: '', diagnosisInfo: '', educationProgram: '', therapies: '', gender: '' });
      toast.success('Çocuk profili başarıyla oluşturuldu.');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || 'Profil oluşturulamadı. Lütfen tekrar deneyin.');
    }
    setSaving(false);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setFieldError('');
    setForm({ name: '', birthDate: '', diagnosisInfo: '', educationProgram: '', therapies: '', gender: '' });
  };

  const handleDelete = async (id: string) => {
    try {
      await childService.delete(id);
      removeChild(id);
      toast.success('Profil silindi.');
    } catch {
      toast.error('Profil silinemedi. Lütfen tekrar deneyin.');
    }
    setDeleteTarget(null);
  };

  const handleProfileUpdateGuideClick = () => {
    if (children.length === 0) {
      setShowModal(true);
      return;
    }

    profilesSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // Fix 4: Türkçe normalize arama
  const filtered = children.filter(c => {
    if (!search.trim()) return true;
    const q = normalizeTR(search);
    return normalizeTR(c.name).includes(q) || normalizeTR(c.diagnosisInfo ?? '').includes(q);
  });

  return (
    <div className="space-y-6">
      <PageOnboarding
        pageId="children"
        title="Çocuğunuzu Buraya Ekleyin"
        description="Çocuğunuzun adını ve bilgilerini girdikten sonra ilaç, randevu ve gelişim takibini kolayca yapabilirsiniz."
        steps={[
          {
            icon: <Plus size={20} />,
            title: "Çocuğunuzu Ekleyin",
            description: "Sadece adını ve doğum tarihini girerek başlayabilirsiniz. Diğer bilgileri sonra ekleyebilirsiniz.",
            onClick: () => setShowModal(true)
          },
          {
            icon: <Baby size={20} />,
            title: "Bilgileri Güncel Tutun",
            description: "Bir şey değiştiğinde (yeni ilaç, yeni terapi gibi) buraya gelip güncelleyebilirsiniz.",
            onClick: handleProfileUpdateGuideClick
          }
        ]}
      />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Çocuğumun Bilgileri</h1>
          <p className="text-gray-500 mt-1">Çocuğunuzun bilgilerini buradan ekleyip güncelleyebilirsiniz</p>
        </div>
        <Button onClick={() => setShowModal(true)}>
          <Plus size={18} className="mr-2" /> Çocuğumu Ekle
        </Button>
      </div>

      <section id="uzman-istekleri" ref={requestsSectionRef} className="rounded-2xl border border-amber-200 bg-amber-50 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-4">
          <Bell size={20} className="text-amber-600" />
          <h2 className="text-lg font-semibold text-amber-900">Gelen Uzman İstekleri</h2>
          {connectionRequests.length > 0 && (
            <span className="ml-auto bg-amber-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
              {connectionRequests.length}
            </span>
          )}
        </div>
        {connectionRequests.length === 0 ? (
          <div className="flex items-center gap-3 text-amber-700/60 py-1">
            <ShieldCheck size={17} />
            <p className="text-sm">Şu an bekleyen uzman erişim isteği yok.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {connectionRequests.map(req => (
              <div key={req.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl shadow-sm border border-amber-100">
                <div>
                  <p className="font-semibold text-slate-900">
                    <span className="text-indigo-600 font-bold">{req.expertName}</span>, çocuğunuz{' '}
                    <span className="font-bold">{req.childName}</span> için profile erişim istiyor.
                  </p>
                  <p className="text-xs text-slate-500 mt-1">İstek Tarihi: {formatDateTime(req.createdAt)}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={async () => {
                      try {
                        await patientService.approveConnection(req.id);
                        setConnectionRequests(prev => prev.filter(r => r.id !== req.id));
                        toast.success('Uzman erişim isteği onaylandı.');
                      } catch { toast.error('İşlem başarısız.'); }
                    }}
                  >
                    Onayla
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-rose-600 border-rose-200 hover:bg-rose-50"
                    onClick={async () => {
                      try {
                        await patientService.rejectConnection(req.id);
                        setConnectionRequests(prev => prev.filter(r => r.id !== req.id));
                        toast.success('Uzman erişim isteği reddedildi.');
                      } catch { toast.error('İşlem başarısız.'); }
                    }}
                  >
                    Reddet
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {!initialLoading && children.length > 0 && (
        <div className="relative max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="İsim veya tanıya göre ara..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-9 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer">
              <X size={14} className="text-gray-400" />
            </button>
          )}
        </div>
      )}

      <div ref={profilesSectionRef}>
        {/* Fix 5: skeleton loading */}
        {initialLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="rounded-2xl border border-gray-100 bg-white p-5 space-y-3">
                <SkeletonCard lines={3} />
              </div>
            ))}
          </div>
        ) : children.length === 0 ? (
          <EmptyState
            icon={<Baby size={32} />}
            title="Henüz çocuk eklenmemiş"
            description="Başlamak için çocuğunuzun adını ve doğum tarihini girin. Sadece bu iki bilgi yeterli, gerisini sonra ekleyebilirsiniz."
            steps={['Adını ve doğum tarihini girin.', 'İsterseniz tanı ve ilaç bilgisi ekleyin.', 'Ekledikten sonra ilaç ve randevu takibi yapabilirsiniz.']}
            action={
              <div className="flex flex-wrap items-center justify-center gap-2">
                <Button onClick={() => setShowModal(true)}>
                  <Plus size={15} className="mr-1" />
                  Çocuğumu Ekle
                </Button>
                <Link to="/gunluk-takip">
                  <Button variant="outline">
                    <ClipboardList size={15} className="mr-1" />
                    Günlük Takip
                  </Button>
                </Link>
                <Link to="/uzmanlar">
                  <Button variant="outline">
                    <GraduationCap size={15} className="mr-1" />
                    Uzman Bul
                  </Button>
                </Link>
              </div>
            }
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<Search size={28} />}
            title="Sonuç bulunamadı"
            description={`"${search}" araması için eşleşen profil yok`}
            action={<Button variant="outline" onClick={() => setSearch('')}>Aramayı Temizle</Button>}
          />
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(child => (
              <ChildCard key={child.id} child={child} onDelete={child => setDeleteTarget(child)} />
            ))}
          </div>
        )}
      </div>

      {/* Fix 2: silme modalında çocuk adı */}
      <ConfirmModal
        isOpen={!!deleteTarget}
        title="Profili sil?"
        message={`"${deleteTarget?.name}" adlı çocuğun profili ve tüm verileri kalıcı olarak silinecek. Bu işlem geri alınamaz.`}
        confirmLabel="Evet, sil"
        variant="danger"
        onConfirm={() => deleteTarget && handleDelete(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
      />

      <Modal isOpen={showModal} onClose={handleCloseModal} title="Yeni Çocuk Profili">
        <div className="space-y-5">
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-4">
            <div>
              <Input
                label="Çocuğun Adı *"
                value={form.name}
                onChange={e => { setForm(f => ({ ...f, name: e.target.value })); setFieldError(''); }}
                placeholder="Örn: Ahmet"
                className="bg-white"
              />
              {fieldError && (
                <p className="mt-1.5 text-[13px] font-medium text-red-500 flex items-center gap-1.5">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500" />
                  {fieldError}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Input
                  label="Doğum Tarihi"
                  type="date"
                  value={form.birthDate}
                  onChange={e => setForm(f => ({ ...f, birthDate: e.target.value }))}
                  className="bg-white"
                />
              </div>
              <div>
                <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">Cinsiyet</label>
                <div className="flex gap-2 h-[42px]">
                  {(['ERKEK', 'KIZ'] as const).map(g => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, gender: f.gender === g ? '' : g }))}
                      className={`flex-1 rounded-xl border-2 text-[13px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        form.gender === g
                          ? g === 'ERKEK' ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm' : 'border-pink-400 bg-pink-50 text-pink-700 shadow-sm'
                          : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <span>{g === 'ERKEK' ? '👦' : '👧'}</span>
                      <span>{g === 'ERKEK' ? 'Erkek' : 'Kız'}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1">Klinik & Eğitim Bilgileri</h4>
            <TextArea
              label="Tanı Bilgisi"
              value={form.diagnosisInfo}
              onChange={e => setForm(f => ({ ...f, diagnosisInfo: e.target.value }))}
              placeholder="Örn: Orta fonksiyonlu otizm spektrum bozukluğu"
              rows={2}
            />
            <TextArea
              label="Eğitim Programı"
              value={form.educationProgram}
              onChange={e => setForm(f => ({ ...f, educationProgram: e.target.value }))}
              placeholder="Uygulanan eğitim programını belirtiniz"
              rows={2}
            />
            <div>
              <TextArea
                label="Terapiler"
                value={form.therapies}
                onChange={e => setForm(f => ({ ...f, therapies: e.target.value }))}
                placeholder="Örn: ABA, dil terapisi, ergoterapi (virgülle ayırın)"
                rows={2}
              />
              {parseTherapies(form.therapies).length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2.5">
                  {parseTherapies(form.therapies).map(t => (
                    <span key={t} className="text-xs bg-indigo-50/80 text-indigo-700 border border-indigo-100/60 px-3 py-1 rounded-lg font-semibold shadow-sm">
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t border-slate-100">
            <Button variant="outline" onClick={handleCloseModal} className="flex-1 rounded-xl">İptal</Button>
            <Button onClick={handleCreate} loading={saving} className="flex-1 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-200">
              Profili Oluştur
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function ChildCard({ child, onDelete }: { child: Child; onDelete: (child: Child) => void }) {
  const genderColor = child.gender === 'ERKEK' ? 'bg-blue-50 text-blue-700 border-blue-100' : child.gender === 'KIZ' ? 'bg-pink-50 text-pink-700 border-pink-100' : '';
  const age = calcAge(child.birthDate);
  const therapyList = parseTherapies(child.therapies);

  return (
    <Card hover className="flex flex-col p-6 relative group overflow-hidden border-slate-100 hover:border-indigo-200 hover:shadow-xl hover:shadow-indigo-50/50 transition-all duration-300 bg-white">
      {/* Arka plan dekorasyonu */}
      <div className="absolute top-0 right-0 p-8 opacity-0 group-hover:opacity-5 transition-opacity duration-500 pointer-events-none">
        <Baby size={120} className="rotate-12 transform translate-x-4 -translate-y-4" />
      </div>

      {/* Tüm kartı tıklanabilir yapan kapsayıcı Link */}
      <Link to={`/cocuklarim/${child.id}`} className="absolute inset-0 z-0" aria-label={`${child.name} profilini görüntüle`} />

      <div className="flex items-start justify-between mb-5 relative z-10">
        <div className="flex items-center gap-4">
          {child.profileImageUrl ? (
            <img src={child.profileImageUrl} alt={child.name} className="w-16 h-16 rounded-full object-cover shrink-0 shadow-md border-2 border-white ring-4 ring-indigo-50" />
          ) : (
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shrink-0 shadow-md border-2 border-white ring-4 ring-indigo-50">
              <span className="text-white font-extrabold text-2xl tracking-wider">{child.name.charAt(0).toUpperCase()}</span>
            </div>
          )}
          <div className="min-w-0">
            <h3 className="font-extrabold text-gray-900 text-xl leading-tight group-hover:text-indigo-600 transition-colors truncate pr-2">{child.name}</h3>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {age && <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-lg border border-indigo-100/40 shadow-sm">{age}</span>}
              {child.gender && (
                <span className={`px-2.5 py-0.5 rounded-lg text-xs font-bold border shadow-sm ${genderColor}`}>
                  {GENDER_LABELS[child.gender]}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-1.5 shrink-0 relative z-20">
          <Link
            to={`/cocuklarim/${child.id}`}
            className="p-2 rounded-xl bg-slate-50 hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 transition-all hover:scale-105 shadow-sm border border-slate-100"
            title="Düzenle"
          >
            <Edit size={14} />
          </Link>
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(child); }}
            className="p-2 rounded-xl bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-all hover:scale-105 shadow-sm border border-slate-100 cursor-pointer"
            title="Sil"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <div className="flex-1 space-y-3.5 relative z-10 pointer-events-none">
        {child.diagnosisInfo && (
          <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-100/80">
            <p className="text-sm text-slate-600 line-clamp-2 leading-relaxed font-medium">{child.diagnosisInfo}</p>
          </div>
        )}
        {child.educationProgram && (
          <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 bg-indigo-50/40 border border-indigo-100/30 px-3 py-1.5 rounded-xl w-fit">
            <span>📚</span>
            <span className="truncate">{child.educationProgram}</span>
          </div>
        )}

        {therapyList.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {therapyList.slice(0, 3).map(t => (
              <span key={t} className="text-[11px] bg-emerald-50 text-emerald-700 border border-emerald-100/50 px-2.5 py-1 rounded-lg font-bold tracking-wide shadow-sm">
                {t}
              </span>
            ))}
            {therapyList.length > 3 && (
              <span className="text-[11px] bg-slate-50 text-slate-500 border border-slate-100 px-2.5 py-1 rounded-lg font-bold tracking-wide">
                +{therapyList.length - 3} daha
              </span>
            )}
          </div>
        )}
      </div>

      {/* Alt bölüm */}
      <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between relative z-10 group-hover:border-indigo-100 transition-colors pointer-events-none">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-300 animate-pulse" />
          <span>Profil Bilgileri</span>
        </div>
        <div className="flex gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          {child.diagnosisInfo && <span className="bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-md flex items-center gap-1"><span className="text-green-500 font-bold">✓</span> Tanı</span>}
          {therapyList.length > 0 && <span className="bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-md shadow-sm">{therapyList.length} Terapi</span>}
        </div>
      </div>

      {/* Profil Sayfasına Git Butonu */}
      <div className="mt-4 relative z-20">
        <Link
          to={`/cocuklarim/${child.id}`}
          className="w-full h-11 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-extrabold transition-all shadow-md shadow-indigo-100 hover:shadow-lg hover:shadow-indigo-200/50 text-sm hover:scale-[1.01] active:scale-[0.99] duration-200"
        >
          <span>Profil Sayfasına Git</span>
          <span className="transition-transform group-hover:translate-x-0.5">→</span>
        </Link>
      </div>
    </Card>
  );
}
