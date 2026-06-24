import { translations, type KioskTranslations } from "../i18n";

interface PharmacistEscalationPanelProps {
  active: boolean;
  confirmationRequested?: boolean;
  escalationId: string | null;
  labels?: KioskTranslations;
  onRequest: () => void;
  onStartNewCustomer: () => void;
}

function PharmacistEscalationPanel({
  active,
  confirmationRequested = false,
  escalationId,
  labels = translations.en,
  onRequest,
  onStartNewCustomer,
}: PharmacistEscalationPanelProps) {
  const reviewRequested = confirmationRequested && !active;

  return (
    <section
      className={`panel pharmacist-panel${active ? " pharmacist-panel-active" : ""}`}
      aria-label={labels.pharmacistAssistance}
    >
      <div className="pharmacist-icon" aria-hidden="true">
        <span />
      </div>
      <div className="pharmacist-copy">
        <span className="eyebrow">
          {active ? "Ticket recorded" : reviewRequested ? labels.requestPharmacistReview : labels.clinicalSafety}
        </span>
        <h2>
          {active
            ? `${labels.pharmacistAssistance} requested`
            : reviewRequested
              ? labels.requestPharmacistReview
              : labels.pharmacistAssistance}
        </h2>
        <p role={active ? "alert" : undefined}>
          {active
            ? `A pharmacist has been notified${escalationId ? ` · ${escalationId}` : ""}.`
            : reviewRequested
              ? labels.pharmacistAvailable
              : labels.safeHandoffOnly}
        </p>
      </div>
      <button type="button" onClick={active ? onStartNewCustomer : onRequest}>
        <span aria-hidden="true">{active ? "↻" : "+"}</span>
        {active ? labels.startNewCustomer : labels.requestAssistance}
      </button>
      <span className="pharmacist-availability">
        {active ? labels.ready : reviewRequested ? labels.pharmacistAvailable : "Available"}
      </span>
    </section>
  );
}

export default PharmacistEscalationPanel;
