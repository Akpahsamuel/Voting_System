import { useState } from "react";
import { motion } from "framer-motion";
import { Shield, Key, Users, FileText } from "lucide-react";
import { SecurityCardProps } from "../types";

const SecurityCard = ({ icon: Icon, title, description, delay }: SecurityCardProps) => {
  const [hovered, setHovered] = useState(false);
  
  return (
    <motion.div
      className="glass-card p-6 feature-card-hover"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      initial={{ opacity: 0, x: -50 }}
      whileInView={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay }}
      viewport={{ once: true, margin: "-50px" }}
    >
      <div className="flex mb-4 items-center">
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center bg-gradient-sui glow transition-all duration-300 ${hovered ? 'scale-110' : ''}`}>
          <Icon size={24} className="text-white" />
        </div>
        <h3 className="text-xl font-semibold ml-4">{title}</h3>
      </div>
      
      <p className="text-foreground/70">{description}</p>
      
      {hovered && (
        <motion.div 
          className="absolute bottom-0 left-0 h-1 bg-gradient-sui"
          initial={{ width: "0%" }}
          animate={{ width: "100%" }}
          transition={{ duration: 0.3 }}
        />
      )}
    </motion.div>
  );
};

const Security = () => {
  const securityFeatures: SecurityCardProps[] = [
    {
      icon: Shield,
      title: "Blockchain Immutability",
      description: "Once recorded, votes cannot be altered or deleted, ensuring the integrity of the voting process.",
      delay: 0.1,
    },
    {
      icon: Key,
      title: "Cryptographic Verification",
      description: "Advanced cryptography ensures that votes are secure and can be verified without compromising voter privacy.",
      delay: 0.2,
    },
    {
      icon: Users,
      title: "Multi-signature Support",
      description: "Critical operations require multiple approvals, preventing unauthorized access and manipulation.",
      delay: 0.3,
    },
    {
      icon: FileText,
      title: "Audit Trail",
      description: "Complete history of all transactions is maintained on the blockchain, enabling transparent auditing.",
      delay: 0.4,
    },
  ];

  return (
    <section id="security" className="py-20 bg-gradient-to-b from-blue-50/30 to-background">
      <div className="container mx-auto px-4">
        <motion.div 
          className="text-center max-w-3xl mx-auto mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true, margin: "-50px" }}
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4 font-audiowide">
            <span className="text-gradient">Enterprise-Grade</span> Security
          </h2>
          <p className="text-foreground/70">
            We implement the highest security standards to ensure your votes are protected
          </p>
        </motion.div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {securityFeatures.map((feature, index) => (
            <SecurityCard key={index} {...feature} />
          ))}
        </div>
        
        <motion.div 
          className="mt-16 p-8 glass text-center max-w-2xl mx-auto"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          viewport={{ once: true, margin: "-50px" }}
        >
          <h3 className="text-xl font-semibold mb-4">Security Audit Verified</h3>
          <p className="text-foreground/70 mb-4">
            Our platform has undergone rigorous security audits by independent blockchain security firms.
          </p>
          <div className="flex justify-center space-x-4">
            <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center">
              <Shield size={32} className="text-primary" />
            </div>
            <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center">
              <Key size={32} className="text-primary" />
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default Security;
