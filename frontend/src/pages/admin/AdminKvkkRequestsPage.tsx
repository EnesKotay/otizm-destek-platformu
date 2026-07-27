import { useEffect, useState } from 'react';
import { AlertTriangle, Scale } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { toast } from '@/store/toastStore';
import {
  KVKK_REQUEST_LABELS,
  kvkkService,
  type KvkkRequest,
  type KvkkRequestStatus,
} from '@/services/kvkkService';

const STATUS_OPTIONS: Array<{ value: KvkkRequestStatus; label: string }> = [
  { value: 'INCELENIYOR', label: 'İnceleniyor olarak işaretle' },
  { value: 'TAMAMLANDI', label: 'Tamamlandı' },
  { value: 'REDDEDILDI', label: 'Reddedildi' },
];

const daysLeft = (dueAt: string) =>
  Math.ceil((new Date(dueAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24));

/**
 * KVKK md. 13/2: başvurular en geç otuz gün içinde sonuçlandırılmalıdır.
 * Bu ekran, süresi yaklaşan ve geçmiş başvuruları öne çıkarır.
 */
export function AdminKvkkRequestsPage() {
  const [requests, setRequests] = useState<KvkkRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<KvkkRequest | null>(null);
  const [status, setStatus] = useState<KvkkRequestStatus>('TAMAMLANDI');
  const [response, setResponse] = useState('');
  const [saving, setSaving] = useState(false);

  const load = () => {
    kvkkService
      .openRequests()
      .then(setRequests)
      .catch(() => toast.error('Başvurular yüklenemedi.'))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleResolve = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await kvkkService.resolveRequest(selected.id, status, response.trim());
      toast.success('Başvuru güncellendi.');
      setSelected(null);
      setResponse('');
      load();
    } catch {
      toast.error('Başvuru güncellenemedi.');
    } finally {
      setSaving(false);
    }
  };

  const overdue = requests.filter(request => request.overdue);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="flex items-center gap-2 text-2xl font-black text-slate-900">
          <Scale size={24} aria-hidden="true" /> KVKK Başvuruları
        </h1>
        <p className="mt-1 text-sm font-semibold text-slate-500">
          İlgili kişi başvuruları yasal olarak en geç 30 gün içinde sonuçlandırılmalıdır.
        </p>
      </header>

      {overdue.length > 0 && (
        <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4">
          <AlertTriangle size={20} className="mt-0.5 shrink-0 text-rose-600" aria-hidden="true" />
          <p className="text-sm font-bold leading-6 text-rose-900">
            {overdue.length} başvurunun yasal yanıt süresi geçmiş. Gecikme, KVKK md. 18 kapsamında
            idari para cezasına konu olabilir.
          </p>
        </div>
      )}

      {loading ? (
        <p className="text-sm font-semibold text-slate-500">Yükleniyor…</p>
      ) : requests.length === 0 ? (
        <p className="rounded-2xl border border-slate-200 bg-white p-6 text-sm font-semibold text-slate-500">
          Bekleyen başvuru yok.
        </p>
      ) : (
        <div className="space-y-3">
          {requests.map(request => {
            const remaining = daysLeft(request.dueAt);
            return (
              <div
                key={request.id}
                className={`rounded-2xl border bg-white p-5 ${
                  request.overdue ? 'border-rose-200' : 'border-slate-200'
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-extrabold text-slate-900">
                      {KVKK_REQUEST_LABELS[request.requestType] ?? request.requestType}
                    </p>
                    <p className="mt-1 text-xs font-bold text-slate-500">
                      {request.contactEmail} ·{' '}
                      {new Date(request.createdAt).toLocaleDateString('tr-TR')} tarihinde alındı
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-lg border px-2.5 py-1 text-xs font-black ${
                      request.overdue
                        ? 'border-rose-200 bg-rose-100 text-rose-800'
                        : remaining <= 7
                          ? 'border-amber-200 bg-amber-50 text-amber-800'
                          : 'border-slate-200 bg-slate-50 text-slate-600'
                    }`}
                  >
                    {request.overdue ? 'SÜRE GEÇTİ' : `${remaining} gün kaldı`}
                  </span>
                </div>
                <p className="mt-3 whitespace-pre-wrap rounded-xl bg-slate-50 p-3 text-sm leading-6 text-slate-700">
                  {request.description}
                </p>
                <div className="mt-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelected(request);
                      setStatus('TAMAMLANDI');
                      setResponse('');
                    }}
                  >
                    Yanıtla
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal isOpen={Boolean(selected)} onClose={() => setSelected(null)} title="Başvuruyu Yanıtla">
        <div className="space-y-4">
          <div>
            <label htmlFor="dsr-status" className="mb-1 block text-sm font-semibold text-slate-700">
              Sonuç
            </label>
            <select
              id="dsr-status"
              value={status}
              onChange={event => setStatus(event.target.value as KvkkRequestStatus)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            >
              {STATUS_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="dsr-response" className="mb-1 block text-sm font-semibold text-slate-700">
              İlgili kişiye iletilecek yanıt
            </label>
            <textarea
              id="dsr-response"
              rows={5}
              value={response}
              onChange={event => setResponse(event.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setSelected(null)} className="flex-1">
              İptal
            </Button>
            <Button onClick={handleResolve} loading={saving} className="flex-1">
              Kaydet
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
