import "server-only";

import { NextResponse, type NextRequest } from "next/server";
import { backendFetch, readBackendPayload } from "@/lib/api/backend";
import { asRecord, parseBackendProblem } from "@/lib/api/problem";
import { passwordProblem } from "@/lib/auth/password-policy";
import { clearSession } from "@/lib/auth/session";

/** Forgot password, reset password, and accepting an invitation (which also sets the first password). */
export async function recoverPassword(request: NextRequest, action: "forgot-password" | "reset-password" | "accept-invite") {
  const json = (payload: object, status = 200) => NextResponse.json(payload, {
    status,
    headers: { "cache-control": "no-store", "referrer-policy": "no-referrer" },
  });
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) {
    return json({ message: "Nguồn yêu cầu không hợp lệ." }, 403);
  }
  const input = asRecord(await request.json().catch(() => null));
  if (!input) return json({ message: "Dữ liệu không hợp lệ." }, 400);
  let body: object;
  if (action === "forgot-password") {
    const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 255) {
      return json({ message: "Vui lòng nhập email hợp lệ." }, 400);
    }
    body = { email, portal: "MANAGEMENT" };
  } else {
    const token = typeof input.token === "string" ? input.token.trim() : "";
    const newPassword = typeof input.newPassword === "string" ? input.newPassword : "";
    if (!token || token.length > 512) {
      return json({ message: "Liên kết không hợp lệ. Hãy yêu cầu liên kết mới." }, 400);
    }
    const problem = passwordProblem(newPassword);
    if (problem) return json({ message: problem }, 400);
    body = action === "accept-invite" ? { token, password: newPassword } : { token, newPassword };
  }
  try {
    const response = await backendFetch(`/api/v1/auth/${action}`, { method: "POST", body: JSON.stringify(body) });
    if (response.ok) {
      const result = json({ success: true, message: action === "forgot-password"
        ? "Nếu email có tài khoản, bạn sẽ nhận được liên kết đặt mật khẩu. Hãy kiểm tra hộp thư và thư rác."
        : action === "accept-invite"
          ? "Đã kích hoạt tài khoản. Bạn có thể đăng nhập bằng mật khẩu vừa đặt."
          : "Đã đặt mật khẩu và xác minh email. Bạn có thể đăng nhập bằng mật khẩu mới." });
      if (action !== "forgot-password") clearSession(result);
      return result;
    }
    const problem = parseBackendProblem(await readBackendPayload(response));
    const status = response.status >= 400 && response.status <= 599 ? response.status : 502;
    const message = status === 429 ? "Bạn đã yêu cầu quá nhiều lần. Vui lòng chờ rồi thử lại."
      : status >= 500 ? "Dịch vụ đang gián đoạn. Vui lòng thử lại sau."
      : action === "accept-invite" ? "Lời mời đã hết hạn, đã được dùng hoặc không hợp lệ. Hãy nhờ quản trị viên gửi lại lời mời."
      : action === "reset-password" ? "Liên kết đã hết hạn, đã được sử dụng hoặc không hợp lệ. Hãy yêu cầu liên kết mới."
      : "Không thể gửi yêu cầu. Vui lòng kiểm tra email và thử lại.";
    const result = json({ code: problem.code, message }, status);
    const retryAfter = response.headers.get("retry-after");
    if (retryAfter) result.headers.set("retry-after", retryAfter);
    return result;
  } catch {
    return json({ message: "Không thể kết nối máy chủ PAVEX. Vui lòng thử lại sau." }, 502);
  }
}
