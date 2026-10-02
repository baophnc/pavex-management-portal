"use client";

import QRCode from "qrcode";
import { useMemo } from "react";

import { cn } from "@/lib/utils";

/**
 * A QR code drawn as SVG squares. The field app scans QR codes as well as barcodes, so staff can
 * point a phone at the screen to open the shipment.
 */
export function QrCode({ value, label, className }: { value: string; label: string; className?: string }) {
  const qr = useMemo(() => {
    try {
      const { modules } = QRCode.create(value, { errorCorrectionLevel: "M" });
      const size = modules.size;
      let path = "";
      for (let y = 0; y < size; y += 1) {
        for (let x = 0; x < size; x += 1) {
          if (modules.get(x, y)) path += `M${x + 2} ${y + 2}h1v1h-1z`;
        }
      }
      return { path, total: size + 4 };
    } catch {
      return null;
    }
  }, [value]);

  if (!qr) return null;
  return (
    <svg viewBox={`0 0 ${qr.total} ${qr.total}`} role="img" aria-label={label} className={cn("bg-white", className)} shapeRendering="crispEdges">
      <path d={qr.path} fill="#000" />
    </svg>
  );
}
