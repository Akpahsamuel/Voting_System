import { Transaction } from "@mysten/sui/transactions";
import { SuiClient } from "@mysten/sui/client";

/**
 * Checks if a proposal is expired based on its expiration date
 * @param expirationTimestamp Expiration time in milliseconds
 * @returns boolean indicating if the proposal is expired
 */
export function isProposalExpired(expirationTimestamp: number): boolean {
  const currentTime = Date.now();
  return expirationTimestamp < currentTime;
}

/**
 * Checks if a user is registered to vote on a private proposal
 * @param suiClient The Sui client instance
 * @param packageId The package ID of the voting system
 * @param dashboardId The dashboard ID of the voting system
 * @param proposalId The ID of the proposal to check
 * @param userAddress The address of the user to check
 * @returns Promise that resolves to a boolean indicating if the user is registered
 */
export async function isUserRegisteredForProposal(
  suiClient: SuiClient,
  packageId: string,
  dashboardId: string,
  proposalId: string,
  userAddress: string
): Promise<boolean> {
  try {
    // Create a transaction to call the is_voter_registered_for_proposal function
    const tx = new Transaction();
    tx.moveCall({
      target: `${packageId}::dashboard::is_voter_registered_for_proposal`,
      arguments: [
        tx.object(dashboardId),
        tx.pure.id(proposalId),
        tx.pure.address(userAddress),
      ],
    });
    
    // Execute the transaction in dev inspect mode
    const result = await suiClient.devInspectTransactionBlock({
      transactionBlock: tx.serialize(),
      sender: userAddress,
    });

    // Process the result
    if (result.results && result.results[0] && result.results[0].returnValues) {
      const returnValue = result.results[0].returnValues[0];
      
      // Handle the return value correctly based on its type
      if (typeof returnValue === 'boolean') {
        return returnValue;
      } else if (Array.isArray(returnValue) && returnValue.length > 0) {
        // For array return values, check if the first element is a truthy string
        return returnValue[0] === 'true' || returnValue[0] === '1';
      } else if (typeof returnValue === 'string') {
        // For string return values
        return returnValue === 'true' || returnValue === '1';
      }
    }
    
    return false;
  } catch (error) {
    console.error("Error checking voter registration:", error);
    return false;
  }
} 