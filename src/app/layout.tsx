import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { TariWalletProvider } from "@/context/TariWalletContext";
import AppShell from "@/components/AppShell";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "XistrYmemZ - Plan & Request Platform",
  description: "Create plans, submit requests to complete them, and track your progress",
  icons: [
    {
      rel: "icon",
      url: "/favicon.ico",
    },
    {
      rel: "icon",
      type: "image/png",
      url: "/favicon.png",
    },
  ],
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "XistrYmemZ",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <TariWalletProvider>
            <AppShell>
              {children}
            </AppShell>
            <Footer />
          </TariWalletProvider>
        </Providers>
      </body>
    </html>
  );
}
