import { useState, useEffect } from "react";
import { useCurrentAccount } from "@mysten/dapp-kit";
import { useBallotVotes } from "../../hooks/useBallotVotes";
import { formatDate, formatTimeLeft, isValidTimestamp, normalizeTimestamp } from "../../utils/formatUtils";
import { 
  AlertCircle,
  CheckCircle2, 
  ChevronRight, 
  Clock, 
  ExternalLink,
  Lock,
  PieChart,
  Search,
  Users,
  Vote,
  Loader2
} from "lucide-react";
import { getObjectUrl, openInExplorer } from "../../utils/explorerUtils";
import { motion } from "framer-motion";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { Doughnut } from "react-chartjs-2";
import { Ballot } from "../../pages/BallotPage";

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
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'expired' | 'delisted'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

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



  const getChartData = (ballot: Ballot) => {
    return {
      labels: ballot.candidates.map((c) => c.name),
      datasets: [
        {
          data: ballot.candidates.map((c) => c.votes),
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
    // Filter by status
    const statusMatch = 
      activeFilter === 'all' ||
      (activeFilter === 'active' && ballot.status === 'Active') ||
      (activeFilter === 'expired' && ballot.status === 'Expired') ||
      (activeFilter === 'delisted' && ballot.status === 'Delisted');
    
    // Filter by search query
    const searchMatch = 
      searchQuery === '' ||
      ballot.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ballot.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ballot.candidates.some(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()));
    
    return statusMatch && searchMatch;
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
      <div className="mb-6 space-y-4">
        {/* Search and filter header */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-1/2">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <Search className="h-4 w-4 text-slate-400" />
            </div>
            <input
              type="text"
              className="bg-slate-900 border border-slate-700 text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 p-2.5 placeholder-slate-400"
              placeholder="Search ballots by title, description or candidate..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                className="absolute inset-y-0 right-0 flex items-center pr-3"
                onClick={() => setSearchQuery('')}
              >
                <span className="text-slate-400 hover:text-white">×</span>
              </button>
            )}
          </div>
          
          <div className="flex items-center gap-2 w-full md:w-auto">
            <span className="text-sm text-slate-400">Filter:</span>
            <Tabs 
              defaultValue="all" 
              value={activeFilter}
              onValueChange={(value) => setActiveFilter(value as 'all' | 'active' | 'expired' | 'delisted')}
              className="w-full md:w-auto"
            >
              <TabsList className="grid grid-cols-4 w-full bg-slate-900 border border-slate-700 p-1 rounded-lg">
                <TabsTrigger 
                  value="all" 
                  className="data-[state=active]:bg-blue-600 data-[state=active]:text-white rounded-md"
                >
                  All
                </TabsTrigger>
                <TabsTrigger 
                  value="active" 
                  className="data-[state=active]:bg-green-600 data-[state=active]:text-white rounded-md"
                >
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Active
                </TabsTrigger>
                <TabsTrigger 
                  value="expired" 
                  className="data-[state=active]:bg-amber-600 data-[state=active]:text-white rounded-md"
                >
                  <Clock className="h-3 w-3 mr-1" />
                  Expired
                </TabsTrigger>
                <TabsTrigger 
                  value="delisted" 
                  className="data-[state=active]:bg-red-600 data-[state=active]:text-white rounded-md"
                >
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Delisted
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
        
        {/* Results count */}
        <div className="flex justify-between items-center">
          <div className="text-sm text-slate-400">
            {filteredBallots.length === 0 ? (
              <span>No ballots found</span>
            ) : filteredBallots.length === 1 ? (
              <span>1 ballot found</span>
            ) : (
              <span>{filteredBallots.length} ballots found</span>
            )}
            {searchQuery && (
              <span className="ml-1">for "{searchQuery}"</span>
            )}
          </div>
          
          <div className="text-sm text-slate-400 flex items-center gap-2">
            <span>Active: {ballots.filter(b => b.status === 'Active').length}</span>
            <span>•</span>
            <span>Total: {ballots.length}</span>
          </div>
        </div>
      </div>
    
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredBallots.map((ballot) => (
          <motion.div
            key={ballot.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            whileHover={{ y: -5, transition: { duration: 0.2 } }}
            className="h-full"
          >
            <Card className={`h-full flex flex-col overflow-hidden border-2 ${ballot.status === 'Active' ? 'border-blue-500/20 shadow-md shadow-blue-500/10' : ballot.status === 'Expired' ? 'border-amber-500/20' : 'border-red-500/20'} ${ballot.status !== 'Active' ? 'opacity-80 bg-black/40' : 'bg-gradient-to-br from-slate-900 to-slate-800'}`}>
              <div className={`absolute top-0 left-0 w-full h-1 ${ballot.status === 'Active' ? 'bg-blue-500' : ballot.status === 'Expired' ? 'bg-amber-500' : 'bg-red-500'}`}></div>
              
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-xl font-bold text-white group-hover:text-blue-400 transition-colors">
                    {ballot.title}
                  </CardTitle>
                  <div className="flex flex-col gap-1 items-end">
                    {ballot.isPrivate && (
                      <Badge variant="outline" className="bg-blue-900/40 text-blue-300 border-blue-700/50 py-1">
                        <Lock className="h-3 w-3 mr-1" />
                        Private
                      </Badge>
                    )}
                    {ballot.status !== 'Active' && (
                      <Badge variant={ballot.status === 'Delisted' ? "destructive" : "secondary"} className={`${ballot.status === 'Expired' ? 'bg-amber-900/50 text-amber-300 hover:bg-amber-800/50' : 'bg-red-900/50 text-red-300 hover:bg-red-800/50'} py-1`}>
                        {ballot.status === 'Expired' ? <Clock className="h-3 w-3 mr-1" /> : <AlertCircle className="h-3 w-3 mr-1" />}
                        {ballot.status}
                      </Badge>
                    )}
                    {ballot.status === 'Active' && (
                      <Badge variant="outline" className="bg-green-900/40 text-green-300 border-green-700/50 py-1">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Active
                      </Badge>
                    )}
                  </div>
                </div>
                <CardDescription className="mt-2 text-slate-300">
                  {ballot.description.length > 100 
                    ? `${ballot.description.substring(0, 100)}...` 
                    : ballot.description}
                </CardDescription>
              </CardHeader>
              
              <CardContent className="flex-grow pb-2">
                {/* Time left with progress bar */}
                <div className="mb-4">
                  {ballot.status === 'Active' && isValidTimestamp(ballot.expiration) && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="flex items-center text-blue-300">
                          <Clock className="h-4 w-4 mr-2" />
                          Time left
                        </span>
                        <span className="font-medium text-white">
                          {formatTimeLeft(normalizeTimestamp(ballot.expiration) || ballot.expiration)}
                        </span>
                      </div>
                      
                      {/* Time progress bar */}
                      <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
                        {(() => {
                          const now = Date.now();
                          const expiry = normalizeTimestamp(ballot.expiration) || ballot.expiration;
                          const totalDuration = 7 * 24 * 60 * 60 * 1000; // Assume 7 days total duration
                          const elapsed = expiry - now;
                          const percent = Math.max(0, Math.min(100, (elapsed / totalDuration) * 100));
                          
                          return (
                            <div 
                              className="h-full bg-gradient-to-r from-blue-500 to-blue-300" 
                              style={{ width: `${percent}%` }}
                            />
                          );
                        })()}
                      </div>
                    </div>
                  )}
                  
                  {(ballot.status !== 'Active' || !isValidTimestamp(ballot.expiration)) && (
                    <div className="flex items-center text-amber-300">
                      <Clock className="h-4 w-4 mr-2" />
                      <span className="text-sm">
                        {ballot.status === 'Active' 
                          ? "Invalid expiration date"
                          : `Ended: ${formatDate(ballot.expiration)}`
                        }
                      </span>
                    </div>
                  )}
                </div>
                
                {/* Candidates and votes info */}
                <div className="space-y-3 bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-300 flex items-center">
                      <Users className="h-4 w-4 mr-2 text-blue-400" />
                      Candidates
                    </span>
                    <span className="font-medium text-white bg-blue-900/50 px-2 py-0.5 rounded-full text-xs">
                      {ballot.candidates.length}
                    </span>
                  </div>
                  
                  {/* Preview of top candidates */}
                  {ballot.candidates.length > 0 && (
                    <div className="space-y-2">
                      {ballot.candidates.slice(0, 2).map((candidate, idx) => (
                        <div key={idx} className="flex justify-between items-center text-sm">
                          <span className="text-slate-300 truncate max-w-[180px]">{candidate.name}</span>
                          {ballot.status !== 'Active' && (
                            <span className="font-medium text-white bg-slate-700/70 px-2 py-0.5 rounded-full text-xs">
                              {candidate.votes} votes
                            </span>
                          )}
                        </div>
                      ))}
                      {ballot.candidates.length > 2 && (
                        <div className="text-xs text-slate-400 text-center">
                          +{ballot.candidates.length - 2} more candidates
                        </div>
                      )}
                    </div>
                  )}
                  
                  {ballot.status !== 'Active' && (
                    <div className="flex justify-between items-center pt-1 border-t border-slate-700/50">
                      <span className="text-sm text-slate-300 flex items-center">
                        <Vote className="h-4 w-4 mr-2 text-purple-400" />
                        Total votes
                      </span>
                      <span className="font-medium text-white bg-purple-900/50 px-2 py-0.5 rounded-full text-xs">
                        {ballot.totalVotes}
                      </span>
                    </div>
                  )}
                </div>
                
                <Separator className="my-4 bg-slate-700/50" />
                
                {/* Voting status */}
                <div className={`text-sm p-2 rounded-lg ${hasVoted[ballot.id] ? 'bg-green-900/30 text-green-300 border border-green-800/50' : ballot.status === 'Active' ? 'bg-blue-900/30 text-blue-300 border border-blue-800/50' : 'bg-slate-800/50 text-slate-300 border border-slate-700/50'}`}>
                  {hasVoted[ballot.id] ? (
                    <div className="flex items-center">
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
              
              <CardFooter className="flex flex-col gap-2 pt-0">
                <div className="flex justify-between w-full">
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="border-slate-700 hover:bg-slate-800 hover:text-blue-400 transition-colors"
                    onClick={() => handleViewResults(ballot)}
                  >
                    <PieChart className="h-4 w-4 mr-1" />
                    View Results
                  </Button>
                  <Button 
                    size="sm"
                    className={`${hasVoted[ballot.id] || ballot.status !== 'Active' ? 'bg-slate-700 hover:bg-slate-600' : 'bg-blue-600 hover:bg-blue-500'} transition-colors`}
                    disabled={hasVoted[ballot.id] || ballot.status !== 'Active'}
                    onClick={() => {
                      if (onViewBallot) {
                        console.log("Navigating to ballot:", ballot.id);
                        onViewBallot(ballot);
                      }
                    }}
                  >
                    {hasVoted[ballot.id] ? "Voted" : "Vote Now"}
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="w-full h-8 gap-1.5 text-blue-400 hover:text-blue-300 hover:bg-blue-950/30 border border-slate-800"
                  onClick={(e) => {
                    e.stopPropagation();
                    openInExplorer(getObjectUrl(ballot.id));
                  }}
                >
                  <ExternalLink size={14} />
                  <span>View on Sui Explorer</span>
                </Button>
              </CardFooter>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Results Dialog */}
      <Dialog open={showResultsDialog} onOpenChange={setShowResultsDialog}>
        <DialogContent className="max-w-3xl bg-slate-900 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white text-xl">
              {selectedBallot?.title} - Results
            </DialogTitle>
            <DialogDescription className="text-slate-300">
              Current voting results and candidate standings
            </DialogDescription>
          </DialogHeader>
          
          {selectedBallot && (
            <div className="mt-2 mb-4 flex items-center justify-between text-sm text-slate-400 bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
              <div className="flex items-center gap-3">
                <div className="flex items-center">
                  <Users className="h-4 w-4 mr-1 text-blue-400" />
                  <span>{selectedBallot.candidates.length} Candidates</span>
                </div>
                <span>•</span>
                <div className="flex items-center">
                  <Vote className="h-4 w-4 mr-1 text-purple-400" />
                  <span>{selectedBallot.totalVotes} Total Votes</span>
                </div>
              </div>
              <div className="flex items-center">
                <Clock className="h-4 w-4 mr-1" />
                <span>{selectedBallot.status === 'Active' ? 'Active' : `Ended: ${formatDate(selectedBallot.expiration)}`}</span>
              </div>
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-800/40 p-4 rounded-lg border border-slate-700/50">
              <h3 className="font-medium mb-4 text-white flex items-center">
                <PieChart className="h-5 w-5 mr-2 text-blue-400" />
                Vote Distribution
              </h3>
              {selectedBallot && selectedBallot.candidates.length > 0 ? (
                <div className="w-full h-64">
                  <Doughnut 
                    data={getChartData(selectedBallot)} 
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          position: 'bottom',
                          labels: {
                            color: 'rgb(203, 213, 225)',
                            padding: 15,
                            font: {
                              size: 11
                            }
                          }
                        }
                      }
                    }} 
                  />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-64 bg-slate-800/70 rounded-md">
                  <AlertCircle className="h-12 w-12 text-slate-500 mb-2" />
                  <p className="text-slate-400 text-center">
                    No voting data available
                  </p>
                </div>
              )}
            </div>
            
            <div className="bg-slate-800/40 p-4 rounded-lg border border-slate-700/50">
              <h3 className="font-medium mb-4 text-white flex items-center">
                <Users className="h-5 w-5 mr-2 text-purple-400" />
                Candidate Rankings
              </h3>
              {selectedBallot && selectedBallot.candidates.length > 0 ? (
                <div className="space-y-3 max-h-64 overflow-y-auto pr-1 custom-scrollbar">
                  {selectedBallot.candidates
                    .sort((a, b) => b.votes - a.votes)
                    .map((candidate, index) => {
                      // Calculate percentage of total votes
                      const percentage = selectedBallot.totalVotes > 0 
                        ? Math.round((candidate.votes / selectedBallot.totalVotes) * 100) 
                        : 0;
                        
                      return (
                        <div key={index} className="p-3 bg-slate-800/70 rounded-md border border-slate-700/50 hover:bg-slate-700/50 transition-colors">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center">
                              <div className={`text-white w-6 h-6 rounded-full flex items-center justify-center mr-3 ${index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-slate-400' : index === 2 ? 'bg-amber-700' : 'bg-slate-700'}`}>
                                {index + 1}
                              </div>
                              <span className="text-white font-medium truncate max-w-[150px]">{candidate.name}</span>
                            </div>
                            <div className="flex items-center">
                              <span className="font-medium text-white mr-2">{candidate.votes}</span>
                              <span className="text-slate-400">votes</span>
                            </div>
                          </div>
                          
                          {/* Progress bar */}
                          <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden mt-1">
                            <div 
                              className={`h-full ${index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-slate-400' : index === 2 ? 'bg-amber-700' : 'bg-blue-600'}`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                          <div className="text-right text-xs text-slate-400 mt-1">{percentage}% of votes</div>
                        </div>
                      );
                    })}
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
          
          <DialogFooter className="mt-6">
            <Button 
              onClick={() => setShowResultsDialog(false)}
              className="bg-blue-600 hover:bg-blue-500"
            >
              Close
            </Button>
            <Button 
              variant="outline" 
              className="border-slate-700 hover:bg-slate-800 hover:text-blue-400 transition-colors"
              onClick={(e) => {
                if (selectedBallot) {
                  e.stopPropagation();
                  openInExplorer(getObjectUrl(selectedBallot.id));
                }
              }}
            >
              <ExternalLink size={14} className="mr-2" />
              View on Sui Explorer
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
