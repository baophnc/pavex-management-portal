"use client";

import {
  AlertTriangleIcon,
  CheckCircle2Icon,
  CircleDashedIcon,
  LoaderCircleIcon,
  RotateCcwIcon,
  XCircleIcon,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  demoResetErrorMessage,
  demoResetSteps,
  isDemoResetDisabled,
  runDemoResetStep,
} from "@/features/demo-reset/api";

const CONFIRMATION = "DAT LAI";

type StepState =
  | { status: "idle" }
  | { status: "running" }
  | { status: "done"; tables: number; messages: number }
  | { status: "failed"; message: string };

const idle = (): Record<string, StepState> =>
  Object.fromEntries(demoResetSteps.map((step) => [step.key, { status: "idle" }]));

export function DemoReset() {
  const [confirmation, setConfirmation] = useState("");
  const [running, setRunning] = useState(false);
  const [disabled, setDisabled] = useState(false);
  const [states, setStates] = useState<Record<string, StepState>>(idle);

  const confirmed = confirmation.trim().toUpperCase() === CONFIRMATION;

  async function reset() {
    setRunning(true);
    setDisabled(false);
    setStates(idle());
    let failures = 0;

    for (const step of demoResetSteps) {
      setStates((current) => ({ ...current, [step.key]: { status: "running" } }));
      try {
        const result = await runDemoResetStep(step);
        setStates((current) => ({
          ...current,
          [step.key]: { status: "done", tables: result.clearedTables.length, messages: result.purgedMessages },
        }));
      } catch (reason) {
        // Nothing is switched on: stop before touching the other services.
        if (step === demoResetSteps[0] && isDemoResetDisabled(reason)) {
          setDisabled(true);
          setStates(idle());
          setRunning(false);
          return;
        }
        failures += 1;
        setStates((current) => ({ ...current, [step.key]: { status: "failed", message: demoResetErrorMessage(reason) } }));
      }
    }

    setRunning(false);
    setConfirmation("");
    if (failures === 0) {
      toast.success("Đã đặt lại dữ liệu thử. Có thể tạo đơn và quét lại từ đầu.");
    } else {
      toast.error(`Còn ${failures} phần chưa đặt lại được. Kiểm tra service rồi bấm đặt lại lần nữa.`);
    }
  }

  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-xl border bg-card">
        <div className="border-b bg-gradient-to-br from-brand/[0.08] via-card to-card p-4 sm:p-5">
          <p className="text-[0.62rem] font-black uppercase tracking-[0.16em] text-brand">Giả lập</p>
          <h1 className="mt-1 text-xl font-black tracking-tight sm:text-2xl">Đặt lại dữ liệu thử</h1>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">
            Xoá mọi vận đơn và những gì phát sinh từ chúng, để chạy lại từ đầu: cửa hàng tạo đơn, bưu cục nhập kho,
            tài xế quét lên xe trên app và theo dõi GPS. Chỉ dùng khi chạy thử ở máy local.
          </p>
        </div>
      </section>

      {disabled ? (
        <div className="flex gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-sm leading-6 text-amber-800 dark:text-amber-200">
          <AlertTriangleIcon className="mt-0.5 size-4 shrink-0" />
          <p>
            Backend chưa bật chức năng này. Thêm <code className="font-mono">PAVEX_DEMO_RESET_ENABLED=true</code> vào
            file <code className="font-mono">.env</code> của pavex-backend rồi chạy lại <code className="font-mono">./scripts/dev-up.sh</code>.
          </p>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardContent className="space-y-2">
            <p className="text-sm font-black">Sẽ bị xoá</p>
            <ul className="space-y-2">
              {demoResetSteps.map((step) => (
                <StepRow key={step.key} label={step.label} state={states[step.key]} />
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-3">
            <p className="text-sm font-black">Được giữ nguyên</p>
            <p className="text-sm leading-6 text-muted-foreground">
              Tài khoản và mật khẩu, cửa hàng và điểm lấy hàng, bưu cục, tuyến, lịch chạy, bảng giá, nhân sự, ca làm và
              trạng thái vào ca, tài khoản nhận tiền của cửa hàng, đồng ý chia sẻ vị trí của tài xế. Không ai bị đăng xuất.
            </p>
            <p className="text-sm leading-6 text-muted-foreground">
              App tài xế đang gửi GPS cho một chuyến sẽ tự dừng khi chuyến đó không còn. Kéo xuống để tải lại danh sách việc.
            </p>
            <div className="space-y-2 border-t pt-3">
              <label htmlFor="demo-reset-confirmation" className="text-xs font-bold">
                Gõ <span className="font-mono">{CONFIRMATION}</span> để xác nhận
              </label>
              <Input
                id="demo-reset-confirmation"
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                placeholder={CONFIRMATION}
                autoComplete="off"
                className="font-mono uppercase"
                disabled={running}
              />
              <Button variant="destructive" onClick={() => void reset()} disabled={!confirmed || running} className="w-full">
                {running ? <LoaderCircleIcon className="size-4 animate-spin" /> : <RotateCcwIcon className="size-4" />}
                {running ? "Đang đặt lại…" : "Đặt lại dữ liệu thử"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StepRow({ label, state }: { label: string; state: StepState }) {
  return (
    <li className="flex items-start gap-2 rounded-lg border bg-muted/15 p-2.5 text-sm">
      {state.status === "running" ? (
        <LoaderCircleIcon className="mt-0.5 size-4 shrink-0 animate-spin text-brand" />
      ) : state.status === "done" ? (
        <CheckCircle2Icon className="mt-0.5 size-4 shrink-0 text-emerald-600" />
      ) : state.status === "failed" ? (
        <XCircleIcon className="mt-0.5 size-4 shrink-0 text-destructive" />
      ) : (
        <CircleDashedIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      )}
      <div className="min-w-0">
        <p className="font-semibold">{label}</p>
        {state.status === "done" ? (
          <p className="text-xs text-muted-foreground">
            Đã xoá {state.tables} bảng{state.messages > 0 ? `, bỏ ${state.messages} sự kiện đang chờ` : ""}
          </p>
        ) : null}
        {state.status === "failed" ? <p className="text-xs text-destructive">{state.message}</p> : null}
      </div>
    </li>
  );
}
