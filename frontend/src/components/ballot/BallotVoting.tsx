import { useState, useEffect } from "react";
import { useCurrentAccount, useSuiClientQuery } from "@mysten/dapp-kit";
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
  Loader2,
  FileX
} from "lucide-react";
import { getObjectUrl, openInExplorer } from "../../utils/explorerUtils";
import { motion } from "framer-motion";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { Doughnut } from "react-chartjs-2";
import { Ballot } from "../../pages/BallotPage";
import { ConnectButton } from "@mysten/dapp-kit";
import { SuiClient } from "@mysten/sui/client";
import { getNetwork } from "../../utils/networkUtils";

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
import { Input } from "../../components/ui/input";
import { generateColors } from "../../utils/chartUtils";

// Define common status types
export type BallotStatus = 'Active' | 'Delisted' | 'Expired' | 'All';
type FilterType = 'all' | 'active' | 'expired' | 'delisted';

// Mapping between status types and filter values
const statusToFilter: Record<BallotStatus, FilterType> = {
  'Active': 'active',
  'Delisted': 'delisted',
  'Expired': 'expired',
  'All': 'all'
};

// Pagination settings
const ITEMS_PER_PAGE = 9;

interface BallotVotingProps {
  ballots: Ballot[];
  isLoading: boolean;
  onViewBallot?: (ballot: Ballot) => void;
}

const BallotVoting = ({ ballots, isLoading, onViewBallot }: BallotVotingProps) => {
  const [selectedBallot, setSelectedBallot] = useState<Ballot | null>(null);
  const [showResultsDialog, setShowResultsDialog] = useState(false);
  const [hasVoted, setHasVoted] = useState<Record<string, boolean>>({});
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [results, setResults] = useState<Record<string, any>>({});
  const [showResults, setShowResults] = useState<string | null>(null);
  const [showConnectWalletDialog, setShowConnectWalletDialog] = useState(false);

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

  const handleViewResults = async (ballot: Ballot) => {
    try {
      console.log("Opening results dialog for ballot:", ballot.id, ballot);
      
      // Ensure the ballot data is valid before showing the dialog
      if (!ballot || !ballot.candidates) {
        console.error("Invalid ballot data:", ballot);
        return;
      }
      
      // Set loading state and open dialog immediately to provide visual feedback
      setSelectedBallot(ballot);
      setShowResultsDialog(true);
      
      // Try to fetch the latest data directly from blockchain 
      try {
        const client = new SuiClient({ url: `https://fullnode.${getNetwork()}.sui.io` });
        const response = await client.getObject({
          id: ballot.id,
          options: { showContent: true }
        });
        
        if (response?.data?.content?.dataType === "moveObject") {
          console.log("Got fresh ballot data from blockchain");
          const fields = response.data.content.fields as any;
          
          // Update total votes
          const totalVotes = Number(fields.total_votes || 0);
          
          // Parse candidates to get fresh vote counts
          let candidatesData = [];
          if (fields.candidates) {
            if (Array.isArray(fields.candidates)) {
              candidatesData = fields.candidates;
            } else if (fields.candidates.vec && Array.isArray(fields.candidates.vec)) {
              candidatesData = fields.candidates.vec;
            }
          }
          
          // Update each candidate's vote count
          const updatedCandidates = [...ballot.candidates];
          for (const candidate of candidatesData) {
            if (!candidate) continue;
            
            const candidateFields = candidate.fields || candidate;
            const id = Number(candidateFields.id || 0);
            const votes = Number(candidateFields.vote_count || 0);
            
            // Find and update corresponding candidate
            const index = updatedCandidates.findIndex(c => c.id === id);
            if (index >= 0) {
              updatedCandidates[index] = {
                ...updatedCandidates[index],
                votes
              };
            }
          }
          
          // Create updated ballot with fresh data
          const updatedBallot = {
            ...ballot,
            totalVotes,
            candidates: updatedCandidates
          };
          
          // Update selected ballot with fresh data
          setSelectedBallot(updatedBallot);
          console.log("Updated ballot with fresh data:", updatedBallot);
        }
      } catch (err) {
        console.error("Failed to fetch fresh ballot data:", err);
        // Continue with existing data
      }
      
      // Log vote counts for debugging
      if (ballot.candidates.length > 0) {
        console.log("Candidate vote counts:");
        ballot.candidates.forEach(c => {
          console.log(`- ${c.name}: ${c.votes} votes`);
        });
        console.log(`Total votes: ${ballot.totalVotes}`);
      }
      
      // Force a re-render of the chart after dialog opens
      setTimeout(() => {
        const chartData = getChartData(selectedBallot || ballot);
        console.log("Chart data prepared:", chartData);
      }, 100);
    } catch (error) {
      console.error("Error opening results dialog:", error);
    }
  };

  const getChartData = (ballot: Ballot) => {
    try {
      // Ensure ballot has valid candidates
      if (!ballot?.candidates || !Array.isArray(ballot.candidates) || ballot.candidates.length === 0) {
        console.warn("No valid candidates found for chart data:", ballot);
        return {
          labels: ["No Data"],
          datasets: [{
            data: [1],
            backgroundColor: ["#64748b"],
            borderWidth: 0
          }]
        };
      }
      
      // Filter out candidates with no votes for better visualization if there's at least one with votes
      const candidatesWithVotes = ballot.candidates.filter(c => c.votes > 0);
      
      // If all candidates have zero votes but the total is greater than zero, use all candidates
      // This handles possible data inconsistency
      const candidatesToUse = 
        (candidatesWithVotes.length === 0 && ballot.totalVotes > 0) 
          ? ballot.candidates 
          : (candidatesWithVotes.length > 0 ? candidatesWithVotes : ballot.candidates);
      
      console.log("Using candidates for chart:", candidatesToUse.map(c => `${c.name}: ${c.votes}`));
      
      const labels = candidatesToUse.map(c => c.name || "Unnamed Candidate");
      const data = candidatesToUse.map(c => c.votes || 0);
      
      // Handle case where we have totalVotes but individual votes are zero
      if (data.every(v => v === 0) && ballot.totalVotes > 0) {
        console.log("All candidates have zero votes but total is positive. Adding placeholder data.");
        return {
          labels: ["Unallocated Votes", ...labels],
          datasets: [{
            data: [ballot.totalVotes, ...data],
            backgroundColor: ["#94a3b8", ...generateColors(candidatesToUse.length).backgroundColor],
            borderWidth: 0
          }]
        };
      }
      
      const { backgroundColor } = generateColors(candidatesToUse.length);
      
      console.log("Chart data generated:", { labels, data, totalVotes: ballot.totalVotes });
      
      return {
        labels,
        datasets: [{
          data,
          backgroundColor,
          borderWidth: 0
        }]
      };
    } catch (error) {
      console.error("Error generating chart data:", error);
      // Return fallback data
      return {
        labels: ["Error"],
        datasets: [{
          data: [1],
          backgroundColor: ["#ef4444"],
          borderWidth: 0
        }]
      };
    }
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

  // Calculate pagination
  const totalPages = Math.ceil(filteredBallots.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedBallots = filteredBallots.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  
  // Handle page change
  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // New function to handle vote button click
  const handleVoteClick = (ballot: Ballot) => {
    if (!account) {
      setShowConnectWalletDialog(true);
    } else if (onViewBallot) {
      onViewBallot(ballot);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12">
        <Loader2 className="h-12 w-12 animate-spin text-blue-500 mb-4" />
        <p className="text-xl text-slate-300">Loading ballots...</p>
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
    <div className="space-y-6">
      {/* Filter controls */}
      <div className="flex flex-wrap items-center gap-4 mb-6 bg-slate-900/50 p-4 rounded-lg border border-slate-800">
        <div className="flex-grow">
          <Input
            placeholder="Search ballots..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
          />
        </div>
        
        <div className="flex flex-wrap gap-2">
          {(['All', 'Active', 'Expired', 'Delisted'] as const).map((status) => {
            // Determine button styling based on filter state
            let buttonStyle = 'border-slate-700 text-slate-300 hover:bg-slate-800';
            
            if (activeFilter === statusToFilter[status]) {
              if (status === 'Active') {
                buttonStyle = 'bg-blue-600 hover:bg-blue-700';
              } else if (status === 'Expired') {
                buttonStyle = 'bg-amber-600 hover:bg-amber-700';
              } else if (status === 'Delisted') {
                buttonStyle = 'bg-red-600 hover:bg-red-700';
              } else {
                buttonStyle = 'bg-slate-600 hover:bg-slate-700';
              }
            }
            
            return (
              <Button
                key={status}
                variant={activeFilter === statusToFilter[status] ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveFilter(statusToFilter[status])}
                className={buttonStyle}
              >
                {status}
                {status !== 'All' && (
                  <span className="ml-1.5 inline-flex items-center justify-center px-1.5 py-0.5 text-xs bg-black/20 rounded-full">
                    {ballots.filter(b => b.status === status).length}
                  </span>
                )}
              </Button>
            );
          })}
        </div>
      </div>
      
      {/* Results summary */}
      <div className="flex justify-between items-center text-sm mb-4">
        <div className="text-white">
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
    
      {filteredBallots.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <div className="h-20 w-20 rounded-full bg-slate-800 flex items-center justify-center mb-4">
            <FileX className="h-10 w-10 text-slate-500" />
          </div>
          <h3 className="text-xl font-medium text-white mb-2">No Ballots Found</h3>
          <p className="text-slate-400 max-w-md">
            {searchQuery ? 
              `No ballots matching "${searchQuery}" were found.` : 
              "There are no ballots available with the selected filter."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xs:grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {paginatedBallots.map((ballot) => {
            // Check if ballot is expired
            const isExpired = ballot.status === 'Expired' || 
              (ballot.status === 'Active' && ballot.expiration < Date.now());
            
            // Check if user has already voted
            const userVoted = hasVoted[ballot.id];
            
            // For UI purposes - always allow viewing results, but show Vote Now for active ballots user hasn't voted on
            const showVoteButton = ballot.status === 'Active' && !userVoted;
            
            return (
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
                      {/* Always show View Results button */}
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="border-slate-700 hover:bg-slate-800 hover:text-blue-400 transition-colors"
                        onClick={() => handleViewResults(ballot)}
                      >
                        <PieChart className="h-4 w-4 mr-1" />
                        View Results
                      </Button>
                      
                      {/* Only show Vote button for active ballots where user hasn't voted */}
                      {showVoteButton && (
                        <Button 
                          variant="default" 
                          size="sm" 
                          className="bg-gradient-to-r from-blue-600 to-blue-700"
                          onClick={() => handleVoteClick(ballot)}
                          disabled={!account}
                        >
                          <Vote className="h-4 w-4 mr-2" />
                          {account ? "Vote Now" : "Connect to Vote"}
                        </Button>
                      )}
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
            );
          })}
        </div>
      )}
      
      {/* Pagination controls */}
      {totalPages > 1 && (
        <div className="flex justify-center mt-8">
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="border-slate-700 text-slate-300 hover:bg-slate-800"
            >
              Previous
            </Button>
            
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <Button
                key={page}
                variant={currentPage === page ? "default" : "outline"}
                size="sm"
                onClick={() => handlePageChange(page)}
                className={currentPage === page 
                  ? "bg-blue-600 hover:bg-blue-700" 
                  : "border-slate-700 text-slate-300 hover:bg-slate-800"
                }
              >
                {page}
              </Button>
            ))}
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="border-slate-700 text-slate-300 hover:bg-slate-800"
            >
              Next
            </Button>
          </div>
        </div>
      )}

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
                    key={`chart-${selectedBallot.id}-${selectedBallot.totalVotes}`}
                    data={getChartData(selectedBallot)} 
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      animation: {
                        duration: 500
                      },
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
                        },
                        tooltip: {
                          callbacks: {
                            label: (context) => {
                              const label = context.label || '';
                              const value = context.raw || 0;
                              const dataset = context.dataset;
                              const total = dataset.data.reduce((acc: number, data: number) => acc + data, 0);
                              const percentage = total === 0 ? 0 : Math.round((value as number / total) * 100);
                              return `${label}: ${value} votes (${percentage}%)`;
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

      {/* Add a connect wallet dialog */}
      <Dialog open={showConnectWalletDialog} onOpenChange={setShowConnectWalletDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Connect Your Wallet</DialogTitle>
            <DialogDescription>
              You need to connect your wallet to vote on ballots.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center py-6">
            <ConnectButton className="w-full" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConnectWalletDialog(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BallotVoting;
