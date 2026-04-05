import { useState } from "react";
import { useLocation } from "wouter";
import { Shield, ArrowLeft, Search, Users, Trash2, Loader2, UserCog, AlertTriangle } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";

interface AdminUser {
  id: string;
  username: string;
  accountType: string;
  tosAcknowledgedAt: string | null;
  venueLicenseAcknowledgedAt: string | null;
}

const ACCOUNT_TYPES = ["dj", "artist", "listener", "admin"] as const;

function getAdminKey(): string {
  if (typeof window !== "undefined") {
    return localStorage.getItem("adminKey") || "admin";
  }
  return "admin";
}

function adminFetch(url: string, options?: RequestInit) {
  return fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "x-admin-key": getAdminKey(),
      ...(options?.headers || {}),
    },
  });
}

export default function AdminUsersPage() {
  const [, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const { data: users, isLoading } = useQuery<AdminUser[]>({
    queryKey: ["/api/admin/users"],
    queryFn: async () => {
      const res = await adminFetch("/api/admin/users");
      if (!res.ok) throw new Error("Failed to load users");
      return res.json();
    },
  });

  const updateAccountTypeMutation = useMutation({
    mutationFn: async ({ id, accountType }: { id: string; accountType: string }) => {
      const res = await adminFetch(`/api/admin/users/${id}`, {
        method: "PUT",
        body: JSON.stringify({ accountType }),
      });
      if (!res.ok) throw new Error("Failed to update user");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setUpdatingId(null);
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await adminFetch(`/api/admin/users/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete user");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setDeletingId(null);
    },
  });

  const filteredUsers = (users || []).filter((u) =>
    u.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalUsers = users?.length || 0;
  const accountTypeCounts = (users || []).reduce<Record<string, number>>((acc, u) => {
    acc[u.accountType] = (acc[u.accountType] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#0a0a0a" }}>
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/admin")}
            className="p-2 rounded-xl hover:bg-white/5 transition-colors"
            data-testid="button-back-admin"
          >
            <ArrowLeft className="w-5 h-5 text-white/50" />
          </button>
          <Shield className="w-6 h-6 text-[#0EA5E9]" />
          <div>
            <h1 className="text-xl font-black text-white" data-testid="text-page-title">
              User Management
            </h1>
            <p className="text-white/40 text-xs">Manage platform users and account types</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div
            className="rounded-2xl p-4 space-y-1"
            style={{
              background: "rgba(17,17,17,0.8)",
              border: "1px solid #1e1e1e",
              backdropFilter: "blur(12px)",
            }}
            data-testid="stat-total-users"
          >
            <Users className="w-5 h-5 text-[#0EA5E9]" />
            <div className="text-2xl font-black text-white">{totalUsers}</div>
            <div className="text-[10px] text-white/40">Total Users</div>
          </div>
          {(["dj", "artist", "listener"] as const).map((type) => (
            <div
              key={type}
              className="rounded-2xl p-4 space-y-1"
              style={{
                background: "rgba(17,17,17,0.8)",
                border: "1px solid #1e1e1e",
                backdropFilter: "blur(12px)",
              }}
              data-testid={`stat-${type}-count`}
            >
              <UserCog className="w-5 h-5 text-[#06B6D4]" />
              <div className="text-2xl font-black text-white">{accountTypeCounts[type] || 0}</div>
              <div className="text-[10px] text-white/40 capitalize">{type === "dj" ? "DJs" : `${type}s`}</div>
            </div>
          ))}
        </div>

        {/* Search Bar */}
        <div
          className="flex items-center gap-3 rounded-2xl px-4 py-3"
          style={{
            background: "rgba(17,17,17,0.8)",
            border: "1px solid #1e1e1e",
            backdropFilter: "blur(12px)",
          }}
        >
          <Search className="w-4 h-4 text-white/30" />
          <input
            type="text"
            placeholder="Search by username..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent text-sm text-white placeholder:text-white/30 focus:outline-none"
            data-testid="input-search-users"
          />
          {searchQuery && (
            <span className="text-[10px] text-white/40">
              {filteredUsers.length} result{filteredUsers.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-16" data-testid="loading-state">
            <Loader2 className="w-8 h-8 text-[#0EA5E9]/40 mx-auto animate-spin" />
            <p className="text-white/30 text-sm mt-3">Loading users...</p>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && filteredUsers.length === 0 && (
          <div className="text-center py-16" data-testid="empty-state">
            <Users className="w-10 h-10 text-white/10 mx-auto mb-3" />
            <p className="text-white/30 text-sm">
              {searchQuery ? `No users matching "${searchQuery}"` : "No users found."}
            </p>
          </div>
        )}

        {/* Desktop Table */}
        {!isLoading && filteredUsers.length > 0 && (
          <div
            className="hidden md:block rounded-2xl overflow-hidden"
            style={{
              background: "rgba(17,17,17,0.8)",
              border: "1px solid #1e1e1e",
              backdropFilter: "blur(12px)",
            }}
            data-testid="users-table"
          >
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: "1px solid #1e1e1e" }}>
                  <th className="text-left text-[10px] font-black uppercase tracking-wider text-white/40 px-5 py-3">
                    ID
                  </th>
                  <th className="text-left text-[10px] font-black uppercase tracking-wider text-white/40 px-5 py-3">
                    Username
                  </th>
                  <th className="text-left text-[10px] font-black uppercase tracking-wider text-white/40 px-5 py-3">
                    Account Type
                  </th>
                  <th className="text-left text-[10px] font-black uppercase tracking-wider text-white/40 px-5 py-3">
                    TOS Status
                  </th>
                  <th className="text-right text-[10px] font-black uppercase tracking-wider text-white/40 px-5 py-3">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr
                    key={user.id}
                    className="hover:bg-white/[0.02] transition-colors"
                    style={{ borderBottom: "1px solid #1e1e1e" }}
                    data-testid={`user-row-${user.id}`}
                  >
                    <td className="px-5 py-3">
                      <span className="text-xs text-white/50 font-mono">
                        {user.id.slice(0, 8)}...
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-sm font-semibold text-white">{user.username}</span>
                    </td>
                    <td className="px-5 py-3">
                      {updatingId === user.id ? (
                        <select
                          defaultValue={user.accountType}
                          onChange={(e) => {
                            updateAccountTypeMutation.mutate({
                              id: user.id,
                              accountType: e.target.value,
                            });
                          }}
                          onBlur={() => setUpdatingId(null)}
                          autoFocus
                          className="bg-[#1e1e1e] text-white text-xs rounded-lg px-2 py-1 border border-[#0EA5E9]/30 focus:outline-none focus:border-[#0EA5E9]"
                          data-testid={`select-account-type-${user.id}`}
                        >
                          {ACCOUNT_TYPES.map((type) => (
                            <option key={type} value={type}>
                              {type}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <button
                          onClick={() => setUpdatingId(user.id)}
                          className="text-xs font-bold px-2.5 py-1 rounded-full capitalize cursor-pointer hover:opacity-80 transition-opacity"
                          style={{
                            background:
                              user.accountType === "admin"
                                ? "rgba(14,165,233,0.15)"
                                : user.accountType === "artist"
                                  ? "rgba(6,182,212,0.15)"
                                  : "rgba(255,255,255,0.08)",
                            color:
                              user.accountType === "admin"
                                ? "#0EA5E9"
                                : user.accountType === "artist"
                                  ? "#06B6D4"
                                  : "rgba(255,255,255,0.6)",
                            border: `1px solid ${
                              user.accountType === "admin"
                                ? "rgba(14,165,233,0.25)"
                                : user.accountType === "artist"
                                  ? "rgba(6,182,212,0.25)"
                                  : "rgba(255,255,255,0.1)"
                            }`,
                          }}
                          data-testid={`badge-account-type-${user.id}`}
                        >
                          {user.accountType}
                        </button>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      {user.tosAcknowledgedAt ? (
                        <span className="text-[10px] font-bold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full">
                          Accepted
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full">
                          Pending
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right">
                      {deletingId === user.id ? (
                        <div className="flex items-center justify-end gap-2">
                          <span className="text-[10px] text-red-400">Delete?</span>
                          <button
                            onClick={() => deleteUserMutation.mutate(user.id)}
                            disabled={deleteUserMutation.isPending}
                            className="px-2.5 py-1 rounded-lg text-[10px] font-bold text-white bg-red-500/20 border border-red-500/30 hover:bg-red-500/30 transition-colors disabled:opacity-50"
                            data-testid={`button-confirm-delete-${user.id}`}
                          >
                            {deleteUserMutation.isPending ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              "Yes"
                            )}
                          </button>
                          <button
                            onClick={() => setDeletingId(null)}
                            className="px-2.5 py-1 rounded-lg text-[10px] font-bold text-white/50 bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                            data-testid={`button-cancel-delete-${user.id}`}
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeletingId(user.id)}
                          className="p-1.5 rounded-lg hover:bg-red-500/10 text-white/30 hover:text-red-400 transition-colors"
                          data-testid={`button-delete-${user.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Mobile Cards */}
        {!isLoading && filteredUsers.length > 0 && (
          <div className="md:hidden space-y-3" data-testid="users-cards-mobile">
            {filteredUsers.map((user) => (
              <div
                key={user.id}
                className="rounded-2xl p-4 space-y-3"
                style={{
                  background: "rgba(17,17,17,0.8)",
                  border: "1px solid #1e1e1e",
                  backdropFilter: "blur(12px)",
                }}
                data-testid={`user-card-${user.id}`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-white">{user.username}</p>
                    <p className="text-[10px] text-white/30 font-mono">{user.id.slice(0, 8)}...</p>
                  </div>
                  {user.tosAcknowledgedAt ? (
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full">
                      TOS Accepted
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full">
                      TOS Pending
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-white/40">Type:</span>
                    {updatingId === user.id ? (
                      <select
                        defaultValue={user.accountType}
                        onChange={(e) => {
                          updateAccountTypeMutation.mutate({
                            id: user.id,
                            accountType: e.target.value,
                          });
                        }}
                        onBlur={() => setUpdatingId(null)}
                        autoFocus
                        className="bg-[#1e1e1e] text-white text-xs rounded-lg px-2 py-1 border border-[#0EA5E9]/30 focus:outline-none focus:border-[#0EA5E9]"
                        data-testid={`select-account-type-mobile-${user.id}`}
                      >
                        {ACCOUNT_TYPES.map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <button
                        onClick={() => setUpdatingId(user.id)}
                        className="text-xs font-bold px-2.5 py-1 rounded-full capitalize cursor-pointer hover:opacity-80 transition-opacity"
                        style={{
                          background:
                            user.accountType === "admin"
                              ? "rgba(14,165,233,0.15)"
                              : user.accountType === "artist"
                                ? "rgba(6,182,212,0.15)"
                                : "rgba(255,255,255,0.08)",
                          color:
                            user.accountType === "admin"
                              ? "#0EA5E9"
                              : user.accountType === "artist"
                                ? "#06B6D4"
                                : "rgba(255,255,255,0.6)",
                          border: `1px solid ${
                            user.accountType === "admin"
                              ? "rgba(14,165,233,0.25)"
                              : user.accountType === "artist"
                                ? "rgba(6,182,212,0.25)"
                                : "rgba(255,255,255,0.1)"
                          }`,
                        }}
                        data-testid={`badge-account-type-mobile-${user.id}`}
                      >
                        {user.accountType}
                      </button>
                    )}
                  </div>

                  {deletingId === user.id ? (
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                      <button
                        onClick={() => deleteUserMutation.mutate(user.id)}
                        disabled={deleteUserMutation.isPending}
                        className="px-2.5 py-1 rounded-lg text-[10px] font-bold text-white bg-red-500/20 border border-red-500/30 hover:bg-red-500/30 transition-colors disabled:opacity-50"
                        data-testid={`button-confirm-delete-mobile-${user.id}`}
                      >
                        {deleteUserMutation.isPending ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          "Delete"
                        )}
                      </button>
                      <button
                        onClick={() => setDeletingId(null)}
                        className="px-2.5 py-1 rounded-lg text-[10px] font-bold text-white/50 bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                        data-testid={`button-cancel-delete-mobile-${user.id}`}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeletingId(user.id)}
                      className="p-1.5 rounded-lg hover:bg-red-500/10 text-white/30 hover:text-red-400 transition-colors"
                      data-testid={`button-delete-mobile-${user.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
