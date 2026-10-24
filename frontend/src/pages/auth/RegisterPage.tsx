import { useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { UserPlus } from "lucide-react";
import { validateRegistration } from "./validateRegistration";
import type { RegistrationErrors, RegistrationFormValues } from "./validateRegistration";
import { registerUser } from "./registrationService";

const EMPTY_FORM: RegistrationFormValues = {
  fullName: "",
  email: "",
  password: "",
  confirmPassword: "",
};

const FIELDS: { name: keyof RegistrationFormValues; label: string; type: string }[] = [
  { name: "fullName", label: "Full name", type: "text" },
  { name: "email", label: "Email", type: "email" },
  { name: "password", label: "Password", type: "password" },
  { name: "confirmPassword", label: "Confirm password", type: "password" },
];

export function RegisterPage() {
  const [values, setValues] = useState<RegistrationFormValues>(EMPTY_FORM);
  const [errors, setErrors] = useState<RegistrationErrors>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setValues((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: undefined }));
    setSubmitted(false);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const found = validateRegistration(values);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSubmitting(true);
    try {
      const result = await registerUser(values);
      if (!result.ok) {
        setErrors({ [result.field]: result.message });
        return;
      }
      setSubmitted(true);
      setValues(EMPTY_FORM);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4 py-10">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-ink-200 bg-surface-card p-6 shadow-card">
          <div className="mb-6 flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-50 text-accent-700">
              <UserPlus className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h1 className="text-xl font-semibold text-ink-900">Create an account</h1>
              <p className="text-sm text-ink-500">Register to lodge and track complaints.</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {FIELDS.map(({ name, label, type }) => (
              <div key={name}>
                <label htmlFor={name} className="mb-1 block text-sm font-medium text-ink-700">
                  {label}
                </label>
                <input
                  id={name}
                  name={name}
                  type={type}
                  value={values[name]}
                  onChange={handleChange}
                  aria-invalid={errors[name] ? true : undefined}
                  aria-describedby={errors[name] ? `${name}-error` : undefined}
                  className={`w-full rounded-xl border bg-white px-3 py-2 text-ink-900 focus:outline-none focus:ring-2 focus:ring-accent-400 ${
                    errors[name] ? "border-red-400" : "border-ink-200"
                  }`}
                />
                {errors[name] && (
                  <p id={`${name}-error`} className="mt-1 text-sm text-red-600">
                    {errors[name]}
                  </p>
                )}
              </div>
            ))}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl bg-accent-500 px-4 py-2 font-medium text-white transition-colors hover:bg-accent-700 focus:outline-none focus:ring-2 focus:ring-accent-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Registering..." : "Register"}
            </button>

            {submitted && (
              <p role="status" className="rounded-xl bg-accent-50 px-3 py-2 text-sm text-accent-800">
                Account created (demo). Saving to the database will be connected to the backend later.
              </p>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}