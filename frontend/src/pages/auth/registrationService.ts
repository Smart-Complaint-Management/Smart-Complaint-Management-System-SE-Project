import type { RegistrationFormValues } from "./validateRegistration";
import { registerRequest } from '@/services/authApi';
export type RegistrationResult =
  | { ok: true }
  | { ok: false; field: "email"; message: string };

export const normalizeEmail = (email: string): string => email.trim().toLowerCase();

export async function registerUser(values: RegistrationFormValues): Promise<RegistrationResult> {
  try {
    await registerRequest(values.fullName, normalizeEmail(values.email), values.password);
    return { ok: true };
  } catch (error) {
    return { ok: false, field: 'email', message: error instanceof Error ? error.message : 'Could not register.' };
  }
}
