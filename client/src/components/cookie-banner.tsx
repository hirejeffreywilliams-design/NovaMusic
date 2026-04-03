import { useState, useEffect } from "react";
import { Link } from "wouter";

const COOKIE_KEY = "dj_hybrid_cookie_accepted";

export function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const accepted = localStorage.getItem(COOKIE_KEY);
    if (!accepted) setVisible(true);
  }, []);

  const accept = () => {
    localStorage.setItem(COOKIE_KEY, "1");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 p-4 flex items-center justify-between gap-4 bg-[#0a0519]/95 border-t border-white/10 backdrop-blur-xl"
      data-testid="banner-cookie"
    >
      <p className="text-[11px] text-white/50 flex-1">
        We use cookies and similar technologies to operate this platform. By continuing to use DJ Hybrid, you acknowledge our use of data as described in our{" "}
        <Link href="/privacy" className="text-[#bf5af2] hover:underline" data-testid="link-cookie-privacy">
          Privacy Policy
        </Link>.
      </p>
      <div className="flex items-center gap-2 shrink-0">
        <Link href="/privacy" className="text-[10px] text-white/30 hover:text-white/50 transition-colors px-3 py-2 rounded-lg" data-testid="link-cookie-learn-more">
          Learn More
        </Link>
        <button
          onClick={accept}
          className="text-[11px] font-black text-white px-4 py-2 rounded-xl transition-all"
          style={{ background: "linear-gradient(135deg, #bf5af2, #0af)" }}
          data-testid="button-cookie-accept"
        >
          Accept
        </button>
      </div>
    </div>
  );
}
