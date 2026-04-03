import { useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, DollarSign, CheckCircle, TrendingUp, Users, Loader2, BarChart2 } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";

interface AdminData {
  totalRoyaltiesThisMonth: number;
  platformFeeIncome: number;
  byArtist: Record<string, { artistName: string; plays: number; totalAmount: number; platformFee: number; netAmount: number }>;
  pendingPayouts: { id: string; artistId: string; period: string; totalPlays: number; totalAmount: number; platformFee: number; netAmount: number; status: string }[];
  allPayouts: { id: string; artistId: string; period: string; totalPlays: number; totalAmount: number; netAmount: number; status: string; paidAt: string | null }[];
}

export default function AdminRoyaltiesPage() {
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState<"overview" | "pending" | "history">("overview");

  const { data, isLoading, refetch } = useQuery<AdminData>({
    queryKey: ["/api/admin/royalties"],
    queryFn: async () => {
      const res = await fetch("/api/admin/royalties");
      if (!res.ok) throw new Error("Failed to load admin data");
      return res.json();
    },
  });

  const calculateMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/admin/royalties/calculate", { method: "POST" });
      if (!res.ok) throw new Error("Calculation failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/royalties"] });
    },
  });

  const markPaidMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/royalties/${id}/mark-paid`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to mark as paid");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/royalties"] });
    },
  });

  return (
    <div className="min-h-screen bg-[#0a0519] text-white">
      <header className="flex items-center justify-between px-6 py-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/")} className="p-2 rounded-lg hover:bg-white/5 transition-colors" data-testid="button-back-home">
            <ArrowLeft className="w-5 h-5 text-white/60" />
          </button>
          <DollarSign className="w-6 h-6 text-[#30d158]" />
          <h1 className="text-lg font-black text-[#30d158]">ADMIN — ROYALTIES</h1>
        </div>
        <button
          onClick={() => calculateMutation.mutate()}
          disabled={calculateMutation.isPending}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-black bg-[#30d158] hover:scale-[1.02] transition-all disabled:opacity-50"
          data-testid="button-calculate-royalties"
        >
          {calculateMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <BarChart2 className="w-3 h-3" />}
          Calculate This Month
        </button>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-6 space-y-5">
        {calculateMutation.isSuccess && (
          <div className="bg-[#30d158]/10 border border-[#30d158]/30 rounded-xl p-3 text-[#30d158] text-sm flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            Royalties calculated successfully!
          </div>
        )}

        {isLoading ? (
          <div className="text-center py-16"><Loader2 className="w-8 h-8 text-white/20 mx-auto animate-spin" /></div>
        ) : data ? (
          <>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center" data-testid="stat-total-royalties">
                <TrendingUp className="w-5 h-5 text-[#ffd60a] mx-auto mb-1" />
                <p className="text-2xl font-black text-white">${data.totalRoyaltiesThisMonth.toFixed(2)}</p>
                <p className="text-xs text-white/40">Royalties This Month</p>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center" data-testid="stat-platform-fee">
                <DollarSign className="w-5 h-5 text-[#30d158] mx-auto mb-1" />
                <p className="text-2xl font-black text-white">${data.platformFeeIncome.toFixed(2)}</p>
                <p className="text-xs text-white/40">Platform Fee (15%)</p>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center" data-testid="stat-pending-count">
                <Users className="w-5 h-5 text-[#bf5af2] mx-auto mb-1" />
                <p className="text-2xl font-black text-white">{data.pendingPayouts.length}</p>
                <p className="text-xs text-white/40">Pending Payouts</p>
              </div>
            </div>

            <div className="flex gap-1 bg-white/5 rounded-xl p-1">
              {(["overview", "pending", "history"] as const).map((tab) => (
                <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 py-2 rounded-lg text-xs font-bold capitalize transition-all ${activeTab === tab ? "bg-[#30d158] text-black" : "text-white/50 hover:text-white"}`} data-testid={`tab-admin-${tab}`}>
                  {tab === "pending" ? `Pending (${data.pendingPayouts.length})` : tab === "history" ? "History" : "Overview"}
                </button>
              ))}
            </div>

            {activeTab === "overview" && (
              <div className="space-y-3">
                <h3 className="text-sm font-black text-white/80">Royalties by Artist — This Month</h3>
                {Object.keys(data.byArtist).length === 0 ? (
                  <div className="text-center py-12 text-white/30">
                    <DollarSign className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">No royalty plays recorded this month.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {Object.entries(data.byArtist).map(([artistId, artist]) => (
                      <div key={artistId} className="bg-white/5 border border-white/10 rounded-2xl p-4" data-testid={`artist-royalty-${artistId}`}>
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <p className="text-sm font-bold text-white">{artist.artistName}</p>
                            <p className="text-xs text-white/40">{artist.plays} play{artist.plays !== 1 ? "s" : ""}</p>
                          </div>
                          <p className="text-sm font-black text-[#30d158]">${artist.netAmount.toFixed(2)} net</p>
                        </div>
                        <div className="grid grid-cols-3 gap-3 text-center">
                          <div>
                            <p className="text-sm font-black text-[#ffd60a]">${artist.totalAmount.toFixed(2)}</p>
                            <p className="text-[9px] text-white/40">GROSS</p>
                          </div>
                          <div>
                            <p className="text-sm font-black text-[#ff453a]">-${artist.platformFee.toFixed(2)}</p>
                            <p className="text-[9px] text-white/40">PLATFORM FEE</p>
                          </div>
                          <div>
                            <p className="text-sm font-black text-[#30d158]">${artist.netAmount.toFixed(2)}</p>
                            <p className="text-[9px] text-white/40">TO ARTIST</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === "pending" && (
              <div className="space-y-3">
                <h3 className="text-sm font-black text-white/80">Pending Payouts</h3>
                {data.pendingPayouts.length === 0 ? (
                  <div className="text-center py-12 text-white/30">
                    <CheckCircle className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">All payouts are up to date!</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {data.pendingPayouts.map((payout) => (
                      <div key={payout.id} className="bg-white/5 border border-[#ffd60a]/20 rounded-2xl p-4 flex items-center justify-between" data-testid={`pending-payout-${payout.id}`}>
                        <div>
                          <p className="text-sm font-bold text-white">Artist ID: {payout.artistId.slice(0, 8)}...</p>
                          <p className="text-xs text-white/40">{payout.period} · {payout.totalPlays} plays</p>
                          <div className="flex items-center gap-3 mt-1">
                            <p className="text-xs text-[#ffd60a]">Gross: ${payout.totalAmount.toFixed(2)}</p>
                            <p className="text-xs text-white/40">Fee: ${payout.platformFee.toFixed(2)}</p>
                            <p className="text-xs font-bold text-[#30d158]">Net: ${payout.netAmount.toFixed(2)}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => markPaidMutation.mutate(payout.id)}
                          disabled={markPaidMutation.isPending}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold text-black bg-[#30d158] hover:scale-[1.02] transition-all disabled:opacity-50 shrink-0"
                          data-testid={`button-mark-paid-${payout.id}`}
                        >
                          {markPaidMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                          Mark Paid
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === "history" && (
              <div className="space-y-3">
                <h3 className="text-sm font-black text-white/80">All Payouts</h3>
                {data.allPayouts.length === 0 ? (
                  <div className="text-center py-12 text-white/30">
                    <p className="text-sm">No payouts yet.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {data.allPayouts.map((payout) => (
                      <div key={payout.id} className="bg-white/5 border border-white/10 rounded-xl p-3 flex items-center justify-between" data-testid={`payout-history-${payout.id}`}>
                        <div>
                          <p className="text-xs font-bold text-white">{payout.period} · {payout.artistId.slice(0, 8)}...</p>
                          <p className="text-[10px] text-white/40">{payout.totalPlays} plays · ${payout.netAmount.toFixed(2)} net</p>
                        </div>
                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${payout.status === "paid" ? "bg-[#30d158]/20 text-[#30d158]" : "bg-[#ffd60a]/20 text-[#ffd60a]"}`}>
                          {payout.status.toUpperCase()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        ) : null}
      </main>
    </div>
  );
}
