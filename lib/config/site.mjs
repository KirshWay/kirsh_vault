export const PRODUCTION_BASE_PATH = '/kirsh_vault';
export const BASE_PATH = process.env.NODE_ENV === 'production' ? PRODUCTION_BASE_PATH : '';
