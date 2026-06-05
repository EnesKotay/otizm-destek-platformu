import { useState } from 'react';
import { Flag } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { reportService } from '@/services/reportService';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetType: string;
  targetId: string;
}

export function ReportModal({ isOpen, onClose, targetType, targetId }: ReportModalProps) {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!reason.trim()) return;
    setLoading(true);
    try {
      await reportService.create(targetType, targetId, reason);
      setSubmitted(true);
      setTimeout(() => {
        onClose();
        setSubmitted(false);
        setReason('');
      }, 1500);
    } catch { /* ignore */ }
    setLoading(false);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="İçeriği Şikayet Et">
      {submitted ? (
        <div className="text-center py-6">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <Flag size={24} className="text-green-600" />
          </div>
          <p className="font-medium text-gray-900">Şikayetiniz alındı</p>
          <p className="text-sm text-gray-500 mt-1">Ekibimiz inceleyecektir.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Bu içeriği neden şikayet etmek istediğinizi açıklayın. Ekibimiz en kısa sürede inceleyecektir.
          </p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Şikayet Nedeni</label>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              rows={4}
              placeholder="Lütfen şikayet nedeninizi açıklayın..."
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
            />
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose} className="flex-1">İptal</Button>
            <Button
              onClick={handleSubmit}
              loading={loading}
              disabled={!reason.trim()}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white border-red-600"
            >
              <Flag size={16} className="mr-2" />
              Şikayet Et
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
