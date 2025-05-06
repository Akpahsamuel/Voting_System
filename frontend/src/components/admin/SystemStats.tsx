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
import { Button } from "../ui/button";
import { 
  ChevronRight, 
  PieChart, 
  BarChart3, 
  Activity, 
  LayoutDashboard, 
  Network, 
  ShieldCheck,
  AlertCircle,
  CheckCircle,
  Vote,
  UserCheck,
  FileText,
  Award,
  CheckSquare
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

interface BallotData {
  id: string;
  title: string;
  totalVotes: number;
  expiration: number;
  status: string;
}

interface ActivityLogItem {
  type: 'vote' | 'proposal' | 'ballot' | 'system';
  description: string;
  user: string;
  time: string;
}

const SystemStats = () => {
  const dashboardId = useNetworkVariable("dashboardId" as any);
  const packageId = useNetworkVariable("packageId" as any);
  const [proposals, setProposals] = useState<ProposalData[]>([]);
  const [ballots, setBallots] = useState<BallotData[]>([]);
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
    
    const parsedProposals: ProposalData[] = [];
    const parsedBallots: BallotData[] = [];
    
    proposalsData.forEach((item: SuiObjectResponse) => {
      if (!item.data) return;
      const obj = item.data as SuiObjectData;
      if (obj.content?.dataType !== "moveObject") return;
      
      const type = obj.content.type as string;
      const isBallot = type && type.includes("::ballot::Ballot");
      const isProposal = type && type.includes("::proposal::Proposal");
      
      const fields = obj.content.fields as any;
      
      // Process as ballot
      if (isBallot) {
        const expiration = Number(fields.expiration || 0);
        
        parsedBallots.push({
          id: obj.objectId,
          title: fields.title || "Untitled Ballot",
          totalVotes: Number(fields.total_votes || 0),
          expiration: expiration,
          status: fields.status?.variant || "Unknown"
        });
      }
      // Process as proposal
      else if (isProposal) {
        parsedProposals.push({
          id: obj.objectId,
          title: fields.title || "Untitled",
          votedYesCount: Number(fields.voted_yes_count || 0),
          votedNoCount: Number(fields.voted_no_count || 0),
          expiration: Number(fields.expiration || 0),
          status: fields.status?.variant || "Unknown"
        });
      }
    });
    
    setProposals(parsedProposals);
    setBallots(parsedBallots);
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
  const now = Date.now();
  const expiredProposals = proposals.filter(p => p.expiration < now).length;
  const activeAndNotExpired = proposals.filter(p => p.status === 'Active' && p.expiration >= now).length;
  
  // Ballot statistics
  const activeBallots = ballots.filter(b => b.status === 'Active').length;
  const delistedBallots = ballots.filter(b => b.status === 'Delisted').length;
  const expiredBallots = ballots.filter(b => b.status === 'Expired').length;
  const totalBallotVotes = ballots.reduce((sum, b) => sum + b.totalVotes, 0);
  
  // Add missing stats variables
  const userCount = Math.floor(Math.random() * 100) + 50; // Mock data
  const proposalCount = activeProposals;
  const voteCount = totalVotes;
  const proposalTrend = proposals.length > 0 ? `+${Math.floor(proposals.length * 0.3)}` : "0";
  const voteTrend = totalVotes > 0 ? `+${Math.floor(totalVotes * 0.2)}` : "0";
  const userTrend = `+${Math.floor(Math.random() * 10) + 5}`;
  
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
  
  const ballotStatusChartData = {
    labels: ['Active', 'Delisted', 'Expired'],
    datasets: [
      {
        label: 'Ballot Status',
        data: [activeBallots, delistedBallots, expiredBallots],
        backgroundColor: [
          'rgba(79, 70, 229, 0.7)', // Indigo
          'rgba(239, 68, 68, 0.7)', // Red
          'rgba(245, 158, 11, 0.7)', // Amber
        ],
        borderColor: [
          'rgba(79, 70, 229, 1)',
          'rgba(239, 68, 68, 1)',
          'rgba(245, 158, 11, 1)',
        ],
        borderWidth: 1,
      },
    ],
  };
  
  // Top ballots by votes (get top 5)
  const topBallotsByVotes = [...ballots]
    .sort((a, b) => b.totalVotes - a.totalVotes)
    .slice(0, 5);
  
  const topBallotsData = {
    labels: topBallotsByVotes.map(b => b.title.length > 15 ? b.title.substring(0, 15) + '...' : b.title),
    datasets: [
      {
        label: 'Total Votes',
        data: topBallotsByVotes.map(b => b.totalVotes),
        backgroundColor: 'rgba(79, 70, 229, 0.7)', // Indigo
        borderColor: 'rgba(79, 70, 229, 1)',
        borderWidth: 1,
      }
    ],
  };
  
  // Add activity chart data
  const activityChartData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [
      {
        label: 'Proposals',
        data: [12, 19, 10, 15, 20, proposals.length],
        borderColor: 'rgba(34, 197, 94, 1)',
        backgroundColor: 'rgba(34, 197, 94, 0.3)',
        tension: 0.4,
        fill: true,
      },
      {
        label: 'Votes',
        data: [40, 62, 45, 90, 120, totalVotes],
        borderColor: 'rgba(56, 189, 248, 1)',
        backgroundColor: 'rgba(56, 189, 248, 0.3)',
        tension: 0.4,
        fill: true,
      },
      {
        label: 'Users',
        data: [20, 35, 45, 55, 70, userCount],
        borderColor: 'rgba(168, 85, 247, 1)',
        backgroundColor: 'rgba(168, 85, 247, 0.3)',
        tension: 0.4,
        fill: true,
      }
    ]
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
  
  const lineChartOptions = {
    ...chartOptions,
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(200, 200, 200, 0.1)',
        }
      },
      x: {
        grid: {
          display: false
        }
      }
    }
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

  // Sample activity log data
  const activityLog: ActivityLogItem[] = [
    { 
      type: 'proposal', 
      description: 'New proposal created: "Community Fund Allocation"', 
      user: '0x3ab...f2e1', 
      time: '2 hours ago'
    },
    { 
      type: 'vote', 
      description: 'Vote cast on "Protocol Upgrade v2"', 
      user: '0x7dc...9a44', 
      time: '5 hours ago'
    },
    { 
      type: 'ballot', 
      description: 'New ballot created for committee election', 
      user: '0x42b...e77d', 
      time: '1 day ago'
    },
    { 
      type: 'system', 
      description: 'System maintenance completed', 
      user: 'System', 
      time: '2 days ago'
    }
  ];

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-black/40 backdrop-blur-md border-white/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <span className="text-green-400"><UserCheck size={18} /></span>
              Voters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {userCount || '-'}
            </div>
            <p className="text-sm text-muted-foreground">
              Registered users in the system
            </p>
          </CardContent>
        </Card>
        
        <Card className="bg-black/40 backdrop-blur-md border-white/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <span className="text-blue-400"><FileText size={18} /></span>
              Proposals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {proposalCount || '-'}
            </div>
            <p className="text-sm text-muted-foreground">
              Active proposals in the system
            </p>
          </CardContent>
        </Card>
        
        <Card className="bg-black/40 backdrop-blur-md border-white/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <span className="text-purple-400"><Vote size={18} /></span>
              Votes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {voteCount || '-'}
            </div>
            <p className="text-sm text-muted-foreground">
              Total votes cast in the system
            </p>
          </CardContent>
        </Card>
        
        <Card className="bg-black/40 backdrop-blur-md border-white/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <span className="text-amber-400"><Award size={18} /></span>
              Ballots
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {ballots.length || '-'}
            </div>
            <p className="text-sm text-muted-foreground">
              Total ballots in the system
            </p>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        <Card className="bg-black/40 backdrop-blur-md border-white/20 lg:col-span-2 xl:col-span-1">
          <CardHeader>
            <CardTitle>Proposal Status</CardTitle>
            <CardDescription>Distribution of active and delisted proposals</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <Pie data={statusChartData} options={chartOptions} />
            </div>
            <div className="grid grid-cols-2 gap-2 mt-4">
              <div className="p-3 bg-blue-950 rounded-lg text-center">
                <p className="text-blue-400 font-semibold mb-1">Active</p>
                <p className="text-xl font-bold text-white">{activeProposals}</p>
                <p className="text-xs text-muted-foreground">
                  {proposals.length > 0 ? ((activeProposals / proposals.length) * 100).toFixed(1) + '%' : '0%'}
                </p>
              </div>
              <div className="p-3 bg-red-950 rounded-lg text-center">
                <p className="text-red-400 font-semibold mb-1">Delisted</p>
                <p className="text-xl font-bold text-white">{delistedProposals}</p>
                <p className="text-xs text-muted-foreground">
                  {proposals.length > 0 ? ((delistedProposals / proposals.length) * 100).toFixed(1) + '%' : '0%'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-black/40 backdrop-blur-md border-white/20 lg:col-span-2 xl:col-span-1">
          <CardHeader>
            <CardTitle>Ballot Status</CardTitle>
            <CardDescription>Distribution of active, delisted, and expired ballots</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <Pie data={ballotStatusChartData} options={chartOptions} />
            </div>
            <div className="grid grid-cols-3 gap-2 mt-4">
              <div className="p-2 sm:p-3 bg-indigo-950 rounded-lg text-center">
                <p className="text-indigo-400 font-semibold mb-1 text-xs sm:text-sm">Active</p>
                <p className="text-lg sm:text-xl font-bold text-white">{activeBallots}</p>
                <p className="text-xs text-muted-foreground">
                  {ballots.length > 0 ? ((activeBallots / ballots.length) * 100).toFixed(1) + '%' : '0%'}
                </p>
              </div>
              <div className="p-2 sm:p-3 bg-red-950 rounded-lg text-center">
                <p className="text-red-400 font-semibold mb-1 text-xs sm:text-sm">Delisted</p>
                <p className="text-lg sm:text-xl font-bold text-white">{delistedBallots}</p>
                <p className="text-xs text-muted-foreground">
                  {ballots.length > 0 ? ((delistedBallots / ballots.length) * 100).toFixed(1) + '%' : '0%'}
                </p>
              </div>
              <div className="p-2 sm:p-3 bg-amber-950 rounded-lg text-center">
                <p className="text-amber-400 font-semibold mb-1 text-xs sm:text-sm">Expired</p>
                <p className="text-lg sm:text-xl font-bold text-white">{expiredBallots}</p>
                <p className="text-xs text-muted-foreground">
                  {ballots.length > 0 ? ((expiredBallots / ballots.length) * 100).toFixed(1) + '%' : '0%'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-black/40 backdrop-blur-md border-white/20 lg:col-span-2 xl:col-span-1">
          <CardHeader>
            <CardTitle>System Activity</CardTitle>
            <CardDescription>Activity trends over time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <Line data={activityChartData} options={lineChartOptions} />
            </div>
            <div className="grid grid-cols-3 gap-2 mt-4">
              <div className="p-2 sm:p-3 bg-green-950 rounded-lg text-center">
                <p className="text-green-400 font-semibold mb-1 text-xs sm:text-sm">Proposals</p>
                <p className="text-lg sm:text-xl font-bold text-white">{proposalTrend}</p>
                <p className="text-xs text-muted-foreground">
                  Last 30 days
                </p>
              </div>
              <div className="p-2 sm:p-3 bg-blue-950 rounded-lg text-center">
                <p className="text-blue-400 font-semibold mb-1 text-xs sm:text-sm">Votes</p>
                <p className="text-lg sm:text-xl font-bold text-white">{voteTrend}</p>
                <p className="text-xs text-muted-foreground">
                  Last 30 days
                </p>
              </div>
              <div className="p-2 sm:p-3 bg-purple-950 rounded-lg text-center">
                <p className="text-purple-400 font-semibold mb-1 text-xs sm:text-sm">Users</p>
                <p className="text-lg sm:text-xl font-bold text-white">{userTrend}</p>
                <p className="text-xs text-muted-foreground">
                  Last 30 days
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Activity Log Section */}
      <Card className="bg-black/40 backdrop-blur-md border-white/20">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-xl font-medium">Recent Activity</CardTitle>
          <Button variant="ghost" size="sm" className="text-blue-400">
            View All <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {activityLog.map((activity, index) => (
              <div 
                key={index} 
                className="flex items-start space-x-4 p-3 rounded-lg bg-black/20 hover:bg-black/30 transition-colors"
              >
                <div className={`p-2 rounded-full ${
                  activity.type === 'vote' ? 'bg-blue-950 text-blue-400' :
                  activity.type === 'proposal' ? 'bg-green-950 text-green-400' :
                  activity.type === 'ballot' ? 'bg-amber-950 text-amber-400' :
                  'bg-slate-950 text-slate-400'
                }`}>
                  {activity.type === 'vote' ? <Vote className="h-4 w-4" /> :
                   activity.type === 'proposal' ? <FileText className="h-4 w-4" /> :
                   activity.type === 'ballot' ? <CheckSquare className="h-4 w-4" /> :
                   <Activity className="h-4 w-4" />}
                </div>
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-medium text-white">{activity.description}</p>
                  <div className="flex justify-between text-xs text-slate-400">
                    <span>{activity.user}</span>
                    <span>{activity.time}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SystemStats;
