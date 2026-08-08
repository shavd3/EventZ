'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Menu, X, LogOut } from 'lucide-react';

const navLinks = [
  { href: '/', label: 'Dashboard' },
  { href: '/tasks', label: 'Tasks' },
  { href: '/timeline', label: 'Timeline' },
  { href: '/schedule', label: 'Wedding Day' },
  { href: '/budget', label: 'Budget' },
  { href: '/church-guests', label: 'Church Guests' },
  { href: '/cinnamon-grand-guests', label: 'Cinnamon Grand Guests' },
  { href: '/assignments', label: 'Assignments' },
  { href: '/settings', label: 'Categories' },
];

export default function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  async function handleLogout() {
    await fetch('/api/login', { method: 'DELETE' });
    window.location.href = '/login';
  }

  // The login page is the one screen that renders without the nav.
  if (pathname === '/login') return null;

  return (
    <nav className="bg-white border-b border-ivory-dark sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-3">
            <Image src="/logo.png" alt="A&S" width={40} height={40} className="rounded-full" style={{ mixBlendMode: 'multiply' }} />
            <span className="text-xl font-semibold text-gold" style={{ fontFamily: 'var(--font-sans)' }}>
              A & S
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  pathname === link.href
                    ? 'bg-gold/10 text-gold'
                    : 'text-warm-gray hover:text-gold hover:bg-gold/5'
                }`}
              >
                {link.label}
              </Link>
            ))}
            <button
              onClick={handleLogout}
              title="Log out"
              aria-label="Log out"
              className="ml-1 p-2 rounded-lg text-warm-gray-light hover:text-gold hover:bg-gold/5 transition-colors"
            >
              <LogOut size={16} />
            </button>
          </div>

          <button
            className="md:hidden p-2 text-warm-gray hover:text-gold"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {mobileOpen && (
          <div className="md:hidden pb-4 border-t border-ivory-dark pt-2">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={`block px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  pathname === link.href
                    ? 'bg-gold/10 text-gold'
                    : 'text-warm-gray hover:text-gold hover:bg-gold/5'
                }`}
              >
                {link.label}
              </Link>
            ))}
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium text-warm-gray-light hover:text-gold hover:bg-gold/5 transition-colors"
            >
              <LogOut size={16} /> Log out
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
