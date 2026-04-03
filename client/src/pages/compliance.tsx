import { useLocation } from "wouter";
import { ArrowLeft, Shield, Scale, AlertTriangle, ExternalLink, Music, FileText, Info } from "lucide-react";

export default function CompliancePage() {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen bg-[#0a0519] text-white">
      <header className="flex items-center gap-3 px-6 py-4 border-b border-white/10">
        <button onClick={() => navigate("/")} className="p-2 rounded-lg hover:bg-white/5 transition-colors" data-testid="button-back-home">
          <ArrowLeft className="w-5 h-5 text-white/60" />
        </button>
        <Shield className="w-6 h-6 text-[#0af]" />
        <h1 className="text-lg font-black tracking-wider text-[#0af]">COMPLIANCE CENTER</h1>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10 space-y-10">
        <div className="text-center">
          <h2 className="text-3xl font-black text-white mb-3">Music Rights & Performance Compliance</h2>
          <p className="text-white/50 text-sm leading-relaxed max-w-xl mx-auto">
            Plain-English explanations of music rights as they relate to DJs, venues, and our Artist Marketplace. This is informational only — not legal advice.
          </p>
        </div>

        <div className="bg-[#ffd60a]/10 border border-[#ffd60a]/30 rounded-2xl p-5 flex gap-4">
          <AlertTriangle className="w-6 h-6 text-[#ffd60a] shrink-0 mt-0.5" />
          <div>
            <p className="text-[#ffd60a] font-bold text-sm mb-1">Important Disclaimer</p>
            <p className="text-white/60 text-xs leading-relaxed">
              This page provides general informational resources only. It does not constitute legal advice. Every situation is different — <strong className="text-white/80">please consult a qualified music attorney for guidance specific to your circumstances.</strong>
            </p>
          </div>
        </div>

        <section className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Music className="w-5 h-5 text-[#bf5af2]" />
            <h3 className="text-lg font-black text-white">1. What Are Performance Rights?</h3>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-3 text-sm text-white/70 leading-relaxed">
            <p>
              When music is played publicly — at a concert, in a restaurant, at a wedding, or in any venue where people gather — it is considered a <strong className="text-white">public performance</strong>. Songwriters, composers, and music publishers have the legal right to be compensated when their work is performed publicly.
            </p>
            <p>
              This right is managed by organizations called <strong className="text-white">Performing Rights Organizations (PROs)</strong>. In the US, the main PROs are ASCAP, BMI, and SESAC.
            </p>
            <p className="bg-[#bf5af2]/10 border border-[#bf5af2]/20 rounded-xl p-3 text-white/80">
              <strong>Who is responsible?</strong> The <strong>venue</strong> and/or the <strong>event organizer</strong> is responsible for obtaining and maintaining a public performance license. As a DJ, you should confirm your venue holds the appropriate licenses.
            </p>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Scale className="w-5 h-5 text-[#0af]" />
            <h3 className="text-lg font-black text-white">2. ASCAP, BMI, and SESAC — Who Are They?</h3>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4 text-sm text-white/70 leading-relaxed">
            <div className="space-y-2">
              <p className="text-white font-bold">ASCAP (American Society of Composers, Authors and Publishers)</p>
              <p>One of the largest PROs in the US, representing hundreds of thousands of songwriters and publishers.</p>
              <a href="https://www.ascap.com/music-users/types/general-licensing" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-[#0af] hover:underline text-xs" data-testid="link-ascap">
                ASCAP Venue Licensing <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <div className="border-t border-white/5 pt-4 space-y-2">
              <p className="text-white font-bold">BMI (Broadcast Music, Inc.)</p>
              <p>Another major PRO representing over 1.4 million songwriters, composers, and music publishers.</p>
              <a href="https://www.bmi.com/licensing" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-[#0af] hover:underline text-xs" data-testid="link-bmi">
                BMI Venue Licensing <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <div className="border-t border-white/5 pt-4 space-y-2">
              <p className="text-white font-bold">SESAC</p>
              <p>A selective PRO representing a curated roster of songwriters and publishers across many genres.</p>
              <a href="https://www.sesac.com/licensing/licensees.aspx" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-[#0af] hover:underline text-xs" data-testid="link-sesac">
                SESAC Venue Licensing <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Info className="w-5 h-5 text-[#30d158]" />
            <h3 className="text-lg font-black text-white">3. What About SoundExchange?</h3>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-3 text-sm text-white/70 leading-relaxed">
            <p>
              SoundExchange is a different type of royalty organization. It collects and distributes <strong className="text-white">digital performance royalties</strong> for sound recordings — primarily from internet radio, satellite radio (like SiriusXM), and streaming services.
            </p>
            <p className="bg-[#30d158]/10 border border-[#30d158]/20 rounded-xl p-3 text-white/80">
              <strong>Does DJ Hybrid trigger SoundExchange obligations?</strong> No. DJ Hybrid plays music <strong>locally in your browser</strong>. Audio files are never streamed to a crowd or broadcast over the internet. This means our platform does not function as an internet radio or streaming service, and SoundExchange digital performance royalties are not triggered by using this app.
            </p>
            <p>
              However, if you choose to stream your mix to others via a third-party platform, that activity may have separate licensing implications outside of DJ Hybrid.
            </p>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Music className="w-5 h-5 text-[#ffd60a]" />
            <h3 className="text-lg font-black text-white">4. Artist Marketplace & DJ Licensing</h3>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-3 text-sm text-white/70 leading-relaxed">
            <p>
              Our Artist Marketplace connects independent artists directly with DJs. Artists upload their <strong className="text-white">original music</strong> and set their own license terms. There are three license types:
            </p>
            <div className="space-y-3">
              <div className="bg-[#30d158]/10 border border-[#30d158]/20 rounded-xl p-3">
                <p className="text-[#30d158] font-bold text-xs uppercase tracking-wider mb-1">Free for DJ Use</p>
                <p className="text-white/70 text-xs">Artist grants DJs permission to play the track in their sets at no cost. No royalty is tracked.</p>
              </div>
              <div className="bg-[#ffd60a]/10 border border-[#ffd60a]/20 rounded-xl p-3">
                <p className="text-[#ffd60a] font-bold text-xs uppercase tracking-wider mb-1">Royalty Per Play</p>
                <p className="text-white/70 text-xs">Artist sets a per-play rate ($0.01–$1.00). DJ Hybrid tracks plays and calculates royalties owed. These are platform-to-artist payments, separate from PRO performance royalties.</p>
              </div>
              <div className="bg-[#0af]/10 border border-[#0af]/20 rounded-xl p-3">
                <p className="text-[#0af] font-bold text-xs uppercase tracking-wider mb-1">Exclusive Promo</p>
                <p className="text-white/70 text-xs">Artist offers the track in exchange for DJ crediting them in their setlist and promotional materials.</p>
              </div>
            </div>
            <p className="text-white/50 text-xs">
              Note: Marketplace licenses cover the specific artist-to-DJ arrangement. Venue performance obligations (ASCAP/BMI/SESAC) remain separate and are the responsibility of the DJ and/or venue.
            </p>
          </div>
        </section>

        <div className="bg-[#bf5af2]/10 border border-[#bf5af2]/30 rounded-2xl p-6 text-center">
          <Scale className="w-8 h-8 text-[#bf5af2] mx-auto mb-3" />
          <h3 className="text-white font-black text-lg mb-2">Consult a Music Attorney</h3>
          <p className="text-white/60 text-sm leading-relaxed max-w-md mx-auto">
            Music law is complex and varies by situation, jurisdiction, and the specific nature of your events. For guidance tailored to your specific circumstances — especially if you perform at regular paid events — we strongly recommend consulting a qualified music attorney.
          </p>
          <p className="text-white/40 text-xs mt-3">
            The resources linked above are starting points only. DJ Hybrid is not a legal advisor.
          </p>
        </div>

        <div className="text-center pt-4 border-t border-white/10">
          <p className="text-white/30 text-xs mb-3">Related resources</p>
          <div className="flex gap-3 justify-center flex-wrap">
            <button onClick={() => navigate("/terms")} className="text-xs text-white/50 hover:text-white/80 underline underline-offset-2 transition-colors" data-testid="link-terms-of-service">
              Terms of Service
            </button>
            <span className="text-white/20">·</span>
            <button onClick={() => navigate("/marketplace")} className="text-xs text-white/50 hover:text-white/80 underline underline-offset-2 transition-colors" data-testid="link-marketplace">
              Artist Marketplace
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
