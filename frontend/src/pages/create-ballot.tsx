import { useState } from "react";
import { useCurrentAccount } from "@mysten/dapp-kit";
import { useNetworkVariable } from "../config/networkConfig";
import CreateBallot from "../components/ballot/CreateBallot";
import ManageCandidates from "../components/ballot/ManageCandidates";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "../components/ui/alert";
import { Info } from "lucide-react";
import FeatureGuard from "../components/FeatureGuard";

export default function CreateBallotPage() {
  const [createdBallotId, setCreatedBallotId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("create-ballot");
  
  const currentAccount = useCurrentAccount();
  const dashboardId = useNetworkVariable("dashboardId" as any);
  
  // Mock admin capabilities - replace with actual data in production
  const adminCapId = "0x123"; // Replace with actual admin cap ID
  const superAdminCapId = undefined; // Replace with actual super admin cap ID
  const hasSuperAdminCap = false; // Replace with actual check
  
  const handleBallotCreated = (ballotId: string) => {
    setCreatedBallotId(ballotId);
    setActiveTab("manage-candidates");
  };

  return (
    <FeatureGuard feature="ballot">
      <div className="container mx-auto py-8 px-4">
        <h1 className="text-3xl font-bold mb-6">Create New Ballot</h1>
        
        {!currentAccount ? (
          <Alert className="mb-6">
            <Info className="h-4 w-4" />
            <AlertTitle>Not connected</AlertTitle>
            <AlertDescription>
              Please connect your wallet to create a ballot.
            </AlertDescription>
          </Alert>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="create-ballot" disabled={activeTab === "manage-candidates" && !createdBallotId}>
                1. Create Ballot
              </TabsTrigger>
              <TabsTrigger value="manage-candidates" disabled={!createdBallotId}>
                2. Manage Candidates
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="create-ballot" className="mt-6">
              <CreateBallot 
                adminCapId={adminCapId}
                superAdminCapId={superAdminCapId}
                hasSuperAdminCap={hasSuperAdminCap}
                onBallotCreated={handleBallotCreated}
              />
            </TabsContent>
            
            <TabsContent value="manage-candidates" className="mt-6">
              {createdBallotId ? (
                <ManageCandidates
                  ballotId={createdBallotId}
                  adminCapId={adminCapId}
                  superAdminCapId={superAdminCapId}
                  hasSuperAdminCap={hasSuperAdminCap}
                  onComplete={() => {
                    // Handle completion - e.g., redirect to ballot view
                    console.log("Candidates added successfully");
                  }}
                />
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle>Manage Candidates</CardTitle>
                    <CardDescription>
                      Add candidates to your ballot
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Alert>
                      <AlertDescription>
                        Please create a ballot first before adding candidates.
                      </AlertDescription>
                    </Alert>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </FeatureGuard>
  );
}
