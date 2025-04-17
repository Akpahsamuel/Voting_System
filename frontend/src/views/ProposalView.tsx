import { useSuiClientQuery } from "@mysten/dapp-kit";
import { useNetworkVariable } from "../config/networkConfig";
import { PaginatedObjectsResponse, SuiObjectData } from "@mysten/sui/client";
import { ProposalItem } from "../components/proposal/ProposalItem";
import { useVoteNfts } from "../hooks/useVoteNfts";
import { VoteNft } from "../types";

const ProposalView = () => {
  const dashboardId = useNetworkVariable("dashboardId");
  const { data: voteNftsRes, refetch: refetchNfts} = useVoteNfts();

  const { data: dataResponse, isPending, error} = useSuiClientQuery(
    "getObject", {
      id: dashboardId,
      options: {
        showContent: true
      }
    }
  );

  if (isPending) return <div className="text-center text-gray-500">Loading...</div>;
  if (error) return <div className="text-red-500">Error: {error.message}</div>;
  if (!dataResponse.data) return <div className="text-center text-red-500">Not Found...</div>;

  const voteNfts = extractVoteNfts(voteNftsRes);

  return (
    <>
      <h1 className="text-4xl font-bold mb-8">New Proposals</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {getDashboardFields(dataResponse.data)?.proposals_ids.map(id =>
          <ProposalItem
            key={id}
            id={id}
            onVoteTxSuccess={() => refetchNfts()}
            voteNft={voteNfts.find((nft) => nft.proposalId === id)}
          />
        )}
      </div>
    </>
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