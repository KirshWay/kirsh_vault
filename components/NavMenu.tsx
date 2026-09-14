'use client';

import { Home, Menu, X } from 'lucide-react';
import { motion } from 'motion/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { CATEGORY_CONFIG } from '@/lib/config/categories';
import { cn } from '@/lib/utils';

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
      <div className="md:hidden border-b">
        <div className="container mx-auto flex justify-between items-center h-14">
          <Button
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
        <motion.nav
          id="mobile-navigation"
          aria-label="Mobile navigation"
          className={cn(
            'absolute w-full bg-background z-50 border-b shadow-lg',
            !isOpen && 'hidden'
          )}
          initial={false}
          animate={{ height: isOpen ? 'auto' : 0, opacity: isOpen ? 1 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <div className="container py-4 flex flex-col space-y-1">{links(true)}</div>
        </motion.nav>
      </div>
    </>
  );
}
