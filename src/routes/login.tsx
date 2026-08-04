import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { Loader2, Mail } from "lucide-react";
import { CupolaIcon } from "@/components/app/cupola-logo";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const result = await login(email);
    setLoading(false);
    if (result.error) {
      setError(result.error);
    } else {
      router.navigate({ to: "/" });
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-8">
        {/* brand */}
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--gradient-primary)] ring-4 ring-primary/20">
            <CupolaIcon className="text-white" size={32} />
          </div>
          <div className="text-center">
            <h1 className="font-display text-2xl font-semibold tracking-tight">Lupara</h1>
            <p className="text-sm text-muted-foreground">Event Management — sign in to continue</p>
          </div>
        </div>

        {/* form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground" htmlFor="email">
              Email
            </label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@aiesec.net"
                className="h-10 w-full rounded-lg border border-border bg-card/60 pl-9 pr-3 text-sm placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none"
              />
            </div>
          </div>

          {error && (
            <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[var(--gradient-primary)] text-sm font-medium text-primary-foreground shadow-card transition hover:opacity-90 disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Sign in
          </button>
        </form>

        <p className="text-center text-[11px] text-muted-foreground">
          Access is granted by your admin. Enter your assigned email to sign in.
        </p>
      </div>
    </div>
  );
}
