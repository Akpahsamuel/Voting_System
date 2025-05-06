
import { useNavigate } from "react-router-dom";
import { ConnectButton, useCurrentAccount } from "@mysten/dapp-kit";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "../components/ui/alert";
import { AlertCircle, ListPlus, Vote, Plus } from "lucide-react";

export default function BallotLanding() {
  const navigate = useNavigate();
  const currentAccount = useCurrentAccount();
  
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex flex-col md:flex-row justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Ballot System</h1>
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
            Please connect your wallet to access the ballot system.
          </AlertDescription>
        </Alert>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <ListPlus className="mr-2 h-5 w-5" />
                View Ballots
              </CardTitle>
              <CardDescription>
                Browse and vote on all available ballots
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="mb-4">Access all ballots and participate in voting.</p>
              <Button 
                className="w-full" 
                onClick={() => navigate("/ballots")}
              >
                Browse Ballots
              </Button>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Plus className="mr-2 h-5 w-5" />
                Create Ballot
              </CardTitle>
              <CardDescription>
                Create a new ballot for voting
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="mb-4">Start a new ballot and add candidates for voting.</p>
              <Button 
                className="w-full" 
                onClick={() => navigate("/create-ballot")}
              >
                Create New Ballot
              </Button>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Vote className="mr-2 h-5 w-5" />
                Vote
              </CardTitle>
              <CardDescription>
                Cast your vote on active ballots
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="mb-4">Participate in voting on active ballots.</p>
              <Button 
                className="w-full" 
                onClick={() => navigate("/ballots")}
              >
                Go to Voting
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
