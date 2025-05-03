import { useState } from "react";
import { useSignAndExecuteTransaction } from "@mysten/dapp-kit";
import { useCurrentAccount } from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { useNetworkVariable } from "../../config/networkConfig";
import { SuiTransactionBlockResponse } from "@mysten/sui/client";
import { toast } from "sonner";
import { Ballot, Candidate } from "../../pages/BallotPage";
import { 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  ChevronRight, 
  Loader2,
  Vote,
  Shield,
  Lock
} from "lucide-react";
import { motion } from "framer-motion";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { Doughnut } from "react-chartjs-2";

// Register ChartJS components
ChartJS.register(ArcElement, Tooltip, Legend);

// Import shadcn components
import { Button } from "../ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Separator } from "../ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";

interface BallotVotingProps {
  ballots: Ballot[];
  isLoading: boolean;
}

const BallotVoting = ({ ballots, isLoading }: BallotVotingProps) => {
  const [selectedBallot, setSelectedBallot] = useState<Ballot | null>(null);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [isVoting, setIsVoting] = useState(false);
  const [showVoteDialog, setShowVoteDialog] = useState(false);
  const [showResultsDialog, setShowResultsDialog] = useState(false);
  const [hasVoted, setHasVoted] = useState<Record<string, boolean>>({});

  const account = useCurrentAccount();
  const packageId = useNetworkVariable("packageId" as any);
  const dashboardId = useNetworkVariable("dashboardId" as any);
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();

  const handleVoteClick = (ballot: Ballot) => {
    setSelectedBallot(ballot);
    setSelectedCandidate(null);
    setShowVoteDialog(true);
  };

  const handleCandidateSelect = (candidate: Candidate) => {
    setSelectedCandidate(candidate);
  };

  const handleViewResults = (ballot: Ballot) => {
    setSelectedBallot(ballot);
    setShowResultsDialog(true);
  };

  const submitVote = async () => {
    if (!selectedBallot || !selectedCandidate || !account) {
      toast.error("Missing required information");
      return;
    }

    setIsVoting(true);

    try {
      const tx = new Transaction();
      
      tx.moveCall({
        target: `${packageId}::ballot::vote_for_candidate`,
        arguments: [
          tx.object(selectedBallot.id),
          tx.object(dashboardId),
          tx.pure(selectedCandidate.id),
        ],
      });

      signAndExecute(
        {
          transaction: tx,
        },
        {
          onSuccess: () => {
            toast.success(`Vote submitted for ${selectedCandidate.name}`);
            setShowVoteDialog(false);
            setIsVoting(false);
            
            // Mark this ballot as voted
            setHasVoted({
              ...hasVoted,
              [selectedBallot.id]: true
            });
            
            // Update the UI to show the vote
            // In a real implementation, we would fetch the updated ballot data
            if (selectedBallot && selectedCandidate) {
              const updatedCandidates = selectedBallot.candidates.map(c => {
                if (c.id === selectedCandidate.id) {
                  return { ...c, votes: c.votes + 1 };
                }
                return c;
              });
              
              setSelectedBallot({
                ...selectedBallot,
                candidates: updatedCandidates,
                totalVotes: selectedBallot.totalVotes + 1
              });
            }
          },
          onError: (error) => {
            console.error("Failed to submit vote:", error);
            toast.error("Failed to submit vote");
            setIsVoting(false);
          },
        }
      );
    } catch (error) {
      console.error("Error submitting vote:", error);
      toast.error("An error occurred while submitting your vote");
      setIsVoting(false);
    }
  };

  const getTimeLeft = (expirationTimestamp: number) => {
    const now = Date.now();
    const timeLeft = expirationTimestamp - now;
    
    if (timeLeft <= 0) {
      return "Expired";
    }
    
    const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
    const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${days}d ${hours}h ${minutes}m`;
  };

  const getChartData = (ballot: Ballot) => {
    return {
      labels: ballot.candidates.map(c => c.name),
      datasets: [
        {
          data: ballot.candidates.map(c => c.votes),
          backgroundColor: [
            'rgba(54, 162, 235, 0.6)',
            'rgba(255, 99, 132, 0.6)',
            'rgba(255, 206, 86, 0.6)',
            'rgba(75, 192, 192, 0.6)',
            'rgba(153, 102, 255, 0.6)',
            'rgba(255, 159, 64, 0.6)',
          ],
          borderColor: [
            'rgba(54, 162, 235, 1)',
            'rgba(255, 99, 132, 1)',
            'rgba(255, 206, 86, 1)',
            'rgba(75, 192, 192, 1)',
            'rgba(153, 102, 255, 1)',
            'rgba(255, 159, 64, 1)',
          ],
          borderWidth: 1,
        },
      ],
    };
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (ballots.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No Active Ballots</CardTitle>
          <CardDescription>
            There are currently no active ballots to vote on
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8">
            <AlertCircle className="h-16 w-16 text-muted-foreground mb-4" />
            <p className="text-center text-muted-foreground">
              Check back later for new ballots or contact an administrator
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {ballots.map((ballot) => (
          <motion.div
            key={ballot.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="h-full flex flex-col">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="text-xl">{ballot.title}</CardTitle>
                  {ballot.isPrivate && (
                    <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200">
                      <Lock className="h-3 w-3 mr-1" />
                      Private
                    </Badge>
                  )}
                </div>
                <CardDescription>
                  {ballot.description.length > 100 
                    ? `${ballot.description.substring(0, 100)}...` 
                    : ballot.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-grow">
                <div className="flex items-center mb-4">
                  <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    Time left: {getTimeLeft(ballot.expiration)}
                  </span>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Total votes</span>
                    <span className="font-medium">{ballot.totalVotes}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Candidates</span>
                    <span className="font-medium">{ballot.candidates.length}</span>
                  </div>
                </div>
                
                <Separator className="my-4" />
                
                <div className="text-sm text-muted-foreground">
                  {hasVoted[ballot.id] ? (
                    <div className="flex items-center text-green-600">
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      You have voted on this ballot
                    </div>
                  ) : (
                    <div className="flex items-center">
                      <Vote className="h-4 w-4 mr-2" />
                      Cast your vote for one of the candidates
                    </div>
                  )}
                </div>
              </CardContent>
              <CardFooter className="flex justify-between pt-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleViewResults(ballot)}
                >
                  View Results
                </Button>
                <Button 
                  size="sm"
                  disabled={hasVoted[ballot.id]}
                  onClick={() => handleVoteClick(ballot)}
                >
                  {hasVoted[ballot.id] ? "Voted" : "Vote Now"}
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </CardFooter>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Vote Dialog */}
      <Dialog open={showVoteDialog} onOpenChange={setShowVoteDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{selectedBallot?.title}</DialogTitle>
            <DialogDescription>
              {selectedBallot?.description}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            {selectedBallot?.candidates.map((candidate) => (
              <div 
                key={candidate.id}
                className={`p-4 border rounded-lg cursor-pointer transition-all ${
                  selectedCandidate?.id === candidate.id 
                    ? 'border-primary bg-primary/5' 
                    : 'hover:border-primary/50'
                }`}
                onClick={() => handleCandidateSelect(candidate)}
              >
                <div className="flex items-start">
                  {candidate.imageUrl && (
                    <div className="mr-4 flex-shrink-0">
                      <img 
                        src={candidate.imageUrl} 
                        alt={candidate.name}
                        className="w-20 h-20 object-cover rounded-md"
                      />
                    </div>
                  )}
                  <div className="flex-grow">
                    <h3 className="font-medium">{candidate.name}</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {candidate.description}
                    </p>
                  </div>
                  <div className="ml-4 flex-shrink-0">
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                      selectedCandidate?.id === candidate.id 
                        ? 'border-primary' 
                        : 'border-muted'
                    }`}>
                      {selectedCandidate?.id === candidate.id && (
                        <div className="w-3 h-3 rounded-full bg-primary" />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowVoteDialog(false)} disabled={isVoting}>
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

      {/* Results Dialog */}
      <Dialog open={showResultsDialog} onOpenChange={setShowResultsDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{selectedBallot?.title} - Results</DialogTitle>
            <DialogDescription>
              Current voting results
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-medium mb-4">Vote Distribution</h3>
              {selectedBallot && (
                <div className="w-full h-64">
                  <Doughnut 
                    data={getChartData(selectedBallot)} 
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                    }}
                  />
                </div>
              )}
            </div>
            
            <div>
              <h3 className="font-medium mb-4">Candidate Rankings</h3>
              <div className="space-y-3">
                {selectedBallot?.candidates
                  .slice()
                  .sort((a, b) => b.votes - a.votes)
                  .map((candidate, index) => (
                    <div key={candidate.id} className="flex items-center">
                      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center mr-3">
                        <span className="text-xs font-medium">{index + 1}</span>
                      </div>
                      <div className="flex-grow">
                        <div className="text-sm font-medium">{candidate.name}</div>
                        <div className="w-full bg-gray-200 rounded-full h-2.5 mt-1">
                          <div 
                            className="bg-primary h-2.5 rounded-full" 
                            style={{ 
                              width: `${selectedBallot.totalVotes > 0 
                                ? (candidate.votes / selectedBallot.totalVotes) * 100 
                                : 0}%` 
                            }}
                          ></div>
                        </div>
                      </div>
                      <div className="ml-3 text-sm font-medium">
                        {candidate.votes} votes
                      </div>
                    </div>
                  ))
                }
              </div>
              
              <div className="mt-6 p-3 bg-muted rounded-md">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Total Votes</span>
                  <span className="font-medium">{selectedBallot?.totalVotes}</span>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-sm">Time Left</span>
                  <span className="font-medium">
                    {selectedBallot && getTimeLeft(selectedBallot.expiration)}
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResultsDialog(false)}>
              Close
            </Button>
            {!hasVoted[selectedBallot?.id || ""] && (
              <Button onClick={() => {
                setShowResultsDialog(false);
                if (selectedBallot) handleVoteClick(selectedBallot);
              }}>
                Vote Now
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default BallotVoting;
