import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FileText, Plus, Smile, Meh, Frown, Pencil, Trash2, Search, X, Zap, Camera, ImageIcon } from 'lucide-react';
import { DatePicker } from '@/components/ui/DatePicker';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { TextArea } from '@/components/ui/TextArea';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageOnboarding } from '@/components/ui/PageOnboarding';
import { useChildStore } from '@/store/childStore';
import { childService } from '@/services/childService';
import { noteService } from '@/services/noteService';
import { uploadService } from '@/services/uploadService';
import { formatDate } from '@/utils/date';
import type { DevelopmentNote } from '@/types';
import { toast } from '@/store/toastStore';

const categories = ['Dil Gelişimi', 'Sosyal Beceri', 'Motor Gelişim', 'Davranış', 'Eğitim', 'Genel'];

const CATEGORY_STYLE: Record<string, { active: string; inactive: string }> = {
  'Dil Gelişimi':  { active: 'bg-blue-500 text-white',   inactive: 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-100' },
  'Sosyal Beceri': { active: 'bg-green-500 text-white',  inactive: 'bg-green-50 text-green-700 hover:bg-green-100 border border-green-100' },
  'Motor Gelişim': { active: 'bg-orange-500 text-white', inactive: 'bg-orange-50 text-orange-700 hover:bg-orange-100 border border-orange-100' },
  'Davranış':      { active: 'bg-purple-500 text-white', inactive: 'bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-100' },
  'Eğitim':        { active: 'bg-teal-500 text-white',   inactive: 'bg-teal-50 text-teal-700 hover:bg-teal-100 border border-teal-100' },
  'Genel':         { active: 'bg-gray-500 text-white',   inactive: 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200' },
};

const QUICK_TEMPLATES = [
  { label: '👁️ Göz teması',    title: 'İlk kez göz teması kurdu',        category: 'Sosyal Beceri', mood: 'happy'   },
  { label: '🗣️ Yeni kelime',    title: 'Yeni bir kelime söyledi',          category: 'Dil Gelişimi',  mood: 'happy'   },
  { label: '🤝 Sosyal oyun',    title: 'Arkadaşıyla sosyal oyun oynadı',  category: 'Sosyal Beceri', mood: 'happy'   },
  { label: '🎯 Terapi seanı',   title: 'Terapi seansı iyi geçti',         category: 'Eğitim',        mood: 'happy'   },
  { label: '😣 Duyusal güçlük', title: 'Duyusal hassasiyet gözlemlendi',  category: 'Davranış',      mood: 'neutral' },
  { label: '😔 Zor gün',        title: 'Zor bir gün geçirdik',             category: 'Genel',         mood: 'sad'     },
];

const moods = [
  { value: 'happy',   icon: Smile, label: 'Mutlu',   color: 'text-green-500',  ring: 'ring-green-400',  bg: 'bg-green-50'  },
  { value: 'neutral', icon: Meh,   label: 'Normal',  color: 'text-yellow-500', ring: 'ring-yellow-400', bg: 'bg-yellow-50' },
  { value: 'sad',     icon: Frown, label: 'Zor Gün', color: 'text-red-500',    ring: 'ring-red-400',    bg: 'bg-red-50'    },
];

const emptyForm = { title: '', content: '', category: '', mood: '', noteDate: new Date().toISOString().split('T')[0], imageUrl: '' };

const MOCK_NOTES: DevelopmentNote[] = [
  {
    id: 'mock-1',
    childId: 'mock-child',
    title: 'Göz teması kurarak oyun istedi',
    content: 'Bugün legoları birleştirirken gözlerimin içine bakıp gülümsedi ve parçayı vermemi istedi. Bu normalde çok az karşılaştığımız ve bizi çok mutlu eden bir ilerleme.',
    category: 'Sosyal Beceri',
    mood: 'happy',
    noteDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'mock-2',
    childId: 'mock-child',
    title: 'Duyusal hassasiyet (Elektrik süpürgesi)',
    content: 'Evde elektrik süpürgesi çalışınca kulaklarını kapatarak odasına kaçtı. Hemen rutin bir mola verip sakinleştirici oyuncaklarıyla oynamasına alan açtık.',
    category: 'Davranış',
    mood: 'neutral',
    noteDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'mock-3',
    childId: 'mock-child',
    title: 'Yeni kelime kullanımı (Masa)',
    content: 'Mutfaktayken parmağıyla işaret ederek net bir şekilde "masa" kelimesini kullandı. Dil terapisi hedeflerimiz arasında nesneleri adlandırma vardı, çok başarılı bir deneme.',
    category: 'Dil Gelişimi',
    mood: 'happy',
    noteDate: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
  }
];

export function NotesPage() {
  const { children, setChildren, selectedChild, setSelectedChild } = useChildStore();
  const [notes, setNotes] = useState<DevelopmentNote[]>([]);
  const [demoMode, setDemoMode] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    if (notes.length > 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDemoMode(false);
    }
  }, [notes]);

  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });

  // Edit state
  const [editingNote, setEditingNote] = useState<DevelopmentNote | null>(null);
  const [editForm, setEditForm] = useState({ ...emptyForm });
  const [editLoading, setEditLoading] = useState(false);

  // Delete confirm
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Search + filter
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterMood, setFilterMood] = useState('');

  // Pagination
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    childService.getAll().then(data => {
      setChildren(data);
      if (data.length > 0 && !selectedChild) setSelectedChild(data[0]);
    }).catch(() => {});
  }, [setChildren, setSelectedChild, selectedChild]);

  useEffect(() => {
    if (searchParams.get('open') !== '1' || children.length === 0) return;
    const category = searchParams.get('category');
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (category) setForm(f => ({ ...f, category }));
    setShowModal(true);
    setSearchParams(prev => {
      prev.delete('open');
      prev.delete('category');
      return prev;
    }, { replace: true });
  }, [searchParams, children.length, setSearchParams]);

  useEffect(() => {
    if (selectedChild) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPage(0);
      noteService.getByChild(selectedChild.id, 0).then(data => {
        setNotes(data.content);
        setTotalPages(data.totalPages);
      }).catch(() => {});
    }
  }, [selectedChild]);

  const handleLoadMore = async () => {
    if (!selectedChild || loadingMore) return;
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const data = await noteService.getByChild(selectedChild.id, nextPage);
      setNotes(prev => [...prev, ...data.content]);
      setPage(nextPage);
      setTotalPages(data.totalPages);
    } catch { /* ignore */ }
    setLoadingMore(false);
  };

  const handlePhotoUpload = async (file: File, target: 'form' | 'edit') => {
    if (!selectedChild) return;
    setUploadingPhoto(true);
    try {
      const url = await uploadService.upload(file, 'PRIVATE', { type: 'CHILD_NOTES', id: selectedChild.id });
      if (target === 'form') setForm(f => ({ ...f, imageUrl: url }));
      else setEditForm(f => ({ ...f, imageUrl: url }));
      toast.success('Fotoğraf yüklendi.');
    } catch { toast.error('Fotoğraf yüklenemedi.'); }
    setUploadingPhoto(false);
  };

  const handleCreate = async () => {
    if (!form.title || !selectedChild) return;
    setLoading(true);
    try {
      const note = await noteService.create({ ...form, noteDate: form.noteDate.slice(0, 10), childId: selectedChild.id });
      setNotes(prev => [note, ...prev]);
      setShowModal(false);
      setForm({ ...emptyForm });
      toast.success('Not kaydedildi.');
    } catch { toast.error('Not oluşturulamadı.'); }
    setLoading(false);
  };

  const handleOpenEdit = (note: DevelopmentNote) => {
    setEditingNote(note);
    setEditForm({
      title: note.title,
      content: note.content || '',
      category: note.category || '',
      mood: note.mood || '',
      noteDate: note.noteDate,
      imageUrl: note.imageUrl || '',
    });
  };

  const handleUpdate = async () => {
    if (!editingNote) return;
    setEditLoading(true);
    try {
      const updated = await noteService.update(editingNote.id, { ...editForm, noteDate: editForm.noteDate.slice(0, 10), childId: editingNote.childId });
      setNotes(prev => prev.map(n => n.id === updated.id ? updated : n));
      setEditingNote(null);
      toast.success('Not güncellendi.');
    } catch { toast.error('Not güncellenemedi.'); }
    setEditLoading(false);
  };

  const handleDeleteConfirmed = async () => {
    if (!deletingId) return;
    try {
      await noteService.delete(deletingId);
      setNotes(prev => prev.filter(n => n.id !== deletingId));
      toast.success('Not silindi.');
    } catch { toast.error('Not silinemedi.'); }
    setDeletingId(null);
  };

  const displayNotes = demoMode ? MOCK_NOTES : notes;

  const filteredNotes = displayNotes.filter(note => {
    const matchSearch = !search ||
      note.title.toLowerCase().includes(search.toLowerCase()) ||
      (note.content || '').toLowerCase().includes(search.toLowerCase());
    const matchCategory = !filterCategory || note.category === filterCategory;
    const matchMood = !filterMood || note.mood === filterMood;
    return matchSearch && matchCategory && matchMood;
  });

  const hasFilter = !!search || !!filterCategory || !!filterMood;

  return (
    <div className="space-y-6">
      <PageOnboarding
        pageId="notes"
        title="Notlarınızı Buraya Yazın"
        description="Çocuğunuzla ilgili aklınıza gelen her şeyi buraya yazabilirsiniz. Uzun yazmak zorunda değilsiniz, tek cümle bile yeterli."
        steps={[
          {
            icon: <Plus size={20} />,
            title: "Not Ekle",
            description: "Ne gördüğünüzü, ne hissettiğinizi kısaca yazın. Hazır şablonlar da var, onları da kullanabilirsiniz."
          },
          {
            icon: <Smile size={20} />,
            title: "Ruh Halini İşaretle",
            description: "Bugün nasıl geçti? Bir emoji seçerek günü kayıt altına alın."
          },
          {
            icon: <ImageIcon size={20} />,
            title: "Fotoğraf Ekle",
            description: "Güzel bir an olduysa fotoğraf da ekleyebilirsiniz."
          }
        ]}
      />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notlarım</h1>
          <p className="text-gray-500 mt-1">Çocuğunuzla ilgili gözlemleriniz ve notlarınız</p>
        </div>
        <Button onClick={() => setShowModal(true)} disabled={children.length === 0}>
          <Plus size={18} className="mr-2" /> Not Ekle
        </Button>
      </div>

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

      {notes.length > 0 && (
        <div className="space-y-3">
          {/* Arama */}
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Notlarda ara..."
              className="w-full pl-9 pr-9 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer">
                <X size={14} className="text-gray-400" />
              </button>
            )}
          </div>
          {/* Kategori filtresi */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilterCategory('')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${!filterCategory ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              Tümü
            </button>
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setFilterCategory(filterCategory === cat ? '' : cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${filterCategory === cat ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                {cat}
              </button>
            ))}
            {/* Ruh hali filtresi */}
            {moods.map(({ value, icon: Icon, color }) => (
              <button
                key={value}
                onClick={() => setFilterMood(filterMood === value ? '' : value)}
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${filterMood === value ? 'bg-primary-50 ring-2 ring-primary-400' : 'bg-gray-100 hover:bg-gray-200'}`}
              >
                <Icon size={16} className={color} />
              </button>
            ))}
          </div>
        </div>
      )}

      {demoMode && (
        <div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 px-5 py-4 flex items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-indigo-100 text-indigo-600 mt-0.5 shrink-0">
              <Zap size={16} />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800">Şu an örnek (demo) verileri görüntülüyorsunuz.</p>
              <p className="text-xs text-slate-500 mt-0.5 font-medium">Kendi gelişim notunuzu eklediğinizde bu veriler gizlenecektir.</p>
            </div>
          </div>
          <button
            onClick={() => setDemoMode(false)}
            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-white border border-indigo-150 rounded-xl px-4 py-2 hover:shadow-sm transition-all active:scale-95 cursor-pointer"
          >
            Demo Modunu Kapat
          </button>
        </div>
      )}

      {displayNotes.length === 0 ? (
        <EmptyState
          icon={<FileText size={32} />}
          title="Henüz gelişim notu yok"
          description="Bugün çocuğunuzla ilgili küçük bir gözlemi kaydedin; uzun yazmak zorunda değilsiniz."
          steps={['Ne oldu?', 'Öncesinde ne vardı?', 'Sonrasında ne işe yaradı?']}
          action={
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button onClick={() => setShowModal(true)}>İlk Notu Ekle</Button>
              <Button variant="outline" onClick={() => setDemoMode(true)}>Örnek Verileri Keşfet (Demo)</Button>
            </div>
          }
        />
      ) : filteredNotes.length === 0 ? (
        <EmptyState
          icon={<Search size={32} />}
          title="Sonuç bulunamadı"
          description={hasFilter ? 'Filtreleri temizleyerek tüm notları görün' : ''}
          action={hasFilter ? <Button variant="outline" onClick={() => { setSearch(''); setFilterCategory(''); setFilterMood(''); }}>Filtreleri Temizle</Button> : undefined}
        />
      ) : (
        <div className="space-y-3">
          {filteredNotes.map(note => (
            <Card key={note.id} className="p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <h3 className="font-bold text-slate-900 text-[18px]">{note.title}</h3>
                    {note.category && <span className="text-[12px] font-bold text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md">{note.category}</span>}
                    {note.mood && (
                      <span className="text-2xl">
                        {note.mood === 'happy' ? '😊' : note.mood === 'sad' ? '😢' : '😐'}
                      </span>
                    )}
                  </div>
                  {note.content && <p className="text-[15px] font-medium text-slate-600 leading-relaxed mt-2">{note.content}</p>}
                  {note.imageUrl && (
                    <img src={note.imageUrl} alt="Not görseli" className="mt-4 h-32 rounded-2xl object-cover border border-slate-200 shadow-sm" />
                  )}
                  <p className="text-[13px] font-bold text-slate-400 mt-4 tracking-wide uppercase">{formatDate(note.noteDate)}</p>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <button
                    onClick={() => handleOpenEdit(note)}
                    className="p-2 rounded-lg bg-slate-50 text-slate-400 hover:text-slate-800 hover:bg-slate-200 border border-slate-100 transition-colors cursor-pointer shadow-sm"
                    title="Düzenle"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    onClick={() => setDeletingId(note.id)}
                    className="p-2 rounded-lg bg-white text-slate-400 hover:text-red-500 hover:bg-red-50 border border-transparent transition-colors cursor-pointer"
                    title="Sil"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </Card>
          ))}
          {!hasFilter && page < totalPages - 1 && (
            <div className="flex justify-center pt-2">
              <Button variant="outline" onClick={handleLoadMore} loading={loadingMore}>
                Daha Fazla Yükle
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Yeni Not Modalı */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Yeni Gelişim Notu">
        <NoteForm
          form={form}
          setForm={setForm}
          onSave={handleCreate}
          onCancel={() => setShowModal(false)}
          loading={loading}
          saveLabel="Kaydet"
          onPhotoUpload={f => handlePhotoUpload(f, 'form')}
          uploadingPhoto={uploadingPhoto}
        />
      </Modal>

      {/* Düzenle Modalı */}
      <Modal isOpen={!!editingNote} onClose={() => setEditingNote(null)} title="Notu Düzenle">
        <NoteForm
          form={editForm}
          setForm={setEditForm}
          onSave={handleUpdate}
          onCancel={() => setEditingNote(null)}
          loading={editLoading}
          saveLabel="Güncelle"
          onPhotoUpload={f => handlePhotoUpload(f, 'edit')}
          uploadingPhoto={uploadingPhoto}
        />
      </Modal>

      {/* Silme Onay Modalı */}
      <Modal isOpen={!!deletingId} onClose={() => setDeletingId(null)} title="Notu Sil">
        <div className="space-y-4">
          <p className="text-sm text-gray-700">Bu notu silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.</p>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setDeletingId(null)} className="flex-1">İptal</Button>
            <Button variant="danger" onClick={handleDeleteConfirmed} className="flex-1">Sil</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

type NoteFormData = { title: string; content: string; category: string; mood: string; noteDate: string; imageUrl: string };

function NoteForm({
  form, setForm, onSave, onCancel, loading, saveLabel, onPhotoUpload, uploadingPhoto,
}: {
  form: NoteFormData;
  setForm: React.Dispatch<React.SetStateAction<NoteFormData>>;
  onSave: () => void;
  onCancel: () => void;
  loading: boolean;
  saveLabel: string;
  onPhotoUpload?: (file: File) => void;
  uploadingPhoto?: boolean;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const maxContent = 1000;

  const applyTemplate = (t: typeof QUICK_TEMPLATES[0]) => {
    setForm(f => ({ ...f, title: t.title, category: t.category, mood: t.mood }));
  };

  return (
    <div className="space-y-4">
      {/* Hızlı Şablonlar — her zaman görünür renkli panel */}
      <div className="bg-primary-50 border border-primary-100 rounded-2xl p-3">
        <p className="flex items-center gap-1.5 text-xs font-semibold text-primary-700 mb-2">
          <Zap size={13} /> Hızlı Şablon
        </p>
        <div className="grid grid-cols-2 gap-1.5">
          {QUICK_TEMPLATES.map(t => (
            <button
              key={t.label}
              type="button"
              onClick={() => applyTemplate(t)}
              className="text-left px-3 py-2 rounded-xl bg-white hover:bg-primary-100 text-xs font-medium text-gray-700 hover:text-primary-700 transition-all cursor-pointer border border-primary-100 hover:border-primary-300 shadow-sm"
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <Input
        label="Başlık *"
        value={form.title}
        onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
        placeholder="Örn: İlk kez göz teması kurdu"
      />

      {/* Detay + karakter sayacı */}
      <div>
        <TextArea
          label="Detay"
          value={form.content}
          onChange={e => setForm(f => ({ ...f, content: e.target.value.slice(0, maxContent) }))}
          placeholder="Gözlemlerinizi yazın..."
        />
        <p className={`text-right text-xs mt-1 ${form.content.length >= maxContent ? 'text-red-400' : 'text-gray-400'}`}>
          {form.content.length}/{maxContent}
        </p>
      </div>

      {/* Renkli kategori butonları */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Kategori</label>
        <div className="flex flex-wrap gap-2">
          {categories.map(cat => {
            const style = CATEGORY_STYLE[cat] || CATEGORY_STYLE['Genel'];
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setForm(f => ({ ...f, category: f.category === cat ? '' : cat }))}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                  form.category === cat ? style.active : style.inactive
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* Ruh hali — daha geniş ve belirgin */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Bugün nasıl geçti?</label>
        <div className="flex gap-3">
          {moods.map(({ value, icon: Icon, label, color, ring, bg }) => (
            <button
              key={value}
              type="button"
              onClick={() => setForm(f => ({ ...f, mood: f.mood === value ? '' : value }))}
              className={`flex-1 flex flex-col items-center gap-1.5 py-3 rounded-xl transition-all cursor-pointer border ${
                form.mood === value
                  ? `${bg} ring-2 ${ring} border-transparent shadow-sm`
                  : 'bg-gray-50 hover:bg-gray-100 border-gray-100'
              }`}
            >
              <Icon size={28} className={color} />
              <span className="text-xs font-medium text-gray-700">{label}</span>
            </button>
          ))}
        </div>
      </div>

      <DatePicker
        label="Tarih"
        value={form.noteDate}
        onChange={date => setForm(f => ({ ...f, noteDate: date }))}
        showTime
      />

      {/* Fotoğraf yükleme */}
      {onPhotoUpload && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Fotoğraf (isteğe bağlı)</label>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={e => {
              const file = e.target.files?.[0];
              if (file) onPhotoUpload(file);
            }}
          />
          {form.imageUrl ? (
            <div className="relative inline-block">
              <img src={form.imageUrl} alt="Not görseli" className="h-32 rounded-xl object-cover border border-gray-200" />
              <button
                type="button"
                onClick={() => setForm(f => ({ ...f, imageUrl: '' }))}
                className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center cursor-pointer"
              >
                <X size={12} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploadingPhoto}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-gray-300 text-sm text-gray-500 hover:border-indigo-400 hover:text-indigo-600 transition-colors cursor-pointer"
            >
              {uploadingPhoto ? <><Camera size={16} className="animate-pulse" /> Yükleniyor...</> : <><ImageIcon size={16} /> Fotoğraf Ekle</>}
            </button>
          )}
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <Button variant="outline" onClick={onCancel} className="flex-1">İptal</Button>
        <Button onClick={onSave} loading={loading} className="flex-1">{saveLabel}</Button>
      </div>
    </div>
  );
}
