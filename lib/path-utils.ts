'use client';

export const getBasePath = (): string => {
  if (typeof window !== 'undefined') {
    const pathname = window.location.pathname;
    const basePath = pathname.startsWith('/kirsh_vault') ? '/kirsh_vault' : '';
    return basePath;
  }

  return process.env.NODE_ENV === 'production' ? '/kirsh_vault' : '';
};

export const createPath = (path: string): string => {
  const basePath = getBasePath();

  if (path.startsWith(basePath + '/') || path === basePath) {
    return path;
  }

  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${basePath}${normalizedPath}`;
};

export const createImagePath = (imagePath: string): string => {
  if (imagePath.startsWith('http') || imagePath.startsWith('data:')) {
    return imagePath;
  }

  return createPath(imagePath);
};
