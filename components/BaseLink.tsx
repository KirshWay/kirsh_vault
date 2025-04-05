'use client';

import Link, { LinkProps } from 'next/link';
import { createPath } from '@/lib/path-utils';
import { ReactNode } from 'react';

interface Props extends Omit<LinkProps, 'href'> {
  href: string;
  children: ReactNode;
  className?: string;
}

export default function BaseLink({ href, children, className, ...rest }: Props) {
  const processedHref = href.startsWith('http') || href.startsWith('#') 
    ? href
    : createPath(href);

  return (
    <Link href={processedHref} className={className} {...rest}>
      {children}
    </Link>
  );
} 