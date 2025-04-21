import { useState } from 'react';
import { useAdminCap } from '../hooks/useAdminCap';
import SystemStats from '../components/admin/SystemStats';
import ProposalManagement from '../components/admin/ProposalManagement';
import CreateProposal from '../components/admin/CreateProposal';
import AdminPrivileges from '../components/admin/AdminPrivileges';
import { NavLink } from "react-router-dom";
import { ConnectButton } from "@mysten/dapp-kit";
import { Home, FileText, Wallet, ShieldCheck, BarChart2, Menu } from "lucide-react";
import { Button } from "../components/ui/button";

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
        <a href="/" className="mt-4 text-blue-500 hover:font-bold">Return to homepage</a>
      </div>
    );
  }
  
  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-8">
        <div>
          <nav className="fixed top-0 left-0 right-0 z-40 bg-white dark:bg-gray-900 shadow-sm transition-all duration-300">
            <div className="container mx-auto px-4">
              <div className="flex items-center justify-between h-16">
                {/* Logo */}
                <span className="font-bold text-xl bg-gradient-to-r from-blue-500 to-cyan-500 bg-clip-text text-transparent">
                  SuiVote
                </span>
                
                {/* Desktop Navigation */}
                <div className="hidden md:flex items-center space-x-1">
                  <NavLink to="/" className={({isActive}) => `px-3 py-2 rounded-md text-sm font-medium flex items-center gap-1.5 ${isActive ? "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30" : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800/60"}`}>
                    <Home size={18} /> Home
                  </NavLink>
                  <NavLink to="/proposal" className={({isActive}) => `px-3 py-2 rounded-md text-sm font-medium flex items-center gap-1.5 ${isActive ? "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30" : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800/60"}`}>
                    <FileText size={18} /> Proposals
                  </NavLink>
                  <NavLink to="/wallet" className={({isActive}) => `px-3 py-2 rounded-md text-sm font-medium flex items-center gap-1.5 ${isActive ? "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30" : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800/60"}`}>
                    <Wallet size={18} /> Wallet
                  </NavLink>
                  <NavLink to="/statistics" className={({isActive}) => `px-3 py-2 rounded-md text-sm font-medium flex items-center gap-1.5 ${isActive ? "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30" : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800/60"}`}>
                    <BarChart2 size={18} /> Statistics
                  </NavLink>
                  <NavLink to="/admin" className={({isActive}) => `px-3 py-2 rounded-md text-sm font-medium flex items-center gap-1.5 ${isActive ? "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30" : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800/60"}`}>
                    <ShieldCheck size={18} /> Admin
                  </NavLink>
                </div>
                
                {/* Connect Button and Mobile Menu */}
                <div className="flex items-center gap-2">
                  <ConnectButton />
                  <Button variant="ghost" size="icon" className="md:hidden">
                    <Menu size={20} />
                  </Button>
                </div>
              </div>
            </div>
          </nav>
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