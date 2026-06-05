import { useCallback, useEffect, useRef } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { useAuthStore } from '@/store/authStore';

type MessageCallback = (body: unknown) => void;

// Global singleton state
let currentToken: string | null = null;
let client: Client | null = null;

// topic → set of callbacks (global, shared across components)
const subscribers = new Map<string, Set<MessageCallback>>();
// topic → single active STOMP subscription (global, one per topic)
const stompSubs = new Map<string, ReturnType<Client['subscribe']>>();

function subscribeInStomp(topic: string) {
  if (!client?.connected || stompSubs.has(topic)) return;
  const sub = client.subscribe(topic, (msg) => {
    const parsed = (() => { try { return JSON.parse(msg.body); } catch { return msg.body; } })();
    subscribers.get(topic)?.forEach(cb => cb(parsed));
  });
  stompSubs.set(topic, sub);
}

function destroyClient() {
  if (client) {
    try { client.deactivate(); } catch { /* ignore */ }
    client = null;
  }
  stompSubs.clear();
  subscribers.clear();
  currentToken = null;
}

function getClient(token: string): Client {
  if (currentToken && currentToken !== token) {
    destroyClient();
  }
  if (client && client.active) return client;

  currentToken = token;
  client = new Client({
    webSocketFactory: () => new SockJS(`/ws?token=${token}`),
    connectHeaders: { Authorization: `Bearer ${token}` },
    reconnectDelay: 5000,
    onConnect: () => {
      // Re-create STOMP subs for all tracked topics after reconnect
      stompSubs.clear();
      subscribers.forEach((cbs, topic) => {
        if (cbs.size > 0) subscribeInStomp(topic);
      });
      // Notify components that WS is (re)connected so they can refresh stale state
      window.dispatchEvent(new Event('ws-reconnected'));
    },
    onStompError: (frame) => {
      console.warn('STOMP error', frame.headers?.message);
    },
  });

  client.activate();
  return client;
}

export function useWebSocket() {
  const token = useAuthStore(s => s.accessToken);
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  // Per-component: tracks which topic → callback this instance registered
  const myCallbacks = useRef<Map<string, MessageCallback>>(new Map());

  useEffect(() => {
    if (token && isAuthenticated) {
      getClient(token);
    } else if (!isAuthenticated) {
      destroyClient();
    }
  }, [token, isAuthenticated]);

  // On unmount: clean up this component's callbacks and STOMP subs if no one else listens
  useEffect(() => {
    const localCbs = myCallbacks.current;
    return () => {
      localCbs.forEach((cb, topic) => {
        const cbs = subscribers.get(topic);
        if (!cbs) return;
        cbs.delete(cb);
        if (cbs.size === 0) {
          try { stompSubs.get(topic)?.unsubscribe(); } catch { /* ignore */ }
          stompSubs.delete(topic);
          subscribers.delete(topic);
        }
      });
      localCbs.clear();
    };
  }, []);

  const subscribe = useCallback((topic: string, cb: MessageCallback) => {
    // Remove old callback for this topic from this component if re-subscribing
    const oldCb = myCallbacks.current.get(topic);
    if (oldCb && oldCb !== cb) {
      subscribers.get(topic)?.delete(oldCb);
    }

    if (!subscribers.has(topic)) subscribers.set(topic, new Set());
    subscribers.get(topic)!.add(cb);
    myCallbacks.current.set(topic, cb);

    // Create a single STOMP sub per topic if connected and not already subscribed
    subscribeInStomp(topic);
  }, []);

  const unsubscribe = useCallback((topic: string) => {
    const cb = myCallbacks.current.get(topic);
    if (cb) {
      subscribers.get(topic)?.delete(cb);
      myCallbacks.current.delete(topic);
    }
    const remaining = subscribers.get(topic);
    if (!remaining || remaining.size === 0) {
      try { stompSubs.get(topic)?.unsubscribe(); } catch { /* ignore */ }
      stompSubs.delete(topic);
      subscribers.delete(topic);
    }
  }, []);

  const send = useCallback((destination: string, body: unknown) => {
    if (client?.connected) {
      client.publish({ destination, body: JSON.stringify(body) });
    }
  }, []);

  const isConnected = useCallback(() => client?.connected === true, []);

  return { subscribe, unsubscribe, send, isConnected };
}
