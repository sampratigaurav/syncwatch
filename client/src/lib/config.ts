const isDev = import.meta.env.DEV;

export const SERVER_URL = isDev
  ? 'http://localhost:3001'
  : 'https://syncwatch-backend-vwk3.onrender.com';
