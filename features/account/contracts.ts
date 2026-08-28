export type AccountGender = "UNSPECIFIED" | "MALE" | "FEMALE" | "OTHER";

export type CurrentAccountProfile = {
  userId: string;
  email: string;
  status: string;
  profileStatus: string;
  emailVerified: boolean;
  firstName: string | null;
  lastName: string | null;
  displayName: string | null;
  gender: AccountGender;
  dateOfBirth: string | null;
  avatarUrl: string | null;
  roles: string[];
  permissions: string[];
};

export type SessionListItem = {
  sessionId: string;
  ipAddress: string | null;
  userAgent: string | null;
  expiresAt: string;
};
