import { useEffect, useState, useMemo } from 'react';
import { Plus, Trash2, School, User, GraduationCap, MessageSquare, ChevronDown, ChevronUp, Search, X, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { useChildStore } from '@/store/childStore';
import { childService } from '@/services/childService';
import { schoolDiaryService } from '@/services/schoolDiaryService';
import { toast } from '@/store/toastStore';
import { PageOnboarding } from '@/components/ui/PageOnboarding';

export interface DiaryEntry {
  id: string;
  childId: string;
  date: string;
  from: 'parent' | 'teacher' | 'expert' | 'therapist';
  fromName: string;
  category: string;
  content: string;
  replies: DiaryReply[];
  createdAt: string;
}

export interface DiaryReply {
  id: string;
  from: 'parent' | 'teacher' | 'expert' | 'therapist';
  fromName: string;
  content: string;
  createdAt: string;
}

const FROM_CONFIG = {
  parent:    { label: 'Aile',     color: 'bg-blue-100 text-blue-700',   icon: User },
  teacher:   { label: 'Öğretmen', color: 'bg-green-100 text-green-700', icon: School },
  expert:    { label: 'Uzman',    color: 'bg-purple-100 text-purple-700', icon: GraduationCap },
  therapist: { label: 'Terapist', color: 'bg-orange-100 text-orange-700', icon: MessageSquare },
};

const CATEGORIES = [
  'Genel Gözlem', 'Davranış', 'Akademik Gelişim', 'Sosyal Etkileşim',
  'İletişim', 'Öz Bakım', 'Duyusal', 'Sağlık', 'Ev Ödevi', 'Diğer',
];

const CATEGORY_COLORS: Record<string, string> = {
  'Genel Gözlem': 'bg-gray-100 text-gray-600',
  'Davranış': 'bg-red-100 text-red-600',
  'Akademik Gelişim': 'bg-blue-100 text-blue-600',
  'Sosyal Etkileşim': 'bg-green-100 text-green-600',
  'İletişim': 'bg-purple-100 text-purple-600',
  'Öz Bakım': 'bg-pink-100 text-pink-600',
  'Duyusal': 'bg-yellow-100 text-yellow-600',
  'Sağlık': 'bg-teal-100 text-teal-600',
  'Ev Ödevi': 'bg-orange-100 text-orange-600',
  'Diğer': 'bg-slate-100 text-slate-600',
};

function parseReplies(raw: string | DiaryReply[]): DiaryReply[] {
  if (Array.isArray(raw)) return raw;
  try { return JSON.parse(raw as string); } catch { return []; }
}

const EMPTY_FORM: { date: string; from: DiaryEntry['from']; fromName: string; category: string; content: string } = { date: new Date().toISOString().split('T')[0], from: 'parent', fromName: '', category: 'Genel Gözlem', content: '' };
const EMPTY_REPLY: { from: DiaryReply['from']; fromName: string; content: string } = { from: 'parent', fromName: '', content: '' };

export function SchoolDiaryPage() {
  const { children, setChildren, selectedChild, setSelectedChild } = useChildStore();
  const selectedChildId = selectedChild?.id ?? '';
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState<DiaryEntry | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [filterFrom, setFilterFrom] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [replyingId, setReplyingId] = useState<string | null>(null);
  const [replyForm, setReplyForm] = useState({ ...EMPTY_REPLY });

  useEffect(() => {
    if (!children.length) childService.getAll().then(setChildren).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedChild && children.length) setSelectedChild(children[0]);
  }, [children, selectedChild, setSelectedChild]);

  useEffect(() => {
    if (!selectedChildId) return;
    schoolDiaryService.getAll(selectedChildId).then(data =>
      setEntries(data.map(e => ({ ...e, from: e.fromRole as DiaryEntry['from'], replies: parseReplies(e.replies) })))
    ).catch(() => {});
  }, [selectedChildId]);

  const openAdd = () => {
    setEditingEntry(null);
    setForm({ ...EMPTY_FORM });
    setShowModal(true);
  };

  const openEdit = (e: DiaryEntry) => {
    setEditingEntry(e);
    setForm({ date: e.date, from: e.from, fromName: e.fromName, category: e.category, content: e.content });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.content.trim() || !form.fromName.trim()) {
      toast.error('Gönderen adı ve içerik zorunludur.'); return;
    }
    try {
      const created = await schoolDiaryService.create(selectedChildId, { ...form, from: form.from });
      const entry: DiaryEntry = { ...created, from: created.fromRole as DiaryEntry['from'], replies: [] };
      setEntries(prev => [entry, ...prev].sort((a, b) => b.date.localeCompare(a.date)));
      setShowModal(false);
      toast.success('Not eklendi.');
    } catch { toast.error('Kaydedilemedi.'); }
  };

  const handleDelete = async (id: string) => {
    try {
      await schoolDiaryService.delete(id);
      setEntries(prev => prev.filter(e => e.id !== id));
      setDeleteId(null);
      toast.success('Not silindi.');
    } catch { toast.error('Silinemedi.'); }
  };

  const handleReply = async (entryId: string) => {
    if (!replyForm.content.trim() || !replyForm.fromName.trim()) {
      toast.error('Ad ve içerik zorunlu.'); return;
    }
    try {
      const updated = await schoolDiaryService.addReply(entryId, replyForm);
      setEntries(prev => prev.map(e => e.id === entryId ? { ...e, replies: parseReplies(updated.replies) } : e));
      setReplyingId(null); setReplyForm({ ...EMPTY_REPLY });
      toast.success('Yanıt eklendi.');
    } catch { toast.error('Yanıt eklenemedi.'); }
  };

  const filtered = useMemo(() => entries.filter(e => {
    const q = search.toLowerCase();
    const matchSearch = !q || e.content.toLowerCase().includes(q) || e.fromName.toLowerCase().includes(q) || e.category.toLowerCase().includes(q);
    const matchCat = !filterCat || e.category === filterCat;
    const matchFrom = !filterFrom || e.from === filterFrom;
    return matchSearch && matchCat && matchFrom;
  }), [entries, search, filterCat, filterFrom]);

  const groupedByDate = useMemo(() => {
    const groups: Record<string, DiaryEntry[]> = {};
    filtered.forEach(e => {
      if (!groups[e.date]) groups[e.date] = [];
      groups[e.date].push(e);
    });
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filtered]);


  return (
    <div className="space-y-6">
      <PageOnboarding
        pageId="school-diary"
        title="Okul İletişim Defterine Hoş Geldiniz"
        description="Öğretmenler, uzmanlar ve aile arasında güvenli ve hızlı iletişim kurun."
        steps={[
          {
            icon: <MessageSquare size={20} />,
            title: "Gözlemlerinizi Paylaşın",
            description: "Evdeki veya okuldaki önemli gelişmeleri ve notları deftere ekleyin."
          },
          {
            icon: <School size={20} />,
            title: "Öğretmenlerle İletişim",
            description: "Okulda olan biteni takip edin ve öğretmenlerin notlarına yanıt verin."
          },
          {
            icon: <GraduationCap size={20} />,
            title: "Uzman Görüşleri",
            description: "Terapistlerin ve uzmanların önerilerini tek bir yerde toplayın."
          }
        ]}
      />

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Okul İletişim Defteri</h1>
          <p className="text-gray-500 mt-1">Aile ↔ Öğretmen ↔ Uzman günlük iletişim kaydı</p>
        </div>
        <Button onClick={openAdd}><Plus size={15} className="mr-1" />Not Ekle</Button>
      </div>

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

      {!selectedChildId ? (
        <EmptyState icon={<School size={28} />} title="Çocuk profili bulunamadı" description="Önce Çocuklarım sayfasından profil ekleyin." />
      ) : (
        <>
          {/* Stats */}
          {entries.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {(Object.entries(FROM_CONFIG) as [keyof typeof FROM_CONFIG, typeof FROM_CONFIG[keyof typeof FROM_CONFIG]][]).map(([key, cfg]) => {
                const count = entries.filter(e => e.from === key).length;
                return (
                  <div key={key} className="bg-white rounded-xl border border-gray-100 p-3 text-center">
                    <p className="text-2xl font-bold text-gray-800">{count}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{cfg.label} notu</p>
                  </div>
                );
              })}
            </div>
          )}

          {/* Filters */}
          <div className="flex gap-2 flex-wrap">
            <div className="relative flex-1 min-w-40">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Not ara..."
                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            </div>
            <select value={filterCat} onChange={e => setFilterCat(e.target.value)}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none bg-white">
              <option value="">Tüm Kategoriler</option>
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
            <select value={filterFrom} onChange={e => setFilterFrom(e.target.value)}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none bg-white">
              <option value="">Tüm Gönderenler</option>
              {Object.entries(FROM_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            {(search || filterCat || filterFrom) && (
              <button onClick={() => { setSearch(''); setFilterCat(''); setFilterFrom(''); }}
                className="flex items-center gap-1 px-3 py-2 text-sm text-gray-500 hover:text-red-500 cursor-pointer">
                <X size={14} />Temizle
              </button>
            )}
          </div>

          {filtered.length === 0 ? (
            <EmptyState icon={<MessageSquare size={28} />}
              title="Not bulunamadı"
              description={entries.length === 0 ? `${selectedChild?.name} için henüz not eklenmedi.` : 'Kritere uygun not yok.'}
              action={entries.length === 0 ? <Button onClick={openAdd}><Plus size={14} className="mr-1" />İlk Notu Ekle</Button> : undefined} />
          ) : (
            <div className="space-y-6">
              {groupedByDate.map(([date, dayEntries]) => (
                <div key={date}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="h-px flex-1 bg-gray-200" />
                    <span className="text-sm font-semibold text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                      {new Date(date + 'T12:00:00').toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    </span>
                    <div className="h-px flex-1 bg-gray-200" />
                  </div>

                  <div className="space-y-3">
                    {dayEntries.map(entry => {
                      const fc = FROM_CONFIG[entry.from];
                      const Icon = fc.icon;
                      const catColor = CATEGORY_COLORS[entry.category] ?? 'bg-gray-100 text-gray-600';
                      const isExpanded = expandedId === entry.id;

                      return (
                        <div key={entry.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                          <div className="p-4">
                            <div className="flex items-start gap-3">
                              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${fc.color}`}>
                                <Icon size={16} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap mb-1">
                                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${fc.color}`}>{entry.fromName} ({fc.label})</span>
                                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${catColor}`}>{entry.category}</span>
                                </div>
                                <p className="text-sm text-gray-800 leading-relaxed">{entry.content}</p>
                                {entry.replies.length > 0 && (
                                  <button onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                                    className="mt-2 text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer">
                                    {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                                    {entry.replies.length} yanıt
                                  </button>
                                )}
                              </div>
                              <div className="flex gap-1 shrink-0">
                                <button onClick={() => openEdit(entry)} className="p-1.5 rounded-lg hover:bg-indigo-50 text-gray-400 hover:text-indigo-600 cursor-pointer"><Pencil size={13} /></button>
                                <button onClick={() => setDeleteId(entry.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 cursor-pointer"><Trash2 size={13} /></button>
                              </div>
                            </div>

                            {/* Replies */}
                            {isExpanded && entry.replies.map(reply => {
                              const rfc = FROM_CONFIG[reply.from];
                              const RIcon = rfc.icon;
                              return (
                                <div key={reply.id} className="mt-3 ml-12 pl-3 border-l-2 border-gray-200">
                                  <div className="flex items-start gap-2">
                                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${rfc.color}`}>
                                      <RIcon size={13} />
                                    </div>
                                    <div>
                                      <span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded-full ${rfc.color}`}>{reply.fromName}</span>
                                      <p className="text-sm text-gray-700 mt-0.5">{reply.content}</p>
                                      <p className="text-[10px] text-gray-400 mt-0.5">{new Date(reply.createdAt).toLocaleString('tr-TR')}</p>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}

                            {/* Reply form */}
                            {replyingId === entry.id ? (
                              <div className="mt-3 ml-12 pl-3 border-l-2 border-indigo-200 space-y-2">
                                <div className="flex gap-2">
                                  <select value={replyForm.from} onChange={e => setReplyForm(f => ({ ...f, from: e.target.value as DiaryReply['from'] }))}
                                    className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none bg-white">
                                    {Object.entries(FROM_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                                  </select>
                                  <input value={replyForm.fromName} onChange={e => setReplyForm(f => ({ ...f, fromName: e.target.value }))}
                                    placeholder="Adınız..." className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none" />
                                </div>
                                <textarea value={replyForm.content} onChange={e => setReplyForm(f => ({ ...f, content: e.target.value }))}
                                  rows={2} placeholder="Yanıtınızı yazın..."
                                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none resize-none" />
                                <div className="flex gap-2">
                                  <Button size="sm" onClick={() => handleReply(entry.id)}>Gönder</Button>
                                  <Button size="sm" variant="outline" onClick={() => setReplyingId(null)}>İptal</Button>
                                </div>
                              </div>
                            ) : (
                              <button onClick={() => { setReplyingId(entry.id); setReplyForm({ ...EMPTY_REPLY }); }}
                                className="mt-2 ml-12 text-xs text-gray-500 hover:text-indigo-600 cursor-pointer flex items-center gap-1">
                                <MessageSquare size={11} />Yanıt ekle
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editingEntry ? 'Notu Düzenle' : 'Yeni Not Ekle'}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tarih</label>
            <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Gönderen Tipi *</label>
              <select value={form.from} onChange={e => setForm(f => ({ ...f, from: e.target.value as DiaryEntry['from'] }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white">
                {Object.entries(FROM_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Adınız *</label>
              <input value={form.fromName} onChange={e => setForm(f => ({ ...f, fromName: e.target.value }))}
                placeholder="Örn: Ayşe Öğretmen"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Kategori</label>
            <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white">
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Not İçeriği *</label>
            <textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
              rows={5} placeholder="Bugünkü gözleminizi, gelişmeleri veya iletmek istediklerinizi yazın..."
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none" />
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setShowModal(false)} className="flex-1">İptal</Button>
            <Button onClick={handleSave} className="flex-1">Kaydet</Button>
          </div>
        </div>
      </Modal>

      <ConfirmModal isOpen={!!deleteId} title="Notu sil?" message="Bu not kalıcı olarak silinecek."
        confirmLabel="Evet, sil" variant="danger"
        onConfirm={() => deleteId && handleDelete(deleteId)} onCancel={() => setDeleteId(null)} />
    </div>
  );
}
