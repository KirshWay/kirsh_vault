'use client';

import { Home, Menu, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { CATEGORY_CONFIG } from '@/lib/config/categories';

const menuItems = [
  { title: 'Home', href: '/', icon: Home },
  ...Object.values(CATEGORY_CONFIG).map((config) => ({
    title: config.pluralTitle,
    href: config.route,
    icon: config.icon,
  })),
];

export function NavMenu() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setIsOpen(false);
      toggleRef.current?.focus();
    };
    const handleOutside = (event: Event) => {
      if (event.target instanceof Node && !mobileMenuRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    document.addEventListener('pointerdown', handleOutside);
    document.addEventListener('focusin', handleOutside);
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('pointerdown', handleOutside);
      document.removeEventListener('focusin', handleOutside);
    };
  }, [isOpen]);

  const links = (mobile: boolean) =>
    menuItems.map((item) => (
      <Button
        key={item.href}
        variant={pathname === item.href ? 'default' : 'ghost'}
        asChild
        className={mobile ? 'w-full justify-start' : 'relative h-full rounded-none px-4'}
      >
        <Link
          href={item.href}
          aria-current={pathname === item.href ? 'page' : false}
          onClick={() => setIsOpen(false)}
        >
          <item.icon className="h-4 w-4 mr-2" />
          {item.title}
        </Link>
      </Button>
    ));

  return (
    <>
      <nav aria-label="Main navigation" className="hidden md:flex border-b">
        <div className="container mx-auto flex items-center space-x-1 h-16">{links(false)}</div>
      </nav>
      <div ref={mobileMenuRef} className="md:hidden border-b">
        <div className="container mx-auto flex justify-between items-center h-14">
          <Button
            ref={toggleRef}
            variant="ghost"
            onClick={() => setIsOpen((open) => !open)}
            className="p-2"
            aria-label={isOpen ? 'Close navigation' : 'Open navigation'}
            aria-expanded={isOpen}
            aria-controls="mobile-navigation"
          >
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </Button>
          <div className="font-semibold">Kirsh Vault</div>
          <div className="w-10" />
        </div>
        <nav
          id="mobile-navigation"
          aria-label="Mobile navigation"
          hidden={!isOpen}
          className="absolute w-full bg-background z-50 border-b shadow-lg"
        >
          <div className="container py-4 flex flex-col space-y-1">{links(true)}</div>
        </nav>
      </div>
    </>
  );
}
