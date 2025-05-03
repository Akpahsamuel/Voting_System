import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { CheckCircle, Vote, Users, ShieldCheck } from "lucide-react";

type StatCounterProps = {
  value: number;
  label: string;
  icon: React.ComponentType<{ size?: string | number; className?: string }>;
  delay: number;
};

const StatCounter = ({ value, label, icon: Icon, delay }: StatCounterProps) => {
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    let startValue = 0;
    const duration = 2000; // 2 seconds
    const interval = 50; // Update every 50ms
    const increment = value / (duration / interval);
    
    const timer = setTimeout(() => {
      const counter = setInterval(() => {
        startValue += increment;
        
        if (startValue > value) {
          clearInterval(counter);
          setCount(value);
        } else {
          setCount(Math.floor(startValue));
        }
      }, interval);
      
      return () => clearInterval(counter);
    }, delay * 1000);
    
    return () => clearTimeout(timer);
  }, [value, delay]);
  
  return (
    <motion.div 
      className="glass-card p-6 text-center feature-card-hover"
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: delay }}
      viewport={{ once: true, margin: "-50px" }}
    >
      <div className="flex justify-center mb-4">
        <div className="w-14 h-14 rounded-full bg-gradient-sui flex items-center justify-center glow">
          <Icon size={28} className="text-white" />
        </div>
      </div>
      
      <div className="text-4xl font-bold mb-2 text-gradient">
        {count.toLocaleString()}
        {label === "Transaction Success Rate" && "%"}
      </div>
      
      <div className="text-sm text-foreground/70">{label}</div>
    </motion.div>
  );
};

const Statistics = () => {
  const stats = [
    {
      value: 2756318,
      label: "Total Votes Cast",
      icon: CheckCircle,
      delay: 0.1
    },
    {
      value: 142,
      label: "Active Voting Sessions",
      icon: Vote,
      delay: 0.2
    },
    {
      value: 184562,
      label: "Number of Participants",
      icon: Users,
      delay: 0.3
    },
    {
      value: 99.99,
      label: "Transaction Success Rate",
      icon: ShieldCheck,
      delay: 0.4
    }
  ];

  return (
    <section id="statistics" className="py-20 relative section-222222 text-white">
      <div className="absolute inset-0 bg-grid-pattern opacity-30 z-0"></div>
      <div className="absolute inset-0 bg-gradient-radial from-blue-500/5 to-purple-500/10 z-0"></div>
      
      <div className="container mx-auto px-4 relative z-10">
        <motion.div 
          className="text-center max-w-3xl mx-auto mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true, margin: "-50px" }}
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4 font-audiowide">
            <span className="text-gradient">Platform</span> Statistics
          </h2>
          <p className="text-foreground/70">
            Our growing ecosystem of secure blockchain voting on the Sui network
          </p>
        </motion.div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, index) => (
            <StatCounter key={index} {...stat} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default Statistics;
