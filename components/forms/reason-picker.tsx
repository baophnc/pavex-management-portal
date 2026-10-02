"use client";

import { useState } from "react";

import { cn } from "@/lib/utils";

const OTHER = "__other__";

const controlClass =
  "w-full rounded-md border bg-background px-3 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/15 disabled:opacity-60";

/**
 * Pick a common reason with one tap, or "Khác" to type one. Staff rarely need to write, and the
 * reasons read the same across hubs. The value passed up is the text that gets saved.
 */
export function ReasonPicker({
  reasons,
  value,
  onChange,
  placeholder = "Ghi rõ lý do",
  disabled = false,
  maxLength = 500,
  className,
}: {
  reasons: readonly string[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  maxLength?: number;
  className?: string;
}) {
  const preset = reasons.includes(value);
  const [typing, setTyping] = useState(!preset && value !== "");
  const selected = preset ? value : typing ? OTHER : "";

  return (
    <div className={cn("grid gap-2", className)}>
      <select
        className={cn(controlClass, "h-9 font-semibold")}
        value={selected}
        disabled={disabled}
        aria-label="Chọn lý do"
        onChange={(event) => {
          const next = event.target.value;
          setTyping(next === OTHER);
          onChange(next === OTHER || next === "" ? "" : next);
        }}
      >
        <option value="">Chọn lý do…</option>
        {reasons.map((reason) => (
          <option key={reason} value={reason}>
            {reason}
          </option>
        ))}
        <option value={OTHER}>Khác (tự ghi)</option>
      </select>
      {selected === OTHER ? (
        <textarea
          autoFocus
          className={cn(controlClass, "min-h-20 py-2")}
          value={value}
          maxLength={maxLength}
          disabled={disabled}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : null}
    </div>
  );
}

/** Reasons offered across the console, in the words hub staff use. */
export const REASONS = {
  cashReject: [
    "Thiếu tiền so với khai báo",
    "Thừa tiền so với khai báo",
    "Có tiền giả hoặc tiền rách",
    "Chưa nhận được tiền thực tế",
  ],
  shipmentCancel: [
    "Cửa hàng yêu cầu huỷ",
    "Người gửi đổi ý, không gửi nữa",
    "Hàng cấm hoặc không đủ điều kiện gửi",
    "Tạo trùng đơn",
    "Sai thông tin, cần tạo đơn mới",
  ],
  shipmentReturn: [
    "Người nhận từ chối nhận hàng",
    "Không liên lạc được người nhận",
    "Sai địa chỉ, không tìm được người nhận",
    "Giao không thành công quá số lần cho phép",
    "Cửa hàng yêu cầu hoàn hàng",
  ],
  shipmentForward: [
    "Người nhận đổi địa chỉ giao",
    "Địa chỉ cũ sai, đã xác nhận địa chỉ mới",
    "Người nhận nhờ giao cho người khác",
  ],
  shipmentHold: [
    "Chờ xác minh thông tin người nhận",
    "Hàng có dấu hiệu hư hỏng, cần kiểm tra",
    "Nghi ngờ hàng cấm",
    "Chờ cửa hàng xác nhận",
  ],
  shipmentRelease: ["Đã xác minh xong, giao tiếp", "Cửa hàng đã xác nhận", "Kiểm tra hàng bình thường"],
  invoiceCancel: ["Lập sai hoá đơn", "Cửa hàng đã thanh toán bằng cách khác", "Đối soát lại theo kỳ mới"],
  assignmentCancel: ["Nhân viên nghỉ đột xuất", "Đơn đã được xử lý theo cách khác", "Phân công nhầm việc"],
  workforceStatus: ["Nghỉ phép", "Nghỉ ốm", "Tạm ngưng theo quyết định của quản lý", "Đã nghỉ việc"],
  caseProblemTitle: [
    "Kiện móp, vỡ hoặc rách",
    "Kiện bị ướt",
    "Thiếu kiện so với vận đơn",
    "Kiện nhẹ hơn khai báo, nghi mất hàng bên trong",
    "Nhãn kiện mờ hoặc rách",
    "Quét sai trạng thái, cần kiểm tra lại",
    "Không tìm thấy kiện trong kho",
  ],
  caseUnidentifiedTitle: [
    "Kiện không có nhãn",
    "Nhãn không đọc được",
    "Kiện lạc từ xe trung chuyển",
    "Kiện khách gửi nhầm bưu cục",
  ],
  workforceAssignHub: ["Nhân viên mới", "Hỗ trợ bưu cục thiếu người", "Chuyển công tác", "Tài xế chạy tuyến qua bưu cục này"],
  workforceUnassign: ["Chuyển sang bưu cục khác", "Đã nghỉ việc", "Hết thời gian hỗ trợ bưu cục"],
} as const;
