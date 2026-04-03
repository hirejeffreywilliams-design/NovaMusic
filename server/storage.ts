import { type User, type InsertUser, type Event, type InsertEvent, type SongRequest, type InsertSongRequest, type Reaction, type InsertReaction, type Poll, type InsertPoll, type Shoutout, type InsertShoutout, type Tip, type InsertTip, type SetlistEntry, type InsertSetlistEntry, type Subscription, type InsertSubscription, type Payout, type BattleVote, PLATFORM_CUT, DJ_CUT } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Events
  createEvent(event: InsertEvent): Promise<Event>;
  getEvent(id: string): Promise<Event | undefined>;
  getEventByCode(code: string): Promise<Event | undefined>;
  updateEvent(id: string, updates: Partial<Event>): Promise<Event | undefined>;
  listActiveEvents(): Promise<Event[]>;
  listAllEvents(): Promise<Event[]>;
  endEvent(id: string): Promise<Event | undefined>;

  // Song Requests
  createSongRequest(req: InsertSongRequest): Promise<SongRequest>;
  getSongRequest(id: string): Promise<SongRequest | undefined>;
  getEventSongRequests(eventId: string): Promise<SongRequest[]>;
  updateSongRequestStatus(id: string, status: SongRequest["status"]): Promise<SongRequest | undefined>;

  // Reactions
  createReaction(r: InsertReaction): Promise<Reaction>;
  getEventReactions(eventId: string, since?: number): Promise<Reaction[]>;

  // Polls
  createPoll(p: InsertPoll): Promise<Poll>;
  getEventPolls(eventId: string): Promise<Poll[]>;
  getActivePoll(eventId: string): Promise<Poll | undefined>;
  votePoll(pollId: string, option: string, crowdName: string): Promise<Poll | undefined>;
  closePoll(pollId: string): Promise<Poll | undefined>;

  // Shoutouts
  createShoutout(s: InsertShoutout): Promise<Shoutout>;
  getEventShoutouts(eventId: string): Promise<Shoutout[]>;
  markShoutoutAnnounced(id: string): Promise<Shoutout | undefined>;

  // Tips
  createTip(t: InsertTip): Promise<Tip>;
  getEventTips(eventId: string): Promise<Tip[]>;
  getDJTotalEarnings(djId: string): Promise<number>;

  // Setlist
  createSetlistEntry(e: InsertSetlistEntry): Promise<SetlistEntry>;
  getEventSetlist(eventId: string): Promise<SetlistEntry[]>;

  // Subscriptions
  createSubscription(s: InsertSubscription): Promise<Subscription>;
  getDJSubscription(djId: string): Promise<Subscription | undefined>;
  updateSubscriptionStatus(id: string, status: Subscription["status"]): Promise<Subscription | undefined>;
  listSubscriptions(): Promise<Subscription[]>;

  // Payouts
  createPayout(eventId: string, djId: string, djName: string, amount: number): Promise<Payout>;
  listPayouts(): Promise<Payout[]>;
  markPayoutProcessed(id: string): Promise<Payout | undefined>;
  getDJPayouts(djId: string): Promise<Payout[]>;

  // Battle Votes
  createBattleVote(eventId: string, crowdName: string, deck: "A" | "B"): Promise<BattleVote>;
  getEventBattleVotes(eventId: string): Promise<BattleVote[]>;

  // Admin stats
  getTotalPlatformRevenue(): Promise<number>;
  getTopDJs(limit?: number): Promise<{ djId: string; djName: string; events: number; revenue: number }[]>;
  getSubscriptionsByTier(): Promise<Record<string, number>>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User> = new Map();
  private events: Map<string, Event> = new Map();
  private songRequests: Map<string, SongRequest> = new Map();
  private reactions: Reaction[] = [];
  private polls: Map<string, Poll> = new Map();
  private pollVoters: Map<string, Set<string>> = new Map();
  private shoutouts: Map<string, Shoutout> = new Map();
  private tips: Map<string, Tip> = new Map();
  private setlistEntries: Map<string, SetlistEntry> = new Map();
  private subscriptions: Map<string, Subscription> = new Map();
  private payouts: Map<string, Payout> = new Map();
  private battleVotes: BattleVote[] = [];

  async getUser(id: string) { return this.users.get(id); }
  async getUserByUsername(username: string) {
    return Array.from(this.users.values()).find(u => u.username === username);
  }
  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async createEvent(e: InsertEvent): Promise<Event> {
    const id = randomUUID();
    const event: Event = {
      id,
      code: e.code,
      name: e.name,
      djId: e.djId,
      djName: e.djName,
      status: "active",
      battleMode: e.battleMode ?? false,
      deckADjName: e.deckADjName ?? null,
      deckBDjName: e.deckBDjName ?? null,
      moodColor: null,
      moodKeyword: null,
      nowPlaying: null,
      createdAt: Date.now(),
      endedAt: null,
    };
    this.events.set(id, event);
    return event;
  }

  async getEvent(id: string) { return this.events.get(id); }

  async getEventByCode(code: string) {
    return Array.from(this.events.values()).find(e => e.code === code);
  }

  async updateEvent(id: string, updates: Partial<Event>): Promise<Event | undefined> {
    const event = this.events.get(id);
    if (!event) return undefined;
    const updated = { ...event, ...updates };
    this.events.set(id, updated);
    return updated;
  }

  async listActiveEvents() {
    return Array.from(this.events.values()).filter(e => e.status === "active");
  }

  async listAllEvents() {
    return Array.from(this.events.values());
  }

  async endEvent(id: string) {
    return this.updateEvent(id, { status: "ended", endedAt: Date.now() });
  }

  async createSongRequest(r: InsertSongRequest): Promise<SongRequest> {
    const id = randomUUID();
    const req: SongRequest = {
      id,
      eventId: r.eventId,
      crowdName: r.crowdName,
      trackTitle: r.trackTitle,
      priorityPaid: r.priorityPaid ?? false,
      priorityAmount: r.priorityAmount ?? 0,
      status: "pending",
      createdAt: Date.now(),
    };
    this.songRequests.set(id, req);
    return req;
  }

  async getSongRequest(id: string) { return this.songRequests.get(id); }

  async getEventSongRequests(eventId: string) {
    return Array.from(this.songRequests.values())
      .filter(r => r.eventId === eventId)
      .sort((a, b) => {
        if (a.priorityPaid && !b.priorityPaid) return -1;
        if (!a.priorityPaid && b.priorityPaid) return 1;
        return a.createdAt - b.createdAt;
      });
  }

  async updateSongRequestStatus(id: string, status: SongRequest["status"]) {
    const req = this.songRequests.get(id);
    if (!req) return undefined;
    const updated = { ...req, status };
    this.songRequests.set(id, updated);
    return updated;
  }

  async createReaction(r: InsertReaction): Promise<Reaction> {
    const reaction: Reaction = {
      id: randomUUID(),
      eventId: r.eventId,
      crowdName: r.crowdName,
      emoji: r.emoji,
      createdAt: Date.now(),
    };
    this.reactions.push(reaction);
    return reaction;
  }

  async getEventReactions(eventId: string, since?: number) {
    return this.reactions.filter(r =>
      r.eventId === eventId && (since === undefined || r.createdAt >= since)
    );
  }

  async createPoll(p: InsertPoll): Promise<Poll> {
    const id = randomUUID();
    const votes: Record<string, number> = {};
    for (const opt of p.options) votes[opt] = 0;
    const poll: Poll = {
      id,
      eventId: p.eventId,
      question: p.question,
      options: p.options,
      votes,
      active: true,
      createdAt: Date.now(),
    };
    this.polls.set(id, poll);
    this.pollVoters.set(id, new Set());
    return poll;
  }

  async getEventPolls(eventId: string) {
    return Array.from(this.polls.values()).filter(p => p.eventId === eventId);
  }

  async getActivePoll(eventId: string) {
    return Array.from(this.polls.values()).find(p => p.eventId === eventId && p.active);
  }

  async votePoll(pollId: string, option: string, crowdName: string): Promise<Poll | undefined> {
    const poll = this.polls.get(pollId);
    if (!poll || !poll.active) return undefined;
    const voters = this.pollVoters.get(pollId) || new Set();
    if (voters.has(crowdName)) return poll;
    voters.add(crowdName);
    this.pollVoters.set(pollId, voters);
    const updated = { ...poll, votes: { ...poll.votes, [option]: (poll.votes[option] || 0) + 1 } };
    this.polls.set(pollId, updated);
    return updated;
  }

  async closePoll(pollId: string): Promise<Poll | undefined> {
    const poll = this.polls.get(pollId);
    if (!poll) return undefined;
    const updated = { ...poll, active: false };
    this.polls.set(pollId, updated);
    return updated;
  }

  async createShoutout(s: InsertShoutout): Promise<Shoutout> {
    const id = randomUUID();
    const shoutout: Shoutout = {
      id,
      eventId: s.eventId,
      fromName: s.fromName,
      message: s.message,
      paid: s.paid ?? false,
      amount: s.amount ?? 0,
      announced: false,
      createdAt: Date.now(),
    };
    this.shoutouts.set(id, shoutout);
    return shoutout;
  }

  async getEventShoutouts(eventId: string) {
    return Array.from(this.shoutouts.values()).filter(s => s.eventId === eventId);
  }

  async markShoutoutAnnounced(id: string) {
    const s = this.shoutouts.get(id);
    if (!s) return undefined;
    const updated = { ...s, announced: true };
    this.shoutouts.set(id, updated);
    return updated;
  }

  async createTip(t: InsertTip): Promise<Tip> {
    const id = randomUUID();
    const tip: Tip = {
      id,
      eventId: t.eventId,
      fromName: t.fromName,
      amount: t.amount,
      platformCut: +(t.amount * PLATFORM_CUT).toFixed(2),
      djShare: +(t.amount * DJ_CUT).toFixed(2),
      createdAt: Date.now(),
    };
    this.tips.set(id, tip);
    return tip;
  }

  async getEventTips(eventId: string) {
    return Array.from(this.tips.values()).filter(t => t.eventId === eventId);
  }

  async getDJTotalEarnings(djId: string): Promise<number> {
    const events = Array.from(this.events.values()).filter(e => e.djId === djId);
    let total = 0;
    for (const event of events) {
      const tips = await this.getEventTips(event.id);
      total += tips.reduce((sum, t) => sum + t.djShare, 0);
      const shoutouts = await this.getEventShoutouts(event.id);
      total += shoutouts.filter(s => s.paid).reduce((sum, s) => sum + s.amount * DJ_CUT, 0);
      const requests = await this.getEventSongRequests(event.id);
      total += requests.filter(r => r.priorityPaid).reduce((sum, r) => sum + r.priorityAmount * DJ_CUT, 0);
    }
    return +total.toFixed(2);
  }

  async createSetlistEntry(e: InsertSetlistEntry): Promise<SetlistEntry> {
    const id = randomUUID();
    const entry: SetlistEntry = {
      id,
      eventId: e.eventId,
      trackTitle: e.trackTitle,
      addedBy: e.addedBy,
      playedAt: Date.now(),
    };
    this.setlistEntries.set(id, entry);
    return entry;
  }

  async getEventSetlist(eventId: string) {
    return Array.from(this.setlistEntries.values())
      .filter(e => e.eventId === eventId)
      .sort((a, b) => a.playedAt - b.playedAt);
  }

  async createSubscription(s: InsertSubscription): Promise<Subscription> {
    const id = randomUUID();
    const now = Date.now();
    let expiresAt = s.expiresAt ?? null;
    if (!expiresAt && !s.dayPass) {
      expiresAt = now + 30 * 24 * 60 * 60 * 1000;
    } else if (s.dayPass) {
      expiresAt = now + 24 * 60 * 60 * 1000;
    }
    const sub: Subscription = {
      id,
      djId: s.djId,
      tier: s.tier,
      status: "active",
      startedAt: now,
      expiresAt,
      dayPass: s.dayPass ?? false,
      eventId: s.eventId ?? null,
    };
    this.subscriptions.set(id, sub);
    return sub;
  }

  async getDJSubscription(djId: string): Promise<Subscription | undefined> {
    const now = Date.now();
    return Array.from(this.subscriptions.values())
      .filter(s => s.djId === djId && s.status === "active" && (s.expiresAt === null || s.expiresAt > now))
      .sort((a, b) => {
        const tierOrder = { club: 0, pro: 1, starter: 2 };
        return (tierOrder[a.tier] ?? 3) - (tierOrder[b.tier] ?? 3);
      })[0];
  }

  async updateSubscriptionStatus(id: string, status: Subscription["status"]) {
    const s = this.subscriptions.get(id);
    if (!s) return undefined;
    const updated = { ...s, status };
    this.subscriptions.set(id, updated);
    return updated;
  }

  async listSubscriptions() {
    return Array.from(this.subscriptions.values());
  }

  async createPayout(eventId: string, djId: string, djName: string, amount: number): Promise<Payout> {
    const id = randomUUID();
    const payout: Payout = {
      id,
      djId,
      djName,
      eventId,
      amount,
      status: "pending",
      createdAt: Date.now(),
      processedAt: null,
    };
    this.payouts.set(id, payout);
    return payout;
  }

  async listPayouts() {
    return Array.from(this.payouts.values()).sort((a, b) => b.createdAt - a.createdAt);
  }

  async markPayoutProcessed(id: string) {
    const p = this.payouts.get(id);
    if (!p) return undefined;
    const updated = { ...p, status: "processed" as const, processedAt: Date.now() };
    this.payouts.set(id, updated);
    return updated;
  }

  async getDJPayouts(djId: string) {
    return Array.from(this.payouts.values()).filter(p => p.djId === djId);
  }

  async createBattleVote(eventId: string, crowdName: string, deck: "A" | "B"): Promise<BattleVote> {
    const vote: BattleVote = {
      id: randomUUID(),
      eventId,
      crowdName,
      deck,
      createdAt: Date.now(),
    };
    this.battleVotes.push(vote);
    return vote;
  }

  async getEventBattleVotes(eventId: string) {
    return this.battleVotes.filter(v => v.eventId === eventId);
  }

  async getTotalPlatformRevenue(): Promise<number> {
    let total = 0;
    Array.from(this.tips.values()).forEach(tip => { total += tip.platformCut; });
    Array.from(this.shoutouts.values()).forEach(shoutout => {
      if (shoutout.paid) total += shoutout.amount * PLATFORM_CUT;
    });
    Array.from(this.songRequests.values()).forEach(req => {
      if (req.priorityPaid) total += req.priorityAmount * PLATFORM_CUT;
    });
    return +total.toFixed(2);
  }

  async getTopDJs(limit = 10): Promise<{ djId: string; djName: string; events: number; revenue: number }[]> {
    const djMap = new Map<string, { djId: string; djName: string; events: number; revenue: number }>();
    for (const event of Array.from(this.events.values())) {
      const existing = djMap.get(event.djId) || { djId: event.djId, djName: event.djName, events: 0, revenue: 0 };
      existing.events++;
      const tips = await this.getEventTips(event.id);
      existing.revenue += tips.reduce((s, t) => s + t.djShare, 0);
      djMap.set(event.djId, existing);
    }
    return Array.from(djMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, limit);
  }

  async getSubscriptionsByTier(): Promise<Record<string, number>> {
    const result: Record<string, number> = { starter: 0, pro: 0, club: 0 };
    Array.from(this.subscriptions.values()).forEach(sub => {
      if (sub.status === "active") result[sub.tier] = (result[sub.tier] || 0) + 1;
    });
    return result;
  }
}

export const storage = new MemStorage();
