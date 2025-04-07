'use client';

import { Home, Menu, X } from 'lucide-react';
import { motion } from 'motion/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { CATEGORY_CONFIG } from '@/lib/config/categories';
import { cn } from '@/lib/utils';

export const NavMenu = () => {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = () => setIsOpen(!isOpen);

  const categoryItems = Object.values(CATEGORY_CONFIG).map((config) => ({
    title: config.pluralTitle,
    href: config.route,
    icon: <config.icon className="h-4 w-4 mr-2" />,
  }));

  const menuItems = [
    {
      title: 'Home',
      href: '/',
      icon: <Home className="h-4 w-4 mr-2" />,
    },
    ...categoryItems,
  ];

  return (
    <>
      <div className="hidden md:flex border-b">
        <div className="container mx-auto flex items-center space-x-1 h-16">
          {menuItems.map((item) => (
            <Link key={item.href} href={item.href} passHref>
              <Button
                variant={pathname === item.href ? 'default' : 'ghost'}
                className="relative h-full rounded-none px-4"
                asChild
              >
                <div className="flex items-center">
                  {item.icon}
                  {item.title}
                  {pathname === item.href && (
                    <motion.div
                      className="absolute bottom-0 left-0 right-0 h-1 bg-primary"
                      layoutId="activeTab"
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    />
                  )}
                </div>
              </Button>
            </Link>
          ))}
        </div>
      </div>

      <div className="md:hidden border-b">
        <div className="container mx-auto flex justify-between items-center h-14">
          <Button variant="ghost" onClick={toggleMenu} className="p-2">
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </Button>
          <div className="font-semibold">Kirsh Vault</div>
          <div className="w-10" />
        </div>

        <motion.div
          className={cn(
            'absolute w-full bg-background z-50 border-b shadow-lg',
            !isOpen && 'hidden'
          )}
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: isOpen ? 'auto' : 0, opacity: isOpen ? 1 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <div className="container py-4 flex flex-col space-y-1">
            {menuItems.map((item) => (
              <Link key={item.href} href={item.href} passHref>
                <Button
                  variant={pathname === item.href ? 'default' : 'ghost'}
                  className="w-full justify-start"
                  onClick={() => setIsOpen(false)}
                  asChild
                >
                  <div className="flex items-center">
                    {item.icon}
                    {item.title}
                  </div>
                </Button>
              </Link>
            ))}
          </div>
        </motion.div>
      </div>
    </>
  );
};
