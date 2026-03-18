import type { Metadata } from "next";
import { Syne, JetBrains_Mono, Noto_Sans } from "next/font/google";
import { StoreProvider } from "@/providers/store-provider";
import { QueryProvider } from "@/providers/query-provider";
import { SSEProvider } from "@/providers/sse-provider";
import "./globals.css";
import { cn } from "@/lib/utils";

const notoSans = Noto_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const syne = Syne({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

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
      className={cn("dark", "font-sans", notoSans.variable)}
      suppressHydrationWarning
    >
      <body
        className={`${syne.variable} ${jetbrainsMono.variable} font-mono antialiased`}
      >
        <StoreProvider>
          <QueryProvider>
            <SSEProvider>{children}</SSEProvider>
          </QueryProvider>
        </StoreProvider>
      </body>
    </html>
  );
}
