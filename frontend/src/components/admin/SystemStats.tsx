import { useSuiClientQuery } from "@mysten/dapp-kit";
import { useNetworkVariable } from "../../config/networkConfig";
import { SuiObjectData, SuiObjectResponse } from "@mysten/sui/client";
import { useState, useEffect } from "react";
import {
  Chart as ChartJS,
  ArcElement,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Pie, Line, Bar } from 'react-chartjs-2';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Progress } from "../ui/progress";
import { Badge } from "../ui/badge";
import { ScrollArea } from "../ui/scroll-area";
import { Separator } from "../ui/separator";
import { motion } from "framer-motion";
import { 
  ChevronRight, 
  PieChart, 
  BarChart3, 
  Activity, 
  LayoutDashboard, 
  Network, 
  ShieldCheck,
  AlertCircle,
  CheckCircle
} from "lucide-react";

// Register Chart.js components
ChartJS.register(
  ArcElement,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface ProposalData {
  id: string;
  title: string;
  votedYesCount: number;
  votedNoCount: number;
  expiration: number;
  status: string;
}

const SystemStats = () => {
  const dashboardId = useNetworkVariable("dashboardId" as any); ;
  const packageId = useNetworkVariable("packageId" as any); ;
  const [proposals, setProposals] = useState<ProposalData[]>([]);
  const [selectedView, setSelectedView] = useState<'overview' | 'detailed'>('overview');
  
  // Fetch dashboard data to get proposal IDs
  const { data: dashboardData, isPending: dashboardPending, error: dashboardError } = useSuiClientQuery(
    "getObject",
    {
      id: dashboardId,
      options: {
        showContent: true,
      },
    }
  );

  // Fetch all proposals
  const { data: proposalsData, isPending: proposalsPending } = useSuiClientQuery(
    "multiGetObjects",
    {
      ids: getProposalIds(),
      options: {
        showContent: true,
      },
    }
  );
  
  // Process proposal data when it changes
  useEffect(() => {
    if (!proposalsData || !Array.isArray(proposalsData)) return;
    
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
  }, [proposalsData]);
  
  function getProposalIds() {
    if (!dashboardData?.data) return [];
    const dashboardObj = dashboardData.data as SuiObjectData;
    if (dashboardObj.content?.dataType !== "moveObject") return [];
    return (dashboardObj.content.fields as any)?.proposals_ids || [];
  }

  if (dashboardPending || proposalsPending) {
    return (
      <div className="w-full h-96 flex items-center justify-center">
        <div className="text-center">
          <div className="relative flex h-10 w-10 animate-spin rounded-full border-2 border-blue-500 border-r-transparent mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading statistics...</p>
        </div>
      </div>
    );
  }
  
  if (dashboardError) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 my-4 flex items-center gap-x-4 dark:bg-red-950 dark:border-red-800">
        <AlertCircle className="h-6 w-6 text-red-500" />
        <p className="text-red-600 dark:text-red-400">{dashboardError.message}</p>
      </div>
    );
  }
  
  const dashboardObj = dashboardData?.data as SuiObjectData;
  const proposalsCount = dashboardObj?.content?.dataType === "moveObject" 
    ? (dashboardObj.content.fields as any)?.proposals_ids?.length || 0
    : 0;
  
  // Calculate statistics
  const activeProposals = proposals.filter(p => p.status === 'Active').length;
  const delistedProposals = proposals.filter(p => p.status === 'Delisted').length;
  
  const totalVotesYes = proposals.reduce((sum, p) => sum + p.votedYesCount, 0);
  const totalVotesNo = proposals.reduce((sum, p) => sum + p.votedNoCount, 0);
  const totalVotes = totalVotesYes + totalVotesNo;
  
  // Current date to check for expired proposals
  const now = new Date().getTime();
  const expiredProposals = proposals.filter(p => p.expiration < now).length;
  const activeAndNotExpired = proposals.filter(p => p.status === 'Active' && p.expiration >= now).length;
  
  // Chart data
  const statusChartData = {
    labels: ['Active', 'Delisted'],
    datasets: [
      {
        label: 'Proposal Status',
        data: [activeProposals, delistedProposals],
        backgroundColor: [
          'rgba(56, 189, 248, 0.7)',
          'rgba(239, 68, 68, 0.7)',
        ],
        borderColor: [
          'rgba(56, 189, 248, 1)',
          'rgba(239, 68, 68, 1)',
        ],
        borderWidth: 1,
      },
    ],
  };
  
  const voteDistributionData = {
    labels: ['Yes Votes', 'No Votes'],
    datasets: [
      {
        label: 'Vote Distribution',
        data: [totalVotesYes, totalVotesNo],
        backgroundColor: [
          'rgba(34, 197, 94, 0.7)',
          'rgba(245, 158, 11, 0.7)',
        ],
        borderColor: [
          'rgba(34, 197, 94, 1)',
          'rgba(245, 158, 11, 1)',
        ],
        borderWidth: 1,
      },
    ],
  };
  
  // Top proposals by votes (get top 5)
  const topProposalsByVotes = [...proposals]
    .sort((a, b) => (b.votedYesCount + b.votedNoCount) - (a.votedYesCount + a.votedNoCount))
    .slice(0, 5);
  
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
        backgroundColor: 'rgba(245, 158, 11, 0.7)',
        borderColor: 'rgba(245, 158, 11, 1)',
        borderWidth: 1,
      },
    ],
  };
  
  const chartOptions = {
    maintainAspectRatio: false,
    responsive: true,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          padding: 20,
          usePointStyle: true,
          pointStyle: 'circle',
        },
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: 12,
        cornerRadius: 6,
        caretSize: 6,
      },
    },
  };
  
  const barChartOptions = {
    ...chartOptions,
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
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex flex-col space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">System Dashboard</h1>
            <p className="text-muted-foreground mt-1">Monitor and analyze system performance and proposal statistics</p>
          </div>
          
          <Tabs value={selectedView} onValueChange={(value) => setSelectedView(value as 'overview' | 'detailed')} className="w-full sm:w-auto">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="overview" className="flex items-center gap-2">
                <LayoutDashboard className="h-4 w-4" />
                <span>Overview</span>
              </TabsTrigger>
              <TabsTrigger value="detailed" className="flex items-center gap-2">
                <Activity className="h-4 w-4" />
                <span>Analytics</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <TabsContent value="overview" className="mt-0 space-y-6">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
          >
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Proposals</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{proposalsCount}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {activeProposals} active, {delistedProposals} delisted
                </p>
                <Progress 
                  value={(activeProposals / proposalsCount) * 100 || 0} 
                  className="h-1 mt-3" 
                />
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Network</CardTitle>
                <Network className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold capitalize">
                  {import.meta.env.MODE === 'development' ? 'Devnet' : 'Mainnet'}
                </div>
                <p className="text-xs text-green-500 font-medium flex items-center mt-1">
                  <CheckCircle className="h-3 w-3 mr-1" /> Connected
                </p>
                <div className="h-1 w-full bg-gray-100 dark:bg-gray-800 rounded-full mt-3">
                  <div className="h-1 bg-green-500 rounded-full" style={{ width: '100%' }}></div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Admin Status</CardTitle>
                <ShieldCheck className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="flex items-center">
                  <Badge variant="default" className="bg-green-500 hover:bg-green-600">Active</Badge>
                  <span className="ml-2 text-sm font-medium">Dashboard ID:</span>
                </div>
                <p className="text-xs text-muted-foreground mt-2 truncate" title={dashboardId}>
                  {dashboardId.substring(0, 8)}...{dashboardId.substring(dashboardId.length - 8)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Proposals</CardTitle>
                <PieChart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-500">{activeProposals}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {activeAndNotExpired} active & not expired
                </p>
                <Progress 
                  value={(activeAndNotExpired / activeProposals) * 100 || 0} 
                  className="h-1 mt-3" 
                />
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Delisted Proposals</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-red-500">{delistedProposals}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {((delistedProposals / proposalsCount) * 100).toFixed(1)}% of total proposals
                </p>
                <Progress 
                  value={(delistedProposals / proposalsCount) * 100 || 0} 
                  className="h-1 mt-3" 
                />
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Votes</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{totalVotes}</div>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <div className="text-xs">
                    <span className="text-muted-foreground">Yes:</span>{" "}
                    <span className="font-medium text-green-500">{totalVotesYes}</span>
                  </div>
                  <div className="text-xs">
                    <span className="text-muted-foreground">No:</span>{" "}
                    <span className="font-medium text-orange-500">{totalVotesNo}</span>
                  </div>
                </div>
                <Progress 
                  value={(totalVotesYes / totalVotes) * 100 || 0} 
                  className="h-1 mt-3" 
                />
              </CardContent>
            </Card>
          </motion.div>
          
          <Card>
            <CardHeader>
              <CardTitle>System Health</CardTitle>
              <CardDescription>Real-time status of all system components</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-1">
                    <div className="flex items-center">
                      <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                      <span className="text-sm font-medium">Package ID</span>
                    </div>
                    <span className="text-sm font-medium text-green-500">Active</span>
                  </div>
                  <Progress value={100} className="h-2" />
                  <p className="text-xs text-muted-foreground mt-1 truncate" title={packageId}>
                    {packageId}
                  </p>
                </div>
                
                <div>
                  <div className="flex justify-between mb-1">
                    <div className="flex items-center">
                      <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                      <span className="text-sm font-medium">Dashboard</span>
                    </div>
                    <span className="text-sm font-medium text-green-500">Healthy</span>
                  </div>
                  <Progress value={100} className="h-2" />
                </div>
                
                <div>
                  <div className="flex justify-between mb-1">
                    <div className="flex items-center">
                      <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                      <span className="text-sm font-medium">Network</span>
                    </div>
                    <span className="text-sm font-medium text-green-500">Connected</span>
                  </div>
                  <Progress value={100} className="h-2" />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="detailed" className="mt-0 space-y-6">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-6"
          >
            <Card>
              <CardHeader>
                <CardTitle>Proposal Status</CardTitle>
                <CardDescription>Distribution of active vs. delisted proposals</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <Pie data={statusChartData} options={chartOptions} />
                </div>
                <div className="grid grid-cols-2 gap-2 mt-4">
                  <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg text-center">
                    <p className="text-blue-500 font-semibold mb-1">Active</p>
                    <p className="text-xl font-bold text-blue-600 dark:text-blue-400">{activeProposals}</p>
                    <p className="text-xs text-muted-foreground">
                      {activeProposals > 0 ? ((activeProposals / proposalsCount) * 100).toFixed(1) + '%' : '0%'}
                    </p>
                  </div>
                  <div className="p-3 bg-red-50 dark:bg-red-950 rounded-lg text-center">
                    <p className="text-red-500 font-semibold mb-1">Delisted</p>
                    <p className="text-xl font-bold text-red-600 dark:text-red-400">{delistedProposals}</p>
                    <p className="text-xs text-muted-foreground">
                      {delistedProposals > 0 ? ((delistedProposals / proposalsCount) * 100).toFixed(1) + '%' : '0%'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Vote Distribution</CardTitle>
                <CardDescription>Breakdown of yes vs. no votes across all proposals</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <Pie data={voteDistributionData} options={chartOptions} />
                </div>
                <div className="grid grid-cols-2 gap-2 mt-4">
                  <div className="p-3 bg-green-50 dark:bg-green-950 rounded-lg text-center">
                    <p className="text-green-500 font-semibold mb-1">Yes Votes</p>
                    <p className="text-xl font-bold text-green-600 dark:text-green-400">{totalVotesYes}</p>
                    <p className="text-xs text-muted-foreground">
                      {totalVotes > 0 ? ((totalVotesYes / totalVotes) * 100).toFixed(1) + '%' : '0%'}
                    </p>
                  </div>
                  <div className="p-3 bg-orange-50 dark:bg-orange-950 rounded-lg text-center">
                    <p className="text-orange-500 font-semibold mb-1">No Votes</p>
                    <p className="text-xl font-bold text-orange-600 dark:text-orange-400">{totalVotesNo}</p>
                    <p className="text-xs text-muted-foreground">
                      {totalVotes > 0 ? ((totalVotesNo / totalVotes) * 100).toFixed(1) + '%' : '0%'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Top Proposals by Vote Activity</CardTitle>
                <CardDescription>The most engaged proposals based on total votes received</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <Bar data={topProposalsData} options={barChartOptions} />
                </div>
                <ScrollArea className="h-44 mt-4 rounded-md border p-4">
                  <div className="space-y-2">
                    {topProposalsByVotes.map((proposal, index) => (
                      <div key={proposal.id}>
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900">
                              <span className="text-sm font-medium text-blue-600 dark:text-blue-300">{index + 1}</span>
                            </div>
                            <div>
                              <p className="text-sm font-medium">{proposal.title}</p>
                              <p className="text-xs text-muted-foreground">ID: {proposal.id.substring(0, 6)}...</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium">
                              {proposal.votedYesCount + proposal.votedNoCount} votes
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {((proposal.votedYesCount / (proposal.votedYesCount + proposal.votedNoCount)) * 100).toFixed(1)}% Yes
                            </p>
                          </div>
                        </div>
                        {index < topProposalsByVotes.length - 1 && <Separator className="my-2" />}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Proposal Expiration Status</CardTitle>
                <CardDescription>Active proposals vs. expired proposals</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-6 space-y-4">
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium">Active & Valid</span>
                      <span className="text-sm font-medium text-blue-500">
                        {activeAndNotExpired} ({((activeAndNotExpired / proposalsCount) * 100).toFixed(1)}%)
                      </span>
                    </div>
                    <Progress value={(activeAndNotExpired / proposalsCount) * 100 || 0} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium">Expired</span>
                      <span className="text-sm font-medium text-red-500">
                        {expiredProposals} ({((expiredProposals / proposalsCount) * 100).toFixed(1)}%)
                      </span>
                    </div>
                    <Progress value={(expiredProposals / proposalsCount) * 100 || 0} className="h-2" />
                  </div>
                </div>
                
                <div className="rounded-lg bg-muted p-4">
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                      <p className="text-sm font-medium text-blue-500">Active & Valid</p>
                      <p className="text-3xl font-bold">{activeAndNotExpired}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-red-500">Expired</p>
                      <p className="text-3xl font-bold">{expiredProposals}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle>Network Details</CardTitle>
                  <CardDescription>Current network configuration and status</CardDescription>
                </div>
                <Network className="h-5 w-5 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                    <div className="text-sm font-medium">Network Type:</div>
                    <div className="text-sm capitalize">
                      {import.meta.env.MODE === 'development' ? (
                        <Badge variant="outline" className="bg-amber-100 text-amber-800 hover:bg-amber-100 dark:bg-amber-900 dark:text-amber-300 dark:hover:bg-amber-900">
                          Devnet
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900 dark:text-green-300 dark:hover:bg-green-900">
                          Mainnet
                        </Badge>
                      )}
                    </div>
                    
                    <div className="text-sm font-medium">Package ID:</div>
                    <div className="text-xs text-muted-foreground truncate" title={packageId}>
                      {packageId.substring(0, 8)}...{packageId.substring(packageId.length - 8)}
                    </div>
                    
                    <div className="text-sm font-medium">Dashboard ID:</div>
                    <div className="text-xs text-muted-foreground truncate" title={dashboardId}>
                      {dashboardId.substring(0, 8)}...{dashboardId.substring(dashboardId.length - 8)}
                    </div>
                    
                    <div className="text-sm font-medium">Total Proposals:</div>
                    <div className="text-sm">{proposalsCount}</div>
                    
                    <div className="text-sm font-medium">System Status:</div>
                    <div className="text-sm flex items-center">
                      <span className="h-2 w-2 rounded-full bg-green-500 mr-1.5"></span>
                      Operational
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>
      </div>
    </div>
  );
};

export default SystemStats;
