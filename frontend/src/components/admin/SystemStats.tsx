import { useSuiClientQuery } from "@mysten/dapp-kit";
import { useNetworkVariable } from "../../config/networkConfig";
import { SuiObjectData, SuiObjectResponse } from "@mysten/sui/client";
import { useState, useEffect } from "react";
import {
  Chart as ChartJS,
  ArcElement,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Pie, Line, Bar } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(
  ArcElement,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface ProposalData {
  id: string;
  title: string;
  votedYesCount: number;
  votedNoCount: number;
  expiration: number;
  status: string;
}

const SystemStats = () => {
  const dashboardId = useNetworkVariable("dashboardId");
  const packageId = useNetworkVariable("packageId");
  const [proposals, setProposals] = useState<ProposalData[]>([]);
  const [selectedView, setSelectedView] = useState<'overview' | 'detailed'>('overview');
  
  // Fetch dashboard data to get proposal IDs
  const { data: dashboardData, isPending: dashboardPending, error: dashboardError } = useSuiClientQuery(
    "getObject",
    {
      id: dashboardId,
      options: {
        showContent: true,
      },
    }
  );

  // Fetch all proposals
  const { data: proposalsData, isPending: proposalsPending } = useSuiClientQuery(
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
    if (!proposalsData || !Array.isArray(proposalsData)) return;
    
    const parsedProposals = proposalsData
      .map((item: SuiObjectResponse) => {
        if (!item.data) return null;
        const obj = item.data as SuiObjectData;
        if (obj.content?.dataType !== "moveObject") return null;
        
        const fields = obj.content.fields as any;
        return {
          id: obj.objectId,
          title: fields.title,
          votedYesCount: Number(fields.voted_yes_count),
          votedNoCount: Number(fields.voted_no_count),
          expiration: Number(fields.expiration),
          status: fields.status.variant
        };
      })
      .filter(Boolean) as ProposalData[];
    
    setProposals(parsedProposals);
  }, [proposalsData]);
  
  function getProposalIds() {
    if (!dashboardData?.data) return [];
    const dashboardObj = dashboardData.data as SuiObjectData;
    if (dashboardObj.content?.dataType !== "moveObject") return [];
    return (dashboardObj.content.fields as any)?.proposals_ids || [];
  }

  if (dashboardPending || proposalsPending) return <div className="text-center">Loading statistics...</div>;
  if (dashboardError) return <div className="text-red-500">Error: {dashboardError.message}</div>;
  
  const dashboardObj = dashboardData?.data as SuiObjectData;
  const proposalsCount = dashboardObj?.content?.dataType === "moveObject" 
    ? (dashboardObj.content.fields as any)?.proposals_ids?.length || 0
    : 0;
  
  // Calculate statistics
  const activeProposals = proposals.filter(p => p.status === 'Active').length;
  const delistedProposals = proposals.filter(p => p.status === 'Delisted').length;
  
  const totalVotesYes = proposals.reduce((sum, p) => sum + p.votedYesCount, 0);
  const totalVotesNo = proposals.reduce((sum, p) => sum + p.votedNoCount, 0);
  const totalVotes = totalVotesYes + totalVotesNo;
  
  // Current date to check for expired proposals
  const now = new Date().getTime();
  const expiredProposals = proposals.filter(p => p.expiration < now).length;
  const activeAndNotExpired = proposals.filter(p => p.status === 'Active' && p.expiration >= now).length;
  
  // Chart data
  const statusChartData = {
    labels: ['Active', 'Delisted'],
    datasets: [
      {
        label: 'Proposal Status',
        data: [activeProposals, delistedProposals],
        backgroundColor: [
          'rgba(75, 192, 192, 0.5)',
          'rgba(255, 99, 132, 0.5)',
        ],
        borderColor: [
          'rgba(75, 192, 192, 1)',
          'rgba(255, 99, 132, 1)',
        ],
        borderWidth: 1,
      },
    ],
  };
  
  const voteDistributionData = {
    labels: ['Yes Votes', 'No Votes'],
    datasets: [
      {
        label: 'Vote Distribution',
        data: [totalVotesYes, totalVotesNo],
        backgroundColor: [
          'rgba(54, 162, 235, 0.5)',
          'rgba(255, 159, 64, 0.5)',
        ],
        borderColor: [
          'rgba(54, 162, 235, 1)',
          'rgba(255, 159, 64, 1)',
        ],
        borderWidth: 1,
      },
    ],
  };
  
  // Top proposals by votes (get top 5)
  const topProposalsByVotes = [...proposals]
    .sort((a, b) => (b.votedYesCount + b.votedNoCount) - (a.votedYesCount + a.votedNoCount))
    .slice(0, 5);
  
  const topProposalsData = {
    labels: topProposalsByVotes.map(p => p.title.length > 15 ? p.title.substring(0, 15) + '...' : p.title),
    datasets: [
      {
        label: 'Yes Votes',
        data: topProposalsByVotes.map(p => p.votedYesCount),
        backgroundColor: 'rgba(75, 192, 192, 0.5)',
        borderColor: 'rgba(75, 192, 192, 1)',
        borderWidth: 1,
      },
      {
        label: 'No Votes',
        data: topProposalsByVotes.map(p => p.votedNoCount),
        backgroundColor: 'rgba(255, 99, 132, 0.5)',
        borderColor: 'rgba(255, 99, 132, 1)',
        borderWidth: 1,
      },
    ],
  };
  
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold">System Overview</h2>
        <div className="flex space-x-2">
          <button 
            onClick={() => setSelectedView('overview')}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              selectedView === 'overview' 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            Overview
          </button>
          <button 
            onClick={() => setSelectedView('detailed')}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              selectedView === 'detailed' 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            Detailed Stats
          </button>
        </div>
      </div>
      
      {selectedView === 'overview' ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-gray-700 p-4 rounded-lg shadow-sm">
            <h3 className="text-lg font-medium text-gray-500 dark:text-gray-300 mb-2">Total Proposals</h3>
            <p className="text-3xl font-bold">{proposalsCount}</p>
          </div>
          
          <div className="bg-white dark:bg-gray-700 p-4 rounded-lg shadow-sm">
            <h3 className="text-lg font-medium text-gray-500 dark:text-gray-300 mb-2">Network</h3>
            <p className="text-3xl font-bold capitalize">
              {import.meta.env.MODE === 'development' ? 'Devnet' : 'Mainnet'}
            </p>
          </div>
          
          <div className="bg-white dark:bg-gray-700 p-4 rounded-lg shadow-sm">
            <h3 className="text-lg font-medium text-gray-500 dark:text-gray-300 mb-2">Admin Status</h3>
            <p className="text-3xl font-bold text-green-500">Active</p>
          </div>

          <div className="bg-white dark:bg-gray-700 p-4 rounded-lg shadow-sm">
            <h3 className="text-lg font-medium text-gray-500 dark:text-gray-300 mb-2">Active Proposals</h3>
            <p className="text-3xl font-bold text-blue-500">{activeProposals}</p>
          </div>
          
          <div className="bg-white dark:bg-gray-700 p-4 rounded-lg shadow-sm">
            <h3 className="text-lg font-medium text-gray-500 dark:text-gray-300 mb-2">Delisted Proposals</h3>
            <p className="text-3xl font-bold text-red-500">{delistedProposals}</p>
          </div>
          
          <div className="bg-white dark:bg-gray-700 p-4 rounded-lg shadow-sm">
            <h3 className="text-lg font-medium text-gray-500 dark:text-gray-300 mb-2">Total Votes</h3>
            <p className="text-3xl font-bold">{totalVotes}</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-gray-700 p-4 rounded-lg shadow-sm">
            <h3 className="text-lg font-medium text-gray-500 dark:text-gray-300 mb-2">Proposal Status</h3>
            <div className="h-64 flex items-center justify-center">
              <Pie data={statusChartData} options={{ maintainAspectRatio: false }} />
            </div>
            <div className="grid grid-cols-2 gap-2 mt-4">
              <div className="text-center">
                <p className="text-sm text-gray-500 dark:text-gray-400">Active</p>
                <p className="text-xl font-semibold text-green-500">{activeProposals}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-500 dark:text-gray-400">Delisted</p>
                <p className="text-xl font-semibold text-red-500">{delistedProposals}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-700 p-4 rounded-lg shadow-sm">
            <h3 className="text-lg font-medium text-gray-500 dark:text-gray-300 mb-2">Vote Distribution</h3>
            <div className="h-64 flex items-center justify-center">
              <Pie data={voteDistributionData} options={{ maintainAspectRatio: false }} />
            </div>
            <div className="grid grid-cols-2 gap-2 mt-4">
              <div className="text-center">
                <p className="text-sm text-gray-500 dark:text-gray-400">Yes Votes</p>
                <p className="text-xl font-semibold text-blue-500">{totalVotesYes}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-500 dark:text-gray-400">No Votes</p>
                <p className="text-xl font-semibold text-orange-500">{totalVotesNo}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-700 p-4 rounded-lg shadow-sm md:col-span-2">
            <h3 className="text-lg font-medium text-gray-500 dark:text-gray-300 mb-2">Top Proposals by Votes</h3>
            <div className="h-64">
              <Bar 
                data={topProposalsData} 
                options={{ 
                  maintainAspectRatio: false,
                  scales: {
                    y: {
                      beginAtZero: true,
                      grid: {
                        color: 'rgba(200, 200, 200, 0.2)',
                      }
                    },
                    x: {
                      grid: {
                        display: false
                      }
                    }
                  }
                }} 
              />
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-700 p-4 rounded-lg shadow-sm">
            <h3 className="text-lg font-medium text-gray-500 dark:text-gray-300 mb-2">Proposal Expiration Status</h3>
            <div className="h-32 flex items-center justify-center">
              <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-4 mt-4">
                <div 
                  className="bg-blue-500 rounded-full h-4" 
                  style={{ width: `${(activeAndNotExpired / proposalsCount) * 100}%` }}
                ></div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-4">
              <div className="text-center">
                <p className="text-sm text-gray-500 dark:text-gray-400">Active & Valid</p>
                <p className="text-xl font-semibold text-blue-500">{activeAndNotExpired}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-500 dark:text-gray-400">Expired</p>
                <p className="text-xl font-semibold text-red-500">{expiredProposals}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-700 p-4 rounded-lg shadow-sm">
            <h3 className="text-lg font-medium text-gray-500 dark:text-gray-300 mb-2">System Health</h3>
            <div className="flex flex-col space-y-4 mt-4">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Package ID</span>
                  <span className="text-sm font-medium text-green-500">Active</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                  <div className="bg-green-500 h-2 rounded-full" style={{ width: "100%" }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Dashboard</span>
                  <span className="text-sm font-medium text-green-500">Healthy</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                  <div className="bg-green-500 h-2 rounded-full" style={{ width: "100%" }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Network</span>
                  <span className="text-sm font-medium text-green-500">Connected</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                  <div className="bg-green-500 h-2 rounded-full" style={{ width: "100%" }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SystemStats; 