'use client';

import { useSession } from 'next-auth/react';
import PublicHeader from './PublicHeader';
import AppNav from './AppNav';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const isAuthenticated = status === 'authenticated';
  const isLoading = status === 'loading';

  return (
    <>
      {isLoading ? (
        <PublicHeader />
      ) : isAuthenticated ? (
        <AppNav />
      ) : (
        <PublicHeader />
      )}
      {children}
    </>
  );
}