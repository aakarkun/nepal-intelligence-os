import type { Metadata } from "next";

const title = "Parliament";
const description =
  "House of Representatives — 275 seats · seat map, party breakdown, and coalition builder · Nepal Intelligence OS";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/parliament" },
  openGraph: {
    title: `${title} · Nepal Intelligence OS`,
    description,
    url: "/parliament",
    siteName: "Nepal Intelligence OS",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: `${title} · Nepal Intelligence OS`,
    description,
  },
};

export default function ParliamentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
