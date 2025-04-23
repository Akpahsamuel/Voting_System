import { FC, useState, useEffect } from 'react';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { useAdminCap } from "../hooks/useAdminCap";
import { useSuperAdminCap } from "../hooks/useSuperAdminCap";
import ProposalManagement from "../components/admin/ProposalManagement";
import GrantAdmin from "../components/admin/GrantAdmin";
import SuperAdminManagement from "../components/admin/SuperAdminManagement";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Separator } from "../components/ui/separator";
import { Proposal } from "../types";
import { useSuiClientQuery } from '@mysten/dapp-kit';
import { ArrowUp, ArrowDown, Activity, UserCheck, Clock, FileText, Users, Settings, LayoutDashboard, ChevronRight, AlertTriangle, FileCode, Terminal, Ban, UserPlus, ShieldCheck, Wallet } from 'lucide-react';
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from '../components/ui/badge';
import { useNetworkVariable } from "../config/networkConfig";
import { SuiObjectData, SuiObjectResponse } from "@mysten/sui/client";
import { ConnectButton } from '@mysten/dapp-kit';

// Define SuiID type
type SuiID = string;

export const AdminPage: FC = () => {
  const account = useCurrentAccount();
  const { hasAdminCap, adminCapId, isLoading: isLoadingAdminCap } = useAdminCap();
  const { hasSuperAdminCap, superAdminCapId, isLoading: isLoadingSuperAdminCap } = useSuperAdminCap();
  const dashboardId = useNetworkVariable("dashboardId");
  const [activeTab, setActiveTab] = useState("dashboard");
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
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

  // Process proposal data when it changes
  useEffect(() => {
    if (!proposalsData || !Array.isArray(proposalsData) || isPending) return;
    
    const parsedProposals = proposalsData
      .map((item: SuiObjectResponse) => {
        if (!item.data) return null;
        const obj = item.data as SuiObjectData;
        if (obj.content?.dataType !== "moveObject") return null;
        
        const fields = obj.content.fields as any;
        return {
          id: obj.objectId as SuiID,
          title: fields.title,
          description: fields.description,
          votedYesCount: Number(fields.voted_yes_count),
          votedNoCount: Number(fields.voted_no_count),
          expiration: Number(fields.expiration),
          status: fields.status,
          creator: fields.creator || "Unknown",
          voter_registry: fields.voter_registry || []
        };
      })
      .filter(Boolean) as unknown as Proposal[];
    
    // Perform analytics calculations based on real data
    const now = Date.now();
    const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;
    
    const activeCount = parsedProposals.filter(p => p.status.variant === "Active").length;
    const delistedCount = parsedProposals.filter(p => p.status.variant === "Delisted").length;
    const totalVotes = parsedProposals.reduce((sum, p) => sum + p.votedYesCount + p.votedNoCount, 0);
    
    // Count proposals created within the last week (approximation using expiration)
    const recentProposals = parsedProposals.filter(p => p.expiration > now && p.expiration - (7 * 24 * 60 * 60 * 1000) < now);
    
    // Estimate vote activity in the last week (this is an estimation)
    // In a real app, you would track this with timestamps on votes
    const recentVotesEstimate = Math.floor(totalVotes * 0.3);
    
    // For change percentages, we're using placeholder values since we don't have historical data
    // In a real app, you would compare current week to previous week
    
    setAnalyticsData({
      totalProposals: parsedProposals.length,
      activeProposals: activeCount,
      delistedProposals: delistedCount,
      totalVotes: totalVotes,
      votesLastWeek: recentVotesEstimate,
      votesWeeklyChange: 8.2, // Placeholder - in a real app, calculate from historical data
      proposalsLastWeek: recentProposals.length,
      proposalsWeeklyChange: 12.5, // Placeholder - in a real app, calculate from historical data
      activeUsers: parsedProposals.reduce((set, p) => {
        p.voter_registry.forEach(voter => set.add(voter));
        return set;
      }, new Set<string>()).size,
      activeUsersChange: -2.3 // Placeholder - in a real app, calculate from historical data
    });

    setProposals(parsedProposals);
    setIsLoading(false);
  }, [proposalsData, isPending]);

  // Utility functions
  const calculateVotePercentage = (isYes: boolean): number => {
    const totalYesVotes = proposals.reduce((sum: number, p: Proposal) => sum + p.votedYesCount, 0);
    const totalNoVotes = proposals.reduce((sum: number, p: Proposal) => sum + p.votedNoCount, 0);
    const total = totalYesVotes + totalNoVotes;
    
    if (total === 0) return 0;
    return isYes ? (totalYesVotes / total * 100) : (totalNoVotes / total * 100);
  };

  const isExpired = (unixTimeMs: number): boolean => {
    return new Date(unixTimeMs) < new Date();
  };

  const formatTimeRemaining = (timestampMs: number): string => {
    const now = new Date();
    const expirationDate = new Date(timestampMs);
    
    if (expirationDate < now) return "Expired";
    
    const diffMs = expirationDate.getTime() - now.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (diffDays > 0) {
      return `${diffDays}d ${diffHours}h left`;
    } else {
      const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      return `${diffHours}h ${diffMinutes}m left`;
    }
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
    <div className="container mx-auto px-4 py-8">
      <header className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
            <p className="mt-1 text-white/60">Manage proposals and view governance statistics</p>
          </div>
          
          <div className="mt-4 md:mt-0 flex items-center space-x-4">
            {adminCapId && (
              <Badge variant="outline" className="text-blue-300 border-blue-500/50 bg-blue-900/30 px-3 py-1">
                Admin ID: {adminCapId?.substring(0, 8)}...
              </Badge>
            )}
            {superAdminCapId && (
              <Badge variant="outline" className="text-purple-300 border-purple-500/50 bg-purple-900/30 px-3 py-1">
                SuperAdmin ID: {superAdminCapId?.substring(0, 8)}...
              </Badge>
            )}
            <Button variant="outline" className="border-emerald-500/30 text-emerald-300 hover:bg-emerald-900/30">
              <Activity className="mr-2 h-4 w-4" />
              System Status
            </Button>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-6">
        <div className="flex overflow-x-auto pb-2">
          <div className="flex space-x-1 bg-black/20 p-1 rounded-lg">
            <Button 
              variant={activeTab === "dashboard" ? "default" : "ghost"}
              className={activeTab === "dashboard" ? "bg-blue-600" : "hover:bg-blue-900/30"}
              onClick={() => setActiveTab("dashboard")}
            >
              <LayoutDashboard className="mr-2 h-4 w-4" />
              Dashboard
            </Button>
            <Button 
              variant={activeTab === "proposals" ? "default" : "ghost"}
              className={activeTab === "proposals" ? "bg-blue-600" : "hover:bg-blue-900/30"}
              onClick={() => setActiveTab("proposals")}
            >
              <FileText className="mr-2 h-4 w-4" />
              Proposal Management
            </Button>
            <Button 
              variant={activeTab === "grant_admin" ? "default" : "ghost"}
              className={activeTab === "grant_admin" ? "bg-blue-600" : "hover:bg-blue-900/30"}
              onClick={() => setActiveTab("grant_admin")}
            >
              <UserPlus className="mr-2 h-4 w-4" />
              Grant Admin
            </Button>
            {hasSuperAdminCap && (
              <Button 
                variant={activeTab === "super_admin" ? "default" : "ghost"}
                className={activeTab === "super_admin" ? "bg-purple-600" : "hover:bg-purple-900/30"}
                onClick={() => setActiveTab("super_admin")}
              >
                <ShieldCheck className="mr-2 h-4 w-4" />
                SuperAdmin
              </Button>
            )}
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            {activeTab === "dashboard" && (
              <div className="space-y-6">
                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card className="bg-blue-900/20 border-blue-500/30 hover:bg-blue-900/30 transition-all">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-white/70">Total Proposals</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-baseline justify-between">
                        <div className="text-3xl font-bold text-white">{analyticsData.totalProposals}</div>
                        <div className="flex items-center text-xs font-medium">
                          {analyticsData.proposalsWeeklyChange >= 0 ? (
                            <div className="text-emerald-400 flex items-center">
                              <ArrowUp className="mr-1 h-3 w-3" />
                              {analyticsData.proposalsWeeklyChange}%
                            </div>
                          ) : (
                            <div className="text-red-400 flex items-center">
                              <ArrowDown className="mr-1 h-3 w-3" />
                              {Math.abs(analyticsData.proposalsWeeklyChange)}%
                            </div>
                          )}
                          <span className="ml-1 text-white/50">vs last week</span>
                        </div>
                      </div>
                      <p className="mt-2 text-xs text-white/50">{analyticsData.proposalsLastWeek} new this week</p>
                    </CardContent>
                  </Card>

                  <Card className="bg-emerald-900/20 border-emerald-500/30 hover:bg-emerald-900/30 transition-all">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-white/70">Active Proposals</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-white">{analyticsData.activeProposals}</div>
                      <div className="mt-1 flex items-baseline justify-between">
                        <p className="text-xs text-white/50">
                          {analyticsData.totalProposals > 0 
                            ? (analyticsData.activeProposals / analyticsData.totalProposals * 100).toFixed(1) 
                            : "0"}% of total
                        </p>
                        <Badge 
                          variant="outline" 
                          className={`
                            ${analyticsData.activeProposals > 0 
                              ? "text-emerald-300 border-emerald-500/30 bg-emerald-900/30" 
                              : "text-amber-300 border-amber-500/30 bg-amber-900/30"}
                          `}
                        >
                          {analyticsData.activeProposals > 0 ? "Healthy" : "No Active Proposals"}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-purple-900/20 border-purple-500/30 hover:bg-purple-900/30 transition-all">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-white/70">Total Votes</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-baseline justify-between">
                        <div className="text-3xl font-bold text-white">{analyticsData.totalVotes.toLocaleString()}</div>
                        <div className="flex items-center text-xs font-medium">
                          {analyticsData.votesWeeklyChange >= 0 ? (
                            <div className="text-emerald-400 flex items-center">
                              <ArrowUp className="mr-1 h-3 w-3" />
                              {analyticsData.votesWeeklyChange}%
                            </div>
                          ) : (
                            <div className="text-red-400 flex items-center">
                              <ArrowDown className="mr-1 h-3 w-3" />
                              {Math.abs(analyticsData.votesWeeklyChange)}%
                            </div>
                          )}
                          <span className="ml-1 text-white/50">vs last week</span>
                        </div>
                      </div>
                      <p className="mt-2 text-xs text-white/50">{analyticsData.votesLastWeek.toLocaleString()} estimated new this week</p>
                    </CardContent>
                  </Card>

                  <Card className="bg-amber-900/20 border-amber-500/30 hover:bg-amber-900/30 transition-all">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-white/70">Active Users</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-baseline justify-between">
                        <div className="text-3xl font-bold text-white">{analyticsData.activeUsers}</div>
                        <div className="flex items-center text-xs font-medium">
                          {analyticsData.activeUsersChange >= 0 ? (
                            <div className="text-emerald-400 flex items-center">
                              <ArrowUp className="mr-1 h-3 w-3" />
                              {analyticsData.activeUsersChange}%
                            </div>
                          ) : (
                            <div className="text-red-400 flex items-center">
                              <ArrowDown className="mr-1 h-3 w-3" />
                              {Math.abs(analyticsData.activeUsersChange)}%
                            </div>
                          )}
                          <span className="ml-1 text-white/50">vs last week</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* System Status */}
                <Card className="bg-black/30 border-white/20">
                  <CardHeader>
                    <CardTitle className="text-xl font-medium flex items-center gap-2">
                      <Activity className="h-5 w-5 text-emerald-400" />
                      System Health
                    </CardTitle>
                    <CardDescription>Current status of the governance system</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-white/60">Status</span>
                          <Badge className="bg-emerald-600">{systemHealth.status}</Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-white/60">Uptime</span>
                          <span className="text-white">{systemHealth.uptime}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-white/60">Response Time</span>
                          <span className="text-white">{systemHealth.responseTime}</span>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-white/60">Error Rate</span>
                          <span className="text-white">{systemHealth.errorRate}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-white/60">Last Incident</span>
                          <span className="text-white">{systemHealth.lastIncident}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-white/60">Protocol Version</span>
                          <span className="text-white">v1.2.5</span>
                        </div>
                      </div>
                      
                      <div className="flex flex-col justify-center">
                        <Button variant="outline" className="gap-2 border-emerald-500/30 text-emerald-300 hover:bg-emerald-900/30">
                          <FileCode className="h-4 w-4" />
                          View Protocol Logs
                        </Button>
                        <Button variant="outline" className="mt-2 gap-2 border-blue-500/30 text-blue-300 hover:bg-blue-900/30">
                          <Terminal className="h-4 w-4" />
                          Run Diagnostics
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Recent Activity and Quick Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Card className="md:col-span-2 bg-black/30 border-white/20">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-xl font-medium">Recent Proposals</CardTitle>
                      <CardDescription>Latest proposals in the system</CardDescription>
                    </CardHeader>
                    <CardContent className="px-2">
                      <div className="space-y-2">
                        {proposals.slice(0, 5).map((proposal, i) => (
                          <div key={`proposal-${i}`} className="flex items-center p-2 hover:bg-white/5 rounded-md transition-colors">
                            <div className={`h-8 w-8 rounded-full flex items-center justify-center 
                              ${proposal.status.variant === "Active" ? 'bg-blue-900/50 text-blue-400' : 
                                'bg-red-900/50 text-red-400'}`
                            }>
                              {proposal.status.variant === "Active" ? <FileText className="h-4 w-4" /> : 
                                <Ban className="h-4 w-4" />}
                            </div>
                            <div className="ml-3 flex-1">
                              <p className="text-sm font-medium text-white">
                                {proposal.title.length > 30 ? proposal.title.substring(0, 30) + '...' : proposal.title}
                              </p>
                              <p className="text-xs text-white/60">
                                {proposal.status.variant === "Active" ? 
                                  `${proposal.votedYesCount + proposal.votedNoCount} votes` : 
                                  `Status: ${proposal.status.variant}`}
                              </p>
                            </div>
                            <div className="text-xs text-white/50">
                              {isExpired(proposal.expiration) ? 'Expired' : formatTimeRemaining(proposal.expiration)}
                            </div>
                            <ChevronRight className="ml-2 h-4 w-4 text-white/30" />
                          </div>
                        ))}
                      </div>
                    </CardContent>
                    <CardFooter className="pt-0">
                      <Button variant="link" size="sm" className="text-blue-400 hover:text-blue-300">
                        View all proposals
                        <ChevronRight className="ml-1 h-4 w-4" />
                      </Button>
                    </CardFooter>
                  </Card>

                  <Card className="bg-black/30 border-white/20">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-xl font-medium">Vote Analytics</CardTitle>
                      <CardDescription>Vote distribution statistics</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className="text-white/60">Yes votes</span>
                            <span className="text-white">
                              {proposals.reduce((sum, p) => sum + p.votedYesCount, 0).toLocaleString()}
                            </span>
                          </div>
                          <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-emerald-500/70" 
                              style={{ 
                                width: `${calculateVotePercentage(true)}%` 
                              }} 
                            />
                          </div>
                        </div>
                        
                        <div className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className="text-white/60">No votes</span>
                            <span className="text-white">
                              {proposals.reduce((sum, p) => sum + p.votedNoCount, 0).toLocaleString()}
                            </span>
                          </div>
                          <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-red-500/70" 
                              style={{ 
                                width: `${calculateVotePercentage(false)}%` 
                              }} 
                            />
                          </div>
                        </div>
                        
                        <div className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className="text-white/60">Active rate</span>
                            <span className="text-white">
                              {(analyticsData.activeProposals / (analyticsData.totalProposals || 1) * 100).toFixed(1)}%
                            </span>
                          </div>
                          <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-blue-500/70" 
                              style={{ width: `${(analyticsData.activeProposals / (analyticsData.totalProposals || 1) * 100)}%` }} 
                            />
                          </div>
                        </div>
                        
                        <Separator className="my-4 bg-white/10" />
                        
                        <div className="grid grid-cols-2 gap-3 text-center">
                          <div className="p-2 rounded-lg bg-white/5">
                            <p className="text-white/60 text-xs">Avg. votes per proposal</p>
                            <p className="text-xl font-semibold text-white">
                              {analyticsData.totalProposals > 0 
                                ? Math.round(analyticsData.totalVotes / analyticsData.totalProposals) 
                                : 0}
                            </p>
                          </div>
                          <div className="p-2 rounded-lg bg-white/5">
                            <p className="text-white/60 text-xs">Yes vote rate</p>
                            <p className="text-xl font-semibold text-white">
                              {calculateVotePercentage(true).toFixed(1)}%
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}

            {activeTab === "proposals" && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2 }}
              >
                <ProposalManagement adminCapId={adminCapId || superAdminCapId || ""} />
              </motion.div>
            )}

            {activeTab === "grant_admin" && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2 }}
              >
                <GrantAdmin />
              </motion.div>
            )}

            {activeTab === "super_admin" && hasSuperAdminCap && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2 }}
              >
                <SuperAdminManagement superAdminCapId={superAdminCapId || ""} onRefresh={() => {}} />
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default AdminPage; 