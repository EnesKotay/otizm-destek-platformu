import { Send, ShieldCheck, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';

export interface BuddyRequestDraft {
  receiverId: string;
  isMentor: boolean;
  displayName: string;
  context: 'match' | 'nearby';
}

interface BuddyRequestModalProps {
  draft: BuddyRequestDraft | null;
  message: string;
  sending: boolean;
  onClose: () => void;
  onMessageChange: (value: string) => void;
  onSend: () => void;
}

export function BuddyRequestModal({
  draft,
  message,
  sending,
  onClose,
  onMessageChange,
  onSend,
}: BuddyRequestModalProps) {
  return (
    <Modal
      isOpen={!!draft}
      onClose={onClose}
      title={draft?.isMentor ? 'Mentorluk İsteği Gönder' : 'Buddy İsteği Gönder'}
    >
      {draft && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-4">
            <div className="flex items-start gap-3">
              <ShieldCheck size={18} className="mt-0.5 shrink-0 text-indigo-650" />
              <div>
                <p className="text-sm font-bold text-slate-900">{draft.displayName}</p>
                <p className="mt-1 text-xs leading-relaxed text-slate-600">
                  İlk temas notu karşı tarafa gelen istek kartında gösterilir. Telefon, adres veya hassas bilgi paylaşmadan önce güvenli bir mesajlaşma başlatmanız önerilir.
                </p>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-2">
              Kişisel tanışma notu
            </label>
            <textarea
              value={message}
              onChange={event => onMessageChange(event.target.value.slice(0, 500))}
              rows={5}
              className="w-full resize-none rounded-2xl border border-slate-200 px-3 py-3 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Kısa, güvenli ve saygılı bir tanışma notu yazın."
            />
            <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
              <span>En az 20 karakter</span>
              <span>{message.trim().length}/500</span>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Güvenli iletişim hatırlatması</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-600">
              İlk konuşmada çocukların tam okul/ev adresi, özel sağlık dosyası veya acil iletişim bilgilerini paylaşmayın. Önce platform içi mesajlaşmayla ilerleyin.
            </p>
          </div>

          <div className="flex gap-3 pt-1">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={sending}
              className="flex-1 rounded-xl text-xs"
            >
              <X size={14} className="mr-1" /> İptal
            </Button>
            <Button
              onClick={onSend}
              loading={sending}
              disabled={message.trim().length < 20}
              className="flex-1 rounded-xl text-xs"
            >
              <Send size={14} className="mr-1" /> Gönder
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
