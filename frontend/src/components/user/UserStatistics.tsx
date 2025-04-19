import { useSuiClientQuery } from "@mysten/dapp-kit";
import { useCurrentAccount } from "@mysten/dapp-kit";
import { SuiObjectData, SuiObjectResponse } from "@mysten/sui/client";
import { useEffect, useState } from "react";
import { VoteNft } from "../../types";
import {
  Chart as ChartJS,
  ArcElement,
  CategoryScale,
  LinearScale,
  PointElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(
  ArcElement,
  CategoryScale,
  LinearScale,
  PointElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface UserStatisticsProps {
  proposalIds: string[];
  userVoteNfts: VoteNft[];
}

interface ProposalData {
  id: string;
  title: string;
  votedYesCount: number;
  votedNoCount: number;
  expiration: number;
  status: string;
}

const UserStatistics: React.FC<UserStatisticsProps> = ({ proposalIds, userVoteNfts }) => {
  const [proposals, setProposals] = useState<ProposalData[]>([]);
  const account = useCurrentAccount();
  
  // Fetch all proposals
  const { data: proposalsData } = useSuiClientQuery(
    "multiGetObjects",
    {
      ids: proposalIds,
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
  
  // Calculate statistics
  const totalProposals = proposals.length;
  const activeProposals = proposals.filter(p => p.status === 'Active').length;
  
  const totalVotesYes = proposals.reduce((sum, p) => sum + p.votedYesCount, 0);
  const totalVotesNo = proposals.reduce((sum, p) => sum + p.votedNoCount, 0);
  const totalVotes = totalVotesYes + totalVotesNo;
  
  // User participation
  const userVotedCount = userVoteNfts.length;
  const userParticipationRate = totalProposals > 0 ? (userVotedCount / totalProposals) * 100 : 0;
  
  // Current date to check for expired proposals
  const now = new Date().getTime();
  const expiredProposals = proposals.filter(p => p.expiration < now).length;
  const activeAndNotExpired = proposals.filter(p => p.status === 'Active' && p.expiration >= now).length;
  
  // Vote distribution data
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
  
  // Top proposals by votes 
  const topProposalsByVotes = [...proposals]
    .sort((a, b) => (b.votedYesCount + b.votedNoCount) - (a.votedYesCount + a.votedNoCount))
    .slice(0, 3);
  
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
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* User Stats */}
        <div className="md:col-span-3 flex flex-col justify-center">
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Your Participation</h3>
          <div className="flex flex-col space-y-4">
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Proposals Voted</span>
                <span className="text-sm font-medium text-blue-500">{userVotedCount} of {totalProposals}</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2.5">
                <div 
                  className="bg-blue-500 h-2.5 rounded-full" 
                  style={{ width: `${userParticipationRate}%` }}
                ></div>
              </div>
            </div>
            
            <div className="flex items-center justify-center mt-2">
              <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3 text-center w-full">
                <p className="text-sm text-gray-500 dark:text-gray-400">Active Proposals</p>
                <p className="text-xl font-bold text-blue-500">{activeAndNotExpired} / {totalProposals}</p>
              </div>
            </div>
            
            <div className="flex items-center justify-center">
              <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3 text-center w-full">
                <p className="text-sm text-gray-500 dark:text-gray-400">Your Status</p>
                <p className="text-xl font-bold text-green-500">
                  {account ? (userVotedCount > 0 ? 'Active Voter' : 'Not Voted') : 'Not Connected'}
                </p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Vote Distribution */}
        <div className="md:col-span-3">
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Vote Distribution</h3>
          <div className="h-48 md:h-56 flex items-center justify-center">
            <Pie data={voteDistributionData} options={{ maintainAspectRatio: false }} />
          </div>
          <div className="grid grid-cols-2 gap-2 mt-2">
            <div className="text-center">
              <p className="text-xs text-gray-500 dark:text-gray-400">Yes</p>
              <p className="text-blue-500 font-bold">{totalVotesYes}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-500 dark:text-gray-400">No</p>
              <p className="text-orange-500 font-bold">{totalVotesNo}</p>
            </div>
          </div>
        </div>
        
        {/* Top Voted Proposals */}
        <div className="md:col-span-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Popular Proposals</h3>
          <div className="h-48 md:h-56">
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
      </div>
      
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Total Proposals</p>
            <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{totalProposals}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Active Proposals</p>
            <p className="text-xl font-bold text-blue-500">{activeProposals}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Total Votes</p>
            <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{totalVotes}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Community Participation</p>
            <p className="text-xl font-bold text-green-500">
              {totalVotes > 0 ? ((totalVotes / totalProposals).toFixed(1)) : '0'} votes/proposal
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserStatistics; 