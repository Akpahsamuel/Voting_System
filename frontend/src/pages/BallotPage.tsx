import { FC, useEffect, useMemo, useState } from "react";
import { useSuiClientQuery } from "@mysten/dapp-kit";
import { useCurrentAccount } from "@mysten/dapp-kit";
import { useNetworkVariable } from "../config/networkConfig";
import { Badge } from "../components/ui/badge";
import { FileText, LayoutDashboard, Settings, BarChart2, Users, Clock, AlertCircle } from "lucide-react";
import Navbar from "../components/Navbar";
import { SuiObjectData, SuiClient } from "@mysten/sui/client";
import BallotVoting from "../components/ballot/BallotVoting";
import BallotManagement from "../components/ballot/BallotManagement";
import CreateBallot from "../components/ballot/CreateBallot";
import VoterRegistry from "../components/admin/VoterRegistry";
import { useAdminCap } from "../hooks/useAdminCap";
import { useSuperAdminCap } from "../hooks/useSuperAdminCap";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";

// Define Ballot type
export interface Candidate {
  id: number;
  name: string;
  description: string;
  votes: number;
  imageUrl?: string;
}

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
  const { hasAdminCap, adminCapId } = useAdminCap();
  const { hasSuperAdminCap, superAdminCapId } = useSuperAdminCap();
  const dashboardId = useNetworkVariable("dashboardId" as any);
  const [activeTab, setActiveTab] = useState("voting");
  const [ballots, setBallots] = useState<Ballot[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Analytics data state
  const [analyticsData, setAnalyticsData] = useState({
    totalBallots: 0,
    activeBallots: 0,
    delistedBallots: 0,
    totalVotes: 0,
    votesLastWeek: 0,
    votesWeeklyChange: 5.7,
    ballotsLastWeek: 0,
    ballotsWeeklyChange: 10.2,
    activeVoters: 156,
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
        const fetchedBallots: Ballot[] = [];
        let totalVotes = 0;
        let activeBallotCount = 0;
        let delistedBallotCount = 0;

        // Create a SuiClient instance
        const suiClient = new SuiClient({ url: "https://fullnode.devnet.sui.io" });

        // Fetch each ballot object
        for (const id of ballotIds) {
          try {
            const response = await suiClient.getObject({
              id,
              options: {
                showContent: true
              }
            });

            if (response.data && response.data.content?.dataType === "moveObject") {
              const ballot = parseBallot(response.data);
              if (ballot) {
                fetchedBallots.push(ballot);
                totalVotes += ballot.totalVotes;
                
                if (ballot.status === 'Active') {
                  activeBallotCount++;
                } else if (ballot.status === 'Delisted') {
                  delistedBallotCount++;
                }
              }
            }
          } catch (error) {
            console.error(`Error fetching ballot ${id}:`, error);
          }
        }

        setBallots(fetchedBallots);
        
        // Update analytics
        setAnalyticsData({
          ...analyticsData,
          totalBallots: fetchedBallots.length,
          activeBallots: activeBallotCount,
          delistedBallots: delistedBallotCount,
          totalVotes: totalVotes
        });
      } catch (error) {
        console.error("Error fetching ballots:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (account && ballotIds.length > 0) {
      fetchBallots();
    }
  }, [account, ballotIds, analyticsData]);

  if (!account) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">Connect Your Wallet</CardTitle>
            <CardDescription className="text-center">
              Please connect your wallet to access the ballot system
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            {/* ConnectButton is already in the Navbar */}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black bg-grid-pattern text-white">
      <Navbar />
      <div className="container mx-auto px-4 pt-24 pb-12 max-w-7xl">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Ballot System</h1>
            <p className="text-muted-foreground">Create and manage ballots, vote on candidates</p>
          </div>
          <div className="flex items-center space-x-2 mt-4 md:mt-0">
            {(hasAdminCap || hasSuperAdminCap) && (
              <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200 px-3 py-1">
                {hasSuperAdminCap ? "Super Admin" : "Admin"}
              </Badge>
            )}
            {/* ConnectButton is already in the Navbar */}
          </div>
        </div>

      <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-3 md:grid-cols-5 mb-8">
          <TabsTrigger value="voting" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden md:inline">Voting</span>
          </TabsTrigger>
          
          {(hasAdminCap || hasSuperAdminCap) && (
            <>
              <TabsTrigger value="create" className="flex items-center gap-2">
                <LayoutDashboard className="h-4 w-4" />
                <span className="hidden md:inline">Create Ballot</span>
              </TabsTrigger>
              
              <TabsTrigger value="manage" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                <span className="hidden md:inline">Manage Ballots</span>
              </TabsTrigger>
            </>
          )}
          
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart2 className="h-4 w-4" />
            <span className="hidden md:inline">Analytics</span>
          </TabsTrigger>
          
          <TabsTrigger value="voters" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden md:inline">Voters</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="voting" className="p-0">
          <BallotVoting ballots={ballots} isLoading={isLoading} />
        </TabsContent>
        <TabsContent value="manage" className="p-0">
          <BallotManagement 
            ballots={ballots} 
            isLoading={isLoading} 
            adminCapId={adminCapId} 
            superAdminCapId={superAdminCapId} 
            hasSuperAdminCap={hasSuperAdminCap}
          />
        </TabsContent>
        <TabsContent value="create" className="p-0">
          <CreateBallot 
            adminCapId={adminCapId} 
            superAdminCapId={superAdminCapId} 
            hasSuperAdminCap={hasSuperAdminCap} 
          />
        </TabsContent>
        <TabsContent value="analytics" className="p-0">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Total Ballots
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analyticsData.totalBallots}</div>
                <p className="text-xs text-muted-foreground">
                  +{analyticsData.ballotsWeeklyChange}% from last week
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <LayoutDashboard className="h-4 w-4" />
                  Active Ballots
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analyticsData.activeBallots}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Delisted Ballots
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analyticsData.delistedBallots}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <BarChart2 className="h-4 w-4" />
                  Total Votes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analyticsData.totalVotes}</div>
                <p className="text-xs text-muted-foreground">
                  +{analyticsData.votesWeeklyChange}% from last week
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Active Voters
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analyticsData.activeVoters}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm">
                  <Badge variant="outline" className="mr-1">New</Badge>
                  {ballots.length > 0 ? ballots[0].title : "No recent ballots"}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        <TabsContent value="voters" className="p-0">
          <VoterRegistry />
        </TabsContent>
      </Tabs>
    </div>
    </div>
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
    
    console.log("Parsed ballot IDs from dashboard:", proposals_ids);
    
    return {
      id: fields.id,
      proposals_ids: proposals_ids
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
    console.log("Parsing ballot object:", data.objectId, fields);
    
    const id = data.objectId || "";
    const title = fields.title || "";
    const description = fields.description || "";
    const expiration = Number(fields.expiration || 0) * 1000; // Convert to milliseconds
    const creator = fields.creator || "";
    const totalVotes = Number(fields.total_votes || 0);
    const isPrivate = Boolean(fields.is_private);
    
    // Parse status
    let status: 'Active' | 'Delisted' | 'Expired' = 'Active';
    if (fields.status?.fields?.name === "Delisted") {
      status = 'Delisted';
    } else if (fields.status?.fields?.name === "Expired" || expiration < Date.now()) {
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
    
    console.log("Parsing candidates data:", candidatesData);
    
    const candidates: Candidate[] = [];
    
    for (let i = 0; i < candidatesData.length; i++) {
      const candidate = candidatesData[i];
      
      // Skip invalid candidate entries
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

    console.log("Successfully parsed ballot:", ballot.title, "with", candidates.length, "candidates");
    return ballot;
  } catch (error) {
    console.error("Error parsing ballot:", error, data);
    return null;
  }
}

export default BallotPage;
