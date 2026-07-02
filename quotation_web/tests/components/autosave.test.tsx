import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useAutosave } from "@/components/quote-editor/use-autosave";

describe("useAutosave", () => {
  it("reports saving and saved when save succeeds", async () => {
    vi.useFakeTimers();
    const save = vi.fn().mockResolvedValue({ version: 2 });
    const { result, rerender } = renderHook(
      ({ value, version }) =>
        useAutosave({
          draft: value,
          version,
          onSave: save,
        }),
      {
        initialProps: { value: { name: "a" }, version: 1 },
      },
    );

    rerender({ value: { name: "b" }, version: 1 });

    await act(async () => {
      vi.advanceTimersByTime(750);
      await Promise.resolve();
    });

    expect(result.current.status).toBe("saved");
    expect(result.current.version).toBe(2);
    expect(save).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it("reports error and conflict states without retrying conflict automatically", async () => {
    vi.useFakeTimers();
    const save = vi
      .fn()
      .mockRejectedValueOnce(new Error("network"))
      .mockRejectedValueOnce(Object.assign(new Error("conflict"), { code: 409 }));
    const { result, rerender } = renderHook(
      ({ value, version }) =>
        useAutosave({
          draft: value,
          version,
          onSave: save,
        }),
      {
        initialProps: { value: { name: "a" }, version: 1 },
      },
    );

    rerender({ value: { name: "b" }, version: 1 });
    await act(async () => {
      vi.advanceTimersByTime(750);
      await Promise.resolve();
    });
    expect(result.current.status).toBe("error");

    rerender({ value: { name: "c" }, version: 1 });
    await act(async () => {
      vi.advanceTimersByTime(750);
      await Promise.resolve();
    });
    expect(result.current.status).toBe("conflict");

    rerender({ value: { name: "d" }, version: 1 });
    await act(async () => {
      vi.advanceTimersByTime(750);
      await Promise.resolve();
    });
    expect(save).toHaveBeenCalledTimes(2);
    expect(result.current.status).toBe("conflict");
    vi.useRealTimers();
  });
});
