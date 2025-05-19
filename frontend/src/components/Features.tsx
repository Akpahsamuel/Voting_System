import { useState } from "react";
import { motion } from "framer-motion";
import { Shield, Eye, UserCheck, BarChart3 } from "lucide-react";
import { FeatureCardProps } from "../types";

const FeatureCard = ({ icon: Icon, title, description, delay }: FeatureCardProps) => {
  const [hovered, setHovered] = useState(false);
  
  return (
    <motion.div
      className="p-6 rounded-xl bg-black border border-white/10 feature-card-hover"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      viewport={{ once: true, margin: "-50px" }}
    >
      <div className="h-12 w-12 rounded-lg bg-gradient-sui flex items-center justify-center mb-5">
        <Icon size={24} className="text-white" />
      </div>
      
      <h3 className="text-tech text-white mb-3 sm:ml-[-1.3vw] ml-[-4vw]">
        {title}
      </h3>
      
      <p className="font-mono text-sm text-white/70 tracking-wide">
        {description}
      </p>
    </motion.div>
  );
};

const Features = () => {
  const features: FeatureCardProps[] = [
    {
      icon: Shield,
      title: "UNCOMPROMISING_SECURITY",
      description: "BUILT ON SUI BLOCKCHAIN WITH ADVANCED CRYPTOGRAPHIC PROTECTION",
      delay: 0.1,
    },
    {
      icon: Eye,
      title: "COMPLETE_TRANSPARENCY",
      description: "EVERY VOTE IS RECORDED ON THE BLOCKCHAIN, PUBLICLY VERIFIABLE",
      delay: 0.2,
    },
    {
      icon: UserCheck,
      title: "EASY_TO_USE",
      description: "SIMPLE INTERFACE FOR VOTERS, POWERFUL TOOLS FOR ADMINISTRATORS",
      delay: 0.3,
    },
    {
      icon: BarChart3,
      title: "INSTANT_RESULTS",
      description: "VIEW VOTING RESULTS IN REAL-TIME AS THEY'RE RECORDED ON THE BLOCKCHAIN",
      delay: 0.4,
    },
  ];

  return (
    <section id="features" className="py-20 relative bg-black">
      <div className="absolute inset-0 bg-grid-pattern opacity-10 z-0"></div>
      
      <div className="container mx-auto px-4 relative z-10">
        <motion.div 
          className="text-center max-w-3xl mx-auto mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true, margin: "-50px" }}
        >
          <h2 className="text-title-large mb-4">
            <span className="text-white">WHY_</span>
            <span className="text-gradient">CHOOSE</span>
          </h2>
          <p className="font-mono text-white/70 uppercase tracking-wider">
            OUR PLATFORM LEVERAGES SUI BLOCKCHAIN TECHNOLOGY FOR SECURE AND TRANSPARENT VOTING
          </p>
        </motion.div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <FeatureCard key={index} {...feature} />
          ))}
        </div>
      </div>
      
      <div className="mt-20 container mx-auto px-4">
        <motion.div 
          className="relative z-10 bg-black/80 border border-white/20 rounded-xl p-6 md:p-8 text-center shadow-lg overflow-hidden"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true, margin: "-50px" }}
        >
          <h3 className="text-title-medium mb-6 md:mb-8 text-white">RANK</h3>
          
          <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {/* SECURITY */}
            <motion.div 
              className="p-4 bg-black/90 border border-white/20 rounded-lg text-center"
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              viewport={{ once: true }}
            >
              <div className="font-mono text-sm md:text-base mb-2 text-white/80 tracking-wider">SECURITY</div>
              <div className="text-xl md:text-2xl lg:text-3xl font-bold text-gradient">100 Points</div>
            </motion.div>
            
            {/* SPEED */}
            <motion.div 
              className="p-4 bg-black/90 border border-white/20 rounded-lg text-center"
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
              viewport={{ once: true }}
            >
              <div className="font-mono text-sm md:text-base mb-2 text-white/80 tracking-wider">SPEED</div>
              <div className="text-xl md:text-2xl lg:text-3xl font-bold text-gradient">80 Points</div>
            </motion.div>
            
            {/* TRANSPARENCY */}
            <motion.div 
              className="p-4 bg-black/90 border border-white/20 rounded-lg text-center"
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.3 }}
              viewport={{ once: true }}
            >
              <div className="font-mono text-sm md:text-base mb-2 text-white/80 tracking-wider">TRANSPARENCY</div>
              <div className="text-xl md:text-2xl lg:text-3xl font-bold text-gradient">120 Points</div>
            </motion.div>
            
            {/* ACCESSIBILITY */}
            <motion.div 
              className="p-4 bg-black/90 border border-white/20 rounded-lg text-center"
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.4 }}
              viewport={{ once: true }}
            >
              <div className="font-mono text-sm md:text-base mb-2 text-white/80 tracking-wider">ACCESSIBILITY</div>
              <div className="text-xl md:text-2xl lg:text-3xl font-bold text-gradient">90 Points</div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default Features;
