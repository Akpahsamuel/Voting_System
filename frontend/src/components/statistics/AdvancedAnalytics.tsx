import { useSuiClientQuery } from "@mysten/dapp-kit";
import { useNetworkVariable } from "../../config/networkConfig";
import { SuiObjectData, SuiObjectResponse } from "@mysten/sui/client";
import { useState, useEffect } from "react";
import { Bar, Doughnut, Line } from "react-chartjs-2";
import { chartColors, getStandardChartOptions } from "../../utils/chartUtils";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "../ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Separator } from "../ui/separator";
import { motion } from "framer-motion";
import { 
  BarChart3, 
  PieChart, 
  LineChart,
  Calendar,
  Users,
  TrendingUp
} from "lucide-react";

interface ProposalData {
  id: string;
  title: string;
  votedYesCount: number;
  votedNoCount: number;
  expiration: number;
  status: string;
  creator: string;
}

export const AdvancedAnalytics = () => {
  const dashboardId = useNetworkVariable("dashboardId" as any);
  const [proposals, setProposals] = useState<ProposalData[]>([]);
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'all'>('month');
  
  // Fetch dashboard data to get proposal IDs
  const { data: dashboardData } = useSuiClientQuery(
    "getObject",
    {
      id: dashboardId as string,
      options: {
        showContent: true,
      },
    }
  );
  
  function getProposalIds() {
    if (dashboardData?.data?.content?.dataType !== "moveObject") return [];
    
    const fields = dashboardData.data.content.fields as any;
    return fields?.proposals_ids || [];
  }
  
  // Fetch all proposals
  const { data: proposalsData, isPending } = useSuiClientQuery(
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
          status: fields.status.variant,
          creator: fields.creator || "Unknown"
        };
      })
      .filter((item): item is ProposalData => item !== null);
    
    setProposals(parsedProposals);
  }, [proposalsData]);

  if (isPending) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-t-blue-500 border-blue-200 rounded-full animate-spin mx-auto mb-2"></div>
          <p className="text-sm text-white/70">Loading analytics data...</p>
        </div>
      </div>
    );
  }
  
  // Calculate statistics
  const totalVotesYes = proposals.reduce((sum, p) => sum + p.votedYesCount, 0);
  const totalVotesNo = proposals.reduce((sum, p) => sum + p.votedNoCount, 0);
  const totalVotes = totalVotesYes + totalVotesNo;
  
  // Get dates for filtering
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  
  // Filter proposals by time range
  const filteredProposals = proposals.filter(p => {
    if (timeRange === 'week') {
      return p.expiration >= oneWeekAgo.getTime();
    } else if (timeRange === 'month') {
      return p.expiration >= oneMonthAgo.getTime();
    }
    return true;
  });

  // Group proposals by creator
  const creatorGroups = filteredProposals.reduce((acc, proposal) => {
    const creator = proposal.creator;
    if (!acc[creator]) {
      acc[creator] = {
        proposals: 0,
        votes: 0
      };
    }
    
    acc[creator].proposals += 1;
    acc[creator].votes += proposal.votedYesCount + proposal.votedNoCount;
    
    return acc;
  }, {} as Record<string, { proposals: number, votes: number }>);
  
  // Sort creators by proposal count
  const topCreators = Object.entries(creatorGroups)
    .sort(([, a], [, b]) => b.proposals - a.proposals)
    .slice(0, 5);
  
  // Create data for top creators chart
  const creatorLabels = topCreators.map(([creator]) => {
    // Truncate creator address for display
    return creator.slice(0, 6) + '...' + creator.slice(-4);
  });
  
  const creatorData = {
    labels: creatorLabels,
    datasets: [
      {
        label: 'Proposals Created',
        data: topCreators.map(([, data]) => data.proposals),
        backgroundColor: chartColors.backgroundColors[0],
        borderColor: chartColors.borderColors[0],
        borderWidth: 1,
      },
      {
        label: 'Votes Received',
        data: topCreators.map(([, data]) => data.votes),
        backgroundColor: chartColors.backgroundColors[1],
        borderColor: chartColors.borderColors[1],
        borderWidth: 1,
      },
    ],
  };
  
  // Group proposals by voting success ratio
  const proposalVoteRatios = filteredProposals.map(p => {
    const totalVotes = p.votedYesCount + p.votedNoCount;
    const yesRatio = totalVotes > 0 ? (p.votedYesCount / totalVotes) : 0;
    
    return {
      title: p.title,
      yesRatio,
      totalVotes
    };
  });
  
  // Sort proposals by yes ratio
  const topVotedProposals = [...proposalVoteRatios]
    .sort((a, b) => {
      // First sort by total votes to get meaningful proposals
      if (b.totalVotes !== a.totalVotes) return b.totalVotes - a.totalVotes;
      // Then sort by yes ratio
      return b.yesRatio - a.yesRatio;
    })
    .slice(0, 5);
  
  const proposalRatioData = {
    labels: topVotedProposals.map(p => {
      // Truncate title for display
      const title = p.title || "Untitled";
      return title.length > 15 ? title.slice(0, 12) + '...' : title;
    }),
    datasets: [
      {
        label: 'Yes %',
        data: topVotedProposals.map(p => Math.round(p.yesRatio * 100)),
        backgroundColor: chartColors.semantic.yes,
        borderColor: 'rgb(75, 192, 92)',
        borderWidth: 1,
      },
      {
        label: 'No %',
        data: topVotedProposals.map(p => Math.round((1 - p.yesRatio) * 100)),
        backgroundColor: chartColors.semantic.no,
        borderColor: 'rgb(255, 99, 132)',
        borderWidth: 1,
      },
    ],
  };
  
  const chartOptions = getStandardChartOptions(true);
  const barOptions = {
    ...chartOptions,
    scales: {
      ...chartOptions.scales,
      x: {
        ...chartOptions.scales.x,
        stacked: true,
      },
      y: {
        ...chartOptions.scales.y,
        stacked: true,
        max: 100
      }
    }
  };
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold text-white">Advanced Analytics</h2>
        
        <div className="bg-black/40 rounded-lg p-1">
          <Tabs 
            value={timeRange} 
            onValueChange={(value) => setTimeRange(value as 'week' | 'month' | 'all')}
            className="w-[240px]"
          >
            <TabsList className="grid grid-cols-3 bg-black/30">
              <TabsTrigger value="week" className="text-xs font-medium">Week</TabsTrigger>
              <TabsTrigger value="month" className="text-xs font-medium">Month</TabsTrigger>
              <TabsTrigger value="all" className="text-xs font-medium">All Time</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <Card className="bg-black/40 backdrop-blur-md border-white/20">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-medium text-white">Top Proposal Creators</CardTitle>
                <Users className="h-4 w-4 text-blue-400" />
              </div>
              <CardDescription className="text-white/80">Most active participants by proposals created</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <Bar 
                  data={creatorData} 
                  options={{
                    ...chartOptions,
                    scales: {
                      ...chartOptions.scales,
                      x: {
                        ...chartOptions.scales.x,
                        ticks: {
                          ...chartOptions.scales.x.ticks,
                          maxRotation: 45,
                          minRotation: 45
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
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <Card className="bg-black/40 backdrop-blur-md border-white/20">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-medium text-white">Top Voted Proposals</CardTitle>
                <BarChart3 className="h-4 w-4 text-purple-400" />
              </div>
              <CardDescription className="text-white/80">Yes/No distribution for most voted proposals</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <Bar data={proposalRatioData} options={barOptions} />
              </div>
            </CardContent>
          </Card>
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="md:col-span-2"
        >
          <Card className="bg-black/40 backdrop-blur-md border-white/20">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-medium text-white">Activity Summary</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-400" />
              </div>
              <CardDescription className="text-white/80">Key metrics and totals</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-black/50 p-3 rounded-lg border border-white/15">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-blue-400" />
                    <h3 className="text-sm font-medium text-white">Total Proposals</h3>
                  </div>
                  <p className="text-2xl font-bold text-white mt-1">{proposals.length}</p>
                  <Separator className="my-2 bg-white/15" />
                  <div className="flex justify-between text-xs">
                    <span className="text-white/80">Created in period:</span>
                    <span className="text-white font-medium">{filteredProposals.length}</span>
                  </div>
                </div>
                
                <div className="bg-black/50 p-3 rounded-lg border border-white/15">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-purple-400" />
                    <h3 className="text-sm font-medium text-white">Unique Creators</h3>
                  </div>
                  
                  <p className="text-2xl font-bold text-white mt-1">
                    {Object.keys(creatorGroups).length}
                  </p>
                  
                  <Separator className="my-2 bg-white/15" />
                  <div className="flex justify-between text-xs">
                    <span className="text-white/80">Avg proposals per creator:</span>
                    <span className="text-white font-medium">
                      {Object.keys(creatorGroups).length > 0 
                        ? (proposals.length / Object.keys(creatorGroups).length).toFixed(1) 
                        : '0'}
                    </span>
                  </div>
                </div>
                
                <div className="bg-black/50 p-3 rounded-lg border border-white/15">
                  <div className="flex items-center gap-2">
                    <PieChart className="h-4 w-4 text-green-400" />
                    <h3 className="text-sm font-medium text-white">Total Votes</h3>
                  </div>
                  
                  <p className="text-2xl font-bold text-white mt-1">{totalVotes}</p>
                  
                  <Separator className="my-2 bg-white/15" />
                  <div className="flex justify-between text-xs">
                    <span className="text-white/80">Votes in period:</span>
                    <span className="text-white font-medium">
                      {filteredProposals.reduce((sum, p) => sum + p.votedYesCount + p.votedNoCount, 0)}
                    </span>
                  </div>
                </div>
                
                <div className="bg-black/50 p-3 rounded-lg border border-white/15">
                  <div className="flex items-center gap-2">
                    <LineChart className="h-4 w-4 text-amber-400" />
                    <h3 className="text-sm font-medium text-white">Avg Votes Per Proposal</h3>
                  </div>
                  
                  <p className="text-2xl font-bold text-white mt-1">
                    {proposals.length > 0 ? Math.round(totalVotes / proposals.length) : 0}
                  </p>
                  
                  <Separator className="my-2 bg-white/15" />
                  <div className="flex justify-between text-xs">
                    <span className="text-white/80">Highest vote count:</span>
                    <span className="text-white font-medium">
                      {proposals.length > 0 
                        ? Math.max(...proposals.map(p => p.votedYesCount + p.votedNoCount)) 
                        : 0}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default AdvancedAnalytics;