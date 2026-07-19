import api from './api';

export const uploadService = {
  upload: async (
    file: File,
    visibility: 'PRIVATE' | 'AUTHENTICATED' = 'PRIVATE',
    scope?: { type: 'CHILD_PROFILE' | 'CHILD_NOTES' | 'CONVERSATION'; id: string },
  ): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    // Content-Type'ı elle SET ETME — Axios boundary'yi otomatik ekler.
    // Manuel set edilince "multipart/form-data" boundary olmadan gider ve backend parse edemez.
    const res = await api.post<{ data: { url: string } }>('/upload', formData, {
      params: { visibility, scopeType: scope?.type, scopeId: scope?.id },
      headers: { 'Content-Type': undefined },
    });
    return res.data.data.url;
  },
};
