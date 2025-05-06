import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ConnectButton, useCurrentAccount, useSuiClient } from "@mysten/dapp-kit";
import { useNetworkVariable } from "../config/networkConfig";
import { AlertCircle, Clock } from "lucide-react";
import ManageCandidates from "../components/ballot/ManageCandidates";

// Import UI components
import { Alert, AlertDescription, AlertTitle } from "../components/ui/alert";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";

interface BallotDetails {
  id: string;
  title: string;
  description: string;
  expiration: number;
  isPrivate: boolean;
  candidates: {
    id: string;
    name: string;
    description: string;
    imageUrl?: string;
    votes: number;
  }[];
  creator: string;
}

export default function ManageBallotPage() {
  const { ballotId } = useParams<{ ballotId: string }>();
  const navigate = useNavigate();
  const currentAccount = useCurrentAccount();
  const suiClient = useSuiClient();
  const packageId = useNetworkVariable("packageId");
  
  const [loading, setLoading] = useState(true);
  const [ballot, setBallot] = useState<BallotDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("details");

  // Mock admin capabilities - replace with actual data in production
  const adminCapId = "0x123"; // Replace with actual admin cap ID
  const superAdminCapId = undefined; // Replace with actual super admin cap ID
  const hasSuperAdminCap = false; // Replace with actual check

  useEffect(() => {
    if (!ballotId) {
      setError("Ballot ID is required");
      setLoading(false);
      return;
    }

    const fetchBallotDetails = async () => {
      try {
        // In a real implementation, you would query the blockchain for ballot details
        // For example, using suiClient.getObject
        
        // For now, we'll simulate fetching ballot details with a timeout
        setTimeout(() => {
          // This is mock data - in production, replace with actual blockchain queries
          const mockBallot: BallotDetails = {
            id: ballotId,
            title: "Community Treasury Allocation",
            description: "Vote on how to allocate the community treasury funds for Q2 2025",
            expiration: Math.floor(Date.now()) + 86400 * 3 * 1000, // 3 days from now
            isPrivate: false,
            candidates: [
              {
                id: "0x1",
                name: "Proposal A: Developer Grants",
                description: "Allocate 60% to developer grants to improve ecosystem growth",
                votes: 45
              },
              {
                id: "0x2",
                name: "Proposal B: Marketing",
                description: "Allocate 40% to marketing efforts to increase adoption",
                votes: 32
              }
            ],
            creator: currentAccount?.address || ""
          };
          
          setBallot(mockBallot);
          setLoading(false);
        }, 1000);
        
        // TODO: Replace with actual blockchain query
        // Example of how you might query the blockchain:
        /*
        const response = await suiClient.getObject({
          id: ballotId,
          options: { showContent: true, showOwner: true }
        });
        
        if (response.data?.content) {
          const content = response.data.content;
          // Parse ballot data from the object
          const ballotDetails = {
            id: ballotId,
            title: content.fields.title,
            description: content.fields.description,
            // ... other fields
          };
          
          setBallot(ballotDetails);
        } else {
          setError("Ballot not found or you don't have permission to view it");
        }
        */
        
      } catch (err) {
        console.error("Error fetching ballot details:", err);
        setError("Failed to load ballot details. Please try again later.");
        setLoading(false);
      }
    };

    fetchBallotDetails();
  }, [ballotId, currentAccount]);

  const handleCandidatesAdded = () => {
    // Refresh ballot data after candidates are added
    setLoading(true);
    // In a real implementation, you would re-fetch the ballot details
    setTimeout(() => {
      if (ballot) {
        // Add a mock new candidate to simulate update
        const updatedBallot = {
          ...ballot,
          candidates: [
            ...ballot.candidates,
            {
              id: `0x${Math.floor(Math.random() * 1000)}`,
              name: "New Candidate",
              description: "This candidate was just added",
              votes: 0
            }
          ]
        };
        setBallot(updatedBallot);
      }
      setLoading(false);
      setActiveTab("details");
    }, 1000);
  };

  if (!currentAccount) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Manage Ballot</h1>
          <ConnectButton />
        </div>
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Not connected</AlertTitle>
          <AlertDescription>
            Please connect your wallet to manage this ballot.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-8">
        <div>
          <Button 
            variant="ghost" 
            onClick={() => navigate("/ballots")}
            className="mb-2"
          >
            ← Back to Ballots
          </Button>
          <h1 className="text-3xl font-bold">Manage Ballot</h1>
        </div>
        <ConnectButton />
      </div>
      
      {loading ? (
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-center items-center h-40">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          </CardContent>
        </Card>
      ) : error ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : !ballot ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Ballot Not Found</AlertTitle>
          <AlertDescription>
            The ballot you're looking for could not be found.
            <Button 
              variant="link" 
              className="p-0 h-auto font-normal" 
              onClick={() => navigate("/ballots")}
            >
              View all ballots
            </Button>
          </AlertDescription>
        </Alert>
      ) : (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{ballot.title}</CardTitle>
              <CardDescription>{ballot.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4 text-sm mb-4">
                <div className="flex items-center">
                  <Clock className="w-4 h-4 mr-1" />
                  <span>
                    Expires on {new Date(ballot.expiration).toLocaleDateString()} at {new Date(ballot.expiration).toLocaleTimeString()}
                  </span>
                </div>
                <div>
                  <span className="font-medium">{ballot.candidates.length}</span> candidates
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="details">
                Ballot Details
              </TabsTrigger>
              <TabsTrigger value="candidates">
                Manage Candidates
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="details" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Current Candidates</CardTitle>
                  <CardDescription>
                    {ballot.candidates.length === 0 
                      ? "No candidates have been added yet" 
                      : "The following candidates are currently in this ballot"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {ballot.candidates.length === 0 ? (
                    <div className="text-center p-4">
                      <p className="mb-4">Add candidates to enable voting on this ballot</p>
                      <Button onClick={() => setActiveTab("candidates")}>
                        Add Candidates
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {ballot.candidates.map((candidate, index) => (
                        <div key={candidate.id} className="p-4 border rounded-md">
                          <div className="font-medium">Candidate {index + 1}: {candidate.name}</div>
                          <p className="text-muted-foreground mt-1">{candidate.description}</p>
                          {candidate.imageUrl && (
                            <div className="mt-2">
                              <img 
                                src={candidate.imageUrl} 
                                alt={candidate.name}
                                className="h-24 w-auto object-cover rounded-md" 
                              />
                            </div>
                          )}
                        </div>
                      ))}
                      
                      <div className="flex justify-end mt-4">
                        <Button onClick={() => setActiveTab("candidates")}>
                          Add More Candidates
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="candidates" className="mt-6">
              <ManageCandidates
                ballotId={ballotId || ""}
                adminCapId={adminCapId}
                superAdminCapId={superAdminCapId}
                hasSuperAdminCap={hasSuperAdminCap}
                onComplete={handleCandidatesAdded}
              />
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
}
