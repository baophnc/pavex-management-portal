"use client";

import { CheckCheckIcon, LoaderCircleIcon, MailIcon, MailOpenIcon, SendIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { HubName, UserName, useHubDirectory } from "@/features/directory/names";
import {
  announceNotificationsChanged,
  audienceLabels,
  type MessageAudience,
  type MessageOptions,
  notificationErrorMessage,
  notificationsApi,
  type SentMessage,
  timeAgo,
  type UserNotification,
} from "@/features/notifications/api";
import { severityDot } from "@/features/notifications/notification-bell";
import { selectClassName, textareaClassName } from "@/features/pricing/ui";
import { cn } from "@/lib/utils";

type Tab = "inbox" | "send" | "sent";

/** The inbox, and for managers and staff a place to write to their hub or to a shop. */
export function NotificationCenter() {
  const [tab, setTab] = useState<Tab>("inbox");
  const [options, setOptions] = useState<MessageOptions | null>(null);

  useEffect(() => {
    notificationsApi.options().then(setOptions).catch(() => setOptions(null));
  }, []);

  const canSend = Boolean(options && (options.audiences.length > 0 || options.canMessageShops));
  const tabs: [Tab, string][] = canSend ? [["inbox", "Hộp thư"], ["send", "Gửi thông báo"], ["sent", "Đã gửi"]] : [["inbox", "Hộp thư"]];

  return (
    <div className="grid gap-4">
      <div>
        <p className="text-[0.62rem] font-black uppercase tracking-[0.16em] text-brand">Thông báo</p>
        <h1 className="mt-1 text-xl font-black">Thông báo</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Hệ thống tự báo khi có việc mới, việc chờ duyệt hay vận đơn đổi trạng thái.
          {canSend ? " Bạn cũng gửi được thông báo cho mọi người ở bưu cục, hoặc nhắn shop về một vận đơn." : ""}
        </p>
      </div>
      <div className="flex gap-1 border-b">
        {tabs.map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={cn("-mb-px border-b-2 px-3 py-2 text-xs font-black", tab === key ? "border-brand text-brand" : "border-transparent text-muted-foreground hover:text-foreground")}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === "inbox" ? <Inbox /> : null}
      {tab === "send" && options ? <Compose options={options} onSent={() => setTab("sent")} /> : null}
      {tab === "sent" ? <Sent /> : null}
    </div>
  );
}

function Inbox() {
  const router = useRouter();
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [items, setItems] = useState<UserNotification[] | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [unread, setUnread] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);

  const load = useCallback(async (next?: string | null) => {
    const page = await notificationsApi.list(filter, next);
    setItems((current) => (next ? [...(current ?? []), ...page.items] : page.items));
    setCursor(page.nextCursor);
    setUnread(page.unreadCount);
  }, [filter]);

  useEffect(() => {
    const task = window.setTimeout(() => void load().catch(() => setItems([])), 0);
    return () => window.clearTimeout(task);
  }, [load]);

  async function toggle(item: UserNotification) {
    const updated = await notificationsApi.setRead(item.id, !item.isRead).catch(() => null);
    if (!updated) return;
    setItems((current) => current?.map((value) => (value.id === item.id ? updated : value)) ?? null);
    setUnread((value) => value + (updated.isRead ? -1 : 1));
    announceNotificationsChanged();
  }

  async function open(item: UserNotification) {
    if (!item.isRead) await toggle(item);
    if (item.actionUrl && item.actionUrl !== "/notifications") router.push(item.actionUrl);
  }

  async function readAll() {
    await notificationsApi.readAll().catch(() => undefined);
    setItems((current) => current?.map((item) => ({ ...item, isRead: true })) ?? null);
    setUnread(0);
    announceNotificationsChanged();
  }

  return (
    <Card className="divide-y">
      <div className="flex flex-wrap items-center justify-between gap-2 p-3">
        <div className="flex gap-1">
          {(["all", "unread"] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value)}
              className={cn("rounded-full border px-3 py-1 text-xs font-bold", filter === value ? "border-brand bg-brand/10 text-brand" : "hover:bg-muted")}
            >
              {value === "all" ? "Tất cả" : `Chưa đọc (${unread})`}
            </button>
          ))}
        </div>
        {unread ? (
          <Button size="sm" variant="outline" onClick={() => void readAll()}>
            <CheckCheckIcon className="size-3.5" /> Đánh dấu đã đọc hết
          </Button>
        ) : null}
      </div>
      {items === null ? (
        <p className="p-4 text-sm text-muted-foreground">Đang tải…</p>
      ) : items.length === 0 ? (
        <p className="p-6 text-center text-sm text-muted-foreground">{filter === "unread" ? "Bạn đã đọc hết thông báo." : "Chưa có thông báo nào."}</p>
      ) : (
        items.map((item) => (
          <div key={item.id} className={cn("flex gap-3 p-3", !item.isRead && "bg-brand/[0.04]")}>
            <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", item.isRead ? "bg-muted" : severityDot[item.severity])} />
            <button type="button" onClick={() => void open(item)} className="min-w-0 flex-1 text-left">
              <p className={cn("text-sm", item.isRead ? "font-semibold" : "font-black")}>{item.title}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{item.body}</p>
              <p className="mt-1 text-[0.65rem] text-muted-foreground">
                {timeAgo(item.createdAt)}
                {item.senderUserId ? <> · từ <b className="text-foreground"><UserName id={item.senderUserId} /></b></> : null}
              </p>
            </button>
            <Button size="icon" variant="ghost" aria-label={item.isRead ? "Đánh dấu chưa đọc" : "Đánh dấu đã đọc"} onClick={() => void toggle(item)}>
              {item.isRead ? <MailIcon className="size-4" /> : <MailOpenIcon className="size-4" />}
            </Button>
          </div>
        ))
      )}
      {cursor ? (
        <div className="p-3 text-center">
          <Button variant="outline" size="sm" disabled={loadingMore} onClick={() => { setLoadingMore(true); void load(cursor).finally(() => setLoadingMore(false)); }}>
            {loadingMore ? <LoaderCircleIcon className="size-3.5 animate-spin" /> : null} Xem thêm
          </Button>
        </div>
      ) : null}
    </Card>
  );
}

function Compose({ options, onSent }: { options: MessageOptions; onSent: () => void }) {
  const directory = useHubDirectory();
  const hubs = options.allHubs
    ? [...directory.values()].filter((hub) => hub.status === "ACTIVE").map((hub) => hub.id)
    : options.hubIds;
  const [kind, setKind] = useState<"hub" | "shop">(options.audiences.length ? "hub" : "shop");
  const [hubId, setHubId] = useState("");
  const [audience, setAudience] = useState<MessageAudience>(options.audiences[0] ?? "HUB_COURIERS");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [trackingCode, setTrackingCode] = useState("");
  const [sending, setSending] = useState(false);
  const activeHub = hubId || hubs[0] || "";

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSending(true);
    try {
      const sent = kind === "hub"
        ? await notificationsApi.sendToHub({ audience, hubId: activeHub, title: title.trim(), body: body.trim() })
        : await notificationsApi.sendAboutShipment({ trackingCode: trackingCode.trim(), body: body.trim() });
      toast.success(kind === "hub" ? `Đã gửi tới ${sent.recipientCount} người.` : "Đã nhắn shop.");
      setTitle("");
      setBody("");
      setTrackingCode("");
      onSent();
    } catch (reason) {
      toast.error(notificationErrorMessage(reason, "Không gửi được thông báo."));
    } finally {
      setSending(false);
    }
  }

  return (
    <Card className="p-4">
      <form onSubmit={(event) => void submit(event)} className="grid max-w-2xl gap-3">
        <div className="flex gap-2">
          {options.audiences.length ? (
            <button type="button" onClick={() => setKind("hub")} className={cn("rounded-lg border px-3 py-2 text-left text-xs", kind === "hub" ? "border-brand bg-brand/5" : "hover:bg-muted/40")}>
              <p className="font-black">Thông báo cho bưu cục</p>
              <p className="text-muted-foreground">Gửi cho nhân viên, bưu tá hoặc tài xế</p>
            </button>
          ) : null}
          {options.canMessageShops ? (
            <button type="button" onClick={() => setKind("shop")} className={cn("rounded-lg border px-3 py-2 text-left text-xs", kind === "shop" ? "border-brand bg-brand/5" : "hover:bg-muted/40")}>
              <p className="font-black">Nhắn shop về một vận đơn</p>
              <p className="text-muted-foreground">Shop đọc trong hộp thư trên web</p>
            </button>
          ) : null}
        </div>

        {kind === "hub" ? (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1.5 text-xs font-bold">
                Bưu cục
                <select className={selectClassName} value={activeHub} onChange={(event) => setHubId(event.target.value)}>
                  {hubs.map((id) => (
                    <option key={id} value={id}>{directory.get(id) ? `${directory.get(id)!.code} · ${directory.get(id)!.name}` : "Bưu cục"}</option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1.5 text-xs font-bold">
                Gửi cho
                <select className={selectClassName} value={audience} onChange={(event) => setAudience(event.target.value as MessageAudience)}>
                  {options.audiences.map((value) => <option key={value} value={value}>{audienceLabels[value]}</option>)}
                </select>
              </label>
            </div>
            <label className="grid gap-1.5 text-xs font-bold">
              Tiêu đề
              <Input value={title} maxLength={160} placeholder="Ví dụ: Họp đầu ca lúc 7h30" onChange={(event) => setTitle(event.target.value)} />
            </label>
          </>
        ) : (
          <label className="grid gap-1.5 text-xs font-bold">
            Mã vận đơn
            <Input value={trackingCode} placeholder="PAVEX…" className="font-mono uppercase" onChange={(event) => setTrackingCode(event.target.value)} />
          </label>
        )}

        <label className="grid gap-1.5 text-xs font-bold">
          Nội dung
          <textarea className={textareaClassName} value={body} maxLength={1000} rows={4} placeholder={kind === "hub" ? "Nội dung thông báo…" : "Ví dụ: Bưu tá sẽ tới lấy hàng lúc 15h, shop chuẩn bị giúp nhé."} onChange={(event) => setBody(event.target.value)} />
        </label>
        <div>
          <Button type="submit" disabled={sending || !body.trim() || (kind === "hub" ? !title.trim() || !activeHub : !trackingCode.trim())}>
            {sending ? <LoaderCircleIcon className="size-3.5 animate-spin" /> : <SendIcon className="size-3.5" />} Gửi
          </Button>
        </div>
      </form>
    </Card>
  );
}

function Sent() {
  const [items, setItems] = useState<SentMessage[] | null>(null);
  useEffect(() => {
    notificationsApi.sent().then(setItems).catch(() => setItems([]));
  }, []);
  return (
    <Card className="divide-y">
      {items === null ? (
        <p className="p-4 text-sm text-muted-foreground">Đang tải…</p>
      ) : items.length === 0 ? (
        <p className="p-6 text-center text-sm text-muted-foreground">Bạn chưa gửi thông báo nào.</p>
      ) : (
        items.map((item) => (
          <div key={item.id} className="grid gap-1 p-3">
            <p className="text-sm font-black">{item.title}</p>
            <p className="text-xs text-muted-foreground">{item.body}</p>
            <p className="text-[0.65rem] text-muted-foreground">
              {timeAgo(item.createdAt)} · {audienceLabels[item.audience]}
              {item.hubId ? <> · <HubName id={item.hubId} /></> : null}
              {item.trackingCode ? ` · ${item.trackingCode}` : ""} · {item.recipientCount} người nhận
            </p>
          </div>
        ))
      )}
    </Card>
  );
}
