import { useState } from 'react';
import { MapPin, Calendar, Users, Plus, Clock, CheckCircle2, Heart, Coffee } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageOnboarding } from '@/components/ui/PageOnboarding';
import { toast } from '@/store/toastStore';

const CITIES = ['Tümü', 'İstanbul', 'Ankara', 'İzmir', 'Bursa', 'Antalya', 'Diğer'];

interface Meetup {
  id: string;
  title: string;
  city: string;
  district: string;
  venue: string;
  date: string;
  time: string;
  description: string;
  organizer: string;
  attendees: number;
  joined: boolean;
  emoji: string;
}

const INITIAL_MEETUPS: Meetup[] = [
  {
    id: '1',
    title: 'Parkta Sabah Buluşması',
    city: 'İstanbul',
    district: 'Kadıköy',
    venue: 'Moda Parkı',
    date: '2026-07-12',
    time: '10:00',
    description: 'Çocuklarımız parkta oynarken biz de kahve içip sohbet edelim. Gelirken bir şeyler getirmek zorunlu değil, sadece gelin.',
    organizer: 'Ayşe K.',
    attendees: 8,
    joined: false,
    emoji: '☕',
  },
  {
    id: '2',
    title: 'Anneler ve Babalar Bir Arada',
    city: 'Ankara',
    district: 'Çankaya',
    venue: 'Kuğulu Park yakını kafe',
    date: '2026-07-19',
    time: '14:00',
    description: 'İlk kez buluşma düzenliyoruz. Birbirimizi tanıyalım, yaşadıklarımızı paylaşalım. Çocuklar da gelirse güzel olur.',
    organizer: 'Mehmet Y.',
    attendees: 5,
    joined: false,
    emoji: '🤝',
  },
  {
    id: '3',
    title: 'Sahil Yürüyüşü & Piknik',
    city: 'İzmir',
    district: 'Karşıyaka',
    venue: 'Karşıyaka Sahili',
    date: '2026-07-26',
    time: '09:30',
    description: 'Çocuklarla birlikte yürüyüş yapalım, piknik alanında oturalım. Hava güzelse çok keyifli olacak.',
    organizer: 'Fatma Ö.',
    attendees: 14,
    joined: true,
    emoji: '🌊',
  },
  {
    id: '4',
    title: 'Deneyim Paylaşım Toplantısı',
    city: 'İstanbul',
    district: 'Beşiktaş',
    venue: 'Beşiktaş Kültür Merkezi',
    date: '2026-08-02',
    time: '11:00',
    description: 'Terapi, okul ve günlük yaşam hakkında deneyimlerimizi paylaşalım. Yeni başlayan aileler için çok faydalı olabilir.',
    organizer: 'Zeynep A.',
    attendees: 21,
    joined: false,
    emoji: '💬',
  },
  {
    id: '5',
    title: 'Çocuklar İçin Oyun Günü',
    city: 'Bursa',
    district: 'Nilüfer',
    venue: 'Mudanya Yolu yakını oyun alanı',
    date: '2026-08-09',
    time: '10:30',
    description: 'Çocuklarımız birlikte oynasın, biz de birbirimizi tanıyalım. Sensory-friendly bir ortam oluşturmaya çalışacağız.',
    organizer: 'Ali Ç.',
    attendees: 9,
    joined: false,
    emoji: '🎈',
  },
];

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', weekday: 'long' });
}

function daysUntil(dateStr: string) {
  const diff = Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
  if (diff === 0) return 'Bugün';
  if (diff === 1) return 'Yarın';
  return `${diff} gün sonra`;
}

export function MeetupsPage() {
  const [meetups, setMeetups] = useState<Meetup[]>(INITIAL_MEETUPS);
  const [selectedCity, setSelectedCity] = useState('Tümü');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ title: '', city: '', district: '', venue: '', date: '', time: '', description: '' });

  const filtered = selectedCity === 'Tümü' ? meetups : meetups.filter(m => m.city === selectedCity);

  const toggleJoin = (id: string) => {
    setMeetups(prev => prev.map(m => {
      if (m.id !== id) return m;
      const joining = !m.joined;
      toast.success(joining ? 'Buluşmaya katılıyorsunuz!' : 'Katılımınız iptal edildi.');
      return { ...m, joined: joining, attendees: joining ? m.attendees + 1 : m.attendees - 1 };
    }));
  };

  const handleCreate = () => {
    if (!form.title || !form.city || !form.date) {
      toast.error('Lütfen başlık, şehir ve tarih alanlarını doldurun.');
      return;
    }
    const newMeetup: Meetup = {
      id: Date.now().toString(),
      ...form,
      organizer: 'Siz',
      attendees: 1,
      joined: true,
      emoji: '📍',
    };
    setMeetups(prev => [newMeetup, ...prev]);
    setShowModal(false);
    setForm({ title: '', city: '', district: '', venue: '', date: '', time: '', description: '' });
    toast.success('Buluşmanız oluşturuldu! Diğer aileler görebilecek.');
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      <PageOnboarding
        pageId="meetups"
        title="Yakınındaki Ailelerle Buluş"
        description="Aynı şehirde yaşayan, benzer süreçten geçen ailelerle gerçek hayatta tanışın. Bazen birini dinlemek veya birinin sizi dinlemesi her şeyi değiştirir."
        steps={[
          {
            icon: <MapPin size={20} />,
            title: 'Şehrinizi Seçin',
            description: 'Şehrinize göre filtreleyerek yakınızda planlanan buluşmaları görün.',
          },
          {
            icon: <Users size={20} />,
            title: 'Katılın',
            description: 'Katılmak istediğiniz buluşmaya tıklayın. Organizatör sizinle iletişime geçecek.',
          },
          {
            icon: <Plus size={20} />,
            title: 'Siz Düzenleyin',
            description: 'Yakınınızda buluşma yok mu? Kendiniz oluşturun, diğer aileler görsün.',
          },
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

      {/* City filter */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {CITIES.map(city => (
          <button
            key={city}
            onClick={() => setSelectedCity(city)}
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

      {/* Meetup list */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={<MapPin size={28} />}
          title={`${selectedCity} için henüz buluşma yok`}
          description="Siz bir buluşma oluşturun, diğer aileler görsün. Başlamak için bir kişi yeter."
          action={<Button onClick={() => setShowModal(true)}><Plus size={16} className="mr-2" />Buluşma Oluştur</Button>}
        />
      ) : (
        <div className="space-y-4">
          {filtered.map(meetup => (
            <div
              key={meetup.id}
              className={`bg-white rounded-2xl border p-5 shadow-sm hover:shadow-md transition-shadow ${meetup.joined ? 'border-primary-200 bg-primary-50/20' : 'border-gray-100'}`}
            >
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-2xl shrink-0">
                  {meetup.emoji}
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
                    <span className="flex items-center gap-1"><MapPin size={14} /> {meetup.district}, {meetup.city}</span>
                    <span className="flex items-center gap-1"><Calendar size={14} /> {formatDate(meetup.date)}</span>
                    <span className="flex items-center gap-1"><Clock size={14} /> {meetup.time}</span>
                    <span className="flex items-center gap-1 text-emerald-600 font-semibold">{daysUntil(meetup.date)}</span>
                  </div>

                  {meetup.venue && (
                    <p className="mt-1 text-sm text-gray-500 font-medium">📍 {meetup.venue}</p>
                  )}

                  <p className="mt-3 text-sm text-gray-700 leading-relaxed">{meetup.description}</p>

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
                      {meetup.joined ? (
                        <><CheckCircle2 size={16} /> Katılıyorum</>
                      ) : (
                        <><Heart size={16} /> Katılmak İstiyorum</>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create meetup modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Buluşma Oluştur">
        <div className="space-y-4 p-1">
          <p className="text-sm text-gray-500">Bir buluşma oluşturun. Şehrinizden diğer aileler görecek ve katılabilecek.</p>
          <Input
            label="Buluşma Adı"
            placeholder="ör: Parkta Sabah Buluşması"
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
          />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Şehir</label>
              <select
                value={form.city}
                onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-300"
              >
                <option value="">Seçin</option>
                {CITIES.filter(c => c !== 'Tümü').map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <Input
              label="İlçe"
              placeholder="ör: Kadıköy"
              value={form.district}
              onChange={e => setForm(f => ({ ...f, district: e.target.value }))}
            />
          </div>
          <Input
            label="Buluşma Yeri"
            placeholder="ör: Moda Parkı veya kafe adı"
            value={form.venue}
            onChange={e => setForm(f => ({ ...f, venue: e.target.value }))}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Tarih"
              type="date"
              value={form.date}
              onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
            />
            <Input
              label="Saat"
              type="time"
              value={form.time}
              onChange={e => setForm(f => ({ ...f, time: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Açıklama</label>
            <textarea
              rows={3}
              placeholder="Buluşma hakkında kısa bir açıklama yazın..."
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-300"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setShowModal(false)}>Vazgeç</Button>
            <Button className="flex-1" onClick={handleCreate}>Oluştur</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
