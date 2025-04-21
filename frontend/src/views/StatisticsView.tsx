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
import React from 'react';
import Navbar from '../components/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";

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

const StatisticsView: React.FC = () => {
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
  
  if (isPending) return <div className="text-center text-gray-500 min-h-screen bg-black bg-grid-pattern pt-24">Loading statistics...</div>;
  
  return (
    <div className="min-h-screen bg-black bg-grid-pattern text-white">
      <Navbar />
      <div className="container mx-auto px-4 pt-24 pb-12">
        <h1 className="text-3xl font-bold mb-6">Voting Statistics</h1>
        
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="bg-white/10 mb-6">
            <TabsTrigger value="overview">Platform Overview</TabsTrigger>
            <TabsTrigger value="voting">Voting Activity</TabsTrigger>
            <TabsTrigger value="user">Your Activity</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview">
            {/* Key Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-white/10 backdrop-blur-md p-4 rounded-lg border border-white/20">
                <h3 className="text-lg font-medium text-white/70 mb-2">Total Proposals</h3>
                <p className="text-3xl font-bold text-white">{totalProposals}</p>
              </div>
              <div className="bg-white/10 backdrop-blur-md p-4 rounded-lg border border-white/20">
                <h3 className="text-lg font-medium text-white/70 mb-2">Active Proposals</h3>
                <p className="text-3xl font-bold text-blue-400">{activeAndNotExpired}</p>
              </div>
              <div className="bg-white/10 backdrop-blur-md p-4 rounded-lg border border-white/20">
                <h3 className="text-lg font-medium text-white/70 mb-2">Total Votes</h3>
                <p className="text-3xl font-bold text-white">{totalVotes}</p>
              </div>
              <div className="bg-white/10 backdrop-blur-md p-4 rounded-lg border border-white/20">
                <h3 className="text-lg font-medium text-white/70 mb-2">Avg. Votes/Proposal</h3>
                <p className="text-3xl font-bold text-green-400">
                  {totalProposals > 0 ? (totalVotes / totalProposals).toFixed(1) : '0'}
                </p>
              </div>
            </div>
            
            {/* Status Chart */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <Card className="bg-white/10 backdrop-blur-md border-white/20">
                <CardHeader>
                  <CardTitle className="text-white">Proposal Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <Pie 
                      data={statusDistributionData} 
                      options={{ 
                        maintainAspectRatio: false,
                        plugins: {
                          legend: {
                            labels: {
                              color: 'white'
                            }
                          }
                        }
                      }} 
                    />
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-white/10 backdrop-blur-md border-white/20">
                <CardHeader>
                  <CardTitle className="text-white">Vote Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <Pie 
                      data={voteDistributionData} 
                      options={{ 
                        maintainAspectRatio: false,
                        plugins: {
                          legend: {
                            labels: {
                              color: 'white'
                            }
                          }
                        }
                      }} 
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* Timeline Chart */}
            <Card className="bg-white/10 backdrop-blur-md border-white/20 mb-8">
              <CardHeader>
                <CardTitle className="text-white">Voting Activity Over Time</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <Line 
                    data={timelineData} 
                    options={{ 
                      maintainAspectRatio: false,
                      scales: {
                        y: {
                          beginAtZero: true,
                          ticks: { color: 'white' }
                        },
                        x: {
                          ticks: { color: 'white' }
                        }
                      },
                      plugins: {
                        legend: {
                          labels: {
                            color: 'white'
                          }
                        }
                      }
                    }} 
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="voting">
            {/* Top Proposals */}
            <Card className="bg-white/10 backdrop-blur-md border-white/20 mb-8">
              <CardHeader>
                <CardTitle className="text-white">Most Active Proposals</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <Bar 
                    data={topProposalsData} 
                    options={{ 
                      maintainAspectRatio: false,
                      indexAxis: 'y',
                      scales: {
                        x: {
                          beginAtZero: true,
                          ticks: { color: 'white' }
                        },
                        y: {
                          ticks: { color: 'white' }
                        }
                      },
                      plugins: {
                        legend: {
                          labels: {
                            color: 'white'
                          }
                        }
                      }
                    }} 
                  />
                </div>
              </CardContent>
            </Card>
            
            {/* Proposal List */}
            <Card className="bg-white/10 backdrop-blur-md border-white/20">
              <CardHeader>
                <CardTitle className="text-white">All Proposals</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-white/20">
                    <thead>
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">Title</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">Yes Votes</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">No Votes</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">Total</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">Expiration</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10">
                      {proposals.map((proposal) => (
                        <tr key={proposal.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-white">{proposal.title}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              proposal.status === "Active" && proposal.expiration > now
                                ? "bg-green-900/60 text-green-300"
                                : proposal.status === "Delisted"
                                  ? "bg-red-900/60 text-red-300"
                                  : "bg-yellow-900/60 text-yellow-300"
                            }`}>
                              {proposal.status === "Active" && proposal.expiration > now
                                ? "Active"
                                : proposal.status === "Delisted"
                                  ? "Delisted"
                                  : "Expired"}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-white/80">
                            {proposal.votedYesCount}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-white/80">
                            {proposal.votedNoCount}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-white/80">
                            {proposal.votedYesCount + proposal.votedNoCount}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-white/80">
                            {new Date(proposal.expiration).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="user">
            {account ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  <Card className="bg-white/10 backdrop-blur-md border-white/20">
                    <CardHeader>
                      <CardTitle className="text-white text-lg">Your Participation</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-3xl font-bold text-blue-400 mb-4">{userVotedCount} / {totalProposals}</p>
                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-sm font-medium text-white/70">Participation Rate</span>
                          <span className="text-sm font-medium text-blue-400">{userParticipationRate.toFixed(1)}%</span>
                        </div>
                        <div className="w-full bg-white/20 rounded-full h-2.5">
                          <div 
                            className="bg-blue-500 h-2.5 rounded-full" 
                            style={{ width: `${userParticipationRate}%` }}
                          ></div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-white/10 backdrop-blur-md border-white/20">
                    <CardHeader>
                      <CardTitle className="text-white text-lg">Your Status</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold text-green-400 mb-2">
                        {userVotedCount > 0 ? (
                          userVotedCount > totalProposals / 2 ? 'Active Voter' : 'Occasional Voter'
                        ) : 'Not Participated'}
                      </p>
                      <p className="text-sm text-white/70">
                        {userVotedCount > 0 ? (
                          userVotedCount > totalProposals / 2 
                            ? 'You are highly engaged with the platform!'
                            : 'You have started participating in voting.'
                        ) : 'You have not voted on any proposals yet.'}
                      </p>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-white/10 backdrop-blur-md border-white/20">
                    <CardHeader>
                      <CardTitle className="text-white text-lg">Proposals to Vote</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold text-orange-400 mb-2">
                        {totalProposals - userVotedCount}
                      </p>
                      <p className="text-sm text-white/70">
                        {totalProposals - userVotedCount > 0 
                          ? 'There are still proposals waiting for your vote!' 
                          : 'You have voted on all available proposals!'}
                      </p>
                    </CardContent>
                  </Card>
                </div>
                
                {/* User's Voted Proposals */}
                {userVotedCount > 0 ? (
                  <Card className="bg-white/10 backdrop-blur-md border-white/20">
                    <CardHeader>
                      <CardTitle className="text-white">Your Voted Proposals</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-white/20">
                          <thead>
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">Proposal</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">Status</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">Yes Votes</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">No Votes</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/10">
                            {userVotedProposalDetails.map((proposal) => (
                              <tr key={proposal.id}>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="text-sm font-medium text-white">{proposal.title}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                    proposal.status === "Active" && proposal.expiration > now 
                                      ? "bg-green-900/60 text-green-300" 
                                      : proposal.status === "Delisted" 
                                        ? "bg-red-900/60 text-red-300" 
                                        : "bg-yellow-900/60 text-yellow-300"
                                  }`}>
                                    {proposal.status === "Active" && proposal.expiration > now 
                                      ? "Active" 
                                      : proposal.status === "Delisted" 
                                        ? "Delisted" 
                                        : "Expired"}
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-white/80">
                                  {proposal.votedYesCount}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-white/80">
                                  {proposal.votedNoCount}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="bg-white/10 backdrop-blur-md p-8 rounded-lg border border-white/20 text-center">
                    <h3 className="text-xl font-medium text-white mb-4">No Activity Yet</h3>
                    <p className="text-white/70">
                      You haven't voted on any proposals yet. Check out the available proposals and make your voice heard!
                    </p>
                    <button 
                      onClick={() => window.location.href = '/proposal'}
                      className="mt-6 bg-gradient-sui text-white px-6 py-2 rounded-md transition-all hover:opacity-90"
                    >
                      View Proposals
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="bg-white/10 backdrop-blur-md p-8 rounded-lg border border-white/20 text-center">
                <h3 className="text-xl font-medium text-white mb-4">Connect Your Wallet</h3>
                <p className="text-white/70 mb-6">
                  Please connect your wallet to view your personal voting statistics.
                </p>
                <ConnectButton />
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
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