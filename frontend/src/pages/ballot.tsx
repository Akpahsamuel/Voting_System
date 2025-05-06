import { useState, useEffect } from "react";
import { ConnectButton, useCurrentAccount, useSuiClient, useSignAndExecuteTransaction } from "@mysten/dapp-kit";
import { useParams, useNavigate } from "react-router-dom";
import { AlertCircle, Clock, Vote, User, Shield, Info, Loader2, CheckCircle2, ChevronLeft } from "lucide-react";
import { useNetworkVariable } from "../config/networkConfig";
import { toast } from "react-toastify";
import { Transaction } from "@mysten/sui/transactions";
import { SuiTransactionBlockResponse } from "@mysten/sui/client";
import { SUI_CLOCK_OBJECT_ID } from "@mysten/sui/utils";
import { formatDate, normalizeTimestamp, formatRelativeTime, formatTimeLeft } from "../utils/formatUtils";
import FeatureGuard from "../components/FeatureGuard";

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

const BallotDetailPage = () => {
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
  const [showConnectDialog, setShowConnectDialog] = useState(false);
  
  // Add additional state for debugging
  const [blockchainTime, setBlockchainTime] = useState<number | null>(null);
  const [isCheckingExpiration, setIsCheckingExpiration] = useState(false);

  // Fetch ballot data when component loads or when account changes
  useEffect(() => {
    const fetchBallot = async () => {
      if (!ballotId) {
        setError("Ballot ID is required");
        setLoading(false);
        return;
      }

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

    fetchBallot();
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
    // Only allow selection if user is connected and ballot is active
    if (ballot?.status === 'Active') {
      setSelectedCandidate(candidate);
    }
  };

  const handleVoteClick = () => {
    if (!currentAccount) {
      setShowConnectDialog(true);
      return;
    }
    
    if (selectedCandidate) {
      setShowVoteDialog(true);
    } else {
      toast.warning("Please select a candidate first");
    }
  };

  const submitVote = async () => {
    console.log("Submit vote called with selectedCandidate:", selectedCandidate);
    console.log("Current account:", currentAccount);
    console.log("Ballot data:", ballot);
    
    if (!selectedCandidate || !currentAccount || !ballot) {
      console.error("Missing required data for voting:", { 
        hasCandidate: !!selectedCandidate, 
        hasAccount: !!currentAccount, 
        hasBallot: !!ballot 
      });
      toast.error("Missing required data for voting");
      setIsVoting(false);
      return;
    }

    // Check if ballot is expired based on current time
    const now = Date.now();
    const isExpired = ballot.expiration <= now || ballot.status === 'Expired';
    
    if (isExpired) {
      toast.error("This ballot has expired and is no longer accepting votes");
      setShowVoteDialog(false);
      setIsVoting(false);
      return;
    }

    // First, explicitly check expiration with the contract
    setIsVoting(true);
    toast.info("Checking ballot status on the blockchain...");
    try {
      console.log("Creating transaction to check ballot expiration");
      console.log("Package ID:", packageId);
      console.log("Ballot ID:", ballot.id);
      console.log("Clock Object ID:", SUI_CLOCK_OBJECT_ID);
      
      const tx = new Transaction();
      
      // Ensure we set the sender
      tx.setSender(currentAccount.address);
      
      tx.moveCall({
        target: `${packageId}::ballot::is_expired`,
        arguments: [
          tx.object(ballot.id),
          tx.object(SUI_CLOCK_OBJECT_ID),
        ],
      });
      
      console.log("Calling devInspectTransactionBlock");
      
      // Properly serialize the transaction
      const serialized = tx.serialize();
      console.log("Serialized transaction for inspection:", serialized);
      
      const result = await suiClient.devInspectTransactionBlock({
        transactionBlock: serialized,
        sender: currentAccount.address,
      });
      
      console.log("devInspectTransactionBlock result:", result);
      
      let isExpired = false;
      if (result.results && result.results[0] && result.results[0].returnValues) {
        const returnValue = result.results[0].returnValues[0];
        console.log("Raw ballot expiration check return value:", returnValue);
        
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
      
      console.log("Ballot expired according to contract:", isExpired);
      
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
      
      toast.info("Ballot is active and ready for voting");
    } catch (err) {
      console.error("Error checking expiration before voting:", err);
      // Don't halt on expiration check failure, continue with vote attempt
      console.log("Continuing with vote despite expiration check failure");
      toast.warning("Could not verify ballot status, but will attempt to process your vote anyway");
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
      toast.info("Preparing vote transaction...");
      console.log("Creating transaction to vote for candidate");
      const tx = new Transaction();
      
      // Ensure candidate ID is a number
      const candidateId = Number(selectedCandidate.id);
      console.log("Normalized candidate ID:", candidateId, "type:", typeof candidateId);
      
      // Make sure the sender is properly set
      tx.setSender(currentAccount.address);
      
      tx.moveCall({
        target: `${packageId}::ballot::vote_for_candidate`,
        arguments: [
          tx.object(ballot.id),
          tx.object(dashboardId),
          tx.pure.u64(candidateId),
          tx.object(SUI_CLOCK_OBJECT_ID)
        ],
      });
      
      const serialized = tx.serialize();
      console.log("Transaction built for voting:", tx);
      console.log("Serialized transaction:", serialized);
      
      try {
        // Set a timeout to ensure we don't get stuck in loading state
        toast.info("Requesting wallet signature...");
        const timeoutId = setTimeout(() => {
          if (isVoting) {
            setIsVoting(false);
            toast.error("Vote request timed out. Please check your network connection and try again.");
            setShowVoteDialog(false);
          }
        }, 30000); // 30 second timeout
        
        console.log("Calling signAndExecute with transaction");
        
        // Use a more robust approach for signing and executing
        try {
          const result = await signAndExecute({
            transaction: serialized,
          }, {
            onSuccess: async ({ digest }: { digest: string }) => {
              clearTimeout(timeoutId);
              console.log("Vote transaction successful with digest:", digest);
              toast.success("Your vote has been recorded successfully!");
              
              // Wait for transaction to be confirmed
              try {
                console.log("Waiting for transaction confirmation...");
                toast.info("Waiting for blockchain confirmation...");
                await suiClient.waitForTransaction({
                  digest,
                  options: {
                    showEffects: true
                  }
                });
                
                console.log("Transaction confirmed, updating UI");
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
              } catch (confirmError) {
                console.error("Error confirming transaction:", confirmError);
                setIsVoting(false);
                toast.warning("Your vote was submitted, but we couldn't confirm its status. Please refresh to see updated results.");
              }
            },
            onError: (error: Error) => {
              clearTimeout(timeoutId);
              console.error("Error processing vote:", error);
              console.log("Full error details:", JSON.stringify(error, null, 2));
              
              // Get detailed error message
              const errorMsg = error.toString().toLowerCase();
              console.log("Full error message:", error);
              
              // Extract Move abort code and location if possible
              const moveAbortMatch = errorMsg.match(/moveabort\(movelocation\s*{[^}]*},\s*(\d+)\)/i);
              const errorCode = moveAbortMatch ? moveAbortMatch[1] : "unknown";
              console.log("Extracted error code:", errorCode);
              
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
              } else if (errorMsg.includes("wallet not connected") || errorMsg.includes("not connected")) {
                toast.error("Wallet is not connected. Please reconnect your wallet and try again.");
              } else if (errorMsg.includes("user rejected")) {
                toast.error("You rejected the transaction. No vote was cast.");
              } else {
                toast.error(`Failed to cast your vote: ${error.message || 'Unknown error'} (Code: ${errorCode})`);
              }
              
              setIsVoting(false);
              setShowVoteDialog(false);
            },
          });
          
          console.log("Transaction result:", result);
          
        } catch (execError) {
          console.error("Error executing transaction:", execError);
          clearTimeout(timeoutId);
          toast.error(`Failed to execute transaction: ${(execError as Error).message || 'Unknown error'}`);
          setIsVoting(false);
          setShowVoteDialog(false);
        }
      } catch (txError) {
        console.error("Error processing request:", txError);
        setError(`Failed to process your vote request: ${(txError as Error).message || 'Unknown error'}`);
        toast.error(`Failed to process your vote request: ${(txError as Error).message || 'Unknown error'}`);
        setIsVoting(false);
        setShowVoteDialog(false);
      }
      
    } catch (error) {
      console.error("Error in vote function:", error);
      setError(`Failed to cast your vote: ${(error as Error).message || 'Unknown error'}`);
      toast.error(`Failed to cast your vote: ${(error as Error).message || 'Unknown error'}`);
      setIsVoting(false);
      setShowVoteDialog(false);
    }
  };

  // Add a function to refetch the ballot
  const refetchBallot = async () => {
    if (!ballotId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await suiClient.getObject({
        id: ballotId,
        options: { showContent: true }
      });
      if (!response?.data || !response.data.content) {
        throw new Error("Ballot not found or has no content");
      }
      if (response.data.content.dataType !== "moveObject") {
        throw new Error("Invalid ballot data format");
      }
      const fields = response.data.content.fields as any;
      // ... (repeat the candidate and status parsing logic from fetchBallot)
      let candidatesData = [];
      if (fields.candidates) {
        if (Array.isArray(fields.candidates)) {
          candidatesData = fields.candidates;
        } else if (fields.candidates.vec && Array.isArray(fields.candidates.vec)) {
          candidatesData = fields.candidates.vec;
        } else if (fields.candidates.fields && fields.candidates.fields.contents) {
          candidatesData = fields.candidates.fields.contents;
        }
      }
      const candidates: Candidate[] = [];
      for (let i = 0; i < candidatesData.length; i++) {
        const candidate = candidatesData[i];
        if (!candidate) continue;
        let candidateFields = candidate;
        if (candidate.fields) candidateFields = candidate.fields;
        const candidateId = Number(candidateFields.id || i);
        let candidateName = candidateFields.name || `Candidate ${i+1}`;
        if (typeof candidateName === 'object' && candidateName?.fields?.some) {
          candidateName = candidateName.fields.some;
        }
        let candidateDescription = candidateFields.description || "No description available";
        if (typeof candidateDescription === 'object' && candidateDescription?.fields?.some) {
          candidateDescription = candidateDescription.fields.some;
        }
        const candidateVotes = Number(candidateFields.vote_count || candidateFields.votes || 0);
        let imageUrl = undefined;
        if (candidateFields.image_url) {
          if (typeof candidateFields.image_url === 'string') {
            imageUrl = candidateFields.image_url;
          } else if (candidateFields.image_url.some) {
            imageUrl = candidateFields.image_url.some;
          } else if (candidateFields.image_url.fields && candidateFields.image_url.fields.some) {
            imageUrl = candidateFields.image_url.fields.some;
          }
        }
        candidates.push({
          id: candidateId,
          name: candidateName,
          description: candidateDescription,
          votes: candidateVotes,
          imageUrl: imageUrl
        });
      }
      const expiration = Number(fields.expiration || 0);
      const normalizedExpiration = normalizeTimestamp(expiration) || expiration;
      let status: 'Active' | 'Delisted' | 'Expired' = 'Active';
      if (fields.status?.fields?.name === "Delisted") {
        status = 'Delisted';
      } else if (fields.status?.fields?.name === "Expired" || normalizedExpiration < Date.now()) {
        status = 'Expired';
      }
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
        hasVoted: false,
        votedFor: undefined
      };
      // Check if current user has voted
      if (currentAccount && fields.voters && fields.voters.fields && fields.voters.fields.contents) {
        try {
          const votersTable = fields.voters.fields.contents;
          for (const voter of votersTable) {
            if (voter && voter.fields) {
              const voterAddress = voter.fields.key;
              if (voterAddress && voterAddress.toLowerCase() === currentAccount.address.toLowerCase()) {
                ballotData.hasVoted = true;
                ballotData.votedFor = Number(voter.fields.value);
                break;
              }
            }
          }
        } catch (err) {}
      }
      setBallot(ballotData);
    } catch (error) {
      setError("Failed to load ballot data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (ballotId) {
      refetchBallot();
    }
  }, [ballotId, currentAccount]);

  // Note: We've removed the wallet connection requirement to allow users to view ballots without connecting

  return (
    <FeatureGuard feature="ballot">
      <div className="min-h-screen bg-black bg-grid-pattern text-white">
        <div className="container mx-auto pt-24 pb-12 px-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <h1 className="text-3xl font-bold">Ballot Details</h1>
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/ballots')}
                className="flex items-center gap-1.5"
              >
                <ChevronLeft className="h-4 w-4" /> Back to Ballots
              </Button>
              <ConnectButton />
            </div>
          </div>
          
          {/* Info for non-connected wallet users */}
          {!currentAccount && (
            <div className="bg-blue-900/20 border border-blue-800/30 rounded-lg p-4 text-blue-200 flex items-start space-x-3 mb-4">
              <Info className="h-5 w-5 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-medium mb-1">Connect wallet to vote</h3>
                <p className="text-blue-300/90 text-sm mb-3">
                  You can browse ballots without connecting a wallet, but you'll need to connect to vote.
                </p>
                <ConnectButton />
              </div>
            </div>
          )}
          
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
              <span className="ml-3 text-xl">Loading ballot data...</span>
            </div>
          ) : error ? (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>
                {error}
              </AlertDescription>
            </Alert>
          ) : ballot ? (
            <div className="space-y-8">
              {/* Ballot Header Card */}
              <Card className="bg-slate-900/70 border-slate-700">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-2xl md:text-3xl font-bold text-white">
                        {ballot.title}
                      </CardTitle>
                      <CardDescription className="mt-2 text-slate-200 text-base">
                        {ballot.description}
                      </CardDescription>
                    </div>
                    <div className="flex flex-col gap-2 items-end">
                      {ballot.isPrivate && (
                        <Badge variant="outline" className="bg-blue-900/40 text-blue-300 border-blue-700/50 text-sm py-1">
                          Private Ballot
                        </Badge>
                      )}
                      <Badge variant={
                        ballot.status === 'Active' 
                          ? "default"
                          : ballot.status === 'Expired'
                            ? "secondary"
                            : "destructive"
                      } className={`text-sm py-1 ${
                        ballot.status === 'Active'
                          ? "bg-green-700"
                          : ballot.status === 'Expired'
                            ? "bg-amber-700"
                            : ""
                      }`}>
                        {ballot.status} Ballot
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Time Information */}
                  <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700/50">
                    {ballot.status === 'Active' ? (
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-slate-200 flex items-center">
                            <Clock className="h-4 w-4 mr-2 text-blue-400" />
                            Time Remaining
                          </span>
                          <span className="font-semibold text-white">
                            {formatTimeLeft(ballot.expiration)}
                          </span>
                        </div>
                        
                        {/* Time Breakdown */}
                        <div className="grid grid-cols-4 gap-2 pt-1">
                          <div className="bg-slate-700/60 p-2 rounded text-center">
                            <div className="text-xl font-bold text-white">{timeLeft.days}</div>
                            <div className="text-xs text-slate-300">days</div>
                          </div>
                          <div className="bg-slate-700/60 p-2 rounded text-center">
                            <div className="text-xl font-bold text-white">{timeLeft.hours}</div>
                            <div className="text-xs text-slate-300">hours</div>
                          </div>
                          <div className="bg-slate-700/60 p-2 rounded text-center">
                            <div className="text-xl font-bold text-white">{timeLeft.minutes}</div>
                            <div className="text-xs text-slate-300">min</div>
                          </div>
                          <div className="bg-slate-700/60 p-2 rounded text-center">
                            <div className="text-xl font-bold text-white">{timeLeft.seconds}</div>
                            <div className="text-xs text-slate-300">sec</div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center text-amber-300">
                        <AlertCircle className="h-5 w-5 mr-2" />
                        <span className="text-base">
                          This ballot {ballot.status === 'Expired' ? 'expired' : 'was delisted'} on {formatDate(ballot.expiration)}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  {/* User Vote Status */}
                  {currentAccount && (
                    <div className={`p-4 rounded-lg mb-4 ${
                      ballot.hasVoted 
                        ? 'bg-green-900/20 border border-green-800/30' 
                        : ballot.status === 'Active'
                          ? 'bg-blue-900/20 border border-blue-800/30'
                          : 'bg-amber-900/20 border border-amber-800/30'
                    }`}>
                      {ballot.hasVoted ? (
                        <div className="flex items-center text-green-300">
                          <CheckCircle2 className="h-5 w-5 mr-2" />
                          <span>
                            You have voted for{' '}
                            <span className="font-medium">
                              {ballot.candidates.find(c => c.id === ballot.votedFor)?.name || 'Unknown candidate'}
                            </span>
                          </span>
                        </div>
                      ) : ballot.status === 'Active' ? (
                        <div className="flex items-center text-blue-300">
                          <Vote className="h-5 w-5 mr-2" />
                          <span>You haven't voted on this ballot yet</span>
                        </div>
                      ) : (
                        <div className="flex items-center text-amber-300">
                          <AlertCircle className="h-5 w-5 mr-2" />
                          <span>You didn't vote on this ballot before it closed</span>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
              
              {/* Candidates Section */}
              <div>
                <h2 className="text-xl font-bold mb-4 flex items-center">
                  <User className="h-5 w-5 mr-2 text-blue-400" />
                  Select a Candidate
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {ballot.candidates.map((candidate) => (
                    <Card 
                      key={candidate.id}
                      className={`relative cursor-pointer transition-all duration-300 border-2 overflow-hidden ${
                        selectedCandidate?.id === candidate.id
                          ? 'border-blue-500 bg-blue-900/20'
                          : 'border-slate-700 bg-slate-800/50 hover:border-slate-500'
                      } ${ballot.status !== 'Active' || ballot.hasVoted ? 'opacity-80 pointer-events-none' : ''}`}
                      onClick={() => handleCandidateSelect(candidate)}
                    >
                      {/* Candidate Image - Preserving aspect ratio */}
                      {candidate.imageUrl && (
                        <div className="p-4 pb-0 flex justify-center">
                          <div className="relative w-32 h-32 overflow-hidden rounded-lg bg-slate-700/30">
                            <img 
                              src={candidate.imageUrl} 
                              alt={candidate.name}
                              className="w-full h-full object-contain"
                              onError={(e) => {
                                // If image fails to load, show fallback
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                                
                                // Create and show a fallback with first letter of candidate name
                                const parent = target.parentElement as HTMLElement;
                                if (parent) {
                                  const fallback = document.createElement('div');
                                  fallback.className = 'w-full h-full flex items-center justify-center bg-slate-800 text-4xl font-bold text-slate-300';
                                  fallback.innerText = candidate.name.charAt(0).toUpperCase();
                                  parent.appendChild(fallback);
                                }
                              }}
                            />
                          </div>
                        </div>
                      )}
                      {!candidate.imageUrl && (
                        <div className="p-4 pb-0 flex justify-center">
                          <div className="relative w-32 h-32 flex items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg">
                            <div className="text-5xl font-bold text-slate-700">{candidate.name.charAt(0).toUpperCase()}</div>
                          </div>
                        </div>
                      )}
                      
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg md:text-xl text-white text-center">
                          {candidate.name}
                        </CardTitle>
                        {ballot.votedFor === candidate.id && (
                          <Badge className="absolute right-3 top-3 bg-green-700 text-white py-1 px-3 z-10 shadow-md">
                            Your Vote
                          </Badge>
                        )}
                      </CardHeader>
                      <CardContent className="pb-2">
                        <p className="text-slate-200 text-sm md:text-base leading-relaxed">
                          {candidate.description}
                        </p>
                      </CardContent>
                      <CardFooter className="pt-0 flex justify-between items-center">
                        <Badge variant="outline" className="bg-slate-700/50 text-slate-200 border-slate-600">
                          ID: {candidate.id}
                        </Badge>
                        <div className="text-sm md:text-base bg-slate-700/40 px-3 py-1 rounded-md">
                          <span className="text-slate-300">Votes: </span>
                          <span className="font-semibold text-white">{candidate.votes}</span>
                        </div>
                      </CardFooter>
                      
                      {selectedCandidate?.id === candidate.id && (
                        <>
                          <div className="absolute inset-0 border-2 border-blue-500 pointer-events-none z-10"></div>
                          <div className="absolute top-2 left-2 w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center z-20">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-white"><polyline points="20 6 9 17 4 12"></polyline></svg>
                          </div>
                        </>
                      )}
                    </Card>
                  ))}
                </div>
              </div>
              
              {/* Vote Button */}
              <div className="flex justify-center mt-8">
                <Button
                  className="px-8 py-6 text-lg font-semibold bg-blue-600 hover:bg-blue-700"
                  disabled={!selectedCandidate || ballot.status !== 'Active' || ballot.hasVoted}
                  onClick={handleVoteClick}
                >
                  {ballot.hasVoted 
                    ? "Already Voted" 
                    : ballot.status !== 'Active'
                      ? "Voting Closed"
                      : "Vote for Selected Candidate"}
                  <Vote className="ml-2 h-5 w-5" />
                </Button>
              </div>
              
              {/* Vote Confirmation Dialog */}
              <Dialog 
                open={showVoteDialog} 
                onOpenChange={(open) => {
                  console.log("Dialog open state changing to:", open);
                  setShowVoteDialog(open);
                  // If closing and still in voting state, reset it
                  if (!open && isVoting) {
                    setIsVoting(false);
                  }
                }}
              >
                <DialogContent className="bg-slate-900 border-slate-700"
                  onEscapeKeyDown={(e) => {
                    // Prevent closing the dialog while voting is in progress
                    if (isVoting) {
                      e.preventDefault();
                    }
                  }}
                  onPointerDownOutside={(e) => {
                    // Prevent closing the dialog while voting is in progress
                    if (isVoting) {
                      e.preventDefault();
                    }
                  }}
                >
                  <DialogHeader>
                    <DialogTitle className="text-xl text-white">Confirm Your Vote</DialogTitle>
                    <DialogDescription className="text-slate-300 text-base">
                      You are about to cast your vote for this candidate.
                      This action cannot be undone.
                    </DialogDescription>
                  </DialogHeader>
                  
                  {selectedCandidate && (
                    <div className="p-5 bg-slate-800 rounded-lg border border-slate-700">
                      {selectedCandidate.imageUrl && (
                        <div className="flex justify-center mb-4">
                          <div className="relative w-40 h-40 overflow-hidden rounded-full border-4 border-slate-700 shadow-lg">
                            <img 
                              src={selectedCandidate.imageUrl} 
                              alt={selectedCandidate.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                // If image fails to load, show fallback
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                                
                                // Create and show a fallback with first letter of candidate name
                                const parent = target.parentElement as HTMLElement;
                                if (parent) {
                                  const fallback = document.createElement('div');
                                  fallback.className = 'w-full h-full flex items-center justify-center bg-slate-700 text-4xl font-bold text-slate-300';
                                  fallback.innerText = selectedCandidate.name.charAt(0).toUpperCase();
                                  parent.appendChild(fallback);
                                }
                              }}
                            />
                          </div>
                        </div>
                      )}
                      {!selectedCandidate.imageUrl && (
                        <div className="flex justify-center mb-4">
                          <div className="relative w-40 h-40 flex items-center justify-center bg-slate-700 rounded-full border-4 border-slate-600">
                            <div className="text-6xl font-bold text-slate-500">{selectedCandidate.name.charAt(0).toUpperCase()}</div>
                          </div>
                        </div>
                      )}
                      <h3 className="font-semibold text-xl mb-2 text-white text-center">{selectedCandidate.name}</h3>
                      <p className="text-slate-200 text-base">{selectedCandidate.description}</p>
                      <div className="mt-3 flex justify-center">
                        <div className="px-3 py-1 bg-blue-600/30 text-blue-200 rounded-md text-sm">
                          Current votes: <span className="font-bold">{selectedCandidate.votes}</span>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <Alert variant="destructive" className="bg-amber-900/30 border-amber-700/50 text-amber-200">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-base">
                      Your vote will be recorded on the blockchain and cannot be changed.
                    </AlertDescription>
                  </Alert>
                  
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowVoteDialog(false)} className="text-white border-slate-600">
                      Cancel
                    </Button>
                    <Button 
                      onClick={submitVote} 
                      disabled={isVoting}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                    >
                      {isVoting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        <>Confirm Vote</>
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              
            </div>
          ) : (
            <div className="p-8 text-center text-slate-400">
              <AlertCircle className="h-10 w-10 mx-auto mb-4" />
              <p className="text-lg">No ballot data found</p>
            </div>
          )}
        </div>
        
        {/* Connect Wallet Dialog */}
        <Dialog open={showConnectDialog} onOpenChange={setShowConnectDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Connect Your Wallet</DialogTitle>
              <DialogDescription>
                You need to connect your wallet to vote on this ballot.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-center py-4">
              <ConnectButton className="w-full" />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowConnectDialog(false)}>
                Cancel
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </FeatureGuard>
  );
};

export default BallotDetailPage;
