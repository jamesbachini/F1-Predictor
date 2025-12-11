import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { buySharesSchema, insertUserSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Seed teams on startup
  await storage.seedTeams();

  // ============ Teams/Market Routes ============
  
  // Get all teams
  app.get("/api/teams", async (req, res) => {
    try {
      const teams = await storage.getTeams();
      res.json(teams);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch teams" });
    }
  });

  // Get single team
  app.get("/api/teams/:id", async (req, res) => {
    try {
      const team = await storage.getTeam(req.params.id);
      if (!team) {
        return res.status(404).json({ error: "Team not found" });
      }
      res.json(team);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch team" });
    }
  });

  // Get prize pool
  app.get("/api/market/prize-pool", async (req, res) => {
    try {
      const prizePool = await storage.getPrizePool();
      res.json({ prizePool });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch prize pool" });
    }
  });

  // Get recent transactions (market activity)
  app.get("/api/market/activity", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const transactions = await storage.getRecentTransactions(limit);
      res.json(transactions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch market activity" });
    }
  });

  // ============ User Routes ============

  // Create or get guest user (simplified auth for demo)
  app.post("/api/users/guest", async (req, res) => {
    try {
      const guestId = `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const user = await storage.createUser({
        username: guestId,
        password: "guest",
      });
      res.json(user);
    } catch (error) {
      res.status(500).json({ error: "Failed to create guest user" });
    }
  });

  // Get user by ID
  app.get("/api/users/:id", async (req, res) => {
    try {
      const user = await storage.getUser(req.params.id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      // Don't send password
      const { password, ...safeUser } = user;
      res.json(safeUser);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch user" });
    }
  });

  // ============ Portfolio Routes ============

  // Get user holdings
  app.get("/api/users/:userId/holdings", async (req, res) => {
    try {
      const holdings = await storage.getHoldingsByUser(req.params.userId);
      res.json(holdings);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch holdings" });
    }
  });

  // Get user transactions
  app.get("/api/users/:userId/transactions", async (req, res) => {
    try {
      const transactions = await storage.getTransactionsByUser(req.params.userId);
      res.json(transactions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch transactions" });
    }
  });

  // ============ Trading Routes ============

  // Buy shares
  app.post("/api/trade/buy", async (req, res) => {
    try {
      const parsed = buySharesSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request", details: parsed.error.errors });
      }

      const result = await storage.buyShares(parsed.data);
      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      res.json({ success: true, transaction: result.transaction });
    } catch (error) {
      res.status(500).json({ error: "Failed to process trade" });
    }
  });

  return httpServer;
}
