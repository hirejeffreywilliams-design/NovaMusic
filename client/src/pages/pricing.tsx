import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { getStableDjId } from "@/lib/utils";
import { ArrowLeft, Check, Zap, Star, Crown, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AppFooter } from "@/components/app-footer";

const TIERS = [
  {
    id: "starter",
    name: "Starter",
    price: 0,
    color: "#ffffff",
    icon: "🎵",
    features: [
      "1 active event at a time",
      "Basic crowd page",
      "Song requests (free only)",
      "Emoji reactions",
    ],
    cta: "Current Free Plan",
    disabled: true,
  },
  {
    id: "pro",
    name: "DJ Pro",
    price: 14.99,
    color: "#bf5af2",
    icon: "⚡",
    recommended: true,
    features: [
      "Unlimited events",
      "Priority song requests",
      "Live polls & shoutouts",
      "Tip collection (85% to you)",
      "AI Crowd Coach",
      "Battle Mode",
      "Mood Board",
      "Real-time energy meter",
    ],
    cta: "Get DJ Pro",
  },
  {
    id: "club",
    name: "DJ Club",
    price: 39.99,
    color: "#ffd60a",
    icon: "👑",
    features: [
      "Everything in DJ Pro",
      "Leaderboard badges",
      "Advanced analytics",
      "Priority customer support",
      "Custom event branding",
      "Multi-event dashboard",
    ],
    cta: "Get DJ Club",
  },
];

export default function Pricing() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [djId] = useState(() => getStableDjId());
  const [subscribing, setSubscribing] = useState<string | null>(null);

  const { data: sub } = useQuery({
    queryKey: ["/api/subscriptions", djId],
    queryFn: () => fetch(`/api/subscriptions/${djId}`).then(r => r.json()),
  });

  const subscribeMutation = useMutation({
    mutationFn: ({ tier }: { tier: string }) =>
      apiRequest("POST", "/api/subscriptions", { djId, tier }),
    onSuccess: (_, { tier }) => {
      toast({ title: "Subscription activated!", description: `You're now on the ${tier} plan. (Simulated payment)` });
      setSubscribing(null);
    },
    onError: () => {
      toast({ title: "Error", description: "Something went wrong.", variant: "destructive" });
      setSubscribing(null);
    },
  });

  const dayPassMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/subscriptions", { djId, tier: "pro", dayPass: true }),
    onSuccess: () => {
      toast({ title: "Day Pass activated!", description: "You have 24-hour access to all Pro features. (Simulated payment)" });
    },
  });

  return (
    <div
      className="min-h-screen"
      style={{ background: "linear-gradient(160deg, #0d0520 0%, #1a0535 40%, #0a1530 80%, #0a0519 100%)" }}
    >
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate("/")}
            className="p-2 rounded-xl hover:bg-white/5 transition-colors"
            data-testid="button-pricing-back"
          >
            <ArrowLeft className="w-5 h-5 text-white/50" />
          </button>
          <div>
            <h1 className="text-2xl font-black text-white" data-testid="text-pricing-title">Choose Your Plan</h1>
            <p className="text-white/40 text-sm">Unlock the full Nova Music experience</p>
          </div>
        </div>

        {/* Tiers */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {TIERS.map(tier => (
            <div
              key={tier.id}
              className="relative rounded-3xl p-6 space-y-4 transition-all"
              style={{
                background: tier.recommended
                  ? `linear-gradient(160deg, ${tier.color}15, ${tier.color}05)`
                  : "rgba(255,255,255,0.04)",
                border: tier.recommended ? `1.5px solid ${tier.color}40` : "1px solid rgba(255,255,255,0.08)",
                boxShadow: tier.recommended ? `0 0 40px ${tier.color}15` : "none",
              }}
              data-testid={`tier-card-${tier.id}`}
            >
              {tier.recommended && (
                <div
                  className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-[10px] font-black tracking-wider text-black"
                  style={{ background: tier.color }}
                >
                  RECOMMENDED
                </div>
              )}

              <div className="text-center space-y-1">
                <span className="text-3xl">{tier.icon}</span>
                <div className="text-lg font-black" style={{ color: tier.color }}>{tier.name}</div>
                <div className="text-3xl font-black text-white">
                  {tier.price === 0 ? "Free" : `$${tier.price}`}
                  {tier.price > 0 && <span className="text-base text-white/40 font-normal">/mo</span>}
                </div>
              </div>

              <ul className="space-y-2">
                {tier.features.map(f => (
                  <li key={f} className="flex items-start gap-2 text-sm text-white/60">
                    <Check className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: tier.color }} />
                    {f}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => {
                  if (!tier.disabled && tier.id !== "starter") {
                    setSubscribing(tier.id);
                    subscribeMutation.mutate({ tier: tier.id });
                  }
                }}
                disabled={tier.disabled || subscribeMutation.isPending}
                className="w-full py-3 rounded-2xl text-sm font-black transition-all disabled:opacity-50"
                style={
                  tier.disabled
                    ? { background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.3)" }
                    : { background: `${tier.color}`, color: tier.id === "club" ? "#000" : "#fff", boxShadow: `0 0 20px ${tier.color}30` }
                }
                data-testid={`button-subscribe-${tier.id}`}
              >
                {subscribing === tier.id ? "Activating..." : tier.cta}
              </button>
            </div>
          ))}
        </div>

        {/* Day Pass */}
        <div
          className="rounded-3xl p-6 flex flex-col md:flex-row items-center gap-4"
          style={{ background: "rgba(255,149,0,0.08)", border: "1.5px solid rgba(255,149,0,0.25)" }}
        >
          <div className="text-4xl">🎟️</div>
          <div className="flex-1 text-center md:text-left">
            <div className="text-lg font-black text-white">Day Pass</div>
            <p className="text-sm text-white/50">Get full Pro access for a single event — just $4.99 for 24 hours. No commitment.</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-2xl font-black text-[#ff9500]">$4.99</div>
            <button
              onClick={() => dayPassMutation.mutate()}
              disabled={dayPassMutation.isPending}
              className="px-6 py-3 rounded-2xl text-sm font-black text-white disabled:opacity-50 transition-all"
              style={{ background: "linear-gradient(135deg, #ff9500, #ffd60a)", boxShadow: "0 0 20px rgba(255,149,0,0.3)" }}
              data-testid="button-buy-day-pass"
            >
              {dayPassMutation.isPending ? "Activating..." : "Buy Day Pass"}
            </button>
          </div>
        </div>

        {/* Legal Disclosures */}
        <div className="mt-6 rounded-2xl px-5 py-4 space-y-2" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }} data-testid="notice-subscription-legal">
          <div className="text-[10px] font-black uppercase tracking-wider text-white/30 mb-2">Subscription Terms</div>
          <p className="text-[11px] text-white/40 leading-relaxed">
            Subscriptions auto-renew monthly until cancelled. Cancel anytime from your account settings. Prices are subject to change with 30 days notice to current subscribers. Day passes are <strong className="text-white/55">non-refundable</strong> once an event has been started. Platform takes 15% of all crowd micropayments (tips, priority requests, shoutouts); DJs keep 85%.
          </p>
        </div>

        <div className="mt-4 text-center text-xs text-white/20">
          All payments are simulated — no real charges are made in this demo.
        </div>
      </div>
      <AppFooter />
    </div>
  );
}
