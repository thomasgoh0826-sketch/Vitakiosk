interface PharmacistEscalationPanelProps {
  active: boolean;
  escalationId: string | null;
  onRequest: () => void;
}

function PharmacistEscalationPanel({
  active,
  escalationId,
  onRequest,
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
          {active ? "Safety escalation active" : "Clinical safety"}
        </span>
        <h2>{active ? "Safety handoff active" : "Pharmacist assistance"}</h2>
        <p role={active ? "alert" : undefined}>
          {active
            ? `A pharmacist has been requested${escalationId ? ` · ${escalationId}` : ""}.`
            : "AI does not diagnose or replace a pharmacist. Request in-store help at any time."}
        </p>
      </div>
      <button type="button" onClick={onRequest}>
        <span aria-hidden="true">+</span>
        Request assistance
      </button>
      <span className="pharmacist-availability">
        {active ? "Escalated" : "Available"}
      </span>
    </section>
  );
}

export default PharmacistEscalationPanel;
