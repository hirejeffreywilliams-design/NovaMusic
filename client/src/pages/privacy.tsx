import { useLocation } from "wouter";
import { ArrowLeft, Shield } from "lucide-react";
import { AppFooter } from "@/components/app-footer";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h2 className="text-base font-black text-white">{title}</h2>
      <div className="text-sm text-white/55 leading-relaxed space-y-2">{children}</div>
    </div>
  );
}

export default function PrivacyPolicy() {
  const [, navigate] = useLocation();
  const year = new Date().getFullYear();

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "linear-gradient(160deg, #0d0520 0%, #0a0519 100%)" }}>
      <div className="flex-1 max-w-3xl mx-auto px-6 py-8 w-full">
        <div className="flex items-center gap-3 mb-8">
          <button onClick={() => navigate("/")} className="p-2 rounded-xl hover:bg-white/5 transition-colors" data-testid="button-privacy-back">
            <ArrowLeft className="w-5 h-5 text-white/50" />
          </button>
          <Shield className="w-5 h-5 text-[#bf5af2]" />
          <h1 className="text-2xl font-black text-white" data-testid="text-privacy-title">Privacy Policy</h1>
        </div>

        <div className="text-xs text-white/30 mb-8">Last updated: January 1, {year}</div>

        <div className="space-y-8">
          <Section title="Introduction">
            <p>
              DJ Hybrid ("we," "us," or "our") operates a web-based DJ and event platform. This Privacy Policy explains what data we collect, how we use it, and your rights regarding that data. We believe in plain language — no legalese.
            </p>
            <p>By using DJ Hybrid, you agree to the practices described here. If you have questions, contact us at privacy@djhybrid.app.</p>
          </Section>

          <Section title="Information We Collect">
            <p><strong className="text-white/80">Account information:</strong> When you create a DJ or Artist account, we collect your username, email address, and the timestamp of your agreement to our Terms of Service and Privacy Policy.</p>
            <p><strong className="text-white/80">Usage data:</strong> We collect information about how you use the platform — which pages you visit, features you use, and actions you take (e.g., creating events, uploading tracks).</p>
            <p><strong className="text-white/80">Play event data:</strong> When you host or attend a live event, we record song requests, reactions, shoutouts, tips, and voting activity. Crowd participants choose their own display name; we do not require real names.</p>
            <p><strong className="text-white/80">Payment records:</strong> If you purchase a subscription or day pass, we store a record of the transaction (tier, amount, date). We do not store raw credit card numbers — payments are processed by third-party payment processors.</p>
            <p><strong className="text-white/80">Artist uploads:</strong> When an artist uploads a track, we store the file along with the ownership confirmation you provide.</p>
            <p><strong className="text-white/80">Cookies &amp; local storage:</strong> We use browser local storage to remember session preferences (e.g., cookie consent, DJ identity). We may use cookies for analytics and session management.</p>
          </Section>

          <Section title="How We Use Your Information">
            <p>We use the information we collect to:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Operate the platform and provide the services you request</li>
              <li>Process subscription payments and artist royalty payouts</li>
              <li>Generate AI-assisted DJ suggestions and crowd coaching (processed by OpenAI — see below)</li>
              <li>Send service-related communications (e.g., payout notifications)</li>
              <li>Detect and prevent abuse, fraud, and copyright infringement</li>
              <li>Improve the platform through analytics</li>
            </ul>
            <p>We do not sell your personal information to third parties.</p>
          </Section>

          <Section title="Third-Party Services">
            <p>DJ Hybrid integrates with the following third-party services. Each has its own privacy policy:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong className="text-white/80">OpenAI</strong> — We send track names, BPM data, and crowd energy metrics to OpenAI's API to generate AI DJ suggestions and crowd coaching alerts. No personally identifiable information is sent to OpenAI beyond what is necessary for the AI feature. <a href="https://openai.com/policies/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-[#bf5af2] hover:underline">OpenAI Privacy Policy →</a>
              </li>
              <li>
                <strong className="text-white/80">Spotify</strong> — If you connect your Spotify account, we access your library and playlist data in accordance with Spotify's terms. <a href="https://www.spotify.com/us/legal/privacy-policy/" target="_blank" rel="noopener noreferrer" className="text-[#bf5af2] hover:underline">Spotify Privacy Policy →</a>
              </li>
              <li>
                <strong className="text-white/80">Apple</strong> — If you connect Apple Music, playback requires an active Apple Music subscription and is subject to Apple's terms. <a href="https://www.apple.com/legal/privacy/" target="_blank" rel="noopener noreferrer" className="text-[#bf5af2] hover:underline">Apple Privacy Policy →</a>
              </li>
              <li>
                <strong className="text-white/80">Google / YouTube</strong> — YouTube Music integration (when available) is subject to Google's terms. <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-[#bf5af2] hover:underline">Google Privacy Policy →</a>
              </li>
              <li>
                <strong className="text-white/80">SoundCloud</strong> — SoundCloud integration (when available) is subject to SoundCloud's terms. <a href="https://soundcloud.com/pages/privacy" target="_blank" rel="noopener noreferrer" className="text-[#bf5af2] hover:underline">SoundCloud Privacy Policy →</a>
              </li>
            </ul>
          </Section>

          <Section title="Data Retention">
            <p>We retain your account data for as long as your account is active. Event data (requests, reactions, setlists) is retained for up to 12 months after the event ends. Payment records are retained for 7 years as required by accounting regulations.</p>
            <p>AI-generated content (suggestions, coaching alerts) is ephemeral and not permanently stored by us.</p>
          </Section>

          <Section title="Your Rights">
            <p>You have the right to:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong className="text-white/80">Access</strong> the personal data we hold about you</li>
              <li><strong className="text-white/80">Delete</strong> your account and associated data by contacting us at privacy@djhybrid.app</li>
              <li><strong className="text-white/80">Correct</strong> inaccurate information in your account</li>
              <li><strong className="text-white/80">Object</strong> to certain processing activities</li>
            </ul>
            <p>To exercise your rights, email privacy@djhybrid.app with the subject line "Data Request."</p>
          </Section>

          <Section title="Children">
            <p>DJ Hybrid is not intended for users under the age of 13. We do not knowingly collect personal information from children under 13. If you believe a child under 13 has provided us with personal information, please contact us and we will delete it.</p>
          </Section>

          <Section title="Contact">
            <p>For privacy-related inquiries:</p>
            <p className="text-[#bf5af2]">privacy@djhybrid.app</p>
            <p>For DMCA takedown requests, see our <a href="/dmca" className="text-[#bf5af2] hover:underline">DMCA Policy</a>.</p>
          </Section>
        </div>
      </div>
      <AppFooter />
    </div>
  );
}
