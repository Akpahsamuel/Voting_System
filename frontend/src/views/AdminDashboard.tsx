import { AdminPage } from '../pages/AdminPage';
import Navbar from '../components/Navbar';
import Footer from "../components/Footer";

const AdminDashboard: React.FC = () => {
  return (
    <div className="min-h-screen bg-black bg-grid-pattern text-white">
      <Navbar />
      <div className="pt-24">
        <AdminPage />
      </div>
      <div className="bg-white mt-[2vh]"><Footer /></div>
    </div>
  );
};

export default AdminDashboard;