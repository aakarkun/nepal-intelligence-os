import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { StoreProvider } from "@/providers/store-provider";
import { QueryProvider } from "@/providers/query-provider";
import { SSEProvider } from "@/providers/sse-provider";
import { LanguageProvider } from "@/providers/language-provider";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

/** Monospace for market ticker symbols / ISO codes only — body uses Inter. */
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Nepal Intelligence OS",
  description:
    "A permanent national intelligence platform — election monitoring, parliament tracker, economic pulse, and crisis monitor.",
  keywords: ["Nepal", "election", "intelligence", "monitoring", "data"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`dark ${inter.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
    >
      <body className="font-sans antialiased">
        <StoreProvider>
          <QueryProvider>
            <SSEProvider>
              <LanguageProvider>{children}</LanguageProvider>
            </SSEProvider>
          </QueryProvider>
        </StoreProvider>
      </body>
    </html>
  );
}
