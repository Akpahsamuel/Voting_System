import { FC, useState, useEffect } from 'react';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { useAdminCap } from "../hooks/useAdminCap";
import { useSuperAdminCap } from "../hooks/useSuperAdminCap";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Separator } from "../components/ui/separator";
import { useSuiClientQuery } from '@mysten/dapp-kit';
import { BarChart2, Clock, FileText, Users, Settings, LayoutDashboard } from 'lucide-react';
import { motion } from "framer-motion";
import { Badge } from '../components/ui/badge';
import { useNetworkVariable } from "../config/networkConfig";
import { ConnectButton } from '@mysten/dapp-kit';
import CreateBallot from "../components/ballot/CreateBallot";
import BallotManagement from "../components/ballot/BallotManagement";
import BallotVoting from "../components/ballot/BallotVoting";

// Define Ballot type
export interface Candidate {
  id: number;
  name: string;
  description: string;
  votes: number;
  imageUrl?: string;
}

export interface Ballot {
  id: string;
  title: string;
  description: string;
  candidates: Candidate[];
  totalVotes: number;
  expiration: number;
  creator: string;
  status: 'Active' | 'Delisted' | 'Expired';
  isPrivate: boolean;
}

export const BallotPage: FC = () => {
  const account = useCurrentAccount();
  const { hasAdminCap, adminCapId, isLoading: isLoadingAdminCap } = useAdminCap();
  const { hasSuperAdminCap, superAdminCapId, isLoading: isLoadingSuperAdminCap } = useSuperAdminCap();
  const dashboardId = useNetworkVariable("dashboardId");
  const [activeTab, setActiveTab] = useState("voting");
  const [ballots, setBallots] = useState<Ballot[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Analytics data state
  const [analyticsData, setAnalyticsData] = useState({
    totalBallots: 0,
    activeBallots: 0,
    delistedBallots: 0,
    totalVotes: 0,
    votesLastWeek: 0,
    votesWeeklyChange: 5.7,
    ballotsLastWeek: 0,
    ballotsWeeklyChange: 10.2,
    activeVoters: 156,
  });

  // Mock data for development
  useEffect(() => {
    // This would be replaced with actual data fetching from the blockchain
    const mockBallots: Ballot[] = [
      {
        id: "0x123",
        title: "Board Member Election",
        description: "Vote for the new board members for the 2025 fiscal year",
        candidates: [
          { id: 1, name: "John Smith", description: "Current CFO with 10 years of experience", votes: 245 },
          { id: 2, name: "Sarah Johnson", description: "External candidate with strong leadership background", votes: 189 },
          { id: 3, name: "Michael Wong", description: "Technical director with vision for innovation", votes: 302 }
        ],
        totalVotes: 736,
        expiration: Date.now() + 3 * 24 * 60 * 60 * 1000, // 3 days from now
        creator: "0xabcdef",
        status: 'Active',
        isPrivate: false
      },
      {
        id: "0x456",
        title: "Logo Redesign Selection",
        description: "Choose the new company logo from the finalists",
        candidates: [
          { id: 1, name: "Design A: Modern Minimalist", description: "A sleek, minimalist approach with blue tones", votes: 521 },
          { id: 2, name: "Design B: Bold & Colorful", description: "A vibrant, colorful design with strong shapes", votes: 347 },
          { id: 3, name: "Design C: Classic Refresh", description: "An updated version of our classic logo", votes: 289 }
        ],
        totalVotes: 1157,
        expiration: Date.now() + 5 * 24 * 60 * 60 * 1000, // 5 days from now
        creator: "0xabcdef",
        status: 'Active',
        isPrivate: false
      },
      {
        id: "0x789",
        title: "Annual Budget Allocation",
        description: "Vote on how to allocate the annual budget across departments",
        candidates: [
          { id: 1, name: "Proposal A: R&D Focus", description: "Allocate 40% to R&D, 30% to Marketing, 30% to Operations", votes: 178 },
          { id: 2, name: "Proposal B: Marketing Focus", description: "Allocate 30% to R&D, 45% to Marketing, 25% to Operations", votes: 132 },
          { id: 3, name: "Proposal C: Balanced Approach", description: "Allocate 35% to R&D, 35% to Marketing, 30% to Operations", votes: 203 }
        ],
        totalVotes: 513,
        expiration: Date.now() - 2 * 24 * 60 * 60 * 1000, // 2 days ago (expired)
        creator: "0xabcdef",
        status: 'Expired',
        isPrivate: true
      }
    ];

    setBallots(mockBallots);
    setIsLoading(false);

    // Update analytics
    setAnalyticsData({
      ...analyticsData,
      totalBallots: mockBallots.length,
      activeBallots: mockBallots.filter(b => b.status === 'Active').length,
      delistedBallots: mockBallots.filter(b => b.status === 'Delisted').length,
      totalVotes: mockBallots.reduce((sum, ballot) => sum + ballot.totalVotes, 0)
    });
  }, []);

  // In a real implementation, we would fetch ballots from the blockchain
  // useEffect(() => {
  //   const fetchBallots = async () => {
  //     // Fetch ballots logic here
  //   };
  //   
  //   if (account) {
  //     fetchBallots();
  //   }
  // }, [account]);

  if (!account) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">Connect Your Wallet</CardTitle>
            <CardDescription className="text-center">
              Please connect your wallet to access the ballot system
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <ConnectButton />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-7xl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Ballot System</h1>
          <p className="text-muted-foreground">Create and manage ballots, vote on candidates</p>
        </div>
        
        <div className="flex items-center space-x-2 mt-4 md:mt-0">
          {(hasAdminCap || hasSuperAdminCap) && (
            <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200 px-3 py-1">
              {hasSuperAdminCap ? "Super Admin" : "Admin"}
            </Badge>
          )}
          <ConnectButton />
        </div>
      </div>

      <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-3 md:grid-cols-5 mb-8">
          <TabsTrigger value="voting" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden md:inline">Voting</span>
          </TabsTrigger>
          
          {(hasAdminCap || hasSuperAdminCap) && (
            <>
              <TabsTrigger value="create" className="flex items-center gap-2">
                <LayoutDashboard className="h-4 w-4" />
                <span className="hidden md:inline">Create Ballot</span>
              </TabsTrigger>
              
              <TabsTrigger value="manage" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                <span className="hidden md:inline">Manage Ballots</span>
              </TabsTrigger>
            </>
          )}
          
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart2 className="h-4 w-4" />
            <span className="hidden md:inline">Analytics</span>
          </TabsTrigger>
          
          <TabsTrigger value="voters" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden md:inline">Voters</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="voting" className="space-y-4">
          <BallotVoting ballots={ballots.filter(b => b.status === 'Active')} isLoading={isLoading} />
        </TabsContent>

        {(hasAdminCap || hasSuperAdminCap) && (
          <>
            <TabsContent value="create" className="space-y-4">
              <CreateBallot 
                adminCapId={adminCapId} 
                superAdminCapId={superAdminCapId} 
                hasSuperAdminCap={hasSuperAdminCap} 
              />
            </TabsContent>
            
            <TabsContent value="manage" className="space-y-4">
              <BallotManagement 
                ballots={ballots} 
                isLoading={isLoading} 
                adminCapId={adminCapId} 
                superAdminCapId={superAdminCapId}
                hasSuperAdminCap={hasSuperAdminCap}
              />
            </TabsContent>
          </>
        )}

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Ballots</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analyticsData.totalBallots}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {analyticsData.ballotsWeeklyChange > 0 ? '+' : ''}{analyticsData.ballotsWeeklyChange}% from last week
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Active Ballots</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analyticsData.activeBallots}</div>
                <div className="flex items-center mt-1">
                  <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
                    Active
                  </Badge>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Votes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analyticsData.totalVotes}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {analyticsData.votesWeeklyChange > 0 ? '+' : ''}{analyticsData.votesWeeklyChange}% from last week
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Active Voters</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analyticsData.activeVoters}</div>
                <div className="flex items-center mt-1">
                  <Clock className="h-3 w-3 mr-1 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Last 30 days</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="voters" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Voter Registry</CardTitle>
              <CardDescription>
                Manage voters for private ballots
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                This feature will be implemented soon. It will allow admins to register voters for private ballots.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default BallotPage;
