import type { GeopoliticsArticle } from "@repo/shared";

/** Demo rows for local UI when API/worker have no GDELT data. Not for production. */
export function getWorldFixtureArticles(panel: GeopoliticsArticle["panel"]): GeopoliticsArticle[] {
  const t = new Date().toISOString();
  const all: GeopoliticsArticle[] = [
    {
      id: "fixture-sa-1",
      title: "[Fixture] Sample: Nepal–India border cooperation story",
      url: "https://example.com/fixture/south-asia",
      source: "example.com",
      panel: "south_asia",
      tone: -2,
      publishedAt: t,
      language: "en",
      imageUrl: null,
      fetchedAt: t,
    },
    {
      id: "fixture-dip-1",
      title: "[Fixture] Sample: UN mission diplomatic note",
      url: "https://example.com/fixture/diplomatic",
      source: "example.org",
      panel: "diplomatic",
      tone: 1,
      publishedAt: t,
      language: "en",
      imageUrl: null,
      fetchedAt: t,
    },
    {
      id: "fixture-rem-1",
      title: "[Fixture] Sample: Gulf remittance corridor update",
      url: "https://example.com/fixture/remittance",
      source: "example.net",
      panel: "remittance",
      tone: null,
      publishedAt: t,
      language: "en",
      imageUrl: null,
      fetchedAt: t,
    },
    {
      id: "fixture-un-1",
      title: "[Fixture] Sample: Multilateral development forum",
      url: "https://example.com/fixture/un",
      source: "example.int",
      panel: "un",
      tone: 3,
      publishedAt: t,
      language: "en",
      imageUrl: null,
      fetchedAt: t,
    },
  ];
  return all.filter((a) => a.panel === panel);
}
