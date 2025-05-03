import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { NavLink, useNavigate } from "react-router-dom"; 
import { Home, FileText, ShieldCheck, BarChart2, Menu, X, Vote } from "lucide-react";
import { ConnectButton } from "@mysten/dapp-kit";
import { useAdminCap } from "../hooks/useAdminCap";
import { useSuperAdminCap } from "../hooks/useSuperAdminCap";
import { cn } from "../lib/utils";

const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const { hasAdminCap } = useAdminCap();
  const { hasSuperAdminCap } = useSuperAdminCap();
  const hasAdminAccess = hasAdminCap || hasSuperAdminCap;

  useEffect(() => {
    const handleScroll = () => {
      const isScrolled = window.scrollY > 10;
      if (isScrolled !== scrolled) {
        setScrolled(isScrolled);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [scrolled]);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const navLinks = [
    { to: "/", icon: Home, label: "Home" },
    { to: "/proposal", icon: FileText, label: "Proposals" },
    { to: "/ballot", icon: Vote, label: "Ballots" },
    { to: "/statistics", icon: BarChart2, label: "Statistics" },
    // Admin link will be conditionally added below
  ];

  // Show admin link if user has either AdminCap OR SuperAdminCap
  if (hasAdminAccess) {
    navLinks.push({ to: "/admin", icon: ShieldCheck, label: "Admin" });
  }

  const renderNavLink = (link: { to: string, icon: any, label: string }) => (
    <NavLink 
      key={link.to}
      to={link.to} 
      className={({isActive}) => cn(
        "px-3 py-2 rounded-md text-sm font-medium flex items-center gap-1.5 relative group",
        "transition-all duration-300 overflow-hidden",
        isActive 
          ? "text-white bg-white/20" 
          : "text-white/80 hover:text-white hover:bg-gradient-to-r hover:from-blue-500/20 hover:to-purple-500/20"
      )}
    >
      <span className="z-10 relative">
        <link.icon size={18} className="transition-transform group-hover:scale-110 duration-300" />
      </span>
      <span className="z-10 relative">{link.label}</span>
      
      {/* Hover effect - glow and underline */}
      <motion.span 
        className="absolute bottom-0 left-0 h-[2px] bg-gradient-sui w-0 group-hover:w-full transition-all duration-300"
        layoutId={`underline-${link.label}`}
      />
      
      {/* Background glow effect */}
      <span className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-radial from-blue-500/5 to-transparent" />
    </NavLink>
  );

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5 }}
      className={`fixed w-full z-50 transition-all duration-300 ${
        scrolled ? "bg-black/80 backdrop-blur-md py-3" : "bg-transparent py-5"
      }`}
    >
      <div className="container mx-auto px-4 md:px-6 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <motion.div 
            className="w-8 h-8 rounded-full bg-gradient-sui flex items-center justify-center"
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          >
            <div className="w-3 h-3 bg-white rounded-full" />
          </motion.div>
          <span className="text-tech text-xl font-bold text-white">SuiVote</span>
        </div>
        
        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center space-x-4 text-sm">
          {navLinks.map(renderNavLink)}
        </div>
        
        {/* Mobile Menu Toggle */}
        <div className="flex items-center space-x-2">
          <ConnectButton className="transition-transform hover:scale-105 duration-300" />
          <button 
            className="md:hidden text-white hover:text-blue-300 transition-colors duration-300"
            onClick={toggleMobileMenu}
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <motion.div 
          className="md:hidden fixed inset-0 bg-black/95 z-40 pt-20"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex flex-col items-center space-y-6">
            {navLinks.map(link => (
              <NavLink 
                key={link.to}
                to={link.to} 
                className={({isActive}) => cn(
                  "px-6 py-3 rounded-md text-lg font-medium flex items-center gap-3 w-4/5 justify-center relative group",
                  "transition-all duration-300",
                  isActive 
                    ? "text-white bg-white/20" 
                    : "text-white/80 hover:text-white hover:bg-gradient-to-r hover:from-blue-500/20 hover:to-purple-500/20"
                )}
                onClick={toggleMobileMenu}
              >
                <link.icon size={24} className="transition-transform group-hover:scale-110 duration-300" />
                <span>{link.label}</span>
                
                {/* Mobile hover effect */}
                <motion.span 
                  className="absolute bottom-0 left-1/4 right-1/4 h-[2px] bg-gradient-sui w-0 group-hover:w-1/2 transition-all duration-300"
                />
              </NavLink>
            ))}
          </div>
        </motion.div>
      )}
    </motion.nav>
  );
};

export default Navbar;
