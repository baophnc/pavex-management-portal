"use client";

import { useEffect, useState } from "react";

import { getWorkforce } from "@/features/operations/api";
import type { WorkforceMember } from "@/features/operations/contracts";
import { workforceIdentityName, workforceKindLabel } from "@/features/operations/presentation";
import { selectClassName } from "@/features/pricing/ui";

/** The hub's managers and staff, by name, to hand a piece of work to. The value is the user id. */
export function HubPeoplePicker({
  hubId,
  value,
  onChange,
  emptyLabel = "Chọn người phụ trách",
  disabled = false,
}: {
  hubId: string;
  value: string;
  onChange: (userId: string) => void;
  emptyLabel?: string;
  disabled?: boolean;
}) {
  const [people, setPeople] = useState<WorkforceMember[] | null>(null);

  useEffect(() => {
    if (!hubId) return;
    let active = true;
    const load = (kind: string) =>
      getWorkforce(new URLSearchParams({ page: "1", pageSize: "100", status: "ACTIVE", hubId, kind }))
        .then((page) => page.items)
        .catch(() => [] as WorkforceMember[]);
    void Promise.all([load("HUB_MANAGER"), load("WAREHOUSE_OPERATOR")]).then(([managers, staff]) => {
      if (active) setPeople([...managers, ...staff]);
    });
    return () => {
      active = false;
    };
  }, [hubId]);

  const list = hubId ? people ?? [] : [];
  return (
    <select className={selectClassName} value={value} disabled={disabled || !hubId} onChange={(event) => onChange(event.target.value)}>
      <option value="">{!hubId ? "Chọn bưu cục trước" : people === null ? "Đang tải…" : emptyLabel}</option>
      {list.map((member) => (
        <option key={member.id} value={member.userId}>
          {workforceIdentityName(member.identity ?? {})} · {workforceKindLabel(member.kind)}
        </option>
      ))}
    </select>
  );
}
