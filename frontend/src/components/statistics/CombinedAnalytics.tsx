import { useSuiClientQuery } from "@mysten/dapp-kit";
import { useNetworkVariable } from "../../config/networkConfig";
import { SuiObjectData, SuiObjectResponse } from "@mysten/sui/client";
import { useState, useEffect } from "react";
import { Bar, Pie, Line } from "react-chartjs-2";
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
  TrendingUp,
  Vote
} from "lucide-react";

interface ProposalData {
  id: string;
  title: string;
  votedYesCount: number;
  votedNoCount: number;
  expiration: number;
  status: string;
  creator: string;
  type: 'proposal';
}

interface Candidate {
  id: number;
  name: string;
  votes: number;
}

interface BallotData {
  id: string;
  title: string;
  description: string;
  expiration: number;
  candidates: Candidate[];
  status: string;
  creator: string;
  totalVotes: number;
  type: 'ballot';
}

type PlatformItem = ProposalData | BallotData;

export const CombinedAnalytics = () => {
  const dashboardId = useNetworkVariable("dashboardId" as any);
  const [platformItems, setPlatformItems] = useState<PlatformItem[]>([]);
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'all'>('month');
  const [isLoading, setIsLoading] = useState(true);
  
  // Fetch dashboard data to get IDs
  const { data: dashboardData } = useSuiClientQuery(
    "getObject",
    {
      id: dashboardId as string,
      options: {
        showContent: true,
      },
    }
  );
  
  function getItemIds() {
    if (dashboardData?.data?.content?.dataType !== "moveObject") return [];
    
    const fields = dashboardData.data.content.fields as any;
    return fields?.proposals_ids || [];
  }
  
  // Fetch all items
  const { data: itemsData, isPending } = useSuiClientQuery(
    "multiGetObjects",
    {
      ids: getItemIds(),
      options: {
        showContent: true,
      },
    }
  );
  
  // Process data when it changes
  useEffect(() => {
    if (!itemsData || !Array.isArray(itemsData)) return;
    setIsLoading(true);
    
    const parsedItems: PlatformItem[] = [];
    
    itemsData.forEach((item: SuiObjectResponse) => {
      if (!item.data) return;
      const obj = item.data as SuiObjectData;
      if (obj.content?.dataType !== "moveObject") return;
      
      const type = obj.content.type as string;
      const isBallot = type && type.includes("::ballot::Ballot");
      const fields = obj.content.fields as any;
      
      if (isBallot) {
        // Process ballot
        let candidates: Candidate[] = [];
        if (fields.candidates) {
          let candidatesData = [];
          
          if (Array.isArray(fields.candidates)) {
            candidatesData = fields.candidates;
          } else if (fields.candidates.vec && Array.isArray(fields.candidates.vec)) {
            candidatesData = fields.candidates.vec;
          } else if (fields.candidates.fields && fields.candidates.fields.contents) {
            candidatesData = fields.candidates.fields.contents;
          }
          
          candidates = candidatesData.map((candidate: any, index: number) => {
            const candidateFields = candidate.fields || candidate;
            return {
              id: Number(candidateFields.id || index),
              name: typeof candidateFields.name === 'object' ? 
                    (candidateFields.name.fields?.some || `Candidate ${index+1}`) : 
                    (candidateFields.name || `Candidate ${index+1}`),
              votes: Number(candidateFields.vote_count || candidateFields.votes || 0)
            };
          });
        }
        
        const totalVotes = candidates.reduce((sum, c) => sum + c.votes, 0);
        
        parsedItems.push({
          id: obj.objectId,
          title: fields.title || "Untitled Ballot",
          description: fields.description || "",
          expiration: Number(fields.expiration) || 0,
          candidates,
          status: fields.status?.variant || "Unknown",
          creator: fields.creator || "Unknown",
          totalVotes,
          type: 'ballot'
        });
      } else {
        // Process proposal
        // Check if this is a proposal by looking for proposal-specific fields
        if (fields.voted_yes_count !== undefined && fields.voted_no_count !== undefined) {
          parsedItems.push({
            id: obj.objectId,
            title: fields.title || "Untitled Proposal",
            votedYesCount: Number(fields.voted_yes_count) || 0,
            votedNoCount: Number(fields.voted_no_count) || 0,
            expiration: Number(fields.expiration) || 0,
            status: fields.status?.variant || "Unknown",
            creator: fields.creator || "Unknown",
            type: 'proposal'
          });
        }
      }
    });
    
    console.log("Combined items for analytics:", parsedItems.length);
    setPlatformItems(parsedItems);
    setIsLoading(false);
  }, [itemsData]);

  if (isPending || isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-t-blue-500 border-blue-200 rounded-full animate-spin mx-auto mb-2"></div>
          <p className="text-sm text-white/70">Loading combined analytics...</p>
        </div>
      </div>
    );
  }
  
  // Get dates for filtering
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  
  // Filter items by time range
  const filteredItems = platformItems.filter(item => {
    if (timeRange === 'week') {
      return item.expiration >= oneWeekAgo.getTime();
    } else if (timeRange === 'month') {
      return item.expiration >= oneMonthAgo.getTime();
    }
    return true;
  });

  // Calculate platform-wide statistics
  const proposals = filteredItems.filter(item => item.type === 'proposal') as ProposalData[];
  const ballots = filteredItems.filter(item => item.type === 'ballot') as BallotData[];
  
  const totalProposals = proposals.length;
  const totalBallots = ballots.length;
  
  const totalProposalVotes = proposals.reduce((sum, p) => sum + p.votedYesCount + p.votedNoCount, 0);
  const totalBallotVotes = ballots.reduce((sum, b) => sum + b.totalVotes, 0);
  
  const totalVotes = totalProposalVotes + totalBallotVotes;
  
  // Group items by creator
  const creatorGroups = filteredItems.reduce((acc, item) => {
    const creator = item.creator;
    if (!acc[creator]) {
      acc[creator] = {
        items: 0,
        votes: 0
      };
    }
    
    acc[creator].items += 1;
    
    if (item.type === 'proposal') {
      acc[creator].votes += (item as ProposalData).votedYesCount + (item as ProposalData).votedNoCount;
    } else {
      acc[creator].votes += (item as BallotData).totalVotes;
    }
    
    return acc;
  }, {} as Record<string, { items: number, votes: number }>);
  
  // Sort creators by item count
  const topCreators = Object.entries(creatorGroups)
    .sort(([, a], [, b]) => b.items - a.items)
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
        label: 'Items Created',
        data: topCreators.map(([, data]) => data.items),
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
  
  // Group items by date
  const dateGroups = filteredItems.reduce((acc, item) => {
    const date = new Date(item.expiration);
    const dateStr = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;

    if (!acc[dateStr]) {
      acc[dateStr] = {
        proposals: 0,
        ballots: 0,
        votes: 0,
      };
    }

    if (item.type === 'proposal') {
      acc[dateStr].proposals += 1;
      acc[dateStr].votes += (item as ProposalData).votedYesCount + (item as ProposalData).votedNoCount;
    } else {
      acc[dateStr].ballots += 1;
      acc[dateStr].votes += (item as BallotData).totalVotes;
    }

    return acc;
  }, {} as Record<string, { proposals: number; ballots: number; votes: number }>);

  const dates = Object.keys(dateGroups).sort();
  
  // Take last 10 days or all days if less than 10
  const activityLabels = dates.slice(-10);
  
  const activityData = {
    labels: activityLabels,
    datasets: [
      {
        label: "Votes",
        data: activityLabels.map((date) => dateGroups[date].votes),
        borderColor: chartColors.borderColors[2],
        backgroundColor: chartColors.backgroundColors[2],
        tension: 0.3,
        fill: true,
      },
      {
        label: "Proposals",
        data: activityLabels.map((date) => dateGroups[date].proposals),
        borderColor: chartColors.borderColors[0],
        backgroundColor: chartColors.backgroundColors[0],
        tension: 0.3,
        fill: true,
      },
      {
        label: "Ballots",
        data: activityLabels.map((date) => dateGroups[date].ballots),
        borderColor: chartColors.borderColors[1],
        backgroundColor: chartColors.backgroundColors[1],
        tension: 0.3,
        fill: true,
      }
    ],
  };

  // Content type distribution data
  const contentTypeData = {
    labels: ["Proposals", "Ballots"],
    datasets: [
      {
        data: [totalProposals, totalBallots],
        backgroundColor: [
          chartColors.backgroundColors[0],
          chartColors.backgroundColors[1],
        ],
        borderColor: [
          chartColors.borderColors[0],
          chartColors.borderColors[1],
        ],
        borderWidth: 1,
      },
    ],
  };

  const chartOptions = getStandardChartOptions(true);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold text-white">Platform-wide Analytics</h2>

        <div className="bg-black/40 rounded-lg p-1">
          <Tabs
            value={timeRange}
            onValueChange={(value) => setTimeRange(value as "week" | "month" | "all")}
            className="w-[240px]"
          >
            <TabsList className="grid grid-cols-3 bg-black/30">
              <TabsTrigger value="week" className="text-xs font-medium">
                Week
              </TabsTrigger>
              <TabsTrigger value="month" className="text-xs font-medium">
                Month
              </TabsTrigger>
              <TabsTrigger value="all" className="text-xs font-medium">
                All Time
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <Card className="bg-black/40 backdrop-blur-md border-white/20">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-medium text-white">Platform Overview</CardTitle>
                <BarChart3 className="h-4 w-4 text-blue-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-900/30 p-3 rounded-lg border border-blue-900/40">
                  <p className="text-xs text-blue-300 mb-1 font-medium">Total Items</p>
                  <p className="text-xl font-semibold text-blue-200">{totalProposals + totalBallots}</p>
                  <div className="flex justify-between text-xs text-blue-300/90 mt-1">
                    <span>Proposals: {totalProposals}</span>
                    <span>Ballots: {totalBallots}</span>
                  </div>
                </div>
                <div className="bg-green-900/30 p-3 rounded-lg border border-green-900/40">
                  <p className="text-xs text-green-300 mb-1 font-medium">Total Votes</p>
                  <p className="text-xl font-semibold text-green-200">{totalVotes}</p>
                  <div className="flex justify-between text-xs text-green-300/90 mt-1">
                    <span>Proposals: {totalProposalVotes}</span>
                    <span>Ballots: {totalBallotVotes}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="md:col-span-2"
        >
          <Card className="bg-black/40 backdrop-blur-md border-white/20">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-medium text-white">Content Distribution</CardTitle>
                <PieChart className="h-4 w-4 text-purple-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-1">
                  <div className="h-48">
                    <Pie data={contentTypeData} options={chartOptions} />
                  </div>
                </div>
                <div className="md:col-span-2 flex items-center">
                  <div className="grid grid-cols-2 gap-4 w-full">
                    <div className="bg-blue-900/30 p-3 rounded-lg border border-blue-900/40">
                      <p className="text-xs text-blue-300 mb-1 font-medium">Proposals</p>
                      <p className="text-xl font-semibold text-blue-200">{totalProposals}</p>
                      <p className="text-xs text-blue-300/90 mt-1">
                        {totalProposals > 0 ? `${((totalProposals / (totalProposals + totalBallots)) * 100).toFixed(1)}%` : "0%"}
                      </p>
                    </div>
                    <div className="bg-purple-900/30 p-3 rounded-lg border border-purple-900/40">
                      <p className="text-xs text-purple-300 mb-1 font-medium">Ballots</p>
                      <p className="text-xl font-semibold text-purple-200">{totalBallots}</p>
                      <p className="text-xs text-purple-300/90 mt-1">
                        {totalBallots > 0 ? `${((totalBallots / (totalProposals + totalBallots)) * 100).toFixed(1)}%` : "0%"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <Card className="bg-black/40 backdrop-blur-md border-white/20">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-medium text-white">Top Creators</CardTitle>
                <Users className="h-4 w-4 text-green-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <Bar 
                  data={creatorData} 
                  options={{
                    ...chartOptions,
                    indexAxis: 'y' as const,
                  }}
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          <Card className="bg-black/40 backdrop-blur-md border-white/20">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-medium text-white">Activity Trend</CardTitle>
                <LineChart className="h-4 w-4 text-green-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <Line 
                  data={activityData} 
                  options={chartOptions}
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default CombinedAnalytics;
