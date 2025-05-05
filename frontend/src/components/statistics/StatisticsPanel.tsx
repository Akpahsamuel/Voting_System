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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { motion } from "framer-motion";
import { BarChart3, PieChart, LineChart, TrendingUp } from "lucide-react";

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

interface ProposalData {
  id: string;
  title: string;
  votedYesCount: number;
  votedNoCount: number;
  expiration: number;
  status: string;
  creator: string;
}

export const StatisticsPanel = () => {
  const dashboardId = useNetworkVariable("dashboardId" as any);
  const [proposals, setProposals] = useState<ProposalData[]>([]);
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [timeRange, setTimeRange] = useState<"week" | "month" | "all">("month");

  // Fetch dashboard data to get proposal IDs
  const { data: dashboardData } = useSuiClientQuery("getObject", {
    id: dashboardId,
    options: {
      showContent: true,
    },
  });

  function getProposalIds() {
    if (dashboardData?.data?.content?.dataType !== "moveObject") return [];

    const fields = dashboardData.data.content.fields as any;
    return fields?.proposals_ids || [];
  }

  // Fetch all proposals
  const { data: proposalsData, isPending } = useSuiClientQuery("multiGetObjects", {
    ids: getProposalIds(),
    options: {
      showContent: true,
    },
  });

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
          title: fields.title || "Untitled Proposal",
          votedYesCount: Number(fields.voted_yes_count) || 0,
          votedNoCount: Number(fields.voted_no_count) || 0,
          expiration: Number(fields.expiration) || 0,
          status: fields.status?.variant || "Unknown",
          creator: fields.creator || "Unknown",
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
          <p className="text-sm text-white/70">Loading statistics...</p>
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

  // Vote distribution data for pie chart
  const voteDistributionData = {
    labels: ["Yes", "No"],
    datasets: [
      {
        data: [totalVotesYes, totalVotesNo],
        backgroundColor: [chartColors.semantic.yes, chartColors.semantic.no],
        borderColor: ["rgb(75, 192, 92)", "rgb(255, 99, 132)"],
        borderWidth: 1,
      },
    ],
  };

  // Proposal status data for pie chart
  // The contract now has an explicit Expired status
  const activeProposals = filteredProposals.filter((p) => p.status === "Active").length;
  const expiredProposals = filteredProposals.filter((p) => p.status === "Expired").length;
  const delistedProposals = filteredProposals.filter((p) => p.status === "Delisted").length;
  
  console.log("Statistics - Proposals by status:", { 
    active: activeProposals, 
    expired: expiredProposals, 
    delisted: delistedProposals, 
    total: filteredProposals.length 
  });

  const proposalStatusData = {
    labels: ["Active", "Expired", "Delisted"],
    datasets: [
      {
        data: [activeProposals, expiredProposals, delistedProposals],
        backgroundColor: [
          chartColors.semantic.active,
          chartColors.semantic.expired,
          chartColors.semantic.delisted,
        ],
        borderWidth: 1,
      },
    ],
  };

  // Group proposals by date (using expiration as a proxy for creation date)
  const sortedProposals = [...filteredProposals].sort((a, b) => a.expiration - b.expiration);
  
  // Create date groupings
  const dateGroups = sortedProposals.reduce((acc, proposal) => {
    const date = new Date(proposal.expiration);
    const dateStr = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;

    if (!acc[dateStr]) {
      acc[dateStr] = {
        proposals: 0,
        votes: 0,
      };
    }

    acc[dateStr].proposals += 1;
    acc[dateStr].votes += proposal.votedYesCount + proposal.votedNoCount;

    return acc;
  }, {} as Record<string, { proposals: number; votes: number }>);

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
        label: "Proposals",
        data: activityLabels.map((date) => dateGroups[date].proposals),
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
        <h2 className="text-2xl font-semibold text-white">Platform Analytics</h2>

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
                <CardTitle className="text-lg font-medium text-white">Vote Distribution</CardTitle>
                <PieChart className="h-4 w-4 text-blue-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <Doughnut data={voteDistributionData} options={chartOptions} />
              </div>

              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="bg-green-900/30 p-3 rounded-lg border border-green-900/40">
                  <p className="text-xs text-green-300 mb-1 font-medium">Yes Votes</p>
                  <p className="text-xl font-semibold text-green-200">{totalVotesYes}</p>
                  <p className="text-xs text-green-300/90">
                    {totalVotes > 0 ? `${((totalVotesYes / totalVotes) * 100).toFixed(1)}%` : "0%"}
                  </p>
                </div>
                <div className="bg-red-900/30 p-3 rounded-lg border border-red-900/40">
                  <p className="text-xs text-red-300 mb-1 font-medium">No Votes</p>
                  <p className="text-xl font-semibold text-red-200">{totalVotesNo}</p>
                  <p className="text-xs text-red-300/90">
                    {totalVotes > 0 ? `${((totalVotesNo / totalVotes) * 100).toFixed(1)}%` : "0%"}
                  </p>
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
                <CardTitle className="text-lg font-medium text-white">Proposal Status</CardTitle>
                <BarChart3 className="h-4 w-4 text-purple-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <Pie data={proposalStatusData} options={chartOptions} />
              </div>

              <div className="grid grid-cols-3 gap-2 mt-4">
                <div className="bg-blue-900/30 p-2 rounded-lg border border-blue-900/40">
                  <p className="text-xs text-blue-300 mb-1 font-medium">Active</p>
                  <p className="text-lg font-semibold text-blue-200">{activeProposals}</p>
                </div>
                <div className="bg-amber-900/30 p-2 rounded-lg border border-amber-900/40">
                  <p className="text-xs text-amber-300 mb-1 font-medium">Expired</p>
                  <p className="text-lg font-semibold text-amber-200">{expiredProposals}</p>
                </div>
                <div className="bg-gray-900/30 p-2 rounded-lg border border-gray-700">
                  <p className="text-xs text-gray-300 mb-1 font-medium">Delisted</p>
                  <p className="text-lg font-semibold text-gray-200">{delistedProposals}</p>
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

export default StatisticsPanel;
