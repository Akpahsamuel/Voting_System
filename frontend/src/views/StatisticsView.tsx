import { useSuiClientQuery } from "@mysten/dapp-kit";
import { useNetworkVariable } from "../config/networkConfig";
import { SuiObjectData, SuiObjectResponse } from "@mysten/sui/client";
import { useEffect, useState } from "react";
import { useCurrentAccount } from "@mysten/dapp-kit";
import { useVoteNfts } from "../hooks/useVoteNfts";
import { VoteNft } from "../types";
import { Chart as ChartJS, ArcElement, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, TimeScale,} from 'chart.js';
import { Pie, Bar, Line } from 'react-chartjs-2';
import 'chart.js/auto';
import { NavLink } from "react-router-dom";
import { ConnectButton } from "@mysten/dapp-kit";
import { Home, FileText, Wallet, ShieldCheck, BarChart2, Menu } from "lucide-react";
import { Button } from "../components/ui/button";

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
  Legend,
  TimeScale
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

const StatisticsView = () => {
  const dashboardId = useNetworkVariable("dashboardId");
  const [proposals, setProposals] = useState<ProposalData[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'voting' | 'user'>('overview');
  const account = useCurrentAccount();
  const { data: voteNftsRes } = useVoteNfts();
  
  // Fetch dashboard data to get proposal IDs
  const { data: dashboardData } = useSuiClientQuery(
    "getObject",
    {
      id: dashboardId,
      options: {
        showContent: true,
      },
    }
  );
  
  function getProposalIds() {
    if (!dashboardData?.data) return [];
    const dashboardObj = dashboardData.data as SuiObjectData;
    if (dashboardObj.content?.dataType !== "moveObject") return [];
    return (dashboardObj.content.fields as any)?.proposals_ids || [];
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
      .filter(Boolean) as ProposalData[];
    
    setProposals(parsedProposals);
  }, [proposalsData]);
  
  // Extract user vote NFTs
  const userVoteNfts = extractVoteNfts(voteNftsRes);
  
  // Calculate statistics
  const totalProposals = proposals.length;
  const activeProposals = proposals.filter(p => p.status === 'Active').length;
  const delistedProposals = proposals.filter(p => p.status === 'Delisted').length;
  
  const totalVotesYes = proposals.reduce((sum, p) => sum + p.votedYesCount, 0);
  const totalVotesNo = proposals.reduce((sum, p) => sum + p.votedNoCount, 0);
  const totalVotes = totalVotesYes + totalVotesNo;
  
  // Current date to check for expired proposals
  const now = new Date().getTime();
  const expiredProposals = proposals.filter(p => p.expiration < now).length;
  const activeAndNotExpired = proposals.filter(p => p.status === 'Active' && p.expiration >= now).length;

  // User participation
  const userVotedCount = userVoteNfts.length;
  const userVotedProposals = userVoteNfts.map((nft: VoteNft) => nft.proposalId);
  const userParticipationRate = totalProposals > 0 ? (userVotedCount / totalProposals) * 100 : 0;
  
  // Vote distribution over time
  // Sort proposals by expiration date (creation date proxy)
  const sortedByDate = [...proposals].sort((a, b) => a.expiration - b.expiration);
  
  // Prepare Timeline Data - Cumulative votes over time
  const timelineLabels = sortedByDate.map(p => new Date(p.expiration - 7 * 24 * 60 * 60 * 1000).toLocaleDateString());
  const cumulativeYesVotes = [];
  const cumulativeNoVotes = [];
  let runningYesTotal = 0;
  let runningNoTotal = 0;
  
  for (const proposal of sortedByDate) {
    runningYesTotal += proposal.votedYesCount;
    runningNoTotal += proposal.votedNoCount;
    cumulativeYesVotes.push(runningYesTotal);
    cumulativeNoVotes.push(runningNoTotal);
  }
  
  const timelineData = {
    labels: timelineLabels,
    datasets: [
      {
        label: 'Yes Votes',
        data: cumulativeYesVotes,
        borderColor: 'rgba(75, 192, 192, 1)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        tension: 0.4,
      },
      {
        label: 'No Votes',
        data: cumulativeNoVotes,
        borderColor: 'rgba(255, 99, 132, 1)',
        backgroundColor: 'rgba(255, 99, 132, 0.2)',
        tension: 0.4,
      }
    ]
  };
  
  // Status distribution data
  const statusDistributionData = {
    labels: ['Active', 'Delisted', 'Expired'],
    datasets: [
      {
        label: 'Proposal Status',
        data: [
          activeProposals - expiredProposals, 
          delistedProposals,
          expiredProposals
        ],
        backgroundColor: [
          'rgba(75, 192, 192, 0.5)',
          'rgba(255, 99, 132, 0.5)',
          'rgba(255, 159, 64, 0.5)'
        ],
        borderColor: [
          'rgba(75, 192, 192, 1)',
          'rgba(255, 99, 132, 1)',
          'rgba(255, 159, 64, 1)'
        ],
        borderWidth: 1,
      },
    ],
  };
  
  // Vote distribution data
  const voteDistributionData = {
    labels: ['Yes Votes', 'No Votes'],
    datasets: [
      {
        label: 'Vote Distribution',
        data: [totalVotesYes, totalVotesNo],
        backgroundColor: [
          'rgba(54, 162, 235, 0.5)',
          'rgba(255, 99, 132, 0.5)',
        ],
        borderColor: [
          'rgba(54, 162, 235, 1)',
          'rgba(255, 99, 132, 1)',
        ],
        borderWidth: 1,
      },
    ],
  };
  
  // Top proposals by votes (top 5)
  const topProposalsByVotes = [...proposals]
    .sort((a, b) => (b.votedYesCount + b.votedNoCount) - (a.votedYesCount + a.votedNoCount))
    .slice(0, 5);
  
  const topProposalsData = {
    labels: topProposalsByVotes.map(p => p.title.length > 20 ? p.title.substring(0, 20) + '...' : p.title),
    datasets: [
      {
        label: 'Yes Votes',
        data: topProposalsByVotes.map(p => p.votedYesCount),
        backgroundColor: 'rgba(75, 192, 192, 0.5)',
        borderColor: 'rgba(75, 192, 192, 1)',
        borderWidth: 1,
      },
      {
        label: 'No Votes',
        data: topProposalsByVotes.map(p => p.votedNoCount),
        backgroundColor: 'rgba(255, 99, 132, 0.5)',
        borderColor: 'rgba(255, 99, 132, 1)',
        borderWidth: 1,
      },
    ],
  };

  // User-specific voted proposals
  const userVotedProposalDetails = proposals.filter(p => userVotedProposals.includes(p.id));
  
  if (isPending) return <div className="text-center text-gray-500 p-8">Loading statistics...</div>;
  
  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      <nav className="fixed top-0 left-0 right-0 z-40 bg-white dark:bg-gray-900 shadow-sm transition-all duration-300">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <span className="font-bold text-xl bg-gradient-to-r from-blue-500 to-cyan-500 bg-clip-text text-transparent">
              SuiVote
            </span>
            
            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-1">
              <NavLink to="/" className={({isActive}) => `px-3 py-2 rounded-md text-sm font-medium flex items-center gap-1.5 ${isActive ? "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30" : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800/60"}`}>
                <Home size={18} /> Home
              </NavLink>
              <NavLink to="/proposal" className={({isActive}) => `px-3 py-2 rounded-md text-sm font-medium flex items-center gap-1.5 ${isActive ? "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30" : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800/60"}`}>
                <FileText size={18} /> Proposals
              </NavLink>
              <NavLink to="/wallet" className={({isActive}) => `px-3 py-2 rounded-md text-sm font-medium flex items-center gap-1.5 ${isActive ? "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30" : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800/60"}`}>
                <Wallet size={18} /> Wallet
              </NavLink>
              <NavLink to="/statistics" className={({isActive}) => `px-3 py-2 rounded-md text-sm font-medium flex items-center gap-1.5 ${isActive ? "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30" : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800/60"}`}>
                <BarChart2 size={18} /> Statistics
              </NavLink>
              <NavLink to="/admin" className={({isActive}) => `px-3 py-2 rounded-md text-sm font-medium flex items-center gap-1.5 ${isActive ? "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30" : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800/60"}`}>
                <ShieldCheck size={18} /> Admin
              </NavLink>
            </div>
            
            {/* Connect Button and Mobile Menu */}
            <div className="flex items-center gap-2">
              <ConnectButton />
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu size={20} />
              </Button>
            </div>
          </div>
        </div>
      </nav>
      
      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700 mb-8">
        <nav className="-mb-px flex">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-4 px-6 font-medium text-sm ${
              activeTab === 'overview'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 hover:border-gray-300'
            }`}
          >
            Platform Overview
          </button>
          <button
            onClick={() => setActiveTab('voting')}
            className={`py-4 px-6 font-medium text-sm ${
              activeTab === 'voting'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 hover:border-gray-300'
            }`}
          >
            Voting Activity
          </button>
          <button
            onClick={() => setActiveTab('user')}
            className={`py-4 px-6 font-medium text-sm ${
              activeTab === 'user'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 hover:border-gray-300'
            }`}
          >
            Your Activity
          </button>
        </nav>
      </div>
      
      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <>
          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md">
              <h3 className="text-lg font-medium text-gray-500 dark:text-gray-300 mb-2">Total Proposals</h3>
              <p className="text-3xl font-bold">{totalProposals}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md">
              <h3 className="text-lg font-medium text-gray-500 dark:text-gray-300 mb-2">Active Proposals</h3>
              <p className="text-3xl font-bold text-blue-500">{activeAndNotExpired}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md">
              <h3 className="text-lg font-medium text-gray-500 dark:text-gray-300 mb-2">Total Votes</h3>
              <p className="text-3xl font-bold">{totalVotes}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md">
              <h3 className="text-lg font-medium text-gray-500 dark:text-gray-300 mb-2">Avg. Votes/Proposal</h3>
              <p className="text-3xl font-bold text-green-500">
                {totalProposals > 0 ? (totalVotes / totalProposals).toFixed(1) : '0'}
              </p>
            </div>
          </div>
          
          {/* Status Chart */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md">
              <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-4">Proposal Status</h3>
              <div className="h-64">
                <Pie data={statusDistributionData} options={{ maintainAspectRatio: false }} />
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md">
              <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-4">Vote Distribution</h3>
              <div className="h-64">
                <Pie data={voteDistributionData} options={{ maintainAspectRatio: false }} />
              </div>
            </div>
          </div>
          
          {/* Timeline Chart */}
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md mb-8">
            <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-4">Voting Activity Over Time</h3>
            <div className="h-64">
              <Line 
                data={timelineData} 
                options={{ 
                  maintainAspectRatio: false,
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
          </div>
        </>
      )}
      
      {/* Voting Activity Tab */}
      {activeTab === 'voting' && (
        <>
          {/* Top Proposals */}
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md mb-8">
            <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-4">Most Active Proposals</h3>
            <div className="h-80">
              <Bar 
                data={topProposalsData} 
                options={{ 
                  maintainAspectRatio: false,
                  indexAxis: 'y',
                  scales: {
                    x: {
                      beginAtZero: true,
                      stacked: false,
                      grid: {
                        color: 'rgba(200, 200, 200, 0.2)',
                      }
                    },
                    y: {
                      stacked: false,
                      grid: {
                        display: false
                      }
                    }
                  }
                }} 
              />
            </div>
          </div>
          
          {/* Proposal List */}
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md">
            <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-4">All Proposals</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-100 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Title</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Yes Votes</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">No Votes</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Total</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Expiration</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
                  {proposals.map((proposal) => (
                    <tr key={proposal.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">{proposal.title}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          proposal.status === "Active" && proposal.expiration > now
                            ? "bg-green-100 text-green-800"
                            : proposal.status === "Delisted"
                              ? "bg-red-100 text-red-800"
                              : "bg-yellow-100 text-yellow-800"
                        }`}>
                          {proposal.status === "Active" && proposal.expiration > now
                            ? "Active"
                            : proposal.status === "Delisted"
                              ? "Delisted"
                              : "Expired"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {proposal.votedYesCount}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {proposal.votedNoCount}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {proposal.votedYesCount + proposal.votedNoCount}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {new Date(proposal.expiration).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
      
      {/* User Activity Tab */}
      {activeTab === 'user' && (
        <>
          {account ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md">
                  <h3 className="text-lg font-medium text-gray-500 dark:text-gray-300 mb-2">Your Participation</h3>
                  <p className="text-3xl font-bold text-blue-500">{userVotedCount} / {totalProposals}</p>
                  <div className="mt-4">
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Participation Rate</span>
                      <span className="text-sm font-medium text-blue-500">{userParticipationRate.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2.5">
                      <div 
                        className="bg-blue-500 h-2.5 rounded-full" 
                        style={{ width: `${userParticipationRate}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md">
                  <h3 className="text-lg font-medium text-gray-500 dark:text-gray-300 mb-2">Your Status</h3>
                  <p className="text-3xl font-bold text-green-500">
                    {userVotedCount > 0 ? (
                      userVotedCount > totalProposals / 2 ? 'Active Voter' : 'Occasional Voter'
                    ) : 'Not Participated'}
                  </p>
                  <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
                    {userVotedCount > 0 ? (
                      userVotedCount > totalProposals / 2 
                        ? 'You are highly engaged with the platform!'
                        : 'You have started participating in voting.'
                    ) : 'You have not voted on any proposals yet.'}
                  </p>
                </div>
                
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md">
                  <h3 className="text-lg font-medium text-gray-500 dark:text-gray-300 mb-2">Proposals to Vote</h3>
                  <p className="text-3xl font-bold text-orange-500">
                    {totalProposals - userVotedCount}
                  </p>
                  <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
                    {totalProposals - userVotedCount > 0 
                      ? 'There are still proposals waiting for your vote!' 
                      : 'You have voted on all available proposals!'}
                  </p>
                </div>
              </div>
              
              {/* User's Voted Proposals */}
              {userVotedCount > 0 ? (
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md">
                  <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-4">Your Voted Proposals</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className="bg-gray-100 dark:bg-gray-700">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Proposal</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Yes Votes</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">No Votes</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
                        {userVotedProposalDetails.map((proposal) => (
                          <tr key={proposal.id}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900 dark:text-white">{proposal.title}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                proposal.status === "Active" && proposal.expiration > now 
                                  ? "bg-green-100 text-green-800" 
                                  : proposal.status === "Delisted" 
                                    ? "bg-red-100 text-red-800" 
                                    : "bg-yellow-100 text-yellow-800"
                              }`}>
                                {proposal.status === "Active" && proposal.expiration > now 
                                  ? "Active" 
                                  : proposal.status === "Delisted" 
                                    ? "Delisted" 
                                    : "Expired"}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                              {proposal.votedYesCount}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                              {proposal.votedNoCount}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md text-center">
                  <h3 className="text-xl font-medium text-gray-700 dark:text-gray-300 mb-4">No Activity Yet</h3>
                  <p className="text-gray-500 dark:text-gray-400">
                    You haven't voted on any proposals yet. Check out the available proposals and make your voice heard!
                  </p>
                  <button 
                    onClick={() => window.location.href = '/'}
                    className="mt-6 bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-md transition-colors"
                  >
                    View Proposals
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md text-center">
              <h3 className="text-xl font-medium text-gray-700 dark:text-gray-300 mb-4">Connect Your Wallet</h3>
              <p className="text-gray-500 dark:text-gray-400">
                Please connect your wallet to view your personal voting statistics.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

function extractVoteNfts(nftRes: any) {
  if (!nftRes?.data) return [];

  return nftRes.data.map((nftObject: any) => {
    if (nftObject.data?.content?.dataType !== "moveObject") {
      return {id: {id: ""}, url: "", proposalId: ""};
    }
  
    const { proposal_id: proposalId, url, id } = nftObject.data.content.fields as any;
  
    return {
      proposalId,
      id,
      url
    };
  });
}

export default StatisticsView; 