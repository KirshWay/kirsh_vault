'use client';

import Link, { LinkProps } from 'next/link';
import { ReactNode } from 'react';

import { createPath } from '@/lib/path-utils';

interface Props extends Omit<LinkProps, 'href'> {
  href: string;
  children: ReactNode;
  className?: string;
}

export const BaseLink = ({ href, children, className, ...rest }: Props) => {
  const processedHref = href.startsWith('http') || href.startsWith('#') ? href : createPath(href);

  return (
    <Link href={processedHref} className={className} {...rest}>
      {children}
    </Link>
  );
};
