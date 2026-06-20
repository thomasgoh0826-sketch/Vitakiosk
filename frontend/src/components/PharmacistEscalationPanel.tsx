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
      <div>
        <h2>Pharmacist assistance</h2>
        <p role={active ? "alert" : undefined}>
          {active
            ? `A pharmacist has been requested${escalationId ? ` · ${escalationId}` : ""}.`
            : "Need help with this product? A pharmacist can assist in store."}
        </p>
      </div>
      <button type="button" onClick={onRequest}>Request assistance</button>
      <span>{active ? "Escalated" : "Available"}</span>
    </section>
  );
}

export default PharmacistEscalationPanel;
