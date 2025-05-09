import { useSuiClientQuery } from "@mysten/dapp-kit";
import { useNetworkVariable } from "../config/networkConfig";
import { SuiObjectData, SuiObjectResponse } from "@mysten/sui/client";
import { useEffect, useState } from "react";
import { useCurrentAccount } from "@mysten/dapp-kit";
import { useVoteNfts } from "../hooks/useVoteNfts";
import { VoteNft } from "../types";
import { Chart as ChartJS, ArcElement, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, TimeScale, } from 'chart.js';
import 'chart.js/auto';
import { ConnectButton } from "@mysten/dapp-kit";
import { Loader2 } from "lucide-react";
import { Button } from "../components/ui/button";
import { FC } from 'react';
import Navbar from '../components/Navbar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import StatisticsPanel from "../components/statistics/StatisticsPanel";
import AdvancedAnalytics from "../components/statistics/AdvancedAnalytics";
import BallotStatisticsPanel from "../components/statistics/BallotStatisticsPanel";
import CombinedAnalytics from "../components/statistics/CombinedAnalytics";
import Footer from "../components/Footer";

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
  const dashboardId = useNetworkVariable("dashboardId" as any);
  const [proposals, setProposals] = useState<StatProposal[]>([]);
  const [activeTab, setActiveTab] = useState<'proposals' | 'ballots' | 'advanced' | 'user'>('proposals');
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

  // User-specific stats
  const userVotedCount = userVoteNfts.length;
  const userVotedProposals = userVoteNfts.map((nft: VoteNft) => nft.proposalId);
  const userParticipationRate = proposals.length > 0 ? (userVotedCount / proposals.length) * 100 : 0;

  // User-specific voted proposals
  const userVotedProposalDetails = proposals.filter(p => userVotedProposals.includes(p.id));

  if (isPending) return <div className="text-center text-gray-500 min-h-screen bg-black bg-grid-pattern pt-24">Loading statistics...</div>;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800">
      <Navbar />
      <div className="container max-w-6xl mx-auto px-4 py-8 pt-20 sm:pt-24">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-white">Platform Statistics</h1>
          
          {/* Removed duplicate ConnectButton since Navbar already has one */}
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
            <TabsList className="grid w-full max-w-md grid-cols-4 mb-8">
              <TabsTrigger value="proposals">Proposals</TabsTrigger>
              <TabsTrigger value="ballots">Ballots</TabsTrigger>
              <TabsTrigger value="advanced">Combined</TabsTrigger>
              <TabsTrigger value="user">My Activity</TabsTrigger>
            </TabsList>
            
            <TabsContent value="proposals">
              <div className="space-y-6">
                <StatisticsPanel />
                <div className="mt-8">
                  <h2 className="text-2xl font-semibold text-white mb-4">Proposal Advanced Analytics</h2>
                  <AdvancedAnalytics />
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="ballots">
              <BallotStatisticsPanel />
            </TabsContent>
            
            <TabsContent value="advanced">
              <CombinedAnalytics />
            </TabsContent>
            
            <TabsContent value="user">
              {account ? (
                <div className="bg-white/10 backdrop-blur-md border-white/20 p-6 rounded-lg">
                  <h2 className="text-xl font-semibold mb-4">Your Voting Activity</h2>

                  {userVotedCount === 0 ? (
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
              ) : (
                <div className="bg-slate-800/50 rounded-lg p-8 text-center">
                  <h3 className="text-xl font-medium text-white mb-4">Connect Your Wallet</h3>
                  <p className="text-slate-300 mb-6">Connect your wallet to view your voting activity and statistics</p>
                  <ConnectButton className="bg-blue-600 hover:bg-blue-700" />
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
      <div className="bg-white"><Footer/></div>
    </div>
  );
};

function extractVoteNfts(nftRes: any) {
  if (!nftRes?.data) return [];

  return nftRes.data.map((nftObject: any) => {
    if (nftObject.data?.content?.dataType !== "moveObject") {
      return { id: { id: "" }, url: "", proposalId: "" };
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