import React from "react";
import { useTheme } from "./providers/theme/ThemeContext";

const App: React.FC = () => {
  const { darkMode, toggleDarkMode }  = useTheme();

  return (
    <div className={`${darkMode ? "dark" : ""}`}>
      <div className="min-h-screen flex items-center justify-center bg-gray-100 text-gray-900 dark:bg-gray-900 dark:text-gray-100">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">Hello React Template</h1>
          <button
            onClick={toggleDarkMode}
            className="px-4 py-2 rounded bg-blue-500 text-white dark:bg-blue-700 hover:bg-blue-600 dark:hover:bg-blue-800 transition"
          >
            Switch to {darkMode ? "Light" : "Dark"} Mode
          </button>
        </div>
      </div>
    </div>
  );
};

export default App;
