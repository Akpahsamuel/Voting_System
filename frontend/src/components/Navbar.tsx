import { ConnectButton } from "@mysten/dapp-kit";
import { useNavigation } from "../providers/navigation/NavigationContext";
import { useAdminCap } from "../hooks/useAdminCap";

const Navbar = () => {
  const {currentPage, navigate} = useNavigation()
  const { hasAdminCap, isLoading } = useAdminCap();

  return (
    <nav className="bg-gray-200 dark:bg-gray-800 p-4 shadow-md">
      <div className="flex justify-between">
        <ul className="flex space-x-6">
          <li>
            <button
              onClick={() => navigate("/")}
              className={`px-4 py-2 rounded ${currentPage === "/" ? "bg-blue-400 dark:bg-blue-600 underline" : ""}`}
            >
              Home
            </button>
          </li>
          <li>
            <button
              onClick={() => navigate("/wallet")}
              className={`px-4 py-2 rounded ${currentPage === "/wallet" ? "bg-blue-400 dark:bg-blue-600 underline" : ""}`}
            >
              Wallet
            </button>
          </li>
          <li>
            <button
              onClick={() => navigate("/statistics")}
              className={`px-4 py-2 rounded ${currentPage === "/statistics" ? "bg-blue-400 dark:bg-blue-600 underline" : ""}`}
            >
              Statistics
            </button>
          </li>
          {(hasAdminCap || isLoading) && (
            <li>
              <button
                onClick={() => navigate("/admin")}
                className={`px-4 py-2 rounded ${currentPage === "/admin" ? "bg-blue-400 dark:bg-blue-600 underline" : ""}`}
              >
                Admin
              </button>
            </li>
          )}
        </ul>
        <ConnectButton />
      </div>
    </nav>
  )
}

export default Navbar;