import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { NavLink, useNavigate } from "react-router-dom"; 
import { Home, FileText, ShieldCheck, BarChart2, Menu, X, Vote, Globe } from "lucide-react";
import { ConnectButton } from "@mysten/dapp-kit";
import { useAdminCap } from "../hooks/useAdminCap";
import { useSuperAdminCap } from "../hooks/useSuperAdminCap";
import { cn } from "../lib/utils";
import NetworkToggle from "./ui/NetworkToggle";

const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const navigate = useNavigate();
  const { hasAdminCap } = useAdminCap();
  const { hasSuperAdminCap } = useSuperAdminCap();
  const hasAdminAccess = hasAdminCap || hasSuperAdminCap;

  // Handle body scroll locking in a more reliable way
  useEffect(() => {
    // Only apply if we're in a browser environment
    if (typeof window === 'undefined') return;
    
    if (isMobileMenuOpen) {
      // Store current scroll position
      const scrollY = window.scrollY;
      // Apply fixed positioning instead of just overflow hidden
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
    } else {
      // Restore scroll position when menu is closed
      const scrollY = document.body.style.top;
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      if (scrollY) {
        window.scrollTo(0, parseInt(scrollY || '0') * -1);
      }
    }
    
    return () => {
      // Cleanup on unmount
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
    };
  }, [isMobileMenuOpen]);

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

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isMobileMenuOpen && 
        mobileMenuRef.current && 
        !mobileMenuRef.current.contains(event.target as Node) &&
        menuButtonRef.current && 
        !menuButtonRef.current.contains(event.target as Node)
      ) {
        setIsMobileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMobileMenuOpen]);

  const toggleMobileMenu = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent event bubbling
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const navLinks = [
    { to: "/", icon: Home, label: "Home" },
    { to: "/proposal", icon: FileText, label: "Proposals" },
    { to: "/ballots", icon: Vote, label: "Ballot System" },
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
        scrolled ? "bg-black/80 backdrop-blur-md py-3" : "bg-transparent py-3 sm:py-5"
      }`}
    >
      <div className="container mx-auto px-4 md:px-6 flex items-center justify-between">
        {/* Logo and Brand */}
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
        
        {/* Right-side Controls */}
        <div className="flex items-center">
          {/* Network Toggle (Hidden on very small screens) */}
          <div className="hidden xs:block mr-2">
            <div className="hidden sm:block">
              <NetworkToggle />
            </div>
            <div className="xs:block sm:hidden">
              <NetworkToggle compact />
            </div>
          </div>
          
          {/* Connect Button (Simplified on very small screens) */}
          <div className="overflow-hidden shrink-0">
            <ConnectButton className="transition-transform hover:scale-105 duration-300" />
          </div>
          
          {/* Mobile Menu Button */}
          <button 
            ref={menuButtonRef}
            className="ml-1 md:hidden p-2 text-white hover:text-blue-300 hover:bg-white/10 rounded-md transition-colors duration-300"
            onClick={toggleMobileMenu}
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div 
            ref={mobileMenuRef}
            className="md:hidden fixed inset-0 bg-black/95 z-40 pt-16 overflow-y-auto"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex flex-col items-center space-y-4 px-4 py-6 min-h-[calc(100vh-4rem)]">
              {/* Mobile Navigation Links */}
              <div className="w-full max-w-md">
                {navLinks.map(link => (
                  <NavLink 
                    key={link.to}
                    to={link.to} 
                    className={({isActive}) => cn(
                      "px-4 py-4 rounded-md text-base font-medium flex items-center gap-3 w-full relative group mb-2",
                      "transition-all duration-300",
                      isActive 
                        ? "text-white bg-white/20" 
                        : "text-white/80 hover:text-white hover:bg-white/10"
                    )}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <link.icon size={20} className="text-white/90" />
                    <span>{link.label}</span>
                  </NavLink>
                ))}
              </div>
              
              {/* Network Selection for Mobile */}
              <div className="w-full max-w-md pt-6">
                <div className="w-full bg-black/40 rounded-lg p-4 backdrop-blur-sm">
                  <div className="flex flex-col space-y-3">
                    <div className="flex items-center">
                      <Globe size={16} className="text-white/80 mr-2" />
                      <span className="text-white text-base font-medium">Network</span>
                    </div>
                    <NetworkToggle className="w-full" />
                  </div>
                </div>
              </div>
              
              {/* Quick Ballot Actions for Mobile */}
              {hasAdminAccess && (
                <div className="w-full max-w-md mt-4 pt-6 border-t border-white/10">
                  <button 
                    className="flex items-center gap-3 px-4 py-4 rounded-md text-base font-medium justify-center w-full bg-gradient-to-r from-blue-600/30 to-purple-600/30 text-white/90 hover:text-white active:from-blue-700/40 active:to-purple-700/40"
                    onClick={() => {
                      navigate("/ballots/create");
                      setIsMobileMenuOpen(false);
                    }}
                  >
                    <Vote size={20} />
                    <span>Create Ballot</span>
                  </button>
                </div>
              )}
              
              {/* Connect Button for very small screens */}
              <div className="xs:hidden w-full max-w-md mt-4 pt-6">
                <div className="flex flex-col space-y-3">
                  <span className="text-white text-base font-medium">Connect Wallet</span>
                  <div className="flex justify-center">
                    <ConnectButton />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
};

export default Navbar;
