
import { Outlet } from 'react-router-dom';
import { Header } from './Header';

export const MarketingLayout = () => {
  return (
    <>
      <Header />
      <Outlet />
    </>
  );
};
