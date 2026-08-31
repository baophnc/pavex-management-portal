"use client";

import { CalendarClockIcon, GitBranchIcon } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { NetworkLanes } from "@/features/network/lanes";
import { NetworkRouteTemplates } from "@/features/network/route-templates";
import { NetworkPageHeader } from "@/features/network/ui";
import { cn } from "@/lib/utils";

type RouteWorkspace = "lanes" | "journeys";

export function NetworkRoutes({
  initialView = "lanes",
}: {
  initialView?: RouteWorkspace;
}) {
  const [view, setView] = useState<RouteWorkspace>(initialView);

  return (
    <div className="space-y-4">
      <NetworkPageHeader
        eyebrow="Mạng vận chuyển"
        title="Tuyến vận chuyển"
        description="Quản lý chặng vận chuyển, lịch khởi hành và các hành trình ưu tiên trong cùng một không gian làm việc."
        help={{
          description:
            "Một tuyến trực tiếp là một chặng giữa hai điểm trung chuyển. Hành trình ưu tiên ghép nhiều chặng liên tục để hệ thống thử trước khi tự tìm tuyến khác.",
          bullets: [
            "Tạo và chỉnh lịch chạy ngay trong tuyến trực tiếp.",
            "Hành trình ưu tiên chỉ ghép các tuyến đã tồn tại trong mạng lưới.",
            "Backend vẫn giữ riêng tuyến, lịch chạy và hành trình ưu tiên; giao diện chỉ gom chúng theo cách người vận hành sử dụng.",
          ],
        }}
      />

      <Card className="overflow-hidden">
        <CardContent className="p-2">
          <div className="grid gap-2 sm:grid-cols-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setView("lanes")}
              className={cn(
                "h-auto justify-start gap-3 rounded-xl p-3 text-left",
                view === "lanes" && "bg-brand/10 text-brand hover:bg-brand/10",
              )}
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-lg border bg-background">
                <CalendarClockIcon className="size-4" />
              </span>
              <span>
                <span className="block text-xs font-black">Tuyến & lịch chạy</span>
                <span className="mt-0.5 block text-[0.65rem] font-medium text-muted-foreground">
                  Chặng trực tiếp, giờ chạy và sức chứa mỗi chuyến
                </span>
              </span>
            </Button>

            <Button
              type="button"
              variant="ghost"
              onClick={() => setView("journeys")}
              className={cn(
                "h-auto justify-start gap-3 rounded-xl p-3 text-left",
                view === "journeys" && "bg-brand/10 text-brand hover:bg-brand/10",
              )}
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-lg border bg-background">
                <GitBranchIcon className="size-4" />
              </span>
              <span>
                <span className="block text-xs font-black">Hành trình ưu tiên</span>
                <span className="mt-0.5 block text-[0.65rem] font-medium text-muted-foreground">
                  Ghép nhiều chặng thành hành trình vận chuyển hoàn chỉnh
                </span>
              </span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {view === "lanes" ? <NetworkLanes embedded /> : <NetworkRouteTemplates embedded />}
    </div>
  );
}
