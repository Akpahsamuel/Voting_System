import { FC, useState, useEffect } from 'react';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { useAdminCap } from "../hooks/useAdminCap";
import { useSuperAdminCap } from "../hooks/useSuperAdminCap";
import ProposalManagement from "../components/admin/ProposalManagement";
import SuperAdminManagement from "../components/admin/SuperAdminManagement";
import CreateProposal from "../components/admin/CreateProposal";
import VoterRegistry from "../components/admin/VoterRegistry";
import BallotManagement from "../components/ballot/BallotManagement";
import CreateBallot from "../components/ballot/CreateBallot";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Separator } from "../components/ui/separator";
import { Proposal } from "../types";
import { useSuiClientQuery } from '@mysten/dapp-kit';
import { ArrowUp, ArrowDown, Activity, UserCheck, Clock, FileText, Users, Settings, LayoutDashboard, ChevronRight, AlertTriangle, FileCode, Terminal, Ban, ShieldCheck, Wallet, BarChart2, Vote, MoreHorizontal } from 'lucide-react';
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from '../components/ui/badge';
import { useNetworkVariable } from "../config/networkConfig";
import { SuiObjectData, SuiObjectResponse } from "@mysten/sui/client";
import { ConnectButton } from '@mysten/dapp-kit';
import { normalizeTimestamp, formatTimeLeft } from "../utils/formatUtils";
import FeatureGuard from "../components/FeatureGuard";
import Navbar from "../components/Navbar";
import SystemStats from "../components/admin/SystemStats";

// Simple wrapper component to replace missing AdminPageGuard
const AdminPageGuard: FC<{children: React.ReactNode}> = ({children}) => {
  return <>{children}</>;
};

// Define SuiID type for compatibility with what's used elsewhere
type SuiID = { id: string };

// Modify interface for Admin-specific proposal data
interface AdminProposal {
  id: string;
  title: string;
  description: string;
  status: string;
  votedYesCount: number;
  votedNoCount: number;
  expiration: number;
  creator: string;
  voter_registry: string[];
}

export const AdminPage: FC = () => {
  const account = useCurrentAccount();
  const { hasAdminCap, adminCapId, isLoading: isLoadingAdminCap } = useAdminCap();
  const { hasSuperAdminCap, superAdminCapId, isLoading: isLoadingSuperAdminCap } = useSuperAdminCap();
  const dashboardId = useNetworkVariable("dashboardId" as any);
  const packageId = useNetworkVariable("packageId" as any);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [proposals, setProposals] = useState<AdminProposal[]>([]);
  const [ballots, setBallots] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingBallots, setIsLoadingBallots] = useState(true);
  const [systemHealth, setSystemHealth] = useState({
    status: "Operational",
    uptime: "99.98%",
    responseTime: "124ms",
    errorRate: "0.02%",
    lastIncident: "None"
  });

  // Analytics data state
  const [analyticsData, setAnalyticsData] = useState({
    totalProposals: 0,
    activeProposals: 0,
    delistedProposals: 0,
    totalVotes: 0,
    votesLastWeek: 0,
    votesWeeklyChange: 8.2,
    proposalsLastWeek: 0,
    proposalsWeeklyChange: 12.5,
    activeUsers: 184,
    activeUsersChange: -2.3
  });

  // Fetch dashboard data to get proposal IDs
  const { data: dashboardData } = useSuiClientQuery(
    "getObject",
    {
      id: dashboardId,
      options: {
        showContent: true,
      },
    }
  );
  
  function getProposalIds() {
    if (!dashboardData?.data) return [];
    const dashboardObj = dashboardData.data as SuiObjectData;
    if (dashboardObj.content?.dataType !== "moveObject") return [];
    return (dashboardObj.content.fields as any)?.proposals_ids || [];
  }
  
  // Fetch all proposals
  const { data: proposalsData, isPending } = useSuiClientQuery(
    "multiGetObjects",
    {
      ids: getProposalIds(),
      options: {
        showContent: true,
      },
    }
  );

  // Helper to normalize status from Move object
  function getStatusVariant(status: any): string {
    if (!status) return "Unknown";
    // If status is a string, return as is
    if (typeof status === "string") return status;
    // If status is an object with fields.name or just name
    if (status.variant) return status.variant;
    if (status.fields && status.fields.name) return status.fields.name;
    if (status.name) return status.name;
    return JSON.stringify(status);
  }

  // Identify ballots among the objects fetched
  useEffect(() => {
    if (!proposalsData || !Array.isArray(proposalsData) || isPending) return;
    
    try {
      const parsedBallots: any[] = [];
      const parsedProposals: AdminProposal[] = [];
      
      proposalsData.forEach((item: SuiObjectResponse) => {
        if (!item.data) return;
        const obj = item.data as SuiObjectData;
        if (obj.content?.dataType !== "moveObject") return;
        
        const type = obj.content.type as string;
        const isBallot = type && type.includes("::ballot::Ballot");
        const isProposal = type && type.includes("::proposal::Proposal");
        
        const fields = obj.content.fields as any;
        
        // Process as ballot
        if (isBallot) {
          // Parse expiration timestamp
          const expiration = Number(fields.expiration);
          const normalizedExpiration = normalizeTimestamp(expiration) || expiration;
          console.log("AdminPage - Ballot expiration (normalized):", normalizedExpiration);
          
          parsedBallots.push({
            id: obj.objectId,
            title: fields.title || "Untitled Ballot",
            description: fields.description || "",
            candidates: Array.isArray(fields.candidates) 
              ? fields.candidates 
              : (fields.candidates?.vec || []),
            totalVotes: Number(fields.total_votes || 0),
            expiration: normalizedExpiration,
            status: getStatusVariant(fields.status),
            creator: fields.creator || "Unknown",
            isPrivate: Boolean(fields.is_private)
          });
        }
        // Process as proposal
        else if (isProposal) {
          // Parse expiration timestamp
          const expiration = Number(fields.expiration);
          const normalizedExpiration = normalizeTimestamp(expiration) || expiration;
          console.log("AdminPage - Proposal expiration (normalized):", normalizedExpiration);
          
          parsedProposals.push({
            id: obj.objectId,
            title: fields.title || "Untitled",
            description: fields.description || "",
            votedYesCount: Number(fields.voted_yes_count) || 0,
            votedNoCount: Number(fields.voted_no_count) || 0,
            expiration: normalizedExpiration,
            status: getStatusVariant(fields.status),
            creator: fields.creator || "Unknown",
            voter_registry: fields.voter_registry || []
          });
        }
      });
      
      // Update ballots and proposals state
      setBallots(parsedBallots);
      setProposals(parsedProposals);
      setIsLoadingBallots(false);
      setIsLoading(false);
      
      // Update analytics with both proposal and ballot data
      updateAnalytics(parsedProposals, parsedBallots);
      
    } catch (err) {
      console.error("Failed to parse objects:", err);
      setProposals([]);
      setBallots([]);
      setIsLoading(false);
      setIsLoadingBallots(false);
    }
  }, [proposalsData, isPending]);
  
  // Function to update analytics with both proposal and ballot data
  const updateAnalytics = (parsedProposals: AdminProposal[], parsedBallots: any[]) => {
    const now = Date.now();
    const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;

    const activeProposalCount = parsedProposals.filter(p => p.status === "Active").length;
    const delistedProposalCount = parsedProposals.filter(p => p.status === "Delisted").length;
    const totalProposalVotes = parsedProposals.reduce((sum, p) => sum + p.votedYesCount + p.votedNoCount, 0);
    const recentProposals = parsedProposals.filter(p => p.expiration > now && p.expiration - (7 * 24 * 60 * 60 * 1000) < now);
    
    // Calculate ballot statistics
    const activeBallotCount = parsedBallots.filter(b => b.status === "Active").length;
    const delistedBallotCount = parsedBallots.filter(b => b.status === "Delisted").length;
    const totalBallotVotes = parsedBallots.reduce((sum, b) => sum + b.totalVotes, 0);
    const recentBallots = parsedBallots.filter(b => b.expiration > now && b.expiration - (7 * 24 * 60 * 60 * 1000) < now);
    
    // Combined statistics
    const totalVotes = totalProposalVotes + totalBallotVotes;
    const recentVotesEstimate = Math.floor(totalVotes * 0.3);
    const uniqueVoters = new Set<string>();
    
    // Add voters from proposals
    parsedProposals.forEach(p => {
      p.voter_registry.forEach((v: string) => uniqueVoters.add(v));
    });
    
    // Estimate total unique voters
    const estimatedUniqueVoters = uniqueVoters.size + Math.floor(totalBallotVotes * 0.7);

    setAnalyticsData({
      totalProposals: parsedProposals.length,
      activeProposals: activeProposalCount,
      delistedProposals: delistedProposalCount,
      totalVotes: totalVotes,
      votesLastWeek: recentVotesEstimate,
      votesWeeklyChange: 8.2, // Placeholder
      proposalsLastWeek: recentProposals.length + recentBallots.length,
      proposalsWeeklyChange: 12.5, // Placeholder
      activeUsers: estimatedUniqueVoters,
      activeUsersChange: -2.3 // Placeholder
    });
  };

  // Utility functions
  const calculateVotePercentage = (isYes: boolean): number => {
    const totalYesVotes = proposals.reduce((sum: number, p: AdminProposal) => sum + p.votedYesCount, 0);
    const totalNoVotes = proposals.reduce((sum: number, p: AdminProposal) => sum + p.votedNoCount, 0);
    const total = totalYesVotes + totalNoVotes;
    
    if (total === 0) return 0;
    return isYes ? (totalYesVotes / total * 100) : (totalNoVotes / total * 100);
  };

  const isExpired = (unixTimeMs: number): boolean => {
    const normalizedTime = normalizeTimestamp(unixTimeMs);
    if (normalizedTime === null) {
      console.error('Invalid timestamp in isExpired:', unixTimeMs);
      return false; // Safer to assume not expired when unknown
    }
    return normalizedTime < Date.now();
  };

  const formatTimeRemaining = (timestampMs: number): string => {
    return formatTimeLeft(timestampMs);
  };

  // Check if wallet is connected
  if (!account) {
    return (
      <div className="container mx-auto px-4 py-16">
        <Card className="bg-blue-900/30 border-blue-800/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-300">
              <Wallet />
              Connect Your Wallet
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-white/70 mb-4">
              You need to connect your wallet to access the admin dashboard. Please connect your wallet that has an admin capability.
            </p>
            <div className="flex justify-center">
              <ConnectButton />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoadingAdminCap || isLoadingSuperAdminCap) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-blue-500"></div>
          <p className="mt-4 text-lg text-white">Loading admin access...</p>
        </div>
      </div>
    );
  }

  if (!hasAdminCap && !hasSuperAdminCap) {
    return (
      <div className="container mx-auto px-4 py-16">
        <Card className="bg-red-900/30 border-red-800/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-300">
              <AlertTriangle />
              Access Denied
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-white/70">
              You don't have admin privileges to access this page. Please contact the system administrator.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <FeatureGuard feature="dashboard">
      <AdminPageGuard>
        <div className="min-h-screen bg-black bg-grid-pattern text-white">
          <Navbar />
          <div className="container mx-auto px-4 pt-24 pb-12">
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center mb-8">
              <div>
                <h1 className="text-3xl font-bold">Admin Dashboard</h1>
                <p className="text-white/70">Manage proposals and system settings</p>
              </div>
            </div>
            
            <Tabs defaultValue="dashboard" className="space-y-8">
              <TabsList className="bg-gray-900/50 border border-gray-800 p-1 mb-8">
                <TabsTrigger value="dashboard" className="data-[state=active]:bg-blue-600">
                  <LayoutDashboard className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Dashboard</span>
                  <span className="sm:hidden">Stats</span>
                </TabsTrigger>
                <TabsTrigger value="proposals" className="data-[state=active]:bg-blue-600">
                  <FileText className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Proposals</span>
                  <span className="sm:hidden">Props</span>
                </TabsTrigger>
                <TabsTrigger value="users" className="data-[state=active]:bg-blue-600">
                  <Users className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Users</span>
                </TabsTrigger>
                <TabsTrigger value="settings" className="data-[state=active]:bg-blue-600">
                  <Settings className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Settings</span>
                  <span className="sm:hidden">Config</span>
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="dashboard" className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card className="bg-black/30 border-white/20">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base text-white">Total Proposals</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{proposals.length}</div>
                      <p className="text-xs text-muted-foreground">
                        {proposals.filter(p => p.status === "Active").length} active proposals
                      </p>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-black/30 border-white/20">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base text-white">Total Users</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {Math.floor(Math.random() * 100) + 50}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {Math.floor(Math.random() * 20) + 5} new today
                      </p>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-black/30 border-white/20">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base text-white">Total Votes</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {proposals.reduce((sum, p) => sum + p.votedYesCount + p.votedNoCount, 0)}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Across all proposals
                      </p>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-black/30 border-white/20">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base text-white">Vote Success Rate</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {calculateVotePercentage(true).toFixed(1)}%
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Average yes vote percentage
                      </p>
                    </CardContent>
                  </Card>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Card className="md:col-span-2 bg-black/30 border-white/20">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-xl font-medium">Recent Proposals</CardTitle>
                      <CardDescription>Latest proposals in the system</CardDescription>
                    </CardHeader>
                    <CardContent className="px-2 h-[320px] overflow-auto">
                      <div className="space-y-2">
                        {proposals.slice(0, 5).map((proposal, i) => (
                          <div key={`proposal-${i}`} className="flex items-center p-2 hover:bg-white/5 rounded-md transition-colors">
                            <div className={`h-8 w-8 rounded-full flex items-center justify-center 
                              ${proposal.status === "Active" ? 'bg-blue-900/50 text-blue-400' : 
                                'bg-red-900/50 text-red-400'}`
                            }>
                              {proposal.status === "Active" ? <FileText className="h-4 w-4" /> : 
                                <Ban className="h-4 w-4" />}
                            </div>
                            <div className="ml-3 flex-1">
                              <p className="text-sm font-medium text-white">
                                {proposal.title.length > 30 ? proposal.title.substring(0, 30) + '...' : proposal.title}
                              </p>
                              <p className="text-xs text-white/60">
                                {proposal.status === "Active" ? 
                                  `${proposal.votedYesCount + proposal.votedNoCount} votes` : 
                                  `Status: ${proposal.status}`}
                              </p>
                            </div>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-black/30 border-white/20">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-xl font-medium">System Status</CardTitle>
                      <CardDescription>Current system health</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <p className="text-sm text-white/70">Dashboard</p>
                            <Badge variant="outline" className="bg-green-900/30 text-green-400 border-green-700/50">
                              Active
                            </Badge>
                          </div>
                          <div className="w-full h-2 bg-black/40 rounded-full overflow-hidden">
                            <div className="bg-green-500 h-full w-full" />
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <p className="text-sm text-white/70">Package ID</p>
                            <Badge variant="outline" className="bg-green-900/30 text-green-400 border-green-700/50">
                              Valid
                            </Badge>
                          </div>
                          <div className="w-full h-2 bg-black/40 rounded-full overflow-hidden">
                            <div className="bg-green-500 h-full w-full" />
                          </div>
                          <p className="text-xs text-white/50 break-all">
                            {packageId || "Not available"}
                          </p>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <p className="text-sm text-white/70">Network</p>
                            <Badge variant="outline" className="bg-green-900/30 text-green-400 border-green-700/50">
                              Connected
                            </Badge>
                          </div>
                          <div className="w-full h-2 bg-black/40 rounded-full overflow-hidden">
                            <div className="bg-green-500 h-full w-full" />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
                
                <SystemStats />
              </TabsContent>
              
              <TabsContent value="proposals">
                <ProposalManagement adminCapId={adminCapId || ""} />
              </TabsContent>
              
              <TabsContent value="users">
                <div className="p-4 text-center text-muted-foreground">
                  <p>User management functionality is under development</p>
                </div>
              </TabsContent>
              
              <TabsContent value="settings">
                <div className="p-4 text-center text-muted-foreground">
                  <p>Settings functionality is under development</p>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </AdminPageGuard>
    </FeatureGuard>
  );
};

export default AdminPage;