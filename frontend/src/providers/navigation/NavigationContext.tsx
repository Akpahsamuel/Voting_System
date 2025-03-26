
import { useContext, createContext } from "react";

type NavigationContextType = {
  currentPage: string; // "/", "/wallet", "/proposals"
  navigate: (page: string) => void
};

export const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export const useNavigation = () => {
  const context = useContext(NavigationContext);

  if (!context) {
    throw new Error("useNavigation must be within NavigationProvider");
  }

  return context;
}