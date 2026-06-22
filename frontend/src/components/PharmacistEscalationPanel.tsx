interface PharmacistEscalationPanelProps {
  active: boolean;
  confirmationRequested?: boolean;
  escalationId: string | null;
  onRequest: () => void;
  onStartNewCustomer: () => void;
}

function PharmacistEscalationPanel({
  active,
  confirmationRequested = false,
  escalationId,
  onRequest,
  onStartNewCustomer,
}: PharmacistEscalationPanelProps) {
  const reviewRequested = confirmationRequested && !active;

  return (
    <section
      className={`panel pharmacist-panel${active ? " pharmacist-panel-active" : ""}`}
      aria-label="Pharmacist assistance"
    >
      <div className="pharmacist-icon" aria-hidden="true">
        <span />
      </div>
      <div className="pharmacist-copy">
        <span className="eyebrow">
          {active ? "Ticket recorded" : reviewRequested ? "Review recommended" : "Clinical safety"}
        </span>
        <h2>
          {active
            ? "Pharmacist assistance requested"
            : reviewRequested
              ? "Pharmacist review available"
              : "Pharmacist assistance"}
        </h2>
        <p role={active ? "alert" : undefined}>
          {active
            ? `A pharmacist has been notified${escalationId ? ` · ${escalationId}` : ""}.`
            : reviewRequested
              ? "For personal medicine advice, VitaKiosk can notify an in-store pharmacist."
              : "AI does not diagnose or replace a pharmacist. Request in-store help at any time."}
        </p>
      </div>
      <button type="button" onClick={active ? onStartNewCustomer : onRequest}>
        <span aria-hidden="true">{active ? "↻" : "+"}</span>
        {active ? "Start New Customer" : "Request assistance"}
      </button>
      <span className="pharmacist-availability">
        {active ? "Ready to reset" : reviewRequested ? "Awaiting consent" : "Available"}
      </span>
    </section>
  );
}

export default PharmacistEscalationPanel;
