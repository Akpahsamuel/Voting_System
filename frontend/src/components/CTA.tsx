
import { motion } from "framer-motion";
import { Plus, Vote, Rocket } from "lucide-react";

const CTAButton = ({ icon: Icon, label, description, primary = false, delay = 0 }) => {
  return (
    <motion.div
      className={`relative flex flex-col items-center group ${primary ? '' : 'md:mt-6'}`}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      viewport={{ once: true, margin: "-50px" }}
    >
      <button className={`w-full ${primary ? 'primary-button' : 'secondary-button'} glass-button h-full p-6 flex flex-col items-center justify-center`}>
        <div className={`w-16 h-16 rounded-full ${primary ? 'bg-white/20' : 'bg-gradient-sui'} flex items-center justify-center mb-4`}>
          <Icon size={32} className={primary ? 'text-white' : 'text-white'} />
        </div>
        <h3 className="text-xl font-semibold mb-2">{label}</h3>
        <p className="text-sm text-center opacity-80">{description}</p>
      </button>
      
      <motion.div 
        className="absolute -inset-px rounded-xl bg-gradient-to-r from-blue-500/70 to-purple-500/70 blur opacity-0 group-hover:opacity-40 transition-opacity duration-300"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 0 }}
        whileHover={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
      />
    </motion.div>
  );
};

const CTA = () => {
  return (
    <section id="cta" className="py-20 relative overflow-hidden">
      <div className="absolute inset-0 bg-grid-pattern opacity-30 z-0"></div>
      <div className="absolute inset-0 bg-gradient-radial from-blue-500/5 to-purple-500/10 z-0"></div>
      
      {/* Animated floating elements */}
      <motion.div 
        className="absolute w-24 h-24 rounded-full bg-gradient-sui opacity-10 blur-xl"
        animate={{ 
          x: [0, 100, 0],
          y: [0, -50, 0],
        }}
        transition={{ duration: 20, repeat: Infinity, repeatType: "reverse" }}
      />
      
      <motion.div 
        className="absolute right-0 bottom-0 w-32 h-32 rounded-full bg-gradient-sui opacity-10 blur-xl"
        animate={{ 
          x: [0, -100, 0],
          y: [0, 50, 0],
        }}
        transition={{ duration: 15, repeat: Infinity, repeatType: "reverse" }}
      />
      
      <div className="container mx-auto px-4 relative z-10">
        <motion.div 
          className="text-center max-w-3xl mx-auto mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true, margin: "-50px" }}
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4 font-audiowide">
            <span className="text-gradient">Ready to Start</span> Voting?
          </h2>
          <p className="text-foreground/70 text-xl">
            Join the future of decentralized voting
          </p>
        </motion.div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          <CTAButton 
            icon={Plus}
            label="Create New Voting Session"
            description="Set up a new voting session for your organization or community"
            primary={true}
            delay={0.1}
          />
          
          <CTAButton 
            icon={Vote}
            label="View Active Sessions"
            description="Browse and participate in ongoing voting sessions"
            delay={0.2}
          />
          
          <CTAButton 
            icon={Rocket}
            label="Learn More About Sui"
            description="Discover the Sui blockchain that powers our platform"
            delay={0.3}
          />
        </div>
        
        <motion.div 
          className="mt-16 text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          viewport={{ once: true, margin: "-50px" }}
        >
          <p className="text-foreground/60">
            Need help getting started? <a href="#" className="text-primary underline">Contact our support team</a>
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default CTA;
