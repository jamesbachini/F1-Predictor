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
});

export const usersRelations = relations(users, ({ many }) => ({
  holdings: many(holdings),
  transactions: many(transactions),
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

// Buy shares request schema
export const buySharesSchema = z.object({
  teamId: z.string(),
  quantity: z.number().int().positive(),
  userId: z.string(),
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
