import { useSuiClientQuery } from "@mysten/dapp-kit";
import { useNetworkVariable } from "../config/networkConfig";
import { PaginatedObjectsResponse, SuiObjectData } from "@mysten/sui/client";
import { ProposalItem } from "../components/proposal/ProposalItem";
import { useVoteNfts } from "../hooks/useVoteNfts";
import { VoteNft } from "../types";
import UserStatistics from "../components/user/UserStatistics";
import { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import FeatureGuard from "../components/FeatureGuard";
import { getNetwork } from "../utils/networkUtils";

const ProposalView = () => {
  const dashboardId = useNetworkVariable("dashboardId" as any);
  const { data: voteNftsRes, refetch: refetchNfts} = useVoteNfts();
  const [showStats, setShowStats] = useState(true);
  const [filteredProposalIds, setFilteredProposalIds] = useState<string[]>([]);
  const [isFiltering, setIsFiltering] = useState(true);

  const { data: dataResponse, isPending, error} = useSuiClientQuery(
    "getObject", {
      id: dashboardId,
      options: {
        showContent: true
      }
    }
  );

  // Filter out ballot objects from proposal IDs
  useEffect(() => {
    if (dataResponse?.data) {
      const proposalIds = getDashboardFields(dataResponse.data)?.proposals_ids || [];
      if (proposalIds.length > 0) {
        setIsFiltering(true);
        
        // Check each ID to see if it's a proposal or ballot
        const checkObjects = async () => {
          const validProposalIds: string[] = [];
          
          // Get the current network
          const network = getNetwork();
          console.log("Current network for proposal filtering:", network);
          
          // Use Promise.all to check all objects in parallel
          await Promise.all(proposalIds.map(async (id) => {
            try {
              // Use the appropriate fullnode URL based on network
              const fullnodeUrl = `https://fullnode.${network}.sui.io/`;
              console.log("Using fullnode URL:", fullnodeUrl);
              
              const response = await fetch(fullnodeUrl, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  jsonrpc: '2.0',
                  id: 1,
                  method: 'sui_getObject',
                  params: [id, { showContent: true }]
                })
              });
              
              const data = await response.json();
              if (data?.result?.data?.content?.type) {
                const type = data.result.data.content.type;
                // Only include actual proposals, not ballots
                if (type.includes('::proposal::Proposal')) {
                  validProposalIds.push(id);
                }
              }
            } catch (err) {
              console.error("Error checking object type:", err);
            }
          }));
          
          setFilteredProposalIds(validProposalIds);
          setIsFiltering(false);
        };
        
        checkObjects();
      } else {
        setFilteredProposalIds([]);
        setIsFiltering(false);
      }
    }
  }, [dataResponse?.data]);

  if (isPending || isFiltering) return <div className="text-center text-gray-500 min-h-screen bg-black bg-grid-pattern pt-24">Loading...</div>;
  if (error) return <div className="text-red-500 min-h-screen bg-black bg-grid-pattern pt-24">Error: {error.message}</div>;
  if (!dataResponse.data) return <div className="text-center text-red-500 min-h-screen bg-black bg-grid-pattern pt-24">Not Found...</div>;

  const voteNfts = extractVoteNfts(voteNftsRes);
  const proposalIds = filteredProposalIds;

  return (
    <FeatureGuard feature="proposal">
      <div className="min-h-screen bg-black bg-grid-pattern text-white">
        <Navbar />
        <div className="container mx-auto px-4 pt-24 pb-12">
          <h1 className="text-3xl font-bold mb-6">Governance Proposals</h1>
          
          <Card className="bg-white/10 backdrop-blur-md border-white/20 mb-8">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-white text-xl">Platform Statistics</CardTitle>
              <button 
                onClick={() => setShowStats(!showStats)}
                className="text-blue-400 hover:text-blue-300 hover:underline text-sm transition-colors"
              >
                {showStats ? 'Hide Statistics' : 'Show Statistics'}
              </button>
            </CardHeader>
            
            {showStats && (
              <CardContent>
                <UserStatistics proposalIds={proposalIds} userVoteNfts={voteNfts} />
              </CardContent>
            )}
          </Card>
          
          <div className="grid grid-cols-1 xs:grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {proposalIds.map(id =>
              <ProposalItem
                key={id}
                id={id}
                onVoteTxSuccess={() => refetchNfts()}
                voteNft={voteNfts.find((nft) => nft.proposalId === id)}
              />
            )}
          </div>
        </div>
      </div>
    </FeatureGuard>
  )
};

function getDashboardFields(data: SuiObjectData) {
  if (data.content?.dataType !== "moveObject") return null;

  return data.content.fields as {
    id: SuiID,
    proposals_ids: string[]
  };
}

function extractVoteNfts(nftRes: PaginatedObjectsResponse | undefined) {
  if (!nftRes?.data) return [];

  return nftRes.data.map(nftObject => getVoteNft(nftObject.data));
}

function getVoteNft(nftData: SuiObjectData | undefined | null): VoteNft {
  if (nftData?.content?.dataType !== "moveObject") {
    return {id: "", url: "", proposalId: ""};
  }

  const { proposal_id: proposalId, url, id } = nftData.content.fields as any;

  return {
    proposalId,
    id,
    url
  };
}

export default ProposalView;