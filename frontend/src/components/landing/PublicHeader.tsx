import { useState } from 'react';
import { Link } from 'react-router-dom';
import { HeartHandshake, Menu, X } from 'lucide-react';
import { AccessibilityWidget } from '@/components/ui/AccessibilityWidget';

export function BrandMark({ className = '' }: { className?: string }) {
  return (
    <span
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-600 text-white shadow-sm ${className}`}
    >
      <HeartHandshake size={20} aria-hidden="true" />
    </span>
  );
}

export interface PublicNavItem {
  label: string;
  href: string;
  /** true ise react-router <Link>, değilse aynı sayfa içi çapa (<a href="#...">). */
  route?: boolean;
}

interface PublicHeaderProps {
  navItems?: PublicNavItem[];
}

export function PublicHeader({ navItems = [] }: PublicHeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const renderNavItem = (item: PublicNavItem, onClick?: () => void) =>
    item.route ? (
      <Link key={item.href} to={item.href} className="transition-colors hover:text-primary-700" onClick={onClick}>
        {item.label}
      </Link>
    ) : (
      <a key={item.href} href={item.href} className="transition-colors hover:text-primary-700" onClick={onClick}>
        {item.label}
      </a>
    );

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 shadow-sm shadow-slate-900/[0.03] backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 py-3 sm:gap-3 sm:px-5">
        <Link to="/" className="flex min-w-0 items-center gap-2 sm:gap-3">
          <BrandMark />
          <span className="hidden min-w-0 sm:block">
            <span className="block truncate text-sm font-extrabold leading-tight">Otizm Destek</span>
            <span className="block truncate text-[11px] font-bold uppercase tracking-widest text-primary-700">
              Gelişim Platformu
            </span>
          </span>
        </Link>

        {navItems.length > 0 && (
          <nav aria-label="Sayfa içi gezinme" className="hidden items-center gap-6 text-sm font-bold text-slate-700 lg:flex">
            {navItems.map((item) => renderNavItem(item))}
          </nav>
        )}

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          {/* Erişilebilirlik tercihleri (büyük yazı, yüksek kontrast, sakin mod)
              bilinçli olarak giriş yapılmadan da sunuluyor: bu ayarlara en çok
              ihtiyaç duyan kullanıcı, ürünle ilk kez burada karşılaşan kişidir. */}
          <AccessibilityWidget />
          <Link
            to="/giris"
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 sm:px-4"
          >
            Giriş
          </Link>
          <Link
            to="/kayit"
            className="hidden rounded-xl bg-primary-600 px-3 py-2 text-sm font-bold text-white shadow-lg shadow-primary-600/20 transition-colors hover:bg-primary-700 sm:inline-flex sm:px-4"
          >
            Ücretsiz başla
          </Link>
          {navItems.length > 0 && (
            <button
              type="button"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 lg:hidden"
              onClick={() => setMobileMenuOpen((v) => !v)}
              aria-label={mobileMenuOpen ? 'Menüyü kapat' : 'Menüyü aç'}
              aria-expanded={mobileMenuOpen}
              aria-controls="public-mobile-nav"
            >
              {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          )}
        </div>
      </div>

      {navItems.length > 0 && mobileMenuOpen && (
        <div id="public-mobile-nav" className="border-t border-slate-100 bg-white px-5 py-4 lg:hidden">
          <nav aria-label="Sayfa içi gezinme (mobil)" className="flex flex-col gap-3 text-sm font-bold text-slate-700">
            {navItems.map((item) => renderNavItem(item, () => setMobileMenuOpen(false)))}
            <Link
              to="/kayit"
              className="mt-1 inline-flex h-11 items-center justify-center rounded-xl bg-primary-600 px-4 text-sm font-bold text-white"
              onClick={() => setMobileMenuOpen(false)}
            >
              Ücretsiz başla
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
