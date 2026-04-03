import { useLocation } from "wouter";
import { ArrowLeft, FileText, Shield, Music, DollarSign, Scale } from "lucide-react";
import { AppFooter } from "@/components/app-footer";

function Section({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-3">
      <div className="flex items-center gap-2 mb-1">
        {icon && icon}
        <h3 className="text-white font-bold">{title}</h3>
      </div>
      <div className="text-sm text-white/70 leading-relaxed space-y-2">{children}</div>
    </div>
  );
}

export default function TermsPage() {
  const [, navigate] = useLocation();
  const year = new Date().getFullYear();

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "linear-gradient(160deg, #0d0520 0%, #0a0519 100%)" }}>
      <div className="flex-1 max-w-3xl mx-auto px-6 py-8 w-full">
        <div className="flex items-center gap-3 mb-8">
          <button onClick={() => navigate("/")} className="p-2 rounded-xl hover:bg-white/5 transition-colors" data-testid="button-terms-back">
            <ArrowLeft className="w-5 h-5 text-white/50" />
          </button>
          <FileText className="w-5 h-5 text-[#bf5af2]" />
          <h1 className="text-2xl font-black text-white" data-testid="text-terms-title">Terms of Service</h1>
        </div>

        <div className="text-xs text-white/30 mb-8">Last updated: January 1, {year}</div>

        <div className="space-y-5">
          <Section title="1. Acceptance of Terms" icon={<Shield className="w-4 h-4 text-[#0af]" />}>
            <p>By creating an account or using DJ Hybrid, you agree to these Terms of Service. If you do not agree, do not use the platform. You must be at least 13 years old to use DJ Hybrid.</p>
          </Section>

          <Section title="2. Description of Service" icon={<Music className="w-4 h-4 text-[#bf5af2]" />}>
            <p>DJ Hybrid is a web-based platform that provides DJ mixing tools, live event crowd interaction features, AI-assisted music recommendations, and a marketplace for artist tracks. The platform is provided "as is" and features may change over time.</p>
          </Section>

          <Section title="3. No PRO Remittance — Venue Licensing Is Your Responsibility" icon={<Scale className="w-4 h-4 text-[#ffd60a]" />}>
            <p className="bg-[#ffd60a]/10 border border-[#ffd60a]/20 rounded-xl p-3 text-white/80">
              <strong>DJ Hybrid is not a Performing Rights Organization (PRO).</strong> We do not collect or remit performance royalties to ASCAP, BMI, SESAC, SoundExchange, or any other rights organization on behalf of any user.
            </p>
            <p>When you play music at a public venue or event, the venue and/or event organizer is responsible for maintaining appropriate public performance licenses. As a DJ, you should confirm that any venue you perform at holds the necessary licenses.</p>
            <p>DJ Hybrid's play log and cue sheet export features are tools to assist DJs in maintaining their own records — they do not constitute a submission to any PRO or fulfill any licensing obligation automatically.</p>
            <p className="text-white/50 text-xs">We strongly recommend consulting a qualified music attorney regarding your specific performance license obligations. See our <a href="/compliance" className="text-[#bf5af2] hover:underline">Compliance Center</a> for more information.</p>
          </Section>

          <Section title="4. Content and Copyright" icon={<Shield className="w-4 h-4 text-[#0af]" />}>
            <p>You are solely responsible for all content you upload or stream through DJ Hybrid. You represent and warrant that you own or hold all necessary rights to all content you upload, and that your upload does not infringe any third party's copyright, trademark, or other intellectual property rights.</p>
            <p>Uploading copyrighted material without authorization is a violation of these Terms and may result in account suspension or termination. See our <a href="/dmca" className="text-[#bf5af2] hover:underline">DMCA Policy</a> for our takedown procedure.</p>
          </Section>

          <Section title="5. Artist Upload — Ownership Warranty" icon={<Music className="w-4 h-4 text-[#bf5af2]" />}>
            <p>If you upload music to the DJ Hybrid Artist Marketplace, you represent and warrant that:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>You own or have the right to license all content you upload.</li>
              <li>Your upload does not infringe any third party's copyright, trademark, or other intellectual property rights.</li>
              <li>You have the right to grant DJ Hybrid and its users the rights described in these Terms.</li>
            </ul>
            <p>DJ Hybrid does not perform automated copyright checks on uploaded content. If you upload content you do not own, you are solely responsible for any legal consequences that may arise. DJ Hybrid reserves the right to remove content that appears to violate third-party rights.</p>
          </Section>

          <Section title="6. Royalty Payouts & Platform Fee" icon={<DollarSign className="w-4 h-4 text-[#30d158]" />}>
            <p>When a DJ plays a Marketplace track with a Royalty Per Play license, the platform tracks the play and calculates the royalty owed to the artist.</p>
            <p className="bg-[#30d158]/10 border border-[#30d158]/20 rounded-xl p-3 text-white/80">
              DJ Hybrid retains a <strong>15% platform fee</strong> from all royalty amounts. Artists receive the remaining <strong>85%</strong> of calculated royalties.
            </p>
            <p>Royalty payouts are calculated monthly. Actual payment disbursements are currently handled manually and will be automated in a future update. Amounts are shown as "pending payout" in the Artist Dashboard until disbursed.</p>
            <p>DJ Hybrid does not guarantee any minimum earnings, a specific payout schedule, or that payout calculations will be free from error. Artists should maintain their own independent records.</p>
          </Section>

          <Section title="7. Platform Integrations" icon={<Music className="w-4 h-4 text-[#0af]" />}>
            <p>When connecting third-party services (Spotify, Apple Music, etc.), you agree to comply with those platforms' terms of service in addition to ours. Using streaming platform audio in commercial DJ performances may require separate agreements with those platforms.</p>
          </Section>

          <Section title="8. Subscriptions and Payments" icon={<DollarSign className="w-4 h-4 text-[#ffd60a]" />}>
            <p>Subscriptions auto-renew monthly until cancelled. You may cancel at any time from your account settings. Prices may change with 30 days notice to current subscribers. Day passes are non-refundable once an event has been started.</p>
            <p>Platform takes 15% of all crowd micropayments (tips, priority requests, shoutouts); DJs keep 85%.</p>
          </Section>

          <Section title="9. Crowd Participation" icon={<Shield className="w-4 h-4 text-white/50" />}>
            <p>Priority requests, shoutouts, and tips submitted through the crowd participation feature are non-refundable. Your chosen display name is visible to the DJ and other event participants.</p>
          </Section>

          <Section title="10. AI Features" icon={<Shield className="w-4 h-4 text-white/40" />}>
            <p>AI-generated suggestions, coaching alerts, and recommendations are generated automatically and are for guidance only. DJ Hybrid does not guarantee the accuracy or suitability of AI suggestions. Always apply your own professional judgment.</p>
          </Section>

          <Section title="11. Limitation of Liability" icon={<Shield className="w-4 h-4 text-white/40" />}>
            <p>DJ Hybrid is provided "as is" without warranties of any kind. To the fullest extent permitted by law, DJ Hybrid shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the platform, including but not limited to any licensing obligations, royalty disputes, or copyright claims.</p>
          </Section>

          <Section title="12. Termination" icon={<Scale className="w-4 h-4 text-white/40" />}>
            <p>We may suspend or terminate accounts that violate these Terms, including repeated copyright infringement. You may delete your account at any time by contacting support.</p>
          </Section>

          <Section title="13. Changes to These Terms" icon={<FileText className="w-4 h-4 text-white/40" />}>
            <p>DJ Hybrid may update these Terms from time to time. Continued use of the platform after changes constitutes acceptance of the revised Terms.</p>
          </Section>

          <Section title="14. Contact">
            <p>For questions about these Terms: <span className="text-[#0af]">legal@djhybrid.app</span></p>
            <p>For legal guidance specific to your situation, please consult a qualified music attorney. DJ Hybrid does not provide legal advice.</p>
          </Section>
        </div>

        <div className="mt-8 text-center pt-4 border-t border-white/10">
          <div className="flex gap-3 justify-center flex-wrap">
            <button onClick={() => navigate("/compliance")} className="text-xs text-white/50 hover:text-white/80 underline underline-offset-2 transition-colors" data-testid="link-compliance-center">
              Compliance Center
            </button>
            <span className="text-white/20">·</span>
            <button onClick={() => navigate("/privacy")} className="text-xs text-white/50 hover:text-white/80 underline underline-offset-2 transition-colors" data-testid="link-privacy">
              Privacy Policy
            </button>
            <span className="text-white/20">·</span>
            <button onClick={() => navigate("/")} className="text-xs text-white/50 hover:text-white/80 underline underline-offset-2 transition-colors" data-testid="link-home">
              Back to Home
            </button>
          </div>
        </div>
      </div>
      <AppFooter />
    </div>
  );
}
