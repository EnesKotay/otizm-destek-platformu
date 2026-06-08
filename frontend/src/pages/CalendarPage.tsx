import { useEffect, useState } from 'react';
import {
  Calendar as CalendarIcon, Plus, ChevronLeft, ChevronRight, Pencil, Trash2,
  Brain, Stethoscope, BookOpen, Activity, Tag, MapPin, Bell, BellOff,
  CheckCircle2, XCircle, Clock, ListFilter, Video,
} from 'lucide-react';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { TextArea } from '@/components/ui/TextArea';
import { Modal } from '@/components/ui/Modal';
import { ConfirmModal } from '@/components/ui/ConfirmModal';

import { EmptyState } from '@/components/ui/EmptyState';
import { PageOnboarding } from '@/components/ui/PageOnboarding';
import { useChildStore } from '@/store/childStore';
import { childService } from '@/services/childService';
import { calendarService } from '@/services/calendarService';
import { toast } from '@/store/toastStore';
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  isSameDay, addMonths, subMonths, isToday, parseISO, differenceInMinutes,
} from 'date-fns';
import { tr } from 'date-fns/locale';
import type { CalendarEvent } from '@/types';

const eventTypes = [
  { value: 'TERAPI',    label: 'Terapi',    color: '#4F46E5', bgLight: '#EEF2FF', icon: Brain },
  { value: 'DOKTOR',   label: 'Doktor',    color: '#059669', bgLight: '#ECFDF5', icon: Stethoscope },
  { value: 'EGITIM',   label: 'Eğitim',    color: '#D97706', bgLight: '#FFFBEB', icon: BookOpen },
  { value: 'AKTIVITE', label: 'Aktivite',  color: '#DC2626', bgLight: '#FEF2F2', icon: Activity },
  { value: 'APPOINTMENT', label: 'Randevu', color: '#0EA5E9', bgLight: '#F0F9FF', icon: Video },
  { value: 'DIGER',    label: 'Diğer',     color: '#6B7280', bgLight: '#F9FAFB', icon: Tag },
];

const DURATIONS = [
  { label: '30 dk', minutes: 30 },
  { label: '1 sa',  minutes: 60 },
  { label: '1.5 sa', minutes: 90 },
  { label: '2 sa',  minutes: 120 },
];

const REMINDER_OPTIONS = [
  { label: 'Kapalı',  value: null },
  { label: '15 dk',   value: 15 },
  { label: '30 dk',   value: 30 },
  { label: '1 saat',  value: 60 },
  { label: '2 saat',  value: 120 },
  { label: '1 gün',   value: 1440 },
];

const STATUS_LABELS: Record<string, string> = {
  PLANNED: 'Planlandı',
  COMPLETED: 'Tamamlandı',
  CANCELLED: 'İptal',
};

const STATUS_STYLES: Record<string, string> = {
  PLANNED:   'bg-blue-50 text-blue-700 border-blue-100',
  COMPLETED: 'bg-green-50 text-green-700 border-green-100',
  CANCELLED: 'bg-gray-100 text-gray-400 border-gray-200',
};

const emptyForm = {
  title: '', description: '', eventType: 'TERAPI',
  startTime: '', endTime: '', color: '#4F46E5',
  location: '', reminderMinutesBefore: null as number | null,
};

function formatDuration(startTime: string, endTime?: string) {
  if (!endTime) return null;
  const diff = differenceInMinutes(parseISO(endTime), parseISO(startTime));
  if (diff <= 0) return null;
  return diff >= 60 ? `${Math.floor(diff / 60)} sa${diff % 60 ? ` ${diff % 60} dk` : ''}` : `${diff} dk`;
}

function FormFields({ f, setF, error: err, applyDuration, form }: {
  f: typeof emptyForm;
  setF: React.Dispatch<React.SetStateAction<typeof emptyForm>>;
  error: string | null;
  applyDuration: (minutes: number, target: 'create' | 'edit') => void;
  form: typeof emptyForm;
}) {
  return (
    <div className="space-y-4">
      <div
        className="h-1 rounded-full transition-colors"
        style={{ backgroundColor: eventTypes.find(t => t.value === f.eventType)?.color }}
      />
      {err && <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-100">{err}</div>}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Etkinlik Tipi</label>
        <div className="grid grid-cols-5 gap-1.5">
          {eventTypes.map(t => {
            const Icon = t.icon;
            const isSelected = f.eventType === t.value;
            return (
              <button
                key={t.value}
                onClick={() => setF(prev => ({ ...prev, eventType: t.value, color: t.color }))}
                className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border-2 transition-all cursor-pointer ${
                  isSelected ? '' : 'border-gray-100 bg-gray-50 hover:border-gray-200 text-gray-500'
                }`}
                style={isSelected ? { borderColor: t.color, backgroundColor: t.bgLight, color: t.color } : undefined}
              >
                <Icon size={16} />
                <span className="text-xs font-medium leading-tight">{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <Input label="Başlık *" value={f.title} onChange={e => setF(prev => ({ ...prev, title: e.target.value }))} placeholder="Etkinlik adı" />
      <Input label="Konum" value={f.location} onChange={e => setF(prev => ({ ...prev, location: e.target.value }))} placeholder="Klinik adı, adres…" />
      <TextArea label="Açıklama" value={f.description} onChange={e => setF(prev => ({ ...prev, description: e.target.value }))} rows={2} />

      <Input label="Başlangıç *" type="datetime-local" value={f.startTime} onChange={e => setF(prev => ({ ...prev, startTime: e.target.value }))} />

      <div>
        <Input label="Bitiş" type="datetime-local" value={f.endTime} onChange={e => setF(prev => ({ ...prev, endTime: e.target.value }))} />
        <div className="flex gap-1.5 mt-1.5 flex-wrap">
          {DURATIONS.map(d => (
            <button
              key={d.minutes}
              onClick={() => applyDuration(d.minutes, f === form ? 'create' : 'edit')}
              className="px-2 py-1 text-xs rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors cursor-pointer"
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Hatırlatma</label>
        <div className="flex flex-wrap gap-1.5">
          {REMINDER_OPTIONS.map(r => (
            <button
              key={String(r.value)}
              onClick={() => setF(prev => ({ ...prev, reminderMinutesBefore: r.value }))}
              className={`flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg border transition-colors cursor-pointer ${
                f.reminderMinutesBefore === r.value
                  ? 'bg-primary-600 text-white border-primary-600'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
              }`}
            >
              {r.value ? <Bell size={11} /> : <BellOff size={11} />} {r.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function CalendarPage() {
  const { children, setChildren, selectedChild, setSelectedChild } = useChildStore();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<CalendarEvent[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  // Edit state
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [editForm, setEditForm] = useState({ ...emptyForm });
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [deleteEventId, setDeleteEventId] = useState<string | null>(null);
  const [statusUpdating, setStatusUpdating] = useState<string | null>(null);

  useEffect(() => {
    childService.getAll().then(data => {
      setChildren(data);
      if (data.length > 0 && !selectedChild) setSelectedChild(data[0]);
    }).catch(() => {});
  }, [setChildren, setSelectedChild, selectedChild]);

  // Ay değişince verimli aylık sorgu kullan
  useEffect(() => {
    if (selectedChild) {
      const y = currentMonth.getFullYear();
      const m = currentMonth.getMonth() + 1;
      calendarService.getByMonth(selectedChild.id, y, m)
        .then(setEvents)
        .catch(() => {});
    }
  }, [selectedChild, currentMonth]);

  // Yaklaşan etkinlikler (sağ panel, tarih seçili değilken)
  useEffect(() => {
    calendarService.getUpcoming(10).then(setUpcomingEvents).catch(() => {});
  }, [events]);

  const days = eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) });
  const startDayOfWeek = startOfMonth(currentMonth).getDay();
  const emptyDays = Array(startDayOfWeek === 0 ? 6 : startDayOfWeek - 1).fill(null);

  const getEventsForDay = (day: Date) =>
    events.filter(e => isSameDay(parseISO(e.startTime), day));

  const dayEvents = selectedDate
    ? getEventsForDay(selectedDate).filter(e => filterStatus === 'ALL' || e.status === filterStatus)
    : [];

  const applyDuration = (minutes: number, target: 'create' | 'edit') => {
    const startTime = target === 'create' ? form.startTime : editForm.startTime;
    if (!startTime) return;
    const end = new Date(new Date(startTime).getTime() + minutes * 60 * 1000);
    const endStr = format(end, "yyyy-MM-dd'T'HH:mm");
    if (target === 'create') setForm(f => ({ ...f, endTime: endStr }));
    else setEditForm(f => ({ ...f, endTime: endStr }));
  };

  const handleOpenModal = () => {
    if (children.length === 0) {
      setError('Etkinlik ekleyebilmek için lütfen önce bir Çocuk Profili oluşturun.');
      return;
    }
    setError(null);
    const defaultStart = selectedDate ? format(selectedDate, "yyyy-MM-dd'T'09:00") : '';
    setForm({ ...emptyForm, startTime: defaultStart });
    setShowModal(true);
  };

  const toSeconds = (t: string) => t.length === 16 ? `${t}:00` : t;

  const handleCreate = async () => {
    setError(null);
    if (!selectedChild) { setError('Lütfen bir çocuk profili seçin.'); return; }
    if (!form.title.trim() || !form.startTime) { setError('Lütfen başlık ve başlangıç tarihini girin.'); return; }
    setLoading(true);
    try {
      const event = await calendarService.create({
        ...form,
        title: form.title.trim(),
        startTime: toSeconds(form.startTime),
        endTime: form.endTime ? toSeconds(form.endTime) : undefined,
        location: form.location?.trim() || undefined,
        childId: selectedChild.id,
      });
      setEvents(prev => [...prev, event]);
      setShowModal(false);
      setForm({ ...emptyForm });
      toast.success('Etkinlik oluşturuldu.');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg || 'Etkinlik kaydedilirken bir hata oluştu.');
    }
    setLoading(false);
  };

  const handleOpenEdit = (event: CalendarEvent, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditError(null);
    setEditingEvent(event);
    const toLocalInput = (iso: string) => iso ? iso.slice(0, 16) : '';
    setEditForm({
      title: event.title,
      description: event.description || '',
      eventType: event.eventType,
      startTime: toLocalInput(event.startTime),
      endTime: toLocalInput(event.endTime || ''),
      color: event.color || '#4F46E5',
      location: event.location || '',
      reminderMinutesBefore: event.reminderMinutesBefore ?? null,
    });
  };

  const handleUpdate = async () => {
    if (!editingEvent) return;
    setEditError(null);
    if (!editForm.title.trim() || !editForm.startTime) { setEditError('Başlık ve başlangıç tarihi zorunludur.'); return; }
    setEditLoading(true);
    try {
      const updated = await calendarService.update(editingEvent.id, {
        ...editForm,
        title: editForm.title.trim(),
        startTime: toSeconds(editForm.startTime),
        endTime: editForm.endTime ? toSeconds(editForm.endTime) : undefined,
        location: editForm.location?.trim() || undefined,
        childId: editingEvent.childId,
      });
      setEvents(prev => prev.map(e => e.id === updated.id ? updated : e));
      setEditingEvent(null);
      toast.success('Etkinlik güncellendi.');
    } catch {
      setEditError('Güncelleme sırasında bir hata oluştu.');
    }
    setEditLoading(false);
  };

  const handleDelete = async (eventId: string) => {
    try {
      await calendarService.delete(eventId);
      setEvents(prev => prev.filter(ev => ev.id !== eventId));
      toast.success('Etkinlik silindi.');
    } catch { toast.error('Etkinlik silinemedi.'); }
    setDeleteEventId(null);
  };

  const handleUpdateStatus = async (eventId: string, status: 'COMPLETED' | 'CANCELLED') => {
    setStatusUpdating(eventId);
    try {
      const updated = await calendarService.updateStatus(eventId, status);
      setEvents(prev => prev.map(e => e.id === updated.id ? updated : e));
      toast.success(status === 'COMPLETED' ? 'Etkinlik tamamlandı.' : 'Etkinlik iptal edildi.');
    } catch { toast.error('Durum güncellenemedi.'); }
    setStatusUpdating(null);
  };

  const typeInfo = (eventType: string) => eventTypes.find(t => t.value === eventType) ?? eventTypes[eventTypes.length - 1];

  const EventCard = ({ event }: { event: CalendarEvent }) => {
    const type = typeInfo(event.eventType);
    const duration = formatDuration(event.startTime, event.endTime);
    const isCancelled = event.status === 'CANCELLED';
    return (
      <div
        className={`group flex items-start gap-3 p-3 rounded-xl border transition-colors ${
          isCancelled ? 'bg-gray-50 border-gray-100 opacity-60' : 'bg-white border-gray-100 hover:border-gray-200 hover:shadow-sm'
        }`}
      >
        <div className="w-1 rounded-full min-h-[44px] shrink-0 mt-0.5" style={{ backgroundColor: type.color }} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className={`font-medium text-sm ${isCancelled ? 'line-through text-gray-400' : 'text-gray-900'}`}>
              {event.title}
            </p>
            <span className={`inline-flex items-center px-1.5 py-0.5 text-xs rounded border ${STATUS_STYLES[event.status ?? 'PLANNED']}`}>
              {STATUS_LABELS[event.status ?? 'PLANNED']}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-0.5 flex-wrap">
            <span className="text-xs text-gray-500">
              {format(parseISO(event.startTime), 'HH:mm')}
              {event.endTime && ` – ${format(parseISO(event.endTime), 'HH:mm')}`}
            </span>
            {duration && <span className="text-xs text-gray-400">{duration}</span>}
            {event.location && (
              <span className="flex items-center gap-0.5 text-xs text-gray-400">
                <MapPin size={10} /> {event.location}
              </span>
            )}
            {event.reminderMinutesBefore && (
              <span className="flex items-center gap-0.5 text-xs text-gray-400">
                <Bell size={10} /> {REMINDER_OPTIONS.find(r => r.value === event.reminderMinutesBefore)?.label ?? `${event.reminderMinutesBefore} dk`}
              </span>
            )}
          </div>
          {event.description && (
            <p className="text-xs text-gray-400 mt-1 line-clamp-2">{event.description}</p>
          )}
          {/* Durum aksiyon butonları — sadece PLANNED etkinlikler için */}
          {event.status === 'PLANNED' && (
            <div className="flex gap-1.5 mt-2">
              <button
                onClick={() => handleUpdateStatus(event.id, 'COMPLETED')}
                disabled={statusUpdating === event.id}
                className="flex items-center gap-1 px-2 py-0.5 text-xs rounded-md bg-green-50 text-green-700 hover:bg-green-100 border border-green-100 transition-colors cursor-pointer disabled:opacity-50"
              >
                <CheckCircle2 size={11} /> Tamamlandı
              </button>
              <button
                onClick={() => handleUpdateStatus(event.id, 'CANCELLED')}
                disabled={statusUpdating === event.id}
                className="flex items-center gap-1 px-2 py-0.5 text-xs rounded-md bg-gray-50 text-gray-500 hover:bg-gray-100 border border-gray-200 transition-colors cursor-pointer disabled:opacity-50"
              >
                <XCircle size={11} /> İptal
              </button>
            </div>
          )}
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <button
            onClick={(e) => handleOpenEdit(event, e)}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-primary-600 transition-colors cursor-pointer"
            title="Düzenle"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setDeleteEventId(event.id); }}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-red-500 transition-colors cursor-pointer"
            title="Sil"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    );
  };



  return (
    <div className="space-y-6">
      <PageOnboarding
        pageId="calendar"
        title="Takvime Hoş Geldiniz"
        description="Çocuğunuzun terapi, randevu ve etkinliklerini düzenli bir şekilde planlayın."
        steps={[
          { icon: <Plus size={20} />, title: "Etkinlik Ekle", description: "Doktor, eğitim veya özel etkinlikleri renk kodlarıyla takvime işleyin." },
          { icon: <CalendarIcon size={20} />, title: "Günlük Görünüm", description: "Bir güne tıklayarak o günün etkinliklerini listeleyin." },
        ]}
      />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Takvim</h1>
          <p className="text-gray-500 mt-1">Terapi, randevu ve aktivitelerinizi takip edin</p>
        </div>
        <Button onClick={handleOpenModal}>
          <Plus size={18} className="mr-2" /> Etkinlik Ekle
        </Button>
      </div>

      {error && !showModal && (
        <div className="p-3 bg-red-50 text-red-700 text-sm rounded-xl border border-red-100">{error}</div>
      )}

      {children.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {children.map(child => (
            <button
              key={child.id}
              onClick={() => setSelectedChild(child)}
              className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all cursor-pointer ${
                selectedChild?.id === child.id
                  ? 'bg-primary-600 text-white'
                  : 'bg-white text-gray-600 border border-gray-200 hover:border-primary-300'
              }`}
            >
              {child.name}
            </button>
          ))}
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Takvim */}
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <button onClick={() => setCurrentMonth(m => subMonths(m, 1))} className="p-2 rounded-xl hover:bg-gray-100 cursor-pointer">
              <ChevronLeft size={20} />
            </button>
            <h2 className="text-lg font-semibold text-gray-900">
              {format(currentMonth, 'MMMM yyyy', { locale: tr })}
            </h2>
            <button onClick={() => setCurrentMonth(m => addMonths(m, 1))} className="p-2 rounded-xl hover:bg-gray-100 cursor-pointer">
              <ChevronRight size={20} />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1">
            {['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'].map(d => (
              <div key={d} className="text-center text-xs font-medium text-gray-400 py-2">{d}</div>
            ))}
            {emptyDays.map((_, i) => <div key={`e-${i}`} />)}
            {days.map(day => {
              const dayEvts = getEventsForDay(day);
              const isSelected = selectedDate && isSameDay(day, selectedDate);
              const hasCompleted = dayEvts.some(e => e.status === 'COMPLETED');
              const hasCancelled = dayEvts.some(e => e.status === 'CANCELLED');
              const hasPlanned  = dayEvts.some(e => e.status === 'PLANNED' || !e.status);
              return (
                <button
                  key={day.toISOString()}
                  onClick={() => setSelectedDate(day)}
                  className={`p-2 rounded-xl text-sm transition-all cursor-pointer min-h-[48px] flex flex-col items-center ${
                    isSelected ? 'bg-primary-600 text-white' :
                    isToday(day) ? 'bg-primary-50 text-primary-700 font-bold' :
                    'hover:bg-gray-50'
                  }`}
                >
                  <span>{format(day, 'd')}</span>
                  {dayEvts.length > 0 && (
                    <div className="flex gap-0.5 mt-1">
                      {hasPlanned  && <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: isSelected ? 'white' : '#4F46E5' }} />}
                      {hasCompleted && <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: isSelected ? 'white' : '#059669' }} />}
                      {hasCancelled && <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: isSelected ? 'white' : '#9CA3AF' }} />}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </Card>

        {/* Günlük detay veya yaklaşan etkinlikler */}
        <Card>
          {selectedDate ? (
            <>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{format(selectedDate, 'd MMMM yyyy', { locale: tr })}</CardTitle>
                  <button
                    onClick={() => setSelectedDate(null)}
                    className="text-xs text-gray-400 hover:text-gray-600 cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
              </CardHeader>

              {/* Durum filtresi */}
              {getEventsForDay(selectedDate).length > 0 && (
                <div className="flex gap-1 mb-3 flex-wrap">
                  {['ALL', 'PLANNED', 'COMPLETED', 'CANCELLED'].map(s => (
                    <button
                      key={s}
                      onClick={() => setFilterStatus(s)}
                      className={`px-2 py-0.5 text-xs rounded-full border transition-colors cursor-pointer ${
                        filterStatus === s ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <ListFilter size={10} className="inline mr-0.5" />
                      {s === 'ALL' ? 'Tümü' : STATUS_LABELS[s]}
                    </button>
                  ))}
                </div>
              )}

              {dayEvents.length === 0 ? (
                <EmptyState
                  icon={<CalendarIcon size={24} />}
                  title="Etkinlik yok"
                  description="Bu tarihte etkinlik bulunmuyor"
                />
              ) : (
                <div className="space-y-2">
                  {dayEvents
                    .sort((a, b) => a.startTime.localeCompare(b.startTime))
                    .map(event => <EventCard key={event.id} event={event} />)}
                </div>
              )}
            </>
          ) : (
            <>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Clock size={16} className="text-primary-500" />
                  <CardTitle>Yaklaşan Etkinlikler</CardTitle>
                </div>
              </CardHeader>
              {upcomingEvents.length === 0 ? (
                <EmptyState
                  icon={<CalendarIcon size={24} />}
                  title="Etkinlik yok"
                  description="Yaklaşan planlanmış etkinlik bulunmuyor"
                />
              ) : (
                <div className="space-y-2">
                  {upcomingEvents.map(event => (
                    <div
                      key={event.id}
                      onClick={() => setSelectedDate(parseISO(event.startTime))}
                      className="flex items-start gap-2.5 p-2.5 rounded-xl hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <div className="w-1 rounded-full min-h-[36px] shrink-0 mt-0.5" style={{ backgroundColor: typeInfo(event.eventType).color }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{event.title}</p>
                        <p className="text-xs text-gray-500">
                          {format(parseISO(event.startTime), 'd MMM, HH:mm', { locale: tr })}
                        </p>
                        {event.childName && <p className="text-xs text-gray-400">{event.childName}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </Card>
      </div>

      {/* Oluştur Modalı */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Yeni Etkinlik">
        <div className="space-y-4">
          <FormFields f={form} setF={setForm} error={error} applyDuration={applyDuration} form={form} />
          <div className="flex gap-3 pt-1">
            <Button variant="outline" onClick={() => setShowModal(false)} className="flex-1">İptal</Button>
            <Button
              onClick={handleCreate}
              loading={loading}
              className="flex-1 text-white"
              style={{ backgroundColor: eventTypes.find(t => t.value === form.eventType)?.color }}
            >
              Oluştur
            </Button>
          </div>
        </div>
      </Modal>

      {/* Düzenle Modalı */}
      <Modal isOpen={!!editingEvent} onClose={() => setEditingEvent(null)} title="Etkinliği Düzenle">
        <div className="space-y-4">
          <FormFields f={editForm} setF={setEditForm} error={editError} applyDuration={applyDuration} form={form} />
          <div className="flex gap-3 pt-1">
            <Button variant="outline" onClick={() => setEditingEvent(null)} className="flex-1">İptal</Button>
            <Button
              onClick={handleUpdate}
              loading={editLoading}
              className="flex-1 text-white"
              style={{ backgroundColor: eventTypes.find(t => t.value === editForm.eventType)?.color }}
            >
              Güncelle
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmModal
        isOpen={!!deleteEventId}
        title="Etkinliği sil?"
        message="Bu etkinlik kalıcı olarak silinecek."
        confirmLabel="Evet, sil"
        onConfirm={() => deleteEventId && handleDelete(deleteEventId)}
        onCancel={() => setDeleteEventId(null)}
      />
    </div>
  );
}
