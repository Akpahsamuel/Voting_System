import { SuiObjectData } from "@mysten/sui/client";
import { Proposal } from "../types";

export function parseProposal(data: SuiObjectData): Proposal | null {
  if (data.content?.dataType !== "moveObject") return null;

  const { voted_yes_count, voted_no_count, expiration, ...rest } = data.content.fields as any;
  
  // Just use the expiration timestamp directly, without conversion
  // The blockchain already provides it in milliseconds
  const processedExpiration = Number(expiration);
  console.log('Raw proposal expiration from blockchain:', expiration, 'Processed:', processedExpiration);

  return {
    ...rest,
    votedYesCount: Number(voted_yes_count),
    votedNoCount: Number(voted_no_count),
    expiration: processedExpiration
  };
} 