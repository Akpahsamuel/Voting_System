import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useCurrentAccount } from "@mysten/dapp-kit";
import { SuiClient } from "@mysten/sui/client";
import { useNetworkVariable } from "../../config/networkConfig";
import { toast } from "sonner";
import { CalendarIcon, Clock, Edit, ExternalLink, Vote } from "lucide-react";
import { format } from "date-fns";

// Import UI components
import { Button } from "../ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { Skeleton } from "../ui/skeleton";

interface Ballot {
  id: string;
  title: string;
  description: string;
  expiration: number;
  isPrivate: boolean;
  candidateCount: number;
  totalVotes: number;
  status: 'Active' | 'Delisted' | 'Expired';
  creator: string;
}

interface BallotListProps {
  suiClient: SuiClient;
}

export default function BallotList({ suiClient }: BallotListProps) {
  const navigate = useNavigate();
  const currentAccount = useCurrentAccount();
  const packageId = useNetworkVariable("packageId");
  const dashboardId = useNetworkVariable("dashboardId");
  
  const [ballots, setBallots] = useState<Ballot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (currentAccount) {
      fetchBallots();
    }
  }, [currentAccount, dashboardId]);

  const fetchBallots = async () => {
    if (!dashboardId) {
      setError("Dashboard ID not found. Please check your network configuration.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      console.log("Fetching ballots from dashboard:", dashboardId);
      
      // Get dashboard object to fetch ballot IDs
      const dashboardResponse = await suiClient.getObject({
        id: dashboardId as string,
        options: {
          showContent: true
        }
      });
      
      if (!dashboardResponse?.data || !dashboardResponse.data.content) {
        throw new Error("Dashboard not found or has no content");
      }

      // Extract ballot IDs from dashboard
      const fields = dashboardResponse.data.content.dataType === "moveObject" 
        ? dashboardResponse.data.content.fields as any 
        : null;
      
      if (!fields) {
        throw new Error("Invalid dashboard data format");
      }
      
      console.log("Dashboard fields:", fields);
      
      // Extract ballot IDs (proposals_ids in the contract)
      let ballotIds: string[] = [];
      
      if (fields.proposals_ids) {
        if (Array.isArray(fields.proposals_ids)) {
          ballotIds = fields.proposals_ids;
        } else if (fields.proposals_ids.vec && Array.isArray(fields.proposals_ids.vec)) {
          ballotIds = fields.proposals_ids.vec;
        }
      }
      
      console.log("Found ballot IDs:", ballotIds);
      
      if (ballotIds.length === 0) {
        setLoading(false);
        return; // No ballots to fetch
      }
      
      // Fetch each ballot object
      const fetchedBallots: Ballot[] = [];
      
      for (const id of ballotIds) {
        try {
          const response = await suiClient.getObject({
            id,
            options: {
              showContent: true
            }
          });

          if (response.data && response.data.content?.dataType === "moveObject") {
            const fields = response.data.content.fields as any;
            
            // Parse candidates data
            let candidates = [];
            if (fields.candidates) {
              if (Array.isArray(fields.candidates)) {
                candidates = fields.candidates;
              } else if (fields.candidates.vec && Array.isArray(fields.candidates.vec)) {
                candidates = fields.candidates.vec;
              }
            }
            
            // Determine ballot status
            let status: 'Active' | 'Delisted' | 'Expired' = 'Active';
            const expiration = Number(fields.expiration || 0) * 1000; // Convert to milliseconds
            
            if (fields.status?.fields?.name === "Delisted") {
              status = 'Delisted';
            } else if (fields.status?.fields?.name === "Expired" || expiration < Date.now()) {
              status = 'Expired';
            }
            
            // Create ballot object
            const ballot: Ballot = {
              id: response.data.objectId,
              title: fields.title || "Untitled Ballot",
              description: fields.description || "No description",
              expiration: expiration,
              isPrivate: Boolean(fields.is_private),
              candidateCount: candidates.length,
              totalVotes: Number(fields.total_votes || 0),
              status,
              creator: fields.creator || ""
            };
            
            fetchedBallots.push(ballot);
          }
        } catch (err) {
          console.error(`Error fetching ballot ${id}:`, err);
          // Continue with other ballots
        }
      }
      
      console.log("Fetched ballots:", fetchedBallots);
      setBallots(fetchedBallots);
    } catch (err) {
      console.error("Error fetching ballots:", err);
      setError("Failed to load ballots. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const formatTimeLeft = (expirationTimestamp: number) => {
    const now = Date.now();
    const diff = expirationTimestamp - now;
    
    if (diff <= 0) return "Expired";
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) {
      return `${days}d ${hours}h left`;
    } else {
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      return `${hours}h ${minutes}m left`;
    }
  };

  const handleManageBallot = (ballotId: string) => {
    navigate(`/ballots/manage/${ballotId}`);
  };

  const handleViewBallot = (ballotId: string) => {
    navigate(`/ballots/view/${ballotId}`);
  };

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-red-500">
            <p>{error}</p>
            <Button 
              variant="outline" 
              onClick={fetchBallots} 
              className="mt-4"
            >
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Your Ballots</h2>
        <Button onClick={() => navigate("/ballots/create")}>
          Create New Ballot
        </Button>
      </div>
      
      {loading ? (
        // Skeleton loading state
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2 mt-2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6 mt-2" />
              </CardContent>
              <CardFooter>
                <Skeleton className="h-10 w-28" />
                <Skeleton className="h-10 w-28 ml-2" />
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : ballots.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center p-6">
              <p className="mb-4">No ballots found. You can create a new ballot to get started.</p>
              <Button onClick={() => navigate("/ballots/create")}>
                Create Your First Ballot
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {ballots.map((ballot) => (
            <Card key={ballot.id} className={ballot.status === 'Expired' ? 'opacity-70' : ''}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>{ballot.title}</CardTitle>
                    <CardDescription>{ballot.description}</CardDescription>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge variant={ballot.isPrivate ? "secondary" : "outline"}>
                      {ballot.isPrivate ? "Private" : "Public"}
                    </Badge>
                    {ballot.status !== 'Active' && (
                      <Badge variant={ballot.status === 'Delisted' ? "destructive" : "outline"}>
                        {ballot.status}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-4 text-sm">
                  <div className="flex items-center">
                    <Clock className="w-4 h-4 mr-1" />
                    <span>{formatTimeLeft(ballot.expiration)}</span>
                  </div>
                  <div>
                    <span className="font-medium">{ballot.candidateCount}</span> candidates
                  </div>
                  <div>
                    <span className="font-medium">{ballot.totalVotes}</span> votes
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-end gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleManageBallot(ballot.id)}
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Manage
                </Button>
                <Button 
                  size="sm"
                  onClick={() => handleViewBallot(ballot.id)}
                  disabled={ballot.status !== 'Active'}
                >
                  <Vote className="w-4 h-4 mr-2" />
                  Vote
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
      
      {ballots.length > 0 && (
        <div className="flex justify-center mt-4">
          <Button variant="outline" onClick={fetchBallots}>
            Refresh Ballots
          </Button>
        </div>
      )}
    </div>
  );
}
