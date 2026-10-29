import { loginRequest } from '@/services/authApi';
import type { UserRole } from '@/types';

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
  try {
    const user = await loginRequest(values.email, values.password);
    return { ok: true, role: user.role, fullName: user.fullName };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : 'Unable to log in.' };
  }
}
