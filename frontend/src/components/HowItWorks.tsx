import { motion } from "framer-motion";
import { Wallet, Vote, CheckCircle, Search } from "lucide-react";

const steps = [
  {
    icon: Wallet,
    title: "Connect your Sui wallet",
    description: "Securely connect your Sui wallet to access the voting platform",
    delay: 0.1,
  },
  {
    icon: Vote,
    title: "View active voting sessions",
    description: "Browse currently active voting sessions you're eligible to participate in",
    delay: 0.2,
  },
  {
    icon: CheckCircle,
    title: "Cast your vote securely",
    description: "Submit your vote with cryptographic protection ensuring anonymity",
    delay: 0.3,
  },
  {
    icon: Search,
    title: "Verify your vote on the blockchain",
    description: "Confirm your vote was correctly recorded on the Sui blockchain",
    delay: 0.4,
  },
];

const HowItWorks = () => {
  return (
    <section id="how-it-works" className="py-20 dark-section text-white">
      <div className="container mx-auto px-4">
        <motion.div 
          className="text-center max-w-3xl mx-auto mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true, margin: "-50px" }}
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4 font-audiowide">
            <span className="text-gradient">How Our</span> Voting System Works
          </h2>
          <p className="text-[#6060e6]">
            Our platform makes blockchain voting simple and intuitive while maintaining
            the highest standards of security and transparency.
          </p>
        </motion.div>
        
        <div className="relative">
          {/* Connection line */}
          <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-sui hidden lg:block"></div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
            {steps.map((step, index) => {
              const Icon = step.icon;
              
              return (
                <motion.div 
                  key={index}
                  className="relative flex flex-col items-center text-center"
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: step.delay }}
                  viewport={{ once: true, margin: "-50px" }}
                >
                  {/* Step number */}
                  <motion.div 
                    className="w-10 h-10 rounded-full bg-gradient-sui text-white flex items-center justify-center text-lg font-bold mb-4 relative z-10"
                    whileInView={{ 
                      boxShadow: [
                        "0 0 0 4px rgba(123, 97, 255, 0.1)",
                        "0 0 0 8px rgba(123, 97, 255, 0.1)",
                        "0 0 0 4px rgba(123, 97, 255, 0.1)"
                      ]
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                    viewport={{ once: true }}
                  >
                    {index + 1}
                  </motion.div>
                  
                  {/* Icon */}
                  <div className="glass p-5 rounded-xl mb-4 w-16 h-16 flex items-center justify-center">
                    <Icon size={24} className="text-primary" />
                  </div>
                  
                  {/* Content */}
                  <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
                  <p className="text-[#6060e6]">{step.description}</p>
                </motion.div>
              );
            })}
          </div>
        </div>

        
        <motion.div
  className="absolute right-0 top-1/2 -translate-y-1/2 w-1/3 hidden lg:block"
  initial={{ opacity: 0, x: -100 }}
  animate={{
    opacity: 1,
    x: 0,
    rotate: [-5, 5, -5], // Tilting left and right
  }}
  transition={{
    duration: 3, // Duration of one full tilt cycle
    repeat: Infinity, // Repeat indefinitely
    ease: "easeInOut", // Smooth easing
  }}
>
  <img
    src="/sv.jpg"
    alt="Technology"
    className="w-full h-auto rounded-lg shadow-2xl"
  />
</motion.div>
      </div>
    </section>
  );
};

export default HowItWorks;
