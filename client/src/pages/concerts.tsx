import { useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Calendar, MapPin, Clock, DollarSign, Users, Search, Loader2, Music } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";

interface Concert {
  id: string;
  title: string;
  artistName: string;
  venue: string;
  city: string;
  date: string;
  time: string;
  price: number | null;
  rsvpCount: number;
}

function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function formatTime(timeStr: string): string {
  try {
    const [hours, minutes] = timeStr.split(":");
    const h = parseInt(hours, 10);
    const suffix = h >= 12 ? "PM" : "AM";
    const displayH = h % 12 || 12;
    return `${displayH}:${minutes} ${suffix}`;
  } catch {
    return timeStr;
  }
}

function formatPrice(price: number | null): string {
  if (price === null || price === 0) return "Free";
  return `$${price.toFixed(2)}`;
}

function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <Loader2
        className="w-10 h-10 mb-4 animate-spin"
        style={{ color: "#0EA5E9" }}
      />
      <p className="text-sm" style={{ color: "#666" }}>
        Loading events...
      </p>
    </div>
  );
}

function EmptyState({ filtered }: { filtered: boolean }) {
  return (
    <div
      className="flex flex-col items-center justify-center py-20 rounded-xl"
      style={{ background: "#111111", border: "1px solid #1e1e1e" }}
    >
      <Calendar className="w-12 h-12 mb-4" style={{ color: "#444" }} />
      <p className="text-sm" style={{ color: "#666" }}>
        {filtered
          ? "No events found for this city."
          : "No upcoming events yet."}
      </p>
    </div>
  );
}

function ConcertCard({ concert }: { concert: Concert }) {
  const rsvpMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/concerts/${concert.id}/rsvp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error("Failed to RSVP");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/concerts"] });
    },
  });

  const priceLabel = formatPrice(concert.price);
  const isFree = concert.price === null || concert.price === 0;

  return (
    <div
      className="rounded-2xl p-5 transition-all hover:scale-[1.01] hover:brightness-110"
      style={{
        background: "rgba(17, 17, 17, 0.7)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        border: "1px solid rgba(30, 30, 30, 0.8)",
        boxShadow: "0 4px 30px rgba(0, 0, 0, 0.3)",
      }}
    >
      {/* Title and Artist */}
      <div className="mb-3">
        <h3 className="text-white font-bold text-base truncate">
          {concert.title}
        </h3>
        <p className="text-sm truncate" style={{ color: "#06B6D4" }}>
          {concert.artistName}
        </p>
      </div>

      {/* Date and Time */}
      <div className="flex items-center gap-4 mb-2">
        <div className="flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5" style={{ color: "#0EA5E9" }} />
          <span className="text-xs" style={{ color: "#999" }}>
            {formatDate(concert.date)}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5" style={{ color: "#0EA5E9" }} />
          <span className="text-xs" style={{ color: "#999" }}>
            {formatTime(concert.time)}
          </span>
        </div>
      </div>

      {/* Venue and City */}
      <div className="flex items-center gap-1.5 mb-4">
        <MapPin className="w-3.5 h-3.5 shrink-0" style={{ color: "#0EA5E9" }} />
        <span className="text-xs truncate" style={{ color: "#999" }}>
          {concert.venue}, {concert.city}
        </span>
      </div>

      {/* Price, RSVP Count, and Button */}
      <div
        className="flex items-center justify-between pt-3"
        style={{ borderTop: "1px solid #1e1e1e" }}
      >
        <div className="flex items-center gap-4">
          <span
            className="text-sm font-bold"
            style={{ color: isFree ? "#30d158" : "#0EA5E9" }}
          >
            {priceLabel}
          </span>
          <div className="flex items-center gap-1">
            <Users className="w-3.5 h-3.5" style={{ color: "#666" }} />
            <span className="text-xs" style={{ color: "#666" }}>
              {concert.rsvpCount}
            </span>
          </div>
        </div>

        <button
          onClick={() => rsvpMutation.mutate()}
          disabled={rsvpMutation.isPending}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            background: rsvpMutation.isSuccess
              ? "rgba(48, 209, 88, 0.15)"
              : "rgba(14, 165, 233, 0.15)",
            color: rsvpMutation.isSuccess ? "#30d158" : "#0EA5E9",
            border: rsvpMutation.isSuccess
              ? "1px solid rgba(48, 209, 88, 0.3)"
              : "1px solid rgba(14, 165, 233, 0.3)",
          }}
        >
          {rsvpMutation.isPending ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : rsvpMutation.isSuccess ? (
            "RSVP'd"
          ) : (
            "RSVP"
          )}
        </button>
      </div>
    </div>
  );
}

export default function ConcertsPage() {
  const [, navigate] = useLocation();
  const [cityFilter, setCityFilter] = useState("");

  const { data: concerts = [], isLoading } = useQuery<Concert[]>({
    queryKey: ["/api/concerts"],
    queryFn: async () => {
      const res = await fetch("/api/concerts");
      if (!res.ok) throw new Error("Failed to load concerts");
      return res.json();
    },
  });

  const filtered = concerts.filter((c) => {
    if (!cityFilter) return true;
    return c.city.toLowerCase().includes(cityFilter.toLowerCase());
  });

  return (
    <div className="min-h-screen" style={{ background: "#0a0a0a", color: "#ffffff" }}>
      {/* Header */}
      <header
        className="sticky top-0 z-50 backdrop-blur-md"
        style={{ background: "#0a0a0aee", borderBottom: "1px solid #1e1e1e" }}
      >
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-4">
          <button
            onClick={() => navigate("/")}
            className="p-2 rounded-lg transition-colors hover:bg-white/5"
            aria-label="Back to home"
          >
            <ArrowLeft className="w-5 h-5" style={{ color: "#999" }} />
          </button>
          <div className="flex items-center gap-3">
            <Calendar className="w-6 h-6" style={{ color: "#0EA5E9" }} />
            <h1 className="text-lg sm:text-xl font-bold">Events & Concerts</h1>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* City Filter */}
        <div className="relative max-w-md">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
            style={{ color: "#444" }}
          />
          <input
            value={cityFilter}
            onChange={(e) => setCityFilter(e.target.value)}
            placeholder="Filter by city..."
            className="w-full rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-white/20 outline-none transition-colors focus:border-[#0EA5E9]/60"
            style={{
              background: "#111111",
              border: "1px solid #1e1e1e",
            }}
          />
        </div>

        {/* Content */}
        {isLoading ? (
          <LoadingState />
        ) : filtered.length === 0 ? (
          <EmptyState filtered={cityFilter.length > 0} />
        ) : (
          <>
            <p className="text-xs" style={{ color: "#555" }}>
              {filtered.length} event{filtered.length !== 1 ? "s" : ""} found
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((concert) => (
                <ConcertCard key={concert.id} concert={concert} />
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
