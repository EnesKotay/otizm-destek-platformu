import api from './api';
import type { ApiResponse, User } from '@/types';

export type KvkkRequestType =
  | 'BILGI_TALEBI'
  | 'DUZELTME'
  | 'SILME'
  | 'AKTARIM_BILGISI'
  | 'ISLEMEYE_ITIRAZ'
  | 'ZARARIN_GIDERILMESI';

export type KvkkRequestStatus = 'ACIK' | 'INCELENIYOR' | 'TAMAMLANDI' | 'REDDEDILDI';

export interface KvkkRequest {
  id: string;
  requestType: KvkkRequestType;
  status: KvkkRequestStatus;
  contactEmail: string;
  description: string;
  response: string | null;
  dueAt: string;
  resolvedAt: string | null;
  createdAt: string;
  overdue: boolean;
}

export interface ConsentHistoryEntry {
  consentType: string;
  granted: boolean;
  policyVersion: string;
  source: string | null;
  createdAt: string;
}

export interface ConsentOverview {
  current: Record<string, boolean>;
  policyVersion: string;
  acceptedPolicyVersion: string | null;
  requiresReconsent: boolean;
  history: ConsentHistoryEntry[];
}

export const KVKK_REQUEST_LABELS: Record<KvkkRequestType, string> = {
  BILGI_TALEBI: 'Verilerimin işlenip işlenmediğini öğrenmek istiyorum',
  DUZELTME: 'Eksik veya yanlış işlenen verimin düzeltilmesini istiyorum',
  SILME: 'Verilerimin silinmesini / yok edilmesini istiyorum',
  AKTARIM_BILGISI: 'Verilerimin aktarıldığı üçüncü kişileri öğrenmek istiyorum',
  ISLEMEYE_ITIRAZ: 'Otomatik analiz sonucu aleyhime çıkan sonuca itiraz ediyorum',
  ZARARIN_GIDERILMESI: 'Uğradığım zararın giderilmesini talep ediyorum',
};

export const CONSENT_LABELS: Record<string, string> = {
  KVKK_AYDINLATMA: 'Aydınlatma metni onayı',
  AI_ANALIZ: 'Yapay zekâ analizi (yurt dışına aktarım)',
  ACIL_DURUM_KARTI: 'Acil durum kartı paylaşımı',
  ESLESTIRME: 'Benzer aile eşleştirmesi',
  PAZARLAMA_ILETISIMI: 'Bilgilendirme e-postaları',
};

export const kvkkService = {
  getConsents: () =>
    api.get<ApiResponse<ConsentOverview>>('/users/me/consents').then(r => r.data.data),

  setConsent: (type: string, consent: boolean) =>
    api
      .post<ApiResponse<User>>(`/users/me/consents/${type}?consent=${consent}`)
      .then(r => r.data.data),

  reconsent: () =>
    api.post<ApiResponse<User>>('/users/me/consents/reconsent').then(r => r.data.data),

  createRequest: (payload: {
    requestType: KvkkRequestType;
    description: string;
    contactEmail?: string;
  }) => api.post<ApiResponse<KvkkRequest>>('/kvkk/requests', payload).then(r => r.data.data),

  myRequests: () =>
    api.get<ApiResponse<KvkkRequest[]>>('/kvkk/requests').then(r => r.data.data),

  // Yönetici
  openRequests: () =>
    api.get<ApiResponse<KvkkRequest[]>>('/kvkk/requests/admin/open').then(r => r.data.data),

  resolveRequest: (id: string, status: KvkkRequestStatus, response: string) =>
    api
      .post<ApiResponse<KvkkRequest>>(`/kvkk/requests/admin/${id}/resolve`, { status, response })
      .then(r => r.data.data),
};
