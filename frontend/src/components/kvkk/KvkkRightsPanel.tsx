import { useEffect, useState } from 'react';
import { FileText, History, Scale, Send } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { toast } from '@/store/toastStore';
import {
  CONSENT_LABELS,
  KVKK_REQUEST_LABELS,
  kvkkService,
  type ConsentOverview,
  type KvkkRequest,
  type KvkkRequestType,
} from '@/services/kvkkService';

const STATUS_LABELS: Record<string, string> = {
  ACIK: 'Alındı',
  INCELENIYOR: 'İnceleniyor',
  TAMAMLANDI: 'Tamamlandı',
  REDDEDILDI: 'Reddedildi',
};

const STATUS_STYLES: Record<string, string> = {
  ACIK: 'bg-blue-50 text-blue-700 border-blue-100',
  INCELENIYOR: 'bg-amber-50 text-amber-700 border-amber-100',
  TAMAMLANDI: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  REDDEDILDI: 'bg-rose-50 text-rose-700 border-rose-100',
};

const formatDate = (value: string) => new Date(value).toLocaleDateString('tr-TR');

/**
 * KVKK md. 11 haklarının kullanıldığı panel: başvuru gönderme, başvuru
 * durumunu izleme ve rıza geçmişini görme.
 */
export function KvkkRightsPanel() {
  const [overview, setOverview] = useState<ConsentOverview | null>(null);
  const [requests, setRequests] = useState<KvkkRequest[]>([]);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [requestType, setRequestType] = useState<KvkkRequestType>('BILGI_TALEBI');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = () => {
    kvkkService.getConsents().then(setOverview).catch(() => {});
    kvkkService.myRequests().then(setRequests).catch(() => {});
  };

  useEffect(load, []);

  const handleSubmit = async () => {
    if (!description.trim()) {
      toast.error('Lütfen talebinizi açıklayın.');
      return;
    }
    setSubmitting(true);
    try {
      await kvkkService.createRequest({ requestType, description: description.trim() });
      toast.success('Başvurunuz alındı. En geç 30 gün içinde yanıtlanacaktır.');
      setShowRequestModal(false);
      setDescription('');
      setRequests(await kvkkService.myRequests());
    } catch {
      toast.error('Başvuru gönderilemedi.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <div className="flex items-start gap-3">
          <Scale size={18} className="mt-0.5 shrink-0 text-slate-500" aria-hidden="true" />
          <div className="text-sm leading-6 text-slate-600">
            <p className="font-bold text-slate-900">KVKK md. 11 haklarınız</p>
            <p className="mt-1">
              Verilerinizin işlenip işlenmediğini öğrenme, düzeltilmesini veya silinmesini isteme,
              aktarıldığı üçüncü kişileri bilme ve otomatik analiz sonuçlarına itiraz etme hakkınız var.
              Başvurularınız en geç <strong>30 gün</strong> içinde yanıtlanır.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Button variant="outline" onClick={() => setShowRequestModal(true)} className="w-full">
          <FileText size={16} className="mr-2" aria-hidden="true" /> KVKK Başvurusu Yap
        </Button>
        <Button variant="outline" onClick={() => setShowHistory(true)} className="w-full">
          <History size={16} className="mr-2" aria-hidden="true" /> Rıza Geçmişim
        </Button>
      </div>

      {requests.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-extrabold uppercase tracking-wide text-slate-600">Başvurularım</p>
          {requests.map(request => (
            <div key={request.id} className="rounded-xl border border-slate-200 bg-white p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-bold text-slate-800">
                  {KVKK_REQUEST_LABELS[request.requestType] ?? request.requestType}
                </p>
                <span
                  className={`rounded-lg border px-2 py-0.5 text-xs font-bold ${
                    STATUS_STYLES[request.status] ?? 'border-slate-100 bg-slate-50 text-slate-600'
                  }`}
                >
                  {STATUS_LABELS[request.status] ?? request.status}
                </span>
              </div>
              <p className="mt-1 text-xs font-semibold text-slate-500">
                {formatDate(request.createdAt)} tarihinde alındı · yanıt son tarihi {formatDate(request.dueAt)}
              </p>
              {request.response && (
                <p className="mt-2 rounded-lg bg-slate-50 p-2 text-sm leading-6 text-slate-700">
                  {request.response}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={showRequestModal} onClose={() => setShowRequestModal(false)} title="KVKK Başvurusu">
        <div className="space-y-4">
          <div>
            <label htmlFor="kvkk-request-type" className="mb-1 block text-sm font-semibold text-slate-700">
              Talebiniz
            </label>
            <select
              id="kvkk-request-type"
              value={requestType}
              onChange={event => setRequestType(event.target.value as KvkkRequestType)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              {Object.entries(KVKK_REQUEST_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="kvkk-request-desc" className="mb-1 block text-sm font-semibold text-slate-700">
              Açıklama
            </label>
            <textarea
              id="kvkk-request-desc"
              rows={5}
              value={description}
              onChange={event => setDescription(event.target.value)}
              maxLength={4000}
              placeholder="Talebinizi mümkün olduğunca açık biçimde anlatın."
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
          <p className="rounded-xl bg-blue-50 p-3 text-xs leading-5 text-blue-800">
            Başvurunuz hesabınızın e-posta adresi üzerinden yanıtlanır. Yanıt süresi yasal olarak
            en fazla 30 gündür.
          </p>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setShowRequestModal(false)} className="flex-1">
              İptal
            </Button>
            <Button onClick={handleSubmit} loading={submitting} className="flex-1">
              <Send size={16} className="mr-2" aria-hidden="true" /> Gönder
            </Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={showHistory} onClose={() => setShowHistory(false)} title="Rıza Geçmişim" size="lg">
        <div className="space-y-3">
          <p className="text-sm leading-6 text-slate-600">
            Verdiğiniz ve geri aldığınız her rıza, hangi aydınlatma metni sürümüne verildiğiyle
            birlikte kayıt altındadır. Bu kayıtlar silinmez.
          </p>
          {overview && overview.history.length > 0 ? (
            <div className="max-h-80 space-y-2 overflow-y-auto">
              {overview.history.map((entry, index) => (
                <div
                  key={`${entry.consentType}-${entry.createdAt}-${index}`}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 p-3"
                >
                  <div>
                    <p className="text-sm font-bold text-slate-800">
                      {CONSENT_LABELS[entry.consentType] ?? entry.consentType}
                    </p>
                    <p className="text-xs font-semibold text-slate-500">
                      {new Date(entry.createdAt).toLocaleString('tr-TR')} · metin sürümü {entry.policyVersion}
                    </p>
                  </div>
                  <span
                    className={`rounded-lg border px-2 py-0.5 text-xs font-bold ${
                      entry.granted
                        ? 'border-emerald-100 bg-emerald-50 text-emerald-700'
                        : 'border-rose-100 bg-rose-50 text-rose-700'
                    }`}
                  >
                    {entry.granted ? 'Rıza verildi' : 'Rıza geri alındı'}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">Henüz kayıt yok.</p>
          )}
        </div>
      </Modal>
    </div>
  );
}
