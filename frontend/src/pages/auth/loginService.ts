import { findUser } from "./mockUserStore";
import type { UserRole } from "./mockUserStore";

export interface LoginValues {
  email: string;
  password: string;
}

export type LoginResult =
  | { ok: true; role: UserRole; fullName: string }
  | { ok: false; message: string };

export async function loginUser(values: LoginValues): Promise<LoginResult> {
  // TODO: replace with the real Flask login call once the endpoint is agreed.
  // The backend should issue the session/token; this mock does not create one.
  await new Promise((resolve) => setTimeout(resolve, 300));

  const user = findUser(values.email);
  // One generic message on purpose: do not reveal whether the email or the password was wrong.
  if (!user || user.password !== values.password) {
    return { ok: false, message: "Invalid email or password." };
  }
  return { ok: true, role: user.role, fullName: user.fullName };
}