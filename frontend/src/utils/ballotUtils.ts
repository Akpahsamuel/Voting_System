import { SuiClient, SuiObjectResponse } from "@mysten/sui/client";
import { Candidate } from "../pages/BallotPage";
import { normalizeTimestamp } from "./formatUtils";

// Define Ballot type directly here to avoid circular dependencies
export interface Ballot {
  id: string;
  title: string;
  description: string;
  expiration: number;
  isPrivate: boolean;
  candidates: Candidate[];
  totalVotes: number;
  status: 'Active' | 'Delisted' | 'Expired';
  creator: string;
}

// Cache for ballots to avoid refetching
interface BallotCache {
  ballots: Ballot[];
  timestamp: number;
}

// Global cache with dashboard ID as key
const ballotCaches: Record<string, BallotCache> = {};

// Cache expiration time (5 minutes)
const CACHE_EXPIRATION = 5 * 60 * 1000;

// Optimal batch size for fetching
const BATCH_SIZE = 20;

/**
 * Parse a ballot from a SUI object response
 */
export function parseBallotFromResponse(response: SuiObjectResponse): Ballot | null {
  if (!response.data || response.data.content?.dataType !== "moveObject") {
    return null;
  }
  
  // Check if this is actually a ballot by examining the type
  const type = response.data.content.type as string;
  const isBallot = type && type.includes("::ballot::Ballot");
  
  if (!isBallot) {
    console.log("Skipping non-ballot object:", response.data.objectId);
    return null;
  }
  
  const fields = response.data.content.fields as any;
  
  // Parse candidates data
  let candidatesData = [];
  if (fields.candidates) {
    if (Array.isArray(fields.candidates)) {
      candidatesData = fields.candidates;
    } else if (fields.candidates.vec && Array.isArray(fields.candidates.vec)) {
      candidatesData = fields.candidates.vec;
    }
  }
  
  // Parse candidates
  const candidates: Candidate[] = [];
  for (let i = 0; i < candidatesData.length; i++) {
    const candidate = candidatesData[i];
    
    if (!candidate) continue;
    
    // Extract image URL which might be in different formats
    let imageUrl = undefined;
    if (candidate.image_url) {
      if (typeof candidate.image_url === 'string') {
        imageUrl = candidate.image_url;
      } else if (candidate.image_url.some) {
        // Handle Option<String> from Sui Move
        imageUrl = candidate.image_url.some || undefined;
      }
    }
    
    candidates.push({
      id: Number(candidate.id || 0),
      name: candidate.name || "",
      description: candidate.description || "",
      votes: Number(candidate.vote_count || 0),
      imageUrl: imageUrl
    });
  }
  
  // Parse expiration timestamp
  const expiration = Number(fields.expiration || 0);
  const normalizedExpiration = normalizeTimestamp(expiration) || expiration;
  
  // Determine ballot status
  let status: 'Active' | 'Delisted' | 'Expired' = 'Active';
  
  if (fields.status?.fields?.name === "Delisted") {
    status = 'Delisted';
  } else if (fields.status?.fields?.name === "Expired" || normalizedExpiration < Date.now()) {
    status = 'Expired';
  }
  
  // Create ballot object
  return {
    id: response.data.objectId,
    title: fields.title || "Untitled Ballot",
    description: fields.description || "No description",
    expiration: normalizedExpiration,
    isPrivate: Boolean(fields.is_private),
    candidates,
    totalVotes: Number(fields.total_votes || 0),
    status,
    creator: fields.creator || ""
  };
}

/**
 * Extract ballot IDs from dashboard object
 */
export function extractBallotIds(dashboardData: any): string[] {
  if (!dashboardData?.data || dashboardData.data.content?.dataType !== "moveObject") {
    return [];
  }
  
  const fields = dashboardData.data.content.fields as any;
  
  // Extract ballot IDs (proposals_ids in the contract)
  let ballotIds: string[] = [];
  
  if (fields.proposals_ids) {
    if (Array.isArray(fields.proposals_ids)) {
      ballotIds = fields.proposals_ids;
    } else if (fields.proposals_ids.vec && Array.isArray(fields.proposals_ids.vec)) {
      ballotIds = fields.proposals_ids.vec;
    }
  }
  
  return ballotIds;
}

/**
 * Fetch ballots with optimized caching and batching
 */
export async function fetchBallotsOptimized(
  suiClient: SuiClient, 
  dashboardId: string,
  options: {
    forceFresh?: boolean;
    onProgress?: (progress: number) => void;
    onLoadingBatch?: (batchIndex: number, total: number) => void;
  } = {}
): Promise<Ballot[]> {
  const { forceFresh = false, onProgress, onLoadingBatch } = options;
  
  // Check cache first (unless forceFresh is true)
  if (!forceFresh && ballotCaches[dashboardId] && (Date.now() - ballotCaches[dashboardId].timestamp < CACHE_EXPIRATION)) {
    return ballotCaches[dashboardId].ballots;
  }
  
  // Get dashboard object to fetch ballot IDs
  const dashboardResponse = await suiClient.getObject({
    id: dashboardId,
    options: {
      showContent: true
    }
  });
  
  // Extract ballot IDs
  const ballotIds = extractBallotIds(dashboardResponse);
  
  if (ballotIds.length === 0) {
    // Update cache with empty result
    ballotCaches[dashboardId] = {
      ballots: [],
      timestamp: Date.now()
    };
    return [];
  }
  
  // Fetch ballot objects in batches
  const fetchedBallots: Ballot[] = [];
  
  // Calculate total batches for progress tracking
  const totalBatches = Math.ceil(ballotIds.length / BATCH_SIZE);
  
  for (let i = 0; i < ballotIds.length; i += BATCH_SIZE) {
    const currentBatch = Math.floor(i / BATCH_SIZE) + 1;
    
    // Notify about batch loading
    if (onLoadingBatch) {
      onLoadingBatch(currentBatch, totalBatches);
    }
    
    const batchIds = ballotIds.slice(i, i + BATCH_SIZE);
    if (batchIds.length === 0) continue;
    
    try {
      // Fetch multiple objects in a single request
      const batchResponse = await suiClient.multiGetObjects({
        ids: batchIds,
        options: {
          showContent: true
        }
      });
      
      // Process each object in the batch response
      for (const response of batchResponse) {
        const ballot = parseBallotFromResponse(response);
        if (ballot) {
          fetchedBallots.push(ballot);
        }
      }
      
      // Report progress
      if (onProgress) {
        const progress = Math.min(100, Math.round((currentBatch / totalBatches) * 100));
        onProgress(progress);
      }
      
    } catch (error) {
      console.error(`Error fetching batch of ballots:`, error);
      // Continue with other batches
    }
  }
  
  // Update cache
  ballotCaches[dashboardId] = {
    ballots: fetchedBallots,
    timestamp: Date.now()
  };
  
  return fetchedBallots;
}

/**
 * Clear the ballot cache for a specific dashboard or all dashboards
 */
export function clearBallotCache(dashboardId?: string): void {
  if (dashboardId) {
    delete ballotCaches[dashboardId];
  } else {
    // Clear all caches
    Object.keys(ballotCaches).forEach(key => {
      delete ballotCaches[key];
    });
  }
} 