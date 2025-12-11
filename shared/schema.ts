import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, integer, real, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table - tracks user accounts and wallet balance
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  balance: real("balance").notNull().default(100),
  walletAddress: text("wallet_address"),
});

export const usersRelations = relations(users, ({ many }) => ({
  holdings: many(holdings),
  transactions: many(transactions),
  deposits: many(deposits),
}));

// F1 Teams table - the 10 teams users can bet on
export const teams = pgTable("teams", {
  id: varchar("id").primaryKey(),
  name: text("name").notNull(),
  shortName: text("short_name").notNull(),
  color: text("color").notNull(),
  price: real("price").notNull().default(0.1),
  priceChange: real("price_change").notNull().default(0),
  totalShares: integer("total_shares").notNull().default(10000),
  availableShares: integer("available_shares").notNull().default(10000),
});

export const teamsRelations = relations(teams, ({ many }) => ({
  holdings: many(holdings),
  transactions: many(transactions),
}));

// Holdings - tracks which users own shares in which teams
export const holdings = pgTable("holdings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  teamId: varchar("team_id").notNull().references(() => teams.id),
  shares: integer("shares").notNull().default(0),
  avgPrice: real("avg_price").notNull().default(0),
});

export const holdingsRelations = relations(holdings, ({ one }) => ({
  user: one(users, {
    fields: [holdings.userId],
    references: [users.id],
  }),
  team: one(teams, {
    fields: [holdings.teamId],
    references: [teams.id],
  }),
}));

// Transactions - history of all share purchases
export const transactions = pgTable("transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  teamId: varchar("team_id").notNull().references(() => teams.id),
  type: text("type").notNull(), // 'buy' or 'sell'
  shares: integer("shares").notNull(),
  pricePerShare: real("price_per_share").notNull(),
  totalAmount: real("total_amount").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Deposits - tracks USDC deposits from Stellar network
export const deposits = pgTable("deposits", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  stellarTxHash: text("stellar_tx_hash").unique(),
  amount: real("amount").notNull(),
  status: text("status").notNull().default("pending"), // 'pending', 'confirmed', 'failed'
  fromAddress: text("from_address"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  confirmedAt: timestamp("confirmed_at"),
});

// Price History - tracks team price changes over time for charts
export const priceHistory = pgTable("price_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  teamId: varchar("team_id").notNull().references(() => teams.id),
  price: real("price").notNull(),
  recordedAt: timestamp("recorded_at").notNull().defaultNow(),
});

// Season - tracks the current season state
export const seasons = pgTable("seasons", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  year: integer("year").notNull().unique(),
  status: text("status").notNull().default("active"), // 'active', 'concluded'
  winningTeamId: varchar("winning_team_id").references(() => teams.id),
  prizePool: real("prize_pool").notNull().default(0),
  concludedAt: timestamp("concluded_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const seasonsRelations = relations(seasons, ({ one }) => ({
  winningTeam: one(teams, {
    fields: [seasons.winningTeamId],
    references: [teams.id],
  }),
}));

// Payouts - records prize distributions to winners
export const payouts = pgTable("payouts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  seasonId: varchar("season_id").notNull().references(() => seasons.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  teamId: varchar("team_id").notNull().references(() => teams.id),
  sharesHeld: integer("shares_held").notNull(),
  sharePercentage: real("share_percentage").notNull(),
  payoutAmount: real("payout_amount").notNull(),
  stellarTxHash: text("stellar_tx_hash"),
  status: text("status").notNull().default("pending"), // 'pending', 'sent', 'failed'
  createdAt: timestamp("created_at").notNull().defaultNow(),
  paidAt: timestamp("paid_at"),
});

export const payoutsRelations = relations(payouts, ({ one }) => ({
  season: one(seasons, {
    fields: [payouts.seasonId],
    references: [seasons.id],
  }),
  user: one(users, {
    fields: [payouts.userId],
    references: [users.id],
  }),
  team: one(teams, {
    fields: [payouts.teamId],
    references: [teams.id],
  }),
}));

export const depositsRelations = relations(deposits, ({ one }) => ({
  user: one(users, {
    fields: [deposits.userId],
    references: [users.id],
  }),
}));

export const priceHistoryRelations = relations(priceHistory, ({ one }) => ({
  team: one(teams, {
    fields: [priceHistory.teamId],
    references: [teams.id],
  }),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  user: one(users, {
    fields: [transactions.userId],
    references: [users.id],
  }),
  team: one(teams, {
    fields: [transactions.teamId],
    references: [teams.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertTeamSchema = createInsertSchema(teams);

export const insertHoldingSchema = createInsertSchema(holdings).omit({
  id: true,
});

export const insertTransactionSchema = createInsertSchema(transactions).omit({
  id: true,
  createdAt: true,
});

export const insertDepositSchema = createInsertSchema(deposits).omit({
  id: true,
  createdAt: true,
  confirmedAt: true,
});

export const insertPriceHistorySchema = createInsertSchema(priceHistory).omit({
  id: true,
  recordedAt: true,
});

export const insertSeasonSchema = createInsertSchema(seasons).omit({
  id: true,
  createdAt: true,
  concludedAt: true,
});

export const insertPayoutSchema = createInsertSchema(payouts).omit({
  id: true,
  createdAt: true,
  paidAt: true,
});

// Buy shares request schema
export const buySharesSchema = z.object({
  teamId: z.string(),
  quantity: z.number().int().positive(),
  userId: z.string(),
});

// Sell shares request schema
export const sellSharesSchema = z.object({
  teamId: z.string(),
  quantity: z.number().int().positive(),
  userId: z.string(),
});

// Deposit request schema
export const depositRequestSchema = z.object({
  userId: z.string(),
  stellarTxHash: z.string(),
  amount: z.number().positive(),
  fromAddress: z.string(),
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertTeam = z.infer<typeof insertTeamSchema>;
export type Team = typeof teams.$inferSelect;
export type InsertHolding = z.infer<typeof insertHoldingSchema>;
export type Holding = typeof holdings.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Transaction = typeof transactions.$inferSelect;
export type BuySharesRequest = z.infer<typeof buySharesSchema>;
export type SellSharesRequest = z.infer<typeof sellSharesSchema>;
export type InsertDeposit = z.infer<typeof insertDepositSchema>;
export type Deposit = typeof deposits.$inferSelect;
export type DepositRequest = z.infer<typeof depositRequestSchema>;
export type InsertPriceHistory = z.infer<typeof insertPriceHistorySchema>;
export type PriceHistory = typeof priceHistory.$inferSelect;
export type InsertSeason = z.infer<typeof insertSeasonSchema>;
export type Season = typeof seasons.$inferSelect;
export type InsertPayout = z.infer<typeof insertPayoutSchema>;
export type Payout = typeof payouts.$inferSelect;
