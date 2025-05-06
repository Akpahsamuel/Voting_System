import { FC } from "react";
import { motion } from "framer-motion";
import { Vote, PieChart, Percent as PercentIcon, FileText, Users, ThumbsUp, ThumbsDown, ExternalLink } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "../ui/card";
import { Button } from "../ui/button";
import { Doughnut } from "react-chartjs-2";

interface VoteNft {
  proposalId: string;
  voteYes?: boolean;
  id?: any;
  url?: string;
}

interface VotingStatisticsPanelProps {
  proposals: any[];
  userVoteNfts: VoteNft[];
  totalVotes: number;
  totalYesVotes: number;
  totalNoVotes: number;
  yesPercentage: number;
  noPercentage: number;
  activeProposals: number;
  delistedProposals: number;
  participationRate: number;
}

// Generate colors for chart
const generateColors = (count: number) => {
  const baseColors = [
    { bg: 'rgba(34, 197, 94, 0.7)', border: 'rgba(34, 197, 94, 1)' }, // Green
    { bg: 'rgba(239, 68, 68, 0.7)', border: 'rgba(239, 68, 68, 1)' }, // Red
  ];
  
  return {
    backgroundColor: [baseColors[0].bg, baseColors[1].bg],
    borderColor: [baseColors[0].border, baseColors[1].border]
  };
};

const VotingStatisticsPanel: FC<VotingStatisticsPanelProps> = ({
  proposals,
  userVoteNfts,
  totalVotes,
  totalYesVotes,
  totalNoVotes,
  yesPercentage,
  noPercentage,
  activeProposals,
  delistedProposals,
  participationRate
}) => {
  
  // Function to generate chart data
  const getChartData = () => {
    const colors = generateColors(2);
    
    return {
      labels: ['Yes Votes', 'No Votes'],
      datasets: [
        {
          data: [totalYesVotes, totalNoVotes],
          backgroundColor: colors.backgroundColor,
          borderColor: colors.borderColor,
          borderWidth: 1,
        },
      ],
    };
  };
  
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <Card className="bg-black/40 backdrop-blur-md border-white/20">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-medium text-white">Total Votes</CardTitle>
                <Vote className="h-4 w-4 text-blue-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">{totalVotes}</div>
              <p className="text-sm text-muted-foreground mt-1">
                Across all proposals
              </p>
              
              <div className="grid grid-cols-2 gap-2 mt-4">
                <div className="bg-green-900/30 p-2 sm:p-3 rounded-lg border border-green-900/40">
                  <p className="text-xs text-green-300 mb-1 font-medium">Yes Votes</p>
                  <p className="text-lg sm:text-xl font-semibold text-green-200">{totalYesVotes}</p>
                </div>
                <div className="bg-red-900/30 p-2 sm:p-3 rounded-lg border border-red-900/40">
                  <p className="text-xs text-red-300 mb-1 font-medium">No Votes</p>
                  <p className="text-lg sm:text-xl font-semibold text-red-200">{totalNoVotes}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <Card className="bg-black/40 backdrop-blur-md border-white/20">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-medium text-white">Vote Percentage</CardTitle>
                <PercentIcon className="h-4 w-4 text-blue-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">{yesPercentage}%</div>
              <p className="text-sm text-muted-foreground mt-1">
                Yes vote percentage
              </p>
              
              <div className="mt-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-white/70">Yes</span>
                    <span className="text-green-400 font-medium">{yesPercentage}%</span>
                  </div>
                  <div className="w-full h-2 bg-black/40 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-green-500 to-green-400" 
                      style={{ width: `${yesPercentage}%` }}
                    />
                  </div>
                </div>
                
                <div className="space-y-2 mt-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-white/70">No</span>
                    <span className="text-red-400 font-medium">{noPercentage}%</span>
                  </div>
                  <div className="w-full h-2 bg-black/40 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-red-500 to-red-400" 
                      style={{ width: `${noPercentage}%` }}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
        >
          <Card className="bg-black/40 backdrop-blur-md border-white/20">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-medium text-white">Proposal Status</CardTitle>
                <FileText className="h-4 w-4 text-blue-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">{proposals.length}</div>
              <p className="text-sm text-muted-foreground mt-1">
                Total proposals
              </p>
              
              <div className="grid grid-cols-2 gap-2 mt-4">
                <div className="bg-blue-900/30 p-2 sm:p-3 rounded-lg border border-blue-900/40">
                  <p className="text-xs text-blue-300 mb-1 font-medium">Active</p>
                  <p className="text-lg sm:text-xl font-semibold text-blue-200">{activeProposals}</p>
                </div>
                <div className="bg-amber-900/30 p-2 sm:p-3 rounded-lg border border-amber-900/40">
                  <p className="text-xs text-amber-300 mb-1 font-medium">Delisted</p>
                  <p className="text-lg sm:text-xl font-semibold text-amber-200">{delistedProposals}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.4 }}
        >
          <Card className="bg-black/40 backdrop-blur-md border-white/20">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-medium text-white">User Engagement</CardTitle>
                <Users className="h-4 w-4 text-blue-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">{userVoteNfts.length}</div>
              <p className="text-sm text-muted-foreground mt-1">
                Your votes cast
              </p>
              
              <div className="mt-4 bg-blue-900/30 p-2 sm:p-3 rounded-lg border border-blue-900/40">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-blue-300 font-medium">Participation Rate</p>
                  <p className="text-sm font-semibold text-white">
                    {participationRate}%
                  </p>
                </div>
                <div className="w-full h-2 bg-black/40 rounded-full overflow-hidden mt-2">
                  <div 
                    className="h-full bg-gradient-to-r from-blue-500 to-purple-500" 
                    style={{ width: `${participationRate}%` }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.5 }}
        >
          <Card className="bg-black/40 backdrop-blur-md border-white/20">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-medium text-white">Vote Distribution</CardTitle>
                <PieChart className="h-4 w-4 text-blue-400" />
              </div>
              <CardDescription>
                Breakdown of yes vs. no votes across all proposals
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <Doughnut 
                  data={getChartData()} 
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: '70%',
                    plugins: {
                      legend: {
                        position: 'bottom',
                        labels: {
                          color: 'rgb(203, 213, 225)',
                          padding: 15,
                          font: {
                            size: 12
                          }
                        }
                      }
                    }
                  }} 
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.6 }}
        >
          <Card className="bg-black/40 backdrop-blur-md border-white/20">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-medium text-white">Your Recent Votes</CardTitle>
                <Vote className="h-4 w-4 text-blue-400" />
              </div>
              <CardDescription>
                The most recent proposals you've voted on
              </CardDescription>
            </CardHeader>
            <CardContent>
              {userVoteNfts.length > 0 ? (
                <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                  {userVoteNfts.slice(0, 5).map((nft, index) => (
                    <div key={index} className="p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center ${nft.voteYes ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'}`}>
                          {nft.voteYes ? <ThumbsUp className="h-4 w-4" /> : <ThumbsDown className="h-4 w-4" />}
                        </div>
                        <div className="overflow-hidden">
                          <p className="text-sm font-medium text-white truncate max-w-[160px] sm:max-w-[200px]">
                            Proposal ID: {nft.proposalId.substring(0, 6)}...
                          </p>
                          <p className="text-xs text-white/60">
                            Voted: {nft.voteYes ? 'Yes' : 'No'}
                          </p>
                        </div>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 rounded-full hover:bg-white/10"
                        onClick={() => window.open(`/proposal/${nft.proposalId}`, '_blank')}
                      >
                        <ExternalLink className="h-4 w-4 text-blue-400" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-64 bg-white/5 rounded-lg p-6 text-center">
                  <Vote className="h-12 w-12 text-white/20 mb-2" />
                  <p className="text-white/70">You haven't voted on any proposals yet</p>
                  <p className="text-sm text-white/50 mt-1">Vote on proposals to see your voting history here</p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </>
  );
};

export default VotingStatisticsPanel; 