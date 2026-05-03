import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { TariWalletProvider } from "@/context/TariWalletContext";
import { SiteSettingsProvider } from "@/hooks/useSiteSettings";
import { ToastContainer } from "@/components/Toast";
import AppShell from "@/components/AppShell";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "XistrYmemZ - Plan. Request. Complete.",
  description: "Collaborative planning platform. Create projects, connect with community, build businesses, and coordinate efforts globally.",
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
  openGraph: {
    title: "XistrYmemZ - Plan. Request. Complete.",
    description: "Collaborative planning platform. Create projects, connect with community, build businesses, and coordinate efforts globally.",
    type: "website",
    siteName: "XistrYmemZ",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "XistrYmemZ - Plan. Request. Complete.",
    description: "Collaborative planning platform. Create projects, connect with community, build businesses, and coordinate efforts globally.",
  },
  keywords: ["collaborative planning", "community platform", "project management", "crypto payments", "business platform"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body>
        <a href="#main-content" className="sr-only focus:not-sr-only">
          Skip to main content
        </a>
        <Providers>
          <SiteSettingsProvider>
            <TariWalletProvider>
              <AppShell>
                {children}
                <ToastContainer />
              </AppShell>
              <Footer />
            </TariWalletProvider>
          </SiteSettingsProvider>
        </Providers>
      </body>
    </html>
  );
}
