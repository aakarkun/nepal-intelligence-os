import type { Metadata } from "next";
import { fetchConstituency } from "@/lib/api";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const path = `/constituencies/${encodeURIComponent(id)}`;
  let title = "Constituency";
  let description =
    "HoR constituency result · live and archived election datasets · Nepal Intelligence OS";

  try {
    const data = await fetchConstituency(id, null);
    const votes = new Intl.NumberFormat("en-NP").format(data.totalVotes);
    title = `${data.constituencyName}`;
    description = `${data.districtName} · Province ${data.provinceId} · ${votes} votes — Nepal Intelligence OS`;
  } catch {
    // Keep generic metadata when the API has no row for this id (404 UX stays client-side).
  }

  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title: `${title} · Nepal Intelligence OS`,
      description,
      url: path,
      siteName: "Nepal Intelligence OS",
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} · Nepal Intelligence OS`,
      description,
    },
  };
}

export default function ConstituencyDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
