import { useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Music, DollarSign, TrendingUp, Clock, Upload, Edit3, Save, BarChart2, Disc3, BadgeCheck, X } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";

interface Track {
  id: string;
  title: string;
  artistName: string;
  genre: string | null;
  bpm: number | null;
  key: string | null;
  isrc: string | null;
  licenseType: string;
  royaltyRate: number | null;
  playCount: number;
  available: boolean;
  createdAt: string;
}

interface DashboardData {
  profile: { id: string; stageName: string; bio: string | null; payoutInfoPlaceholder: string | null };
  trackStats: {
    track: Track;
    totalPlays: number;
    totalEarnings: number;
    netEarnings: number;
    plays: any[];
  }[];
  totalEarningsThisMonth: number;
  netEarningsThisMonth: number;
  pendingPayout: number;
  payouts: { id: string; period: string; totalPlays: number; netAmount: number; status: string; paidAt: string | null }[];
}

const LICENSE_COLORS: Record<string, string> = { free: "#30d158", royalty: "#ffd60a", promo: "#0af" };
const LICENSE_LABELS: Record<string, string> = { free: "Free", royalty: "Royalty", promo: "Promo" };

export default function ArtistDashboard() {
  const [, navigate] = useLocation();
  const [userId, setUserId] = useState(() => localStorage.getItem("djhybrid_artist_user_id") || "");
  const [artistProfileId, setArtistProfileId] = useState(() => localStorage.getItem("djhybrid_artist_profile_id") || "");
  const [loginUserId, setLoginUserId] = useState("");
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ stageName: "", bio: "", payoutInfoPlaceholder: "" });
  const [uploadForm, setUploadForm] = useState({ title: "", genre: "", bpm: "", key: "", isrc: "", licenseType: "free", royaltyRate: "0.10" });
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [activeTab, setActiveTab] = useState<"tracks" | "earnings" | "payouts">("tracks");

  const { data: dashboard, isLoading } = useQuery<DashboardData>({
    queryKey: ["/api/artist/dashboard", artistProfileId],
    enabled: !!artistProfileId,
    queryFn: async () => {
      const res = await fetch(`/api/artist/dashboard/${artistProfileId}`);
      if (!res.ok) throw new Error("Not found");
      return res.json();
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/artist/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, ...data }),
      });
      if (!res.ok) throw new Error("Failed to save profile");
      const profile = await res.json();
      setArtistProfileId(profile.id);
      localStorage.setItem("djhybrid_artist_profile_id", profile.id);
      return profile;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/artist/dashboard", artistProfileId] });
      setEditingProfile(false);
    },
  });

  const handleSetUserId = () => {
    if (!loginUserId.trim()) return;
    setUserId(loginUserId.trim());
    localStorage.setItem("djhybrid_artist_user_id", loginUserId.trim());
  };

  const handleCreateProfile = () => {
    if (!profileForm.stageName) return;
    updateProfileMutation.mutate(profileForm);
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile || !uploadForm.title || !uploadForm.licenseType) {
      setUploadError("Title, license type, and audio file are required.");
      return;
    }
    if (uploadForm.licenseType === "royalty" && (!uploadForm.royaltyRate || parseFloat(uploadForm.royaltyRate) < 0.01 || parseFloat(uploadForm.royaltyRate) > 1.00)) {
      setUploadError("Royalty rate must be between $0.01 and $1.00.");
      return;
    }
    setUploadError("");
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", uploadFile);
      formData.append("artistId", artistProfileId);
      formData.append("title", uploadForm.title);
      formData.append("artistName", dashboard?.profile.stageName || "Artist");
      if (uploadForm.genre) formData.append("genre", uploadForm.genre);
      if (uploadForm.bpm) formData.append("bpm", uploadForm.bpm);
      if (uploadForm.key) formData.append("key", uploadForm.key);
      if (uploadForm.isrc) formData.append("isrc", uploadForm.isrc);
      formData.append("licenseType", uploadForm.licenseType);
      if (uploadForm.licenseType === "royalty") formData.append("royaltyRate", uploadForm.royaltyRate);

      const res = await fetch("/api/tracks", { method: "POST", body: formData });
      if (!res.ok) { const d = await res.json(); setUploadError(d.error || "Upload failed"); return; }
      setShowUpload(false);
      setUploadFile(null);
      setUploadForm({ title: "", genre: "", bpm: "", key: "", isrc: "", licenseType: "free", royaltyRate: "0.10" });
      queryClient.invalidateQueries({ queryKey: ["/api/artist/dashboard", artistProfileId] });
    } catch {
      setUploadError("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  if (!userId) {
    return (
      <div className="min-h-screen bg-[#0a0519] text-white flex items-center justify-center px-6">
        <div className="max-w-sm w-full space-y-4">
          <div className="text-center mb-6">
            <Disc3 className="w-12 h-12 text-[#ffd60a] mx-auto mb-3" />
            <h2 className="text-2xl font-black">Artist Dashboard</h2>
            <p className="text-white/50 text-sm mt-1">Enter your User ID to continue</p>
          </div>
          <input
            value={loginUserId}
            onChange={(e) => setLoginUserId(e.target.value)}
            placeholder="Your User ID (from signup)"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-white/20 focus:outline-none focus:border-[#ffd60a]/60 transition-colors"
            data-testid="input-artist-user-id"
          />
          <button onClick={handleSetUserId} className="w-full py-3 rounded-xl font-bold text-black text-sm transition-all hover:scale-[1.02] bg-[#ffd60a]" data-testid="button-artist-login">
            Continue
          </button>
          <button onClick={() => navigate("/signup")} className="w-full py-3 rounded-xl font-bold text-white/60 text-sm bg-white/5 hover:bg-white/10 transition-all" data-testid="button-go-signup">
            Create an Account
          </button>
        </div>
      </div>
    );
  }

  if (!artistProfileId || (!isLoading && !dashboard)) {
    return (
      <div className="min-h-screen bg-[#0a0519] text-white flex items-center justify-center px-6">
        <div className="max-w-sm w-full space-y-4">
          <div className="text-center mb-6">
            <Music className="w-12 h-12 text-[#ffd60a] mx-auto mb-3" />
            <h2 className="text-xl font-black">Set Up Your Artist Profile</h2>
            <p className="text-white/50 text-sm mt-1">Get started by creating your profile</p>
          </div>
          <div className="space-y-3">
            <input value={profileForm.stageName} onChange={(e) => setProfileForm({ ...profileForm, stageName: e.target.value })} placeholder="Stage name *" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-white/20 focus:outline-none focus:border-[#ffd60a]/60 transition-colors" data-testid="input-stage-name" />
            <textarea value={profileForm.bio} onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })} placeholder="Bio (optional)" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-white/20 focus:outline-none focus:border-[#ffd60a]/60 transition-colors resize-none" rows={3} data-testid="input-bio" />
            <input value={profileForm.payoutInfoPlaceholder} onChange={(e) => setProfileForm({ ...profileForm, payoutInfoPlaceholder: e.target.value })} placeholder="Payout info (PayPal, bank, etc.) — optional" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-white/20 focus:outline-none focus:border-[#ffd60a]/60 transition-colors" data-testid="input-payout-info" />
          </div>
          <button onClick={handleCreateProfile} disabled={!profileForm.stageName || updateProfileMutation.isPending} className="w-full py-3 rounded-xl font-bold text-black text-sm transition-all hover:scale-[1.02] bg-[#ffd60a] disabled:opacity-50" data-testid="button-create-profile">
            {updateProfileMutation.isPending ? "Creating..." : "Create Profile"}
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0519] text-white flex items-center justify-center">
        <div className="text-center"><Disc3 className="w-10 h-10 text-[#ffd60a] mx-auto mb-3 animate-spin" /><p className="text-white/40 text-sm">Loading dashboard...</p></div>
      </div>
    );
  }

  const d = dashboard!;

  return (
    <div className="min-h-screen bg-[#0a0519] text-white">
      <header className="flex items-center justify-between px-6 py-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/")} className="p-2 rounded-lg hover:bg-white/5 transition-colors" data-testid="button-back-home">
            <ArrowLeft className="w-5 h-5 text-white/60" />
          </button>
          <Disc3 className="w-6 h-6 text-[#ffd60a]" />
          <h1 className="text-lg font-black text-[#ffd60a]">{d.profile.stageName}</h1>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => { setEditingProfile(true); setProfileForm({ stageName: d.profile.stageName, bio: d.profile.bio || "", payoutInfoPlaceholder: d.profile.payoutInfoPlaceholder || "" }); }} className="p-2 rounded-lg hover:bg-white/5 transition-colors" data-testid="button-edit-profile">
            <Edit3 className="w-4 h-4 text-white/40" />
          </button>
        </div>
      </header>

      {editingProfile && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a0f2e] border border-white/10 rounded-2xl p-6 w-full max-w-md space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-white">Edit Profile</h3>
              <button onClick={() => setEditingProfile(false)} className="p-1 rounded-lg hover:bg-white/5"><X className="w-4 h-4 text-white/40" /></button>
            </div>
            <input value={profileForm.stageName} onChange={(e) => setProfileForm({ ...profileForm, stageName: e.target.value })} placeholder="Stage name" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-white/20 focus:outline-none focus:border-[#ffd60a]/60 transition-colors" data-testid="input-edit-stage-name" />
            <textarea value={profileForm.bio} onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })} placeholder="Bio" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-white/20 focus:outline-none focus:border-[#ffd60a]/60 transition-colors resize-none" rows={3} data-testid="input-edit-bio" />
            <input value={profileForm.payoutInfoPlaceholder} onChange={(e) => setProfileForm({ ...profileForm, payoutInfoPlaceholder: e.target.value })} placeholder="Payout info" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-white/20 focus:outline-none focus:border-[#ffd60a]/60 transition-colors" data-testid="input-edit-payout-info" />
            <div className="flex gap-3">
              <button onClick={() => updateProfileMutation.mutate(profileForm)} className="flex-1 py-3 rounded-xl font-bold text-black text-sm bg-[#ffd60a] transition-all hover:scale-[1.01]" data-testid="button-save-profile">
                <Save className="w-4 h-4 inline mr-1" />Save
              </button>
              <button onClick={() => setEditingProfile(false)} className="px-4 py-3 rounded-xl font-bold text-white/60 text-sm bg-white/5 hover:bg-white/10 transition-all" data-testid="button-cancel-edit">Cancel</button>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-4xl mx-auto px-6 py-6 space-y-6">
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center" data-testid="stat-total-plays">
            <BarChart2 className="w-5 h-5 text-[#bf5af2] mx-auto mb-1" />
            <p className="text-2xl font-black text-white">{d.trackStats.reduce((s, t) => s + t.totalPlays, 0)}</p>
            <p className="text-xs text-white/40">Total Plays</p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center" data-testid="stat-month-earnings">
            <DollarSign className="w-5 h-5 text-[#30d158] mx-auto mb-1" />
            <p className="text-2xl font-black text-white">${d.netEarningsThisMonth.toFixed(2)}</p>
            <p className="text-xs text-white/40">This Month (Net)</p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center" data-testid="stat-pending-payout">
            <Clock className="w-5 h-5 text-[#ffd60a] mx-auto mb-1" />
            <p className="text-2xl font-black text-white">${d.pendingPayout.toFixed(2)}</p>
            <p className="text-xs text-white/40">Pending Payout</p>
          </div>
        </div>

        <div className="bg-[#bf5af2]/5 border border-[#bf5af2]/20 rounded-2xl p-4">
          <h3 className="text-xs font-black uppercase tracking-wider text-[#bf5af2] mb-2">How Royalties Work</h3>
          <p className="text-xs text-white/60 leading-relaxed">
            When a DJ plays your Royalty Per Play track at an event, the platform records the play and calculates the royalty based on your rate. At the end of each month, totals are calculated. DJ Hybrid retains a <strong className="text-white/80">15% platform fee</strong> — you receive the remaining <strong className="text-white/80">85%</strong>. Payouts are disbursed monthly.
          </p>
        </div>

        <div className="flex gap-1 bg-white/5 rounded-xl p-1">
          {(["tracks", "earnings", "payouts"] as const).map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 py-2 rounded-lg text-xs font-bold capitalize transition-all ${activeTab === tab ? "bg-[#ffd60a] text-black" : "text-white/50 hover:text-white"}`} data-testid={`tab-artist-${tab}`}>
              {tab === "earnings" ? "Earnings" : tab === "payouts" ? "Payout History" : "Tracks"}
            </button>
          ))}
        </div>

        {activeTab === "tracks" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-white/80">Track Catalog ({d.trackStats.length})</h3>
              <button onClick={() => setShowUpload(!showUpload)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-black bg-[#ffd60a] hover:scale-[1.02] transition-all" data-testid="button-upload-track">
                <Upload className="w-3 h-3" />Upload Track
              </button>
            </div>

            {showUpload && (
              <form onSubmit={handleUpload} className="bg-white/5 border border-[#ffd60a]/20 rounded-2xl p-5 space-y-3">
                <h4 className="text-sm font-black text-[#ffd60a]">Upload New Track</h4>
                <input value={uploadForm.title} onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })} placeholder="Track title *" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder-white/20 focus:outline-none focus:border-[#ffd60a]/60" required data-testid="input-track-title" />
                <div className="grid grid-cols-2 gap-3">
                  <input value={uploadForm.genre} onChange={(e) => setUploadForm({ ...uploadForm, genre: e.target.value })} placeholder="Genre" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder-white/20 focus:outline-none focus:border-[#ffd60a]/60" data-testid="input-track-genre" />
                  <input value={uploadForm.bpm} onChange={(e) => setUploadForm({ ...uploadForm, bpm: e.target.value })} placeholder="BPM" type="number" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder-white/20 focus:outline-none focus:border-[#ffd60a]/60" data-testid="input-track-bpm" />
                  <input value={uploadForm.key} onChange={(e) => setUploadForm({ ...uploadForm, key: e.target.value })} placeholder="Key (e.g. C Major)" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder-white/20 focus:outline-none focus:border-[#ffd60a]/60" data-testid="input-track-key" />
                  <input value={uploadForm.isrc} onChange={(e) => setUploadForm({ ...uploadForm, isrc: e.target.value })} placeholder="ISRC (optional)" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder-white/20 focus:outline-none focus:border-[#ffd60a]/60" data-testid="input-track-isrc" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-white/50">License Type *</label>
                  <select value={uploadForm.licenseType} onChange={(e) => setUploadForm({ ...uploadForm, licenseType: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#ffd60a]/60" data-testid="select-license-type">
                    <option value="free">Free for DJ Use</option>
                    <option value="royalty">Royalty Per Play</option>
                    <option value="promo">Exclusive Promo (credit required)</option>
                  </select>
                </div>
                {uploadForm.licenseType === "royalty" && (
                  <div className="space-y-1.5">
                    <label className="text-xs text-white/50">Royalty Rate per Play ($0.01 – $1.00)</label>
                    <input value={uploadForm.royaltyRate} onChange={(e) => setUploadForm({ ...uploadForm, royaltyRate: e.target.value })} type="number" min="0.01" max="1.00" step="0.01" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder-white/20 focus:outline-none focus:border-[#ffd60a]/60" data-testid="input-royalty-rate" />
                  </div>
                )}
                <div className="space-y-1.5">
                  <label className="text-xs text-white/50">Audio File * (MP3, WAV, FLAC, etc.)</label>
                  <input type="file" accept="audio/*" onChange={(e) => setUploadFile(e.target.files?.[0] || null)} className="w-full text-white/60 text-sm file:mr-3 file:px-3 file:py-1.5 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-[#ffd60a] file:text-black cursor-pointer" data-testid="input-track-file" />
                </div>
                {uploadError && <p className="text-[#ff453a] text-xs">{uploadError}</p>}
                <div className="flex gap-3 pt-1">
                  <button type="submit" disabled={uploading} className="flex-1 py-2.5 rounded-xl font-bold text-black text-sm bg-[#ffd60a] hover:scale-[1.01] transition-all disabled:opacity-50" data-testid="button-submit-upload">
                    {uploading ? "Uploading..." : "Upload Track"}
                  </button>
                  <button type="button" onClick={() => setShowUpload(false)} className="px-4 py-2.5 rounded-xl font-bold text-white/60 text-sm bg-white/5 hover:bg-white/10 transition-all" data-testid="button-cancel-upload">Cancel</button>
                </div>
              </form>
            )}

            {d.trackStats.length === 0 ? (
              <div className="text-center py-12 text-white/30">
                <Music className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No tracks uploaded yet. Upload your first track to start earning!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {d.trackStats.map(({ track, totalPlays, totalEarnings, netEarnings }) => (
                  <div key={track.id} className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center gap-4" data-testid={`track-card-${track.id}`}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-bold text-white truncate">{track.title}</p>
                        <span className="shrink-0 text-[9px] font-black px-1.5 py-0.5 rounded-full" style={{ background: `${LICENSE_COLORS[track.licenseType]}20`, color: LICENSE_COLORS[track.licenseType] }}>
                          {LICENSE_LABELS[track.licenseType]}
                        </span>
                      </div>
                      <p className="text-xs text-white/40">
                        {[track.genre, track.bpm && `${track.bpm} BPM`, track.key].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                    <div className="text-right shrink-0 space-y-0.5">
                      <p className="text-sm font-black text-white">{totalPlays} plays</p>
                      {totalEarnings > 0 && <p className="text-xs text-[#30d158]">${netEarnings.toFixed(2)} earned</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "earnings" && (
          <div className="space-y-3">
            <h3 className="text-sm font-black text-white/80">Earnings by Track</h3>
            {d.trackStats.filter(t => t.totalEarnings > 0).length === 0 ? (
              <div className="text-center py-12 text-white/30">
                <DollarSign className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No royalty earnings yet. Get your tracks played to start earning!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {d.trackStats.filter(t => t.totalEarnings > 0).map(({ track, totalPlays, totalEarnings, netEarnings }) => (
                  <div key={track.id} className="bg-white/5 border border-white/10 rounded-2xl p-4" data-testid={`earnings-card-${track.id}`}>
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-bold text-white">{track.title}</p>
                      <p className="text-sm font-black text-[#30d158]">${netEarnings.toFixed(2)}</p>
                    </div>
                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div>
                        <p className="text-lg font-black text-white">{totalPlays}</p>
                        <p className="text-[9px] text-white/40">PLAYS</p>
                      </div>
                      <div>
                        <p className="text-lg font-black text-[#ffd60a]">${totalEarnings.toFixed(2)}</p>
                        <p className="text-[9px] text-white/40">GROSS</p>
                      </div>
                      <div>
                        <p className="text-lg font-black text-[#30d158]">${netEarnings.toFixed(2)}</p>
                        <p className="text-[9px] text-white/40">NET (85%)</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "payouts" && (
          <div className="space-y-3">
            <h3 className="text-sm font-black text-white/80">Payout History</h3>
            {d.payouts.length === 0 ? (
              <div className="text-center py-12 text-white/30">
                <Clock className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No payouts processed yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {d.payouts.map((p) => (
                  <div key={p.id} className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center justify-between" data-testid={`payout-row-${p.id}`}>
                    <div>
                      <p className="text-sm font-bold text-white">{p.period}</p>
                      <p className="text-xs text-white/40">{p.totalPlays} plays</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-[#30d158]">${p.netAmount.toFixed(2)}</p>
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${p.status === "paid" ? "bg-[#30d158]/20 text-[#30d158]" : "bg-[#ffd60a]/20 text-[#ffd60a]"}`}>
                        {p.status.toUpperCase()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
