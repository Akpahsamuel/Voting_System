import { useSuiClientQuery } from "@mysten/dapp-kit";
import { useNetworkVariable } from "../config/networkConfig";
import { PaginatedObjectsResponse, SuiObjectData } from "@mysten/sui/client";
import { ProposalItem } from "../components/proposal/ProposalItem";
import { useVoteNfts } from "../hooks/useVoteNfts";
import { VoteNft } from "../types";
import UserStatistics from "../components/user/UserStatistics";
import { useState } from "react";
import { NavLink } from "react-router-dom";
import { ConnectButton } from "@mysten/dapp-kit";
import { Home, FileText, Wallet, ShieldCheck, BarChart2, Menu } from "lucide-react";
import { Button } from "../components/ui/button";

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

  if (isPending) return <div className="text-center text-gray-500">Loading...</div>;
  if (error) return <div className="text-red-500">Error: {error.message}</div>;
  if (!dataResponse.data) return <div className="text-center text-red-500">Not Found...</div>;

  const voteNfts = extractVoteNfts(voteNftsRes);
  const proposalIds = getDashboardFields(dataResponse.data)?.proposals_ids || [];

  return (
    <>
      <div className="mb-8 relative">
        <div className="flex justify-between items-center mb-4">
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
          <button 
            onClick={() => setShowStats(!showStats)}
            className="text-blue-500 hover:underline text-sm"
          >
            {showStats ? 'Hide Statistics' : 'Show Statistics'}
          </button>
        </div>
        
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