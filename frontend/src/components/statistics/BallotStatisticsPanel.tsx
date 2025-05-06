import { useSuiClientQuery } from "@mysten/dapp-kit";
import { useNetworkVariable } from "../../config/networkConfig";
import { SuiObjectData, SuiObjectResponse } from "@mysten/sui/client";
import { useState, useEffect } from "react";
import { Bar, Pie, Doughnut, Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title
} from "chart.js";
import { chartColors, getStandardChartOptions } from "../../utils/chartUtils";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Tabs, TabsList, TabsTrigger } from "../ui/tabs";
import { motion } from "framer-motion";
import { BarChart3, PieChart, LineChart, Users, Vote } from "lucide-react";

// Register Chart.js components
ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title
);

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
  totalVotes?: number;
}

export const BallotStatisticsPanel = () => {
  const dashboardId = useNetworkVariable("dashboardId" as any);
  const [ballots, setBallots] = useState<BallotData[]>([]);
  const [timeRange, setTimeRange] = useState<"week" | "month" | "all">("month");

  // Fetch dashboard data to get ballot IDs
  const { data: dashboardData } = useSuiClientQuery("getObject", {
    id: dashboardId,
    options: {
      showContent: true,
    },
  });

  function getBallotIds() {
    if (dashboardData?.data?.content?.dataType !== "moveObject") return [];

    const fields = dashboardData.data.content.fields as any;
    // Get all proposal IDs (which include both proposals and ballots)
    return fields?.proposals_ids || [];
  }

  // Fetch all ballots
  const { data: ballotsData, isPending } = useSuiClientQuery("multiGetObjects", {
    ids: getBallotIds(),
    options: {
      showContent: true,
    },
  });

  // Process ballot data when it changes
  useEffect(() => {
    if (!ballotsData || !Array.isArray(ballotsData)) return;

    const parsedBallots = ballotsData
      .map((item: SuiObjectResponse) => {
        if (!item.data) return null;
        const obj = item.data as SuiObjectData;
        if (obj.content?.dataType !== "moveObject") return null;

        // Check if this is actually a ballot, not a proposal
        const type = obj.content.type as string;
        const isBallot = type && type.includes("::ballot::Ballot");
        
        if (!isBallot) {
          console.log("Skipping non-ballot object in statistics:", obj.objectId);
          return null;
        }

        const fields = obj.content.fields as any;
        
        // Parse candidates
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
        
        return {
          id: obj.objectId,
          title: fields.title || "Untitled Ballot",
          description: fields.description || "",
          expiration: Number(fields.expiration) || 0,
          candidates,
          status: fields.status?.variant || "Unknown",
          creator: fields.creator || "Unknown",
          totalVotes
        };
      })
      .filter((item): item is BallotData => item !== null);

    console.log("Filtered ballots for statistics:", parsedBallots.length);
    setBallots(parsedBallots);
  }, [ballotsData]);

  if (isPending) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-t-blue-500 border-blue-200 rounded-full animate-spin mx-auto mb-2"></div>
          <p className="text-sm text-white/70">Loading ballot statistics...</p>
        </div>
      </div>
    );
  }

  // Get dates for filtering
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Filter ballots by time range
  const filteredBallots = ballots.filter(b => {
    if (timeRange === 'week') {
      return b.expiration >= oneWeekAgo.getTime();
    } else if (timeRange === 'month') {
      return b.expiration >= oneMonthAgo.getTime();
    }
    return true;
  });

  // Calculate statistics
  const totalBallots = filteredBallots.length;
  const activeBallots = filteredBallots.filter((b) => b.status === "Active").length;
  const expiredBallots = filteredBallots.filter((b) => b.status === "Expired").length;
  const delistedBallots = filteredBallots.filter((b) => b.status === "Delisted").length;
  
  const totalVotes = filteredBallots.reduce((sum, b) => sum + (b.totalVotes || 0), 0);
  const averageVotesPerBallot = totalBallots > 0 ? Math.round(totalVotes / totalBallots) : 0;
  
  // Ballot status data for pie chart
  const ballotStatusData = {
    labels: ["Active", "Expired", "Delisted"],
    datasets: [
      {
        data: [activeBallots, expiredBallots, delistedBallots],
        backgroundColor: [
          chartColors.semantic.active,
          chartColors.semantic.expired,
          chartColors.semantic.delisted,
        ],
        borderWidth: 1,
      },
    ],
  };

  // Top ballots by votes
  const topBallotsByVotes = [...filteredBallots]
    .sort((a, b) => (b.totalVotes || 0) - (a.totalVotes || 0))
    .slice(0, 5);

  const topBallotsData = {
    labels: topBallotsByVotes.map(b => {
      const title = b.title || "Untitled";
      return title.length > 15 ? title.slice(0, 12) + '...' : title;
    }),
    datasets: [
      {
        label: 'Total Votes',
        data: topBallotsByVotes.map(b => b.totalVotes || 0),
        backgroundColor: chartColors.backgroundColors[0],
        borderColor: chartColors.borderColors[0],
        borderWidth: 1,
      }
    ],
  };

  // Group ballots by date (using expiration as a proxy for creation date)
  const sortedBallots = [...filteredBallots].sort((a, b) => a.expiration - b.expiration);
  
  // Create date groupings
  const dateGroups = sortedBallots.reduce((acc, ballot) => {
    const date = new Date(ballot.expiration);
    const dateStr = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;

    if (!acc[dateStr]) {
      acc[dateStr] = {
        ballots: 0,
        votes: 0,
      };
    }

    acc[dateStr].ballots += 1;
    acc[dateStr].votes += ballot.totalVotes || 0;

    return acc;
  }, {} as Record<string, { ballots: number; votes: number }>);

  const dates = Object.keys(dateGroups);
  
  // Take last 10 days or all days if less than 10
  const activityLabels = dates.slice(-10);
  
  const activityData = {
    labels: activityLabels,
    datasets: [
      {
        label: "Votes",
        data: activityLabels.map((date) => dateGroups[date].votes),
        borderColor: chartColors.borderColors[1],
        backgroundColor: chartColors.backgroundColors[1],
        tension: 0.3,
        fill: true,
      },
      {
        label: "Ballots",
        data: activityLabels.map((date) => dateGroups[date].ballots),
        borderColor: chartColors.borderColors[0],
        backgroundColor: chartColors.backgroundColors[0],
        tension: 0.3,
        fill: true,
      },
    ],
  };

  const chartOptions = getStandardChartOptions(true);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold text-white">Ballot Analytics</h2>

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

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <Card className="bg-black/40 backdrop-blur-md border-white/20">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-medium text-white">Ballot Overview</CardTitle>
                <Users className="h-4 w-4 text-blue-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-blue-900/30 p-3 rounded-lg border border-blue-900/40">
                  <p className="text-xs text-blue-300 mb-1 font-medium">Total Ballots</p>
                  <p className="text-xl font-semibold text-blue-200">{totalBallots}</p>
                </div>
                <div className="bg-green-900/30 p-3 rounded-lg border border-green-900/40">
                  <p className="text-xs text-green-300 mb-1 font-medium">Total Votes</p>
                  <p className="text-xl font-semibold text-green-200">{totalVotes}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-purple-900/30 p-3 rounded-lg border border-purple-900/40">
                  <p className="text-xs text-purple-300 mb-1 font-medium">Active Ballots</p>
                  <p className="text-xl font-semibold text-purple-200">{activeBallots}</p>
                </div>
                <div className="bg-amber-900/30 p-3 rounded-lg border border-amber-900/40">
                  <p className="text-xs text-amber-300 mb-1 font-medium">Avg. Votes</p>
                  <p className="text-xl font-semibold text-amber-200">{averageVotesPerBallot}</p>
                </div>
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
                <CardTitle className="text-lg font-medium text-white">Ballot Status</CardTitle>
                <PieChart className="h-4 w-4 text-purple-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <Pie data={ballotStatusData} options={chartOptions} />
              </div>

              <div className="grid grid-cols-3 gap-2 mt-4">
                <div className="bg-blue-900/30 p-2 rounded-lg border border-blue-900/40">
                  <p className="text-xs text-blue-300 mb-1 font-medium">Active</p>
                  <p className="text-lg font-semibold text-blue-200">{activeBallots}</p>
                </div>
                <div className="bg-amber-900/30 p-2 rounded-lg border border-amber-900/40">
                  <p className="text-xs text-amber-300 mb-1 font-medium">Expired</p>
                  <p className="text-lg font-semibold text-amber-200">{expiredBallots}</p>
                </div>
                <div className="bg-gray-900/30 p-2 rounded-lg border border-gray-700">
                  <p className="text-xs text-gray-300 mb-1 font-medium">Delisted</p>
                  <p className="text-lg font-semibold text-gray-200">{delistedBallots}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="md:col-span-2 xl:col-span-1"
        >
          <Card className="bg-black/40 backdrop-blur-md border-white/20">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-medium text-white">Top Ballots</CardTitle>
                <BarChart3 className="h-4 w-4 text-green-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <Bar 
                  data={topBallotsData} 
                  options={{
                    ...chartOptions,
                    indexAxis: 'y' as const,
                  }}
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

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
  );
};

export default BallotStatisticsPanel;
