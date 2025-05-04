import { useState, useEffect } from "react";
import { useCurrentAccount } from "@mysten/dapp-kit";
import { useBallotVotes } from "../../hooks/useBallotVotes";
import { 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  ChevronRight, 
  Loader2,
  Vote,
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
import { Tabs, TabsList, TabsTrigger } from "../ui/tabs";
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
  onViewBallot?: (ballot: Ballot) => void;
}

const BallotVoting = ({ ballots, isLoading, onViewBallot }: BallotVotingProps) => {
  const [selectedBallot, setSelectedBallot] = useState<Ballot | null>(null);
  const [showResultsDialog, setShowResultsDialog] = useState(false);
  const [hasVoted, setHasVoted] = useState<Record<string, boolean>>({});
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'expired'>('all');

  const account = useCurrentAccount();
  const { fetchBallotVotes } = useBallotVotes();

  useEffect(() => {
    const checkVotedBallots = async () => {
      if (account) {
        try {
          const votedBallots = await fetchBallotVotes();
          console.log("User has voted on ballots:", votedBallots);
          setHasVoted(votedBallots);
        } catch (error) {
          console.error("Error fetching ballot votes:", error);
        }
      }
    };

    checkVotedBallots();
  }, [account, fetchBallotVotes, ballots]);

  const handleViewResults = (ballot: Ballot) => {
    setSelectedBallot(ballot);
    setShowResultsDialog(true);
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

  const filteredBallots = ballots.filter(ballot => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'active') return ballot.status === 'Active';
    if (activeFilter === 'expired') return ballot.status === 'Expired' || ballot.status === 'Delisted';
    return true;
  });

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
      <div className="mb-6">
        <Tabs 
          defaultValue="all" 
          onValueChange={(value) => setActiveFilter(value as 'all' | 'active' | 'expired')}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-3 max-w-md mx-auto">
            <TabsTrigger value="all">All Ballots</TabsTrigger>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="expired">Expired/Delisted</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
    
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredBallots.map((ballot) => (
          <motion.div
            key={ballot.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card className={`h-full flex flex-col ${ballot.status !== 'Active' ? 'opacity-75' : ''}`}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="text-xl">{ballot.title}</CardTitle>
                  <div className="flex flex-col gap-1 items-end">
                    {ballot.isPrivate && (
                      <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200">
                        <Lock className="h-3 w-3 mr-1" />
                        Private
                      </Badge>
                    )}
                    {ballot.status !== 'Active' && (
                      <Badge variant={ballot.status === 'Delisted' ? "destructive" : "secondary"}>
                        {ballot.status}
                      </Badge>
                    )}
                  </div>
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
                    {ballot.status === 'Active' 
                      ? `Time left: ${getTimeLeft(ballot.expiration)}`
                      : `Ended: ${new Date(ballot.expiration).toLocaleDateString()}`
                    }
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
                  ) : ballot.status === 'Active' ? (
                    <div className="flex items-center">
                      <Vote className="h-4 w-4 mr-2" />
                      Cast your vote for one of the candidates
                    </div>
                  ) : (
                    <div className="flex items-center">
                      <AlertCircle className="h-4 w-4 mr-2" />
                      Voting is no longer available
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
                  disabled={hasVoted[ballot.id] || ballot.status !== 'Active'}
                  onClick={() => onViewBallot && onViewBallot(ballot)}
                >
                  {hasVoted[ballot.id] ? "Voted" : "Vote Now"}
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </CardFooter>
            </Card>
          </motion.div>
        ))}
      </div>

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
              {selectedBallot && selectedBallot.candidates.length > 0 ? (
                <div className="w-full h-64">
                  <Doughnut 
                    data={getChartData(selectedBallot)} 
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                    }}
                  />
                </div>
              ) : (
                <div className="flex items-center justify-center h-64 bg-muted rounded-lg">
                  <p className="text-muted-foreground">No candidates available</p>
                </div>
              )}
            </div>
            
            <div>
              <h3 className="font-medium mb-4">Candidate Rankings</h3>
              {selectedBallot && selectedBallot.candidates.length > 0 ? (
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
              ) : (
                <div className="p-6 text-center border rounded-lg">
                  <p className="text-muted-foreground">No candidates have been added yet</p>
                </div>
              )}
              
              <div className="mt-6 p-3 bg-muted rounded-md">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Total Votes</span>
                  <span className="font-medium">{selectedBallot?.totalVotes || 0}</span>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-sm">Status</span>
                  <span className="font-medium">
                    {selectedBallot?.status || 'Unknown'}
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResultsDialog(false)}>
              Close
            </Button>
            {selectedBallot && !hasVoted[selectedBallot.id] && selectedBallot.status === 'Active' && (
              <Button onClick={() => {
                setShowResultsDialog(false);
                if (selectedBallot && onViewBallot) onViewBallot(selectedBallot);
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
