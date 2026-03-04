import type { Metadata } from "next";
import { Syne, JetBrains_Mono } from "next/font/google";
import { QueryProvider } from "@/providers/query-provider";
import { SSEProvider } from "@/providers/sse-provider";
import "./globals.css";

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
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${syne.variable} ${jetbrainsMono.variable} font-mono antialiased`}
      >
        <QueryProvider>
          <SSEProvider>{children}</SSEProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
