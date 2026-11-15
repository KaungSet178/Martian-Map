/* eslint-disable @next/next/no-img-element -- Existing local project logo. */
import { useRef, useState } from 'react';
import { Menu, X } from 'lucide-react';

interface NavbarProps {
  onOpenPlanner: () => void;
}

const NAV_LINKS = [
  { label: 'Home', href: '#home' },
  { label: 'Overview', href: '#overview' },
  { label: 'Features', href: '#features' },
  { label: 'Regions', href: '#regions' },
  { label: 'Technology', href: '#technology' },
  { label: 'About', href: '#about' },
];

export function Navbar({ onOpenPlanner }: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);

  const handleNavClick = () => {
    setMobileOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-[#FFF9F0]/95 backdrop-blur-sm border-b border-[#0F2747]/12" onKeyDown={event => {
      if (event.key === 'Escape' && mobileOpen) {
        setMobileOpen(false);
        menuButton.current?.focus();
      }
    }}>
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Single-line Brand Wordmark */}
        <a
          href="#home"
          className="flex items-center gap-2.5 text-[#0F2747] whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#FF7A00]"
        >
          <img src="/branding/aresian-logo.png" alt="" width={40} height={28} className="w-10 h-7 object-contain shrink-0" />
          <span className="font-display font-bold text-lg tracking-tight">Aresian</span>
        </a>

        {/* Zone 2: Concise single-line navigation links */}
        <nav aria-label="Primary Navigation" className="hidden lg:flex items-center gap-7">
          {NAV_LINKS.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="text-sm font-medium text-[#0F2747]/80 hover:text-[#0F2747] hover:underline underline-offset-4 decoration-[#FF7A00] decoration-2 transition-colors duration-150 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#FF7A00]"
            >
              {item.label}
            </a>
          ))}
        </nav>

        {/* Zone 3: 1 Primary Action + Mobile Menu Toggle */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={onOpenPlanner}
            className="hidden sm:inline-flex items-center justify-center px-4 py-2 text-sm font-semibold text-white bg-[#FF7A00] hover:bg-[#E56D00] rounded-lg transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F2747]"
          >
            Explore Planner
          </button>

          <button
            ref={menuButton}
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            aria-expanded={mobileOpen}
            aria-controls="landing-mobile-navigation"
            aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
            className="lg:hidden inline-flex items-center justify-center w-10 h-10 rounded-lg border border-[#0F2747]/15 text-[#0F2747] hover:bg-[#FFE7D1]/60 transition-colors cursor-pointer"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Responsive Mobile Navigation Drawer */}
      {mobileOpen && (
        <div id="landing-mobile-navigation" className="lg:hidden border-t border-[#0F2747]/12 bg-[#FFF9F0] px-4 py-4">
          <nav aria-label="Mobile Navigation" className="flex flex-col gap-1">
            {NAV_LINKS.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={handleNavClick}
                className="px-3 py-2.5 text-sm font-medium text-[#0F2747] hover:bg-[#FFE7D1]/60 rounded-lg transition-colors"
              >
                {item.label}
              </a>
            ))}
            <button
              type="button"
              onClick={() => {
                setMobileOpen(false);
                onOpenPlanner();
              }}
              className="mt-3 w-full py-2.5 px-4 text-sm font-semibold text-white bg-[#FF7A00] hover:bg-[#E56D00] rounded-lg transition-colors cursor-pointer"
            >
              Explore Planner
            </button>
          </nav>
        </div>
      )}
    </header>
  );
}
