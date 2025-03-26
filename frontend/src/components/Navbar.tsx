import { useNavigation } from "../providers/navigation/NavigationContext";

const Navbar = () => {
  const {currentPage, navigate} = useNavigation()

  return (
    <nav className="bg-gray-200 dark:bg-gray-800 p-4 shadow-md">
      <ul className="flex space-x-6">
        <li>
          <button
            onClick={() => navigate("/")}
            className={`px-4 py-2 rounded ${currentPage === "/" ? "bg-blue-400 underline" : ""}`}
          >
            Home
          </button>
        </li>
        <li>
          <button
            onClick={() => navigate("/wallet")}
            className={`px-4 py-2 rounded ${currentPage === "/wallet" ? "bg-blue-400 underline" : ""}`}
          >
            Wallet
          </button>
        </li>
      </ul>
    </nav>
  )
}

export default Navbar;