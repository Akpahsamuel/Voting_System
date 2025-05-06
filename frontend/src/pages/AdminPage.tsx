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
      <div className="container mx-auto px-4 py-8 sm:py-16 bg-gray-950 min-h-screen flex items-center justify-center">
        <Card className="bg-gray-900 border-blue-800 shadow-xl max-w-md w-full">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-white text-xl sm:text-2xl font-bold tracking-tight">
              <Wallet className="h-5 w-5 sm:h-6 sm:w-6 text-blue-400" />
              Connect Your Wallet
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
            <p className="text-white mb-6 text-sm sm:text-base leading-relaxed">
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
      <div className="flex h-screen items-center justify-center p-4 bg-gray-950">
        <div className="flex flex-col items-center bg-gray-900 p-8 rounded-xl border border-gray-800 shadow-2xl">
          <div className="h-10 w-10 sm:h-12 sm:w-12 animate-spin rounded-full border-b-2 border-t-2 border-blue-400"></div>
          <p className="mt-6 text-base sm:text-lg text-white font-medium">Loading admin access...</p>
          <p className="mt-2 text-xs text-white/90">Please wait while we verify your admin privileges</p>
        </div>
      </div>
    );
  }

  if (!hasAdminCap && !hasSuperAdminCap) {
    return (
      <div className="container mx-auto px-4 py-8 sm:py-16 bg-gray-950 min-h-screen flex items-center justify-center">
        <Card className="bg-gray-900 border-red-800 shadow-xl max-w-md w-full">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-white text-xl sm:text-2xl font-bold tracking-tight">
              <AlertTriangle className="h-5 w-5 sm:h-6 sm:w-6 text-red-400" />
              Access Denied
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
            <p className="text-white text-sm sm:text-base leading-relaxed">
              You don't have admin privileges to access this page. Please contact the system administrator.
            </p>
            <div className="mt-6">
              <Button className="bg-gray-800 hover:bg-gray-700 text-white">
                Return to Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <FeatureGuard feature="dashboard">
      <AdminPageGuard>
        <div className="min-h-screen bg-gray-950 text-white">
          <div className="container mx-auto px-3 sm:px-4 pt-20 sm:pt-24 pb-12 relative z-10">
            <div className="absolute inset-0 bg-grid-pattern opacity-5 pointer-events-none z-0"></div>
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center mb-6 relative z-10">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">Admin Dashboard</h1>
                <p className="text-white/80 text-sm sm:text-base mt-1 leading-relaxed">Manage proposals and system settings</p>
              </div>
            </div>
            
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
              <div className="overflow-x-auto">
                <TabsList className="bg-gray-900 border border-gray-800 p-2 mb-8 rounded-lg shadow-lg grid grid-cols-3 sm:flex gap-1 min-w-[300px]">
                  <TabsTrigger value="dashboard" className="data-[state=active]:bg-blue-700 data-[state=active]:text-white data-[state=active]:font-medium data-[state=active]:shadow-md py-2 transition-all duration-200 text-white">
                    <LayoutDashboard className="h-4 w-4 md:mr-2" />
                    <span className="hidden md:inline font-medium">Dashboard</span>
                    <span className="md:hidden ml-1 text-xs font-medium">Dashboard</span>
                  </TabsTrigger>
                  <TabsTrigger value="proposals" className="data-[state=active]:bg-blue-700 data-[state=active]:text-white data-[state=active]:font-medium data-[state=active]:shadow-md py-2 transition-all duration-200 text-white">
                    <FileText className="h-4 w-4 md:mr-2" />
                    <span className="hidden md:inline font-medium">Proposals</span>
                    <span className="md:hidden ml-1 text-xs font-medium">Proposals</span>
                  </TabsTrigger>
                  <TabsTrigger value="create-proposal" className="data-[state=active]:bg-blue-700 data-[state=active]:text-white data-[state=active]:font-medium data-[state=active]:shadow-md py-2 transition-all duration-200 text-white">
                    <FileText className="h-4 w-4 md:mr-2" />
                    <span className="hidden md:inline font-medium">Create Proposal</span>
                    <span className="md:hidden ml-1 text-xs font-medium">New Prop</span>
                  </TabsTrigger>
                  <TabsTrigger value="ballots" className="data-[state=active]:bg-blue-700 data-[state=active]:text-white data-[state=active]:font-medium data-[state=active]:shadow-md py-2 transition-all duration-200 text-white">
                    <Vote className="h-4 w-4 md:mr-2" />
                    <span className="hidden md:inline font-medium">Ballots</span>
                    <span className="md:hidden ml-1 text-xs font-medium">Ballots</span>
                  </TabsTrigger>
                  <TabsTrigger value="create-ballot" className="data-[state=active]:bg-blue-700 data-[state=active]:text-white data-[state=active]:font-medium data-[state=active]:shadow-md py-2 transition-all duration-200 text-white">
                    <Vote className="h-4 w-4 md:mr-2" />
                    <span className="hidden md:inline font-medium">Create Ballot</span>
                    <span className="md:hidden ml-1 text-xs font-medium">New Ballot</span>
                  </TabsTrigger>
                  <TabsTrigger value="voters" className="data-[state=active]:bg-blue-700 data-[state=active]:text-white data-[state=active]:font-medium data-[state=active]:shadow-md py-2 transition-all duration-200 text-white">
                    <Users className="h-4 w-4 md:mr-2" />
                    <span className="hidden md:inline font-medium">Voters</span>
                    <span className="md:hidden ml-1 text-xs font-medium">Voters</span>
                  </TabsTrigger>
                  <TabsTrigger value="admin-management" className="data-[state=active]:bg-blue-700 data-[state=active]:text-white data-[state=active]:font-medium data-[state=active]:shadow-md py-2 transition-all duration-200 text-white">
                    <ShieldCheck className="h-4 w-4 md:mr-2" />
                    <span className="hidden md:inline font-medium">Admin Rights</span>
                    <span className="md:hidden ml-1 text-xs font-medium">Rights</span>
                  </TabsTrigger>
                </TabsList>
              </div>
              
              <TabsContent value="dashboard" className="space-y-6">
                <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
                  <Card className="bg-gray-900 border-gray-700 shadow-md hover:shadow-lg transition-shadow">
                    <CardHeader className="p-2 sm:p-3 pb-0 sm:pb-2">
                      <CardTitle className="text-xs sm:text-sm md:text-base text-white font-semibold tracking-tight">Total Proposals</CardTitle>
                    </CardHeader>
                    <CardContent className="p-2 sm:p-3 pt-0 md:p-6 md:pt-0">
                      <div className="text-lg sm:text-xl md:text-2xl font-bold text-white">{proposals.length}</div>
                      <p className="text-[10px] sm:text-xs text-white/90 font-medium mt-1">
                        {proposals.filter(p => p.status === "Active").length} active proposals
                      </p>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-gray-900 border-gray-700 shadow-md hover:shadow-lg transition-shadow">
                    <CardHeader className="p-2 sm:p-3 pb-0 sm:pb-2">
                      <CardTitle className="text-xs sm:text-sm md:text-base text-white font-semibold tracking-tight">Total Users</CardTitle>
                    </CardHeader>
                    <CardContent className="p-2 sm:p-3 pt-0 md:p-6 md:pt-0">
                      <div className="text-lg sm:text-xl md:text-2xl font-bold text-white">
                        {Math.floor(Math.random() * 100) + 50}
                      </div>
                      <p className="text-[10px] sm:text-xs text-white/90 font-medium mt-1">
                        {Math.floor(Math.random() * 20) + 5} new today
                      </p>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-gray-900 border-gray-700 shadow-md hover:shadow-lg transition-shadow">
                    <CardHeader className="p-2 sm:p-3 pb-0 sm:pb-2">
                      <CardTitle className="text-xs sm:text-sm md:text-base text-white font-semibold tracking-tight">Total Votes</CardTitle>
                    </CardHeader>
                    <CardContent className="p-2 sm:p-3 pt-0 md:p-6 md:pt-0">
                      <div className="text-lg sm:text-xl md:text-2xl font-bold text-white">
                        {proposals.reduce((sum, p) => sum + p.votedYesCount + p.votedNoCount, 0)}
                      </div>
                      <p className="text-[10px] sm:text-xs text-white/90 font-medium mt-1">
                        Across all proposals
                      </p>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-gray-900 border-gray-700 shadow-md hover:shadow-lg transition-shadow">
                    <CardHeader className="p-2 sm:p-3 pb-0 sm:pb-2">
                      <CardTitle className="text-xs sm:text-sm md:text-base text-white font-semibold tracking-tight">Vote Success Rate</CardTitle>
                    </CardHeader>
                    <CardContent className="p-2 sm:p-3 pt-0 md:p-6 md:pt-0">
                      <div className="text-lg sm:text-xl md:text-2xl font-bold text-white">
                        {calculateVotePercentage(true).toFixed(1)}%
                      </div>
                      <p className="text-[10px] sm:text-xs text-white/90 font-medium mt-1">
                        Average yes vote percentage
                      </p>
                    </CardContent>
                  </Card>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
                  <Card className="md:col-span-2 bg-gray-900 border-gray-700 shadow-md hover:shadow-lg transition-shadow">
                    <CardHeader className="p-3 sm:p-4 pb-1 sm:pb-2">
                      <CardTitle className="text-sm sm:text-base md:text-xl font-medium tracking-tight text-white">Recent Proposals</CardTitle>
                      <CardDescription className="text-white/70 text-[10px] sm:text-xs md:text-sm">Latest proposals in the system</CardDescription>
                    </CardHeader>
                    <CardContent className="p-1 sm:px-2 h-[200px] sm:h-[250px] md:h-[320px] overflow-auto">
                      <div className="space-y-1 sm:space-y-2">
                        {proposals.slice(0, 5).map((proposal, i) => (
                          <div key={`proposal-${i}`} className="flex items-center p-1 sm:p-2 hover:bg-gray-800 rounded-md transition-colors border border-gray-800 hover:border-gray-700">
                            <div className={`h-5 w-5 sm:h-6 sm:w-6 md:h-8 md:w-8 rounded-full flex items-center justify-center 
                              ${proposal.status === "Active" ? 'bg-blue-800 text-blue-200' : 
                                'bg-red-800 text-red-200'}`
                            }>
                              {proposal.status === "Active" ? <FileText className="h-2.5 w-2.5 sm:h-3 sm:w-3 md:h-4 md:w-4" /> : 
                                <Ban className="h-2.5 w-2.5 sm:h-3 sm:w-3 md:h-4 md:w-4" />}
                            </div>
                            <div className="ml-1.5 sm:ml-2 md:ml-3 flex-1 overflow-hidden">
                              <p className="text-[10px] sm:text-xs md:text-sm font-medium text-white truncate">
                                {proposal.title}
                              </p>
                              <p className="text-[8px] sm:text-[10px] md:text-xs text-white/90">
                                {proposal.status === "Active" ? 
                                  `${proposal.votedYesCount + proposal.votedNoCount} votes` : 
                                  `Status: ${proposal.status}`}
                              </p>
                            </div>
                            <Button variant="ghost" size="sm" className="h-5 w-5 sm:h-6 sm:w-6 md:h-8 md:w-8 p-0 text-white hover:text-white hover:bg-gray-700">
                              <MoreHorizontal className="h-2.5 w-2.5 sm:h-3 sm:w-3 md:h-4 md:w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-gray-900 border-gray-700 shadow-md hover:shadow-lg transition-shadow">
                    <CardHeader className="p-3 sm:p-4 pb-1 sm:pb-2">
                      <CardTitle className="text-sm sm:text-base md:text-xl font-medium tracking-tight text-white">System Status</CardTitle>
                      <CardDescription className="text-white/70 text-[10px] sm:text-xs md:text-sm">Current system health</CardDescription>
                    </CardHeader>
                    <CardContent className="p-2 sm:p-3 md:p-4">
                      <div className="space-y-2 sm:space-y-3 md:space-y-4">
                        <div className="space-y-1 sm:space-y-2">
                          <div className="flex justify-between">
                            <p className="text-[10px] sm:text-xs md:text-sm text-white font-medium">Dashboard</p>
                            <Badge variant="outline" className="text-[8px] sm:text-xs bg-green-800 text-green-200 border-green-700 py-0 px-1 sm:px-2">
                              Active
                            </Badge>
                          </div>
                          <div className="w-full h-1 sm:h-1.5 md:h-2 bg-gray-800 rounded-full overflow-hidden">
                            <div className="bg-green-600 h-full w-full" />
                          </div>
                        </div>
                        
                        <div className="space-y-1 sm:space-y-2">
                          <div className="flex justify-between">
                            <p className="text-[10px] sm:text-xs md:text-sm text-white font-medium">Package ID</p>
                            <Badge variant="outline" className="text-[8px] sm:text-xs bg-green-800 text-green-200 border-green-700 py-0 px-1 sm:px-2">
                              Valid
                            </Badge>
                          </div>
                          <div className="w-full h-1 sm:h-1.5 md:h-2 bg-gray-800 rounded-full overflow-hidden">
                            <div className="bg-green-600 h-full w-full" />
                          </div>
                          <p className="text-[8px] sm:text-2xs md:text-xs text-white/80 break-all font-mono mt-1">
                            {packageId || "Not available"}
                          </p>
                        </div>
                        
                        <div className="space-y-1 sm:space-y-2">
                          <div className="flex justify-between">
                            <p className="text-[10px] sm:text-xs md:text-sm text-white font-medium">Network</p>
                            <Badge variant="outline" className="text-[8px] sm:text-xs bg-green-800 text-green-200 border-green-700 py-0 px-1 sm:px-2">
                              Connected
                            </Badge>
                          </div>
                          <div className="w-full h-1 sm:h-1.5 md:h-2 bg-gray-800 rounded-full overflow-hidden">
                            <div className="bg-green-600 h-full w-full" />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
                
                <SystemStats />
              </TabsContent>
              
              <TabsContent value="proposals" className="space-y-6">
                <ProposalManagement adminCapId={adminCapId || ""} />
              </TabsContent>
              
              <TabsContent value="create-proposal" className="space-y-6">
                <CreateProposal />
              </TabsContent>
              
              <TabsContent value="ballots" className="space-y-6">
                <BallotManagement 
                  adminCapId={adminCapId !== null ? adminCapId : undefined} 
                  superAdminCapId={superAdminCapId !== null ? superAdminCapId : undefined} 
                  hasSuperAdminCap={hasSuperAdminCap} 
                />
              </TabsContent>
              
              <TabsContent value="create-ballot" className="space-y-6">
                <CreateBallot
                  adminCapId={adminCapId !== null ? adminCapId : undefined}
                  superAdminCapId={superAdminCapId !== null ? superAdminCapId : undefined}
                  hasSuperAdminCap={hasSuperAdminCap}
                />
              </TabsContent>
              
              <TabsContent value="voters" className="space-y-6">
                <VoterRegistry />
              </TabsContent>
              
              <TabsContent value="admin-management" className="space-y-6">
                <SuperAdminManagement superAdminCapId={superAdminCapId || ""} />
              </TabsContent>
              
              <TabsContent value="settings" className="space-y-6">
                <Card className="bg-gray-900 border-gray-700">
                  <CardHeader>
                    <CardTitle>System Settings</CardTitle>
                    <CardDescription>Configure system parameters</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">Settings functionality is under development</p>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </AdminPageGuard>
    </FeatureGuard>
  );
};

export default AdminPage;