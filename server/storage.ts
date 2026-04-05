import {
  type User, type InsertUser,
  type Event, type InsertEvent,
  type SongRequest, type InsertSongRequest,
  type Reaction, type InsertReaction,
  type Poll, type InsertPoll,
  type Shoutout, type InsertShoutout,
  type Tip, type InsertTip,
  type SetlistEntry, type InsertSetlistEntry,
  type Subscription, type InsertSubscription,
  type Payout,
  type BattleVote,
  PLATFORM_CUT, DJ_CUT,
  type ArtistProfile, type InsertArtistProfile,
  type Track, type InsertTrack,
  type PlayEvent, type InsertPlayEvent,
  type RoyaltyPayout, type InsertRoyaltyPayout,
  type Playlist, type InsertPlaylist,
  type PlaylistTrack, type InsertPlaylistTrack,
  type Follower, type InsertFollower,
  type Like, type InsertLike,
  type Comment, type InsertComment,
  type LiveStream, type InsertLiveStream,
  type Lyrics, type InsertLyrics,
  type Concert, type InsertConcert,
  type Merchandise, type InsertMerchandise,
  type MerchOrder, type InsertMerchOrder,
  type Beat, type InsertBeat,
  type Sample, type InsertSample,
} from "@shared/schema";
import { randomUUID } from "crypto";

interface DmcaNotice {
  id: string;
  reporterName: string;
  contact: string;
  claimedWork: string;
  infringingUrl: string;
  status: "pending" | "resolved" | "rejected";
  createdAt: number;
}

export interface LibraryFavorite {
  id: string;
  sessionId: string;
  trackId: string;
  trackData: string;
  createdAt: number;
}

export interface LibraryHistoryEntry {
  id: string;
  sessionId: string;
  trackId: string;
  trackData: string;
  playedAt: number;
}

export interface IStorage {
  // Library favorites & history
  getFavorites(sessionId: string): Promise<LibraryFavorite[]>;
  addFavorite(sessionId: string, trackId: string, trackData: string): Promise<LibraryFavorite>;
  removeFavorite(sessionId: string, trackId: string): Promise<void>;
  getHistory(sessionId: string): Promise<LibraryHistoryEntry[]>;
  addHistory(sessionId: string, trackId: string, trackData: string): Promise<LibraryHistoryEntry>;

  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserAcknowledgments(id: string, fields: Partial<Pick<User, "tosAcknowledgedAt" | "venueLicenseAcknowledgedAt">>): Promise<User | undefined>;

  // Events (crowd engagement)
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

  // DJ Payouts (crowd engagement)
  createPayout(eventId: string, djId: string, djName: string, amount: number): Promise<Payout>;
  listPayouts(): Promise<Payout[]>;
  markPayoutProcessed(id: string): Promise<Payout | undefined>;
  getDJPayouts(djId: string): Promise<Payout[]>;

  // Battle Votes
  createBattleVote(eventId: string, crowdName: string, deck: "A" | "B"): Promise<BattleVote>;
  getEventBattleVotes(eventId: string): Promise<BattleVote[]>;

  // DMCA Notices
  createDmcaNotice(notice: Omit<DmcaNotice, "id" | "status" | "createdAt">): Promise<DmcaNotice>;
  listDmcaNotices(): Promise<DmcaNotice[]>;

  // Admin stats
  getTotalPlatformRevenue(): Promise<number>;
  getTopDJs(limit?: number): Promise<{ djId: string; djName: string; events: number; revenue: number }[]>;
  getSubscriptionsByTier(): Promise<Record<string, number>>;

  // Artist Profiles (music rights)
  getArtistProfile(userId: string): Promise<ArtistProfile | undefined>;
  getArtistProfileById(id: string): Promise<ArtistProfile | undefined>;
  createArtistProfile(profile: InsertArtistProfile): Promise<ArtistProfile>;
  updateArtistProfile(id: string, fields: Partial<ArtistProfile>): Promise<ArtistProfile | undefined>;

  // Tracks
  getTracks(filters?: { genre?: string; licenseType?: string; minBpm?: number; maxBpm?: number; key?: string }): Promise<Track[]>;
  getTrackById(id: string): Promise<Track | undefined>;
  getTracksByArtist(artistId: string): Promise<Track[]>;
  createTrack(track: InsertTrack): Promise<Track>;
  updateTrack(id: string, fields: Partial<Track>): Promise<Track | undefined>;
  deleteTrack(id: string): Promise<void>;
  incrementPlayCount(id: string): Promise<void>;

  // Play Events (royalty tracking)
  createPlayEvent(event: InsertPlayEvent): Promise<PlayEvent>;
  getPlayEventsByEvent(eventId: string): Promise<PlayEvent[]>;
  getPlayEventsByArtistTrack(trackIds: string[]): Promise<PlayEvent[]>;
  getAllPlayEvents(): Promise<PlayEvent[]>;

  // Royalty Payouts
  getRoyaltyPayouts(artistId?: string): Promise<RoyaltyPayout[]>;
  getRoyaltyPayoutById(id: string): Promise<RoyaltyPayout | undefined>;
  createRoyaltyPayout(payout: InsertRoyaltyPayout): Promise<RoyaltyPayout>;
  markPayoutPaid(id: string): Promise<RoyaltyPayout | undefined>;

  // Playlists
  createPlaylist(playlist: InsertPlaylist): Promise<Playlist>;
  getPlaylist(id: string): Promise<Playlist | undefined>;
  updatePlaylist(id: string, fields: Partial<Playlist>): Promise<Playlist | undefined>;
  deletePlaylist(id: string): Promise<void>;
  listUserPlaylists(userId: string): Promise<Playlist[]>;
  listPublicPlaylists(): Promise<Playlist[]>;
  addTrackToPlaylist(entry: InsertPlaylistTrack): Promise<PlaylistTrack>;
  removeTrackFromPlaylist(playlistId: string, trackId: string): Promise<void>;
  getPlaylistTracks(playlistId: string): Promise<PlaylistTrack[]>;

  // Social: Followers
  followUser(data: InsertFollower): Promise<Follower>;
  unfollowUser(followerId: string, followingId: string): Promise<void>;
  getFollowers(userId: string): Promise<Follower[]>;
  getFollowing(userId: string): Promise<Follower[]>;
  isFollowing(followerId: string, followingId: string): Promise<boolean>;

  // Social: Likes
  likeTrack(data: InsertLike): Promise<Like>;
  unlikeTrack(userId: string, trackId: string): Promise<void>;
  getTrackLikes(trackId: string): Promise<Like[]>;
  getUserLikes(userId: string): Promise<Like[]>;
  isLiked(userId: string, trackId: string): Promise<boolean>;

  // Social: Comments
  createComment(data: InsertComment): Promise<Comment>;
  getTrackComments(trackId: string): Promise<Comment[]>;
  deleteComment(id: string): Promise<void>;

  // Live Streams
  createLiveStream(data: InsertLiveStream): Promise<LiveStream>;
  getLiveStream(id: string): Promise<LiveStream | undefined>;
  updateLiveStream(id: string, fields: Partial<LiveStream>): Promise<LiveStream | undefined>;
  listActiveLiveStreams(): Promise<LiveStream[]>;
  listArtistStreams(artistId: string): Promise<LiveStream[]>;

  // Lyrics
  createLyrics(data: InsertLyrics): Promise<Lyrics>;
  getLyrics(trackId: string): Promise<Lyrics | undefined>;
  updateLyrics(trackId: string, fields: Partial<Lyrics>): Promise<Lyrics | undefined>;

  // Concerts
  createConcert(data: InsertConcert): Promise<Concert>;
  getConcert(id: string): Promise<Concert | undefined>;
  listConcerts(filters?: { city?: string; artistId?: string }): Promise<Concert[]>;
  updateConcert(id: string, fields: Partial<Concert>): Promise<Concert | undefined>;
  deleteConcert(id: string): Promise<void>;

  // Merchandise
  createMerchandise(data: InsertMerchandise): Promise<Merchandise>;
  getMerchandise(id: string): Promise<Merchandise | undefined>;
  listArtistMerchandise(artistId: string): Promise<Merchandise[]>;
  updateMerchandise(id: string, fields: Partial<Merchandise>): Promise<Merchandise | undefined>;
  deleteMerchandise(id: string): Promise<void>;
  createMerchOrder(data: InsertMerchOrder): Promise<MerchOrder>;
  getMerchOrder(id: string): Promise<MerchOrder | undefined>;
  listUserOrders(userId: string): Promise<MerchOrder[]>;

  // Beats
  createBeat(data: InsertBeat): Promise<Beat>;
  getBeat(id: string): Promise<Beat | undefined>;
  listUserBeats(userId: string): Promise<Beat[]>;
  updateBeat(id: string, fields: Partial<Beat>): Promise<Beat | undefined>;
  deleteBeat(id: string): Promise<void>;

  // Samples
  createSample(data: InsertSample): Promise<Sample>;
  getSample(id: string): Promise<Sample | undefined>;
  listSamples(category?: string): Promise<Sample[]>;

  // Charts
  getTopTracks(limit?: number): Promise<Track[]>;
  getTopArtists(limit?: number): Promise<{ artistId: string; artistName: string; totalPlays: number }[]>;
  getTopTracksByGenre(genre: string, limit?: number): Promise<Track[]>;

  // Discovery
  getTrendingTracks(limit?: number): Promise<Track[]>;
  getRecommendedTracks(userId: string, limit?: number): Promise<Track[]>;
  getTracksByMood(mood: string, limit?: number): Promise<Track[]>;
  getGenreList(): Promise<string[]>;

  // Admin
  listAllUsers(): Promise<User[]>;
  updateUser(id: string, fields: Partial<User>): Promise<User | undefined>;
  deleteUser(id: string): Promise<void>;
}

export class MemStorage implements IStorage {
  private libraryFavorites: LibraryFavorite[] = [];
  private libraryHistory: LibraryHistoryEntry[] = [];

  async getFavorites(sessionId: string): Promise<LibraryFavorite[]> {
    return this.libraryFavorites.filter(f => f.sessionId === sessionId).sort((a, b) => b.createdAt - a.createdAt);
  }

  async addFavorite(sessionId: string, trackId: string, trackData: string): Promise<LibraryFavorite> {
    const existing = this.libraryFavorites.find(f => f.sessionId === sessionId && f.trackId === trackId);
    if (existing) return existing;
    const fav: LibraryFavorite = { id: randomUUID(), sessionId, trackId, trackData, createdAt: Date.now() };
    this.libraryFavorites.push(fav);
    return fav;
  }

  async removeFavorite(sessionId: string, trackId: string): Promise<void> {
    this.libraryFavorites = this.libraryFavorites.filter(f => !(f.sessionId === sessionId && f.trackId === trackId));
  }

  async getHistory(sessionId: string): Promise<LibraryHistoryEntry[]> {
    return this.libraryHistory.filter(h => h.sessionId === sessionId).sort((a, b) => b.playedAt - a.playedAt).slice(0, 20);
  }

  async addHistory(sessionId: string, trackId: string, trackData: string): Promise<LibraryHistoryEntry> {
    this.libraryHistory = this.libraryHistory.filter(h => !(h.sessionId === sessionId && h.trackId === trackId));
    const entry: LibraryHistoryEntry = { id: randomUUID(), sessionId, trackId, trackData, playedAt: Date.now() };
    this.libraryHistory.push(entry);
    const sessionHistory = this.libraryHistory.filter(h => h.sessionId === sessionId).sort((a, b) => b.playedAt - a.playedAt);
    if (sessionHistory.length > 20) {
      const toRemove = sessionHistory.slice(20).map(h => h.id);
      this.libraryHistory = this.libraryHistory.filter(h => !toRemove.includes(h.id));
    }
    return entry;
  }

  private users: Map<string, User> = new Map();

  // Crowd engagement maps
  private events: Map<string, Event> = new Map();
  private songRequests: Map<string, SongRequest> = new Map();
  private reactions: Reaction[] = [];
  private polls: Map<string, Poll> = new Map();
  private pollVoters: Map<string, Set<string>> = new Map();
  private shoutouts: Map<string, Shoutout> = new Map();
  private tips: Map<string, Tip> = new Map();
  private setlistEntries: Map<string, SetlistEntry> = new Map();
  private subscriptions: Map<string, Subscription> = new Map();
  private djPayouts: Map<string, Payout> = new Map();
  private battleVotes: BattleVote[] = [];

  // Music rights maps
  private artistProfiles: Map<string, ArtistProfile> = new Map();
  private tracks: Map<string, Track> = new Map();
  private playEvents: Map<string, PlayEvent> = new Map();
  private royaltyPayouts: Map<string, RoyaltyPayout> = new Map();

  async getUser(id: string) { return this.users.get(id); }
  async getUserByUsername(username: string) {
    return Array.from(this.users.values()).find(u => u.username === username);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = {
      id,
      username: insertUser.username,
      password: insertUser.password,
      accountType: insertUser.accountType ?? "dj",
      tosAcknowledgedAt: insertUser.tosAcknowledgedAt ?? null,
      venueLicenseAcknowledgedAt: insertUser.venueLicenseAcknowledgedAt ?? null,
    };
    this.users.set(id, user);
    return user;
  }

  async updateUserAcknowledgments(id: string, fields: Partial<Pick<User, "tosAcknowledgedAt" | "venueLicenseAcknowledgedAt">>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    const updated = { ...user, ...fields };
    this.users.set(id, updated);
    return updated;
  }

  // --- Crowd Engagement ---

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
    this.djPayouts.set(id, payout);
    return payout;
  }

  async listPayouts() {
    return Array.from(this.djPayouts.values()).sort((a, b) => b.createdAt - a.createdAt);
  }

  async markPayoutProcessed(id: string) {
    const p = this.djPayouts.get(id);
    if (!p) return undefined;
    const updated = { ...p, status: "processed" as const, processedAt: Date.now() };
    this.djPayouts.set(id, updated);
    return updated;
  }

  async getDJPayouts(djId: string) {
    return Array.from(this.djPayouts.values()).filter(p => p.djId === djId);
  }

  private dmcaNotices: DmcaNotice[] = [];

  async createDmcaNotice(notice: Omit<DmcaNotice, "id" | "status" | "createdAt">): Promise<DmcaNotice> {
    const dmcaNotice: DmcaNotice = {
      id: randomUUID(),
      ...notice,
      status: "pending",
      createdAt: Date.now(),
    };
    this.dmcaNotices.push(dmcaNotice);
    return dmcaNotice;
  }

  async listDmcaNotices(): Promise<DmcaNotice[]> {
    return [...this.dmcaNotices].sort((a, b) => b.createdAt - a.createdAt);
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

  // --- Music Rights ---

  async getArtistProfile(userId: string): Promise<ArtistProfile | undefined> {
    return Array.from(this.artistProfiles.values()).find((p) => p.userId === userId);
  }

  async getArtistProfileById(id: string): Promise<ArtistProfile | undefined> {
    return this.artistProfiles.get(id);
  }

  async createArtistProfile(profile: InsertArtistProfile): Promise<ArtistProfile> {
    const id = randomUUID();
    const p: ArtistProfile = { id, ...profile, bio: profile.bio ?? null, payoutInfoPlaceholder: profile.payoutInfoPlaceholder ?? null };
    this.artistProfiles.set(id, p);
    return p;
  }

  async updateArtistProfile(id: string, fields: Partial<ArtistProfile>): Promise<ArtistProfile | undefined> {
    const profile = this.artistProfiles.get(id);
    if (!profile) return undefined;
    const updated = { ...profile, ...fields };
    this.artistProfiles.set(id, updated);
    return updated;
  }

  async getTracks(filters?: { genre?: string; licenseType?: string; minBpm?: number; maxBpm?: number; key?: string }): Promise<Track[]> {
    let tracks = Array.from(this.tracks.values()).filter((t) => t.available);
    if (filters) {
      if (filters.genre) tracks = tracks.filter((t) => t.genre?.toLowerCase() === filters.genre!.toLowerCase());
      if (filters.licenseType) tracks = tracks.filter((t) => t.licenseType === filters.licenseType);
      if (filters.minBpm != null) tracks = tracks.filter((t) => t.bpm != null && t.bpm >= filters.minBpm!);
      if (filters.maxBpm != null) tracks = tracks.filter((t) => t.bpm != null && t.bpm <= filters.maxBpm!);
      if (filters.key) tracks = tracks.filter((t) => t.key?.toLowerCase() === filters.key!.toLowerCase());
    }
    return tracks;
  }

  async getTrackById(id: string): Promise<Track | undefined> {
    return this.tracks.get(id);
  }

  async getTracksByArtist(artistId: string): Promise<Track[]> {
    return Array.from(this.tracks.values()).filter((t) => t.artistId === artistId);
  }

  async createTrack(track: InsertTrack): Promise<Track> {
    const id = randomUUID();
    const t: Track = {
      id,
      ...track,
      playCount: 0,
      genre: track.genre ?? null,
      bpm: track.bpm ?? null,
      key: track.key ?? null,
      isrc: track.isrc ?? null,
      royaltyRate: track.royaltyRate ?? null,
      previewUrl: track.previewUrl ?? null,
      available: track.available ?? true,
    };
    this.tracks.set(id, t);
    return t;
  }

  async updateTrack(id: string, fields: Partial<Track>): Promise<Track | undefined> {
    const track = this.tracks.get(id);
    if (!track) return undefined;
    const updated = { ...track, ...fields };
    this.tracks.set(id, updated);
    return updated;
  }

  async deleteTrack(id: string): Promise<void> {
    this.tracks.delete(id);
  }

  async incrementPlayCount(id: string): Promise<void> {
    const track = this.tracks.get(id);
    if (track) {
      this.tracks.set(id, { ...track, playCount: track.playCount + 1 });
    }
  }

  async createPlayEvent(event: InsertPlayEvent): Promise<PlayEvent> {
    const id = randomUUID();
    const e: PlayEvent = {
      id,
      trackId: event.trackId ?? null,
      eventId: event.eventId ?? null,
      djUserId: event.djUserId ?? null,
      trackTitle: event.trackTitle,
      artistName: event.artistName,
      label: event.label ?? null,
      isrc: event.isrc ?? null,
      licenseType: event.licenseType ?? null,
      duration: event.duration ?? null,
      royaltyAmount: event.royaltyAmount ?? null,
      playedAt: event.playedAt,
      eventName: event.eventName ?? null,
      venueName: event.venueName ?? null,
    };
    this.playEvents.set(id, e);
    if (event.trackId) {
      await this.incrementPlayCount(event.trackId);
    }
    return e;
  }

  async getPlayEventsByEvent(eventId: string): Promise<PlayEvent[]> {
    return Array.from(this.playEvents.values()).filter((e) => e.eventId === eventId);
  }

  async getPlayEventsByArtistTrack(trackIds: string[]): Promise<PlayEvent[]> {
    return Array.from(this.playEvents.values()).filter((e) => e.trackId && trackIds.includes(e.trackId));
  }

  async getAllPlayEvents(): Promise<PlayEvent[]> {
    return Array.from(this.playEvents.values());
  }

  async getRoyaltyPayouts(artistId?: string): Promise<RoyaltyPayout[]> {
    const payouts = Array.from(this.royaltyPayouts.values());
    if (artistId) return payouts.filter((p) => p.artistId === artistId);
    return payouts;
  }

  async getRoyaltyPayoutById(id: string): Promise<RoyaltyPayout | undefined> {
    return this.royaltyPayouts.get(id);
  }

  async createRoyaltyPayout(payout: InsertRoyaltyPayout): Promise<RoyaltyPayout> {
    const id = randomUUID();
    const p: RoyaltyPayout = {
      id,
      ...payout,
      status: payout.status ?? "pending",
      paidAt: payout.paidAt ?? null,
    };
    this.royaltyPayouts.set(id, p);
    return p;
  }

  async markPayoutPaid(id: string): Promise<RoyaltyPayout | undefined> {
    const payout = this.royaltyPayouts.get(id);
    if (!payout) return undefined;
    const updated = { ...payout, status: "paid", paidAt: new Date().toISOString() };
    this.royaltyPayouts.set(id, updated);
    return updated;
  }

  // ═══ Playlists ═══
  private playlistsMap: Map<string, Playlist> = new Map();
  private playlistTracksMap: Map<string, PlaylistTrack> = new Map();

  async createPlaylist(p: InsertPlaylist): Promise<Playlist> {
    const id = randomUUID();
    const playlist: Playlist = { id, ...p, description: p.description ?? null, coverUrl: p.coverUrl ?? null, visibility: p.visibility ?? "private", trackCount: 0 };
    this.playlistsMap.set(id, playlist);
    return playlist;
  }
  async getPlaylist(id: string) { return this.playlistsMap.get(id); }
  async updatePlaylist(id: string, fields: Partial<Playlist>): Promise<Playlist | undefined> {
    const pl = this.playlistsMap.get(id);
    if (!pl) return undefined;
    const updated = { ...pl, ...fields };
    this.playlistsMap.set(id, updated);
    return updated;
  }
  async deletePlaylist(id: string): Promise<void> {
    this.playlistsMap.delete(id);
    Array.from(this.playlistTracksMap.entries()).forEach(([k, v]) => { if (v.playlistId === id) this.playlistTracksMap.delete(k); });
  }
  async listUserPlaylists(userId: string): Promise<Playlist[]> {
    return Array.from(this.playlistsMap.values()).filter(p => p.userId === userId);
  }
  async listPublicPlaylists(): Promise<Playlist[]> {
    return Array.from(this.playlistsMap.values()).filter(p => p.visibility === "public");
  }
  async addTrackToPlaylist(entry: InsertPlaylistTrack): Promise<PlaylistTrack> {
    const id = randomUUID();
    const pt: PlaylistTrack = { id, ...entry, addedBy: entry.addedBy ?? null, position: entry.position ?? 0 };
    this.playlistTracksMap.set(id, pt);
    const pl = this.playlistsMap.get(entry.playlistId);
    if (pl) this.playlistsMap.set(pl.id, { ...pl, trackCount: pl.trackCount + 1 });
    return pt;
  }
  async removeTrackFromPlaylist(playlistId: string, trackId: string): Promise<void> {
    const ptEntries = Array.from(this.playlistTracksMap.entries());
    for (let i = 0; i < ptEntries.length; i++) {
      const [k, v] = ptEntries[i];
      if (v.playlistId === playlistId && v.trackId === trackId) { this.playlistTracksMap.delete(k); break; }
    }
    const pl = this.playlistsMap.get(playlistId);
    if (pl) this.playlistsMap.set(pl.id, { ...pl, trackCount: Math.max(0, pl.trackCount - 1) });
  }
  async getPlaylistTracks(playlistId: string): Promise<PlaylistTrack[]> {
    return Array.from(this.playlistTracksMap.values()).filter(pt => pt.playlistId === playlistId).sort((a, b) => a.position - b.position);
  }

  // ═══ Social: Followers ═══
  private followersMap: Map<string, Follower> = new Map();

  async followUser(data: InsertFollower): Promise<Follower> {
    const existing = Array.from(this.followersMap.values()).find(f => f.followerId === data.followerId && f.followingId === data.followingId);
    if (existing) return existing;
    const id = randomUUID();
    const f: Follower = { id, ...data };
    this.followersMap.set(id, f);
    return f;
  }
  async unfollowUser(followerId: string, followingId: string): Promise<void> {
    const fEntries = Array.from(this.followersMap.entries());
    for (let i = 0; i < fEntries.length; i++) {
      const [k, v] = fEntries[i];
      if (v.followerId === followerId && v.followingId === followingId) { this.followersMap.delete(k); break; }
    }
  }
  async getFollowers(userId: string): Promise<Follower[]> {
    return Array.from(this.followersMap.values()).filter(f => f.followingId === userId);
  }
  async getFollowing(userId: string): Promise<Follower[]> {
    return Array.from(this.followersMap.values()).filter(f => f.followerId === userId);
  }
  async isFollowing(followerId: string, followingId: string): Promise<boolean> {
    return Array.from(this.followersMap.values()).some(f => f.followerId === followerId && f.followingId === followingId);
  }

  // ═══ Social: Likes ═══
  private likesMap: Map<string, Like> = new Map();

  async likeTrack(data: InsertLike): Promise<Like> {
    const existing = Array.from(this.likesMap.values()).find(l => l.userId === data.userId && l.trackId === data.trackId);
    if (existing) return existing;
    const id = randomUUID();
    const like: Like = { id, ...data };
    this.likesMap.set(id, like);
    return like;
  }
  async unlikeTrack(userId: string, trackId: string): Promise<void> {
    const lEntries = Array.from(this.likesMap.entries());
    for (let i = 0; i < lEntries.length; i++) {
      const [k, v] = lEntries[i];
      if (v.userId === userId && v.trackId === trackId) { this.likesMap.delete(k); break; }
    }
  }
  async getTrackLikes(trackId: string): Promise<Like[]> {
    return Array.from(this.likesMap.values()).filter(l => l.trackId === trackId);
  }
  async getUserLikes(userId: string): Promise<Like[]> {
    return Array.from(this.likesMap.values()).filter(l => l.userId === userId);
  }
  async isLiked(userId: string, trackId: string): Promise<boolean> {
    return Array.from(this.likesMap.values()).some(l => l.userId === userId && l.trackId === trackId);
  }

  // ═══ Social: Comments ═══
  private commentsMap: Map<string, Comment> = new Map();

  async createComment(data: InsertComment): Promise<Comment> {
    const id = randomUUID();
    const c: Comment = { id, ...data };
    this.commentsMap.set(id, c);
    return c;
  }
  async getTrackComments(trackId: string): Promise<Comment[]> {
    return Array.from(this.commentsMap.values()).filter(c => c.trackId === trackId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  async deleteComment(id: string): Promise<void> { this.commentsMap.delete(id); }

  // ═══ Live Streams ═══
  private liveStreamsMap: Map<string, LiveStream> = new Map();

  async createLiveStream(data: InsertLiveStream): Promise<LiveStream> {
    const id = randomUUID();
    const s: LiveStream = { id, ...data, viewerCount: 0, description: data.description ?? null, scheduledAt: data.scheduledAt ?? null, startedAt: data.startedAt ?? null, endedAt: data.endedAt ?? null, status: data.status ?? "scheduled" };
    this.liveStreamsMap.set(id, s);
    return s;
  }
  async getLiveStream(id: string) { return this.liveStreamsMap.get(id); }
  async updateLiveStream(id: string, fields: Partial<LiveStream>): Promise<LiveStream | undefined> {
    const s = this.liveStreamsMap.get(id);
    if (!s) return undefined;
    const updated = { ...s, ...fields };
    this.liveStreamsMap.set(id, updated);
    return updated;
  }
  async listActiveLiveStreams(): Promise<LiveStream[]> {
    return Array.from(this.liveStreamsMap.values()).filter(s => s.status === "live");
  }
  async listArtistStreams(artistId: string): Promise<LiveStream[]> {
    return Array.from(this.liveStreamsMap.values()).filter(s => s.artistId === artistId);
  }

  // ═══ Lyrics ═══
  private lyricsMap: Map<string, Lyrics> = new Map();

  async createLyrics(data: InsertLyrics): Promise<Lyrics> {
    const id = randomUUID();
    const l: Lyrics = { id, ...data, syncedLines: data.syncedLines ?? null };
    this.lyricsMap.set(id, l);
    return l;
  }
  async getLyrics(trackId: string): Promise<Lyrics | undefined> {
    return Array.from(this.lyricsMap.values()).find(l => l.trackId === trackId);
  }
  async updateLyrics(trackId: string, fields: Partial<Lyrics>): Promise<Lyrics | undefined> {
    const l = Array.from(this.lyricsMap.values()).find(ly => ly.trackId === trackId);
    if (!l) return undefined;
    const updated = { ...l, ...fields };
    this.lyricsMap.set(l.id, updated);
    return updated;
  }

  // ═══ Concerts ═══
  private concertsMap: Map<string, Concert> = new Map();

  async createConcert(data: InsertConcert): Promise<Concert> {
    const id = randomUUID();
    const c: Concert = { id, ...data, description: data.description ?? null, time: data.time ?? null, ticketUrl: data.ticketUrl ?? null, imageUrl: data.imageUrl ?? null, price: data.price ?? null, capacity: data.capacity ?? null, rsvpCount: 0 };
    this.concertsMap.set(id, c);
    return c;
  }
  async getConcert(id: string) { return this.concertsMap.get(id); }
  async listConcerts(filters?: { city?: string; artistId?: string }): Promise<Concert[]> {
    let list = Array.from(this.concertsMap.values());
    if (filters?.city) list = list.filter(c => c.city.toLowerCase().includes(filters.city!.toLowerCase()));
    if (filters?.artistId) list = list.filter(c => c.artistId === filters.artistId);
    return list.sort((a, b) => a.date.localeCompare(b.date));
  }
  async updateConcert(id: string, fields: Partial<Concert>): Promise<Concert | undefined> {
    const c = this.concertsMap.get(id);
    if (!c) return undefined;
    const updated = { ...c, ...fields };
    this.concertsMap.set(id, updated);
    return updated;
  }
  async deleteConcert(id: string): Promise<void> { this.concertsMap.delete(id); }

  // ═══ Merchandise ═══
  private merchandiseMap: Map<string, Merchandise> = new Map();
  private merchOrdersMap: Map<string, MerchOrder> = new Map();

  async createMerchandise(data: InsertMerchandise): Promise<Merchandise> {
    const id = randomUUID();
    const m: Merchandise = { id, ...data, description: data.description ?? null, imageUrl: data.imageUrl ?? null, category: data.category ?? "other", stock: data.stock ?? 0, available: data.available ?? true };
    this.merchandiseMap.set(id, m);
    return m;
  }
  async getMerchandise(id: string) { return this.merchandiseMap.get(id); }
  async listArtistMerchandise(artistId: string): Promise<Merchandise[]> {
    return Array.from(this.merchandiseMap.values()).filter(m => m.artistId === artistId && m.available);
  }
  async updateMerchandise(id: string, fields: Partial<Merchandise>): Promise<Merchandise | undefined> {
    const m = this.merchandiseMap.get(id);
    if (!m) return undefined;
    const updated = { ...m, ...fields };
    this.merchandiseMap.set(id, updated);
    return updated;
  }
  async deleteMerchandise(id: string): Promise<void> { this.merchandiseMap.delete(id); }
  async createMerchOrder(data: InsertMerchOrder): Promise<MerchOrder> {
    const id = randomUUID();
    const o: MerchOrder = { id, ...data, quantity: data.quantity ?? 1, status: data.status ?? "pending" };
    this.merchOrdersMap.set(id, o);
    return o;
  }
  async getMerchOrder(id: string) { return this.merchOrdersMap.get(id); }
  async listUserOrders(userId: string): Promise<MerchOrder[]> {
    return Array.from(this.merchOrdersMap.values()).filter(o => o.userId === userId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  // ═══ Beats ═══
  private beatsMap: Map<string, Beat> = new Map();

  async createBeat(data: InsertBeat): Promise<Beat> {
    const id = randomUUID();
    const b: Beat = { id, ...data, key: data.key ?? null, genre: data.genre ?? null, bpm: data.bpm ?? 120 };
    this.beatsMap.set(id, b);
    return b;
  }
  async getBeat(id: string) { return this.beatsMap.get(id); }
  async listUserBeats(userId: string): Promise<Beat[]> {
    return Array.from(this.beatsMap.values()).filter(b => b.userId === userId);
  }
  async updateBeat(id: string, fields: Partial<Beat>): Promise<Beat | undefined> {
    const b = this.beatsMap.get(id);
    if (!b) return undefined;
    const updated = { ...b, ...fields };
    this.beatsMap.set(id, updated);
    return updated;
  }
  async deleteBeat(id: string): Promise<void> { this.beatsMap.delete(id); }

  // ═══ Samples ═══
  private samplesMap: Map<string, Sample> = new Map();

  async createSample(data: InsertSample): Promise<Sample> {
    const id = randomUUID();
    const s: Sample = { id, ...data, duration: data.duration ?? null, bpm: data.bpm ?? null, key: data.key ?? null, tags: data.tags ?? null };
    this.samplesMap.set(id, s);
    return s;
  }
  async getSample(id: string) { return this.samplesMap.get(id); }
  async listSamples(category?: string): Promise<Sample[]> {
    let list = Array.from(this.samplesMap.values());
    if (category) list = list.filter(s => s.category === category);
    return list;
  }

  // ═══ Charts ═══
  async getTopTracks(limit = 20): Promise<Track[]> {
    return Array.from(this.tracks.values()).filter(t => t.available).sort((a, b) => b.playCount - a.playCount).slice(0, limit);
  }
  async getTopArtists(limit = 20): Promise<{ artistId: string; artistName: string; totalPlays: number }[]> {
    const map = new Map<string, { artistId: string; artistName: string; totalPlays: number }>();
    Array.from(this.tracks.values()).forEach(t => {
      const entry = map.get(t.artistId) || { artistId: t.artistId, artistName: t.artistName, totalPlays: 0 };
      entry.totalPlays += t.playCount;
      map.set(t.artistId, entry);
    });
    return Array.from(map.values()).sort((a, b) => b.totalPlays - a.totalPlays).slice(0, limit);
  }
  async getTopTracksByGenre(genre: string, limit = 20): Promise<Track[]> {
    return Array.from(this.tracks.values()).filter(t => t.available && t.genre?.toLowerCase() === genre.toLowerCase()).sort((a, b) => b.playCount - a.playCount).slice(0, limit);
  }

  // ═══ Discovery ═══
  async getTrendingTracks(limit = 20): Promise<Track[]> {
    return Array.from(this.tracks.values()).filter(t => t.available).sort((a, b) => b.playCount - a.playCount).slice(0, limit);
  }
  async getRecommendedTracks(userId: string, limit = 20): Promise<Track[]> {
    const liked = await this.getUserLikes(userId);
    const likedTrackIds = new Set(liked.map(l => l.trackId));
    const likedTracks = Array.from(this.tracks.values()).filter(t => likedTrackIds.has(t.id));
    const genres = new Set(likedTracks.map(t => t.genre).filter(Boolean));
    if (genres.size === 0) return this.getTrendingTracks(limit);
    return Array.from(this.tracks.values()).filter(t => t.available && !likedTrackIds.has(t.id) && genres.has(t.genre)).sort((a, b) => b.playCount - a.playCount).slice(0, limit);
  }
  async getTracksByMood(mood: string, limit = 20): Promise<Track[]> {
    const moodGenreMap: Record<string, string[]> = {
      energetic: ["Electronic", "House", "Techno", "Dance"],
      chill: ["Jazz", "R&B", "Lo-fi"],
      happy: ["Pop", "Reggaeton", "Afrobeats"],
      dark: ["Techno", "Dubstep", "Industrial"],
      focus: ["Ambient", "Classical", "Lo-fi"],
      party: ["Hip-Hop", "Electronic", "House", "Dance"],
    };
    const genres = moodGenreMap[mood.toLowerCase()] || [];
    if (genres.length === 0) return this.getTrendingTracks(limit);
    return Array.from(this.tracks.values()).filter(t => t.available && genres.some(g => t.genre?.toLowerCase() === g.toLowerCase())).sort((a, b) => b.playCount - a.playCount).slice(0, limit);
  }
  async getGenreList(): Promise<string[]> {
    const genres = new Set<string>();
    Array.from(this.tracks.values()).forEach(t => { if (t.genre) genres.add(t.genre); });
    return Array.from(genres).sort();
  }

  // ═══ Admin ═══
  async listAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }
  async updateUser(id: string, fields: Partial<User>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    const updated = { ...user, ...fields };
    this.users.set(id, updated);
    return updated;
  }
  async deleteUser(id: string): Promise<void> { this.users.delete(id); }
}

export const storage = new MemStorage();
