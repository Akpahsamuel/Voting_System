import { useSuiClientQuery } from "@mysten/dapp-kit";
import { useNetworkVariable } from "../config/networkConfig";
import { SuiObjectData, SuiObjectResponse } from "@mysten/sui/client";
import { useEffect, useState } from "react";
import { useCurrentAccount } from "@mysten/dapp-kit";
import { useVoteNfts } from "../hooks/useVoteNfts";
import { VoteNft, Proposal, ProposalStatus } from "../types";
import { Chart as ChartJS, ArcElement, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, TimeScale,} from 'chart.js';
import { Pie, Bar, Line } from 'react-chartjs-2';
import 'chart.js/auto';
import { NavLink } from "react-router-dom";
import { ConnectButton } from "@mysten/dapp-kit";
import { Home, FileText, Wallet, ShieldCheck, BarChart2, Menu, Loader2 } from "lucide-react";
import { Button } from "../components/ui/button";
import React, { FC } from 'react';
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

// Define simplified proposal type for statistics
interface StatProposal {
  id: string;
  title: string;
  votedYesCount: number;
  votedNoCount: number;
  expiration: number;
  status: string;
  creator: string;
}

export const StatisticsView: FC = () => {
  const dashboardId = useNetworkVariable("dashboardId");
  const [proposals, setProposals] = useState<StatProposal[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'voting' | 'user'>('overview');
  const account = useCurrentAccount();
  const { data: voteNftsRes } = useVoteNfts();
  const [isLoading, setIsLoading] = useState(true);
  
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
      .filter((item): item is StatProposal => item !== null);
    
    setProposals(parsedProposals);
    setIsLoading(false);
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
          activeAndNotExpired, 
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
      <div className="container mx-auto px-4 py-8 pt-24">
        <h1 className="text-3xl font-bold mb-4 text-white">Governance Statistics</h1>
        
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          </div>
        ) : (
          <>
            <Tabs defaultValue="overview" className="w-full mb-8">
              <TabsList className="grid w-full grid-cols-3 mb-6">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="voting">Voting Statistics</TabsTrigger>
                <TabsTrigger value="user">Your Activity</TabsTrigger>
              </TabsList>
              
              <TabsContent value="overview" className="space-y-6">
                {/* Stats Summary */}
                <div className="bg-white/10 backdrop-blur-md border-white/20 p-6 rounded-lg">
                  <h2 className="text-xl font-semibold mb-4">Overview</h2>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-black/30 p-4 rounded-lg text-center">
                      <h3 className="text-lg font-medium mb-1">Total Proposals</h3>
                      <p className="text-3xl font-bold text-blue-400">{totalProposals}</p>
                    </div>
                    <div className="bg-black/30 p-4 rounded-lg text-center">
                      <h3 className="text-lg font-medium mb-1">Active Proposals</h3>
                      <p className="text-3xl font-bold text-green-400">{activeAndNotExpired}</p>
                    </div>
                    <div className="bg-black/30 p-4 rounded-lg text-center">
                      <h3 className="text-lg font-medium mb-1">Total Votes</h3>
                      <p className="text-3xl font-bold text-purple-400">{totalVotes}</p>
                    </div>
                    <div className="bg-black/30 p-4 rounded-lg text-center">
                      <h3 className="text-lg font-medium mb-1">Your Votes</h3>
                      <p className="text-3xl font-bold text-orange-400">{userVotedCount}</p>
                    </div>
                  </div>
                </div>
                
                {/* Time-based Analytics Card */}
                <div className="bg-white/10 backdrop-blur-md border-white/20 p-6 rounded-lg">
                  <h2 className="text-xl font-semibold mb-4">Time-based Analytics</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-black/30 p-4 rounded-lg">
                      <h3 className="text-lg font-medium mb-3">Vote Trend</h3>
                      <div className="h-64">
                        <Line 
                          data={timelineData}
                          options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                              legend: {
                                position: 'top',
                                labels: {
                                  color: 'rgba(255, 255, 255, 0.8)'
                                }
                              },
                              title: {
                                display: false
                              }
                            },
                            scales: {
                              y: {
                                ticks: { color: 'rgba(255, 255, 255, 0.6)' },
                                grid: { color: 'rgba(255, 255, 255, 0.1)' }
                              },
                              x: {
                                ticks: { color: 'rgba(255, 255, 255, 0.6)' },
                                grid: { color: 'rgba(255, 255, 255, 0.1)' }
                              }
                            }
                          }}
                        />
                      </div>
                    </div>
                    <div className="bg-black/30 p-4 rounded-lg">
                      <h3 className="text-lg font-medium mb-3">Proposal Status</h3>
                      <div className="h-64">
                        <Pie 
                          data={statusDistributionData}
                          options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                              legend: {
                                position: 'top',
                                labels: {
                                  color: 'rgba(255, 255, 255, 0.8)'
                                }
                              }
                            }
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="voting" className="space-y-6">
                {/* Outcome Visualization Card */}
                <div className="bg-white/10 backdrop-blur-md border-white/20 p-6 rounded-lg">
                  <h2 className="text-xl font-semibold mb-4">Outcome Visualization</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-black/30 p-4 rounded-lg">
                      <h3 className="text-lg font-medium mb-3">Vote Distribution</h3>
                      <div className="h-64">
                        <Pie 
                          data={voteDistributionData}
                          options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                              legend: {
                                position: 'top',
                                labels: {
                                  color: 'rgba(255, 255, 255, 0.8)'
                                }
                              }
                            }
                          }}
                        />
                      </div>
                    </div>
                    <div className="bg-black/30 p-4 rounded-lg">
                      <h3 className="text-lg font-medium mb-3">Top Proposals by Votes</h3>
                      <div className="h-64">
                        <Bar 
                          data={topProposalsData}
                          options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            indexAxis: 'y' as const,
                            plugins: {
                              legend: {
                                position: 'top',
                                labels: {
                                  color: 'rgba(255, 255, 255, 0.8)'
                                }
                              }
                            },
                            scales: {
                              y: {
                                ticks: { color: 'rgba(255, 255, 255, 0.6)' },
                                grid: { color: 'rgba(255, 255, 255, 0.1)' }
                              },
                              x: {
                                ticks: { color: 'rgba(255, 255, 255, 0.6)' },
                                grid: { color: 'rgba(255, 255, 255, 0.1)' }
                              }
                            }
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="user" className="space-y-6">
                {/* User Activity Card - Dedicated Tab */}
                <div className="bg-white/10 backdrop-blur-md border-white/20 p-6 rounded-lg">
                  <h2 className="text-xl font-semibold mb-4">Your Voting Activity</h2>
                  
                  {!account ? (
                    <div className="bg-black/30 p-6 rounded-lg text-center">
                      <p className="text-white/70 mb-4">Connect your wallet to see your voting activity</p>
                      <div className="flex justify-center">
                        <ConnectButton />
                      </div>
                    </div>
                  ) : userVotedCount === 0 ? (
                    <div className="bg-black/30 p-6 rounded-lg text-center">
                      <p className="text-white/70">You haven't voted on any proposals yet</p>
                      <Button 
                        className="mt-4 bg-blue-600 hover:bg-blue-700"
                        onClick={() => window.location.href = '/proposal'}
                      >
                        View Available Proposals
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <div className="bg-black/30 p-4 rounded-lg text-center">
                          <h3 className="text-sm font-medium mb-1 text-white/70">Proposals Voted</h3>
                          <p className="text-2xl font-bold text-blue-400">{userVotedCount}</p>
                        </div>
                        <div className="bg-black/30 p-4 rounded-lg text-center">
                          <h3 className="text-sm font-medium mb-1 text-white/70">Participation Rate</h3>
                          <p className="text-2xl font-bold text-green-400">{userParticipationRate.toFixed(1)}%</p>
                        </div>
                        <div className="bg-black/30 p-4 rounded-lg text-center">
                          <h3 className="text-sm font-medium mb-1 text-white/70">Voter Rank</h3>
                          <p className="text-2xl font-bold text-purple-400">
                            {userVotedCount > 3 ? "Power Voter" : userVotedCount > 0 ? "Active Voter" : "New Voter"}
                          </p>
                        </div>
                      </div>
                      
                      <div className="bg-black/30 rounded-lg overflow-hidden">
                        <div className="px-4 py-3 bg-black/50">
                          <h3 className="font-medium">Your Voted Proposals</h3>
                        </div>
                        
                        <div className="divide-y divide-white/10">
                          {userVotedProposalDetails.length > 0 ? (
                            userVotedProposalDetails.map((proposal) => (
                              <div key={proposal.id} className="p-4 hover:bg-white/5 transition-colors">
                                <div className="flex justify-between items-start">
                                  <div>
                                    <h4 className="font-medium text-white">{proposal.title}</h4>
                                    <div className="flex items-center mt-1 text-sm text-white/60">
                                      <span className={`inline-block w-2 h-2 rounded-full mr-2 ${proposal.status === 'Active' ? 'bg-green-500' : 'bg-amber-500'}`}></span>
                                      {proposal.status}
                                      <span className="mx-2">•</span>
                                      {new Date(proposal.expiration).toLocaleDateString()}
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <div className="flex items-center gap-4">
                                      <div>
                                        <div className="text-xs text-white/60">Yes</div>
                                        <div className="font-medium text-green-400">{proposal.votedYesCount}</div>
                                      </div>
                                      <div>
                                        <div className="text-xs text-white/60">No</div>
                                        <div className="font-medium text-red-400">{proposal.votedNoCount}</div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                                
                                {/* Vote progress bar */}
                                <div className="mt-3">
                                  <div className="h-1.5 w-full bg-gray-700 rounded-full overflow-hidden">
                                    {proposal.votedYesCount + proposal.votedNoCount > 0 && (
                                      <div 
                                        className="h-full bg-gradient-to-r from-green-400 to-blue-500"
                                        style={{ 
                                          width: `${(proposal.votedYesCount / (proposal.votedYesCount + proposal.votedNoCount)) * 100}%` 
                                        }}
                                      />
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))
                          ) : (
                            <p className="p-4 text-center text-white/60">No voted proposals found</p>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </>
        )}
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