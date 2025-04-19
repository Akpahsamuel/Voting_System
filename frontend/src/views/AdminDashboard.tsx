import { useState } from 'react';
import { useAdminCap } from '../hooks/useAdminCap';
import SystemStats from '../components/admin/SystemStats';
import ProposalManagement from '../components/admin/ProposalManagement';
import CreateProposal from '../components/admin/CreateProposal';
import AdminPrivileges from '../components/admin/AdminPrivileges';

const AdminDashboard = () => {
  const { hasAdminCap, isLoading } = useAdminCap();
  const [activeTab, setActiveTab] = useState('stats');
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <p className="text-gray-500">Verifying admin access...</p>
      </div>
    );
  }
  
  if (!hasAdminCap) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen">
        <h1 className="text-2xl font-bold text-red-500 mb-4">Access Denied</h1>
        <p className="text-gray-700 dark:text-gray-300">You need an AdminCap to access this area.</p>
        <a href="/" className="mt-4 text-blue-500 hover:underline">Return to homepage</a>
      </div>
    );
  }
  
  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-gray-500 mt-1">Manage your voting platform</p>
        </div>
        <div>
          <a 
            href="/" 
            className="text-blue-500 hover:underline flex items-center"
          >
            Back to main site
          </a>
        </div>
      </div>

      <div className="mb-8">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex">
            <button
              onClick={() => setActiveTab('stats')}
              className={`py-4 px-6 font-medium text-sm ${
                activeTab === 'stats'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 hover:border-gray-300'
              }`}
            >
              Dashboard Overview
            </button>
            <button
              onClick={() => setActiveTab('proposals')}
              className={`py-4 px-6 font-medium text-sm ${
                activeTab === 'proposals'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 hover:border-gray-300'
              }`}
            >
              Manage Proposals
            </button>
            <button
              onClick={() => setActiveTab('create')}
              className={`py-4 px-6 font-medium text-sm ${
                activeTab === 'create'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 hover:border-gray-300'
              }`}
            >
              Create Proposal
            </button>
            <button
              onClick={() => setActiveTab('admin')}
              className={`py-4 px-6 font-medium text-sm ${
                activeTab === 'admin'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 hover:border-gray-300'
              }`}
            >
              Admin Privileges
            </button>
          </nav>
        </div>
      </div>

      <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-md shadow-sm">
        {activeTab === 'stats' && <SystemStats />}
        {activeTab === 'proposals' && <ProposalManagement />}
        {activeTab === 'create' && <CreateProposal />}
        {activeTab === 'admin' && <AdminPrivileges />}
      </div>
    </div>
  );
};

export default AdminDashboard;