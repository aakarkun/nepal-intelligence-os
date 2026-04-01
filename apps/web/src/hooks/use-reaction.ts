"use client";

import { useState, useCallback } from "react";
import { getFingerprint } from "@/lib/fingerprint";
import {
  postReaction,
  deleteReaction,
  type ReactionStatus,
} from "@/lib/api";

const EMAIL_KEY = "nepal-intel-email";
const PROMPTED_KEY = "nepal-intel-email-prompted";

export function getStoredEmail(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(EMAIL_KEY);
}

export function setStoredEmail(email: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(EMAIL_KEY, email);
}

export function wasEmailPromptShown(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(PROMPTED_KEY) === "true";
}

export function setEmailPromptShown(): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(PROMPTED_KEY, "true");
}

export type UseReactionOptions = {
  initial?: ReactionStatus;
  onEmailPrompt?: () => void;
  /** Called after a successful like/unlike so the parent can refetch batch (keeps state in sync for reload). */
  onReactionChange?: () => void;
};

export function useReaction(
  itemId: string,
  itemTitle: string,
  options: UseReactionOptions = {}
) {
  const { initial = { count: 0, liked: false }, onEmailPrompt, onReactionChange } = options;
  const [count, setCount] = useState(initial.count);
  const [liked, setLiked] = useState(initial.liked);
  const [loading, setLoading] = useState(false);

  const toggle = useCallback(async () => {
    const fp = getFingerprint();
    if (loading) return;

    if (!liked) {
      setLiked(true);
      setCount((c) => c + 1);
      setLoading(true);
      try {
        const email = getStoredEmail();
        await postReaction({
          itemId,
          itemTitle: itemTitle.slice(0, 60),
          reaction: "like",
          email: email ?? null,
          fingerprint: fp,
        });
        if (!email && !wasEmailPromptShown()) {
          onEmailPrompt?.();
        }
        onReactionChange?.();
      } catch {
        setLiked(false);
        setCount((c) => Math.max(0, c - 1));
      } finally {
        setLoading(false);
      }
    } else {
      setLiked(false);
      setCount((c) => Math.max(0, c - 1));
      setLoading(true);
      try {
        const result = await deleteReaction(itemId, fp);
        setCount(result.count);
        onReactionChange?.();
      } catch {
        setLiked(true);
        setCount((c) => c + 1);
      } finally {
        setLoading(false);
      }
    }
  }, [itemId, itemTitle, liked, loading, onEmailPrompt, onReactionChange]);

  const setFromBatch = useCallback((status: ReactionStatus) => {
    setCount(status.count);
    setLiked(status.liked);
  }, []);

  return { count, liked, loading, toggle, setFromBatch };
}
