import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, real, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const SUBSCRIPTION_TIERS = ["starter", "pro", "club"] as const;
export type SubscriptionTier = typeof SUBSCRIPTION_TIERS[number];

export const SUBSCRIPTION_PRICES: Record<SubscriptionTier, number> = {
  starter: 0,
  pro: 14.99,
  club: 39.99,
};

export const DAY_PASS_PRICE = 4.99;

export const PLATFORM_CUT = 0.15;
export const DJ_CUT = 0.85;

export interface Event {
  id: string;
  code: string;
  name: string;
  djId: string;
  djName: string;
  status: "active" | "ended";
  battleMode: boolean;
  deckADjName: string | null;
  deckBDjName: string | null;
  moodColor: string | null;
  moodKeyword: string | null;
  nowPlaying: string | null;
  createdAt: number;
  endedAt: number | null;
}

export interface InsertEvent {
  code: string;
  name: string;
  djId: string;
  djName: string;
  battleMode?: boolean;
  deckADjName?: string | null;
  deckBDjName?: string | null;
}

export interface SongRequest {
  id: string;
  eventId: string;
  crowdName: string;
  trackTitle: string;
  priorityPaid: boolean;
  priorityAmount: number;
  status: "pending" | "approved" | "rejected";
  createdAt: number;
}

export interface InsertSongRequest {
  eventId: string;
  crowdName: string;
  trackTitle: string;
  priorityPaid?: boolean;
  priorityAmount?: number;
}

export interface Reaction {
  id: string;
  eventId: string;
  crowdName: string;
  emoji: string;
  createdAt: number;
}

export interface InsertReaction {
  eventId: string;
  crowdName: string;
  emoji: string;
}

export interface Poll {
  id: string;
  eventId: string;
  question: string;
  options: string[];
  votes: Record<string, number>;
  active: boolean;
  createdAt: number;
}

export interface InsertPoll {
  eventId: string;
  question: string;
  options: string[];
}

export interface Shoutout {
  id: string;
  eventId: string;
  fromName: string;
  message: string;
  paid: boolean;
  amount: number;
  announced: boolean;
  createdAt: number;
}

export interface InsertShoutout {
  eventId: string;
  fromName: string;
  message: string;
  paid?: boolean;
  amount?: number;
}

export interface Tip {
  id: string;
  eventId: string;
  fromName: string;
  amount: number;
  platformCut: number;
  djShare: number;
  createdAt: number;
}

export interface InsertTip {
  eventId: string;
  fromName: string;
  amount: number;
}

export interface SetlistEntry {
  id: string;
  eventId: string;
  trackTitle: string;
  addedBy: string;
  playedAt: number;
}

export interface InsertSetlistEntry {
  eventId: string;
  trackTitle: string;
  addedBy: string;
}

export interface Subscription {
  id: string;
  djId: string;
  tier: SubscriptionTier;
  status: "active" | "expired" | "cancelled";
  startedAt: number;
  expiresAt: number | null;
  dayPass: boolean;
  eventId: string | null;
}

export interface InsertSubscription {
  djId: string;
  tier: SubscriptionTier;
  dayPass?: boolean;
  eventId?: string | null;
  expiresAt?: number | null;
}

export interface Payout {
  id: string;
  djId: string;
  djName: string;
  eventId: string;
  amount: number;
  status: "pending" | "processed";
  createdAt: number;
  processedAt: number | null;
}

export interface BattleVote {
  id: string;
  eventId: string;
  crowdName: string;
  deck: "A" | "B";
  createdAt: number;
}

export interface Leaderboard {
  crowdName: string;
  requests: number;
  tips: number;
  reactions: number;
  totalScore: number;
}
