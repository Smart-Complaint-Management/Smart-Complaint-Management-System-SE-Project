import type { RegistrationFormValues } from "./validateRegistration";

export type RegistrationResult =
  | { ok: true }
  | { ok: false; field: "email"; message: string };

// MOCK DATA: stands in for the database until the Flask backend is connected.
// New registrations are added to this set, so registering the same email twice
// in one session shows the duplicate error.
const mockRegisteredEmails = new Set<string>(["user@example.com", "admin@example.com"]);

export const normalizeEmail = (email: string): string => email.trim().toLowerCase();

export async function registerUser(values: RegistrationFormValues): Promise<RegistrationResult> {
  // TODO: replace with the real Flask call once the endpoint is agreed.
  // The backend must also enforce uniqueness itself (UNIQUE email column,
  // e.g. respond with HTTP 409) because frontend checks can be bypassed.
  await new Promise((resolve) => setTimeout(resolve, 300));

  const email = normalizeEmail(values.email);
  if (mockRegisteredEmails.has(email)) {
    return {
      ok: false,
      field: "email",
      message: "An account with this email already exists. Try logging in instead.",
    };
  }

  mockRegisteredEmails.add(email);
  return { ok: true };
}