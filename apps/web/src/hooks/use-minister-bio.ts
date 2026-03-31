"use client";

import { useEffect, useState } from "react";
import { API_URL } from "@/lib/utils";
import type { PoliticalPulseEvent } from "@repo/shared";

export type MinisterBioResponse = {
  id: string;
  name: string;
  bio: string | null;
  bioSource: string | null;
  bioFetchedAt: string | null;
  loading: boolean;
};

export function useMinisterBio(ministerId: string) {
  const [bio, setBio] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!ministerId) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const poll = async () => {
      try {
        const res = await fetch(
          `${API_URL}/v1/political-pulse/ministers/${encodeURIComponent(ministerId)}/bio`
        );
        const data = (await res.json()) as MinisterBioResponse;
        if (cancelled) return;
        if (data.loading) {
          timer = setTimeout(poll, 3000);
        } else {
          setBio(data.bio ?? null);
          setIsLoading(false);
        }
      } catch {
        if (!cancelled) {
          setBio(null);
          setIsLoading(false);
        }
      }
    };

    setIsLoading(true);
    setBio(null);
    void poll();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [ministerId]);

  return { bio, isLoading };
}

export function useMinisterRelatedNews(ministerId: string) {
  const [relatedNews, setRelatedNews] = useState<PoliticalPulseEvent[]>([]);

  useEffect(() => {
    if (!ministerId) return;
    fetch(`${API_URL}/v1/political-pulse/ministers/${encodeURIComponent(ministerId)}/news`)
      .then((r) => r.json())
      .then((d: { news?: PoliticalPulseEvent[] }) => setRelatedNews(d.news ?? []))
      .catch(() => setRelatedNews([]));
  }, [ministerId]);

  return { relatedNews };
}
