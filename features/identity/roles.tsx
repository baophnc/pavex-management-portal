"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { RoleItem } from "@/features/identity/contracts";
import { apiRequest } from "@/lib/api/client";

export function IdentityRoles() {
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [selectedCode, setSelectedCode] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = await apiRequest("roles");
      if (!Array.isArray(payload))
        throw new Error("Dữ liệu vai trò không đúng định dạng.");
      const result = payload as RoleItem[];
      setRoles(result);
      setSelectedCode((current) =>
        current && result.some((role) => role.code === current)
          ? current
          : (result[0]?.code ?? ""),
      );
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Không thể tải danh sách vai trò.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const task = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(task);
  }, [load]);

  const selected = roles.find((role) => role.code === selectedCode) ?? null;
  const permissions = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return (
      selected?.permissions.filter(
        (permission) =>
          !needle ||
          `${permission.name} ${permission.code} ${permission.description ?? ""}`
            .toLowerCase()
            .includes(needle),
      ) ?? []
    );
  }, [query, selected]);

  return (
    <div className="space-y-4">
      <section className="flex flex-col gap-4 rounded-2xl border bg-gradient-to-br from-brand/10 via-card to-card p-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[0.65rem] font-black tracking-[0.16em] text-brand uppercase">
            Kiểm soát truy cập
          </p>
          <h1 className="mt-1 text-2xl font-black tracking-tight">
            Vai trò và quyền hạn
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Danh mục quyền được lấy trực tiếp từ Identity service.
          </p>
        </div>
        <Button onClick={() => void load()} disabled={loading}>
          {loading ? "Đang tải..." : "Tải lại"}
        </Button>
      </section>
      {error ? (
        <div className="rounded-xl border border-brand/30 bg-brand/5 p-4 text-sm font-bold text-brand">
          {error}
        </div>
      ) : null}
      <div className="grid gap-4 lg:grid-cols-[20rem_minmax(0,1fr)]">
        <section className="h-fit overflow-hidden rounded-2xl border bg-card">
          <div className="border-b p-4">
            <h2 className="text-sm font-black">Danh sách vai trò</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {roles.length} vai trò trong hệ thống
            </p>
          </div>
          <div className="grid gap-1 p-2">
            {roles.map((role) => (
              <button
                key={role.id}
                type="button"
                onClick={() => setSelectedCode(role.code)}
                className={`rounded-xl border p-3 text-left transition ${role.code === selectedCode ? "border-brand/30 bg-brand/5" : "border-transparent hover:bg-muted"}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-black">{role.name}</p>
                  <span className="rounded-full bg-muted px-2 py-1 text-[0.6rem] font-bold">
                    {role.permissions.length} quyền
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {role.code}
                </p>
                {role.isSystem ? (
                  <p className="mt-2 text-[0.6rem] font-black uppercase text-brand">
                    Vai trò hệ thống
                  </p>
                ) : null}
              </button>
            ))}
          </div>
        </section>
        <section className="overflow-hidden rounded-2xl border bg-card">
          {selected ? (
            <>
              <div className="border-b p-5">
                <p className="text-xs font-black text-brand uppercase">
                  {selected.code}
                </p>
                <h2 className="mt-1 text-xl font-black">{selected.name}</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  {selected.description ?? "Không có mô tả."}
                </p>
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  className="mt-4"
                  placeholder="Tìm quyền theo tên hoặc mã..."
                />
              </div>
              <div className="grid gap-2 p-4 sm:grid-cols-2">
                {permissions.map((permission) => (
                  <article
                    key={permission.id}
                    className="rounded-xl border bg-muted/20 p-3"
                  >
                    <p className="text-sm font-bold">{permission.name}</p>
                    <p className="mt-1 break-all font-mono text-[0.65rem] text-brand">
                      {permission.code}
                    </p>
                    {permission.description ? (
                      <p className="mt-2 text-xs leading-5 text-muted-foreground">
                        {permission.description}
                      </p>
                    ) : null}
                  </article>
                ))}
                {!permissions.length ? (
                  <p className="p-6 text-sm text-muted-foreground">
                    Không có quyền phù hợp.
                  </p>
                ) : null}
              </div>
            </>
          ) : (
            <div className="grid min-h-64 place-items-center text-sm text-muted-foreground">
              {loading ? "Đang tải vai trò..." : "Chưa có vai trò."}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
