import { FC, useEffect, useState } from 'react';
import { StatisticsPanel } from '../components/statistics/StatisticsPanel';
import { BallotStatisticsPanel } from '../components/statistics/BallotStatisticsPanel';
import { Proposal } from '../types';
import { useSuiClientQuery } from '@mysten/dapp-kit';
import { Loader2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";

// Import SuiID type
type SuiID = string;

export const StatisticsPage: FC = () => {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // This is a simplified example - in a real app you'd fetch all proposals
  // For demo purposes, we'll simulate fetching multiple proposals
  const { data: proposalsData, isPending } = useSuiClientQuery(
    "getOwnedObjects", {
      owner: "0x...", // Replace with your contract address or other query logic
      options: {
        showContent: true
      }
    }
  );

  useEffect(() => {
    // Sample data for demonstration purposes
    // In a real app, you would parse this from your chain data
    const sampleProposals: Proposal[] = [
      {
        id: "sample1" as SuiID,
        title: "Governance Proposal 1",
        description: "Increase funding for development",
        status: { variant: "Active" },
        votedYesCount: 250,
        votedNoCount: 50,
        expiration: Date.now() + 5 * 24 * 60 * 60 * 1000, // 5 days from now
        creator: "0x123",
        voter_registry: []
      },
      {
        id: "sample2" as SuiID,
        title: "Governance Proposal 2",
        description: "Change voting period to 5 days",
        status: { variant: "Active" },
        votedYesCount: 180, 
        votedNoCount: 120,
        expiration: Date.now() + 2 * 24 * 60 * 60 * 1000, // 2 days from now
        creator: "0x456",
        voter_registry: []
      },
      {
        id: "sample3" as SuiID,
        title: "Treasury Distribution",
        description: "Distribute 10% of treasury to active voters",
        status: { variant: "Active" },
        votedYesCount: 75,
        votedNoCount: 25,
        expiration: Date.now() + 1 * 24 * 60 * 60 * 1000, // 1 day from now
        creator: "0x789",
        voter_registry: []
      },
      {
        id: "sample4" as SuiID,
        title: "Protocol Upgrade",
        description: "Implement new consensus algorithm",
        status: { variant: "Delisted" },
        votedYesCount: 320,
        votedNoCount: 280,
        expiration: Date.now() - 2 * 24 * 60 * 60 * 1000, // 2 days ago
        creator: "0xabc",
        voter_registry: []
      },
      {
        id: "sample5" as SuiID,
        title: "Community Fund Allocation",
        description: "Allocate funds for community initiatives",
        status: { variant: "Active" },
        votedYesCount: 450, 
        votedNoCount: 150,
        expiration: Date.now() - 1 * 24 * 60 * 60 * 1000, // 1 day ago
        creator: "0xdef",
        voter_registry: []
      },
      // Generate more sample proposals for better statistics
      ...Array.from({ length: 20 }, (_, i) => ({
        id: `generated${i}` as SuiID,
        title: `Generated Proposal ${i+1}`,
        description: `This is an auto-generated proposal for testing #${i+1}`,
        status: { variant: Math.random() > 0.3 ? "Active" : "Delisted" },
        votedYesCount: Math.floor(Math.random() * 500),
        votedNoCount: Math.floor(Math.random() * 500),
        expiration: Date.now() + (Math.random() * 10 - 5) * 24 * 60 * 60 * 1000, // Random date between -5 and +5 days
        creator: `0xgen${i}`,
        voter_registry: []
      }))
    ];

    // In a real app, you would process proposalsData here
    // For the demo, we'll use the sample data after a brief delay to simulate loading
    setTimeout(() => {
      setProposals(sampleProposals);
      setIsLoading(false);
    }, 1000);
  }, [proposalsData]);

  return (
    <div className="container max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-4 text-white">Platform Statistics</h1>
      
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </div>
      ) : (
        <Tabs defaultValue="proposals" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2 mb-8">
            <TabsTrigger value="proposals">Governance Proposals</TabsTrigger>
            <TabsTrigger value="ballots">Ballots</TabsTrigger>
          </TabsList>
          
          <TabsContent value="proposals" className="mt-0">
            <StatisticsPanel proposals={proposals} />
          </TabsContent>
          
          <TabsContent value="ballots" className="mt-0">
            <BallotStatisticsPanel />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};

export default StatisticsPage; 