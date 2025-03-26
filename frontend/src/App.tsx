import React from "react";
import { useTheme } from "./providers/theme/ThemeContext";
import ProposalView from "./views/ProposalView";

const App: React.FC = () => {
  const { darkMode }  = useTheme();

  return (
    <div className={`${darkMode ? "dark" : ""}`}>
      <div className="min-h-screen  bg-gray-100 text-gray-900 dark:bg-gray-900 dark:text-gray-100">
        <div className="max-w-screen-xl mx-auto pt-16">
          <h1 className="text-4xl font-bold ">Simple Proposal App </h1>
          <ProposalView />
        </div>
       
      </div>
    </div>
  );
};

export default App;
