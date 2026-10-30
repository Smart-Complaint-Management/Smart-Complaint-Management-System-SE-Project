import { useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
 import { Link, useLocation, useNavigate } from "react-router-dom";
import { LogIn } from "lucide-react";
import { loginUser } from "./loginService";
import type { LoginValues } from "./loginService";
import { useAuth } from "./authContext";
import { normalizeEmail } from "./mockUserStore";
import { isValidEmail } from "./validateRegistration";


type LoginErrors = Partial<Record<keyof LoginValues, string>>;

const EMPTY_FORM: LoginValues = { email: "", password: "" };

const FIELDS: { name: keyof LoginValues; label: string; type: string }[] = [
  { name: "email", label: "Email", type: "email" },
  { name: "password", label: "Password", type: "password" },
];

function validateLogin(values: LoginValues): LoginErrors {
  const errors: LoginErrors = {};
  if (!values.email.trim()) errors.email = "Email is required.";
  else if (!isValidEmail(values.email)) errors.email = "Enter a valid email address.";
  if (!values.password) errors.password = "Password is required.";
  return errors;
}

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [values, setValues] = useState<LoginValues>(EMPTY_FORM);
  const [errors, setErrors] = useState<LoginErrors>({});
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setValues((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: undefined }));
    setFormError("");
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const found = validateLogin(values);
    setErrors(found);
    setFormError("");
    if (Object.keys(found).length > 0) return;

    setSubmitting(true);
    try {
      const result = await loginUser(values);
      if (!result.ok) {
        setFormError(result.message);
        return;
      }
               login({
           email: normalizeEmail(values.email),
           fullName: result.fullName,
           role: result.role,
         });
         // Return to the page they originally wanted, but never send a normal
         // user to /admin (full role checks come in SCMS-05).
         const from = (location.state as { from?: string } | null)?.from;
         const target =
           from && (result.role === "admin" || !from.startsWith("/admin"))
             ? from
             : result.role === "admin"
               ? "/admin/dashboard"
               : "/overview";
         navigate(target, { replace: true });
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
              <LogIn className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h1 className="text-xl font-semibold text-ink-900">Log in</h1>
              <p className="text-sm text-ink-500">Access your complaints and updates.</p>
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
                  autoComplete={name === "email" ? "email" : "current-password"}
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

            {formError && (
              <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
                {formError}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl bg-accent-500 px-4 py-2 font-medium text-white transition-colors hover:bg-accent-700 focus:outline-none focus:ring-2 focus:ring-accent-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Logging in..." : "Log in"}
            </button>
          </form>

          <p className="mt-4 text-center text-sm text-ink-500">
            Don't have an account?{" "}
            <Link to="/register" className="font-medium text-accent-700 hover:underline">
              Register
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
