import {
  Activity,
  ArrowRight,
  Bell,
  HeartPulse,
  KeyRound,
  Link2,
  Loader2,
  Pill,
  ShieldCheck,
  Signal,
  UserRound,
  UsersRound,
  Wifi,
} from "lucide-react";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import { Link } from "react-router-dom";

import { useAuth } from "../../context/AuthContext";
import api from "../../services/api";
import RespiratoryWaveform from "../../components/RespiratoryWaveform";


export default function FamilyDashboard() {
  const { user } = useAuth();

  const [patients, setPatients] = useState([]);
  const [selectedPatientId, setSelectedPatientId] =
    useState(null);

  const [monitoring, setMonitoring] =
    useState(null);

  const [medications, setMedications] =
    useState([]);

  const [loadingPatients, setLoadingPatients] =
    useState(true);

  const [updatingMedication, setUpdatingMedication] =
    useState(null);

  const [error, setError] =
    useState("");


  /* =====================================================
     CONNECTED PATIENTS
  ===================================================== */

  const fetchPatients = useCallback(async () => {
    try {
      const response = await api.get(
        "/connections/my-patients"
      );

      const patientList =
        response.data || [];

      setPatients(patientList);

      setSelectedPatientId((current) => {
        if (
          current &&
          patientList.some(
            (patient) =>
              patient.patient_id === current
          )
        ) {
          return current;
        }

        return patientList.length > 0
          ? patientList[0].patient_id
          : null;
      });

      setError("");

    } catch (err) {
      console.error(
        "Could not load patients:",
        err
      );

      setError(
        "Unable to load connected patients."
      );

    } finally {
      setLoadingPatients(false);
    }
  }, []);


  /* =====================================================
     RESPIRATORY MONITORING
  ===================================================== */

  const fetchMonitoring =
    useCallback(async () => {

      if (!selectedPatientId) {
        setMonitoring(null);
        return;
      }

      try {
        const response = await api.get(
          `/monitoring/patient/${selectedPatientId}/current`
        );

        setMonitoring(
          response.data
        );

      } catch (err) {
        console.error(
          "Monitoring error:",
          err
        );

        setMonitoring(null);
      }

    }, [selectedPatientId]);


  /* =====================================================
     MEDICATION
  ===================================================== */

  const fetchMedications =
    useCallback(async () => {

      if (!selectedPatientId) {
        setMedications([]);
        return;
      }

      try {
        const response = await api.get(
          `/medications/patient/${selectedPatientId}`
        );

        setMedications(
          response.data || []
        );

      } catch (err) {
        console.error(
          "Medication error:",
          err
        );

        setMedications([]);
      }

    }, [selectedPatientId]);


  /* =====================================================
     LOAD PATIENTS
  ===================================================== */

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);


  /* =====================================================
     POLLING
  ===================================================== */

  useEffect(() => {
    if (!selectedPatientId) {
      setMonitoring(null);
      setMedications([]);
      return;
    }

    fetchMonitoring();
    fetchMedications();

    const monitoringInterval =
      setInterval(
        fetchMonitoring,
        500
      );

    const medicationInterval =
      setInterval(
        fetchMedications,
        15000
      );

    return () => {
      clearInterval(
        monitoringInterval
      );

      clearInterval(
        medicationInterval
      );
    };

  }, [
    selectedPatientId,
    fetchMonitoring,
    fetchMedications,
  ]);


  /* =====================================================
     MARK MEDICATION
  ===================================================== */

  const toggleMedication =
    async (medication) => {

      try {
        setUpdatingMedication(
          medication.id
        );

        setError("");

        await api.post(
          "/medications/taken",
          {
            prescription_id:
              medication.id,

            taken:
              !medication.today?.taken,
          }
        );

        await fetchMedications();

      } catch (err) {
        console.error(err);

        setError(
          err.response?.data?.detail ||
          "Unable to update medication."
        );

      } finally {
        setUpdatingMedication(null);
      }
    };


  /* =====================================================
     SELECTED PATIENT
  ===================================================== */

  const selectedPatient =
    patients.find(
      (patient) =>
        patient.patient_id ===
        selectedPatientId
    );


  /* =====================================================
     RESPIRATORY VALUES
  ===================================================== */

  const rate =
    monitoring?.respiratory_rate ?? null;

  const quality =
    monitoring?.signal_quality ||
    "UNKNOWN";

  const pattern =
    monitoring?.pattern ||
    "NO_DATA";

  const mode =
    monitoring?.mode ||
    "LIVE";


  const hasSignal =
    monitoring?.status === "MONITORING" &&
    rate !== null &&
    quality !== "UNKNOWN" &&
    quality !== "UNRELIABLE";


  /*
    Temporary until rolling baseline detector
    is implemented.
  */

  const baseline =
    hasSignal
      ? 15
      : null;


  const deviation =
    rate !== null &&
    baseline !== null
      ? Number(
          (
            rate -
            baseline
          ).toFixed(1)
        )
      : null;


  const amplitude =
    hasSignal
      ? monitoring?.simulated_volume != null
        ? monitoring.simulated_volume / 587
        : 1
      : 0;


  const respiratoryStatus =
    getRespiratoryStatus(
      hasSignal,
      pattern,
      quality
    );


  const takenCount =
    medications.filter(
      (medication) =>
        medication.today?.taken
    ).length;


  /* =====================================================
     RENDER
  ===================================================== */

  return (
    <div className="family-dashboard-page">

      {/* =================================================
          HEADER
      ================================================= */}

      <header className="family-top-header">

        <div>

          <p className="page-eyebrow">
            FAMILY CARE
          </p>

          <h1>
            Hello,{" "}
            {getFirstName(
              user?.name
            )}
          </h1>

          <p>
            Stay connected with the people
            you care about.
          </p>

        </div>


        <div className="patient-header-actions">

          <button
            type="button"
            className="round-header-button"
            aria-label="Notifications"
          >
            <Bell size={18} />
          </button>


          <div className="header-profile">

            <div className="header-avatar">
              <UsersRound size={18} />
            </div>

            <div>

              <strong>
                {user?.name}
              </strong>

              <span>
                Family Guardian
              </span>

            </div>

          </div>

        </div>

      </header>


      {error && (
        <div className="dashboard-error">
          {error}
        </div>
      )}


      {/* =================================================
          INITIAL LOADING
      ================================================= */}

      {loadingPatients ? (

        <FamilyLoading />

      ) : patients.length === 0 ? (

        /* ===============================================
           NO PATIENT:
           SHOW PAIRING DIRECTLY ON DASHBOARD
        =============================================== */

        <ConnectPatient
          onConnected={
            fetchPatients
          }
        />

      ) : (

        <>
          {/* =============================================
              CONNECTED PATIENT SELECTOR
          ============================================= */}

          <section className="family-patient-selector">

            <div className="family-selector-heading">

              <div>

                <span className="section-kicker">
                  MY PATIENTS
                </span>

                <h2>
                  Connected Patients
                </h2>

              </div>


              <div className="family-selector-actions">

                <span className="family-patient-count">
                  {patients.length}
                  {" "}
                  connected
                </span>


                <Link
                  to="/family/connections"
                  className="family-add-patient-link"
                >
                  <Link2 size={13} />

                  Add Patient
                </Link>

              </div>

            </div>


            <div className="family-patient-list">

              {patients.map(
                (patient) => {

                  const selected =
                    patient.patient_id ===
                    selectedPatientId;

                  return (
                    <button
                      key={
                        patient.patient_id
                      }
                      type="button"
                      className={
                        selected
                          ? "family-patient-chip selected"
                          : "family-patient-chip"
                      }
                      onClick={() =>
                        setSelectedPatientId(
                          patient.patient_id
                        )
                      }
                    >

                      <div className="family-patient-avatar">
                        <UserRound size={19} />
                      </div>


                      <div>

                        <strong>
                          {patient.name}
                        </strong>

                        <span>
                          Patient
                        </span>

                      </div>


                      <span className="patient-chip-dot" />

                    </button>
                  );
                }
              )}

            </div>

          </section>


          {/* =============================================
              CURRENT PATIENT
          ============================================= */}

          <section className="family-patient-hero">

            <div className="family-patient-identity">

              <div className="family-lung-visual">
                <LungGraphic />
              </div>


              <div>

                <span className="section-kicker">
                  CURRENTLY VIEWING
                </span>

                <h2>
                  {selectedPatient?.name}
                </h2>

                <p>
                  Respiratory monitoring and
                  care overview
                </p>

              </div>

            </div>


            <div
              className={
                hasSignal
                  ? "family-status-badge online"
                  : "family-status-badge"
              }
            >

              <span />

              {hasSignal
                ? mode === "DEMO"
                  ? "Simulation Active"
                  : "Monitoring Live"
                : "Offline"}

            </div>

          </section>


          {/* =============================================
              RESPIRATORY STATUS
          ============================================= */}

          <section className="current-status-card">

            <div className="section-title-row">

              <div>

                <span className="section-kicker">
                  RESPIRATORY STATUS
                </span>

                <h2>
                  Current Condition
                </h2>

              </div>


              <div
                className={
                  `family-condition-pill ${respiratoryStatus.className}`
                }
              >

                <HeartPulse size={14} />

                {respiratoryStatus.label}

              </div>

            </div>


            <div className="family-status-content">

              <div className="family-big-status">

                <div
                  className={
                    `lung-visual ${respiratoryStatus.className}`
                  }
                >
                  <LungGraphic />
                </div>


                <div>

                  <span>
                    RESPIRATORY STATE
                  </span>

                  <strong
                    className={
                      respiratoryStatus.className
                    }
                  >
                    {
                      respiratoryStatus.label
                    }
                  </strong>

                  <p>
                    {
                      respiratoryStatus.description
                    }
                  </p>

                </div>

              </div>


              <div className="hero-metrics">

                <Metric
                  label="Current BPM"
                  value={
                    rate !== null
                      ? formatNumber(rate)
                      : "--"
                  }
                  suffix={
                    rate !== null
                      ? "BPM"
                      : ""
                  }
                />


                <Metric
                  label="Baseline"
                  value={
                    baseline !== null
                      ? baseline
                      : "--"
                  }
                  suffix={
                    baseline !== null
                      ? "BPM"
                      : ""
                  }
                />


                <Metric
                  label="Deviation"
                  value={
                    deviation !== null
                      ? deviation > 0
                        ? `+${deviation}`
                        : deviation
                      : "--"
                  }
                  suffix={
                    deviation !== null
                      ? "BPM"
                      : ""
                  }
                />


                <Metric
                  label="Signal"
                  value={
                    hasSignal
                      ? quality
                      : "--"
                  }
                />

              </div>

            </div>

          </section>


          {/* =============================================
              WAVEFORM
          ============================================= */}

          <section className="patient-wave-card">

            <div className="patient-wave-header">

              <div>

                <div className="wave-heading">

                  <Activity size={19} />

                  <h2>
                    Live Respiratory Waveform
                  </h2>

                </div>


                <p>
                  {selectedPatient?.name}'s
                  respiratory motion signal
                </p>

              </div>


              <div className="wave-header-right">

                <div
                  className={
                    hasSignal
                      ? "signal-chip good"
                      : "signal-chip"
                  }
                >

                  <Signal size={14} />

                  {hasSignal
                    ? quality
                    : "NO SIGNAL"}

                </div>


                <strong>

                  {rate !== null
                    ? formatNumber(rate)
                    : "--"}

                  <small>
                    {" "}BPM
                  </small>

                </strong>

              </div>

            </div>


            <RespiratoryWaveform
              respiratoryRate={
                hasSignal
                  ? rate
                  : null
              }

              amplitude={
                hasSignal
                  ? amplitude
                  : 0
              }

              signalQuality={
                hasSignal
                  ? quality
                  : "UNKNOWN"
              }

              pattern={
                hasSignal
                  ? pattern
                  : "NO_DATA"
              }

              active={
                hasSignal
              }
            />


            {!hasSignal && (

              <div className="wave-offline-caption">

                <Wifi size={15} />

                No valid respiratory signal is
                currently being received from{" "}
                {selectedPatient?.name}.

              </div>

            )}

          </section>


          {/* =============================================
              LOWER GRID
          ============================================= */}

          <div className="family-lower-grid">

            {/* SUMMARY */}

            <section className="modern-info-card">

              <div className="info-card-heading">

                <div>

                  <span className="section-kicker">
                    CARE OVERVIEW
                  </span>

                  <h3>
                    Patient Summary
                  </h3>

                </div>


                <ShieldCheck size={21} />

              </div>


              <div className="summary-list">

                <SummaryRow
                  label="Patient"
                  value={
                    selectedPatient?.name ||
                    "--"
                  }
                />


                <SummaryRow
                  label="Pattern"
                  value={
                    hasSignal
                      ? formatPattern(
                          pattern
                        )
                      : "--"
                  }
                />


                <SummaryRow
                  label="Signal Quality"
                  value={
                    hasSignal
                      ? quality
                      : "--"
                  }
                />


                <SummaryRow
                  label="Monitoring Source"
                  value={
                    hasSignal
                      ? mode === "DEMO"
                        ? "Simulation"
                        : "ESP32 CSI"
                      : "Offline"
                  }
                />


                <SummaryRow
                  label="Medication"
                  value={
                    medications.length
                      ? `${takenCount}/${medications.length} taken today`
                      : "No schedule"
                  }
                />

              </div>

            </section>


            {/* ===========================================
                MEDICATION
            =========================================== */}

            <section className="family-medication-card">

              <div className="family-medication-heading">

                <div>

                  <span className="section-kicker">
                    TODAY'S CARE
                  </span>

                  <h3>
                    Medication Schedule
                  </h3>

                  <p>
                    Track today's medication
                    adherence for{" "}
                    {selectedPatient?.name}.
                  </p>

                </div>


                <div className="family-pill-icon">
                  <Pill size={20} />
                </div>

              </div>


              {medications.length > 0 && (

                <div className="family-medication-progress">

                  <div>

                    <span>
                      Today's adherence
                    </span>

                    <strong>
                      {takenCount}/
                      {medications.length}
                    </strong>

                  </div>


                  <div className="family-medication-track">

                    <div
                      style={{
                        width:
                          `${
                            (
                              takenCount /
                              medications.length
                            ) * 100
                          }%`,
                      }}
                    />

                  </div>

                </div>

              )}


              {medications.length === 0 ? (

                <div className="family-no-medication">

                  <Pill size={20} />

                  <div>

                    <strong>
                      No medication scheduled
                    </strong>

                    <span>
                      Prescriptions from the
                      patient's doctor will
                      appear here.
                    </span>

                  </div>

                </div>

              ) : (

                <div className="family-medication-list">

                  {medications
                    .slice(0, 4)
                    .map(
                      (medication) => (

                        <FamilyMedication
                          key={
                            medication.id
                          }

                          medication={
                            medication
                          }

                          updating={
                            updatingMedication ===
                            medication.id
                          }

                          onToggle={() =>
                            toggleMedication(
                              medication
                            )
                          }
                        />

                      )
                    )}

                </div>

              )}

          </section>

          </div>

        </>

      )}

    </div>
  );
}


/* =====================================================
   FIRST-TIME FAMILY CONNECTION
===================================================== */

function ConnectPatient({
  onConnected,
}) {
  const [code, setCode] =
    useState("");

  const [connecting, setConnecting] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState(false);


  const handleCodeChange =
    (event) => {

      const value =
        event.target.value
          .toUpperCase()
          .replace(
            /[^A-Z0-9]/g,
            ""
          )
          .slice(0, 6);

      setCode(value);
      setError("");
    };


  const connectPatient =
    async (event) => {

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

        await api.post(
          "/connections/pair",
          {
            code,
          }
        );

        setSuccess(true);


        /*
          Give the success state a tiny moment
          to show, then load the actual patient.
        */

        setTimeout(
          async () => {
            await onConnected();
          },
          450
        );

      } catch (err) {
        console.error(
          "Pairing error:",
          err
        );

        setError(
          err.response?.data?.detail ||
          "Invalid or expired pairing code."
        );

      } finally {
        setConnecting(false);
      }
    };


  return (
    <section className="family-connect-hero">

      {/* LEFT VISUAL */}

      <div className="family-connect-visual">

        <div className="connect-lung-orbit">

          <div className="connect-orbit-ring ring-one" />

          <div className="connect-orbit-ring ring-two" />


          <div className="connect-lung-center">
            <LungGraphic />
          </div>


          <div className="connect-person-bubble family">

            <UsersRound size={18} />

          </div>


          <div className="connect-person-bubble patient">

            <UserRound size={18} />

          </div>


          <div className="connection-line line-one" />

          <div className="connection-line line-two" />

        </div>


        <div className="family-connect-visual-caption">

          <ShieldCheck size={15} />

          Secure care connection

        </div>

      </div>


      {/* RIGHT FORM */}

      <div className="family-connect-content">

        <span className="section-kicker">
          RESPICARE CARE NETWORK
        </span>


        <h2>
          Connect to your patient
        </h2>


        <p>
          Ask the patient to generate a
          temporary pairing code from their
          RespiCare Care Team page. Enter the
          code below to securely connect your
          accounts.
        </p>


        <div className="connection-steps">

          <div>

            <span>
              1
            </span>

            Patient generates code

          </div>


          <ArrowRight size={13} />


          <div>

            <span>
              2
            </span>

            Enter code

          </div>


          <ArrowRight size={13} />


          <div>

            <span>
              3
            </span>

            Connected

          </div>

        </div>


        <form
          className="family-dashboard-pair-form"
          onSubmit={
            connectPatient
          }
        >

          <label>
            PATIENT PAIRING CODE
          </label>


          <div className="family-dashboard-code-input">

            <KeyRound size={19} />


            <input
              type="text"
              value={code}
              onChange={
                handleCodeChange
              }
              placeholder="ABC123"
              maxLength={6}
              autoComplete="off"
              spellCheck="false"
            />

          </div>


          <div className="dashboard-code-progress">

            {[0, 1, 2, 3, 4, 5].map(
              (index) => (

                <span
                  key={index}
                  className={
                    code.length > index
                      ? "active"
                      : ""
                  }
                />

              )
            )}

          </div>


          {error && (

            <div className="family-connect-error">
              {error}
            </div>

          )}


          {success && (

            <div className="family-connect-success">

              <ShieldCheck size={16} />

              Patient connected successfully.
              Opening care dashboard...

            </div>

          )}


          <button
            type="submit"
            className="family-connect-button"
            disabled={
              connecting ||
              success ||
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

            ) : success ? (

              <>
                <ShieldCheck size={17} />

                Connected
              </>

            ) : (

              <>
                <Link2 size={17} />

                Connect Patient

                <ArrowRight size={16} />
              </>

            )}

          </button>

        </form>


        <div className="family-connect-security">

          <ShieldCheck size={17} />


          <div>

            <strong>
              Secure one-time pairing
            </strong>

            <span>
              A valid patient-generated code
              is required. After successful
              pairing, that code cannot be
              reused.
            </span>

          </div>

        </div>

      </div>

    </section>
  );
}


/* =====================================================
   MEDICATION ROW
===================================================== */

function FamilyMedication({
  medication,
  updating,
  onToggle,
}) {
  const taken =
    medication.today?.taken;


  return (
    <div
      className={
        taken
          ? "family-medication-row taken"
          : "family-medication-row"
      }
    >

      <div className="family-medication-time">
        {medication.schedule}
      </div>


      <div className="family-medication-main">

        <div className="medicine-symbol">
          <Pill size={16} />
        </div>


        <div>

          <strong>
            {medication.medicine_name}
          </strong>

          <span>
            {medication.dosage}
          </span>


          {taken &&
            medication.today?.marked_by && (

              <small>
                Marked by{" "}
                {
                  medication.today
                    .marked_by
                }
              </small>

            )}

        </div>

      </div>


      <button
        type="button"
        className={
          taken
            ? "family-medication-check checked"
            : "family-medication-check"
        }
        disabled={updating}
        onClick={onToggle}
        aria-label={
          taken
            ? "Mark medication as not taken"
            : "Mark medication as taken"
        }
      >

        {updating ? (
          <Loader2
            size={15}
            className="spin-icon"
          />
        ) : taken ? (
          "✓"
        ) : (
          ""
        )}

      </button>

    </div>
  );
}


/* =====================================================
   LOADING
===================================================== */

function FamilyLoading() {
  return (
    <div className="family-dashboard-loading">

      <div className="family-loading-icon">
        <HeartPulse size={25} />
      </div>

      <Loader2
        size={18}
        className="spin-icon"
      />

      <span>
        Loading your care network...
      </span>

    </div>
  );
}


/* =====================================================
   METRIC
===================================================== */

function Metric({
  label,
  value,
  suffix,
}) {
  return (
    <div className="hero-metric">

      <span>
        {label}
      </span>

      <strong>

        {value}

        {suffix && (
          <small>
            {" "}
            {suffix}
          </small>
        )}

      </strong>

    </div>
  );
}


/* =====================================================
   SUMMARY ROW
===================================================== */

function SummaryRow({
  label,
  value,
}) {
  return (
    <div className="summary-row">

      <span>
        {label}
      </span>

      <strong>
        {value}
      </strong>

    </div>
  );
}


/* =====================================================
   LUNG GRAPHIC
===================================================== */

function LungGraphic() {
  return (
    <svg
      viewBox="0 0 120 120"
      className="lung-svg"
      aria-label="Respiratory status"
    >

      <path
        d="
          M56 24
          C52 34 50 42 48 52
          C44 44 39 39 34 39
          C23 39 16 52 13 66
          C10 81 15 94 26 96
          C38 98 48 87 51 72
          L56 24
        "
        fill="currentColor"
        opacity="0.88"
      />


      <path
        d="
          M64 24
          C68 34 70 42 72 52
          C76 44 81 39 86 39
          C97 39 104 52 107 66
          C110 81 105 94 94 96
          C82 98 72 87 69 72
          L64 24
        "
        fill="currentColor"
        opacity="0.88"
      />


      <path
        d="M60 17 L60 64"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
      />


      <path
        d="M60 47 L44 63"
        stroke="white"
        strokeWidth="3"
        strokeLinecap="round"
        opacity="0.7"
      />


      <path
        d="M60 47 L76 63"
        stroke="white"
        strokeWidth="3"
        strokeLinecap="round"
        opacity="0.7"
      />

    </svg>
  );
}


/* =====================================================
   STATUS LOGIC
===================================================== */

function getRespiratoryStatus(
  hasSignal,
  pattern,
  quality
) {
  if (!hasSignal) {
    return {
      label: "Offline",
      className: "offline",
      description:
        "Waiting for respiratory monitoring data.",
    };
  }


  if (
    pattern === "MOTION_ARTIFACT"
  ) {
    return {
      label: "Motion Detected",
      className: "watch",
      description:
        "Movement is interfering with respiratory analysis.",
    };
  }


  if (
    quality === "POOR"
  ) {
    return {
      label: "Signal Check",
      className: "watch",
      description:
        "Respiratory signal quality is currently reduced.",
    };
  }


  if (
    pattern === "NORMAL"
  ) {
    return {
      label: "Normal",
      className: "normal",
      description:
        "Breathing is close to the current respiratory baseline.",
    };
  }


  if (
    pattern === "RECOVERY"
  ) {
    return {
      label: "Recovering",
      className: "normal",
      description:
        "Respiratory pattern is returning toward baseline.",
    };
  }


  if (
    pattern === "BREATHING_PAUSE" ||
    pattern === "RESPIRATORY_DISTURBANCE"
  ) {
    return {
      label: "Disturbance",
      className: "watch",
      description:
        "A persistent respiratory-pattern change is being monitored.",
    };
  }


  if (
    pattern === "FAST" ||
    pattern === "FAST_BREATHING" ||
    pattern === "RAPID_BREATHING"
  ) {
    return {
      label: "Fast Breathing",
      className: "watch",
      description:
        "Breathing rate is currently above the respiratory baseline.",
    };
  }


  if (
    pattern === "SLOW" ||
    pattern === "SLOW_BREATHING"
  ) {
    return {
      label: "Slow Breathing",
      className: "watch",
      description:
        "Breathing rate is currently below the respiratory baseline.",
    };
  }


  if (
    pattern === "SHALLOW" ||
    pattern === "SHALLOW_BREATHING"
  ) {
    return {
      label: "Shallow Pattern",
      className: "watch",
      description:
        "A change in respiratory waveform amplitude is being monitored.",
    };
  }


  return {
    label: "Pattern Change",
    className: "watch",
    description:
      "A change from the respiratory baseline is being monitored.",
  };
}


/* =====================================================
   HELPERS
===================================================== */

function formatPattern(value) {
  if (!value) {
    return "Unknown";
  }

  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(
      /\b\w/g,
      (letter) =>
        letter.toUpperCase()
    );
}


function formatNumber(value) {
  const number =
    Number(value);

  if (
    Number.isNaN(number)
  ) {
    return value;
  }

  return Number.isInteger(number)
    ? number
    : number.toFixed(1);
}


function getFirstName(name) {
  if (!name) {
    return "there";
  }

  return name
    .trim()
    .split(/\s+/)[0];
}