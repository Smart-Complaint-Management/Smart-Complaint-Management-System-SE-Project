import type { RegistrationFormValues } from "./validateRegistration";
import { registerRequest } from '@/services/authApi';
export type RegistrationResult =
  | { ok: true }
  | { ok: false; field: "fullName" | "email" | "password"; message: string }
  | { ok: false; message: string };

export const normalizeEmail = (email: string): string => email.trim().toLowerCase();

export async function registerUser(values: RegistrationFormValues): Promise<RegistrationResult> {
  try {
    await registerRequest(values.fullName, normalizeEmail(values.email), values.password);
    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not register.';
    const field = error && typeof error === 'object' && 'field' in error
      ? error.field
      : undefined;
    if (field === 'fullName' || field === 'email' || field === 'password') {
      return { ok: false, field, message };
    }
    return { ok: false, message };
  }
}
