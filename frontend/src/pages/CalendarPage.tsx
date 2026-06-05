import { useEffect, useState } from 'react';
import { Calendar as CalendarIcon, Plus, ChevronLeft, ChevronRight, Pencil, Trash2, Brain, Stethoscope, BookOpen, Activity, Tag } from 'lucide-react';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { TextArea } from '@/components/ui/TextArea';
import { Modal } from '@/components/ui/Modal';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageOnboarding } from '@/components/ui/PageOnboarding';
import { useChildStore } from '@/store/childStore';
import { childService } from '@/services/childService';
import { calendarService } from '@/services/calendarService';
import { formatDateTime } from '@/utils/date';
import { toast } from '@/store/toastStore';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, isToday, parseISO } from 'date-fns';
import { tr } from 'date-fns/locale';
import type { CalendarEvent } from '@/types';

const eventTypes = [
  { value: 'TERAPI', label: 'Terapi', color: '#4F46E5', bgLight: '#EEF2FF', icon: Brain },
  { value: 'DOKTOR', label: 'Doktor', color: '#059669', bgLight: '#ECFDF5', icon: Stethoscope },
  { value: 'EGITIM', label: 'Eğitim', color: '#D97706', bgLight: '#FFFBEB', icon: BookOpen },
  { value: 'AKTIVITE', label: 'Aktivite', color: '#DC2626', bgLight: '#FEF2F2', icon: Activity },
  { value: 'DIGER', label: 'Diğer', color: '#6B7280', bgLight: '#F9FAFB', icon: Tag },
];

const DURATIONS = [
  { label: '30 dk', minutes: 30 },
  { label: '1 saat', minutes: 60 },
  { label: '1.5 saat', minutes: 90 },
  { label: '2 saat', minutes: 120 },
];

const emptyForm = { title: '', description: '', eventType: 'TERAPI', startTime: '', endTime: '', color: '#4F46E5' };

export function CalendarPage() {
  const { children, setChildren, selectedChild, setSelectedChild } = useChildStore();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm });

  // Edit state
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [editForm, setEditForm] = useState({ ...emptyForm });
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [deleteEventId, setDeleteEventId] = useState<string | null>(null);

  useEffect(() => {
    childService.getAll().then(data => {
      setChildren(data);
      if (data.length > 0 && !selectedChild) setSelectedChild(data[0]);
    }).catch(() => {});
  }, [setChildren, setSelectedChild, selectedChild]);

  useEffect(() => {
    if (selectedChild) {
      calendarService.getByChild(selectedChild.id).then(setEvents).catch(() => {});
    }
  }, [selectedChild]);

  const days = eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) });
  const startDayOfWeek = startOfMonth(currentMonth).getDay();
  const emptyDays = Array(startDayOfWeek === 0 ? 6 : startDayOfWeek - 1).fill(null);

  const getEventsForDay = (day: Date) =>
    events.filter(e => isSameDay(parseISO(e.startTime), day));

  const dayEvents = selectedDate ? getEventsForDay(selectedDate) : [];

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

  const handleCreate = async () => {
    setError(null);
    if (!selectedChild) { setError('Lütfen bir çocuk profili seçin.'); return; }
    if (!form.title || !form.startTime) { setError('Lütfen başlık ve başlangıç tarihini girin.'); return; }

    const startTimeWithSeconds = form.startTime.length === 16 ? `${form.startTime}:00` : form.startTime;
    const endTimeWithSeconds = form.endTime && form.endTime.length === 16 ? `${form.endTime}:00` : form.endTime;

    setLoading(true);
    try {
      const event = await calendarService.create({
        ...form,
        startTime: startTimeWithSeconds,
        endTime: endTimeWithSeconds,
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
    });
  };

  const handleUpdate = async () => {
    if (!editingEvent) return;
    setEditError(null);
    if (!editForm.title || !editForm.startTime) { setEditError('Başlık ve başlangıç tarihi zorunludur.'); return; }

    const startTimeWithSeconds = editForm.startTime.length === 16 ? `${editForm.startTime}:00` : editForm.startTime;
    const endTimeWithSeconds = editForm.endTime && editForm.endTime.length === 16 ? `${editForm.endTime}:00` : editForm.endTime;

    setEditLoading(true);
    try {
      const updated = await calendarService.update(editingEvent.id, {
        ...editForm,
        startTime: startTimeWithSeconds,
        endTime: endTimeWithSeconds,
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

  const handleDelete = async (eventId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      await calendarService.delete(eventId);
      setEvents(prev => prev.filter(ev => ev.id !== eventId));
      toast.success('Etkinlik silindi.');
    } catch { toast.error('Etkinlik silinemedi.'); }
    setDeleteEventId(null);
  };

  return (
    <div className="space-y-6">
      <PageOnboarding
        pageId="calendar"
        title="Takvime Hoş Geldiniz"
        description="Çocuğunuzun terapi, randevu ve etkinliklerini düzenli bir şekilde planlayın."
        steps={[
          {
            icon: <Plus size={20} />,
            title: "Etkinlik Ekle",
            description: "Doktor, eğitim veya özel etkinlikleri renk kodlarıyla takvime işleyin."
          },
          {
            icon: <CalendarIcon size={20} />,
            title: "Günlük Görünüm",
            description: "Bir güne tıklayarak o günün detaylarını ve saatlerini listeleyin."
          }
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
        <div className="p-3 bg-red-50 text-red-700 text-sm rounded-xl border border-red-100">
          {error}
        </div>
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
                      {dayEvts.slice(0, 3).map(e => (
                        <div key={e.id} className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: isSelected ? 'white' : (e.color || '#4F46E5') }} />
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              {selectedDate ? format(selectedDate, 'd MMMM yyyy', { locale: tr }) : 'Etkinlikler'}
            </CardTitle>
          </CardHeader>
          {dayEvents.length === 0 ? (
            <EmptyState
              icon={<CalendarIcon size={24} />}
              title="Etkinlik yok"
              description={selectedDate ? 'Bu tarihte etkinlik bulunmuyor' : 'Bir gün seçin'}
            />
          ) : (
            <div className="space-y-3">
              {dayEvents.map(event => (
                <div key={event.id} className="group flex items-start gap-3 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
                  <div className="w-2 h-full rounded-full min-h-[40px] shrink-0" style={{ backgroundColor: event.color || '#4F46E5' }} />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 text-sm">{event.title}</p>
                    <p className="text-xs text-gray-500">{formatDateTime(event.startTime)}</p>
                    <Badge variant="info" className="mt-1">{event.eventType}</Badge>
                    {event.description && (
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">{event.description}</p>
                    )}
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <button
                      onClick={(e) => handleOpenEdit(event, e)}
                      className="p-1.5 rounded-lg hover:bg-white text-gray-400 hover:text-primary-600 transition-colors cursor-pointer"
                      title="Düzenle"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setDeleteEventId(event.id); }}
                      className="p-1.5 rounded-lg hover:bg-white text-gray-400 hover:text-red-500 transition-colors cursor-pointer"
                      title="Sil"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Oluştur Modalı */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Yeni Etkinlik">
        <div className="space-y-5">
          {/* Seçili tipin renk şeridi */}
          <div
            className="h-1 rounded-full transition-colors"
            style={{ backgroundColor: eventTypes.find(t => t.value === form.eventType)?.color }}
          />

          {error && (
            <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-100">{error}</div>
          )}

          {/* Etkinlik Tipi */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">Etkinlik Tipi</label>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {eventTypes.map(t => {
                const Icon = t.icon;
                const isSelected = form.eventType === t.value;
                return (
                  <button
                    key={t.value}
                    onClick={() => setForm(f => ({ ...f, eventType: t.value, color: t.color }))}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all cursor-pointer ${
                      isSelected ? '' : 'border-gray-100 bg-gray-50 hover:border-gray-200 text-gray-500'
                    }`}
                    style={isSelected ? { borderColor: t.color, backgroundColor: t.bgLight, color: t.color } : undefined}
                  >
                    <Icon size={18} />
                    <span className="text-xs font-medium leading-tight">{t.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <Input label="Başlık *" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Etkinlik adı" />
          <TextArea label="Açıklama" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} />

          <Input label="Başlangıç *" type="datetime-local" value={form.startTime} onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))} />

          <div>
            <Input label="Bitiş" type="datetime-local" value={form.endTime} onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))} />
            <div className="flex gap-2 mt-2">
              {DURATIONS.map(d => (
                <button
                  key={d.minutes}
                  onClick={() => applyDuration(d.minutes, 'create')}
                  className="px-2.5 py-1 text-xs rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors cursor-pointer"
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

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
        <div className="space-y-5">
          <div
            className="h-1 rounded-full transition-colors"
            style={{ backgroundColor: eventTypes.find(t => t.value === editForm.eventType)?.color }}
          />

          {editError && (
            <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-100">{editError}</div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">Etkinlik Tipi</label>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {eventTypes.map(t => {
                const Icon = t.icon;
                const isSelected = editForm.eventType === t.value;
                return (
                  <button
                    key={t.value}
                    onClick={() => setEditForm(f => ({ ...f, eventType: t.value, color: t.color }))}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all cursor-pointer ${
                      isSelected ? '' : 'border-gray-100 bg-gray-50 hover:border-gray-200 text-gray-500'
                    }`}
                    style={isSelected ? { borderColor: t.color, backgroundColor: t.bgLight, color: t.color } : undefined}
                  >
                    <Icon size={18} />
                    <span className="text-xs font-medium leading-tight">{t.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <Input label="Başlık *" value={editForm.title} onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))} />
          <TextArea label="Açıklama" value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} rows={3} />

          <Input label="Başlangıç *" type="datetime-local" value={editForm.startTime} onChange={e => setEditForm(f => ({ ...f, startTime: e.target.value }))} />

          <div>
            <Input label="Bitiş" type="datetime-local" value={editForm.endTime} onChange={e => setEditForm(f => ({ ...f, endTime: e.target.value }))} />
            <div className="flex gap-2 mt-2">
              {DURATIONS.map(d => (
                <button
                  key={d.minutes}
                  onClick={() => applyDuration(d.minutes, 'edit')}
                  className="px-2.5 py-1 text-xs rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors cursor-pointer"
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

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
