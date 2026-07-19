import { useEffect, useRef } from 'react';

export function TurnstileWidget({ onToken }: { onToken: (token?: string) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | undefined>(undefined);
  const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY;

  useEffect(() => {
    if (!siteKey || !containerRef.current) return;
    let cancelled = false;
    const render = () => {
      if (cancelled || !containerRef.current || !window.turnstile) return;
      widgetId.current = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        language: 'tr',
        callback: (token: string) => onToken(token),
        'expired-callback': () => onToken(undefined),
        'error-callback': () => onToken(undefined),
      });
    };
    if (window.turnstile) render();
    else {
      let script = document.querySelector<HTMLScriptElement>('script[data-turnstile]');
      if (!script) {
        script = document.createElement('script');
        script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
        script.async = true;
        script.defer = true;
        script.dataset.turnstile = 'true';
        document.head.appendChild(script);
      }
      script.addEventListener('load', render, { once: true });
    }
    return () => {
      cancelled = true;
      if (widgetId.current && window.turnstile) window.turnstile.remove(widgetId.current);
    };
  }, [onToken, siteKey]);

  if (!siteKey) return null;
  return <div ref={containerRef} className="flex min-h-[65px] justify-center" aria-label="Bot doğrulaması" />;
}
