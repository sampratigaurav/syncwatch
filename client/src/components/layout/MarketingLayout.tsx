import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { useThemeStore } from '../../store/themeStore';

export const MarketingLayout = () => {
  const initTheme = useThemeStore(state => state.initTheme);

  // Hydrate theme from localStorage / system preference on first mount.
  // The inline script in index.html prevents FOUC, but this keeps the
  // Zustand store in sync with the actual html class for React state.
  useEffect(() => {
    initTheme();
  }, [initTheme]);

  return (
    <>
      <Header />
      <Outlet />
    </>
  );
};
