import { useAuth } from "../../context/AuthContext";

export default function DoctorDashboard() {
  const { user, logout } = useAuth();

  return (
    <div className="temporary-dashboard">
      <h1>Hello, Dr. {user?.name}</h1>
      <p>Doctor Dashboard</p>

      <button
        className="primary-button small-button"
        onClick={logout}
      >
        Logout
      </button>
    </div>
  );
}