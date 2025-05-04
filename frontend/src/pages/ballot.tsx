import { useState, useEffect } from "react";
import { ConnectButton, useCurrentAccount, useSuiClient } from "@mysten/dapp-kit";
import { useParams, useNavigate } from "react-router-dom";
import { AlertCircle, Clock, Vote, User, Shield, Info, Loader2 } from "lucide-react";

// Import UI components
import { Alert, AlertDescription, AlertTitle } from "../components/ui/alert";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Separator } from "../components/ui/separator";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";

interface Candidate {
  id: number;
  name: string;
  description: string;
  imageUrl?: string;
  votes: number;
}

interface BallotData {
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

export default function BallotPage() {
  const { ballotId } = useParams<{ ballotId: string }>();
  const navigate = useNavigate();
  const currentAccount = useCurrentAccount();
  const suiClient = useSuiClient();
  
  const [loading, setLoading] = useState(true);
  const [ballot, setBallot] = useState<BallotData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [isVoting, setIsVoting] = useState(false);
  const [showVoteDialog, setShowVoteDialog] = useState(false);

  // Fetch ballot data
  useEffect(() => {
    if (!ballotId) {
      setError("Ballot ID is required");
      setLoading(false);
      return;
    }

    const fetchBallot = async () => {
      try {
        setLoading(true);
        console.log("Fetching ballot with ID:", ballotId);
        
        const response = await suiClient.getObject({
          id: ballotId,
          options: {
            showContent: true
          }
        });

        if (!response?.data || !response.data.content) {
          throw new Error("Ballot not found or has no content");
        }

        if (response.data.content.dataType !== "moveObject") {
          throw new Error("Invalid ballot data format");
        }

        const fields = response.data.content.fields as any;
        console.log("Ballot fields:", fields);
        
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
        
        // Determine ballot status
        let status: 'Active' | 'Delisted' | 'Expired' = 'Active';
        const expiration = Number(fields.expiration || 0) * 1000; // Convert to milliseconds
        
        if (fields.status?.fields?.name === "Delisted") {
          status = 'Delisted';
        } else if (fields.status?.fields?.name === "Expired" || expiration < Date.now()) {
          status = 'Expired';
        }
        
        // Create ballot object
        const ballotData: BallotData = {
          id: response.data.objectId,
          title: fields.title || "Untitled Ballot",
          description: fields.description || "No description",
          expiration: Number(fields.expiration || 0),
          isPrivate: Boolean(fields.is_private),
          candidates: candidates,
          totalVotes: Number(fields.total_votes || 0),
          status,
          creator: fields.creator || ""
        };
        
        setBallot(ballotData);
        console.log("Processed ballot data:", ballotData);
      } catch (error) {
        console.error("Error fetching ballot:", error);
        setError("Failed to load ballot data");
      } finally {
        setLoading(false);
      }
    };

    if (currentAccount) {
      fetchBallot();
    } else {
      setLoading(false);
      setError("Please connect your wallet to view this ballot");
    }
  }, [ballotId, currentAccount, suiClient]);

  // Calculate time left if ballot has expiration
  useEffect(() => {
    if (!ballot?.expiration) return;
    
    const calculateTimeLeft = () => {
      const now = Math.floor(Date.now() / 1000);
      const diff = ballot.expiration - now;
      
      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }
      
      const days = Math.floor(diff / (60 * 60 * 24));
      const hours = Math.floor((diff % (60 * 60 * 24)) / (60 * 60));
      const minutes = Math.floor((diff % (60 * 60)) / 60);
      const seconds = Math.floor(diff % 60);
      
      setTimeLeft({ days, hours, minutes, seconds });
    };
    
    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);
    
    return () => clearInterval(timer);
  }, [ballot?.expiration]);

  const handleCandidateSelect = (candidate: Candidate) => {
    setSelectedCandidate(candidate);
  };

  const handleVoteClick = () => {
    setShowVoteDialog(true);
  };

  const submitVote = async () => {
    if (!selectedCandidate) {
      return;
    }

    setIsVoting(true);
    // Here you would implement the actual transaction to vote
    // This will be handled by your voting functionality
    
    // Simulating API call
    setTimeout(() => {
      setIsVoting(false);
      setShowVoteDialog(false);
      // Refresh ballot data after voting
      if (ballot) {
        setBallot({
          ...ballot,
          totalVotes: ballot.totalVotes + 1,
          candidates: ballot.candidates.map(c => 
            c.id === selectedCandidate.id 
              ? {...c, votes: c.votes + 1} 
              : c
          )
        });
      }
    }, 1500);
  };

  if (!currentAccount) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Ballot Details</h1>
          <ConnectButton />
        </div>
        
        <Alert>
          <AlertDescription>
            Please connect your wallet to view this ballot.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex flex-col md:flex-row justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Ballot Details</h1>
          {ballot && <p className="text-muted-foreground">{ballot.title}</p>}
        </div>
        
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            onClick={() => navigate("/ballots")}
          >
            Back to Ballots
          </Button>
          <ConnectButton />
        </div>
      </div>
      
      {loading ? (
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-center items-center h-40">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <span className="ml-2">Loading ballot data...</span>
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
              className="p-0 h-auto font-normal ml-1" 
              onClick={() => navigate("/ballots")}
            >
              View all ballots
            </Button>
          </AlertDescription>
        </Alert>
      ) : (
        <div className="space-y-6">
          {/* Ballot Info */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-2xl">{ballot.title}</CardTitle>
                  <CardDescription className="mt-2">{ballot.description}</CardDescription>
                </div>
                <div className="flex flex-col gap-1">
                  <Badge variant={ballot.isPrivate ? "secondary" : "outline"} className="ml-auto">
                    {ballot.isPrivate ? (
                      <>
                        <Shield className="w-3 h-3 mr-1" />
                        Private
                      </>
                    ) : (
                      "Public"
                    )}
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
              <div className="flex flex-wrap gap-6 mb-6">
                <div className="flex items-center">
                  <Clock className="w-5 h-5 mr-2 text-muted-foreground" />
                  <div>
                    <div className="text-sm text-muted-foreground">Ends on</div>
                    <div className="font-medium">
                      {new Date(ballot.expiration * 1000).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <div className="flex items-center">
                  <Vote className="w-5 h-5 mr-2 text-muted-foreground" />
                  <div>
                    <div className="text-sm text-muted-foreground">Total Votes</div>
                    <div className="font-medium">{ballot.totalVotes}</div>
                  </div>
                </div>
                <div className="flex items-center">
                  <User className="w-5 h-5 mr-2 text-muted-foreground" />
                  <div>
                    <div className="text-sm text-muted-foreground">Creator</div>
                    <div className="font-medium">
                      {ballot.creator === currentAccount.address ? "You" : 
                        `${ballot.creator.substring(0, 6)}...${ballot.creator.substring(ballot.creator.length - 4)}`
                      }
                    </div>
                  </div>
                </div>
              </div>

              {/* Expiration Timer */}
              {ballot.status === 'Active' && ballot.expiration > Math.floor(Date.now() / 1000) && (
                <div className="mb-6">
                  <h3 className="text-sm font-medium mb-2 flex items-center">
                    <Clock className="w-4 h-4 mr-2" />
                    Voting Ends In
                  </h3>
                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div className="bg-muted rounded-lg p-2">
                      <div className="text-xl font-bold">{timeLeft.days}</div>
                      <div className="text-xs text-muted-foreground">Days</div>
                    </div>
                    <div className="bg-muted rounded-lg p-2">
                      <div className="text-xl font-bold">{timeLeft.hours}</div>
                      <div className="text-xs text-muted-foreground">Hours</div>
                    </div>
                    <div className="bg-muted rounded-lg p-2">
                      <div className="text-xl font-bold">{timeLeft.minutes}</div>
                      <div className="text-xs text-muted-foreground">Minutes</div>
                    </div>
                    <div className="bg-muted rounded-lg p-2">
                      <div className="text-xl font-bold">{timeLeft.seconds}</div>
                      <div className="text-xs text-muted-foreground">Seconds</div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Status Messages */}
              {ballot.status !== 'Active' && (
                <Alert className="mb-6">
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    {ballot.status === 'Expired' 
                      ? "This ballot has expired and voting is no longer available." 
                      : "This ballot has been delisted and is no longer active."}
                  </AlertDescription>
                </Alert>
              )}
              
              {/* Candidates Section */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Candidates</h3>
                {ballot.candidates.length === 0 ? (
                  <div className="text-center p-8 border rounded-lg bg-muted/50">
                    <p className="text-muted-foreground">No candidates available for this ballot.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {ballot.candidates.map((candidate) => (
                      <div 
                        key={candidate.id}
                        className={`p-4 border rounded-lg cursor-pointer transition-all hover:border-primary ${
                          selectedCandidate?.id === candidate.id ? 'border-primary bg-primary/5' : ''
                        }`}
                        onClick={() => ballot.status === 'Active' && handleCandidateSelect(candidate)}
                      >
                        <div className="flex items-start">
                          {candidate.imageUrl && (
                            <div className="mr-4 flex-shrink-0">
                              <img 
                                src={candidate.imageUrl} 
                                alt={candidate.name} 
                                className="w-16 h-16 object-cover rounded-md"
                              />
                            </div>
                          )}
                          <div className="flex-grow">
                            <h4 className="font-medium">{candidate.name}</h4>
                            <p className="text-sm text-muted-foreground mt-1">{candidate.description}</p>
                            <div className="mt-2 flex items-center">
                              <div className="text-sm"><span className="font-medium">{candidate.votes}</span> votes</div>
                              {ballot.totalVotes > 0 && (
                                <div className="ml-2 text-xs text-muted-foreground">
                                  ({((candidate.votes / ballot.totalVotes) * 100).toFixed(1)}%)
                                </div>
                              )}
                            </div>
                          </div>
                          {ballot.status === 'Active' && (
                            <div className="ml-4 flex-shrink-0">
                              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                                selectedCandidate?.id === candidate.id ? 'border-primary' : 'border-muted'
                              }`}>
                                {selectedCandidate?.id === candidate.id && (
                                  <div className="w-3 h-3 rounded-full bg-primary" />
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
            {ballot.status === 'Active' && (
              <CardFooter className="flex justify-end">
                <Button 
                  onClick={handleVoteClick}
                  disabled={!selectedCandidate}
                >
                  Vote for Selected Candidate
                </Button>
              </CardFooter>
            )}
          </Card>
        </div>
      )}
      
      {/* Vote Confirmation Dialog */}
      <Dialog open={showVoteDialog} onOpenChange={setShowVoteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Your Vote</DialogTitle>
            <DialogDescription>
              You are about to vote for a candidate in "{ballot?.title}".
            </DialogDescription>
          </DialogHeader>
          
          {selectedCandidate && (
            <div className="p-4 border rounded-lg mt-2">
              <h3 className="font-semibold">{selectedCandidate.name}</h3>
              <p className="text-sm mt-1">{selectedCandidate.description}</p>
              {selectedCandidate.imageUrl && (
                <img 
                  src={selectedCandidate.imageUrl} 
                  alt={selectedCandidate.name} 
                  className="mt-2 max-h-32 object-cover rounded-md"
                />
              )}
            </div>
          )}
          
          <Alert className="mt-2">
            <AlertDescription className="text-sm">
              Once submitted, your vote cannot be changed or revoked.
            </AlertDescription>
          </Alert>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowVoteDialog(false)}
              disabled={isVoting}
            >
              Cancel
            </Button>
            <Button 
              onClick={submitVote}
              disabled={isVoting}
            >
              {isVoting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Vote"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
