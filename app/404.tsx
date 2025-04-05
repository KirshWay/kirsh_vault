'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { BaseLink } from '@/components/BaseLink';

export default function NotFound() {
  const router = useRouter();

  useEffect(() => {
    const isDeploy = window.location.pathname.includes('/kirsh_vault');
    
    if (isDeploy) {
      const timer = setTimeout(() => {
        router.push('/');
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center">
      <h1 className="text-4xl font-bold mb-4">404 - Page Not Found</h1>
      <p className="text-xl mb-8">
        The page you are looking for does not exist or has been moved.
      </p>
      <div className="flex gap-4">
        <Button asChild>
          <BaseLink href="/">Return to Home</BaseLink>
        </Button>
      </div>
    </div>
  );
} 