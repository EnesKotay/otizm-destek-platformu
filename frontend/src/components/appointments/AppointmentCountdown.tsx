import { useEffect, useState } from 'react';

export function AppointmentCountdown({ date, time }: { date: string; time: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const remaining = new Date(`${date}T${time}:00`).getTime() - now;
  if (remaining <= 0) return <span>Görüşme zamanı</span>;
  const days = Math.floor(remaining / 86_400_000);
  const hours = Math.floor((remaining % 86_400_000) / 3_600_000);
  const minutes = Math.floor((remaining % 3_600_000) / 60_000);
  const seconds = Math.floor((remaining % 60_000) / 1000);
  return <span>{days > 0 ? `${days} gün ` : ''}{hours} sa {minutes} dk {seconds} sn kaldı</span>;
}
