import api from './api';

export const reportService = {
  create: (targetType: string, targetId: string, reason: string) =>
    api.post('/reports', { targetType, targetId, reason }),
};
