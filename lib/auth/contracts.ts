export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  /** The account still has the temporary password an administrator issued. */
  passwordChangeRequired: boolean;
};

export type CurrentUser = {
  userId: string;
  email: string;
  displayName: string | null;
  roles: string[];
  permissions: string[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseAuthTokens(value: unknown): AuthTokens | null {
  if (
    !isRecord(value) ||
    typeof value.accessToken !== "string" ||
    typeof value.refreshToken !== "string" ||
    typeof value.expiresIn !== "number"
  )
    return null;

  return {
    accessToken: value.accessToken,
    refreshToken: value.refreshToken,
    expiresIn: value.expiresIn,
    passwordChangeRequired: value.passwordChangeRequired === true,
  };
}

export function parseCurrentUser(value: unknown): CurrentUser | null {
  if (
    !isRecord(value) ||
    typeof value.userId !== "string" ||
    typeof value.email !== "string"
  )
    return null;

  return {
    userId: value.userId,
    email: value.email,
    displayName:
      typeof value.displayName === "string" ? value.displayName : null,
    roles: Array.isArray(value.roles)
      ? value.roles.filter((item): item is string => typeof item === "string")
      : [],
    permissions: Array.isArray(value.permissions)
      ? value.permissions.filter(
          (item): item is string => typeof item === "string",
        )
      : [],
  };
}
