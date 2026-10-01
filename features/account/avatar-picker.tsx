"use client";

import { CameraIcon, LoaderCircleIcon } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { ApiError, apiRequest } from "@/lib/api/client";
import { cn } from "@/lib/utils";

const MAX_BYTES = 2 * 1024 * 1024;
const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];

/**
 * Shows a profile photo and replaces it with a picked image. The photo is stored by the backend
 * (MinIO); [uploadPath] is the API path, e.g. "auth/me/avatar" or "users/<id>/avatar".
 */
export function AvatarPicker<T>({
  avatarUrl,
  initials,
  uploadPath,
  disabled = false,
  onUploaded,
}: {
  avatarUrl: string | null | undefined;
  initials: string;
  uploadPath: string;
  disabled?: boolean;
  onUploaded: (response: T) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function upload(file: File) {
    if (!ACCEPTED.includes(file.type)) {
      toast.error("Chỉ nhận ảnh JPG, PNG hoặc WEBP.");
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error("Ảnh đại diện phải nhỏ hơn 2 MB.");
      return;
    }
    const body = new FormData();
    body.append("file", file);
    setUploading(true);
    try {
      onUploaded(await apiRequest<T>(uploadPath, { method: "POST", body }));
      toast.success("Đã cập nhật ảnh đại diện.");
    } catch (reason) {
      toast.error(reason instanceof ApiError ? reason.message : "Không thể tải ảnh lên.");
    } finally {
      setUploading(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <div className="flex items-center gap-3">
      <span className="relative grid size-16 shrink-0 place-items-center overflow-hidden rounded-full border bg-brand/10 text-lg font-black text-brand">
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- served by the Pavex gateway, not a Next.js image source
          <img src={avatarUrl} alt="Ảnh đại diện" className="size-full object-cover" />
        ) : (
          initials
        )}
        {uploading ? (
          <span className="absolute inset-0 grid place-items-center bg-black/40">
            <LoaderCircleIcon className="size-5 animate-spin text-white" />
          </span>
        ) : null}
      </span>
      <div>
        <button
          type="button"
          disabled={disabled || uploading}
          onClick={() => input.current?.click()}
          className={cn(
            "inline-flex h-8 items-center gap-1.5 rounded-md border px-3 text-xs font-bold transition hover:bg-muted",
            (disabled || uploading) && "pointer-events-none opacity-60",
          )}
        >
          <CameraIcon className="size-3.5" />
          {avatarUrl ? "Đổi ảnh" : "Tải ảnh lên"}
        </button>
        <p className="mt-1 text-[0.65rem] text-muted-foreground">JPG, PNG hoặc WEBP, tối đa 2 MB.</p>
      </div>
      <input
        ref={input}
        type="file"
        accept={ACCEPTED.join(",")}
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void upload(file);
        }}
      />
    </div>
  );
}
