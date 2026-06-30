"use client";

import { useEffect, useRef, useState } from "react";

type AutosaveStatus = "idle" | "saving" | "saved" | "error" | "conflict";

type SaveResult = Readonly<{
  version: number;
}>;

type UseAutosaveOptions<T> = Readonly<{
  draft: T;
  version: number;
  onSave: (draft: T, version: number) => Promise<SaveResult>;
  delayMs?: number;
}>;

export function useAutosave<T>({
  draft,
  version,
  onSave,
  delayMs = 700,
}: UseAutosaveOptions<T>) {
  const [status, setStatus] = useState<AutosaveStatus>("idle");
  const [savedVersion, setSavedVersion] = useState(version);
  const lastSavedDraftRef = useRef(JSON.stringify(draft));
  const lastSeenVersionRef = useRef(version);
  const blockedByConflictRef = useRef(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (version === lastSeenVersionRef.current) {
      return;
    }

    lastSeenVersionRef.current = version;
    setSavedVersion(version);
    blockedByConflictRef.current = false;
    lastSavedDraftRef.current = JSON.stringify(draft);
  }, [draft, version]);

  useEffect(() => {
    const draftSnapshot = JSON.stringify(draft);
    const hasChanges = draftSnapshot !== lastSavedDraftRef.current;

    if (!hasChanges || blockedByConflictRef.current) {
      return;
    }

    setStatus("saving");

    timerRef.current = window.setTimeout(async () => {
      try {
        const result = await onSave(draft, savedVersion);
        lastSavedDraftRef.current = draftSnapshot;
        setSavedVersion(result.version);
        setStatus("saved");
      } catch (error) {
        const code = (error as { code?: number | string }).code;
        if (code === 409 || code === "409" || code === "VERSION_CONFLICT") {
          blockedByConflictRef.current = true;
          setStatus("conflict");
          return;
        }

        setStatus("error");
      }
    }, delayMs);

    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, [delayMs, draft, onSave, savedVersion]);

  return {
    status,
    version: savedVersion,
  };
}
