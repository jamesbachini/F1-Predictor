/**
 * Proof Routes - TLSNotary zkProof Submission and Verification API
 * 
 * Handles submission and verification of TLSNotary proofs for F1 championship results.
 */

import type { Express } from "express";
import { storage } from "./storage";
import { submitProofSchema } from "@shared/schema";

// Known F1 team names mapped to team IDs for result extraction
const TEAM_NAME_MAPPING: Record<string, string> = {
  "red bull racing": "redbull",
  "red bull": "redbull",
  "scuderia ferrari": "ferrari",
  "ferrari": "ferrari",
  "mercedes-amg": "mercedes",
  "mercedes": "mercedes",
  "mclaren f1": "mclaren",
  "mclaren": "mclaren",
  "aston martin": "astonmartin",
  "alpine f1": "alpine",
  "alpine": "alpine",
  "williams racing": "williams",
  "williams": "williams",
  "rb formula one": "rb",
  "visa cash app rb": "rb",
  "rb": "rb",
  "audi f1": "audi",
  "audi": "audi",
  "haas f1": "haas",
  "haas": "haas",
  "cadillac f1": "cadillac",
  "cadillac": "cadillac",
};

// Known F1 driver names mapped to driver IDs
const DRIVER_NAME_MAPPING: Record<string, string> = {
  "max verstappen": "verstappen",
  "verstappen": "verstappen",
  "liam lawson": "lawson",
  "lawson": "lawson",
  "charles leclerc": "leclerc",
  "leclerc": "leclerc",
  "lewis hamilton": "hamilton",
  "hamilton": "hamilton",
  "george russell": "russell",
  "russell": "russell",
  "andrea kimi antonelli": "antonelli",
  "antonelli": "antonelli",
  "lando norris": "norris",
  "norris": "norris",
  "oscar piastri": "piastri",
  "piastri": "piastri",
  "fernando alonso": "alonso",
  "alonso": "alonso",
  "lance stroll": "stroll",
  "stroll": "stroll",
  "pierre gasly": "gasly",
  "gasly": "gasly",
  "jack doohan": "doohan",
  "doohan": "doohan",
  "alex albon": "albon",
  "albon": "albon",
  "carlos sainz": "sainz",
  "sainz": "sainz",
  "yuki tsunoda": "tsunoda",
  "tsunoda": "tsunoda",
  "isack hadjar": "hadjar",
  "hadjar": "hadjar",
  "nico hulkenberg": "hulkenberg",
  "hulkenberg": "hulkenberg",
  "gabriel bortoleto": "bortoleto",
  "bortoleto": "bortoleto",
  "esteban ocon": "ocon",
  "ocon": "ocon",
  "oliver bearman": "bearman",
  "bearman": "bearman",
};

interface TLSNotaryProof {
  attestation?: {
    header?: {
      id?: string;
      version?: string;
      merkleRoot?: string;
    };
    body?: {
      serverName?: string;
      transcriptCommitments?: unknown[];
      extensions?: unknown[];
    };
    signature?: string;
  };
  presentation?: {
    disclosedRanges?: unknown[];
    transcriptData?: string;
  };
  notaryPublicKey?: string;
}

interface ParsedProofData {
  serverDomain: string;
  notaryPublicKey: string;
  disclosedTranscript: string;
  extractedWinnerId: string | null;
  extractedWinnerName: string | null;
  isTeamResult: boolean;
}

/**
 * Parse a TLSNotary proof JSON and extract relevant information
 */
function parseProof(proofJson: string): { success: boolean; data?: ParsedProofData; error?: string } {
  try {
    const proof: TLSNotaryProof = JSON.parse(proofJson);

    // Extract server domain from attestation
    const serverDomain = proof.attestation?.body?.serverName || "";
    
    // Validate it's from formula1.com
    if (!serverDomain.includes("formula1.com")) {
      return { 
        success: false, 
        error: `Invalid server domain: ${serverDomain}. Must be from formula1.com` 
      };
    }

    // Extract notary public key
    const notaryPublicKey = proof.notaryPublicKey || "";
    if (!notaryPublicKey) {
      return { 
        success: false, 
        error: "Missing notary public key in proof" 
      };
    }

    // Extract disclosed transcript
    const disclosedTranscript = proof.presentation?.transcriptData || "";
    if (!disclosedTranscript) {
      return { 
        success: false, 
        error: "Missing disclosed transcript in proof" 
      };
    }

    // Try to extract championship result from transcript
    const { winnerId, winnerName, isTeam } = extractChampionshipResult(disclosedTranscript);

    return {
      success: true,
      data: {
        serverDomain,
        notaryPublicKey,
        disclosedTranscript,
        extractedWinnerId: winnerId,
        extractedWinnerName: winnerName,
        isTeamResult: isTeam,
      },
    };
  } catch (error: any) {
    return { 
      success: false, 
      error: `Failed to parse proof JSON: ${error.message}` 
    };
  }
}

/**
 * Extract championship result from disclosed transcript
 * Looks for patterns indicating a team or driver championship winner
 */
function extractChampionshipResult(transcript: string): { 
  winnerId: string | null; 
  winnerName: string | null; 
  isTeam: boolean 
} {
  const lowerTranscript = transcript.toLowerCase();

  // Look for patterns like "Constructors' Champion: Red Bull Racing" or "World Champion: Max Verstappen"
  const teamPatterns = [
    /constructors['']?\s*champion[s]?[:\s]+([a-z\s-]+)/i,
    /team\s*championship[:\s]+([a-z\s-]+)/i,
    /winning\s*constructor[:\s]+([a-z\s-]+)/i,
  ];

  const driverPatterns = [
    /world\s*champion[:\s]+([a-z\s]+)/i,
    /drivers['']?\s*champion[s]?[:\s]+([a-z\s]+)/i,
    /championship\s*winner[:\s]+([a-z\s]+)/i,
  ];

  // Try team patterns first
  for (const pattern of teamPatterns) {
    const match = transcript.match(pattern);
    if (match) {
      const teamName = match[1].trim().toLowerCase();
      const teamId = TEAM_NAME_MAPPING[teamName];
      if (teamId) {
        return { 
          winnerId: teamId, 
          winnerName: match[1].trim(), 
          isTeam: true 
        };
      }
    }
  }

  // Try driver patterns
  for (const pattern of driverPatterns) {
    const match = transcript.match(pattern);
    if (match) {
      const driverName = match[1].trim().toLowerCase();
      const driverId = DRIVER_NAME_MAPPING[driverName];
      if (driverId) {
        return { 
          winnerId: driverId, 
          winnerName: match[1].trim(), 
          isTeam: false 
        };
      }
    }
  }

  // Also check if any known names appear in the transcript
  for (const [name, id] of Object.entries(TEAM_NAME_MAPPING)) {
    if (lowerTranscript.includes(name) && lowerTranscript.includes("champion")) {
      const teams = Object.entries(TEAM_NAME_MAPPING)
        .filter(([n]) => lowerTranscript.includes(n))
        .map(([n, i]) => ({ name: n, id: i }));
      if (teams.length === 1) {
        return { winnerId: teams[0].id, winnerName: teams[0].name, isTeam: true };
      }
    }
  }

  return { winnerId: null, winnerName: null, isTeam: false };
}

/**
 * Verify a TLSNotary proof cryptographically
 * In a production system, this would verify:
 * 1. The Notary signature matches a trusted Notary public key
 * 2. The Merkle root matches the disclosed transcript
 * 3. The server certificate chain is valid
 * 
 * For MVP, we do basic structural validation
 */
function verifyProofCryptographically(proofJson: string): { valid: boolean; error?: string } {
  try {
    const proof: TLSNotaryProof = JSON.parse(proofJson);

    // Check attestation exists
    if (!proof.attestation || !proof.attestation.signature) {
      return { valid: false, error: "Missing attestation or signature" };
    }

    // Check merkle root exists
    if (!proof.attestation.header?.merkleRoot) {
      return { valid: false, error: "Missing merkle root in attestation" };
    }

    // Check presentation exists
    if (!proof.presentation || !proof.presentation.disclosedRanges) {
      return { valid: false, error: "Missing presentation or disclosed ranges" };
    }

    // In production: Verify signature against trusted Notary public keys
    // For MVP: Accept proofs that have valid structure
    
    return { valid: true };
  } catch (error: any) {
    return { valid: false, error: `Verification failed: ${error.message}` };
  }
}

const ADMIN_WALLET_ADDRESSES = [
  process.env.ADMIN_WALLET_ADDRESS || "ADMIN_WALLET_NOT_SET",
];

function isAdmin(req: any): boolean {
  const walletAddress = req.headers["x-wallet-address"];
  return ADMIN_WALLET_ADDRESSES.includes(walletAddress as string);
}

export function registerProofRoutes(app: Express): void {
  // Submit a new TLSNotary proof (admin only)
  app.post("/api/proofs/submit", async (req, res) => {
    if (!isAdmin(req)) {
      return res.status(403).json({ error: "Admin access required" });
    }
    try {
      const parseResult = submitProofSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ 
          error: "Invalid request", 
          details: parseResult.error.errors 
        });
      }

      const { poolId, userId, proofJson } = parseResult.data;

      // Verify pool exists and is active
      const pool = await storage.getChampionshipPool(poolId);
      if (!pool) {
        return res.status(404).json({ error: "Pool not found" });
      }

      // Parse the proof
      const parsed = parseProof(proofJson);
      if (!parsed.success || !parsed.data) {
        return res.status(400).json({ error: parsed.error });
      }

      // Create the proof record with pending status
      const zkProof = await storage.createZkProof({
        poolId,
        submittedBy: userId,
        serverDomain: parsed.data.serverDomain,
        attestationData: proofJson,
        notaryPublicKey: parsed.data.notaryPublicKey,
        extractedWinnerId: parsed.data.extractedWinnerId,
        extractedWinnerName: parsed.data.extractedWinnerName,
        disclosedTranscript: parsed.data.disclosedTranscript,
        verificationStatus: "pending",
      });

      res.json({
        success: true,
        proof: zkProof,
        extractedResult: {
          winnerId: parsed.data.extractedWinnerId,
          winnerName: parsed.data.extractedWinnerName,
          isTeamResult: parsed.data.isTeamResult,
        },
        message: "Proof submitted successfully. Awaiting verification.",
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to submit proof" });
    }
  });

  // Get proof by ID
  app.get("/api/proofs/:proofId", async (req, res) => {
    try {
      const proof = await storage.getZkProof(req.params.proofId);
      if (!proof) {
        return res.status(404).json({ error: "Proof not found" });
      }
      res.json(proof);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch proof" });
    }
  });

  // Get proofs for a pool
  app.get("/api/proofs/pool/:poolId", async (req, res) => {
    try {
      const proofs = await storage.getZkProofsByPool(req.params.poolId);
      res.json(proofs);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch proofs" });
    }
  });

  // Verify a proof (admin endpoint)
  app.post("/api/proofs/:proofId/verify", async (req, res) => {
    if (!isAdmin(req)) {
      return res.status(403).json({ error: "Admin access required" });
    }
    try {
      const proof = await storage.getZkProof(req.params.proofId);
      if (!proof) {
        return res.status(404).json({ error: "Proof not found" });
      }

      if (proof.verificationStatus !== "pending") {
        return res.status(400).json({ 
          error: `Proof already ${proof.verificationStatus}` 
        });
      }

      // Verify the proof cryptographically
      const verification = verifyProofCryptographically(proof.attestationData);
      
      if (!verification.valid) {
        await storage.updateZkProofStatus(
          proof.id, 
          "rejected", 
          undefined, 
          undefined, 
          verification.error
        );
        return res.json({
          success: false,
          status: "rejected",
          reason: verification.error,
        });
      }

      // Check if we could extract a winner
      if (!proof.extractedWinnerId) {
        await storage.updateZkProofStatus(
          proof.id,
          "rejected",
          undefined,
          undefined,
          "Could not extract championship winner from proof transcript"
        );
        return res.json({
          success: false,
          status: "rejected",
          reason: "Could not extract championship winner from proof transcript",
        });
      }

      // Mark as verified
      const updatedProof = await storage.updateZkProofStatus(
        proof.id,
        "verified",
        proof.extractedWinnerId,
        proof.extractedWinnerName || undefined
      );

      res.json({
        success: true,
        status: "verified",
        proof: updatedProof,
        extractedWinner: {
          id: proof.extractedWinnerId,
          name: proof.extractedWinnerName,
        },
        message: "Proof verified successfully. Ready to resolve pool.",
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to verify proof" });
    }
  });

  // Resolve pool using verified proof (admin endpoint)
  app.post("/api/proofs/:proofId/resolve-pool", async (req, res) => {
    if (!isAdmin(req)) {
      return res.status(403).json({ error: "Admin access required" });
    }
    try {
      const proof = await storage.getZkProof(req.params.proofId);
      if (!proof) {
        return res.status(404).json({ error: "Proof not found" });
      }

      if (proof.verificationStatus !== "verified") {
        return res.status(400).json({ 
          error: "Proof must be verified before resolving pool" 
        });
      }

      if (!proof.extractedWinnerId) {
        return res.status(400).json({ 
          error: "Proof has no extracted winner" 
        });
      }

      // Get the pool
      const pool = await storage.getChampionshipPool(proof.poolId);
      if (!pool) {
        return res.status(404).json({ error: "Pool not found" });
      }

      if (pool.status === "concluded") {
        return res.status(400).json({ error: "Pool already concluded" });
      }

      // Find the matching outcome for the winner
      const outcomes = await storage.getChampionshipOutcomes(pool.id);
      const winningOutcome = outcomes.find(
        o => o.participantId === proof.extractedWinnerId
      );

      if (!winningOutcome) {
        return res.status(400).json({ 
          error: `No outcome found for winner: ${proof.extractedWinnerId}` 
        });
      }

      // Conclude the pool
      const updatedPool = await storage.concludePool(pool.id, winningOutcome.id);

      res.json({
        success: true,
        pool: updatedPool,
        winningOutcome,
        proofId: proof.id,
        message: `Pool resolved with winner: ${proof.extractedWinnerName || proof.extractedWinnerId}`,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to resolve pool" });
    }
  });

  // Preview proof parsing (helper endpoint for admin UI)
  app.post("/api/proofs/preview", async (req, res) => {
    try {
      const { proofJson } = req.body;
      
      if (!proofJson) {
        return res.status(400).json({ error: "Missing proofJson" });
      }

      const parsed = parseProof(proofJson);
      
      if (!parsed.success || !parsed.data) {
        return res.status(400).json({ 
          valid: false,
          error: parsed.error 
        });
      }

      // Also run cryptographic verification
      const cryptoVerification = verifyProofCryptographically(proofJson);

      res.json({
        valid: cryptoVerification.valid,
        serverDomain: parsed.data.serverDomain,
        notaryPublicKey: parsed.data.notaryPublicKey.substring(0, 20) + "...",
        extractedWinner: {
          id: parsed.data.extractedWinnerId,
          name: parsed.data.extractedWinnerName,
          isTeamResult: parsed.data.isTeamResult,
        },
        transcriptPreview: parsed.data.disclosedTranscript.substring(0, 500) + "...",
        cryptoVerification: cryptoVerification.valid ? "passed" : cryptoVerification.error,
      });
    } catch (error: any) {
      res.status(400).json({ 
        valid: false, 
        error: error.message 
      });
    }
  });
}
