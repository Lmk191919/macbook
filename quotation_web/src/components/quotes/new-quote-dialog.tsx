"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FormEvent } from "react";

import type { QuoteInput } from "@/server/repositories/quotation-repository";

type NewQuoteDialogProps = Readonly<{
  onCreated?: (quoteId: string) => void;
}>;

export function NewQuoteDialog({ onCreated }: NewQuoteDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const payload: QuoteInput = {
      customerName: String(formData.get("customerName") ?? ""),
      projectName: String(formData.get("projectName") ?? ""),
      area: Number(formData.get("area") ?? 0),
      renovationType: String(formData.get("renovationType") ?? ""),
    };

    try {
      const response = await fetch("/api/quotes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });

      const body = (await response.json()) as
        | { data: { id: string } }
        | { error: { message: string } };

      if (!response.ok) {
        setError("error" in body ? body.error.message : "创建报价失败");
        return;
      }

      const quoteId = body.data.id;
      setOpen(false);
      onCreated?.(quoteId);
      router.refresh();
      window.location.assign(`/quotes/${quoteId}`);
    } catch {
      setError("网络请求失败");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button className="button focus-ring" onClick={() => setOpen(true)} type="button">
        新建报价
      </button>

      {open ? (
        <div aria-label="新建报价" className="dialog-backdrop" role="dialog">
          <form className="dialog-card stack" onSubmit={handleSubmit}>
            <h2>新建报价</h2>
            <label className="field" htmlFor="new-quote-customer">
              <span>客户姓名</span>
              <input className="input focus-ring" id="new-quote-customer" name="customerName" required />
            </label>
            <label className="field" htmlFor="new-quote-project">
              <span>小区/项目</span>
              <input className="input focus-ring" id="new-quote-project" name="projectName" required />
            </label>
            <label className="field" htmlFor="new-quote-area">
              <span>面积</span>
              <input
                className="input focus-ring"
                id="new-quote-area"
                name="area"
                min={0}
                step="0.01"
                type="number"
                required
              />
            </label>
            <label className="field" htmlFor="new-quote-type">
              <span>装修类型</span>
              <input className="input focus-ring" id="new-quote-type" name="renovationType" required />
            </label>
            {error ? <p className="error-message">{error}</p> : null}
            <div className="dialog-actions">
              <button className="button button--ghost focus-ring" onClick={() => setOpen(false)} type="button">
                取消
              </button>
              <button className="button focus-ring" disabled={saving} type="submit">
                {saving ? "创建中..." : "创建报价"}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}
