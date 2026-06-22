import { useEffect, useMemo, useState } from "react";

import type { AvatarState } from "../types";


export const SUBTITLE_CUE_MS = 1_800;
const MIN_SUBTITLE_CUE_MS = 1_250;
const MAX_SUBTITLE_CUE_MS = 3_200;
const MAX_CHUNK_CHARACTERS = 78;

const SENTENCE_PUNCTUATION = new Set([".", "!", "?", "。", "！", "？"]);

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function splitLongChunk(chunk: string) {
  if (chunk.length <= MAX_CHUNK_CHARACTERS) {
    return [chunk];
  }

  const words = chunk.split(/\s+/u);
  const chunks: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > MAX_CHUNK_CHARACTERS && current) {
      chunks.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) {
    chunks.push(current);
  }
  return chunks;
}

export function splitSubtitleChunks(text: string) {
  const normalized = text.replace(/\s+/gu, " ").trim();
  if (!normalized) {
    return [];
  }

  const sentenceChunks: string[] = [];
  let start = 0;
  for (let index = 0; index < normalized.length; index += 1) {
    const character = normalized[index];
    const previous = normalized[index - 1] ?? "";
    const next = normalized[index + 1] ?? "";
    const isDecimalPoint =
      character === "." && /\d/u.test(previous) && /\d/u.test(next);
    if (SENTENCE_PUNCTUATION.has(character) && !isDecimalPoint) {
      sentenceChunks.push(normalized.slice(start, index + 1).trim());
      start = index + 1;
    }
  }
  const finalChunk = normalized.slice(start).trim();
  if (finalChunk) {
    sentenceChunks.push(finalChunk);
  }

  return sentenceChunks.flatMap(splitLongChunk);
}

export function estimateSubtitleCueMs(chunks: string[], audioDurationMs?: number) {
  if (audioDurationMs && Number.isFinite(audioDurationMs) && chunks.length > 0) {
    return clamp(audioDurationMs / chunks.length, MIN_SUBTITLE_CUE_MS, MAX_SUBTITLE_CUE_MS);
  }
  return SUBTITLE_CUE_MS;
}

interface UseSubtitlePlaybackOptions {
  text: string;
  state: AvatarState;
  audioDurationMs?: number;
}

export function useSubtitlePlayback({
  text,
  state,
  audioDurationMs,
}: UseSubtitlePlaybackOptions) {
  const chunks = useMemo(() => splitSubtitleChunks(text), [text]);
  const cueMs = useMemo(
    () => estimateSubtitleCueMs(chunks, audioDurationMs),
    [audioDurationMs, chunks],
  );
  const [chunkIndex, setChunkIndex] = useState(0);

  useEffect(() => {
    setChunkIndex(0);
    if (state !== "speaking" || chunks.length <= 1) {
      return undefined;
    }

    let cursor = 0;
    const timer = window.setInterval(() => {
      cursor += 1;
      setChunkIndex(cursor);
      if (cursor >= chunks.length - 1) {
        window.clearInterval(timer);
      }
    }, cueMs);

    return () => window.clearInterval(timer);
  }, [chunks, cueMs, state]);

  return {
    subtitle: chunks[chunkIndex] ?? "",
    chunks,
    chunkIndex,
    cueMs,
    isStreaming: state === "speaking" && chunks.length > 1,
  };
}
