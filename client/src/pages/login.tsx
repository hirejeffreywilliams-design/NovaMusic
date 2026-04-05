import { useState } from "react";
import { useLocation } from "wouter";
import { Music, Lock, User, AlertCircle } from "lucide-react";

export default function LoginPage() {
  const [, navigate] = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Invalid username or password.");
        return;
      }

      localStorage.setItem("user", JSON.stringify(data.user ?? data));
      navigate("/");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ backgroundColor: "#0a0a0a" }}
    >
      {/* Card */}
      <div
        className="w-full max-w-md rounded-2xl p-8"
        style={{
          backgroundColor: "rgba(17, 17, 17, 0.8)",
          border: "1px solid #1e1e1e",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4)",
        }}
      >
        {/* Branding */}
        <div className="flex flex-col items-center mb-8">
          <div
            className="w-14 h-14 rounded-xl flex items-center justify-center mb-4"
            style={{
              background: "linear-gradient(135deg, #0EA5E9, #06B6D4)",
            }}
          >
            <Music className="w-7 h-7 text-white" />
          </div>
          <h1
            className="text-2xl font-black tracking-wider"
            style={{
              background: "linear-gradient(135deg, #0EA5E9, #06B6D4)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            NovaMusic
          </h1>
          <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>
            Sign in to your account
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Username */}
          <div className="space-y-1.5">
            <label
              className="text-xs font-bold uppercase tracking-wider"
              style={{ color: "rgba(255,255,255,0.5)" }}
            >
              Username
            </label>
            <div className="relative">
              <User
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                style={{ color: "rgba(255,255,255,0.3)" }}
              />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                placeholder="Enter your username"
                className="w-full rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none transition-colors"
                style={{
                  backgroundColor: "rgba(255,255,255,0.05)",
                  border: "1px solid #1e1e1e",
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "#0EA5E9")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "#1e1e1e")}
                data-testid="input-username"
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label
              className="text-xs font-bold uppercase tracking-wider"
              style={{ color: "rgba(255,255,255,0.5)" }}
            >
              Password
            </label>
            <div className="relative">
              <Lock
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                style={{ color: "rgba(255,255,255,0.3)" }}
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Enter your password"
                className="w-full rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none transition-colors"
                style={{
                  backgroundColor: "rgba(255,255,255,0.05)",
                  border: "1px solid #1e1e1e",
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "#0EA5E9")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "#1e1e1e")}
                data-testid="input-password"
              />
            </div>
          </div>

          {/* Error */}
          {error && (
            <div
              className="flex items-center gap-2 rounded-xl p-3 text-sm"
              style={{
                backgroundColor: "rgba(239, 68, 68, 0.1)",
                border: "1px solid rgba(239, 68, 68, 0.3)",
                color: "#ef4444",
              }}
              data-testid="text-error-message"
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl font-bold text-sm text-white transition-all hover:scale-[1.01] disabled:opacity-50 disabled:scale-100"
            style={{ backgroundColor: "#0EA5E9" }}
            data-testid="button-submit-login"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        {/* Signup link */}
        <p
          className="text-center text-sm mt-6"
          style={{ color: "rgba(255,255,255,0.4)" }}
        >
          Don't have an account?{" "}
          <button
            type="button"
            onClick={() => navigate("/signup")}
            className="font-semibold hover:underline underline-offset-2 transition-colors"
            style={{ color: "#0EA5E9" }}
            data-testid="link-signup"
          >
            Create one
          </button>
        </p>
      </div>
    </div>
  );
}
