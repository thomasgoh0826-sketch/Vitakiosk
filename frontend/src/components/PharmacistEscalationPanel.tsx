import { translations, type KioskTranslations } from "../i18n";

interface PharmacistEscalationPanelProps {
  active: boolean;
  confirmationRequested?: boolean;
  escalationId: string | null;
  requestPending?: boolean;
  requestError?: string | null;
  labels?: KioskTranslations;
  onRequest: () => void;
  onStartNewCustomer: () => void;
}

function PharmacistEscalationPanel({
  active,
  confirmationRequested = false,
  escalationId,
  requestPending = false,
  requestError = null,
  labels = translations.en,
  onRequest,
  onStartNewCustomer,
}: PharmacistEscalationPanelProps) {
  const reviewRequested = (confirmationRequested || requestPending || Boolean(requestError)) && !active;
  const buttonLabel = active
    ? labels.startNewCustomer
    : requestPending
      ? "Requesting..."
      : requestError
        ? "Try again"
        : labels.requestAssistance;

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
          {active
            ? "Ticket recorded"
            : requestPending
              ? "Contacting pharmacist"
              : reviewRequested
                ? labels.requestPharmacistReview
                : labels.clinicalSafety}
        </span>
        <h2>
          {active
            ? `${labels.pharmacistAssistance} requested`
            : requestPending
              ? "Requesting pharmacist assistance"
              : reviewRequested
              ? labels.requestPharmacistReview
              : labels.pharmacistAssistance}
        </h2>
        <p role={active || requestError ? "alert" : undefined}>
          {active
            ? `A pharmacist has been notified${escalationId ? ` · ${escalationId}` : ""}.`
            : requestPending
              ? "Please wait while I notify the pharmacist."
              : requestError
                ? requestError
            : reviewRequested
              ? labels.pharmacistAvailable
              : labels.safeHandoffOnly}
        </p>
      </div>
      <button
        type="button"
        onClick={active ? onStartNewCustomer : onRequest}
        disabled={requestPending}
        aria-busy={requestPending ? "true" : undefined}
      >
        <span aria-hidden="true">{active ? "↻" : "+"}</span>
        {buttonLabel}
      </button>
      <span className="pharmacist-availability">
        {active ? labels.ready : requestPending ? "Requesting" : reviewRequested ? labels.pharmacistAvailable : "Available"}
      </span>
    </section>
  );
}

export default PharmacistEscalationPanel;
