import { useState, useEffect } from "react";
import { ConnectButton, useCurrentAccount, useSuiClient, useSignAndExecuteTransaction } from "@mysten/dapp-kit";
import { useParams, useNavigate } from "react-router-dom";
import { AlertCircle, Clock, Vote, User, Shield, Info, Loader2 } from "lucide-react";
import { useNetworkVariable } from "../config/networkConfig";
import { toast } from "react-toastify";
import { Transaction } from "@mysten/sui/transactions";
import { SuiTransactionBlockResponse } from "@mysten/sui/client";
import { SUI_CLOCK_OBJECT_ID } from "@mysten/sui/utils";
import { formatDate, normalizeTimestamp, formatRelativeTime, formatTimeLeft } from "../utils/formatUtils";

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
  hasVoted?: boolean;
  votedFor?: number;
}

export default function BallotPage() {
  const { ballotId } = useParams<{ ballotId: string }>();
  const navigate = useNavigate();
  const currentAccount = useCurrentAccount();
  const suiClient = useSuiClient();
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();
  
  // Get network variables at component level
  const packageId = useNetworkVariable("packageId" as any);
  const dashboardId = useNetworkVariable("dashboardId" as any);
  
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
  
  // Add additional state for debugging
  const [blockchainTime, setBlockchainTime] = useState<number | null>(null);
  const [isCheckingExpiration, setIsCheckingExpiration] = useState(false);

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
          console.log("Raw candidates data:", fields.candidates);
          
          if (Array.isArray(fields.candidates)) {
            candidatesData = fields.candidates;
          } else if (fields.candidates.vec && Array.isArray(fields.candidates.vec)) {
            candidatesData = fields.candidates.vec;
          } else if (fields.candidates.fields && fields.candidates.fields.contents) {
            // Handle case where candidates are in a vector wrapper type
            candidatesData = fields.candidates.fields.contents;
          }
          
          console.log("Parsed candidatesData:", candidatesData);
        }
        
        // Parse candidates
        const candidates: Candidate[] = [];
        for (let i = 0; i < candidatesData.length; i++) {
          const candidate = candidatesData[i];
          
          if (!candidate) {
            console.log(`Skipping undefined candidate at index ${i}`);
            continue;
          }
          
          console.log(`Processing candidate ${i}:`, candidate);
          
          // Extract fields based on different possible structures
          let candidateFields = candidate;
          if (candidate.fields) {
            candidateFields = candidate.fields;
          }
          
          // Extract id with fallback to index
          const candidateId = Number(candidateFields.id || i);
          
          // Extract name
          let candidateName = candidateFields.name || `Candidate ${i+1}`;
          // If name is an object with fields (Option<String>), extract it
          if (typeof candidateName === 'object' && candidateName?.fields?.some) {
            candidateName = candidateName.fields.some;
          }
          
          // Extract description
          let candidateDescription = candidateFields.description || "No description available";
          // If description is an object with fields (Option<String>), extract it
          if (typeof candidateDescription === 'object' && candidateDescription?.fields?.some) {
            candidateDescription = candidateDescription.fields.some;
          }
          
          // Extract votes with fallback to 0
          const candidateVotes = Number(candidateFields.vote_count || candidateFields.votes || 0);
          
          // Extract image URL which might be in different formats
          let imageUrl = undefined;
          if (candidateFields.image_url) {
            if (typeof candidateFields.image_url === 'string') {
              imageUrl = candidateFields.image_url;
            } else if (candidateFields.image_url.some) {
              // Handle Option<String> from Sui Move
              imageUrl = candidateFields.image_url.some;
            } else if (candidateFields.image_url.fields && candidateFields.image_url.fields.some) {
              imageUrl = candidateFields.image_url.fields.some;
            }
          }
          
          const candidateObj = {
            id: candidateId,
            name: candidateName,
            description: candidateDescription,
            votes: candidateVotes,
            imageUrl: imageUrl
          };
          
          console.log(`Processed candidate object:`, candidateObj);
          candidates.push(candidateObj);
        }
        
        // Parse expiration timestamp directly - no need to modify
        const expiration = Number(fields.expiration || 0);
        // Validate and normalize the timestamp
        const normalizedExpiration = normalizeTimestamp(expiration) || expiration;
        console.log("Ballot expiration from blockchain (normalized):", normalizedExpiration);
        
        // Determine ballot status
        let status: 'Active' | 'Delisted' | 'Expired' = 'Active';
        
        if (fields.status?.fields?.name === "Delisted") {
          status = 'Delisted';
        } else if (fields.status?.fields?.name === "Expired" || normalizedExpiration < Date.now()) {
          status = 'Expired';
        }
        
        // Create ballot object
        const ballotData: BallotData = {
          id: response.data.objectId,
          title: fields.title || "Untitled Ballot",
          description: fields.description || "No description",
          expiration: normalizedExpiration,
          isPrivate: Boolean(fields.is_private),
          candidates: candidates,
          totalVotes: Number(fields.total_votes || 0),
          status,
          creator: fields.creator || "",
          hasVoted: false, // Default value
          votedFor: undefined
        };
        
        // Check if current user has voted
        if (currentAccount && fields.voters && fields.voters.fields && fields.voters.fields.contents) {
          try {
            const votersTable = fields.voters.fields.contents;
            console.log("Voters table:", votersTable);
            
            // Find if current user is in the voters list
            for (const voter of votersTable) {
              if (voter && voter.fields) {
                const voterAddress = voter.fields.key;
                if (voterAddress && voterAddress.toLowerCase() === currentAccount.address.toLowerCase()) {
                  ballotData.hasVoted = true;
                  // The value should be the candidate ID the user voted for
                  ballotData.votedFor = Number(voter.fields.value);
                  console.log("User has already voted for candidate:", ballotData.votedFor);
                  break;
                }
              }
            }
          } catch (err) {
            console.error("Error checking voter status:", err);
          }
        }
        
        setBallot(ballotData);
        console.log("Processed ballot data:", ballotData);
        
        // If user has already voted, select that candidate
        if (ballotData.hasVoted && ballotData.votedFor !== undefined) {
          const votedCandidate = ballotData.candidates.find(c => c.id === ballotData.votedFor);
          if (votedCandidate) {
            setSelectedCandidate(votedCandidate);
          }
        }
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
      const now = Date.now();
      const diff = ballot.expiration - now;
      
      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        
        // Auto-update ballot status if it's expired but still marked as Active
        if (ballot.status === 'Active') {
          setBallot({
            ...ballot,
            status: 'Expired'
          });
        }
        
        return;
      }
      
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      
      setTimeLeft({ days, hours, minutes, seconds });
    };
    
    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);
    
    return () => clearInterval(timer);
  }, [ballot?.expiration, ballot?.status]);

  // Fetch blockchain time
  useEffect(() => {
    const fetchBlockchainTime = async () => {
      if (!suiClient) return;
      
      try {
        // Get the clock object to determine blockchain time
        const clockResponse = await suiClient.getObject({
          id: SUI_CLOCK_OBJECT_ID,
          options: {
            showContent: true
          }
        });
        
        if (clockResponse?.data?.content?.dataType === 'moveObject') {
          const clockFields = clockResponse.data.content.fields as any;
          const timestamp_ms = Number(clockFields.timestamp_ms || 0);
          setBlockchainTime(timestamp_ms); // Keep as milliseconds to match ballot expiration
          console.log("Blockchain time (milliseconds):", timestamp_ms);
          console.log("Local time (milliseconds):", Date.now());
          console.log("Time difference (milliseconds):", timestamp_ms - Date.now());
        }
      } catch (err) {
        console.error("Error fetching blockchain time:", err);
      }
    };
    
    fetchBlockchainTime();
    // Refresh every minute
    const timer = setInterval(fetchBlockchainTime, 60000);
    return () => clearInterval(timer);
  }, [suiClient]);

  // Function to directly check ballot expiration via the contract
  const checkBallotExpiration = async () => {
    if (!ballot || !suiClient || !currentAccount) return;
    
    setIsCheckingExpiration(true);
    try {
      // Create a dev inspect transaction to call the is_expired function
      const tx = new Transaction();
      
      tx.moveCall({
        target: `${packageId}::ballot::is_expired`,
        arguments: [
          tx.object(ballot.id),
          tx.object(SUI_CLOCK_OBJECT_ID),
        ],
      });
      
      // Execute in dev inspect mode which doesn't change state but returns the result
      const result = await suiClient.devInspectTransactionBlock({
        transactionBlock: tx.serialize(),
        sender: currentAccount.address,
      });
      
      if (result.results && result.results[0] && result.results[0].returnValues) {
        const returnValue = result.results[0].returnValues[0];
        console.log("Raw return value:", returnValue);
        
        // Check for boolean values in various formats by converting to string first
        let isExpired = false;
        if (typeof returnValue === 'string') {
          isExpired = returnValue === '1' || returnValue === 'true';
        } else if (typeof returnValue === 'boolean') {
          isExpired = returnValue;
        } else if (typeof returnValue === 'object' && returnValue !== null) {
          // Sometimes the value might be in a specific format, log it for debugging
          console.log("Return value is an object:", returnValue);
          // Try to convert to JSON string and check if it contains true
          const jsonStr = JSON.stringify(returnValue);
          isExpired = jsonStr.includes('true') || jsonStr.includes('1');
        }
        
        console.log("Contract reports ballot is expired:", isExpired);
        toast.info(`The blockchain reports that this ballot is ${isExpired ? 'expired' : 'not expired'}`);
        
        // If the contract says it's expired but our UI doesn't think so, update the UI
        if (isExpired && ballot.status === 'Active') {
          setBallot({
            ...ballot,
            status: 'Expired'
          });
          toast.warning("The ballot status has been updated to Expired based on the blockchain state");
        }
      } else {
        console.log("Could not determine expiration status from contract");
      }
    } catch (err) {
      console.error("Error checking ballot expiration:", err);
      toast.error("Failed to check ballot expiration status");
    } finally {
      setIsCheckingExpiration(false);
    }
  };

  // Add detailed logging when ballot data is loaded
  useEffect(() => {
    if (ballot) {
      console.log("Ballot data loaded:", ballot);
      console.log("Number of candidates:", ballot.candidates.length);
      console.log("Candidates:", ballot.candidates.map(c => ({ id: c.id, name: c.name })));
      
      // Log important time-related information
      const now = Date.now();
      console.log("Ballot expiration timestamp:", ballot.expiration);
      console.log("Current local time (milliseconds):", now);
      console.log("Blockchain time (if available):", blockchainTime);
      console.log("Difference to expiration (local time):", ballot.expiration - now, "milliseconds");
      console.log("Human-readable expiration time:", new Date(ballot.expiration).toLocaleString());
      console.log("Relative time to expiration:", formatRelativeTime(ballot.expiration));
      
      if (blockchainTime) {
        console.log("Difference to expiration (blockchain time):", ballot.expiration - blockchainTime, "milliseconds");
      }
      console.log("Ballot is expired according to local time:", ballot.expiration <= now);
      if (blockchainTime) {
        console.log("Ballot is expired according to blockchain time:", ballot.expiration <= blockchainTime);
      }
      
      // Check the expiration directly with the contract
      checkBallotExpiration();
    }
  }, [ballot, blockchainTime]);

  useEffect(() => {
    console.log("Selected candidate changed:", selectedCandidate);
  }, [selectedCandidate]);

  const handleCandidateSelect = (candidate: Candidate) => {
    console.log("Selecting candidate:", candidate.id, candidate.name);
    if (selectedCandidate && selectedCandidate.id === candidate.id) {
      setSelectedCandidate(null);
    } else {
      setSelectedCandidate({...candidate});
    }
  };

  const handleVoteClick = () => {
    // Check if ballot is expired based on current time
    const now = Date.now();
    const isExpired = ballot?.expiration && ballot.expiration <= now;
    
    if (isExpired || ballot?.status === 'Expired') {
      toast.error("This ballot has expired and is no longer accepting votes");
      return;
    }
    
    if (ballot?.hasVoted) {
      toast.error("You have already voted on this ballot");
      return;
    }
    
    if (!selectedCandidate) {
      console.error("No candidate selected");
      toast.error("Please select a candidate first");
      return;
    }
    
    console.log("Opening vote dialog for candidate:", selectedCandidate);
    setShowVoteDialog(true);
  };

  const submitVote = async () => {
    if (!selectedCandidate || !currentAccount || !ballot) {
      return;
    }

    // Check if ballot is expired based on current time
    const now = Date.now();
    const isExpired = ballot.expiration <= now || ballot.status === 'Expired';
    
    if (isExpired) {
      toast.error("This ballot has expired and is no longer accepting votes");
      setShowVoteDialog(false);
      return;
    }

    // First, explicitly check expiration with the contract
    setIsVoting(true);
    try {
      const tx = new Transaction();
      
      tx.moveCall({
        target: `${packageId}::ballot::is_expired`,
        arguments: [
          tx.object(ballot.id),
          tx.object(SUI_CLOCK_OBJECT_ID),
        ],
      });
      
      const result = await suiClient.devInspectTransactionBlock({
        transactionBlock: tx.serialize(),
        sender: currentAccount.address,
      });
      
      let isExpired = false;
      if (result.results && result.results[0] && result.results[0].returnValues) {
        const returnValue = result.results[0].returnValues[0];
        
        // Check for boolean values in various formats
        if (typeof returnValue === 'string') {
          isExpired = returnValue === '1' || returnValue === 'true';
        } else if (typeof returnValue === 'boolean') {
          isExpired = returnValue;
        } else if (typeof returnValue === 'object' && returnValue !== null) {
          const jsonStr = JSON.stringify(returnValue);
          isExpired = jsonStr.includes('true') || jsonStr.includes('1');
        }
      }
      
      if (isExpired) {
        console.log("Ballot is reported as expired by the contract");
        toast.error("The blockchain reports that this ballot is expired and cannot accept votes");
        setIsVoting(false);
        setShowVoteDialog(false);
        
        // Update UI if needed
        if (ballot.status === 'Active') {
          setBallot({
            ...ballot,
            status: 'Expired'
          });
        }
        return;
      }
    } catch (err) {
      console.error("Error checking expiration before voting:", err);
      // Continue anyway, as the vote transaction will fail properly if expired
    }

    // Check if user has already voted
    if (ballot.hasVoted) {
      toast.error("You have already voted on this ballot");
      setShowVoteDialog(false);
      setIsVoting(false);
      return;
    }

    try {
      // Add enhanced debugging logs
      console.log("Vote details:", {
        ballotId: ballot.id,
        dashboardId,
        candidateId: selectedCandidate.id,
        candidateIdType: typeof selectedCandidate.id,
        voterAddress: currentAccount.address,
        clockId: SUI_CLOCK_OBJECT_ID,
        packageId,
        blockchainTime: blockchainTime ? new Date(blockchainTime).toLocaleString() : 'unknown',
        ballotExpiration: new Date(ballot.expiration).toLocaleString(),
        localTime: new Date().toLocaleString()
      });
      
      // Create a transaction to vote for the candidate
      const tx = new Transaction();
      
      tx.moveCall({
        target: `${packageId}::ballot::vote_for_candidate`,
        arguments: [
          tx.object(ballot.id),
          tx.object(dashboardId),
          tx.pure.u64(Number(selectedCandidate.id)), // Ensure it's a number
          tx.object(SUI_CLOCK_OBJECT_ID)
        ],
      });
      
      console.log("Transaction built for voting");
      
      try {
        signAndExecute(
          {
            transaction: tx.serialize(),
          },
          {
            onSuccess: async ({ digest }: { digest: string }) => {
              console.log("Vote transaction successful with digest:", digest);
              toast.success("Your vote has been recorded successfully!");
              
              // Wait for transaction to be confirmed
              await suiClient.waitForTransaction({
                digest,
                options: {
                  showEffects: true
                }
              });
              
              // Close dialog and refresh
              setShowVoteDialog(false);
              setIsVoting(false);
              
              // Update ballot to show user has voted
              setBallot({
                ...ballot,
                hasVoted: true,
                votedFor: selectedCandidate.id,
                totalVotes: ballot.totalVotes + 1
              });
              
              // Also update the candidate vote count
              const updatedCandidates = ballot.candidates.map(c => {
                if (c.id === selectedCandidate.id) {
                  return {...c, votes: c.votes + 1};
                }
                return c;
              });
              
              setBallot(prev => ({
                ...prev!,
                candidates: updatedCandidates
              }));
              
              toast.success("Ballot data updated with your vote!");
            },
            onError: (error: Error) => {
              console.error("Error processing vote:", error);
              
              // Get detailed error message
              const errorMsg = error.toString().toLowerCase();
              console.log("Full error message:", error);
              
              // Extract Move abort code and location if possible
              const moveAbortMatch = errorMsg.match(/moveabort\(movelocation\s*{[^}]*},\s*(\d+)\)/i);
              const errorCode = moveAbortMatch ? moveAbortMatch[1] : "unknown";
              
              if (errorMsg.includes("ballot expired") || errorMsg.includes("eballotexpired") || errorCode === "2") {
                toast.error("This ballot has expired according to the blockchain. The local expiration time may be incorrect.");
                // Update UI
                if (ballot.status === 'Active') {
                  setBallot({
                    ...ballot,
                    status: 'Expired'
                  });
                }
              } else if (errorMsg.includes("not registered") || errorMsg.includes("enotregisteredvoter") || errorCode === "5") {
                toast.error("You are not registered to vote on this private ballot.");
              } else if (errorMsg.includes("duplicate vote") || errorMsg.includes("eduplicatevote") || errorCode === "0") {
                toast.error("You have already voted on this ballot.");
                // Update UI to reflect the vote
                setBallot({
                  ...ballot,
                  hasVoted: true
                });
              } else if (errorMsg.includes("candidate not found") || errorMsg.includes("ecandidatenotfound") || errorCode === "3") {
                toast.error("The candidate you selected was not found on the ballot.");
              } else if (errorMsg.includes("ballot delisted") || errorMsg.includes("eballotdelisted") || errorCode === "1") {
                toast.error("This ballot has been delisted and is no longer accepting votes.");
                // Update UI
                if (ballot.status === 'Active') {
                  setBallot({
                    ...ballot,
                    status: 'Delisted'
                  });
                }
              } else {
                toast.error(`Failed to cast your vote: ${error.message || 'Unknown error'} (Code: ${errorCode})`);
              }
              
              setIsVoting(false);
            },
          }
        );
      } catch (txError) {
        console.error("Error processing request:", txError);
        setError(`Failed to process your vote request: ${(txError as Error).message || 'Unknown error'}`);
        toast.error(`Failed to process your vote request: ${(txError as Error).message || 'Unknown error'}`);
        setIsVoting(false);
      }
      
    } catch (error) {
      console.error("Error in vote function:", error);
      setError(`Failed to cast your vote: ${(error as Error).message || 'Unknown error'}`);
      toast.error(`Failed to cast your vote: ${(error as Error).message || 'Unknown error'}`);
      setIsVoting(false);
    }
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
          {/* Expiration Banner */}
          {(ballot.status === 'Expired' || Date.now() > ballot.expiration) && (
            <Alert variant="destructive" className="bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800">
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
              <AlertTitle className="text-red-700 dark:text-red-300 text-lg">Ballot Expired</AlertTitle>
              <AlertDescription className="text-red-600 dark:text-red-400">
                This ballot has expired on {new Date(ballot.expiration).toLocaleString()} and is no longer accepting votes.
              </AlertDescription>
            </Alert>
          )}
          
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
                      {new Date(ballot.expiration).toLocaleDateString()}
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
              {ballot.status === 'Active' && ballot.expiration > Date.now() && (
                <div className="mb-6">
                  <h3 className="text-sm font-medium mb-2 flex items-center">
                    <Clock className="w-4 h-4 mr-2" />
                    Voting Ends In: {formatTimeLeft(ballot.expiration)}
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
                {!ballot.candidates || ballot.candidates.length === 0 ? (
                  <div className="text-center p-8 border rounded-lg bg-muted/50">
                    <p className="text-muted-foreground">No candidates available for this ballot.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {ballot.candidates.map((candidate) => {
                      // Use a strict equality check to ensure selection works
                      const isSelected = selectedCandidate ? Number(selectedCandidate.id) === Number(candidate.id) : false; 
                      
                      return (
                        <div 
                          key={`candidate-${candidate.id}`}
                          className={`p-4 border ${isSelected ? 'border-primary-600 border-2' : 'border-gray-200'} rounded-lg cursor-pointer transition-all hover:border-primary ${
                            isSelected ? 'bg-primary/10 shadow-sm' : ''
                          }`}
                          onClick={() => {
                            if (ballot.status === 'Active') {
                              console.log('Click on candidate:', candidate.id, candidate.name);
                              handleCandidateSelect(candidate);
                            }
                          }}
                        >
                          <div className="flex items-start">
                            {candidate.imageUrl && (
                              <div className="mr-4 flex-shrink-0">
                                <img 
                                  src={candidate.imageUrl} 
                                  alt={candidate.name} 
                                  className={`w-16 h-16 object-cover rounded-md ${isSelected ? 'ring-2 ring-primary' : ''}`}
                                />
                              </div>
                            )}
                            <div className="flex-grow">
                              <h4 className="font-medium text-lg">{candidate.name || "Unnamed Candidate"}</h4>
                              <p className="text-sm text-muted-foreground mt-1">{candidate.description || "No description available"}</p>
                              {ballot.status !== 'Active' && (
                                <div className="mt-2 flex items-center">
                                  <div className="text-sm"><span className="font-medium">{candidate.votes}</span> votes</div>
                                  {ballot.totalVotes > 0 && (
                                    <div className="ml-2 text-xs text-muted-foreground">
                                      ({((candidate.votes / ballot.totalVotes) * 100).toFixed(1)}%)
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                            <div className="ml-4 flex-shrink-0">
                              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                                isSelected ? 'border-primary bg-primary/20' : 'border-muted'
                              }`}>
                                {isSelected && (
                                  <div className="w-3 h-3 rounded-full bg-primary" />
                                )}
                              </div>
                            </div>
                          </div>
                          {isSelected && (
                            <div className="mt-2 text-sm text-primary font-medium flex items-center">
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                                <polyline points="20 6 9 17 4 12"></polyline>
                              </svg>
                              Selected
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Expiration checker button */}
              <div className="mt-4 flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={checkBallotExpiration}
                  disabled={isCheckingExpiration || !ballot}
                >
                  {isCheckingExpiration ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Checking...
                    </>
                  ) : (
                    <>
                      <Clock className="mr-2 h-4 w-4" />
                      Check Expiration Status
                    </>
                  )}
                </Button>
                {blockchainTime && (
                  <div className="text-xs text-muted-foreground">
                    Blockchain time: {new Date(blockchainTime).toLocaleString()}
                  </div>
                )}
              </div>
            </CardContent>
            {ballot.status === 'Active' && (
              <CardFooter className="flex justify-end">
                {Date.now() > ballot.expiration ? (
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-yellow-600 bg-yellow-50 border-yellow-200">
                      <Clock className="w-3 h-3 mr-1" />
                      Expired
                    </Badge>
                    <Button variant="outline" disabled>
                      Voting Period Ended
                    </Button>
                  </div>
                ) : ballot.hasVoted ? (
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-green-600 bg-green-50 border-green-200">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                      You've voted
                    </Badge>
                    <Button variant="outline" disabled>
                      Already Voted
                    </Button>
                  </div>
                ) : (
                  <Button 
                    onClick={handleVoteClick}
                    disabled={!selectedCandidate}
                  >
                    Vote for Selected Candidate
                  </Button>
                )}
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
              {ballot && Date.now() > ballot.expiration && (
                <Alert variant="destructive" className="mt-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Ballot Expired</AlertTitle>
                  <AlertDescription>
                    This ballot has expired and is no longer accepting votes.
                  </AlertDescription>
                </Alert>
              )}
            </DialogDescription>
          </DialogHeader>
          
          {selectedCandidate ? (
            <div className="p-6 border rounded-lg mt-4 bg-primary/5">
              <div className="flex items-start">
                {selectedCandidate.imageUrl && (
                  <div className="mr-4 flex-shrink-0">
                    <img 
                      src={selectedCandidate.imageUrl} 
                      alt={selectedCandidate.name} 
                      className="w-20 h-20 object-cover rounded-md border-2 border-primary"
                    />
                  </div>
                )}
                <div>
                  <h3 className="font-semibold text-xl">{selectedCandidate.name || "Unnamed Candidate"}</h3>
                  <p className="text-sm mt-2">{selectedCandidate.description || "No description available"}</p>
                  {ballot && ballot.status !== 'Active' && (
                    <div className="mt-3 text-sm font-medium">
                      Current Votes: <span className="text-primary">{selectedCandidate.votes}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <Alert variant="destructive" className="mt-2">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No candidate selected. Please close this dialog and select a candidate.
              </AlertDescription>
            </Alert>
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
              disabled={isVoting || !selectedCandidate}
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
