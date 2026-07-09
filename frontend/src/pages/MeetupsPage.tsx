import { useEffect, useState } from 'react';
import { MapPin, Calendar, Users, Plus, Clock, CheckCircle2, Heart, Coffee, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageOnboarding } from '@/components/ui/PageOnboarding';
import { communityService, type CommunityMeetup } from '@/services/communityService';
import { toast } from '@/store/toastStore';
import { TURKISH_CITIES } from '@/constants/turkishCities';

const FILTER_CITIES = ['Tümü', 'İstanbul', 'Ankara', 'İzmir', 'Bursa', 'Antalya', 'Diğer'];

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', weekday: 'long' });
}

function daysUntil(dateStr: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  const diff = Math.ceil((target.getTime() - today.getTime()) / 86400000);
  if (diff === 0) return 'Bugün';
  if (diff === 1) return 'Yarın';
  return `${diff} gün sonra`;
}

export function MeetupsPage() {
  const [meetups, setMeetups] = useState<CommunityMeetup[]>([]);
  const [selectedCity, setSelectedCity] = useState('Tümü');
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: '', city: '', district: '', venue: '', date: '', time: '', description: '' });

  const loadMeetups = async (city = selectedCity) => {
    setLoading(true);
    try {
      setMeetups(await communityService.getMeetups(city));
    } catch {
      toast.error('Buluşmalar yüklenemedi.');
    }
    setLoading(false);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadMeetups('Tümü');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCitySelect = (city: string) => {
    setSelectedCity(city);
    loadMeetups(city);
  };

  const upsertMeetup = (meetup: CommunityMeetup) => {
    setMeetups(prev => prev.some(m => m.id === meetup.id)
      ? prev.map(m => m.id === meetup.id ? meetup : m)
      : [meetup, ...prev]);
  };

  const toggleJoin = async (id: string) => {
    try {
      const updated = await communityService.toggleMeetupAttendance(id);
      upsertMeetup(updated);
      toast.success(updated.joined ? 'Buluşmaya katılıyorsunuz!' : 'Katılımınız iptal edildi.');
    } catch {
      toast.error('Katılım güncellenemedi.');
    }
  };

  const handleCreate = async () => {
    if (!form.title || !form.city || !form.date) {
      toast.error('Lütfen başlık, şehir ve tarih alanlarını doldurun.');
      return;
    }
    setSaving(true);
    try {
      const meetup = await communityService.createMeetup({
        title: form.title,
        city: form.city,
        district: form.district || undefined,
        venue: form.venue || undefined,
        date: form.date,
        time: form.time || undefined,
        description: form.description || undefined,
        emoji: '📍',
      });
      upsertMeetup(meetup);
      setShowModal(false);
      setForm({ title: '', city: '', district: '', venue: '', date: '', time: '', description: '' });
      toast.success('Buluşmanız oluşturuldu. Diğer aileler görebilecek.');
    } catch {
      toast.error('Buluşma oluşturulamadı.');
    }
    setSaving(false);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      <PageOnboarding
        pageId="meetups"
        title="Yakınındaki Ailelerle Buluş"
        description="Aynı şehirde yaşayan, benzer süreçten geçen ailelerle gerçek hayatta tanışın. Bazen birini dinlemek veya birinin sizi dinlemesi her şeyi değiştirir."
        steps={[
          { icon: <MapPin size={20} />, title: 'Şehrinizi Seçin', description: 'Şehrinize göre filtreleyerek yakınızda planlanan buluşmaları görün.' },
          { icon: <Users size={20} />, title: 'Katılın', description: 'Katılmak istediğiniz buluşmaya tıklayın. Katılımınız diğer ailelerle aynı listede görünür.' },
          { icon: <Plus size={20} />, title: 'Siz Düzenleyin', description: 'Yakınınızda buluşma yok mu? Kendiniz oluşturun, diğer aileler görsün.' },
        ]}
      />

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Yerel Buluşmalar</h1>
          <p className="text-gray-500 mt-1">Aynı şehirdeki ailelerle bir araya gelin</p>
        </div>
        <Button onClick={() => setShowModal(true)}>
          <Plus size={18} className="mr-2" />
          Buluşma Oluştur
        </Button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {FILTER_CITIES.map(city => (
          <button
            key={city}
            onClick={() => handleCitySelect(city)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all cursor-pointer ${
              selectedCity === city
                ? 'bg-primary-600 text-white shadow-sm'
                : 'bg-white text-gray-600 border border-gray-200 hover:border-primary-300'
            }`}
          >
            {city}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="min-h-[220px] flex items-center justify-center">
          <Loader2 size={28} className="animate-spin text-primary-500" />
        </div>
      ) : meetups.length === 0 ? (
        <EmptyState
          icon={<MapPin size={28} />}
          title={`${selectedCity} için henüz buluşma yok`}
          description="Siz bir buluşma oluşturun, diğer aileler görsün. Başlamak için bir kişi yeter."
          action={<Button onClick={() => setShowModal(true)}><Plus size={16} className="mr-2" />Buluşma Oluştur</Button>}
        />
      ) : (
        <div className="space-y-4">
          {meetups.map(meetup => (
            <div
              key={meetup.id}
              className={`bg-white rounded-2xl border p-5 shadow-sm hover:shadow-md transition-shadow ${meetup.joined ? 'border-primary-200 bg-primary-50/20' : 'border-gray-100'}`}
            >
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-2xl shrink-0">
                  {meetup.emoji || '📍'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <h2 className="font-bold text-gray-900 text-base">{meetup.title}</h2>
                    {meetup.joined && (
                      <span className="flex items-center gap-1 text-xs font-bold text-primary-600 bg-primary-50 px-2 py-1 rounded-full border border-primary-100">
                        <CheckCircle2 size={12} /> Katılıyorsunuz
                      </span>
                    )}
                  </div>

                  <div className="mt-2 flex flex-wrap gap-3 text-sm text-gray-500">
                    <span className="flex items-center gap-1"><MapPin size={14} /> {meetup.district ? `${meetup.district}, ` : ''}{meetup.city}</span>
                    <span className="flex items-center gap-1"><Calendar size={14} /> {formatDate(meetup.date)}</span>
                    {meetup.time && <span className="flex items-center gap-1"><Clock size={14} /> {meetup.time.slice(0, 5)}</span>}
                    <span className="flex items-center gap-1 text-emerald-600 font-semibold">{daysUntil(meetup.date)}</span>
                  </div>

                  {meetup.venue && <p className="mt-1 text-sm text-gray-500 font-medium">📍 {meetup.venue}</p>}
                  {meetup.description && <p className="mt-3 text-sm text-gray-700 leading-relaxed">{meetup.description}</p>}

                  <div className="mt-4 flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-3 text-sm text-gray-500">
                      <span className="flex items-center gap-1"><Users size={14} /> {meetup.attendees} kişi katılıyor</span>
                      <span className="flex items-center gap-1"><Coffee size={14} /> {meetup.organizer}</span>
                    </div>
                    <button
                      onClick={() => toggleJoin(meetup.id)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                        meetup.joined
                          ? 'bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-600'
                          : 'bg-primary-600 text-white hover:bg-primary-700 shadow-sm'
                      }`}
                    >
                      {meetup.joined ? <><CheckCircle2 size={16} /> Katılıyorum</> : <><Heart size={16} /> Katılmak İstiyorum</>}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Buluşma Oluştur">
        <div className="space-y-4 p-1">
          <p className="text-sm text-gray-500">Bir buluşma oluşturun. Şehrinizden diğer aileler görecek ve katılabilecek.</p>
          <Input label="Buluşma Adı" placeholder="ör: Parkta Sabah Buluşması" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Şehir</label>
              <select
                value={form.city}
                onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-300"
              >
                <option value="">Seçin</option>
                {TURKISH_CITIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <Input label="İlçe" placeholder="ör: Kadıköy" value={form.district} onChange={e => setForm(f => ({ ...f, district: e.target.value }))} />
          </div>
          <Input label="Buluşma Yeri" placeholder="ör: Moda Parkı veya kafe adı" value={form.venue} onChange={e => setForm(f => ({ ...f, venue: e.target.value }))} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Tarih" type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            <Input label="Saat" type="time" value={form.time} onChange={e => setForm(f => ({ ...f, time: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Açıklama</label>
            <textarea
              rows={3}
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Kimler katılabilir, ortam nasıl olacak?"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-300"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={() => setShowModal(false)} className="flex-1">İptal</Button>
            <Button onClick={handleCreate} loading={saving} className="flex-1">Oluştur</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
