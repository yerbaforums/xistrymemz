import { getLocale, getMessages } from "next-intl/server";
import "./design-system.css";
import "./globals.css";
import "./themes.css";
import { Providers } from "@/components/Providers";
import { TariWalletProvider } from "@/context/TariWalletContext";
import { SiteSettingsProvider } from "@/hooks/useSiteSettings";
import { ToastContainer } from "@/components/Toast";
import AppShell from "@/components/AppShell";
import Footer from "@/components/Footer";
import BackToTop from "@/components/BackToTop";
import CreateFAB from "@/components/CreateFAB";
import { QuickCreateProvider } from "@/components/QuickCreateModal";
import BottomNav from "@/components/BottomNav";
import LocaleProvider from "@/components/LocaleProvider";
import { WebSiteLD, OrganizationLD } from "@/components/JSONLD";
import { Analytics } from "@vercel/analytics/next";

const OG_LOCALE_MAP: Record<string, string> = {
  en: "en_US",
  es: "es_ES",
  fr: "fr_FR",
  pt: "pt_BR",
  it: "it_IT",
  ru: "ru_RU",
  de: "de_DE",
  hi: "hi_IN",
  ja: "ja_JP",
  zh: "zh_CN",
  ar: "ar_SA",
  ko: "ko_KR",
  nl: "nl_NL",
  pl: "pl_PL",
  sv: "sv_SE",
  tr: "tr_TR",
};

export async function generateMetadata() {
  const locale = await getLocale();
  const messages = await getMessages();

  return {
    title: messages.layout?.title || "XistrYmemZ - Plan. Request. Complete.",
    description: messages.layout?.description || "Collaborative planning platform.",
    icons: [
      { rel: "icon", url: "/favicon.ico" },
      { rel: "icon", type: "image/png", url: "/favicon.png" },
    ],
    appleWebApp: {
      capable: true,
      statusBarStyle: "default",
      title: "XistrYmemZ",
    },
    manifest: "/manifest.json",
    openGraph: {
      title: messages.layout?.title || "XistrYmemZ - Plan. Request. Complete.",
      description: messages.layout?.description || "Collaborative planning platform.",
      type: "website",
      siteName: "XistrYmemZ",
      locale: OG_LOCALE_MAP[locale] || "en_US",
    },
    twitter: {
      card: "summary_large_image",
      title: messages.layout?.title || "XistrYmemZ - Plan. Request. Complete.",
      description: messages.layout?.description || "Collaborative planning platform.",
    },
    keywords: ["collaborative planning", "community platform", "project management", "crypto payments", "business platform", "local marketplace", "community boards"],
    robots: { index: true, follow: true },
    alternates: {
      types: {
        'application/rss+xml': '/feed.xml',
      },
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#0d0d0d" media="(prefers-color-scheme: dark)" />
        <meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)" />
        <link rel="alternate" type="application/rss+xml" title="XistrYmemZ Feed" href="/feed.xml" />
        <WebSiteLD />
        <OrganizationLD />
      </head>
      <body>
        <Analytics />
        <LocaleProvider initialLocale={locale} initialMessages={messages}>
          <a href="#main-content" className="sr-only focus:not-sr-only">
            {messages.layout?.skipToContent || "Skip to main content"}
          </a>
          <Providers>
            <SiteSettingsProvider>
              <TariWalletProvider>
                <QuickCreateProvider>
                  <AppShell>
                    {children}
                    <ToastContainer />
                    <CreateFAB />
                  </AppShell>
                  <BottomNav />
                  <Footer />
                </QuickCreateProvider>
              </TariWalletProvider>
            </SiteSettingsProvider>
          </Providers>
        </LocaleProvider>
      </body>
    </html>
  );
}
