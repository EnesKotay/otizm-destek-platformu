import { useEffect, useRef, useState } from 'react';
import { CalendarDays } from 'lucide-react';

const TR_DAYS_SHORT = ['P', 'S', 'Ç', 'P', 'C', 'C', 'P'];
const TR_MONTHS = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
];

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);
const ITEM_H = 32;

function parseLocal(iso: string): Date {
  if (!iso) return new Date();
  const [datePart, timePart] = iso.split('T');
  const [y, m, d] = datePart.split('-').map(Number);
  if (timePart) {
    const [h, min] = timePart.split(':').map(Number);
    return new Date(y, m - 1, d, h, min);
  }
  return new Date(y, m - 1, d);
}

function toDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function pad(n: number) { return String(n).padStart(2, '0'); }

function formatDisplay(iso: string, showTime: boolean): string {
  if (!iso) return '';
  const d = parseLocal(iso);
  const dateStr = `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
  if (showTime) return `${dateStr}  ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  return dateStr;
}

function TimeScroll({ values, selected, onSelect }: {
  values: number[];
  selected: number;
  onSelect: (v: number) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.scrollTop = selected * ITEM_H;
    }
  }, [selected]);

  return (
    <div
      ref={ref}
      className="overflow-y-auto"
      style={{ height: 224, scrollbarWidth: 'none' } as React.CSSProperties}
    >
      {values.map(v => (
        <button
          key={v}
          type="button"
          onClick={() => onSelect(v)}
          style={{ height: ITEM_H }}
          className={`w-full flex items-center justify-center text-sm font-semibold transition-colors cursor-pointer ${
            v === selected ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          {pad(v)}
        </button>
      ))}
    </div>
  );
}

interface DatePickerProps {
  value: string;
  onChange: (iso: string) => void;
  label?: string;
  showTime?: boolean;
}

export function DatePicker({ value, onChange, label, showTime = false }: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const todayStr = toDateStr(new Date());
  const parsed = value ? parseLocal(value) : new Date();

  const [display, setDisplay] = useState({ year: parsed.getFullYear(), month: parsed.getMonth() });
  const [selDate, setSelDate] = useState(value ? toDateStr(parsed) : '');
  const [selHour, setSelHour] = useState(parsed.getHours());
  const [selMin, setSelMin] = useState(parsed.getMinutes());

  useEffect(() => {
    if (value) {
      const d = parseLocal(value);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDisplay({ year: d.getFullYear(), month: d.getMonth() });
       
      setSelDate(toDateStr(d));
       
      setSelHour(d.getHours());
       
      setSelMin(d.getMinutes());
    }
  }, [value]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const prevMonth = () => setDisplay(d =>
    d.month === 0 ? { year: d.year - 1, month: 11 } : { ...d, month: d.month - 1 }
  );
  const nextMonth = () => setDisplay(d =>
    d.month === 11 ? { year: d.year + 1, month: 0 } : { ...d, month: d.month + 1 }
  );

  const daysInMonth = new Date(display.year, display.month + 1, 0).getDate();
  const prevMonthDays = new Date(display.year, display.month, 0).getDate();
  const firstDow = new Date(display.year, display.month, 1).getDay();
  const offset = firstDow === 0 ? 6 : firstDow - 1;

  const cells: (number | null)[] = [
    ...Array(offset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const emit = (date: string, h: number, m: number) => {
    if (showTime) onChange(`${date}T${pad(h)}:${pad(m)}`);
    else onChange(date);
  };

  const selectDay = (day: number) => {
    const iso = toDateStr(new Date(display.year, display.month, day));
    setSelDate(iso);
    emit(iso, selHour, selMin);
    if (!showTime) setOpen(false);
  };

  const selectHour = (h: number) => {
    setSelHour(h);
    if (selDate) emit(selDate, h, selMin);
  };

  const selectMin = (m: number) => {
    setSelMin(m);
    if (selDate) emit(selDate, selHour, m);
  };

  const goToday = () => {
    const now = new Date();
    const iso = toDateStr(now);
    setSelDate(iso);
    setDisplay({ year: now.getFullYear(), month: now.getMonth() });
    const h = now.getHours(), m = now.getMinutes();
    setSelHour(h);
    setSelMin(m);
    emit(iso, h, m);
    if (!showTime) setOpen(false);
  };

  const clear = () => {
    setSelDate('');
    onChange('');
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      {label && <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>}

      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center justify-between px-3 py-2.5 border rounded-xl text-sm transition-all cursor-pointer bg-white ${
          open ? 'border-primary-500 ring-2 ring-primary-200' : 'border-gray-200 hover:border-gray-300'
        }`}
      >
        <span className={value ? 'text-gray-900' : 'text-gray-400'}>
          {value ? formatDisplay(value, showTime) : 'Tarih seçin'}
        </span>
        <CalendarDays size={16} className="text-gray-400 shrink-0" />
      </button>

      {open && (
        <div
          className="absolute z-50 mt-2 left-0 bg-white border border-gray-200 rounded-2xl shadow-2xl overflow-hidden"
          style={{ width: showTime ? 340 : 268 }}
        >
          <div className="flex">
            {/* Takvim */}
            <div className="flex-1 p-3 min-w-0">
              {/* Ay navigasyonu */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1">
                  <span className="text-sm font-bold text-gray-900 cursor-default">
                    {TR_MONTHS[display.month]} {display.year}
                  </span>
                  <span className="text-gray-400 text-xs">▾</span>
                </div>
                <div className="flex items-center gap-1">
                  <button type="button" onClick={prevMonth} className="p-1 rounded hover:bg-gray-100 cursor-pointer text-gray-500">▲</button>
                  <button type="button" onClick={nextMonth} className="p-1 rounded hover:bg-gray-100 cursor-pointer text-gray-500">▼</button>
                </div>
              </div>

              {/* Gün başlıkları */}
              <div className="grid grid-cols-7 mb-0.5">
                {TR_DAYS_SHORT.map((d, i) => (
                  <div key={i} className="text-center text-[11px] font-semibold text-gray-400 py-1">{d}</div>
                ))}
              </div>

              {/* Günler */}
              <div className="grid grid-cols-7">
                {cells.map((day, i) => {
                  if (!day) {
                    const isPrev = i < offset;
                    const ghost = isPrev
                      ? prevMonthDays - (offset - i - 1)
                      : i - offset - daysInMonth + 1;
                    return (
                      <div key={i} className="aspect-square flex items-center justify-center text-xs text-gray-300 font-medium">
                        {ghost}
                      </div>
                    );
                  }
                  const iso = toDateStr(new Date(display.year, display.month, day));
                  const isSelected = iso === selDate;
                  const isToday = iso === todayStr;
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => selectDay(day)}
                      className={`aspect-square flex items-center justify-center text-xs rounded-lg transition-all cursor-pointer font-semibold ${
                        isSelected
                          ? 'bg-blue-600 text-white'
                          : isToday
                          ? 'bg-blue-50 text-blue-700'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Saat scroll (yalnızca showTime=true) */}
            {showTime && (
              <div className="flex border-l border-gray-100">
                <div className="w-11 border-r border-gray-100">
                  <TimeScroll values={HOURS} selected={selHour} onSelect={selectHour} />
                </div>
                <div className="w-11">
                  <TimeScroll values={MINUTES} selected={selMin} onSelect={selectMin} />
                </div>
              </div>
            )}
          </div>

          {/* Alt kısayollar */}
          <div className="flex justify-between px-3 py-2.5 border-t border-gray-100">
            <button
              type="button"
              onClick={clear}
              className="text-xs font-semibold text-blue-600 hover:underline cursor-pointer"
            >
              Temizle
            </button>
            <button
              type="button"
              onClick={goToday}
              className="text-xs font-semibold text-blue-600 hover:underline cursor-pointer"
            >
              Bugün
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
