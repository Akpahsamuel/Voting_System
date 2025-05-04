import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "../ui/button";
import { Home, List, Plus } from "lucide-react";

export default function BallotNavigation() {
  const navigate = useNavigate();
  const location = useLocation();
  
  const isActive = (path: string) => {
    return location.pathname.startsWith(path);
  };
  
  return (
    <div className="flex flex-wrap gap-2 mb-6">
      <Button
        variant={isActive("/") ? "default" : "outline"}
        size="sm"
        onClick={() => navigate("/")}
      >
        <Home className="w-4 h-4 mr-2" />
        Home
      </Button>
      
      <Button
        variant={isActive("/ballots") ? "default" : "outline"}
        size="sm"
        onClick={() => navigate("/ballots")}
      >
        <List className="w-4 h-4 mr-2" />
        All Ballots
      </Button>
      
      <Button
        variant={isActive("/create-ballot") ? "default" : "outline"}
        size="sm"
        onClick={() => navigate("/create-ballot")}
      >
        <Plus className="w-4 h-4 mr-2" />
        Create Ballot
      </Button>
    </div>
  );
}
