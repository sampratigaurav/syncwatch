const isDev = import.meta.env.DEV;

export const SERVER_URL = isDev
  ? 'http://localhost:3001'
  : (import.meta.env.VITE_SERVER_URL ?? 'https://syncwatch-backend-vwk3.onrender.com');
