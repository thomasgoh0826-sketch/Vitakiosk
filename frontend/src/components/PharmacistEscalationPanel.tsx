interface PharmacistEscalationPanelProps {
  active: boolean;
  escalationId: string | null;
  onRequest: () => void;
  onStartNewCustomer: () => void;
}

function PharmacistEscalationPanel({
  active,
  escalationId,
  onRequest,
  onStartNewCustomer,
}: PharmacistEscalationPanelProps) {
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
          {active ? "Ticket recorded" : "Clinical safety"}
        </span>
        <h2>{active ? "Pharmacist assistance requested" : "Pharmacist assistance"}</h2>
        <p role={active ? "alert" : undefined}>
          {active
            ? `A pharmacist has been notified${escalationId ? ` · ${escalationId}` : ""}.`
            : "AI does not diagnose or replace a pharmacist. Request in-store help at any time."}
        </p>
      </div>
      <button type="button" onClick={active ? onStartNewCustomer : onRequest}>
        <span aria-hidden="true">{active ? "↻" : "+"}</span>
        {active ? "Start New Customer" : "Request assistance"}
      </button>
      <span className="pharmacist-availability">
        {active ? "Ready to reset" : "Available"}
      </span>
    </section>
  );
}

export default PharmacistEscalationPanel;
