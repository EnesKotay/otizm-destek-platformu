import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CheckCircle2 } from 'lucide-react';
import { guideSteps } from '@/content/landing';

/**
 * Başlangıç planı adımları.
 *
 * WAI-ARIA "tabs" örüntüsü uygulanır: eskiden bunlar sade <button>'lardı, bu
 * yüzden ekran okuyucu kullanıcısı tıklamanın sağdaki paneli değiştirdiğini
 * anlayamıyordu. Tek bir tablist kullanılıyor — mobilde yatay kaydırılan çip
 * şeridi, masaüstünde dikey liste olarak görünür; böylece mobil kullanıcı da
 * planın bütününü görebilir (önceden liste mobilde tamamen gizliydi).
 */
export function GuideStepper() {
  const [activeIndex, setActiveIndex] = useState(0);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const activeStep = guideSteps[activeIndex];
  const ActiveIcon = activeStep.icon;
  const progress = ((activeIndex + 1) / guideSteps.length) * 100;
  const lastIndex = guideSteps.length - 1;

  const focusTab = (index: number) => {
    setActiveIndex(index);
    tabRefs.current[index]?.focus();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    // Yönelim viewport'a göre değiştiği için hem yatay hem dikey oklar kabul edilir.
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        event.preventDefault();
        focusTab(index === lastIndex ? 0 : index + 1);
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        event.preventDefault();
        focusTab(index === 0 ? lastIndex : index - 1);
        break;
      case 'Home':
        event.preventDefault();
        focusTab(0);
        break;
      case 'End':
        event.preventDefault();
        focusTab(lastIndex);
        break;
      default:
        break;
    }
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[0.44fr_0.56fr] lg:items-start">
      {/* min-w-0 şart: grid item'ların varsayılan min-width'i `auto` olduğu için
          içindeki yatay kaydırmalı çip şeridi kolonu kendi genişliğine zorlar ve
          sayfa mobilde yatay kayar. */}
      <div className="min-w-0 lg:sticky lg:top-24">
        <p className="text-xs font-extrabold uppercase tracking-widest text-primary-700">Başlangıç planı</p>
        <h2 className="mt-3 text-3xl font-extrabold leading-tight text-slate-950 sm:text-4xl">
          İlk gününüzü 6 küçük adıma böldük.
        </h2>
        <p className="mt-4 text-sm font-medium leading-7 text-slate-600">
          Kayıt olduktan sonra hangi ekrana gideceğinizi düşünmeniz gerekmez. Platform önce temel bilgiyi toplar,
          sonra günlük akışı sadeleştirir.
        </p>

        <div
          role="tablist"
          aria-label="Başlangıç planı adımları"
          className="mt-6 flex snap-x snap-mandatory gap-2 overflow-x-auto pb-2 lg:mt-6 lg:flex-col lg:gap-0 lg:overflow-visible lg:rounded-2xl lg:border lg:border-slate-200 lg:bg-white lg:pb-0 lg:shadow-sm"
        >
          {guideSteps.map((step, index) => {
            const selected = activeIndex === index;
            return (
              <button
                key={step.title}
                ref={(node) => {
                  tabRefs.current[index] = node;
                }}
                type="button"
                role="tab"
                id={`guide-tab-${index}`}
                aria-selected={selected}
                aria-controls="guide-panel"
                tabIndex={selected ? 0 : -1}
                onClick={() => setActiveIndex(index)}
                onKeyDown={(event) => handleKeyDown(event, index)}
                className={`flex shrink-0 snap-start items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-colors lg:w-full lg:shrink lg:items-start lg:gap-3 lg:rounded-none lg:border-0 lg:border-b lg:border-slate-100 lg:px-4 lg:py-3.5 lg:last:border-b-0 ${
                  selected
                    ? 'border-primary-200 bg-primary-50 text-primary-900'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-extrabold ${
                    selected ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {index + 1}
                </span>
                <span className="min-w-0">
                  {/* Mobil çipte kısa ekran adı, masaüstü listede tam başlık. */}
                  <span className="block whitespace-nowrap text-sm font-bold leading-tight lg:hidden">
                    {step.screen}
                  </span>
                  <span className="hidden text-sm font-extrabold leading-tight lg:block">{step.title}</span>
                  <span className="mt-1 hidden text-xs font-semibold leading-5 text-slate-600 lg:block">
                    {step.screen}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div
        role="tabpanel"
        id="guide-panel"
        aria-labelledby={`guide-tab-${activeIndex}`}
        tabIndex={0}
        className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-200/60"
      >
        <div className="border-b border-slate-100 p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-widest text-slate-600">{activeStep.screen}</p>
              <h3 className="mt-1 text-2xl font-extrabold leading-tight text-slate-950">{activeStep.title}</h3>
            </div>
            <span className="shrink-0 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-xs font-extrabold text-emerald-800">
              {activeIndex + 1}/{guideSteps.length}
            </span>
          </div>
          <div
            className="mt-5 h-2 overflow-hidden rounded-full bg-slate-100"
            role="progressbar"
            aria-valuenow={activeIndex + 1}
            aria-valuemin={1}
            aria-valuemax={guideSteps.length}
            aria-label="Başlangıç planı ilerlemesi"
          >
            <div className="h-full rounded-full bg-primary-600 transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
        </div>

        <div className="p-6">
          <div className="flex items-start gap-4 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-white text-primary-700 shadow-sm ring-1 ring-primary-100">
              <ActiveIcon size={25} aria-hidden="true" />
            </span>
            <p className="text-sm font-semibold leading-7 text-slate-700">{activeStep.intro}</p>
          </div>

          <div className="mt-6">
            <p className="text-xs font-extrabold uppercase tracking-widest text-slate-600">Bu adımda</p>
            <ul className="mt-3 grid gap-3">
              {activeStep.tasks.map((task) => (
                <li
                  key={task}
                  className="flex items-start gap-3 rounded-xl border border-slate-100 bg-white px-3 py-2.5 text-sm font-semibold leading-6 text-slate-700"
                >
                  <CheckCircle2 size={17} className="mt-0.5 shrink-0 text-emerald-600" aria-hidden="true" />
                  {task}
                </li>
              ))}
            </ul>
          </div>

          <p className="mt-6 rounded-xl bg-primary-50 px-4 py-3 text-sm font-bold leading-6 text-primary-900 ring-1 ring-primary-100">
            {activeStep.result}
          </p>

          <div className="mt-6 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setActiveIndex((i) => Math.max(0, i - 1))}
              disabled={activeIndex === 0}
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ArrowLeft size={16} aria-hidden="true" />
              Önceki
            </button>
            {activeIndex === lastIndex ? (
              <Link
                to="/kayit"
                className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary-600 px-5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-primary-700"
              >
                Kayıt ol
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => setActiveIndex((i) => Math.min(lastIndex, i + 1))}
                className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary-600 px-5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-primary-700"
              >
                Sonraki adım
                <ArrowRight size={16} aria-hidden="true" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
