import { FC, useState, useEffect } from 'react';
import { useAdminCap } from "../hooks/useAdminCap";
import ProposalManagement from "../components/admin/ProposalManagement";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Separator } from "../components/ui/separator";
import { Proposal } from "../types";
import { useSuiClientQuery } from '@mysten/dapp-kit';
import { ArrowUp, ArrowDown, Activity, UserCheck, Clock, FileText, Users, Settings, LayoutDashboard, ChevronRight, AlertTriangle, FileCode, Terminal } from 'lucide-react';
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from '../components/ui/badge';

// Define SuiID type
type SuiID = string;

export const AdminPage: FC = () => {
  const { hasAdminCap, adminCapId, isLoading: isLoadingAdminCap } = useAdminCap();
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

  // Placeholder for analytics data
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

  // Fetch proposals for statistics
  useEffect(() => {
    // Sample data for demonstration purposes
    const sampleProposals: Proposal[] = [
      {
        id: "sample1" as any,
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
        id: "sample2" as any,
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
        id: "sample3" as any,
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
        id: "sample4" as any,
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
        id: "sample5" as any,
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
      ...Array.from({ length: 15 }, (_, i) => ({
        id: `generated${i}` as any,
        title: `Generated Proposal ${i+1}`,
        description: `This is an auto-generated proposal for testing #${i+1}`,
        status: { variant: Math.random() > 0.3 ? "Active" : "Delisted" as "Active" | "Delisted" },
        votedYesCount: Math.floor(Math.random() * 500),
        votedNoCount: Math.floor(Math.random() * 500),
        expiration: Date.now() + (Math.random() * 10 - 5) * 24 * 60 * 60 * 1000, // Random date between -5 and +5 days
        creator: `0xgen${i}`,
        voter_registry: []
      }))
    ];

    // Update analytics data based on sample proposals
    const activeCount = sampleProposals.filter(p => p.status.variant === "Active").length;
    const delistedCount = sampleProposals.filter(p => p.status.variant === "Delisted").length;
    const totalVotes = sampleProposals.reduce((sum, p) => sum + p.votedYesCount + p.votedNoCount, 0);
    
    setAnalyticsData({
      ...analyticsData,
      totalProposals: sampleProposals.length,
      activeProposals: activeCount,
      delistedProposals: delistedCount,
      totalVotes: totalVotes,
      votesLastWeek: Math.floor(totalVotes * 0.3), // Simulated weekly data
      proposalsLastWeek: Math.floor(sampleProposals.length * 0.2) // Simulated weekly data
    });

    setProposals(sampleProposals);
    setIsLoading(false);
  }, []);

  if (isLoadingAdminCap) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-blue-500"></div>
          <p className="mt-4 text-lg text-white">Loading admin access...</p>
        </div>
      </div>
    );
  }

  if (!hasAdminCap) {
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
            <Badge variant="outline" className="text-blue-300 border-blue-500/50 bg-blue-900/30 px-3 py-1">
              Admin ID: {adminCapId?.substring(0, 8)}...
            </Badge>
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
              variant={activeTab === "analytics" ? "default" : "ghost"}
              className={activeTab === "analytics" ? "bg-blue-600" : "hover:bg-blue-900/30"}
              onClick={() => setActiveTab("analytics")}
            >
              <Activity className="mr-2 h-4 w-4" />
              Analytics
            </Button>
            <Button 
              variant={activeTab === "settings" ? "default" : "ghost"}
              className={activeTab === "settings" ? "bg-blue-600" : "hover:bg-blue-900/30"}
              onClick={() => setActiveTab("settings")}
            >
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </Button>
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
                        <p className="text-xs text-white/50">{(analyticsData.activeProposals / analyticsData.totalProposals * 100).toFixed(1)}% of total</p>
                        <Badge variant="outline" className="text-emerald-300 border-emerald-500/30 bg-emerald-900/30">Healthy</Badge>
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
                      <p className="mt-2 text-xs text-white/50">{analyticsData.votesLastWeek.toLocaleString()} new this week</p>
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
                      <CardTitle className="text-xl font-medium">Recent Activity</CardTitle>
                      <CardDescription>Latest governance transactions and events</CardDescription>
                    </CardHeader>
                    <CardContent className="px-2">
                      <div className="space-y-2">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <div key={i} className="flex items-center p-2 hover:bg-white/5 rounded-md transition-colors">
                            <div className={`h-8 w-8 rounded-full flex items-center justify-center 
                              ${i % 3 === 0 ? 'bg-blue-900/50 text-blue-400' : 
                                i % 3 === 1 ? 'bg-emerald-900/50 text-emerald-400' : 
                                'bg-purple-900/50 text-purple-400'}`
                            }>
                              {i % 3 === 0 ? <FileText className="h-4 w-4" /> : 
                                i % 3 === 1 ? <UserCheck className="h-4 w-4" /> : 
                                <Clock className="h-4 w-4" />}
                            </div>
                            <div className="ml-3 flex-1">
                              <p className="text-sm font-medium text-white">
                                {i % 3 === 0 ? 'New proposal created' : 
                                  i % 3 === 1 ? 'User voted on proposal' : 
                                  'Proposal status changed'}
                              </p>
                              <p className="text-xs text-white/60">
                                {i % 3 === 0 ? `Proposal #${124 - i}` : 
                                  i % 3 === 1 ? `User 0x${Math.random().toString(16).slice(2, 8)}` : 
                                  `Status: ${Math.random() > 0.5 ? 'Active' : 'Delisted'}`}
                              </p>
                            </div>
                            <div className="text-xs text-white/50">
                              {Math.floor(i * 15 + 2)} min ago
                            </div>
                            <ChevronRight className="ml-2 h-4 w-4 text-white/30" />
                          </div>
                        ))}
                      </div>
                    </CardContent>
                    <CardFooter className="pt-0">
                      <Button variant="link" size="sm" className="text-blue-400 hover:text-blue-300">
                        View all activity
                        <ChevronRight className="ml-1 h-4 w-4" />
                      </Button>
                    </CardFooter>
                  </Card>

                  <Card className="bg-black/30 border-white/20">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-xl font-medium">Quick Stats</CardTitle>
                      <CardDescription>Key performance indicators</CardDescription>
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
                            <div className="h-full bg-emerald-500/70" style={{ width: '68%' }} />
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
                            <div className="h-full bg-red-500/70" style={{ width: '32%' }} />
                          </div>
                        </div>
                        
                        <div className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className="text-white/60">Active rate</span>
                            <span className="text-white">
                              {(analyticsData.activeProposals / analyticsData.totalProposals * 100).toFixed(1)}%
                            </span>
                          </div>
                          <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-blue-500/70" 
                              style={{ width: `${(analyticsData.activeProposals / analyticsData.totalProposals * 100)}%` }} 
                            />
                          </div>
                        </div>
                        
                        <Separator className="my-4 bg-white/10" />
                        
                        <div className="grid grid-cols-2 gap-3 text-center">
                          <div className="p-2 rounded-lg bg-white/5">
                            <p className="text-white/60 text-xs">Avg. votes per proposal</p>
                            <p className="text-xl font-semibold text-white">
                              {Math.round(analyticsData.totalVotes / analyticsData.totalProposals)}
                            </p>
                          </div>
                          <div className="p-2 rounded-lg bg-white/5">
                            <p className="text-white/60 text-xs">Pass rate</p>
                            <p className="text-xl font-semibold text-white">73.4%</p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}

            {activeTab === "proposals" && (
              <ProposalManagement />
            )}

            {activeTab === "analytics" && (
              <div className="space-y-6">
                {/* Placeholder for the actual implementation of the StatisticsPanel component */}
              </div>
            )}

            {activeTab === "settings" && (
              <Card className="bg-black/30 border-white/20">
                <CardHeader>
                  <CardTitle className="text-xl font-medium flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Admin Settings
                  </CardTitle>
                  <CardDescription>Configure the governance protocol</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-white">Voting Duration (days)</label>
                        <input 
                          type="number" 
                          className="w-full bg-black/30 border border-white/20 rounded-md px-3 py-2 text-white"
                          placeholder="7"
                        />
                        <p className="text-xs text-white/50">Default time a proposal is open for voting</p>
                      </div>
                      
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-white">Minimum Yes Votes Required</label>
                        <input 
                          type="number" 
                          className="w-full bg-black/30 border border-white/20 rounded-md px-3 py-2 text-white"
                          placeholder="100"
                        />
                        <p className="text-xs text-white/50">Minimum votes required for a proposal to pass</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-white">Execution Delay (hours)</label>
                        <input 
                          type="number" 
                          className="w-full bg-black/30 border border-white/20 rounded-md px-3 py-2 text-white"
                          placeholder="24"
                        />
                        <p className="text-xs text-white/50">Delay between approval and execution</p>
                      </div>
                      
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-white">Grace Period (hours)</label>
                        <input 
                          type="number" 
                          className="w-full bg-black/30 border border-white/20 rounded-md px-3 py-2 text-white"
                          placeholder="12"
                        />
                        <p className="text-xs text-white/50">Additional time after voting ends</p>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-white">Emergency Mode</label>
                        <div className="relative inline-flex h-6 w-11 items-center rounded-full bg-white/10 transition-colors focus:outline-none">
                          <span className="inline-block h-5 w-5 transform rounded-full bg-white shadow-lg transition-transform" />
                        </div>
                      </div>
                      <p className="text-xs text-white/50">Enable emergency powers for admin</p>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-end space-x-2">
                  <Button variant="ghost">Reset Defaults</Button>
                  <Button className="bg-blue-600 hover:bg-blue-700">Save Settings</Button>
                </CardFooter>
              </Card>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default AdminPage; 