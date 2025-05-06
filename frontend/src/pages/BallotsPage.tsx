import { useState } from "react";
import { ConnectButton, useCurrentAccount, useSuiClient } from "@mysten/dapp-kit";
import BallotList from "../components/ballot/BallotList";
import { Alert, AlertDescription, AlertTitle } from "../components/ui/alert";
import { AlertCircle } from "lucide-react";

export default function BallotsPage() {
  const currentAccount = useCurrentAccount();
  const suiClient = useSuiClient();
  
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex flex-col md:flex-row justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Ballot Dashboard</h1>
          <p className="text-muted-foreground">Create, manage, and vote on ballots</p>
        </div>
        
        <div className="mt-4 md:mt-0">
          <ConnectButton />
        </div>
      </div>
      
      {!currentAccount ? (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Not connected</AlertTitle>
          <AlertDescription>
            Please connect your wallet to view and manage ballots.
          </AlertDescription>
        </Alert>
      ) : (
        <BallotList suiClient={suiClient} />
      )}
    </div>
  );
}
