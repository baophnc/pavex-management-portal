// The same rule the backend checks (auth PasswordRules): 8 to 128 characters with at least one
// letter (Vietnamese letters count) and one digit.
export const PASSWORD_HINT = "Dùng 8–128 ký tự, có cả chữ và số.";

/** Why [password] is refused, or null when it is acceptable. */
export function passwordProblem(password: string): string | null {
  if (password.length < 8 || password.length > 128) return "Mật khẩu phải từ 8 đến 128 ký tự.";
  if (!/\p{L}/u.test(password) || !/\d/.test(password)) return "Mật khẩu cần có cả chữ và số.";
  return null;
}
