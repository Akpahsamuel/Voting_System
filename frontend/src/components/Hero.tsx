import { motion } from "framer-motion";
import { ArrowDown} from "lucide-react";
import { useNavigate } from "react-router-dom"; 
import { ConnectButton } from "@mysten/dapp-kit";
import { cn } from "../lib/utils";

// Animation floating node component
const Node = ({ delay = 0, x = 0, y = 0, size = 20 }) => (
  <motion.div
    className="absolute bg-gradient-sui rounded-full glow"
    style={{ 
      width: size, 
      height: size, 
      left: `calc(50% + ${x}px)`, 
      top: `calc(50% + ${y}px)` 
    }}
    initial={{ opacity: 0, scale: 0 }}
    animate={{ 
      opacity: [0.5, 0.8, 0.5],
      scale: [1, 1.1, 1],
      y: [0, -15, 0]
    }}
    transition={{ 
      duration: 3, 
      delay: delay, 
      repeat: Infinity,
      repeatType: "reverse"
    }}
  />
);

// Connection line component
const ConnectionLine = ({ startNode, endNode, delay = 0 }: { startNode: { x: number; y: number }; endNode: { x: number; y: number }; delay?: number }) => (
  <motion.div
    className="absolute bg-gradient-to-r from-[#0096FF]/30 to-[#7B61FF]/30 h-[1px]"
    style={{
      left: `calc(50% + ${startNode.x}px)`,
      top: `calc(50% + ${startNode.y}px)`,
      width: `${Math.sqrt(Math.pow(endNode.x - startNode.x, 2) + Math.pow(endNode.y - startNode.y, 2))}px`,
      transformOrigin: "left center",
      transform: `rotate(${Math.atan2(endNode.y - startNode.y, endNode.x - startNode.x) * (180 / Math.PI)}deg)`
    }}
    initial={{ opacity: 0 }}
    animate={{ opacity: [0, 0.8, 0] }}
    transition={{ duration: 3, delay: delay, repeat: Infinity }}
  />
);

const nodes = [
  { x: -100, y: -80, size: 16, delay: 0 },
  { x: 120, y: -120, size: 24, delay: 0.5 },
  { x: 80, y: 100, size: 20, delay: 1 },
  { x: -150, y: 50, size: 18, delay: 1.5 },
  { x: 0, y: 150, size: 22, delay: 2 },
  { x: -80, y: -180, size: 16, delay: 2.5 }
];

const connections = [
  { start: 0, end: 1, delay: 0.2 },
  { start: 1, end: 2, delay: 0.7 },
  { start: 2, end: 3, delay: 1.2 },
  { start: 3, end: 0, delay: 1.7 },
  { start: 4, end: 2, delay: 2.2 },
  { start: 0, end: 5, delay: 2.7 },
];

// Custom styled version of the ConnectButton
const StyledConnectButton = () => {
  return (
    <div className="connect-wallet-container relative group overflow-hidden">
      <ConnectButton 
        className={cn(
          "text-command hover:bg-white hover:text-black transition-all duration-300 px-6 py-3",
          "bg-gradient-sui text-white border-none font-mono relative z-10",
          "min-h-[48px] flex items-center justify-center w-full",
          "hover:shadow-[0_0_15px_rgba(80,100,255,0.5)] hover:scale-[1.02]"
        )} 
      />
      
      {/* Glow effect on hover */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-white/10 blur-xl"></div>
      
      {/* Pulse animation on hover */}
      <div className="absolute -inset-0.5 rounded bg-gradient-to-r from-blue-500 to-purple-500 opacity-0 group-hover:opacity-30 group-hover:animate-pulse transition-opacity duration-300 blur"></div>
    </div>
  );
};

const Hero = () => {
  const navigate = useNavigate();

  return (
    <section className="min-h-screen flex flex-col justify-center items-center relative overflow-hidden pt-16 bg-black">
      {/* Background pattern */}
      <div className="absolute inset-0 bg-grid-pattern opacity-20 z-0"></div>
      
      <div className="container mx-auto px-4 pt-20 pb-20 relative z-10">
        <div className="relative text-center max-w-3xl mx-auto mb-8">
          {/* Overlay for readability */}
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm rounded-xl z-0"></div>
          <div className="relative z-10">
            <motion.h1 
              className="text-title-large mb-6 drop-shadow-lg"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <span className="text-white">Decentralized</span>
              <br />
              <span className="text-gradient">Voting</span>
            </motion.h1>
            
            <motion.p 
              className="font-mono text-lg md:text-xl text-white/90 mb-10 uppercase tracking-wider drop-shadow"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              Secure, transparent, and immutable voting system
            </motion.p>
            
            <motion.div 
              className="flex flex-col sm:flex-row gap-4 justify-center mb-12"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              <StyledConnectButton />
              
              <button className="text-command bg-transparent border border-white/30 hover:border-white hover:bg-white/10 hover:text-white transition-all duration-300 px-6 py-3 relative group overflow-hidden hover:shadow-[0_0_15px_rgba(255,255,255,0.3)] hover:scale-[1.02]">
                <span className="relative z-10">LEARN_MORE</span>
                
                {/* Glow effect on hover */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-30 transition-opacity duration-300 bg-gradient-radial from-white/20 to-transparent"></div>
                
                {/* Animated border */}
                <div className="absolute -inset-px rounded bg-gradient-to-r from-blue-500/40 to-purple-500/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </button>
            </motion.div>
          </div>
        </div>
        
        {/* Animated blockchain visualization */}
        <motion.div 
          className="relative h-[300px] md:h-[400px] w-full max-w-2xl mx-auto mt-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.6 }}
        >
          {/* Nodes */}
          {nodes.map((node, index) => (
            <Node 
              key={`node-${index}`} 
              x={node.x} 
              y={node.y} 
              size={node.size} 
              delay={node.delay}
            />
          ))}
          
          {/* Connections */}
          {connections.map((conn, index) => (
            <ConnectionLine 
              key={`connection-${index}`} 
              startNode={nodes[conn.start]} 
              endNode={nodes[conn.end]}
              delay={conn.delay}
            />
          ))}
          
          {/* Central Node */}
          <motion.div 
            className="absolute left-1/2 top-1/2 w-16 h-16 -ml-8 -mt-8 bg-gradient-sui rounded-full flex items-center justify-center shadow-lg glow"
            animate={{ 
              scale: [1, 1.1, 1],
              boxShadow: [
                "0 0 10px 2px rgba(101, 85, 255, 0.3)",
                "0 0 20px 6px rgba(101, 85, 255, 0.6)",
                "0 0 10px 2px rgba(101, 85, 255, 0.3)"
              ]
            }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            <div className="w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center text-primary font-bold text-xs">
              SUI
            </div>
          </motion.div>
        </motion.div>
        
        <motion.div 
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 2, duration: 0.5 }}
        >
          <a 
            href="#features" 
            className="text-white/50 hover:text-white flex flex-col items-center font-mono uppercase tracking-wider"
          >
            <span className="text-sm mb-2">Discover_More</span>
            <motion.div
              animate={{ y: [0, 5, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <ArrowDown size={20} />
            </motion.div>
          </a>
        </motion.div>
      </div>
      
      {/* 3D Floating Image similar to foreverbots.io */}
      <motion.div
        className="absolute right-0 top-1/2 -translate-y-1/2 w-1/3 hidden lg:block"
        initial={{ opacity: 0, x: 100 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 1 }}
      >
        <img
          src="/sv.jpg"
          alt="Blockchain Voting"
          className="w-full h-auto rounded-lg shadow-2xl"
        />
      </motion.div>
      
      {/* Repeated text marquee like in Foreverbots */}
      <div className="absolute bottom-0 w-full overflow-hidden py-4 bg-black">
        <div className="text-repeated-marquee animate-flow">
          SECURE VOTING X BLOCKCHAIN VERIFIED X SUI POWERED X SECURE VOTING X BLOCKCHAIN VERIFIED X SUI POWERED X
          SECURE VOTING X BLOCKCHAIN VERIFIED X SUI POWERED X SECURE VOTING X BLOCKCHAIN VERIFIED X SUI POWERED X
        </div>
      </div>
    </section>
  );
};

export default Hero;
