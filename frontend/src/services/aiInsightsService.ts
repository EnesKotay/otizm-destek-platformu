import api from './api';

export type AnalysisType = 'GENERAL' | 'BEHAVIORAL' | 'PROGRESS' | 'WEEKLY' | 'DAILY_COACH';

export const aiInsightsService = {
  getInsights: (childId: string, type: AnalysisType = 'GENERAL') =>
    api.get<{ success: boolean; data: string }>(`/ai-insights/${childId}`, { params: { type } }).then(r => r.data.data),

  streamInsights: (
    childId: string,
    type: AnalysisType = 'GENERAL',
    onChunk: (text: string) => void,
    onDone: () => void,
    onError: (err: string) => void,
  ): EventSource => {
    const base = (api.defaults.baseURL ?? '').replace(/\/$/, '');
    const url = `${base}/ai-insights/${childId}/stream?type=${type}`;
    const es = new EventSource(url, { withCredentials: true });

    es.addEventListener('chunk', (e: MessageEvent) => onChunk(e.data as string));
    es.addEventListener('done', () => { es.close(); onDone(); });
    es.addEventListener('error', (e: MessageEvent) => {
      es.close();
      onError((e as MessageEvent).data ?? 'Bağlantı hatası');
    });
    es.onerror = () => { es.close(); onError('Bağlantı kesildi'); };

    return es;
  },
};
