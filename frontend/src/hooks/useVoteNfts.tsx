import { useCurrentAccount, useSuiClientQuery } from "@mysten/dapp-kit"
import { useNetworkVariableString } from '../config/networkConfig';

export const useVoteNfts = () => {
  const account = useCurrentAccount();
  const packageId = useNetworkVariableString('packageId');

  return useSuiClientQuery(
    "getOwnedObjects",
    {
      owner: account?.address as string,
      options: {
        showContent: true
      },
      filter: {
        StructType: `${packageId}::proposal::VoteProofNFT`
      }
    },
    {
      enabled: !!account
    }
  );
}