import { Link } from "wouter";

export function AppFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="w-full border-t border-white/5 bg-[#0a0519]/80 backdrop-blur-sm">
      <div className="max-w-5xl mx-auto px-6 py-6 space-y-4">
        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[11px] text-white/35">
          <Link href="/privacy" className="hover:text-white/60 transition-colors" data-testid="link-footer-privacy">
            Privacy Policy
          </Link>
          <span className="text-white/15">·</span>
          <Link href="/terms" className="hover:text-white/60 transition-colors" data-testid="link-footer-terms">
            Terms of Service
          </Link>
          <span className="text-white/15">·</span>
          <Link href="/dmca" className="hover:text-white/60 transition-colors" data-testid="link-footer-dmca">
            DMCA Policy
          </Link>
          <span className="text-white/15">·</span>
          <Link href="/compliance" className="hover:text-white/60 transition-colors" data-testid="link-footer-compliance">
            Compliance Center
          </Link>
          <span className="text-white/15">·</span>
          <Link href="/pricing" className="hover:text-white/60 transition-colors" data-testid="link-footer-pricing">
            Pricing
          </Link>
        </div>

        <div className="text-center text-[10px] text-white/20 space-y-1">
          <div data-testid="text-copyright">© {year} DJ Hybrid. All rights reserved.</div>
          <div className="text-white/15" data-testid="text-not-affiliated">
            Not affiliated with Apple Inc., Spotify AB, Google LLC, or SoundCloud Limited.
          </div>
        </div>
      </div>
    </footer>
  );
}
