import api from './api';
import { useAuthStore } from '@/store/authStore';

export interface ChatMessage {
  id:        string;
  role:      'user' | 'bot';
  content:   string;
  timestamp: Date;
  streaming?: boolean;
  isError?:   boolean;     // hata mesajı mı?
  retryText?: string;      // tekrar denenecek orijinal metin
}

export interface ConversationTurn {
  role: 'user' | 'model';
  text: string;
}

export interface ChatbotApiResponse {
  reply:   string;
  success: boolean;
  error?:  string;
}

/* ─── Hata türleri ────────────────────────────────── */
export type ChatErrorType = 'network' | 'timeout' | 'server' | 'rateLimit' | 'unknown';

export interface ChatError {
  type:    ChatErrorType;
  message: string;
}

function classifyError(err: unknown): ChatError {
  const msg = String((err as { message?: string })?.message || err || '');
  if (msg.includes('AbortError') || msg.includes('timeout') || msg.includes('zaman aşımı'))
    return { type: 'timeout', message: 'Yanıt süresi doldu. Lütfen tekrar deneyin.' };
  if (msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.includes('ERR_'))
    return { type: 'network', message: 'İnternet bağlantınızı kontrol edin ve tekrar deneyin.' };
  if (msg.includes('429') || msg.toLowerCase().includes('rate'))
    return { type: 'rateLimit', message: 'Çok fazla mesaj gönderildi. Lütfen biraz bekleyin.' };
  if (msg.includes('5') && msg.includes('00'))
    return { type: 'server', message: 'Sunucu geçici olarak kullanılamıyor. Birazdan tekrar deneyin.' };
  return { type: 'unknown', message: 'Bir hata oluştu. Lütfen tekrar deneyin.' };
}

/* ─── Yardımcılar ─────────────────────────────────── */
const STREAM_TIMEOUT_MS = 20_000;
const RETRY_DELAY_MS    = 2_000;
const MAX_RETRIES       = 1;

function delay(ms: number) { return new Promise(r => setTimeout(r, ms)); }

export const chatbotService = {
  /** Normal mesaj gönder */
  async sendMessage(message: string, history?: ConversationTurn[]): Promise<string> {
    const { data } = await api.post<ChatbotApiResponse>('/chatbot/message', { message, history });
    if (!data.success) throw new Error(data.error || 'Yanıt alınamadı');
    return data.reply;
  },

  /** Real SSE streaming over REST API — with timeout + retry */
  streamMessage(
    message: string,
    history: ConversationTurn[],
    onChunk: (chunk: string) => void,
    onDone: () => void,
    onError: (err: ChatError) => void,
    pagePath?: string
  ): () => void {
    const controller = new AbortController();
    let cancelled = false;

    const attempt = async (retryCount: number) => {
      if (cancelled) return;

      const token = useAuthStore.getState().accessToken;

      /* Timeout */
      const timeoutId = setTimeout(() => {
        if (!cancelled) controller.abort();
      }, STREAM_TIMEOUT_MS);

      try {
        const response = await fetch('/api/chatbot/stream', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ message, history, pagePath }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error('Sunucu hatası: ' + response.status);
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder('utf-8');
        if (!reader) throw new Error('Stream desteklenmiyor');

        let done = false;
        let doneCalled = false;
        let buffer = '';

        while (!done) {
          const { value, done: readerDone } = await reader.read();
          if (readerDone) { done = true; break; }

          buffer += decoder.decode(value, { stream: true });
          const events = buffer.split('\n\n');
          buffer = events.pop() || '';

          for (const ev of events) {
            let eventName = '';
            const dataList: string[] = [];
            for (const line of ev.split('\n')) {
              if (line.startsWith('event:')) eventName = line.substring(6).trim();
              else if (line.startsWith('data:')) {
                let d = line.substring(5);
                if (d.startsWith(' ')) d = d.substring(1);
                dataList.push(d);
              }
            }

            const data = dataList.join('\n');
            if (eventName === 'chunk') onChunk(data);
            else if (eventName === 'done' || data === '[DONE]') {
              doneCalled = true; onDone(); done = true;
            } else if (eventName === 'error') throw new Error(data || 'Stream hatası');
          }
        }
        if (!doneCalled) onDone();

      } catch (err) {
        clearTimeout(timeoutId);
        if (cancelled) return;

        /* Retry mantığı */
        if ((err as { name?: string }).name !== 'AbortError' && retryCount < MAX_RETRIES) {
          await delay(RETRY_DELAY_MS);
          if (!cancelled) return attempt(retryCount + 1);
        }

        const error = err as Error;
        if (error.name !== 'AbortError') {
          onError(classifyError(error));
        }
      }
    };

    attempt(0);
    return () => { cancelled = true; controller.abort(); };
  },

  /** Backend sağlık kontrolü */
  async healthCheck(): Promise<boolean> {
    try {
      const resp = await fetch('/api/chatbot/message', {
        method: 'OPTIONS',
        signal: AbortSignal.timeout(5000),
      });
      return resp.ok || resp.status === 405 || resp.status === 401;
    } catch {
      return false;
    }
  },
};
