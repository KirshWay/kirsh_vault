export const IMAGE_ACCEPT = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
};

export const IMAGE_LIMITS = {
  perItem: 5,
  fileBytes: 10 * 1024 ** 2,
  pixels: 40_000_000,
} as const;
