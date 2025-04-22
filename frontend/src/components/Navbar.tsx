import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { NavLink, useNavigate } from "react-router-dom"; 
import { Home, FileText, Wallet, ShieldCheck, BarChart2, Menu, X } from "lucide-react";
import { ConnectButton } from "@mysten/dapp-kit";
import { useAdminCap } from "../hooks/useAdminCap";

const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const { hasAdminCap } = useAdminCap();

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
    { to: "/wallet", icon: Wallet, label: "Wallet" },
    { to: "/statistics", icon: BarChart2, label: "Statistics" },
    // Admin link will be conditionally added below
  ];

  // Only add admin link if user has admin privileges
  if (hasAdminCap) {
    navLinks.push({ to: "/admin", icon: ShieldCheck, label: "Admin" });
  }

  const renderNavLink = (link: { to: string, icon: any, label: string }) => (
    <NavLink 
      key={link.to}
      to={link.to} 
      className={({isActive}) => `
        px-3 py-2 rounded-md text-sm font-medium flex items-center gap-1.5 
        ${isActive 
          ? "text-white bg-white/20" 
          : "text-white/80 hover:text-white hover:bg-white/10"
        }
      `}
    >
      <link.icon size={18} /> {link.label}
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
        <div className="hidden md:flex items-center space-x-8 text-sm">
          {navLinks.map(renderNavLink)}
        </div>
        
        {/* Mobile Menu Toggle */}
        <div className="flex items-center space-x-2">
          <ConnectButton />
          <button 
            className="md:hidden text-white"
            onClick={toggleMobileMenu}
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 bg-black/90 z-40 pt-20">
          <div className="flex flex-col items-center space-y-6">
            {navLinks.map(link => (
              <NavLink 
                key={link.to}
                to={link.to} 
                className={({isActive}) => `
                  px-6 py-3 rounded-md text-lg font-medium flex items-center gap-3 
                  ${isActive 
                    ? "text-white bg-white/20" 
                    : "text-white/80 hover:text-white hover:bg-white/10"
                  }
                `}
                onClick={toggleMobileMenu}
              >
                <link.icon size={24} /> {link.label}
              </NavLink>
            ))}
          </div>
        </div>
      )}
    </motion.nav>
  );
};

export default Navbar;
