import { useState } from 'react';
import { Users, ShieldCheck, MessageSquare, Plus, CheckCircle2, UserCheck, Tag, Send, AlertCircle } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { TextArea } from '@/components/ui/TextArea';
import { toast } from '@/store/toastStore';

export interface ConsultationItem {
  id: string;
  authorName: string;
  authorTitle: string; // e.g. "Çocuk Psikiyatristi", "Ergoterapist"
  title: string;
  content: string;
  category: string; // e.g. "Duyu Bütünleme", "İlaç & Medikal", "Konuşma Terapisi"
  createdAt: string;
  replies?: Array<{
    id: string;
    authorName: string;
    authorTitle: string;
    content: string;
    createdAt: string;
  }>;
}

interface InterdisciplinaryConsultationModalProps {
  isOpen: boolean;
  onClose: () => void;
  childName?: string;
  initialItems?: ConsultationItem[];
}

const MOCK_CONSULTATIONS: ConsultationItem[] = [
  {
    id: '1',
    authorName: 'Dr. Kemal Aydın',
    authorTitle: 'Çocuk Nöroloğu',
    title: 'Duyu hassasiyeti ve odaklanma süresi hakkında vaka notu',
    content: 'Son muayenede taktil ve işitsel duyu hassasiyetinde belirgin artış gözlendi. Ergoterapi seanslarında ağırlıklı battaniye ve fırçalama protokolü önerildi.',
    category: 'Ergoterapi / Duyu',
    createdAt: '21 Tem 2026 14:30',
    replies: [
      {
        id: 'r1',
        authorName: 'Psk. Elza Çelik',
        authorTitle: 'Uzman Klinik Psikolog',
        content: 'Oyun terapisinde işitsel uyararanlara tepki azaldı, ergoterapi protokolünü biz de klinikte destekliyoruz.',
        createdAt: '22 Tem 2026 10:15',
      },
    ],
  },
];

export function InterdisciplinaryConsultationModal({
  isOpen,
  onClose,
  childName = 'Çocuk',
  initialItems = MOCK_CONSULTATIONS,
}: InterdisciplinaryConsultationModalProps) {
  const [items, setItems] = useState<ConsultationItem[]>(initialItems);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('Ergoterapi / Duyu');
  const [newContent, setNewContent] = useState('');
  const [replyText, setReplyText] = useState<Record<string, string>>({});

  const handleCreateNote = () => {
    if (!newTitle.trim() || !newContent.trim()) {
      toast.error('Başlık ve vaka notu içeriği zorunludur.');
      return;
    }

    const newItem: ConsultationItem = {
      id: String(Date.now()),
      authorName: 'Dr. Ahmet Yılmaz',
      authorTitle: 'Çocuk Gelişim Uzmanı',
      title: newTitle.trim(),
      content: newContent.trim(),
      category: newCategory,
      createdAt: new Date().toLocaleString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }),
      replies: [],
    };

    setItems([newItem, ...items]);
    setNewTitle('');
    setNewContent('');
    setShowNewForm(false);
    toast.success('Vaka konsültasyon notu eklendi.');
  };

  const handleAddReply = (consultationId: string) => {
    const text = replyText[consultationId]?.trim();
    if (!text) return;

    setItems(prev => prev.map(item => {
      if (item.id !== consultationId) return item;
      const newReply = {
        id: String(Date.now()),
        authorName: 'Dr. Ahmet Yılmaz',
        authorTitle: 'Çocuk Gelişim Uzmanı',
        content: text,
        createdAt: new Date().toLocaleString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }),
      };
      return {
        ...item,
        replies: [...(item.replies || []), newReply],
      };
    }));

    setReplyText(prev => ({ ...prev, [consultationId]: '' }));
    toast.success('Yanıt eklendi.');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Disiplinlerarası Vaka Konsültasyonu — ${childName}`}
    >
      <div className="space-y-5 max-h-[75vh] overflow-y-auto pr-1">
        {/* Onay & Bilgi Kartı */}
        <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200/80 flex items-start gap-3">
          <ShieldCheck size={22} className="text-indigo-600 shrink-0 mt-0.5" />
          <div className="text-xs">
            <p className="font-extrabold text-indigo-950 flex items-center gap-1.5">
              Ebeveyn Onaylı Güvenli Konsültasyon Kanalı
            </p>
            <p className="text-indigo-700 font-medium mt-0.5 leading-relaxed">
              {childName} takibini yapan Çocuk Nörologları, Psikiyatristler, Ergoterapistler ve Özel Eğitim Uzmanları bu alanda vaka değerlendirmesi yapabilir.
            </p>
          </div>
        </div>

        {/* Aksiyon Butonu */}
        <div className="flex items-center justify-between">
          <p className="text-xs font-black uppercase tracking-wider text-slate-400">
            Klinik Vaka Notları ({items.length})
          </p>
          <Button
            type="button"
            size="sm"
            onClick={() => setShowNewForm(!showNewForm)}
            className="font-bold cursor-pointer"
          >
            <Plus size={15} />
            {showNewForm ? 'Kapat' : 'Vaka Notu Ekle'}
          </Button>
        </div>

        {/* Yeni Vaka Notu Formu */}
        {showNewForm && (
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3 animate-in fade-in duration-200">
            <p className="text-xs font-extrabold text-slate-900">Yeni Konsültasyon Notu OLUŞTUR</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <Input
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Not başlığı (Örn: Duyu bütünleme ilerlemesi)"
                  className="text-xs"
                />
              </div>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs font-bold bg-white text-slate-700 focus:ring-2 focus:ring-primary-500"
              >
                <option value="Ergoterapi / Duyu">Ergoterapi / Duyu</option>
                <option value="İlaç & Medikal">İlaç & Medikal</option>
                <option value="Dil & Konuşma">Dil & Konuşma</option>
                <option value="Özel Eğitim / BEP">Özel Eğitim / BEP</option>
              </select>
            </div>
            <TextArea
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              placeholder="Seans bulgularınız, klinik gözlemleriniz ve diğer uzmanlara önerileriniz..."
              rows={3}
              className="text-xs"
            />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setShowNewForm(false)}>
                İptal
              </Button>
              <Button type="button" size="sm" onClick={handleCreateNote} className="font-bold">
                Kaydet ve Gönder
              </Button>
            </div>
          </div>
        )}

        {/* Konsültasyon Liste */}
        <div className="space-y-4">
          {items.map((item) => (
            <div key={item.id} className="p-4 bg-white border border-slate-200/80 rounded-2xl shadow-sm space-y-3">
              <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-primary-100 text-primary-700 font-extrabold flex items-center justify-center text-xs shadow-sm">
                    {item.authorName.charAt(0)}
                  </div>
                  <div>
                    <p className="text-xs font-extrabold text-slate-900">{item.authorName}</p>
                    <p className="text-[11px] font-bold text-primary-600">{item.authorTitle}</p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="inline-block px-2.5 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-extrabold rounded-md">
                    {item.category}
                  </span>
                  <p className="text-[10px] font-medium text-slate-400 mt-1">{item.createdAt}</p>
                </div>
              </div>

              <div>
                <p className="text-xs font-extrabold text-slate-900 mb-1">{item.title}</p>
                <p className="text-xs text-slate-600 leading-relaxed font-medium">{item.content}</p>
              </div>

              {/* Yanıtlar */}
              {item.replies && item.replies.length > 0 && (
                <div className="pl-4 border-l-2 border-primary-200 space-y-2 mt-3 pt-2">
                  {item.replies.map((reply) => (
                    <div key={reply.id} className="p-2.5 bg-slate-50 rounded-xl text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-slate-900">{reply.authorName} ({reply.authorTitle})</span>
                        <span className="text-[10px] text-slate-400">{reply.createdAt}</span>
                      </div>
                      <p className="text-slate-600 font-medium">{reply.content}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Yanıt Ekleme Girdisi */}
              <div className="flex gap-2 pt-2">
                <Input
                  value={replyText[item.id] || ''}
                  onChange={(e) => setReplyText({ ...replyText, [item.id]: e.target.value })}
                  placeholder="Bu vaka notuna görüşünüzü yazın..."
                  onKeyDown={(e) => e.key === 'Enter' && handleAddReply(item.id)}
                  className="text-xs"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => handleAddReply(item.id)}
                  className="shrink-0 font-bold"
                >
                  <Send size={13} />
                  Yanıtla
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
}
