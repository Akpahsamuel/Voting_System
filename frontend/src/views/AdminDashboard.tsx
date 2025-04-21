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
import Navbar from '../components/Navbar';

const AdminDashboard: React.FC = () => {
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
    <div className="min-h-screen bg-black bg-grid-pattern text-white">
      <Navbar />
      <div className="container mx-auto px-4 pt-24">
        <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white/10 backdrop-blur-md border-white/20 p-6 rounded-lg">
            <h2 className="text-xl font-semibold mb-4">Create New Proposal</h2>
            <CreateProposal />
          </div>
          
          <div className="bg-white/10 backdrop-blur-md border-white/20 p-6 rounded-lg">
            <h2 className="text-xl font-semibold mb-4">Proposal Management</h2>
            <ProposalManagement />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;