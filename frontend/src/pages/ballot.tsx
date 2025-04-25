import { useState, useEffect } from "react";
import { ConnectButton, useCurrentAccount } from "@mysten/dapp-kit";
import { motion } from "framer-motion";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { Doughnut } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { Check, ChevronRight, Vote, Shield, Clock } from "lucide-react";

// Register ChartJS components
ChartJS.register(ArcElement, Tooltip, Legend);

export default function VotingPage() {
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [voted, setVoted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<{ id: number; name: string; description: string; votes: number; }[]>([]);
  const [timeLeft, setTimeLeft] = useState({
    days: 2,
    hours: 14,
    minutes: 35,
    seconds: 22,
  });
  
  const currentAccount = useCurrentAccount();
  // Removed unused 'signAndExecute' to resolve the error
  
  // Mock voting options
  const votingOptions = [
    { id: 1, name: "Proposal A: Increase Treasury Allocation", description: "Allocate additional funds to the community treasury for ecosystem growth", votes: 1243 },
    { id: 2, name: "Proposal B: New Governance Framework", description: "Implement a new voting mechanism for future governance decisions", votes: 876 },
    { id: 3, name: "Proposal C: Protocol Upgrade", description: "Upgrade to the latest blockchain protocol version with enhanced security", votes: 1052 },
  ];

  // Countdown timer effect
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        const newSeconds = prev.seconds - 1;
        
        if (newSeconds < 0) {
          const newMinutes = prev.minutes - 1;
          
          if (newMinutes < 0) {
            const newHours = prev.hours - 1;
            
            if (newHours < 0) {
              const newDays = prev.days - 1;
              
              if (newDays < 0) {
                clearInterval(timer);
                return { days: 0, hours: 0, minutes: 0, seconds: 0 };
              }
              
              return { days: newDays, hours: 23, minutes: 59, seconds: 59 };
            }
            
            return { ...prev, hours: newHours, minutes: 59, seconds: 59 };
          }
          
          return { ...prev, minutes: newMinutes, seconds: 59 };
        }
        
        return { ...prev, seconds: newSeconds };
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, []);

  // Mock function to submit vote to Sui blockchain
  const submitVote = async () => {
    if (!selectedOption) {
      toast.error("Please select an option to vote");
      return;
    }

    if (!currentAccount) {
      toast.error("Please connect your wallet to vote");
      return;
    }

    setLoading(true);

    try {
      // Create a transaction block
      // const tx = new TransactionBlock(); // Removed unused variable
      
      // In a real implementation, you would use the actual module and function
      // tx.moveCall({
      //   target: `${packageId}::voting::cast_vote`,
      //   arguments: [tx.pure(selectedOption)],
      // });

      // For demonstration, we'll simulate a transaction
      setTimeout(() => {
        // Mock results after voting
        const updatedResults = votingOptions.map(option => {
          if (option.id === selectedOption) {
            return { ...option, votes: option.votes + 1 };
          }
          return option;
        });
        
        setResults(updatedResults);
        setVoted(true);
        setLoading(false);
        toast.success("Your vote has been recorded on the blockchain!");
      }, 2000);
      
      // In a real implementation, you would execute the transaction
      // signAndExecute({
      //   transactionBlock: tx,
      //   options: { showEffects: true },
      // }, {
      //   onSuccess: () => {
      //     setVoted(true);
      //     setLoading(false);
      //     toast.success("Your vote has been recorded on the blockchain!");
      //   },
      //   onError: (err) => {
      //     console.error(err);
      //     setLoading(false);
      //     toast.error("Failed to submit your vote. Please try again.");
      //   }
      // });
    } catch (error) {
      console.error(error);
      setLoading(false);
      toast.error("An error occurred while processing your vote");
    }
  };

  // Prepare chart data
  const chartData = {
    labels: votingOptions.map(option => option.name.split(":")[0]),
    datasets: [
      {
        data: votingOptions.map(option => option.votes),
        backgroundColor: [
          "rgba(75, 192, 192, 0.7)",
          "rgba(153, 102, 255, 0.7)",
          "rgba(255, 159, 64, 0.7)",
        ],
        borderColor: [
          "rgba(75, 192, 192, 1)",
          "rgba(153, 102, 255, 1)",
          "rgba(255, 159, 64, 1)",
        ],
        borderWidth: 1,
      },
    ],
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-gray-100 p-4 md:p-8">
      <ToastContainer position="top-right" theme="dark" />
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
            SUIVOTE
          </h1>
          <p className="text-gray-400">Cast your vote on blockchain proposals using Sui</p>
        </div>
        
        <div className="mt-4 md:mt-0">
          <ConnectButton className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 transition-all duration-300" />
        </div>
      </div>
      
      {/* Countdown Timer */}
      <motion.div 
        className="bg-gray-800 rounded-xl p-4 mb-8 shadow-lg border border-gray-700"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center mb-2">
          <Clock className="w-5 h-5 mr-2 text-blue-400" />
          <h2 className="text-xl font-semibold">Voting Ends In</h2>
        </div>
        <div className="grid grid-cols-4 gap-2 text-center">
          <div className="bg-gray-900 rounded-lg p-3">
            <div className="text-2xl font-bold">{timeLeft.days}</div>
            <div className="text-xs text-gray-400">Days</div>
          </div>
          <div className="bg-gray-900 rounded-lg p-3">
            <div className="text-2xl font-bold">{timeLeft.hours}</div>
            <div className="text-xs text-gray-400">Hours</div>
          </div>
          <div className="bg-gray-900 rounded-lg p-3">
            <div className="text-2xl font-bold">{timeLeft.minutes}</div>
            <div className="text-xs text-gray-400">Minutes</div>
          </div>
          <div className="bg-gray-900 rounded-lg p-3">
            <div className="text-2xl font-bold">{timeLeft.seconds}</div>
            <div className="text-xs text-gray-400">Seconds</div>
          </div>
        </div>
      </motion.div>
      
      {/* Voting Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Voting Options */}
        <div className="md:col-span-2">
          <motion.div 
            className="bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-700"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className="flex items-center mb-4">
              <Vote className="w-5 h-5 mr-2 text-purple-400" />
              <h2 className="text-xl font-semibold">Cast Your Vote</h2>
            </div>
            
            {votingOptions.map((option) => (
              <motion.div 
                key={option.id}
                className={`mb-4 p-4 rounded-lg border cursor-pointer transition-all duration-200 ${
                  selectedOption === option.id 
                    ? "border-blue-500 bg-blue-900/20" 
                    : "border-gray-700 hover:border-gray-500 bg-gray-900/50"
                }`}
                onClick={() => !voted && setSelectedOption(option.id)}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
              >
                <div className="flex justify-between items-center">
                  <h3 className="font-medium text-lg">{option.name}</h3>
                  {selectedOption === option.id && (
                    <motion.div 
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="bg-blue-500 text-white p-1 rounded-full"
                    >
                      <Check className="w-4 h-4" />
                    </motion.div>
                  )}
                </div>
                <p className="text-gray-400 mt-2">{option.description}</p>
                
                {voted && (
                  <div className="mt-3 bg-gray-800 rounded-lg p-2">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Current votes</span>
                      <span className="font-semibold">
                        {(results || votingOptions).find(v => v.id === option.id)?.votes}
                      </span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2 mt-1">
                      <motion.div 
                      className="bg-blue-500 h-2 rounded-full"
                      initial={{ width: "0%" }}
                      animate={{ 
                        width: `${((results || votingOptions)?.find(v => v.id === option.id)?.votes || 0 / 
                        (results || votingOptions)?.reduce((acc, curr) => acc + (curr.votes || 0), 0)) * 100}%` 
                      }}
                      transition={{ duration: 1, ease: "easeOut" }}
                      />
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
            
            <motion.button
              className={`w-full py-3 px-4 rounded-lg font-medium text-center transition-all duration-300 flex items-center justify-center mt-4 ${
                voted
                  ? "bg-green-600 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
              onClick={!voted ? submitVote : undefined}
              disabled={voted || loading}
              whileHover={!voted ? { scale: 1.02 } : {}}
              whileTap={!voted ? { scale: 0.98 } : {}}
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              ) : voted ? (
                <>
                  <Check className="w-5 h-5 mr-2" />
                  Vote Submitted
                </>
              ) : (
                <>
                  Submit Vote
                  <ChevronRight className="w-5 h-5 ml-1" />
                </>
              )}
            </motion.button>
          </motion.div>
        </div>
        
        {/* Stats & Info */}
        <div>
          <motion.div 
            className="bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-700 mb-6"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <div className="flex items-center mb-4">
              <Shield className="w-5 h-5 mr-2 text-green-400" />
              <h2 className="text-xl font-semibold">Voting Statistics</h2>
            </div>
            
            <div className="mb-6">
              <Doughnut 
                data={chartData} 
                options={{
                  plugins: {
                    legend: {
                      position: 'bottom',
                      labels: {
                        color: '#d1d5db',
                        padding: 20,
                        font: {
                          size: 12
                        }
                      }
                    }
                  },
                  cutout: '65%',
                  animation: {
                    animateScale: true,
                    animateRotate: true
                  }
                }}
              />
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Total Votes</span>
                <span className="font-bold">
                  {votingOptions.reduce((acc, curr) => acc + curr.votes, 0)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Participation Rate</span>
                <span className="font-bold">23.7%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Your Status</span>
                <span className={`font-bold ${voted ? "text-green-400" : "text-yellow-400"}`}>
                  {voted ? "Voted" : "Not Voted"}
                </span>
              </div>
            </div>
          </motion.div>
          
          <motion.div 
            className="bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-700"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
          >
            <h2 className="text-xl font-semibold mb-3">About This Vote</h2>
            <p className="text-gray-400 text-sm">
              This governance vote will determine the future direction of the protocol. 
              All votes are recorded on the Sui blockchain for maximum transparency and security.
            </p>
            <div className="mt-4 p-3 bg-blue-900/20 rounded-lg border border-blue-800/30 text-sm">
              <p className="text-blue-300">
                Your vote is secured by blockchain technology and completely anonymous.
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
