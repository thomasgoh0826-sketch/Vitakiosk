import { useCallback, useState } from "react";


interface HoldToSpeakButtonProps {
  onStart: () => void;
  onStop: () => void;
  disabled: boolean;
}

const HOLD_KEYS = new Set([" ", "Enter"]);

function HoldToSpeakButton({ onStart, onStop, disabled }: HoldToSpeakButtonProps) {
  const [active, setActive] = useState(false);

  const start = useCallback(() => {
    if (disabled || active) {
      return;
    }
    setActive(true);
    onStart();
  }, [active, disabled, onStart]);

  const stop = useCallback(() => {
    if (!active) {
      return;
    }
    setActive(false);
    onStop();
  }, [active, onStop]);

  return (
    <button
      className={`hold-button${active ? " hold-button-active" : ""}`}
      type="button"
      aria-pressed={active}
      disabled={disabled}
      onPointerDown={start}
      onPointerUp={stop}
      onPointerCancel={stop}
      onPointerLeave={stop}
      onKeyDown={(event) => {
        if (HOLD_KEYS.has(event.key)) {
          event.preventDefault();
          if (!event.repeat) {
            start();
          }
        }
      }}
      onKeyUp={(event) => {
        if (HOLD_KEYS.has(event.key)) {
          event.preventDefault();
          stop();
        }
      }}
    >
      <span className="microphone" aria-hidden="true" />
      {active ? "Listening… release to send" : "Hold to Speak"}
    </button>
  );
}

export default HoldToSpeakButton;
