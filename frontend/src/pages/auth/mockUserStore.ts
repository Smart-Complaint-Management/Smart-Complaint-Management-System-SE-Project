import type { UserRole } from "@/types";
export type { UserRole };

export interface MockUser {
  fullName: string;
  password: string; // MOCK ONLY: the real backend must store a hash, never plain text.
  role: UserRole;
}

export const normalizeEmail = (email: string): string => email.trim().toLowerCase();

// MOCK DATA: stands in for the database until the Flask backend is connected.
const users = new Map<string, MockUser>([
  ["user@example.com", { fullName: "Demo User", password: "User@1234", role: "user" }],
  ["admin@example.com", { fullName: "Demo Admin", password: "Admin@1234", role: "admin" }],
]);

export const hasUser = (email: string): boolean => users.has(normalizeEmail(email));
export const findUser = (email: string): MockUser | undefined => users.get(normalizeEmail(email));
export const addUser = (email: string, user: MockUser): void => {
  users.set(normalizeEmail(email), user);
};