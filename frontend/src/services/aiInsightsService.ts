import api from './api';

export const aiInsightsService = {
  getInsights: (childId: string) => api.get<{ success: boolean; data: string }>(`/ai-insights/${childId}`).then(r => r.data.data),
};
