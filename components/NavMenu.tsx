"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { BookOpen, Film, Package, Menu, X, Home } from "lucide-react";

export const NavMenu = () => {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = () => setIsOpen(!isOpen);

  const menuItems = [
    {
      title: "Home",
      href: "/",
      icon: <Home className="h-4 w-4 mr-2" />,
    },
    {
      title: "Books",
      href: "/books",
      icon: <BookOpen className="h-4 w-4 mr-2" />,
    },
    {
      title: "Movies",
      href: "/cinema",
      icon: <Film className="h-4 w-4 mr-2" />,
    },
    {
      title: "Other",
      href: "/other",
      icon: <Package className="h-4 w-4 mr-2" />,
    },
  ];

  return (
    <>
      <div className="hidden md:flex border-b">
        <div className="container mx-auto flex items-center space-x-1 h-16">
          {menuItems.map((item) => (
            <Link key={item.href} href={item.href} passHref>
              <Button
                variant={pathname === item.href ? "default" : "ghost"}
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
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
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
            "absolute w-full bg-background z-50 border-b shadow-lg",
            !isOpen && "hidden"
          )}
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: isOpen ? "auto" : 0, opacity: isOpen ? 1 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <div className="container py-4 flex flex-col space-y-1">
            {menuItems.map((item) => (
              <Link key={item.href} href={item.href} passHref>
                <Button
                  variant={pathname === item.href ? "default" : "ghost"}
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
} 