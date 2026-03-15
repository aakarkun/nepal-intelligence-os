"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { getFingerprint } from "@/lib/fingerprint";
import { patchAssociateEmail } from "@/lib/api";
import {
  setStoredEmail,
  setEmailPromptShown,
} from "@/hooks/use-reaction";

function isValidEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
}

interface EmailPromptModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EmailPromptModal({ open, onOpenChange }: EmailPromptModalProps) {
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setError(null);
    const trimmed = email.trim();
    if (!isValidEmail(trimmed)) {
      setError("Please enter a valid email address.");
      return;
    }
    setSaving(true);
    try {
      setStoredEmail(trimmed);
      const fp = getFingerprint();
      await patchAssociateEmail(fp, trimmed);
      setEmailPromptShown();
      onOpenChange(false);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = () => {
    setEmailPromptShown();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm border-border bg-card">
        <DialogHeader>
          <div className="flex flex-col items-center gap-2 text-center">
            <span className="text-4xl" aria-hidden>❤️</span>
            <DialogTitle className="text-lg font-semibold">
              Save your likes
            </DialogTitle>
          </div>
        </DialogHeader>
        <p className="text-center text-sm text-muted-foreground">
          Add your email to keep your likes when you return, and get notified
          when stories you care about are updated.
        </p>
        <div className="space-y-2">
          <input
            type="email"
            placeholder="your@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-nepal-red/50"
            aria-invalid={!!error}
          />
          {error && (
            <p className="text-xs text-red-500" role="alert">{error}</p>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="w-full"
          >
            {saving ? "Saving…" : "Save email"}
          </Button>
          <button
            type="button"
            onClick={handleSkip}
            className="text-xs text-muted-foreground hover:text-foreground underline"
          >
            Skip for now
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
