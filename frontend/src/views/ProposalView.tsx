import { useSuiClientQuery } from "@mysten/dapp-kit";
import { useNetworkVariable } from "../config/networkConfig";
import { PaginatedObjectsResponse, SuiObjectData } from "@mysten/sui/client";
import { ProposalItem } from "../components/proposal/ProposalItem";
import { useVoteNfts } from "../hooks/useVoteNfts";
import { VoteNft } from "../types";
import UserStatistics from "../components/user/UserStatistics";
import { useState } from "react";
import Navbar from "../components/Navbar";

const ProposalView = () => {
  const dashboardId = useNetworkVariable("dashboardId");
  const { data: voteNftsRes, refetch: refetchNfts} = useVoteNfts();
  const [showStats, setShowStats] = useState(true);

  const { data: dataResponse, isPending, error} = useSuiClientQuery(
    "getObject", {
      id: dashboardId,
      options: {
        showContent: true
      }
    }
  );

  if (isPending) return <div className="text-center text-gray-500 min-h-screen bg-black bg-grid-pattern">Loading...</div>;
  if (error) return <div className="text-red-500 min-h-screen bg-black bg-grid-pattern">Error: {error.message}</div>;
  if (!dataResponse.data) return <div className="text-center text-red-500 min-h-screen bg-black bg-grid-pattern">Not Found...</div>;

  const voteNfts = extractVoteNfts(voteNftsRes);
  const proposalIds = getDashboardFields(dataResponse.data)?.proposals_ids || [];

  return (
    <div className="min-h-screen bg-black bg-grid-pattern text-white">
      <Navbar />
      <div className="container mx-auto px-4 pt-24">
        <div className="mb-8">
          <button 
            onClick={() => setShowStats(!showStats)}
            className="text-blue-500 hover:underline text-sm mb-4"
          >
            {showStats ? 'Hide Statistics' : 'Show Statistics'}
          </button>
          
          {showStats && (
            <UserStatistics proposalIds={proposalIds} userVoteNfts={voteNfts} />
          )}
        </div>
        
        <h2 className="text-2xl font-semibold mb-6">Available Proposals</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
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
    return {id: {id: ""}, url: "", proposalId: ""};
  }

  const { proposal_id: proposalId, url, id } = nftData.content.fields as any;

  return {
    proposalId,
    id,
    url
  };
}

export default ProposalView;