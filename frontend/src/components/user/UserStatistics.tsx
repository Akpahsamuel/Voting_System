import { useSuiClientQuery } from "@mysten/dapp-kit";
import { useCurrentAccount } from "@mysten/dapp-kit";
import { SuiObjectData, SuiObjectResponse } from "@mysten/sui/client";
import { useEffect, useState } from "react";
import { VoteNft } from "../../types";
import {
  Chart as ChartJS,
  ArcElement,
  CategoryScale,
  LinearScale,
  PointElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "../ui/card";
import { Badge } from "../ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Progress } from "../ui/progress";
import { Separator } from "../ui/separator";
import {
  ChevronUpIcon,
  TrendingUpIcon,
  UserIcon,
  BarChart3Icon,
  PieChartIcon,
  CheckCircleIcon,
  XCircleIcon,
  InfoIcon
} from "lucide-react";
import { motion } from "framer-motion";
import { Tooltip as ReactTooltip } from "../ui/tooltip";
import { TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";

// Register Chart.js components
ChartJS.register(
  ArcElement,
  CategoryScale,
  LinearScale,
  PointElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface UserStatisticsProps {
  proposalIds: string[];
  userVoteNfts: VoteNft[];
}

interface ProposalData {
  id: string;
  title: string;
  votedYesCount: number;
  votedNoCount: number;
  expiration: number;
  status: string;
}

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

const UserStatistics: React.FC<UserStatisticsProps> = ({ proposalIds, userVoteNfts }) => {
  const [proposals, setProposals] = useState<ProposalData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const account = useCurrentAccount();
  
  // Fetch all proposals
  const { data: proposalsData, isLoading: proposalsLoading } = useSuiClientQuery(
    "multiGetObjects",
    {
      ids: proposalIds,
      options: {
        showContent: true,
      },
    }
  );
  
  // Process proposal data when it changes
  useEffect(() => {
    if (proposalsLoading) {
      setIsLoading(true);
      return;
    }
    
    if (!proposalsData || !Array.isArray(proposalsData)) {
      setIsLoading(false);
      return;
    }
    
    const parsedProposals = proposalsData
      .map((item: SuiObjectResponse) => {
        if (!item.data) return null;
        const obj = item.data as SuiObjectData;
        if (obj.content?.dataType !== "moveObject") return null;
        
        const fields = obj.content.fields as any;
        return {
          id: obj.objectId,
          title: fields.title,
          votedYesCount: Number(fields.voted_yes_count),
          votedNoCount: Number(fields.voted_no_count),
          expiration: Number(fields.expiration),
          status: fields.status.variant
        };
      })
      .filter(Boolean) as ProposalData[];
    
    setProposals(parsedProposals);
    setIsLoading(false);
  }, [proposalsData, proposalsLoading]);
  
  // Calculate statistics
  const totalProposals = proposals.length;
  const activeProposals = proposals.filter(p => p.status === 'Active').length;
  
  const totalVotesYes = proposals.reduce((sum, p) => sum + p.votedYesCount, 0);
  const totalVotesNo = proposals.reduce((sum, p) => sum + p.votedNoCount, 0);
  const totalVotes = totalVotesYes + totalVotesNo;
  
  // User participation
  const userVotedCount = userVoteNfts.length;
  const userParticipationRate = totalProposals > 0 ? (userVotedCount / totalProposals) * 100 : 0;
  
  // Current date to check for expired proposals
  const now = new Date().getTime();
  const expiredProposals = proposals.filter(p => p.expiration < now).length;
  const activeAndNotExpired = proposals.filter(p => p.status === 'Active' && p.expiration >= now).length;
  
  // Vote distribution data
  const voteDistributionData = {
    labels: ['Yes Votes', 'No Votes'],
    datasets: [
      {
        label: 'Vote Distribution',
        data: [totalVotesYes, totalVotesNo],
        backgroundColor: [
          'rgba(74, 222, 128, 0.7)',  // Green for Yes
          'rgba(248, 113, 113, 0.7)',  // Red for No
        ],
        borderColor: [
          'rgba(74, 222, 128, 1)', 
          'rgba(248, 113, 113, 1)',
        ],
        borderWidth: 1,
      },
    ],
  };
  
  // Top proposals by votes 
  const topProposalsByVotes = [...proposals]
    .sort((a, b) => (b.votedYesCount + b.votedNoCount) - (a.votedYesCount + a.votedNoCount))
    .slice(0, 3);
  
  const topProposalsData = {
    labels: topProposalsByVotes.map(p => p.title.length > 15 ? p.title.substring(0, 15) + '...' : p.title),
    datasets: [
      {
        label: 'Yes Votes',
        data: topProposalsByVotes.map(p => p.votedYesCount),
        backgroundColor: 'rgba(74, 222, 128, 0.7)',
        borderColor: 'rgba(74, 222, 128, 1)',
        borderWidth: 1,
      },
      {
        label: 'No Votes',
        data: topProposalsByVotes.map(p => p.votedNoCount),
        backgroundColor: 'rgba(248, 113, 113, 0.7)',
        borderColor: 'rgba(248, 113, 113, 1)',
        borderWidth: 1,
      },
    ],
  };

  // Get user voting status
  const getUserStatus = () => {
    if (!account) return 'Not Connected';
    if (userVotedCount === 0) return 'Not Voted';
    if (userVotedCount < totalProposals * 0.3) return 'Casual Voter';
    if (userVotedCount < totalProposals * 0.7) return 'Active Voter';
    return 'Power Voter';
  };

  const userStatus = getUserStatus();
  const userStatusColor = () => {
    switch (userStatus) {
      case 'Not Connected': return 'text-gray-400';
      case 'Not Voted': return 'text-orange-400';
      case 'Casual Voter': return 'text-blue-400';
      case 'Active Voter': return 'text-green-400';
      case 'Power Voter': return 'text-purple-400';
      default: return 'text-gray-400';
    }
  };
  
  if (isLoading) {
    return (
      <div className="w-full h-64 flex items-center justify-center">
        <div className="animate-spin h-12 w-12 rounded-full border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <motion.div 
      initial="hidden"
      animate="visible"
      variants={fadeIn}
      transition={{ duration: 0.5 }}
      className="w-full"
    >
      <div className="pb-2">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4">
          <div>
            <h3 className="text-xl font-bold flex items-center gap-2 text-white">
              <BarChart3Icon className="h-5 w-5 text-blue-400" />
              Governance Dashboard
            </h3>
            <p className="text-white/70 text-sm">
              Your voting statistics and governance participation
            </p>
          </div>
          <Badge className="mt-2 md:mt-0 bg-blue-900/50 text-blue-300 border-blue-700/50">
            {totalProposals} Total Proposals
          </Badge>
        </div>

        <Tabs defaultValue="overview" className="">
          <TabsList className="bg-white/10 mb-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="analytics">Detailed Analytics</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white/10 backdrop-blur-sm p-3 rounded-lg border border-white/10">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-400"></div>
                  <p className="text-xs text-white/70">Active Proposals</p>
                </div>
                <p className="text-xl font-bold text-white mt-1">{activeAndNotExpired}</p>
              </div>
              
              <div className="bg-white/10 backdrop-blur-sm p-3 rounded-lg border border-white/10">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                  <p className="text-xs text-white/70">Total Votes</p>
                </div>
                <p className="text-xl font-bold text-white mt-1">{totalVotes}</p>
              </div>
              
              <div className="bg-white/10 backdrop-blur-sm p-3 rounded-lg border border-white/10">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-400"></div>
                  <p className="text-xs text-white/70">Yes Votes</p>
                </div>
                <p className="text-xl font-bold text-white mt-1">{totalVotesYes}</p>
              </div>
              
              <div className="bg-white/10 backdrop-blur-sm p-3 rounded-lg border border-white/10">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-400"></div>
                  <p className="text-xs text-white/70">No Votes</p>
                </div>
                <p className="text-xl font-bold text-white mt-1">{totalVotesNo}</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {account ? (
                <div className="bg-white/10 backdrop-blur-sm p-4 rounded-lg border border-white/10">
                  <h4 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                    <UserIcon className="h-4 w-4 text-blue-400" />
                    Your Participation
                  </h4>
                  
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white/70 text-sm">Votes Cast</span>
                    <span className="text-blue-400 font-medium">{userVotedCount} / {totalProposals}</span>
                  </div>
                  
                  <Progress value={userParticipationRate} className="h-1.5 mb-4" />
                  
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="text-sm text-white/70">Status</span>
                      <p className={`font-medium ${userStatusColor()}`}>{userStatus}</p>
                    </div>
                    
                    <Badge variant="outline" className="bg-white/10 border-white/10">
                      {userParticipationRate.toFixed(0)}% Participation
                    </Badge>
                  </div>
                </div>
              ) : (
                <div className="bg-white/10 backdrop-blur-sm p-4 rounded-lg border border-white/10 flex flex-col items-center justify-center text-center">
                  <UserIcon className="h-8 w-8 text-blue-400 mb-2" />
                  <h4 className="text-white font-medium mb-1">Connect Your Wallet</h4>
                  <p className="text-white/70 text-sm mb-4">Connect your wallet to see your voting statistics</p>
                </div>
              )}
              
              <div className="bg-white/10 backdrop-blur-sm p-4 rounded-lg border border-white/10">
                <h4 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                  <PieChartIcon className="h-4 w-4 text-blue-400" />
                  Vote Distribution
                </h4>
                
                <div className="h-[180px] flex items-center justify-center">
                  <Pie 
                    data={voteDistributionData} 
                    options={{ 
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          position: 'right',
                          labels: {
                            color: 'white',
                            font: {
                              size: 12
                            }
                          }
                        }
                      }
                    }} 
                  />
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="analytics">
            <div className="bg-white/10 backdrop-blur-sm p-4 rounded-lg border border-white/10 mb-6">
              <h4 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                <TrendingUpIcon className="h-4 w-4 text-blue-400" />
                Most Active Proposals
              </h4>
              
              <div className="h-[220px]">
                <Bar 
                  data={topProposalsData} 
                  options={{ 
                    maintainAspectRatio: false,
                    scales: {
                      y: {
                        stacked: false,
                        ticks: {
                          color: 'rgba(255, 255, 255, 0.7)'
                        },
                        grid: {
                          color: 'rgba(255, 255, 255, 0.1)'
                        }
                      },
                      x: {
                        stacked: false,
                        ticks: {
                          color: 'rgba(255, 255, 255, 0.7)'
                        },
                        grid: {
                          display: false
                        }
                      }
                    },
                    plugins: {
                      legend: {
                        position: 'top',
                        labels: {
                          color: 'white',
                          font: {
                            size: 12
                          }
                        }
                      }
                    }
                  }}
                />
              </div>
            </div>
            
            <div className="bg-white/10 backdrop-blur-sm p-4 rounded-lg border border-white/10">
              <h4 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                <InfoIcon className="h-4 w-4 text-blue-400" />
                Proposal Status Breakdown
              </h4>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-white/10">
                  <thead>
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-white/70 uppercase tracking-wider">Status</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-white/70 uppercase tracking-wider">Count</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-white/70 uppercase tracking-wider">Percentage</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    <tr>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-2 h-2 rounded-full bg-green-400 mr-2"></div>
                          <span className="text-white">Active</span>
                        </div>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-white">
                        {activeAndNotExpired}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-white">
                        {totalProposals > 0 ? ((activeAndNotExpired / totalProposals) * 100).toFixed(1) : 0}%
                      </td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-2 h-2 rounded-full bg-yellow-400 mr-2"></div>
                          <span className="text-white">Expired</span>
                        </div>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-white">
                        {expiredProposals}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-white">
                        {totalProposals > 0 ? ((expiredProposals / totalProposals) * 100).toFixed(1) : 0}%
                      </td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-2 h-2 rounded-full bg-red-400 mr-2"></div>
                          <span className="text-white">Delisted</span>
                        </div>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-white">
                        {proposals.filter(p => p.status === 'Delisted').length}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-white">
                        {totalProposals > 0 ? ((proposals.filter(p => p.status === 'Delisted').length / totalProposals) * 100).toFixed(1) : 0}%
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </motion.div>
  );
};

export default UserStatistics;
