import { FC, useEffect, useMemo, useState } from "react";
import { useSuiClientQuery } from "@mysten/dapp-kit";
import { useCurrentAccount } from "@mysten/dapp-kit";
import { useNetworkVariable } from "../config/networkConfig";
import { Badge } from "../components/ui/badge";
import { FileText, Info } from "lucide-react";
import Navbar from "../components/Navbar";
import { SuiObjectData, SuiClient } from "@mysten/sui/client";
import BallotVoting from "../components/ballot/BallotVoting";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { useNavigate } from "react-router-dom";
import FeatureGuard from "../components/FeatureGuard";
import { getNetwork } from "../utils/networkUtils";
import { fetchBallotsOptimized } from "../utils/ballotUtils";

// Define Candidate type
export interface Candidate {
  id: number;
  name: string;
  description: string;
  votes: number;
  imageUrl?: string;
}

// Define Ballot type
export interface Ballot {
  id: string;
  title: string;
  description: string;
  candidates: Candidate[];
  totalVotes: number;
  expiration: number;
  creator: string;
  status: 'Active' | 'Delisted' | 'Expired';
  isPrivate: boolean;
}

export const BallotPage: FC = () => {
  const account = useCurrentAccount();
  const dashboardId = useNetworkVariable("dashboardId" as any);
  const [activeTab, setActiveTab] = useState("voting");
  const [ballots, setBallots] = useState<Ballot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  
  // Analytics state
  const [analyticsData, setAnalyticsData] = useState({
    totalVotes: 0,
    activeBallotCount: 0,
    delistedBallotCount: 0,
    totalBallots: 0
  });

  // Fetch dashboard data to get ballot IDs
  const { data: dashboardResponse } = useSuiClientQuery(
    "getObject", {
      id: dashboardId as string,
      options: {
        showContent: true
      }
    }
  );

  // Extract ballot IDs from dashboard
  const ballotIds = useMemo(() => {
    if (dashboardResponse?.data) {
      const ids = getDashboardFields(dashboardResponse.data)?.proposals_ids || [];
      console.log("Ballot IDs from dashboard:", ids);
      return ids;
    }
    return [];
  }, [dashboardResponse?.data]);

  // Fetch all ballots
  useEffect(() => {
    const fetchBallots = async () => {
      if (ballotIds.length === 0) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        
        // Use the optimized ballot fetching utility
        const fetchedBallots = await fetchBallotsOptimized(
          new SuiClient({ url: `https://fullnode.${getNetwork()}.sui.io` }), 
          dashboardId as string,
          {
            onProgress: () => {} // We don't need progress tracking in this view
          }
        );
        
        // Process fetched ballots for statistics
        let totalVotes = 0;
        let activeBallotCount = 0;
        let delistedBallotCount = 0;
        
        for (const ballot of fetchedBallots) {
          totalVotes += ballot.totalVotes;
          
          if (ballot.status === 'Active') {
            activeBallotCount++;
          } else if (ballot.status === 'Delisted') {
            delistedBallotCount++;
          }
        }

        console.log(`Successfully loaded ${fetchedBallots.length} ballots`);
        setBallots(fetchedBallots);
        
        // Update statistics
        setAnalyticsData({
          totalVotes,
          activeBallotCount,
          delistedBallotCount,
          totalBallots: fetchedBallots.length
        });
        
      } catch (error) {
        console.error("Error fetching ballots:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (dashboardId) {
      fetchBallots();
    }
  }, [dashboardId, ballotIds]);

  // Handler to navigate to individual ballot page
  const handleViewBallot = (ballot: Ballot) => {
    console.log("Navigating to ballot:", ballot.id);
    navigate(`/ballot/${ballot.id}`);
  };

  return (
    <FeatureGuard feature="ballot">
      <div className="min-h-screen bg-black bg-grid-pattern text-white">
        <Navbar />
        <div className="container mx-auto px-4 pt-24 pb-12 max-w-7xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold">Ballot System</h1>
            <p className="text-muted-foreground">View and vote on ballots</p>
            {!account && (
              <div className="mt-4 p-4 bg-blue-900/30 border border-blue-700/30 rounded-lg">
                <p className="text-blue-200 flex items-center">
                  <Info className="h-4 w-4 mr-2" />
                  Connect your wallet to vote on ballots
                </p>
              </div>
            )}
          </div>

          <Tabs defaultValue="voting" className="w-full">
            <TabsList className="grid grid-cols-1 mb-8">
              <TabsTrigger value="voting" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                <span className="hidden sm:inline">Voting</span>
                <span className="sm:hidden">Ballots</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="voting" className="p-0">
              <BallotVoting 
                ballots={ballots} 
                isLoading={isLoading} 
                onViewBallot={handleViewBallot} 
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </FeatureGuard>
  );
};

// Helper function to extract dashboard fields
function getDashboardFields(data: SuiObjectData) {
  if (data.content?.dataType !== "moveObject") {
    console.error("Dashboard data is not a Move object:", data);
    return null;
  }

  try {
    const fields = data.content.fields as any;
    console.log("Dashboard fields:", fields);
    
    // Check if proposals_ids exists and is an array
    if (!fields.proposals_ids) {
      console.warn("No proposals_ids field in dashboard", fields);
      return { id: fields.id, proposals_ids: [] };
    }
    
    // Convert the proposals_ids to an array if it's not already
    let proposals_ids: string[] = [];
    if (Array.isArray(fields.proposals_ids)) {
      proposals_ids = fields.proposals_ids;
    } else if (typeof fields.proposals_ids === "object") {
      // If it's an object with a "Vec" field (Sui serialization format)
      proposals_ids = fields.proposals_ids.vec || [];
    }
    
    console.log("Parsed registered object IDs from dashboard:", proposals_ids);
    
    return {
      id: fields.id,
      proposals_ids: proposals_ids  // This field contains both proposals and ballots
    };
  } catch (error) {
    console.error("Error parsing dashboard fields:", error);
    return { id: { id: data.objectId || "" }, proposals_ids: [] };
  }
}

// Helper function to parse ballot data from SuiObjectData
function parseBallot(data: SuiObjectData): Ballot | null {
  try {
    if (data.content?.dataType !== "moveObject") {
      console.warn("Invalid object data type:", data.content?.dataType);
      return null;
    }

    const fields = data.content.fields as any;
    const type = data.content.type as string;
    console.log("Parsing object:", data.objectId, "with type:", type);
    
    // Check if this is actually a ballot
    const isBallot = type && type.includes("::ballot::Ballot");
    const isProposal = type && type.includes("::proposal::Proposal");
    
    if (!isBallot && !isProposal) {
      console.warn("Object is neither a ballot nor a proposal:", type);
      return null;
    }
    
    const id = data.objectId || "";
    const title = fields.title || "";
    const description = fields.description || "";
    
    // Parse expiration timestamp - use directly without conversion
    // The blockchain already provides it in milliseconds
    const rawExpiration = fields.expiration || 0;
    const expiration = Number(rawExpiration);
    console.log('Raw ballot expiration from blockchain:', rawExpiration, 'Processed:', expiration);
    
    const creator = fields.creator || "";
    const totalVotes = Number(fields.total_votes || 0);
    const isPrivate = Boolean(fields.is_private);
    
    // Parse status
    let status: 'Active' | 'Delisted' | 'Expired' = 'Active';
    if (fields.status) {
      // Check if status has a variant field
      if (fields.status.variant === "Delisted") {
        status = 'Delisted';
      } else if (fields.status.variant === "Expired") {
        status = 'Expired';
      } else if (fields.status.variant === "Active") {
        status = 'Active';
      }
      // Fallback to old format check
      else if (fields.status.fields?.name === "Delisted") {
        status = 'Delisted';
      } else if (fields.status.fields?.name === "Expired") {
        status = 'Expired';
      } else if (fields.status.fields?.name === "Active") {
        status = 'Active';
      }
    }
    // Fallback to expiration check if status is not set
    if (status === 'Active' && expiration < Date.now()) {
      status = 'Expired';
    }

    // Parse candidates
    let candidatesData = [];
    
    // Handle different possible formats for candidates data
    if (fields.candidates) {
      if (Array.isArray(fields.candidates)) {
        candidatesData = fields.candidates;
      } else if (fields.candidates.vec && Array.isArray(fields.candidates.vec)) {
        // Handle Sui serialization format with vec field
        candidatesData = fields.candidates.vec;
      }
    }
    
    console.log(`Parsing ${isBallot ? 'ballot' : 'proposal'} candidates:`, candidatesData);
    
    const candidates: Candidate[] = [];
    
    for (let i = 0; i < candidatesData.length; i++) {
      let candidate = candidatesData[i];
      if (!candidate) continue;

      // Handle nested fields (Sui serialization)
      if (candidate.fields) {
        candidate = candidate.fields;
      }

      // Extract image URL which might be in different formats
      let imageUrl = undefined;
      if (candidate.image_url) {
        if (typeof candidate.image_url === 'string') {
          imageUrl = candidate.image_url;
        } else if (candidate.image_url.some) {
          imageUrl = candidate.image_url.some || undefined;
        } else if (candidate.image_url.fields && candidate.image_url.fields.some) {
          imageUrl = candidate.image_url.fields.some;
        }
      }

      // Extract vote count robustly
      let votes = 0;
      if (typeof candidate.vote_count !== 'undefined') {
        votes = Number(candidate.vote_count);
      } else if (typeof candidate.votes !== 'undefined') {
        votes = Number(candidate.votes);
      }

      // Log candidate for debugging
      console.log('Parsed candidate:', {
        id: candidate.id,
        name: candidate.name,
        description: candidate.description,
        votes,
        imageUrl
      });

      candidates.push({
        id: Number(candidate.id || i),
        name: candidate.name || `Candidate ${i+1}`,
        description: candidate.description || '',
        votes,
        imageUrl: imageUrl
      });
    }

    const ballot: Ballot = {
      id,
      title,
      description,
      candidates,
      totalVotes,
      expiration,
      creator,
      status,
      isPrivate
    };

    console.log(`Successfully parsed ${isBallot ? 'ballot' : 'proposal'}: ${title} with ${candidates.length} candidates`);
    return ballot;
  } catch (error) {
    console.error("Error parsing object:", error, data);
    return null;
  }
}

export default BallotPage;
