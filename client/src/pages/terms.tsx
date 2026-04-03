import { useLocation } from "wouter";
import { ArrowLeft, FileText, Shield, Music, DollarSign, Scale } from "lucide-react";

export default function TermsPage() {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen bg-[#0a0519] text-white">
      <header className="flex items-center gap-3 px-6 py-4 border-b border-white/10">
        <button onClick={() => navigate("/")} className="p-2 rounded-lg hover:bg-white/5 transition-colors" data-testid="button-back-home">
          <ArrowLeft className="w-5 h-5 text-white/60" />
        </button>
        <FileText className="w-6 h-6 text-[#bf5af2]" />
        <h1 className="text-lg font-black tracking-wider text-[#bf5af2]">TERMS OF SERVICE</h1>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10 space-y-10">
        <div className="text-center">
          <h2 className="text-3xl font-black text-white mb-3">DJ Hybrid — Terms of Service</h2>
          <p className="text-white/40 text-xs">Last updated: April 3, 2026</p>
        </div>

        <section className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-3 text-sm text-white/70 leading-relaxed">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="w-4 h-4 text-[#0af]" />
            <h3 className="text-white font-bold">1. Acceptance of Terms</h3>
          </div>
          <p>By creating an account or using DJ Hybrid, you agree to these Terms of Service. If you do not agree, do not use the platform.</p>
        </section>

        <section className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-3 text-sm text-white/70 leading-relaxed">
          <div className="flex items-center gap-2 mb-3">
            <Scale className="w-4 h-4 text-[#ffd60a]" />
            <h3 className="text-white font-bold">2. No PRO Remittance — Venue Licensing Is Your Responsibility</h3>
          </div>
          <p className="bg-[#ffd60a]/10 border border-[#ffd60a]/20 rounded-xl p-3 text-white/80">
            <strong>DJ Hybrid is not a Performing Rights Organization (PRO).</strong> We do not collect or remit performance royalties to ASCAP, BMI, SESAC, SoundExchange, or any other rights organization on behalf of any user.
          </p>
          <p>
            When you play music at a public venue or event, the venue and/or event organizer is responsible for maintaining appropriate public performance licenses with ASCAP, BMI, SESAC, or any other relevant PRO. As a DJ, you should confirm that any venue you perform at holds the necessary licenses.
          </p>
          <p>
            DJ Hybrid's play log and cue sheet export features are provided as tools to assist DJs in maintaining their own records — they do not constitute a submission to any PRO or fulfill any licensing obligation automatically.
          </p>
          <p className="text-white/50 text-xs">
            We strongly recommend consulting a qualified music attorney regarding your specific performance license obligations.
          </p>
        </section>

        <section className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-3 text-sm text-white/70 leading-relaxed">
          <div className="flex items-center gap-2 mb-3">
            <Scale className="w-4 h-4 text-white/50" />
            <h3 className="text-white font-bold">3. No Legal Advice</h3>
          </div>
          <p>
            DJ Hybrid provides informational resources about music rights for educational purposes only. Nothing on the platform constitutes legal advice, and no attorney-client relationship is formed by your use of the platform. For legal guidance, consult a qualified music attorney.
          </p>
        </section>

        <section className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-3 text-sm text-white/70 leading-relaxed">
          <div className="flex items-center gap-2 mb-3">
            <Music className="w-4 h-4 text-[#bf5af2]" />
            <h3 className="text-white font-bold">4. Artist Upload — Ownership Warranty</h3>
          </div>
          <p>
            If you upload music to the DJ Hybrid Artist Marketplace, you represent and warrant that:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>You own or have the right to license all content you upload.</li>
            <li>Your upload does not infringe any third party's copyright, trademark, or other intellectual property rights.</li>
            <li>You have the right to grant DJ Hybrid and its users the rights described in these Terms.</li>
          </ul>
          <p>
            DJ Hybrid does not perform automated copyright checks on uploaded content. If you upload content you do not own, you are solely responsible for any legal consequences that may arise. DJ Hybrid reserves the right to remove content that appears to violate third-party rights.
          </p>
        </section>

        <section className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-3 text-sm text-white/70 leading-relaxed">
          <div className="flex items-center gap-2 mb-3">
            <DollarSign className="w-4 h-4 text-[#30d158]" />
            <h3 className="text-white font-bold">5. Royalty Payouts & Platform Fee</h3>
          </div>
          <p>
            When a DJ plays a Marketplace track with a Royalty Per Play license, the platform tracks the play and calculates the royalty owed to the artist.
          </p>
          <p className="bg-[#30d158]/10 border border-[#30d158]/20 rounded-xl p-3 text-white/80">
            DJ Hybrid retains a <strong>15% platform fee</strong> from all royalty amounts. Artists receive the remaining <strong>85%</strong> of calculated royalties.
          </p>
          <p>
            Royalty payouts are calculated monthly. Actual payment disbursements are currently handled manually and will be automated in a future update. Amounts are shown as "pending payout" in the Artist Dashboard until disbursed.
          </p>
          <p>
            DJ Hybrid does not guarantee any minimum earnings, a specific payout schedule, or that payout calculations will be free from error. Artists should maintain their own independent records.
          </p>
        </section>

        <section className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-3 text-sm text-white/70 leading-relaxed">
          <div className="flex items-center gap-2 mb-3">
            <Music className="w-4 h-4 text-[#0af]" />
            <h3 className="text-white font-bold">6. How Music Is Played</h3>
          </div>
          <p>
            DJ Hybrid plays music <strong className="text-white">locally in your browser</strong>. Audio files are processed on your device and are never stored on our servers (unless you upload them as a Marketplace track). The platform does not broadcast audio streams to a crowd or the internet.
          </p>
          <p>
            This means DJ Hybrid does not function as an internet radio service or streaming platform, and use of the app alone does not trigger digital performance royalties administered by SoundExchange.
          </p>
        </section>

        <section className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-3 text-sm text-white/70 leading-relaxed">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="w-4 h-4 text-white/40" />
            <h3 className="text-white font-bold">7. Limitation of Liability</h3>
          </div>
          <p>
            DJ Hybrid is provided "as is" without warranties of any kind. To the fullest extent permitted by law, DJ Hybrid shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the platform, including but not limited to any licensing obligations, royalty disputes, or copyright claims.
          </p>
        </section>

        <section className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-3 text-sm text-white/70 leading-relaxed">
          <div className="flex items-center gap-2 mb-3">
            <FileText className="w-4 h-4 text-white/40" />
            <h3 className="text-white font-bold">8. Changes to These Terms</h3>
          </div>
          <p>
            DJ Hybrid may update these Terms from time to time. Continued use of the platform after changes constitutes acceptance of the revised Terms.
          </p>
        </section>

        <div className="bg-[#bf5af2]/10 border border-[#bf5af2]/30 rounded-2xl p-5 text-center">
          <Scale className="w-6 h-6 text-[#bf5af2] mx-auto mb-2" />
          <p className="text-white/70 text-sm">
            Questions? Consult a qualified music attorney for guidance on your specific situation.
          </p>
          <p className="text-white/40 text-xs mt-2">
            DJ Hybrid does not provide legal advice.
          </p>
        </div>

        <div className="text-center pt-4 border-t border-white/10">
          <div className="flex gap-3 justify-center flex-wrap">
            <button onClick={() => navigate("/compliance")} className="text-xs text-white/50 hover:text-white/80 underline underline-offset-2 transition-colors" data-testid="link-compliance-center">
              Compliance Center
            </button>
            <span className="text-white/20">·</span>
            <button onClick={() => navigate("/")} className="text-xs text-white/50 hover:text-white/80 underline underline-offset-2 transition-colors" data-testid="link-home">
              Back to Home
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
