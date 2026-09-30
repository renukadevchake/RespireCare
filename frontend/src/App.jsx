import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from "react-router-dom";

import {
  AuthProvider,
  useAuth,
} from "./context/AuthContext";

import ProtectedRoute from "./components/ProtectedRoute";

/* =====================================================
   LAYOUTS
===================================================== */

import PatientLayout from "./components/PatientLayout";


/* =====================================================
   AUTH
===================================================== */

import Login from "./pages/Login";
import Register from "./pages/Register";


/* =====================================================
   PATIENT
===================================================== */

import PatientDashboard from "./pages/patient/PatientDashboard";
import PatientConnections from "./pages/patient/PatientConnections";
import PatientMedications from "./pages/patient/PatientMedications";
import DemoControl from "./pages/demo/DemoControl";


/* =====================================================
   FAMILY
===================================================== */

import FamilyDashboard from "./pages/family/FamilyDashboard";
import FamilyConnections from "./pages/family/FamilyConnections";


/* =====================================================
   DOCTOR
===================================================== */

import DoctorDashboard from "./pages/doctor/DoctorDashboard";


/* =====================================================
   ROOT REDIRECT
===================================================== */

function HomeRedirect() {
  const {
    user,
    loading,
  } = useAuth();


  if (loading) {
    return (
      <div className="center-screen">
        Loading...
      </div>
    );
  }


  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
      />
    );
  }


  if (user.role === "PATIENT") {
    return (
      <Navigate
        to="/patient"
        replace
      />
    );
  }


  if (user.role === "FAMILY") {
    return (
      <Navigate
        to="/family"
        replace
      />
    );
  }


  if (user.role === "DOCTOR") {
    return (
      <Navigate
        to="/doctor"
        replace
      />
    );
  }


  return (
    <Navigate
      to="/login"
      replace
    />
  );
}


/* =====================================================
   PLACEHOLDER PAGE
===================================================== */

function PlaceholderPage({
  eyebrow = "RESPICARE",
  title,
  description,
}) {
  return (
    <div className="placeholder-page">

      <p className="page-eyebrow">
        {eyebrow}
      </p>

      <h1>
        {title}
      </h1>

      <p>
        {description}
      </p>

    </div>
  );
}


/* =====================================================
   APP ROUTES
===================================================== */

function AppRoutes() {
  return (
    <Routes>

      {/* =================================================
          ROOT
      ================================================= */}

      <Route
        path="/"
        element={<HomeRedirect />}
      />


      {/* =================================================
          AUTH
      ================================================= */}

      <Route
        path="/login"
        element={<Login />}
      />


      <Route
        path="/register"
        element={<Register />}
      />


      {/* =================================================
          PATIENT

          IMPORTANT:
          PatientLayout contains the sidebar.

          Every Patient page below renders inside
          PatientLayout through <Outlet />.
      ================================================= */}

      <Route
        path="/patient"
        element={
          <ProtectedRoute
            roles={["PATIENT"]}
          >
            <PatientLayout />
          </ProtectedRoute>
        }
      >

        {/* DASHBOARD */}

        <Route
          index
          element={
            <PatientDashboard />
          }
        />


        {/* MONITORING */}

        <Route
          path="monitoring"
          element={
            <PatientDashboard />
          }
        />


        {/* HISTORY */}

        <Route
          path="history"
          element={
            <PlaceholderPage
              eyebrow="RESPIRATORY HISTORY"
              title="Monitoring History"
              description="Your respiratory monitoring history will appear here."
            />
          }
        />


        {/* CARE TEAM */}

        <Route
          path="connections"
          element={
            <PatientConnections />
          }
        />


        {/* MEDICATION */}

        <Route
          path="medications"
          element={
            <PatientMedications />
          }
        />


        {/* SIMULATION */}

        <Route
          path="simulation"
          element={
            <DemoControl />
          }
        />

      </Route>


      {/* =================================================
          FAMILY
      ================================================= */}

      <Route
        path="/family"
        element={
          <ProtectedRoute
            roles={["FAMILY"]}
          >
            <FamilyDashboard />
          </ProtectedRoute>
        }
      />


      <Route
        path="/family/connections"
        element={
          <ProtectedRoute
            roles={["FAMILY"]}
          >
            <FamilyConnections />
          </ProtectedRoute>
        }
      />


      <Route
        path="/family/alerts"
        element={
          <ProtectedRoute
            roles={["FAMILY"]}
          >
            <PlaceholderPage
              eyebrow="PATIENT SAFETY"
              title="Alerts"
              description="Respiratory alerts from your connected patients will appear here."
            />
          </ProtectedRoute>
        }
      />


      <Route
        path="/family/medications"
        element={
          <ProtectedRoute
            roles={["FAMILY"]}
          >
            <PlaceholderPage
              eyebrow="MEDICATION CARE"
              title="Medications"
              description="Medication schedules for your connected patients will appear here."
            />
          </ProtectedRoute>
        }
      />


      {/* =================================================
          DOCTOR
      ================================================= */}

      <Route
        path="/doctor"
        element={
          <ProtectedRoute
            roles={["DOCTOR"]}
          >
            <DoctorDashboard />
          </ProtectedRoute>
        }
      />


      <Route
        path="/doctor/connections"
        element={
          <ProtectedRoute
            roles={["DOCTOR"]}
          >
            <PlaceholderPage
              eyebrow="PATIENT CONNECTIONS"
              title="Connect Patient"
              description="Connect to patients using their temporary RespiCare pairing code."
            />
          </ProtectedRoute>
        }
      />


      <Route
        path="/doctor/patients"
        element={
          <ProtectedRoute
            roles={["DOCTOR"]}
          >
            <PlaceholderPage
              eyebrow="PATIENT CARE"
              title="My Patients"
              description="Your connected RespiCare patients will appear here."
            />
          </ProtectedRoute>
        }
      />


      <Route
        path="/doctor/alerts"
        element={
          <ProtectedRoute
            roles={["DOCTOR"]}
          >
            <PlaceholderPage
              eyebrow="RESPIRATORY EVENTS"
              title="Patient Alerts"
              description="Respiratory events requiring review will appear here."
            />
          </ProtectedRoute>
        }
      />


      <Route
        path="/doctor/prescriptions"
        element={
          <ProtectedRoute
            roles={["DOCTOR"]}
          >
            <PlaceholderPage
              eyebrow="CARE PLAN"
              title="Prescriptions"
              description="Create and manage medication prescriptions for your connected patients."
            />
          </ProtectedRoute>
        }
      />


      {/* =================================================
          FALLBACK
      ================================================= */}

      <Route
        path="*"
        element={
          <HomeRedirect />
        }
      />

    </Routes>
  );
}


/* =====================================================
   APP
===================================================== */

export default function App() {
  return (
    <BrowserRouter>

      <AuthProvider>

        <AppRoutes />

      </AuthProvider>

    </BrowserRouter>
  );
}