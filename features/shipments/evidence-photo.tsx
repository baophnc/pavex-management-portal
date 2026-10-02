"use client";

import { ImageOffIcon, XIcon } from "lucide-react";
import { useState } from "react";

const PREFIX = "evidence:";

/** The id inside an "evidence:<id>" reference, or null for anything else. */
export function evidenceId(reference: string | null | undefined) {
  if (!reference?.startsWith(PREFIX)) return null;
  const id = reference.slice(PREFIX.length).trim();
  return id || null;
}

/**
 * A delivery photo as a thumbnail; tap to see it full size. Photos are served through the console's
 * backend proxy, so only signed-in staff who may read the shipment can open them.
 */
export function EvidencePhoto({ reference, alt, compact = false }: { reference: string; alt: string; compact?: boolean }) {
  const id = evidenceId(reference);
  const [open, setOpen] = useState(false);
  const [broken, setBroken] = useState(false);
  if (!id) return null;
  const src = `/api/backend/workforce/evidence/${encodeURIComponent(id)}`;

  if (broken) {
    return (
      <p className="mt-2 inline-flex items-center gap-1.5 text-[0.68rem] text-muted-foreground">
        <ImageOffIcon className="size-3.5" /> Không tải được ảnh giao hàng.
      </p>
    );
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={compact ? "block overflow-hidden rounded border hover:ring-2 hover:ring-brand/30" : "mt-2 block overflow-hidden rounded-lg border hover:ring-2 hover:ring-brand/30"}>
        {/* eslint-disable-next-line @next/next/no-img-element -- served by the authenticated proxy, not a static asset */}
        <img src={src} alt={alt} loading="lazy" className={compact ? "h-9 w-12 object-cover" : "h-28 w-40 object-cover"} onError={() => setBroken(true)} />
      </button>
      {open ? (
        <div className="fixed inset-0 z-[90] grid place-items-center bg-black/80 p-4" role="dialog" aria-modal="true" onClick={() => setOpen(false)}>
          <button type="button" aria-label="Đóng" className="absolute right-4 top-4 grid size-9 place-items-center rounded-full bg-white/15 text-white hover:bg-white/25">
            <XIcon className="size-5" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt={alt} className="max-h-[90vh] max-w-[95vw] rounded-lg object-contain" />
        </div>
      ) : null}
    </>
  );
}
