import {
  Check,
  CheckCircle2,
  Clock3,
  Pill,
  RefreshCw,
  Stethoscope,
} from "lucide-react";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import { useAuth } from "../../context/AuthContext";
import api from "../../services/api";


export default function PatientMedications() {
  const { user } = useAuth();

  const [medications, setMedications] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [updating, setUpdating] =
    useState(null);

  const [error, setError] =
    useState("");


  const loadMedications =
    useCallback(async () => {
      if (!user?.id) return;

      try {
        const response =
          await api.get(
            `/medications/patient/${user.id}`
          );

        setMedications(
          response.data || []
        );

        setError("");
      } catch (err) {
        console.error(err);

        setError(
          "Unable to load medication schedule."
        );
      } finally {
        setLoading(false);
      }
    }, [user?.id]);


  useEffect(() => {
    loadMedications();
  }, [loadMedications]);


  const toggleMedication =
    async (medication) => {
      try {
        setUpdating(
          medication.id
        );

        await api.post(
          "/medications/taken",
          {
            prescription_id:
              medication.id,

            taken:
              !medication.today.taken,
          }
        );

        await loadMedications();
      } catch (err) {
        setError(
          err.response?.data?.detail ||
          "Unable to update medication."
        );
      } finally {
        setUpdating(null);
      }
    };


  const completed =
    medications.filter(
      (item) =>
        item.today?.taken
    ).length;


  return (
    <>
      <header className="dashboard-header">
        <div>
          <p className="page-eyebrow">
            CARE PLAN
          </p>

          <h1>
            Medications
          </h1>

          <p>
            Your prescribed medication
            schedule and today's adherence.
          </p>
        </div>

        <div className="medication-page-count">
          <CheckCircle2 size={18} />

          <div>
            <strong>
              {completed}/
              {medications.length}
            </strong>

            <span>
              taken today
            </span>
          </div>
        </div>
      </header>


      {error && (
        <div className="dashboard-error">
          {error}
        </div>
      )}


      <section className="medication-progress-card">
        <div className="medication-progress-top">
          <div>
            <span>
              TODAY'S ADHERENCE
            </span>

            <strong>
              {medications.length === 0
                ? "No medicines scheduled"
                : completed ===
                    medications.length
                  ? "Schedule complete"
                  : `${medications.length - completed} remaining`}
            </strong>
          </div>

          <span>
            {medications.length
              ? Math.round(
                  (
                    completed /
                    medications.length
                  ) * 100
                )
              : 0}
            %
          </span>
        </div>

        <div className="medication-progress-track">
          <div
            className="medication-progress-fill"
            style={{
              width:
                medications.length
                  ? `${
                      (
                        completed /
                        medications.length
                      ) * 100
                    }%`
                  : "0%",
            }}
          />
        </div>
      </section>


      {loading ? (
        <div className="medication-loading">
          <RefreshCw
            size={21}
            className="spin-icon"
          />

          Loading medication schedule...
        </div>
      ) : medications.length === 0 ? (
        <div className="empty-medications-card">
          <div>
            <Pill size={30} />
          </div>

          <h2>
            No active prescriptions
          </h2>

          <p>
            Medicines prescribed by your
            connected doctor will automatically
            appear here.
          </p>
        </div>
      ) : (
        <section className="medication-page-list">
          {medications.map(
            (medication) => (
              <MedicationItem
                key={medication.id}
                medication={
                  medication
                }
                updating={
                  updating ===
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
        </section>
      )}
    </>
  );
}


function MedicationItem({
  medication,
  updating,
  onToggle,
}) {
  const taken =
    medication.today?.taken;

  return (
    <article
      className={
        taken
          ? "full-medication-card taken"
          : "full-medication-card"
      }
    >
      <div className="full-medication-icon">
        <Pill size={23} />
      </div>


      <div className="full-medication-content">
        <div className="full-medication-title">
          <div>
            <h3>
              {medication.medicine_name}
            </h3>

            <span>
              {medication.dosage}
            </span>
          </div>

          {taken && (
            <span className="taken-badge">
              <Check size={13} />
              Taken
            </span>
          )}
        </div>


        <div className="medication-details-grid">
          <div>
            <Clock3 size={15} />

            <span>
              Schedule
            </span>

            <strong>
              {medication.schedule}
            </strong>
          </div>

          <div>
            <Stethoscope size={15} />

            <span>
              Prescribed by
            </span>

            <strong>
              Dr. {medication.doctor_name}
            </strong>
          </div>
        </div>


        {medication.instructions && (
          <div className="medication-instructions">
            {medication.instructions}
          </div>
        )}


        {taken &&
          medication.today?.marked_by && (
            <p className="marked-by-text">
              Marked taken by{" "}
              <strong>
                {
                  medication.today
                    .marked_by
                }
              </strong>
            </p>
          )}
      </div>


      <button
        className={
          taken
            ? "large-medication-check checked"
            : "large-medication-check"
        }
        onClick={onToggle}
        disabled={updating}
        title={
          taken
            ? "Mark as not taken"
            : "Mark as taken"
        }
      >
        {updating ? (
          <RefreshCw
            size={17}
            className="spin-icon"
          />
        ) : taken ? (
          <Check size={19} />
        ) : null}
      </button>
    </article>
  );
}