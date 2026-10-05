import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Search, Users } from 'lucide-react';

interface SupportSearchBoxProps {
  compact?: boolean;
  initialQuery?: string;
}

const exampleTopics = ['Uyku düzeni', 'Yemek seçme', 'Okula uyum'];

export function SupportSearchBox({ compact = false, initialQuery = '' }: SupportSearchBoxProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState(initialQuery);

  const search = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedQuery = query.trim();
    navigate(normalizedQuery.length >= 2
      ? `/destek-ara?q=${encodeURIComponent(normalizedQuery)}`
      : '/destek-ara');
  };

  return (
    <section className={`rounded-3xl border border-indigo-100 bg-indigo-50/55 shadow-sm dark:border-slate-700 dark:bg-slate-900 ${compact ? 'p-5 sm:p-6' : 'p-5 sm:p-7'}`}>
      <div className="max-w-3xl">
        <span className="inline-flex items-center gap-2 text-xs font-bold text-indigo-700 dark:text-indigo-300">
          <Users size={14} aria-hidden="true" /> Aile deneyimlerinden destek al
        </span>
        <h2 className={`${compact ? 'mt-2 text-xl sm:text-2xl' : 'mt-2 text-2xl sm:text-3xl'} font-extrabold tracking-tight text-slate-900 dark:text-slate-50`}>
          Bir aile bunu daha önce yaşamış olabilir.
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
          Sorununu yaz; benzer deneyimleri, sana yakın aileleri, grupları ve güvenilir kaynakları birlikte gösterelim.
        </p>

        <form onSubmit={search} className="mt-5 max-w-2xl" role="search">
          <label htmlFor={compact ? 'dashboard-support-search' : 'community-support-search'} className="sr-only">
            Ne hakkında destek arıyorsunuz?
          </label>
          <div className="flex flex-col gap-2 rounded-xl border border-indigo-200 bg-indigo-100/45 p-1.5 transition-colors focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/15 dark:border-slate-600 dark:bg-slate-800 sm:flex-row">
            <div className="flex min-w-0 flex-1 items-center gap-2.5 px-2.5">
              <Search size={20} className="shrink-0 text-slate-400" aria-hidden="true" />
              <input
                id={compact ? 'dashboard-support-search' : 'community-support-search'}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Örn. Gece sık uyanıyor, ne deneyebiliriz?"
                className="h-10 w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-slate-50"
              />
            </div>
            <button type="submit" className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-indigo-700 px-5 text-sm font-bold text-white transition-colors hover:bg-indigo-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600">
              Çözüm ara <ArrowRight size={16} aria-hidden="true" />
            </button>
          </div>
        </form>

        {!compact && (
          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
            <span>Örnek:</span>
            {exampleTopics.map((topic) => (
              <button key={topic} type="button" onClick={() => navigate(`/destek-ara?q=${encodeURIComponent(topic)}`)} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 transition-colors hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700">
                {topic}
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
