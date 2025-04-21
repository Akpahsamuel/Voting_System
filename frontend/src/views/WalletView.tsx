import { WalletStatus } from "../components/wallet/Status";
import { NavLink } from "react-router-dom";
import { ConnectButton } from "@mysten/dapp-kit";
import { Home, FileText, Wallet, ShieldCheck, BarChart2, Menu } from "lucide-react";
import { Button } from "../components/ui/button";


const WalletView = () => {
    return (
      <>
        <div className="mb-8">
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
          <WalletStatus />
        </div>
      </>
    )
};

export default WalletView;