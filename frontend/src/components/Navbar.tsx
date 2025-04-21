import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom"; 

const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();

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
        
        <div className="hidden md:flex items-center space-x-8 text-sm">
          <a href="#features" className="text-tech text-white/80 hover:text-white transition-colors">FEATURES</a>
          <a href="#how-it-works" className="text-tech text-white/80 hover:text-white transition-colors">HOW_IT_WORKS</a>
          <a href="#statistics" className="text-tech text-white/80 hover:text-white transition-colors">STATISTICS</a>
          <a href="#security" className="text-tech text-white/80 hover:text-white transition-colors">SECURITY</a>
        </div>
        
        <div className="flex items-center">
          <button className="text-command px-4 py-2 hover:bg-white hover:text-black transition-colors duration-300" onClick={() => navigate("/admin")}>
            Admin
          </button>
        </div>
      </div>
    </motion.nav>
  );
};

export default Navbar;
