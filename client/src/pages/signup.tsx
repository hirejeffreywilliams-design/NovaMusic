import { useState } from "react";
import { useLocation } from "wouter";
import { Disc3, ArrowLeft, ExternalLink, CheckCircle, User, Music } from "lucide-react";

export default function SignupPage() {
  const [, navigate] = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [accountType, setAccountType] = useState<"dj" | "artist">("dj");
  const [tosAcknowledged, setTosAcknowledged] = useState(false);
  const [venueLicenseAcknowledged, setVenueLicenseAcknowledged] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!tosAcknowledged) {
      setError("You must agree to the Terms of Service.");
      return;
    }
    if (accountType === "dj" && !venueLicenseAcknowledged) {
      setError("DJs must acknowledge their venue licensing responsibilities.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, accountType, tosAcknowledged, venueLicenseAcknowledged }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Registration failed.");
        return;
      }
      setSuccess(true);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-[#0a0519] text-white flex items-center justify-center px-6">
        <div className="text-center max-w-md">
          <CheckCircle className="w-16 h-16 text-[#30d158] mx-auto mb-4" />
          <h2 className="text-2xl font-black mb-2">Account Created!</h2>
          <p className="text-white/60 text-sm mb-6">Your {accountType === "artist" ? "Artist" : "DJ"} account for <strong className="text-white">{username}</strong> has been created successfully.</p>
          <div className="flex gap-3 justify-center">
            {accountType === "artist" ? (
              <button onClick={() => navigate("/artist/dashboard")} className="px-6 py-3 rounded-xl font-bold text-sm text-white transition-all hover:scale-[1.02]" style={{ background: "linear-gradient(135deg, #bf5af2, #0af)" }} data-testid="button-go-to-dashboard">
                Go to Artist Dashboard
              </button>
            ) : (
              <button onClick={() => navigate("/console")} className="px-6 py-3 rounded-xl font-bold text-sm text-white transition-all hover:scale-[1.02]" style={{ background: "linear-gradient(135deg, #bf5af2, #0af)" }} data-testid="button-go-to-console">
                Open DJ Console
              </button>
            )}
            <button onClick={() => navigate("/")} className="px-6 py-3 rounded-xl font-bold text-sm text-white/60 hover:text-white bg-white/5 hover:bg-white/10 transition-all" data-testid="button-go-home">
              Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0519] text-white">
      <header className="flex items-center gap-3 px-6 py-4 border-b border-white/10">
        <button onClick={() => navigate("/")} className="p-2 rounded-lg hover:bg-white/5 transition-colors" data-testid="button-back-home">
          <ArrowLeft className="w-5 h-5 text-white/60" />
        </button>
        <Disc3 className="w-6 h-6 text-[#bf5af2]" />
        <h1 className="text-lg font-black tracking-wider text-[#bf5af2]">CREATE ACCOUNT</h1>
      </header>

      <main className="max-w-lg mx-auto px-6 py-10">
        <h2 className="text-2xl font-black mb-2" style={{ fontFamily: "'Oxanium', sans-serif", background: "linear-gradient(135deg, #e879f9, #818cf8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Join Nova Music</h2>
        <p className="text-white/50 text-sm mb-8">Create a free account to unlock all features.</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-white/50">Account Type</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setAccountType("dj")}
                className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${accountType === "dj" ? "border-[#bf5af2] bg-[#bf5af2]/10" : "border-white/10 bg-white/5 hover:bg-white/10"}`}
                data-testid="button-account-type-dj"
              >
                <User className={`w-5 h-5 ${accountType === "dj" ? "text-[#bf5af2]" : "text-white/40"}`} />
                <div className="text-left">
                  <p className={`text-sm font-bold ${accountType === "dj" ? "text-white" : "text-white/60"}`}>DJ</p>
                  <p className="text-[10px] text-white/40">Mix & perform</p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setAccountType("artist")}
                className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${accountType === "artist" ? "border-[#ffd60a] bg-[#ffd60a]/10" : "border-white/10 bg-white/5 hover:bg-white/10"}`}
                data-testid="button-account-type-artist"
              >
                <Music className={`w-5 h-5 ${accountType === "artist" ? "text-[#ffd60a]" : "text-white/40"}`} />
                <div className="text-left">
                  <p className={`text-sm font-bold ${accountType === "artist" ? "text-white" : "text-white/60"}`}>Artist</p>
                  <p className="text-[10px] text-white/40">Upload & earn</p>
                </div>
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-white/50">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-white/20 focus:outline-none focus:border-[#bf5af2]/60 transition-colors"
                placeholder="Choose a username"
                data-testid="input-username"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-white/50">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-white/20 focus:outline-none focus:border-[#bf5af2]/60 transition-colors"
                placeholder="Create a password"
                data-testid="input-password"
              />
            </div>
          </div>

          <div className="space-y-4 pt-2">
            <p className="text-xs font-bold uppercase tracking-wider text-white/50">Legal Acknowledgments</p>

            {accountType === "dj" && (
              <label className="flex items-start gap-3 bg-[#0af]/5 border border-[#0af]/20 rounded-xl p-4 cursor-pointer hover:bg-[#0af]/10 transition-colors" data-testid="label-venue-license-ack">
                <input
                  type="checkbox"
                  checked={venueLicenseAcknowledged}
                  onChange={(e) => setVenueLicenseAcknowledged(e.target.checked)}
                  className="mt-0.5 shrink-0 accent-[#0af] w-4 h-4"
                  data-testid="checkbox-venue-license"
                />
                <span className="text-xs text-white/70 leading-relaxed">
                  I understand that public performance of music at venues requires a license from{" "}
                  <a href="https://www.ascap.com" target="_blank" rel="noopener noreferrer" className="text-[#0af] hover:underline" onClick={(e) => e.stopPropagation()}>ASCAP</a>,{" "}
                  <a href="https://www.bmi.com" target="_blank" rel="noopener noreferrer" className="text-[#0af] hover:underline" onClick={(e) => e.stopPropagation()}>BMI</a>, or{" "}
                  <a href="https://www.sesac.com" target="_blank" rel="noopener noreferrer" className="text-[#0af] hover:underline" onClick={(e) => e.stopPropagation()}>SESAC</a>,{" "}
                  and that it is my and/or my venue's responsibility to hold that license. DJ Hybrid does not remit performance royalties on my behalf.
                </span>
              </label>
            )}

            <label className="flex items-start gap-3 bg-[#bf5af2]/5 border border-[#bf5af2]/20 rounded-xl p-4 cursor-pointer hover:bg-[#bf5af2]/10 transition-colors" data-testid="label-tos-ack">
              <input
                type="checkbox"
                checked={tosAcknowledged}
                onChange={(e) => setTosAcknowledged(e.target.checked)}
                className="mt-0.5 shrink-0 accent-[#bf5af2] w-4 h-4"
                data-testid="checkbox-tos"
              />
              <span className="text-xs text-white/70 leading-relaxed">
                I agree to the{" "}
                <button type="button" onClick={() => navigate("/terms")} className="text-[#bf5af2] hover:underline">Terms of Service</button>
                {accountType === "artist" && (
                  <>, including that I own the rights to any music I upload and that DJ Hybrid is not a PRO and does not remit performance royalties on my behalf.</>
                )}
              </span>
            </label>
          </div>

          {error && (
            <div className="bg-[#ff453a]/10 border border-[#ff453a]/30 rounded-xl p-3 text-[#ff453a] text-sm" data-testid="text-error-message">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 rounded-xl font-black text-white text-sm transition-all hover:scale-[1.01] disabled:opacity-50 disabled:scale-100"
            style={{ background: "linear-gradient(135deg, #bf5af2, #0af)" }}
            data-testid="button-submit-signup"
          >
            {loading ? "Creating Account..." : "Create Account"}
          </button>

          <p className="text-center text-white/30 text-xs">
            By creating an account you agree to our{" "}
            <button type="button" onClick={() => navigate("/terms")} className="text-white/50 hover:text-white underline underline-offset-2">Terms of Service</button>
            {" "}and acknowledge our{" "}
            <button type="button" onClick={() => navigate("/compliance")} className="text-white/50 hover:text-white underline underline-offset-2">Compliance resources</button>.
          </p>
        </form>
      </main>
    </div>
  );
}
