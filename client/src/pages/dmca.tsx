import { useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import { AppFooter } from "@/components/app-footer";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h2 className="text-base font-black text-white">{title}</h2>
      <div className="text-sm text-white/55 leading-relaxed space-y-2">{children}</div>
    </div>
  );
}

export default function DmcaPolicy() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [form, setForm] = useState({ reporterName: "", contact: "", claimedWork: "", infringingUrl: "" });
  const [submitted, setSubmitted] = useState(false);

  const noticeMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/dmca/notices", form),
    onSuccess: () => {
      toast({ title: "DMCA notice received", description: "We will review your request within 5 business days." });
      setSubmitted(true);
    },
    onError: () => {
      toast({ title: "Submission failed", description: "Please email dmca@djhybrid.app directly.", variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.reporterName || !form.contact || !form.claimedWork || !form.infringingUrl) {
      toast({ title: "All fields required", variant: "destructive" });
      return;
    }
    noticeMutation.mutate();
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "linear-gradient(160deg, #0d0520 0%, #0a0519 100%)" }}>
      <div className="flex-1 max-w-3xl mx-auto px-6 py-8 w-full">
        <div className="flex items-center gap-3 mb-8">
          <button onClick={() => navigate("/")} className="p-2 rounded-xl hover:bg-white/5 transition-colors" data-testid="button-dmca-back">
            <ArrowLeft className="w-5 h-5 text-white/50" />
          </button>
          <AlertTriangle className="w-5 h-5 text-[#ffd60a]" />
          <h1 className="text-2xl font-black text-white" data-testid="text-dmca-title">DMCA Policy</h1>
        </div>

        <div className="space-y-8">
          <Section title="What is the DMCA?">
            <p>
              The Digital Millennium Copyright Act (DMCA) is a U.S. copyright law that provides a process for copyright holders to request the removal of infringing content from online platforms. Under 17 U.S.C. § 512, DJ Hybrid qualifies for safe-harbor protection provided we promptly respond to valid takedown notices.
            </p>
          </Section>

          <Section title="Submitting a Takedown Notice">
            <p>If you believe content on DJ Hybrid infringes your copyright, you may submit a DMCA takedown notice. To be valid under 17 U.S.C. § 512(c)(3), your notice must include all of the following:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Your physical or electronic signature (or that of an authorized agent)</li>
              <li>Identification of the copyrighted work you claim has been infringed</li>
              <li>Identification of the material on DJ Hybrid that you claim is infringing, with enough detail for us to locate it (e.g., the URL or track name)</li>
              <li>Your contact information (name, address, telephone number, and email)</li>
              <li>A statement that you have a good-faith belief that use of the material is not authorized by the copyright owner, its agent, or the law</li>
              <li>A statement that the information in the notice is accurate, and under penalty of perjury, that you are authorized to act on behalf of the copyright owner</li>
            </ul>
            <p>Send completed notices to: <span className="text-[#ffd60a]">dmca@djhybrid.app</span></p>
          </Section>

          <Section title="Counter-Notice Process">
            <p>If your content was removed as a result of a DMCA notice and you believe the removal was in error, you may submit a counter-notice. A valid counter-notice must include:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Your physical or electronic signature</li>
              <li>Identification of the content that was removed and its prior location</li>
              <li>A statement under penalty of perjury that you have a good-faith belief the content was removed as a result of mistake or misidentification</li>
              <li>Your name, address, phone number, and a statement that you consent to jurisdiction of the federal district court for your location</li>
            </ul>
            <p>Send counter-notices to: <span className="text-[#ffd60a]">dmca@djhybrid.app</span></p>
          </Section>

          <Section title="Repeat Infringer Policy">
            <p>DJ Hybrid maintains a repeat infringer policy. Users who repeatedly upload content that infringes third-party copyrights will have their accounts suspended or permanently terminated, in accordance with 17 U.S.C. § 512(i).</p>
          </Section>

          <Section title="Submit a Takedown Notice Online">
            <p>You can also use the form below to submit your notice. We will respond within 5 business days.</p>
          </Section>

          {submitted ? (
            <div className="rounded-2xl p-6 text-center space-y-2" style={{ background: "rgba(48,209,88,0.08)", border: "1px solid rgba(48,209,88,0.2)" }}>
              <div className="text-2xl">✅</div>
              <div className="font-black text-white">Notice Received</div>
              <p className="text-sm text-white/50">We will review your request and respond within 5 business days at the contact information you provided.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4" data-testid="form-dmca-notice">
              <div className="rounded-2xl p-4 space-y-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <div className="space-y-1">
                  <label className="text-[11px] text-white/40 font-bold uppercase tracking-wider">Your Full Name *</label>
                  <input
                    value={form.reporterName}
                    onChange={e => setForm(f => ({ ...f, reporterName: e.target.value }))}
                    placeholder="First and last name..."
                    className="w-full px-3 py-2.5 rounded-xl bg-white/8 border border-white/15 text-white text-sm placeholder:text-white/25 focus:outline-none focus:border-[#ffd60a]"
                    data-testid="input-dmca-reporter-name"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] text-white/40 font-bold uppercase tracking-wider">Contact Email *</label>
                  <input
                    type="email"
                    value={form.contact}
                    onChange={e => setForm(f => ({ ...f, contact: e.target.value }))}
                    placeholder="your@email.com"
                    className="w-full px-3 py-2.5 rounded-xl bg-white/8 border border-white/15 text-white text-sm placeholder:text-white/25 focus:outline-none focus:border-[#ffd60a]"
                    data-testid="input-dmca-contact"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] text-white/40 font-bold uppercase tracking-wider">Description of Original Work *</label>
                  <textarea
                    value={form.claimedWork}
                    onChange={e => setForm(f => ({ ...f, claimedWork: e.target.value }))}
                    placeholder="Describe the original copyrighted work being infringed..."
                    rows={3}
                    className="w-full px-3 py-2.5 rounded-xl bg-white/8 border border-white/15 text-white text-sm placeholder:text-white/25 focus:outline-none focus:border-[#ffd60a] resize-none"
                    data-testid="input-dmca-claimed-work"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] text-white/40 font-bold uppercase tracking-wider">URL or Location of Infringing Content *</label>
                  <input
                    value={form.infringingUrl}
                    onChange={e => setForm(f => ({ ...f, infringingUrl: e.target.value }))}
                    placeholder="https://... or describe the track/content location"
                    className="w-full px-3 py-2.5 rounded-xl bg-white/8 border border-white/15 text-white text-sm placeholder:text-white/25 focus:outline-none focus:border-[#ffd60a]"
                    data-testid="input-dmca-infringing-url"
                  />
                </div>
                <p className="text-[10px] text-white/30 leading-relaxed">
                  By submitting this form, I declare under penalty of perjury that the information provided is accurate and that I am the copyright owner or authorized to act on behalf of the copyright owner.
                </p>
                <button
                  type="submit"
                  disabled={noticeMutation.isPending}
                  className="w-full py-3 rounded-2xl text-sm font-black text-white disabled:opacity-50 transition-all"
                  style={{ background: "linear-gradient(135deg, #ffd60a, #ff9500)", color: "#000" }}
                  data-testid="button-dmca-submit"
                >
                  {noticeMutation.isPending ? "Submitting..." : "Submit Takedown Notice"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
      <AppFooter />
    </div>
  );
}
