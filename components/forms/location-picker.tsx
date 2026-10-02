"use client";

import { useEffect, useState } from "react";

import { getProvinces, getWards } from "@/features/pricing/api";
import type { Province, Ward } from "@/features/pricing/contracts";
import { selectClassName } from "@/features/pricing/ui";
import { cn } from "@/lib/utils";

/*
 * Provinces and wards are read once per page and shared, so pickers and labels across a screen
 * cost one request per province.
 */
let provincesRequest: Promise<Province[]> | null = null;
const wardRequests = new Map<string, Promise<Ward[]>>();

function provinces() {
  provincesRequest ??= getProvinces().catch((reason) => {
    provincesRequest = null;
    throw reason;
  });
  return provincesRequest;
}

function wards(provinceCode: string) {
  if (!wardRequests.has(provinceCode)) {
    wardRequests.set(provinceCode, getWards(provinceCode).catch((reason) => {
      wardRequests.delete(provinceCode);
      throw reason;
    }));
  }
  return wardRequests.get(provinceCode)!;
}

/** Province and ward by name; the codes are what gets saved. */
export function LocationPicker({
  provinceCode,
  wardCode,
  onChange,
  disabled = false,
  className,
}: {
  provinceCode: string;
  wardCode: string;
  onChange: (value: { provinceCode: string; wardCode: string }) => void;
  disabled?: boolean;
  className?: string;
}) {
  const [provinceItems, setProvinceItems] = useState<Province[]>([]);
  const [wardItems, setWardItems] = useState<{ provinceCode: string; items: Ward[] } | null>(null);

  useEffect(() => {
    let active = true;
    provinces().then((items) => { if (active) setProvinceItems(items); }).catch(() => undefined);
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!provinceCode) return;
    let active = true;
    wards(provinceCode).then((items) => { if (active) setWardItems({ provinceCode, items }); }).catch(() => undefined);
    return () => { active = false; };
  }, [provinceCode]);

  const wardList = wardItems?.provinceCode === provinceCode ? wardItems.items : [];

  return (
    <div className={cn("grid gap-2 sm:grid-cols-2", className)}>
      <select
        className={selectClassName}
        value={provinceCode}
        disabled={disabled}
        aria-label="Tỉnh/thành"
        onChange={(event) => onChange({ provinceCode: event.target.value, wardCode: "" })}
      >
        <option value="">Chọn tỉnh/thành</option>
        {provinceItems.map((item) => <option key={item.code} value={item.code}>{item.fullName}</option>)}
      </select>
      <select
        className={selectClassName}
        value={wardCode}
        disabled={disabled || !provinceCode}
        aria-label="Phường/xã"
        onChange={(event) => onChange({ provinceCode, wardCode: event.target.value })}
      >
        <option value="">{provinceCode && wardList.length === 0 ? "Đang tải…" : "Chọn phường/xã"}</option>
        {wardList.map((item) => <option key={item.code} value={item.code}>{item.fullName}</option>)}
      </select>
    </div>
  );
}

/** "Phường Ba Đình, Thành phố Hà Nội" for a pair of codes. */
export function LocationName({ provinceCode, wardCode }: { provinceCode: string; wardCode: string }) {
  const [text, setText] = useState("");
  useEffect(() => {
    let active = true;
    Promise.all([provinces(), wards(provinceCode)])
      .then(([provinceItems, wardItems]) => {
        if (!active) return;
        const province = provinceItems.find((item) => item.code === provinceCode)?.fullName;
        const ward = wardItems.find((item) => item.code === wardCode)?.fullName;
        setText([ward, province].filter(Boolean).join(", "));
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, [provinceCode, wardCode]);
  return <>{text || "Đang tải địa chỉ…"}</>;
}
