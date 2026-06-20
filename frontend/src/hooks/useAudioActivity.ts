import { useEffect, useState } from "react";


export function calculateAudioActivity(samples: Uint8Array): number {
  if (samples.length === 0) {
    return 0;
  }
  let sum = 0;
  for (const sample of samples) {
    const normalized = (sample - 128) / 128;
    sum += normalized * normalized;
  }
  return Math.min(1, Math.sqrt(sum / samples.length));
}

type AudioContextConstructor = new () => AudioContext;

export function useAudioActivity(audioElement: HTMLAudioElement | null): number {
  const [activity, setActivity] = useState(0);

  useEffect(() => {
    if (!audioElement) {
      setActivity(0);
      return;
    }

    const browserWindow = window as typeof window & {
      webkitAudioContext?: AudioContextConstructor;
    };
    const Context = window.AudioContext ?? browserWindow.webkitAudioContext;
    if (!Context) {
      return;
    }

    const context = new Context();
    const source = context.createMediaElementSource(audioElement);
    const analyser = context.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);
    analyser.connect(context.destination);

    const samples = new Uint8Array(analyser.fftSize);
    let frame = 0;
    const measure = () => {
      analyser.getByteTimeDomainData(samples);
      setActivity(calculateAudioActivity(samples));
      frame = window.requestAnimationFrame(measure);
    };
    frame = window.requestAnimationFrame(measure);

    return () => {
      window.cancelAnimationFrame(frame);
      source.disconnect();
      analyser.disconnect();
      void context.close();
      setActivity(0);
    };
  }, [audioElement]);

  return activity;
}
