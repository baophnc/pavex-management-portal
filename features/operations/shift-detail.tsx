"use client";

import {
  AlertTriangleIcon,
  ArrowLeftIcon,
  CalendarClockIcon,
  LoaderCircleIcon,
  PencilIcon,
  PlusIcon,
  RefreshCwIcon,
  Trash2Icon,
  UserMinusIcon,
  UserRoundCheckIcon,
  UsersRoundIcon,
  XIcon,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAccess } from "@/features/auth/access-context";
import {
  assignWorkShiftMember,
  cancelWorkShift,
  getWorkforce,
  getWorkShift,
  markWorkShiftMemberAbsent,
  removeWorkShiftMember,
  updateWorkShift,
} from "@/features/operations/api";
import type {
  WorkforceMember,
  WorkforceShiftAssignment,
  WorkShiftDetail,
  WorkShiftStatus,
} from "@/features/operations/contracts";
import {
  workforceKindLabel,
  workforceShiftStatusLabel,
  workShiftStatusLabel,
} from "@/features/operations/presentation";
import { ApiError } from "@/lib/api/client";
import { formatDateTime } from "@/lib/utils";

function apiMessage(error: unknown, fallback: string) {
  return error instanceof ApiError ? error.message : fallback;
}

function localInputValue(value: string) {
  const date = new Date(value);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function shiftStatusClass(status: WorkShiftStatus) {
  return status === "SCHEDULED"
    ? "border-sky-500/20 bg-sky-500/10 text-sky-700 dark:text-sky-300"
    : "border-slate-500/20 bg-slate-500/10 text-slate-600 dark:text-slate-300";
}

function rosterStatusClass(status: WorkforceShiftAssignment["status"]) {
  switch (status) {
    case "CHECKED_IN": return "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
    case "CHECKED_OUT": return "border-sky-500/20 bg-sky-500/10 text-sky-700 dark:text-sky-300";
    case "ABSENT": return "border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-300";
    case "CANCELLED": return "border-slate-500/20 bg-slate-500/10 text-slate-600 dark:text-slate-300";
    case "SCHEDULED": return "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300";
  }
}

function EditShiftDialog({ detail, open, onClose, onSaved }: { detail: WorkShiftDetail; open: boolean; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(detail.shift.name);
  const [startsAt, setStartsAt] = useState(localInputValue(detail.shift.startsAt));
  const [endsAt, setEndsAt] = useState(localInputValue(detail.shift.endsAt));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    const task = window.setTimeout(() => {
      setName(detail.shift.name);
      setStartsAt(localInputValue(detail.shift.startsAt));
      setEndsAt(localInputValue(detail.shift.endsAt));
    }, 0);
    return () => window.clearTimeout(task);
  }, [detail, open]);

  if (!open) return null;

  const submit = async () => {
    const start = new Date(startsAt);
    const end = new Date(endsAt);
    if (!name.trim() || !(end > start)) {
      toast.error("Tên ca và khoảng thời gian chưa hợp lệ.");
      return;
    }
    setSaving(true);
    try {
      await updateWorkShift(detail.shift.id, { name: name.trim(), startsAt: start.toISOString(), endsAt: end.toISOString() });
      toast.success("Đã cập nhật ca làm việc.");
      onSaved();
      onClose();
    } catch (error) {
      toast.error(apiMessage(error, "Không thể cập nhật ca."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-black/45 p-4 backdrop-blur-[2px]">
      <section className="w-full max-w-xl rounded-xl border bg-card shadow-2xl">
        <header className="flex items-center justify-between border-b p-5"><div><p className="text-[0.62rem] font-black uppercase tracking-[0.14em] text-brand">Lịch ca</p><h2 className="mt-1 text-lg font-black">Chỉnh sửa ca</h2></div><Button size="icon" variant="ghost" onClick={onClose}><XIcon className="size-4" /></Button></header>
        <div className="grid gap-4 p-5"><label className="grid gap-2 text-xs font-bold">Tên ca<Input value={name} onChange={(event) => setName(event.target.value)} /></label><div className="grid gap-4 sm:grid-cols-2"><label className="grid gap-2 text-xs font-bold">Bắt đầu<Input type="datetime-local" value={startsAt} onChange={(event) => setStartsAt(event.target.value)} /></label><label className="grid gap-2 text-xs font-bold">Kết thúc<Input type="datetime-local" value={endsAt} onChange={(event) => setEndsAt(event.target.value)} /></label></div></div>
        <footer className="flex justify-end gap-2 border-t p-5"><Button variant="ghost" onClick={onClose}>Hủy</Button><Button onClick={() => void submit()} disabled={saving}>{saving ? <LoaderCircleIcon className="size-4 animate-spin" /> : <PencilIcon className="size-4" />}Lưu thay đổi</Button></footer>
      </section>
    </div>
  );
}

function AddMemberDialog({ detail, open, onClose, onSaved }: { detail: WorkShiftDetail; open: boolean; onClose: () => void; onSaved: () => void }) {
  const [candidates, setCandidates] = useState<WorkforceMember[]>([]);
  const [memberId, setMemberId] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    const task = window.setTimeout(() => {
      setMemberId("");
      setLoading(true);
      const params = new URLSearchParams({ page: "1", pageSize: "100", hubId: detail.shift.hubId, status: "ACTIVE" });
      void getWorkforce(params)
        .then((page) => setCandidates(page.items.filter((member) => !detail.roster.some((entry) => entry.workforceMemberId === member.id && entry.status !== "CANCELLED"))))
        .catch((error) => toast.error(apiMessage(error, "Không thể tải nhân sự của bưu cục.")))
        .finally(() => setLoading(false));
    }, 0);
    return () => window.clearTimeout(task);
  }, [detail, open]);

  if (!open) return null;

  const submit = async () => {
    if (!memberId) return;
    setSaving(true);
    try {
      await assignWorkShiftMember(detail.shift.id, memberId);
      toast.success("Đã thêm nhân sự vào roster.");
      onSaved();
      onClose();
    } catch (error) {
      toast.error(apiMessage(error, "Không thể thêm nhân sự vào ca."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-black/45 p-4 backdrop-blur-[2px]">
      <section className="w-full max-w-xl rounded-xl border bg-card shadow-2xl">
        <header className="flex items-center justify-between border-b p-5"><div><p className="text-[0.62rem] font-black uppercase tracking-[0.14em] text-brand">Danh sách ca</p><h2 className="mt-1 text-lg font-black">Thêm nhân sự vào ca</h2></div><Button size="icon" variant="ghost" onClick={onClose}><XIcon className="size-4" /></Button></header>
        <div className="p-5">{loading ? <div className="grid min-h-32 place-items-center"><LoaderCircleIcon className="size-5 animate-spin" /></div> : <label className="grid gap-2 text-xs font-bold">Nhân viên<select value={memberId} onChange={(event) => setMemberId(event.target.value)} className="h-10 rounded-md border bg-background px-3 text-sm"><option value="">Chọn nhân sự đang làm việc tại {detail.shift.hubCode || "bưu cục"}</option>{candidates.map((member) => <option key={member.id} value={member.id}>{member.employeeCode} · {workforceKindLabel(member.kind)} · {member.identity?.displayName || member.identity?.email || member.userId}</option>)}</select><span className="text-[0.68rem] font-medium text-muted-foreground">Hệ thống sẽ kiểm tra nhân sự có thuộc bưu cục, đúng vai trò và không trùng ca khác.</span></label>}</div>
        <footer className="flex justify-end gap-2 border-t p-5"><Button variant="ghost" onClick={onClose}>Hủy</Button><Button onClick={() => void submit()} disabled={!memberId || saving}>{saving ? <LoaderCircleIcon className="size-4 animate-spin" /> : <PlusIcon className="size-4" />}Thêm vào roster</Button></footer>
      </section>
    </div>
  );
}

export function OperationsShiftDetail({ shiftId }: { shiftId: string }) {
  const { hasPermission } = useAccess();
  const canManage = hasPermission("operations.workforce.manage") || hasPermission("operations.hub.manage");
  const [detail, setDetail] = useState<WorkShiftDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [loadedAt, setLoadedAt] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const next = await getWorkShift(shiftId);
      setDetail(next);
      setLoadedAt(Date.now());
    }
    catch (reason) { setError(apiMessage(reason, "Không thể tải chi tiết ca.")); }
    finally { setLoading(false); }
  }, [shiftId]);

  useEffect(() => {
    const task = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(task);
  }, [load]);

  const canEdit = Boolean(detail && loadedAt > 0 && detail.shift.status === "SCHEDULED" && new Date(detail.shift.startsAt).getTime() > loadedAt);

  const cancel = async () => {
    if (!detail) return;
    const reason = window.prompt("Lý do hủy ca:");
    if (!reason?.trim()) return;
    setBusy("cancel");
    try { await cancelWorkShift(detail.shift.id, reason.trim()); toast.success("Đã hủy ca làm việc."); await load(); }
    catch (reasonValue) { toast.error(apiMessage(reasonValue, "Không thể hủy ca.")); }
    finally { setBusy(null); }
  };

  const remove = async (entry: WorkforceShiftAssignment) => {
    if (!detail) return;
    const reason = window.prompt(`Lý do gỡ ${entry.employeeCode} khỏi ca (có thể để trống):`) ?? undefined;
    if (reason === undefined) return;
    setBusy(`remove:${entry.workforceMemberId}`);
    try { await removeWorkShiftMember(detail.shift.id, entry.workforceMemberId, reason); toast.success("Đã gỡ nhân sự khỏi roster."); await load(); }
    catch (errorValue) { toast.error(apiMessage(errorValue, "Không thể gỡ nhân sự khỏi ca.")); }
    finally { setBusy(null); }
  };

  const absent = async (entry: WorkforceShiftAssignment) => {
    if (!detail) return;
    const note = window.prompt(`Ghi chú vắng mặt cho ${entry.employeeCode}:`) ?? undefined;
    if (note === undefined) return;
    setBusy(`absent:${entry.workforceMemberId}`);
    try { await markWorkShiftMemberAbsent(detail.shift.id, entry.workforceMemberId, note); toast.success("Đã đánh dấu vắng mặt."); await load(); }
    catch (errorValue) { toast.error(apiMessage(errorValue, "Không thể đánh dấu vắng mặt.")); }
    finally { setBusy(null); }
  };

  if (loading && !detail) return <div className="grid min-h-64 place-items-center"><LoaderCircleIcon className="size-6 animate-spin text-brand" /></div>;
  if (error || !detail) return <div className="space-y-4"><Link href="/operations/shifts" className="inline-flex h-9 items-center gap-2 rounded-md px-3.5 text-xs font-bold hover:bg-muted"><ArrowLeftIcon className="size-4" />Quay lại Ca làm việc</Link><Card><CardContent className="py-10 text-center text-sm text-destructive">{error || "Không tìm thấy ca."}</CardContent></Card></div>;

  const { shift, roster } = detail;
  const checkedIn = roster.filter((entry) => entry.status === "CHECKED_IN").length;
  const absentCount = roster.filter((entry) => entry.status === "ABSENT").length;

  return (
    <div className="space-y-4">
      <EditShiftDialog detail={detail} open={editOpen} onClose={() => setEditOpen(false)} onSaved={() => void load()} />
      <AddMemberDialog detail={detail} open={addOpen} onClose={() => setAddOpen(false)} onSaved={() => void load()} />
      <section className="overflow-hidden rounded-xl border bg-card">
        <div className="border-b bg-gradient-to-br from-brand/[0.08] via-card to-card p-4 sm:p-5">
          <Link href="/operations/shifts" className="-ml-2 mb-3 inline-flex h-7 items-center gap-2 rounded-md px-2.5 text-[0.68rem] font-bold hover:bg-muted"><ArrowLeftIcon className="size-4" />Ca làm việc</Link>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div className="flex items-start gap-3"><span className="grid size-10 place-items-center rounded-lg border border-brand/15 bg-brand/10 text-brand"><CalendarClockIcon className="size-5" /></span><div><div className="flex flex-wrap items-center gap-2"><h1 className="text-xl font-black tracking-tight sm:text-2xl">{shift.name}</h1><span className={`rounded-full border px-2 py-0.5 text-[0.6rem] font-black ${shiftStatusClass(shift.status)}`}>{workShiftStatusLabel(shift.status)}</span></div><p className="mt-1 font-mono text-xs text-muted-foreground">{shift.code}</p><p className="mt-1 text-xs text-muted-foreground">{shift.hubCode || shift.hubId} · {shift.hubName || "Chưa có tên bưu cục"}</p></div></div><div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => void load()} disabled={loading}><RefreshCwIcon className={loading ? "size-4 animate-spin" : "size-4"} />Làm mới</Button>{canManage && canEdit ? <Button variant="outline" onClick={() => setEditOpen(true)}><PencilIcon className="size-4" />Sửa ca</Button> : null}{canManage && shift.status === "SCHEDULED" ? <Button variant="destructive" onClick={() => void cancel()} disabled={busy === "cancel"}><Trash2Icon className="size-4" />Hủy ca</Button> : null}</div></div>
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card><CardContent><p className="text-[0.62rem] font-black uppercase tracking-[0.12em] text-muted-foreground">Bắt đầu</p><p className="mt-2 text-sm font-black">{formatDateTime(shift.startsAt)}</p></CardContent></Card>
        <Card><CardContent><p className="text-[0.62rem] font-black uppercase tracking-[0.12em] text-muted-foreground">Kết thúc</p><p className="mt-2 text-sm font-black">{formatDateTime(shift.endsAt)}</p></CardContent></Card>
        <Card><CardContent><p className="text-[0.62rem] font-black uppercase tracking-[0.12em] text-muted-foreground">Trong ca</p><p className="mt-2 text-2xl font-black">{roster.filter((entry) => entry.status !== "CANCELLED").length}</p><p className="mt-1 text-[0.68rem] text-muted-foreground">{checkedIn} đang trong ca</p></CardContent></Card>
        <Card><CardContent><p className="text-[0.62rem] font-black uppercase tracking-[0.12em] text-muted-foreground">Vắng mặt</p><p className="mt-2 text-2xl font-black">{absentCount}</p><p className="mt-1 text-[0.68rem] text-muted-foreground">đã xác nhận vắng</p></CardContent></Card>
      </div>

      {shift.status === "CANCELLED" ? <Card className="border-amber-500/20"><CardContent className="flex gap-3"><AlertTriangleIcon className="mt-0.5 size-5 shrink-0 text-amber-600" /><div><p className="text-sm font-black">Ca đã bị hủy</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{shift.cancelReason || "Không có lý do."} {shift.cancelledAt ? `· ${formatDateTime(shift.cancelledAt)}` : ""}</p></div></CardContent></Card> : null}

      <Card>
        <CardContent className="p-0">
          <div className="flex items-center justify-between gap-3 border-b px-4 py-4 sm:px-5"><div><p className="text-sm font-black">Danh sách ca & chấm công</p><p className="mt-1 text-xs text-muted-foreground">Nhân viên tự vào ca/ra ca trên ứng dụng; tại đây chỉ quản lý danh sách ca và đánh dấu vắng mặt.</p></div>{canManage && shift.status === "SCHEDULED" ? <Button onClick={() => setAddOpen(true)}><PlusIcon className="size-4" />Thêm nhân sự</Button> : null}</div>
          {roster.length ? <div className="divide-y">{roster.map((entry) => (
            <div key={entry.id} className="grid gap-3 px-4 py-4 sm:grid-cols-[1.2fr_0.8fr_1fr_auto] sm:items-center sm:px-5"><div><div className="flex items-center gap-2"><p className="font-mono text-xs font-black">{entry.employeeCode}</p><span className={`rounded-full border px-2 py-0.5 text-[0.58rem] font-black ${rosterStatusClass(entry.status)}`}>{workforceShiftStatusLabel(entry.status)}</span></div><p className="mt-1 text-[0.68rem] text-muted-foreground">{workforceKindLabel(entry.kind)}</p></div><div><p className="text-[0.68rem] font-bold">Xếp ca</p><p className="mt-1 text-[0.68rem] text-muted-foreground">{formatDateTime(entry.assignedAt)}</p></div><div className="text-[0.68rem] text-muted-foreground">{entry.checkedInAt ? <p>Vào: {formatDateTime(entry.checkedInAt)}</p> : null}{entry.checkedOutAt ? <p>Ra: {formatDateTime(entry.checkedOutAt)}</p> : null}{entry.markedAbsentAt ? <p>Vắng: {formatDateTime(entry.markedAbsentAt)}</p> : null}{entry.note ? <p className="mt-1 line-clamp-2">{entry.note}</p> : null}</div><div className="flex justify-end gap-1">{canManage && shift.status === "SCHEDULED" && entry.status === "SCHEDULED" ? <><Button size="sm" variant="outline" onClick={() => void absent(entry)} disabled={busy === `absent:${entry.workforceMemberId}`}><UserMinusIcon className="size-3.5" />Vắng</Button><Button size="icon" variant="ghost" onClick={() => void remove(entry)} disabled={busy === `remove:${entry.workforceMemberId}`}><Trash2Icon className="size-4" /></Button></> : entry.status === "CHECKED_IN" ? <UserRoundCheckIcon className="size-4 text-emerald-600" /> : null}</div></div>
          ))}</div> : <div className="grid min-h-48 place-items-center p-6 text-center"><div><UsersRoundIcon className="mx-auto size-8 text-muted-foreground" /><p className="mt-3 text-sm font-black">Chưa có ai trong ca</p><p className="mt-1 text-xs text-muted-foreground">Thêm nhân sự đang làm việc thuộc bưu cục này vào ca.</p></div></div>}
        </CardContent>
      </Card>
    </div>
  );
}
