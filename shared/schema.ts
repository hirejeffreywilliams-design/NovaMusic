import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, real, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  accountType: text("account_type").notNull().default("dj"),
  tosAcknowledgedAt: text("tos_acknowledged_at"),
  venueLicenseAcknowledgedAt: text("venue_license_acknowledged_at"),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  accountType: true,
  tosAcknowledgedAt: true,
  venueLicenseAcknowledgedAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Crowd engagement constants
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

// Crowd engagement TypeScript interfaces
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

// Music rights Drizzle pgTable definitions
export const artistProfiles = pgTable("artist_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  stageName: text("stage_name").notNull(),
  bio: text("bio"),
  payoutInfoPlaceholder: text("payout_info_placeholder"),
  createdAt: text("created_at").notNull(),
});

export const insertArtistProfileSchema = createInsertSchema(artistProfiles).omit({ id: true });
export type InsertArtistProfile = z.infer<typeof insertArtistProfileSchema>;
export type ArtistProfile = typeof artistProfiles.$inferSelect;

export const tracks = pgTable("tracks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  artistId: varchar("artist_id").notNull(),
  title: text("title").notNull(),
  artistName: text("artist_name").notNull(),
  genre: text("genre"),
  bpm: integer("bpm"),
  key: text("key"),
  isrc: text("isrc"),
  licenseType: text("license_type").notNull(),
  royaltyRate: real("royalty_rate"),
  fileUrl: text("file_url").notNull(),
  previewUrl: text("preview_url"),
  playCount: integer("play_count").notNull().default(0),
  available: boolean("available").notNull().default(true),
  createdAt: text("created_at").notNull(),
});

export const insertTrackSchema = createInsertSchema(tracks).omit({ id: true, playCount: true });
export type InsertTrack = z.infer<typeof insertTrackSchema>;
export type Track = typeof tracks.$inferSelect;

export const playEvents = pgTable("play_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  trackId: varchar("track_id"),
  eventId: text("event_id"),
  djUserId: text("dj_user_id"),
  trackTitle: text("track_title").notNull(),
  artistName: text("artist_name").notNull(),
  label: text("label"),
  isrc: text("isrc"),
  licenseType: text("license_type"),
  duration: integer("duration"),
  royaltyAmount: real("royalty_amount"),
  playedAt: text("played_at").notNull(),
  eventName: text("event_name"),
  venueName: text("venue_name"),
});

export const insertPlayEventSchema = createInsertSchema(playEvents).omit({ id: true });
export type InsertPlayEvent = z.infer<typeof insertPlayEventSchema>;
export type PlayEvent = typeof playEvents.$inferSelect;

export const royaltyPayouts = pgTable("royalty_payouts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  artistId: varchar("artist_id").notNull(),
  period: text("period").notNull(),
  totalPlays: integer("total_plays").notNull(),
  totalAmount: real("total_amount").notNull(),
  platformFee: real("platform_fee").notNull(),
  netAmount: real("net_amount").notNull(),
  status: text("status").notNull().default("pending"),
  createdAt: text("created_at").notNull(),
  paidAt: text("paid_at"),
});

export const insertRoyaltyPayoutSchema = createInsertSchema(royaltyPayouts).omit({ id: true });
export type InsertRoyaltyPayout = z.infer<typeof insertRoyaltyPayoutSchema>;
export type RoyaltyPayout = typeof royaltyPayouts.$inferSelect;

// ═══════════════════════════════════════════════════════════
// Playlists
// ═══════════════════════════════════════════════════════════
export const playlists = pgTable("playlists", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  coverUrl: text("cover_url"),
  visibility: text("visibility").notNull().default("private"), // public | private | collaborative
  trackCount: integer("track_count").notNull().default(0),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const insertPlaylistSchema = createInsertSchema(playlists).omit({ id: true, trackCount: true });
export type InsertPlaylist = z.infer<typeof insertPlaylistSchema>;
export type Playlist = typeof playlists.$inferSelect;

export const playlistTracks = pgTable("playlist_tracks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  playlistId: varchar("playlist_id").notNull(),
  trackId: varchar("track_id").notNull(),
  position: integer("position").notNull().default(0),
  addedBy: varchar("added_by"),
  addedAt: text("added_at").notNull(),
});

export const insertPlaylistTrackSchema = createInsertSchema(playlistTracks).omit({ id: true });
export type InsertPlaylistTrack = z.infer<typeof insertPlaylistTrackSchema>;
export type PlaylistTrack = typeof playlistTracks.$inferSelect;

// ═══════════════════════════════════════════════════════════
// Social: Followers, Likes, Comments
// ═══════════════════════════════════════════════════════════
export const followers = pgTable("followers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  followerId: varchar("follower_id").notNull(),
  followingId: varchar("following_id").notNull(),
  createdAt: text("created_at").notNull(),
});

export const insertFollowerSchema = createInsertSchema(followers).omit({ id: true });
export type InsertFollower = z.infer<typeof insertFollowerSchema>;
export type Follower = typeof followers.$inferSelect;

export const likes = pgTable("likes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  trackId: varchar("track_id").notNull(),
  createdAt: text("created_at").notNull(),
});

export const insertLikeSchema = createInsertSchema(likes).omit({ id: true });
export type InsertLike = z.infer<typeof insertLikeSchema>;
export type Like = typeof likes.$inferSelect;

export const comments = pgTable("comments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  trackId: varchar("track_id").notNull(),
  content: text("content").notNull(),
  username: text("username").notNull(),
  createdAt: text("created_at").notNull(),
});

export const insertCommentSchema = createInsertSchema(comments).omit({ id: true });
export type InsertComment = z.infer<typeof insertCommentSchema>;
export type Comment = typeof comments.$inferSelect;

// ═══════════════════════════════════════════════════════════
// Live Streams
// ═══════════════════════════════════════════════════════════
export const liveStreams = pgTable("live_streams", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  artistId: varchar("artist_id").notNull(),
  artistName: text("artist_name").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status").notNull().default("scheduled"), // scheduled | live | ended
  viewerCount: integer("viewer_count").notNull().default(0),
  scheduledAt: text("scheduled_at"),
  startedAt: text("started_at"),
  endedAt: text("ended_at"),
  createdAt: text("created_at").notNull(),
});

export const insertLiveStreamSchema = createInsertSchema(liveStreams).omit({ id: true, viewerCount: true });
export type InsertLiveStream = z.infer<typeof insertLiveStreamSchema>;
export type LiveStream = typeof liveStreams.$inferSelect;

// ═══════════════════════════════════════════════════════════
// Lyrics
// ═══════════════════════════════════════════════════════════
export const lyrics = pgTable("lyrics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  trackId: varchar("track_id").notNull(),
  plainText: text("plain_text").notNull(),
  syncedLines: jsonb("synced_lines"), // [{time: number, text: string}]
  createdAt: text("created_at").notNull(),
});

export const insertLyricsSchema = createInsertSchema(lyrics).omit({ id: true });
export type InsertLyrics = z.infer<typeof insertLyricsSchema>;
export type Lyrics = typeof lyrics.$inferSelect;

// ═══════════════════════════════════════════════════════════
// Concerts / Events
// ═══════════════════════════════════════════════════════════
export const concerts = pgTable("concerts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  artistId: varchar("artist_id").notNull(),
  artistName: text("artist_name").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  venue: text("venue").notNull(),
  city: text("city").notNull(),
  date: text("date").notNull(),
  time: text("time"),
  ticketUrl: text("ticket_url"),
  imageUrl: text("image_url"),
  price: real("price"),
  capacity: integer("capacity"),
  rsvpCount: integer("rsvp_count").notNull().default(0),
  createdAt: text("created_at").notNull(),
});

export const insertConcertSchema = createInsertSchema(concerts).omit({ id: true, rsvpCount: true });
export type InsertConcert = z.infer<typeof insertConcertSchema>;
export type Concert = typeof concerts.$inferSelect;

// ═══════════════════════════════════════════════════════════
// Merchandise Store
// ═══════════════════════════════════════════════════════════
export const merchandise = pgTable("merchandise", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  artistId: varchar("artist_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  price: real("price").notNull(),
  imageUrl: text("image_url"),
  category: text("category").notNull().default("other"), // apparel | vinyl | poster | digital | other
  stock: integer("stock").notNull().default(0),
  available: boolean("available").notNull().default(true),
  createdAt: text("created_at").notNull(),
});

export const insertMerchandiseSchema = createInsertSchema(merchandise).omit({ id: true });
export type InsertMerchandise = z.infer<typeof insertMerchandiseSchema>;
export type Merchandise = typeof merchandise.$inferSelect;

export const merchOrders = pgTable("merch_orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  merchId: varchar("merch_id").notNull(),
  quantity: integer("quantity").notNull().default(1),
  totalPrice: real("total_price").notNull(),
  status: text("status").notNull().default("pending"), // pending | shipped | delivered | cancelled
  createdAt: text("created_at").notNull(),
});

export const insertMerchOrderSchema = createInsertSchema(merchOrders).omit({ id: true });
export type InsertMerchOrder = z.infer<typeof insertMerchOrderSchema>;
export type MerchOrder = typeof merchOrders.$inferSelect;

// ═══════════════════════════════════════════════════════════
// Music Production: Beats & Samples
// ═══════════════════════════════════════════════════════════
export const beats = pgTable("beats", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  name: text("name").notNull(),
  bpm: integer("bpm").notNull().default(120),
  key: text("key"),
  genre: text("genre"),
  pattern: jsonb("pattern").notNull(), // grid pattern data
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const insertBeatSchema = createInsertSchema(beats).omit({ id: true });
export type InsertBeat = z.infer<typeof insertBeatSchema>;
export type Beat = typeof beats.$inferSelect;

export const samples = pgTable("samples", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  category: text("category").notNull(), // drums | bass | synth | fx | vocal
  fileUrl: text("file_url").notNull(),
  duration: real("duration"),
  bpm: integer("bpm"),
  key: text("key"),
  tags: text("tags"),
  createdAt: text("created_at").notNull(),
});

export const insertSampleSchema = createInsertSchema(samples).omit({ id: true });
export type InsertSample = z.infer<typeof insertSampleSchema>;
export type Sample = typeof samples.$inferSelect;

// Chat conversations and messages (used by replit_integrations/chat)
export const conversations = pgTable("conversations", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  title: text("title").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const messages = pgTable("messages", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  conversationId: integer("conversation_id").notNull(),
  role: text("role").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
