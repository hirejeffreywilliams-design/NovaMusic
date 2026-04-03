import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { ArrowLeft, DollarSign, Users, Zap, TrendingUp, CheckCircle, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AppFooter } from "@/components/app-footer";

interface AdminStats {
  activeEvents: number;
  totalRevenue: number;
  subscriptionsByTier: Record<string, number>;
  topDJs: { djId: string; djName: string; events: number; revenue: number }[];
  pendingPayouts: { id: string; djId: string; djName: string; amount: number; eventId: string; createdAt: number }[];
  allPayouts: { id: string; djId: string; djName: string; amount: number; eventId: string; status: string; createdAt: number }[];
  totalSubscriptions: number;
}

function makeAdminFetch(adminKey: string) {
  return function adminFetch(url: string, options?: RequestInit) {
    return fetch(url, {
      ...options,
      headers: { ...(options?.headers || {}), "x-admin-key": adminKey, "Content-Type": "application/json" },
    });
  };
}

export default function AdminDashboard() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [adminKey, setAdminKey] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [passInput, setPassInput] = useState("");

  const adminFetch = makeAdminFetch(adminKey);

  const { data: stats, isLoading } = useQuery<AdminStats>({
    queryKey: ["/api/admin/stats"],
    queryFn: () => adminFetch("/api/admin/stats").then(r => r.json()),
    enabled: unlocked,
    refetchInterval: 15000,
  });

  const processPayoutMutation = useMutation({
    mutationFn: (payoutId: string) =>
      makeAdminFetch(adminKey)(`/api/admin/payouts/${payoutId}/process`, { method: "POST", body: JSON.stringify({}) }).then(r => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({ title: "Payout processed!", description: "Marked as processed." });
    },
  });

  const handleLogin = async () => {
    if (!passInput.trim()) return;
    try {
      const res = await fetch("/api/admin/stats", {
        headers: { "x-admin-key": passInput },
      });
      if (res.ok) {
        setAdminKey(passInput);
        setUnlocked(true);
        qc.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      } else {
        toast({ title: "Wrong password", description: "Access denied.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Connection error", variant: "destructive" });
    }
  };

  if (!unlocked) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-4"
        style={{ background: "linear-gradient(160deg, #0d0520 0%, #1a0535 40%, #0a1530 80%, #0a0519 100%)" }}
      >
        <div className="w-full max-w-sm space-y-4">
          <div className="text-center space-y-2">
            <div className="text-4xl">🔐</div>
            <h1 className="text-xl font-black text-white">Admin Dashboard</h1>
            <p className="text-white/40 text-sm">Enter admin password to continue</p>
          </div>
          <input
            type="password"
            placeholder="Admin password"
            value={passInput}
            onChange={e => setPassInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") handleLogin(); }}
            className="w-full px-4 py-3 rounded-2xl bg-white/10 border border-white/20 text-white placeholder:text-white/30 focus:outline-none focus:border-[#bf5af2]"
            data-testid="input-admin-password"
          />
          <button
            onClick={handleLogin}
            className="w-full py-3 rounded-2xl font-black text-white text-sm"
            style={{ background: "linear-gradient(135deg, #bf5af2, #0af)" }}
            data-testid="button-admin-login"
          >
            Enter
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen"
      style={{ background: "linear-gradient(160deg, #0d0520 0%, #1a0535 40%, #0a1530 80%, #0a0519 100%)" }}
    >
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <button onClick={() => navigate("/")} className="p-2 rounded-xl hover:bg-white/5 transition-colors" data-testid="button-admin-back">
            <ArrowLeft className="w-5 h-5 text-white/50" />
          </button>
          <div>
            <h1 className="text-xl font-black text-white" data-testid="text-admin-title">Admin Dashboard</h1>
            <p className="text-white/40 text-xs">Platform overview &middot; Auto-refreshes every 15s</p>
          </div>
        </div>

        {isLoading || !stats ? (
          <div className="text-center text-white/40 py-20">Loading stats...</div>
        ) : (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="glass-card rounded-2xl p-4 space-y-1" data-testid="card-total-revenue">
                <DollarSign className="w-5 h-5 text-[#30d158]" />
                <div className="text-2xl font-black text-white">${stats.totalRevenue.toFixed(2)}</div>
                <div className="text-[10px] text-white/40">Platform Revenue (15%)</div>
              </div>
              <div className="glass-card rounded-2xl p-4 space-y-1" data-testid="card-active-events">
                <Zap className="w-5 h-5 text-[#ffd60a]" />
                <div className="text-2xl font-black text-white">{stats.activeEvents}</div>
                <div className="text-[10px] text-white/40">Active Events</div>
              </div>
              <div className="glass-card rounded-2xl p-4 space-y-1" data-testid="card-subscriptions">
                <Users className="w-5 h-5 text-[#bf5af2]" />
                <div className="text-2xl font-black text-white">{stats.totalSubscriptions}</div>
                <div className="text-[10px] text-white/40">Total Subscriptions</div>
              </div>
              <div className="glass-card rounded-2xl p-4 space-y-1" data-testid="card-pending-payouts">
                <Clock className="w-5 h-5 text-[#ff9500]" />
                <div className="text-2xl font-black text-white">{stats.pendingPayouts.length}</div>
                <div className="text-[10px] text-white/40">Pending Payouts</div>
              </div>
            </div>

            {/* Subscriptions by Tier */}
            <div className="glass-card rounded-2xl p-5 space-y-3">
              <div className="text-[10px] font-black uppercase tracking-wider text-white/40">Subscriptions by Tier</div>
              <div className="flex gap-4">
                {[
                  { id: "starter", label: "Starter", color: "#ffffff" },
                  { id: "pro", label: "DJ Pro", color: "#bf5af2" },
                  { id: "club", label: "DJ Club", color: "#ffd60a" },
                ].map(({ id, label, color }) => (
                  <div key={id} className="flex-1 text-center py-4 rounded-2xl" style={{ background: `${color}10`, border: `1px solid ${color}25` }}>
                    <div className="text-2xl font-black" style={{ color }}>{stats.subscriptionsByTier[id] || 0}</div>
                    <div className="text-[10px] text-white/40 mt-1">{label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top DJs */}
            <div className="glass-card rounded-2xl p-5 space-y-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#0af]" />
                <div className="text-[10px] font-black uppercase tracking-wider text-white/40">Top DJs by Revenue</div>
              </div>
              {stats.topDJs.length === 0 ? (
                <div className="text-center text-white/25 text-sm py-4">No DJ data yet.</div>
              ) : (
                <div className="space-y-2">
                  {stats.topDJs.map((dj, i) => (
                    <div key={dj.djId} className="flex items-center gap-3 px-3 py-2 rounded-xl bg-white/4" data-testid={`dj-row-${i}`}>
                      <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-black text-white shrink-0" style={{ background: i === 0 ? "#ffd60a" : i === 1 ? "#c0c0c0" : i === 2 ? "#cd7f32" : "#ffffff20" }}>
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-white truncate">{dj.djName}</div>
                        <div className="text-[10px] text-white/35">{dj.events} event{dj.events !== 1 ? "s" : ""}</div>
                      </div>
                      <div className="text-sm font-black text-[#30d158]">${dj.revenue.toFixed(2)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Payout Queue */}
            <div className="glass-card rounded-2xl p-5 space-y-3">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-[#30d158]" />
                <div className="text-[10px] font-black uppercase tracking-wider text-white/40">Payout Queue</div>
              </div>
              <div className="rounded-xl px-3 py-2.5 text-[10px] text-white/40 leading-relaxed" style={{ background: "rgba(255,149,0,0.06)", border: "1px solid rgba(255,149,0,0.12)" }} data-testid="notice-payout-disclaimer">
                ℹ️ Royalty payouts are processed manually on a monthly basis. The platform is not liable for delays caused by incorrect payout information provided by the artist.
              </div>
              {stats.allPayouts.length === 0 ? (
                <div className="text-center text-white/25 text-sm py-4">No payouts yet.</div>
              ) : (
                <div className="space-y-2">
                  {stats.allPayouts.map(payout => (
                    <div key={payout.id} className="flex items-center gap-3 px-3 py-3 rounded-xl bg-white/4" data-testid={`payout-row-${payout.id}`}>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-white">{payout.djName}</div>
                        <div className="text-[10px] text-white/35">Event: {payout.eventId.slice(0, 8)}... · {new Date(payout.createdAt).toLocaleDateString()}</div>
                      </div>
                      <div className="text-sm font-black text-[#30d158]">${payout.amount.toFixed(2)}</div>
                      {payout.status === "pending" ? (
                        <button
                          onClick={() => processPayoutMutation.mutate(payout.id)}
                          disabled={processPayoutMutation.isPending}
                          className="px-3 py-1.5 rounded-lg text-[10px] font-bold text-white disabled:opacity-50 transition-all"
                          style={{ background: "rgba(48,209,88,0.3)", border: "1px solid rgba(48,209,88,0.4)" }}
                          data-testid={`button-process-payout-${payout.id}`}
                        >
                          Process
                        </button>
                      ) : (
                        <div className="flex items-center gap-1 text-[10px] text-[#30d158]">
                          <CheckCircle className="w-3.5 h-3.5" />
                          Done
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
      <AppFooter />
    </div>
  );
}
