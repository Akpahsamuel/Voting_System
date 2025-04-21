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
          'rgba(34, 197, 94, 0.7)',  // Green for Yes
          'rgba(239, 68, 68, 0.7)',  // Red for No
        ],
        borderColor: [
          'rgba(34, 197, 94, 1)', 
          'rgba(239, 68, 68, 1)',
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
        backgroundColor: 'rgba(34, 197, 94, 0.7)',
        borderColor: 'rgba(34, 197, 94, 1)',
        borderWidth: 1,
      },
      {
        label: 'No Votes',
        data: topProposalsByVotes.map(p => p.votedNoCount),
        backgroundColor: 'rgba(239, 68, 68, 0.7)',
        borderColor: 'rgba(239, 68, 68, 1)',
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
      case 'Not Connected': return 'text-gray-500';
      case 'Not Voted': return 'text-orange-500';
      case 'Casual Voter': return 'text-blue-500';
      case 'Active Voter': return 'text-green-500';
      case 'Power Voter': return 'text-purple-500';
      default: return 'text-gray-500';
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
      <Card className="shadow-lg border-0 bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-800 overflow-hidden">
        <CardHeader className="pb-2">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
            <div>
              <CardTitle className="text-2xl font-bold flex items-center gap-2">
                <BarChart3Icon className="h-6 w-6 text-blue-500" />
                Governance Dashboard
              </CardTitle>
              <CardDescription className="text-gray-500 dark:text-gray-400">
                Your voting statistics and governance participation
              </CardDescription>
            </div>
            <Badge variant="outline" className="mt-2 md:mt-0 bg-blue-50 text-blue-700 dark:bg-blue-900 dark:text-blue-200 border-blue-200 dark:border-blue-800">
              {totalProposals} Total Proposals
            </Badge>
          </div>
        </CardHeader>

        <Tabs defaultValue="overview" className="px-1">
          <div className="px-5">
            <TabsList className="w-full md:w-auto grid grid-cols-2 md:inline-flex h-auto p-1">
              <TabsTrigger value="overview" className="py-2 data-[state=active]:bg-blue-500 data-[state=active]:text-white">
                Overview
              </TabsTrigger>
              <TabsTrigger value="analytics" className="py-2 data-[state=active]:bg-blue-500 data-[state=active]:text-white">
                Detailed Analytics
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="overview" className="mt-6 px-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* User Stats Card */}
              <Card className="lg:col-span-3 border shadow-sm bg-white dark:bg-gray-800 hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <UserIcon className="h-5 w-5 text-blue-500" />
                    Your Participation
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col space-y-6">
                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Proposals Voted</span>
                        <TooltipProvider>
                          <ReactTooltip>
                            <TooltipTrigger asChild>
                              <span className="text-sm font-medium text-blue-500 flex items-center">
                                {userVotedCount} of {totalProposals}
                                <InfoIcon className="h-3 w-3 ml-1" />
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs">You've voted on {userParticipationRate.toFixed(1)}% of all proposals</p>
                            </TooltipContent>
                          </ReactTooltip>
                        </TooltipProvider>
                      </div>
                      <Progress value={userParticipationRate} className="h-2" />
                    </div>
                    
                    <motion.div 
                      whileHover={{ scale: 1.03 }}
                      transition={{ type: "spring", stiffness: 400, damping: 10 }}
                      className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-700 dark:to-gray-600 rounded-lg p-4 text-center"
                    >
                      <p className="text-sm text-gray-500 dark:text-gray-400">Active Proposals</p>
                      <p className="text-2xl font-bold text-blue-500">
                        {activeAndNotExpired} <span className="text-sm font-normal">/ {totalProposals}</span>
                      </p>
                      <div className="mt-2 h-1 w-full bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-blue-500 rounded-full" 
                          style={{ width: `${(activeAndNotExpired/totalProposals) * 100}%` }}
                        ></div>
                      </div>
                    </motion.div>
                    
                    <motion.div 
                      whileHover={{ scale: 1.03 }}
                      transition={{ type: "spring", stiffness: 400, damping: 10 }}
                      className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-700 dark:to-gray-600 rounded-lg p-4 text-center"
                    >
                      <p className="text-sm text-gray-500 dark:text-gray-400">Your Status</p>
                      <p className={`text-2xl font-bold ${userStatusColor()}`}>
                        {userStatus}
                      </p>
                      {userStatus !== 'Not Connected' && userStatus !== 'Not Voted' && (
                        <p className="text-xs mt-1 text-gray-500">
                          {userVotedCount} votes recorded
                        </p>
                      )}
                    </motion.div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Vote Distribution Card */}
              <Card className="lg:col-span-3 border shadow-sm bg-white dark:bg-gray-800 hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <PieChartIcon className="h-5 w-5 text-green-500" />
                    Vote Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-48 md:h-56 flex items-center justify-center">
                    <Pie 
                      data={voteDistributionData} 
                      options={{ 
                        maintainAspectRatio: false,
                        plugins: {
                          legend: {
                            position: 'bottom',
                            labels: {
                              usePointStyle: true,
                              boxWidth: 8
                            }
                          }
                        }
                      }} 
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div className="text-center bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
                      <div className="flex items-center justify-center gap-1">
                        <CheckCircleIcon className="h-4 w-4 text-green-500" />
                        <p className="text-xs text-gray-500 dark:text-gray-400">Yes Votes</p>
                      </div>
                      <p className="text-xl font-bold text-green-500">{totalVotesYes}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {totalVotes > 0 ? `${((totalVotesYes / totalVotes) * 100).toFixed(1)}%` : '0%'}
                      </p>
                    </div>
                    <div className="text-center bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
                      <div className="flex items-center justify-center gap-1">
                        <XCircleIcon className="h-4 w-4 text-red-500" />
                        <p className="text-xs text-gray-500 dark:text-gray-400">No Votes</p>
                      </div>
                      <p className="text-xl font-bold text-red-500">{totalVotesNo}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {totalVotes > 0 ? `${((totalVotesNo / totalVotes) * 100).toFixed(1)}%` : '0%'} 
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Top Voted Proposals */}
              <Card className="lg:col-span-6 border shadow-sm bg-white dark:bg-gray-800 hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <TrendingUpIcon className="h-5 w-5 text-indigo-500" />
                    Popular Proposals
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-60">
                    <Bar 
                      data={topProposalsData}
                      options={{ 
                        maintainAspectRatio: false,
                        plugins: {
                          legend: {
                            position: 'bottom',
                            labels: {
                              usePointStyle: true,
                              boxWidth: 8
                            }
                          },
                          tooltip: {
                            callbacks: {
                              title: function(context) {
                                const index = context[0].dataIndex;
                                return topProposalsByVotes[index].title;
                              }
                            }
                          }
                        },
                        scales: {
                          y: {
                            beginAtZero: true,
                            grid: {
                              color: 'rgba(200, 200, 200, 0.2)',
                            }
                          },
                          x: {
                            grid: {
                              display: false
                            }
                          }
                        }
                      }}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <Separator className="my-6" />
            
            {/* Stats Cards Bottom Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <motion.div 
                whileHover={{ y: -5 }}
                transition={{ type: "spring", stiffness: 400, damping: 10 }}
                className="bg-white dark:bg-gray-800 rounded-xl p-5 border shadow-sm hover:shadow-md transition-all"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Total Proposals</p>
                  <div className="h-8 w-8 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                    <ChevronUpIcon className="h-5 w-5 text-blue-500" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-2">{totalProposals}</p>
                <div className="mt-2 h-1 w-full bg-blue-100 dark:bg-blue-900/30 rounded-full"></div>
              </motion.div>
              
              <motion.div 
                whileHover={{ y: -5 }}
                transition={{ type: "spring", stiffness: 400, damping: 10 }}
                className="bg-white dark:bg-gray-800 rounded-xl p-5 border shadow-sm hover:shadow-md transition-all"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Active Proposals</p>
                  <div className="h-8 w-8 rounded-full bg-green-50 dark:bg-green-900/20 flex items-center justify-center">
                    <ChevronUpIcon className="h-5 w-5 text-green-500" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-green-500 mt-2">{activeProposals}</p>
                <div className="mt-2 h-1 w-full bg-green-100 dark:bg-green-900/30 rounded-full"></div>
              </motion.div>
              
              <motion.div 
                whileHover={{ y: -5 }}
                transition={{ type: "spring", stiffness: 400, damping: 10 }}
                className="bg-white dark:bg-gray-800 rounded-xl p-5 border shadow-sm hover:shadow-md transition-all"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Total Votes</p>
                  <div className="h-8 w-8 rounded-full bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center">
                    <ChevronUpIcon className="h-5 w-5 text-purple-500" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-2">{totalVotes}</p>
                <div className="mt-2 h-1 w-full bg-purple-100 dark:bg-purple-900/30 rounded-full"></div>
              </motion.div>
              
              <motion.div 
                whileHover={{ y: -5 }}
                transition={{ type: "spring", stiffness: 400, damping: 10 }}
                className="bg-white dark:bg-gray-800 rounded-xl p-5 border shadow-sm hover:shadow-md transition-all"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Avg. Votes/Proposal</p>
                  <div className="h-8 w-8 rounded-full bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center">
                    <ChevronUpIcon className="h-5 w-5 text-indigo-500" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-indigo-500 mt-2">
                  {totalVotes > 0 && totalProposals > 0 ? ((totalVotes / totalProposals).toFixed(1)) : '0'}
                </p>
                <div className="mt-2 h-1 w-full bg-indigo-100 dark:bg-indigo-900/30 rounded-full"></div>
              </motion.div>
            </div>
          </TabsContent>
          
          <TabsContent value="analytics" className="mt-6 px-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <Card className="border shadow-sm bg-white dark:bg-gray-800 hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle className="text-lg">Proposal Status Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Active</span>
                        <span className="text-sm font-medium text-green-500">{activeProposals} of {totalProposals}</span>
                      </div>
                      <Progress value={(activeProposals/totalProposals) * 100} className="h-2 bg-gray-200" indicatorClassName="bg-green-500" />
                    </div>
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Expired</span>
                        <span className="text-sm font-medium text-orange-500">{expiredProposals} of {totalProposals}</span>
                      </div>
                      <Progress value={(expiredProposals/totalProposals) * 100} className="h-2 bg-gray-200" indicatorClassName="bg-orange-500" />
                    </div>
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Active & Not Expired</span>
                        <span className="text-sm font-medium text-blue-500">{activeAndNotExpired} of {totalProposals}</span>
                      </div>
                      <Progress value={(activeAndNotExpired/totalProposals) * 100} className="h-2 bg-gray-200" indicatorClassName="bg-blue-500" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="border shadow-sm bg-white dark:bg-gray-800 hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle className="text-lg">Your Voting Metrics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                      <p className="text-sm text-gray-500 dark:text-gray-400">Participation Rate</p>
                      <p className="text-2xl font-bold text-blue-500">{userParticipationRate.toFixed(1)}%</p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                      <p className="text-sm text-gray-500 dark:text-gray-400">Remaining to Vote</p>
                      <p className="text-2xl font-bold text-indigo-500">{totalProposals - userVotedCount}</p>
                    </div>
                  </div>
                  
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Voting Impact Factor</p>
                    <div className="flex items-end gap-2">
                      <p className="text-2xl font-bold text-blue-500">
                        {userVotedCount > 0 ? ((userVotedCount / totalVotes) * 100).toFixed(2) : '0'}%
                      </p>
                      <p className="text-xs text-gray-500 mb-1">of total community votes</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <Card className="border shadow-sm bg-white dark:bg-gray-800 hover:shadow-md transition-shadow mb-6">
              <CardHeader>
                <CardTitle className="text-lg">Popular Proposals Detail</CardTitle>
                <CardDescription>Top 3 proposals by vote participation</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {topProposalsByVotes.map((proposal, index) => (
                    <div key={proposal.id} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-gray-100">{proposal.title}</p>
                          <div className="flex items-center mt-1">
                            <Badge variant={proposal.status === 'Active' ? "success" : "secondary"} className="text-xs">
                              {proposal.status}
                            </Badge>
                            <span className="text-xs text-gray-500 ml-2">
                              {new Date(proposal.expiration).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-gray-500">Total Votes</p>
                          <p className="text-lg font-bold text-blue-500">
                            {proposal.votedYesCount + proposal.votedNoCount}
                          </p>
                        </div>
                      </div>
                      
                      <div className="mt-4">
                        <div className="flex justify-between mb-1">
                          <div className="flex items-center">
                            <div className="h-3 w-3 rounded-full bg-green-500 mr-2"></div>
                            <span className="text-xs text-gray-500">Yes ({proposal.votedYesCount})</span>
                          </div>
                          <span className="text-xs text-green-500">
                            {((proposal.votedYesCount / (proposal.votedYesCount + proposal.votedNoCount)) * 100).toFixed(1)}%
                          </span>
                        </div>
                        <Progress 
                          value={(proposal.votedYesCount / (proposal.votedYesCount + proposal.votedNoCount)) * 100} 
                          className="h-2 bg-gray-200" 
                          indicatorClassName="bg-green-500" 
                        />
                      </div>
                      
                      <div className="mt-2">
                        <div className="flex justify-between mb-1">
                          <div className="flex items-center">
                            <div className="h-3 w-3 rounded-full bg-red-500 mr-2"></div>
                            <span className="text-xs text-gray-500">No ({proposal.votedNoCount})</span>
                          </div>
                          <span className="text-xs text-red-500">
                            {((proposal.votedNoCount / (proposal.votedYesCount + proposal.votedNoCount)) * 100).toFixed(1)}%
                          </span>
                        </div>
                        <Progress 
                          value={(proposal.votedNoCount / (proposal.votedYesCount + proposal.votedNoCount)) * 100} 
                          className="h-2 bg-gray-200" 
                          indicatorClassName="bg-red-500" 
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </Card>
    </motion.div>
  );
};

export default UserStatistics;
