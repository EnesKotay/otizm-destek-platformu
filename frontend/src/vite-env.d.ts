/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_WS_URL?: string;
  readonly VITE_VAPID_PUBLIC_KEY?: string;
  readonly VITE_TURNSTILE_SITE_KEY?: string;
  readonly VITE_PUBLIC_SITE_URL?: string;
}

interface Window {
  turnstile?: {
    render: (element: HTMLElement, options: Record<string, unknown>) => string;
    remove: (widgetId: string) => void;
  };
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
