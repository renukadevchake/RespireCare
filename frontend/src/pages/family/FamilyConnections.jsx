import {
  ArrowRight,
  CheckCircle2,
  HeartHandshake,
  KeyRound,
  Link2,
  Loader2,
  ShieldCheck,
  UserRound,
  UsersRound,
} from "lucide-react";

import { useCallback, useEffect, useState } from "react";
import api from "../../services/api";

export default function FamilyConnections() {
  const [code, setCode] = useState("");
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");


  const fetchPatients = useCallback(async () => {
    try {
      const response = await api.get(
        "/connections/my-patients"
      );

      setPatients(response.data || []);
    } catch (err) {
      console.error(err);

      setError(
        "Unable to load your connected patients."
      );
    } finally {
      setLoading(false);
    }
  }, []);


  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);


  const handleCodeChange = (event) => {
    const value = event.target.value
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, 6);

    setCode(value);
    setError("");
    setSuccess("");
  };


  const connectPatient = async (event) => {
    event.preventDefault();

    if (code.length !== 6) {
      setError(
        "Enter the complete 6-character pairing code."
      );

      return;
    }

    try {
      setConnecting(true);
      setError("");
      setSuccess("");

      const response = await api.post(
        "/connections/pair",
        {
          code,
        }
      );

      const patient =
        response.data.patient;

      setSuccess(
        `Connected to ${patient.name} successfully.`
      );

      setCode("");

      await fetchPatients();

    } catch (err) {
      console.error(err);

      setError(
        err.response?.data?.detail ||
        "Unable to connect using this code."
      );
    } finally {
      setConnecting(false);
    }
  };


  return (
    <div className="family-connections-page">

      <header className="dashboard-header">

        <div>
          <p className="page-eyebrow">
            CARE CONNECTIONS
          </p>

          <h1>
            Connect to a Patient
          </h1>

          <p>
            Use the temporary pairing code
            generated from the patient's
            RespiCare account.
          </p>
        </div>


        <div className="connections-header-icon">
          <HeartHandshake size={25} />
        </div>

      </header>


      <div className="connection-page-grid">

        {/* CONNECT */}

        <section className="pairing-entry-card">

          <div className="pairing-card-icon">
            <Link2 size={25} />
          </div>


          <span className="section-kicker">
            NEW CONNECTION
          </span>

          <h2>
            Enter pairing code
          </h2>

          <p>
            Ask the patient to open their
            Care Team page and generate a
            temporary connection code.
          </p>


          <form
            className="pairing-code-form"
            onSubmit={connectPatient}
          >

            <label>
              PATIENT PAIRING CODE
            </label>


            <div className="pairing-code-input-wrap">

              <KeyRound size={19} />

              <input
                value={code}
                onChange={handleCodeChange}
                placeholder="ABC123"
                maxLength={6}
                autoComplete="off"
                spellCheck="false"
              />

            </div>


            <div className="pairing-code-progress">

              {[0, 1, 2, 3, 4, 5].map(
                (index) => (
                  <span
                    key={index}
                    className={
                      code.length > index
                        ? "filled"
                        : ""
                    }
                  />
                )
              )}

            </div>


            {error && (
              <div className="connection-message error">
                {error}
              </div>
            )}


            {success && (
              <div className="connection-message success">

                <CheckCircle2 size={15} />

                {success}

              </div>
            )}


            <button
              type="submit"
              className="pair-patient-button"
              disabled={
                connecting ||
                code.length !== 6
              }
            >

              {connecting ? (
                <>
                  <Loader2
                    size={17}
                    className="spin-icon"
                  />

                  Connecting...
                </>
              ) : (
                <>
                  Connect Patient

                  <ArrowRight size={17} />
                </>
              )}

            </button>

          </form>


          <div className="pairing-security-note">

            <ShieldCheck size={17} />

            <div>
              <strong>
                Secure one-time pairing
              </strong>

              <span>
                The code becomes unusable after
                a successful connection.
              </span>
            </div>

          </div>

        </section>


        {/* CONNECTED PATIENTS */}

        <section className="connected-patients-card">

          <div className="connected-card-header">

            <div>
              <span className="section-kicker">
                MY CARE NETWORK
              </span>

              <h2>
                Connected Patients
              </h2>
            </div>


            <div className="connected-count">
              {patients.length}
            </div>

          </div>


          {loading ? (

            <div className="connections-loading">

              <Loader2
                size={20}
                className="spin-icon"
              />

              Loading patients...

            </div>

          ) : patients.length === 0 ? (

            <div className="no-connected-patients">

              <div>
                <UsersRound size={27} />
              </div>

              <strong>
                No patients connected
              </strong>

              <span>
                Enter a pairing code to add
                your first patient.
              </span>

            </div>

          ) : (

            <div className="connected-patient-list">

              {patients.map((patient) => (

                <div
                  className="connected-patient-item"
                  key={patient.connection_id}
                >

                  <div className="connected-patient-avatar">
                    <UserRound size={19} />
                  </div>


                  <div className="connected-patient-info">

                    <strong>
                      {patient.name}
                    </strong>

                    <span>
                      Patient
                    </span>

                  </div>


                  <div className="connected-active-badge">

                    <span />

                    Connected

                  </div>

                </div>

              ))}

            </div>

          )}

        </section>

      </div>

    </div>
  );
}