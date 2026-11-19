import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LOGO_URL, NAV_LINKS } from '@/lib/site';

interface SiteNavbarProps {
  overlay?: boolean;
}

export default function SiteNavbar({ overlay = true }: SiteNavbarProps) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [location.pathname, location.hash]);

  const solid = !overlay || scrolled || open;

  return (
    <header
      className={`${overlay ? 'fixed' : 'sticky'} top-0 left-0 right-0 z-50 transition-colors duration-300 ${
        solid ? 'bg-background-50 border-b border-background-200' : 'bg-transparent'
      }`}
    >
      <nav className="w-full px-4 md:px-8 h-16 md:h-20 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3 shrink-0">
          <span className="w-11 h-11 md:w-12 md:h-12 flex items-center justify-center rounded-full overflow-hidden ring-1 ring-primary-500/40">
            <img
              src={LOGO_URL}
              alt="Barbearia Daniel Nunes"
              title="Barbearia Daniel Nunes — Dourados/MS"
              className="w-full h-full object-cover"
            />
          </span>
          <span className="flex flex-col leading-tight">
            <span
              className={`font-heading tracking-wide text-base md:text-lg ${
                solid ? 'text-foreground-950' : 'text-background-50'
              }`}
            >
              Daniel Nunes
            </span>
            <span
              className={`text-[10px] md:text-xs tracking-[0.25em] uppercase ${
                solid ? 'text-primary-600' : 'text-primary-300'
              }`}
            >
              Barbearia
            </span>
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-7">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.label}
              to={`${link.to}${link.hash}`}
              className={`text-sm font-medium transition-colors ${
                solid
                  ? 'text-foreground-700 hover:text-primary-600'
                  : 'text-background-100 hover:text-primary-300'
              }`}
            >
              {link.label}
            </Link>
          ))}
          <Link
            to="/agenda"
            className="whitespace-nowrap rounded-md bg-primary-500 hover:bg-primary-600 text-foreground-950 text-sm font-semibold px-5 py-2.5 transition-colors inline-flex items-center gap-2"
          >
            <i className="ri-calendar-line" />
            Agendar horário
          </Link>
        </div>

        <button
          type="button"
          aria-label="Abrir menu"
          onClick={() => setOpen((v) => !v)}
          className={`md:hidden w-10 h-10 flex items-center justify-center rounded-md text-xl ${
            solid ? 'text-foreground-950' : 'text-background-50'
          }`}
        >
          <i className={open ? 'ri-close-line' : 'ri-menu-line'} />
        </button>
      </nav>

      {open && (
        <div className="md:hidden bg-background-50 border-t border-background-200 px-4 pb-5 pt-2">
          <div className="flex flex-col">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.label}
                to={`${link.to}${link.hash}`}
                className="py-3 text-sm font-medium text-foreground-800 border-b border-background-100"
              >
                {link.label}
              </Link>
            ))}
            <Link
              to="/agenda"
              className="mt-4 whitespace-nowrap rounded-md bg-primary-500 text-foreground-950 text-sm font-semibold px-5 py-3 text-center inline-flex items-center justify-center gap-2"
            >
              <i className="ri-calendar-line" />
              Agendar horário
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}