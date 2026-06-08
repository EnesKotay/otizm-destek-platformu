import api from './api';
import type { ApiResponse, Conversation, Message } from '@/types';

export const messagingService = {
  // ── Konuşma Listesi ──────────────────────────────────────────────────────────
  getConversations: (params?: { search?: string; archived?: boolean }) => {
    const cleanParams = params ? Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined)) : undefined;
    return api.get<ApiResponse<Conversation[]>>('/messages/conversations', Object.keys(cleanParams || {}).length > 0 ? { params: cleanParams } : undefined).then(r => r.data.data);
  },

  // ── Birebir Konuşma ─────────────────────────────────────────────────────────
  getOrCreateDirect: (userId: string) =>
    api.post<ApiResponse<Conversation>>(`/messages/conversations/direct/${userId}`).then(r => r.data.data),

  // ── Grup Konuşması Oluştur ───────────────────────────────────────────────────
  createGroup: (title: string, participantIds: string[]) =>
    api.post<ApiResponse<Conversation>>('/messages/conversations/group', { title, participantIds }).then(r => r.data.data),

  // ── Groups sayfasına ait konuşma ─────────────────────────────────────────────
  getOrCreateGroup: (groupId: string) =>
    api.post<ApiResponse<Conversation>>(`/messages/conversations/group/${groupId}`).then(r => r.data.data),

  // ── Mesajlar ────────────────────────────────────────────────────────────────
  getMessages: (conversationId: string, page = 0, size = 50) =>
    api.get<ApiResponse<{ content: Message[]; totalPages: number }>>(
      `/messages/conversations/${conversationId}?page=${page}&size=${size}`
    ).then(r => r.data.data),

  searchMessages: (conversationId: string, q: string, page = 0, size = 50) =>
    api.get<ApiResponse<{ content: Message[]; totalPages: number }>>(
      `/messages/conversations/${conversationId}/search?q=${encodeURIComponent(q)}&page=${page}&size=${size}`
    ).then(r => r.data.data),

  // ── Mesaj Gönder ────────────────────────────────────────────────────────────
  sendMessage: (
    conversationId: string,
    content: string,
    file?: { fileUrl: string; fileName: string; fileType: string },
    replyToId?: string,
    messageType?: string,
  ) =>
    api.post<ApiResponse<Message>>(`/messages/conversations/${conversationId}`, {
      content,
      ...(file ?? {}),
      ...(replyToId ? { replyToId } : {}),
      ...(messageType ? { messageType } : {}),
    }).then(r => r.data.data),

  // ── Okundu İşaretle ─────────────────────────────────────────────────────────
  markAsRead: (conversationId: string) =>
    api.post(`/messages/conversations/${conversationId}/read`),

  // ── Sessize Al ──────────────────────────────────────────────────────────────
  muteConversation: (conversationId: string, muted: boolean) =>
    api.post(`/messages/conversations/${conversationId}/mute`, { muted }),

  // ── Arşivle ─────────────────────────────────────────────────────────────────
  archiveConversation: (conversationId: string, archived: boolean) =>
    api.post(`/messages/conversations/${conversationId}/archive`, { archived }),

  // ── Emoji Reaksiyon ─────────────────────────────────────────────────────────
  toggleReaction: (messageId: string, emoji: string) =>
    api.post<ApiResponse<Message>>(`/messages/${messageId}/react`, { emoji }).then(r => r.data.data),

  // ── Okunmamış Sayısı ────────────────────────────────────────────────────────
  getUnreadCount: () =>
    api.get<ApiResponse<number>>('/messages/unread-count').then(r => r.data.data),

  // ── Grup Üye Ekle ───────────────────────────────────────────────────────────
  addMember: (conversationId: string, userId: string) =>
    api.post<ApiResponse<Conversation>>(`/messages/conversations/${conversationId}/members/${userId}`).then(r => r.data.data),

  // ── Grup Üye Çıkar ──────────────────────────────────────────────────────────
  removeMember: (conversationId: string, userId: string) =>
    api.delete<ApiResponse<Conversation>>(`/messages/conversations/${conversationId}/members/${userId}`).then(r => r.data.data),

  // ── Grup Adı Güncelle ────────────────────────────────────────────────────────
  updateGroupTitle: (conversationId: string, title: string) =>
    api.patch<ApiResponse<Conversation>>(`/messages/conversations/${conversationId}/title`, { title }).then(r => r.data.data),

  // ── Mesaj Sil ───────────────────────────────────────────────────────────────
  deleteMessage: (messageId: string) =>
    api.delete(`/messages/${messageId}`),
};
