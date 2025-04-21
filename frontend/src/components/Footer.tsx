
import { motion } from "framer-motion";
import { FileText, Github, Shield, Mail, Twitter, MessageSquare, Link } from "lucide-react";

const FooterLink = ({ href, label, icon: Icon }) => (
  <a 
    href={href} 
    className="flex items-center text-foreground/70 hover:text-foreground transition-colors"
    target="_blank"
    rel="noopener noreferrer"
  >
    <Icon size={16} className="mr-2" />
    {label}
  </a>
);

const SocialLink = ({ href, icon: Icon }) => (
  <a 
    href={href} 
    className="w-10 h-10 rounded-full glass-button flex items-center justify-center text-foreground/80 hover:text-foreground transition-colors"
    target="_blank"
    rel="noopener noreferrer"
  >
    <Icon size={18} />
  </a>
);

const Footer = () => {
  return (
    <footer className="py-16 relative">
      <div className="absolute inset-0 bg-grid-pattern opacity-30 z-0"></div>
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="flex flex-col md:flex-row justify-between mb-10">
          <div className="mb-8 md:mb-0">
            <div className="flex items-center space-x-2 mb-4">
              <motion.div 
                className="w-8 h-8 rounded-full bg-gradient-sui flex items-center justify-center"
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              >
                <div className="w-3 h-3 bg-white rounded-full" />
              </motion.div>
              <span className="text-xl font-bold text-gradient font-audiowide">SuiVote</span>
            </div>
            
            <p className="text-foreground/70 max-w-xs">
              Decentralized voting platform powered by Sui blockchain technology.
              Secure, transparent, and immutable voting for everyone.
            </p>
            
            <div className="mt-6">
              <form className="flex max-w-sm">
                <input 
                  type="email" 
                  placeholder="Your email" 
                  className="glass-input px-4 py-2 rounded-l-lg w-full focus:outline-none"
                />
                <button 
                  type="submit" 
                  className="primary-button rounded-r-lg rounded-l-none px-4 py-2"
                >
                  Subscribe
                </button>
              </form>
              <p className="text-xs text-foreground/50 mt-2">
                Subscribe to our newsletter for updates
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-x-12 gap-y-6">
            <div>
              <h3 className="font-semibold mb-4">Resources</h3>
              <div className="space-y-3">
                <FooterLink href="#" label="Documentation" icon={FileText} />
                <FooterLink href="#" label="GitHub Repository" icon={Github} />
                <FooterLink href="#" label="Terms of Service" icon={FileText} />
                <FooterLink href="#" label="Privacy Policy" icon={Shield} />
              </div>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4">Contact</h3>
              <div className="space-y-3">
                <FooterLink href="#" label="Contact Support" icon={Mail} />
                <FooterLink href="#" label="Feedback" icon={MessageSquare} />
                <FooterLink href="#" label="Partnership" icon={Link} />
              </div>
            </div>
            
            <div className="col-span-2 md:col-span-1">
              <h3 className="font-semibold mb-4">Connect</h3>
              <div className="flex space-x-3">
                <SocialLink href="#" icon={Twitter} />
                <SocialLink href="#" icon={MessageSquare} />
                <SocialLink href="#" icon={Github} />
              </div>
            </div>
          </div>
        </div>
        
        <div className="pt-8 border-t border-foreground/10 text-center text-foreground/50 text-sm">
          <p>© {new Date().getFullYear()} SuiVote. All rights reserved.</p>
          <p className="mt-1">Built with ❤️ for the Sui blockchain community</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
