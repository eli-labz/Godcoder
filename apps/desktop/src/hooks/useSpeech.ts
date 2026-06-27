import { useCallback, useEffect, useRef, useState } from "react";

/** Minimal typings for the Web Speech API (not in the DOM lib by default). */
interface SpeechRecognitionLike extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: any) => void) | null;
  onerror: ((e: any) => void) | null;
  onend: (() => void) | null;
}

type RecognitionCtor = new () => SpeechRecognitionLike;

function getRecognitionCtor(): RecognitionCtor | null {
  const w = window as any;
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

const synthSupported = typeof window !== "undefined" && "speechSynthesis" in window;
const recognitionSupported = typeof window !== "undefined" && !!getRecognitionCtor();

/**
 * Web Speech API wrapper: speech-to-text (recognition) + text-to-speech
 * (synthesis). Both feature-detect and degrade gracefully — on platforms
 * where recognition is unavailable (some WebView2 builds), `sttSupported` is
 * false and the listening calls no-op.
 */
export function useSpeech() {
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  // Latest callback for final transcripts, kept in a ref so handlers stay stable.
  const onFinalRef = useRef<(text: string) => void>(() => {});

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setListening(false);
  }, []);

  /** Start dictation. `onFinal` fires with each finalized transcript chunk.
   * `continuous` keeps the mic open until `stopListening` (used by STT toggle
   * and voice-loop); false auto-stops after one utterance (push-to-talk). */
  const startListening = useCallback(
    (onFinal: (text: string) => void, opts?: { continuous?: boolean }) => {
      const Ctor = getRecognitionCtor();
      if (!Ctor) return false;
      // Restart cleanly if already running.
      recognitionRef.current?.abort();

      const rec = new Ctor();
      rec.lang = navigator.language || "en-US";
      rec.continuous = opts?.continuous ?? true;
      rec.interimResults = true;
      onFinalRef.current = onFinal;

      rec.onresult = (e: any) => {
        let finalText = "";
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const res = e.results[i];
          if (res.isFinal) finalText += res[0].transcript;
        }
        if (finalText.trim()) onFinalRef.current(finalText.trim());
      };
      rec.onerror = () => setListening(false);
      rec.onend = () => {
        setListening(false);
        recognitionRef.current = null;
      };

      recognitionRef.current = rec;
      try {
        rec.start();
        setListening(true);
        return true;
      } catch {
        setListening(false);
        return false;
      }
    },
    [],
  );

  const cancelSpeak = useCallback(() => {
    if (synthSupported) window.speechSynthesis.cancel();
    setSpeaking(false);
  }, []);

  /** Speak `text` aloud, cancelling anything already in progress. */
  const speak = useCallback(
    (text: string) => {
      if (!synthSupported || !text.trim()) return;
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = navigator.language || "en-US";
      utter.onend = () => setSpeaking(false);
      utter.onerror = () => setSpeaking(false);
      setSpeaking(true);
      window.speechSynthesis.speak(utter);
    },
    [],
  );

  // Stop the mic / voice on unmount so nothing keeps running off-screen.
  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
      if (synthSupported) window.speechSynthesis.cancel();
    };
  }, []);

  return {
    sttSupported: recognitionSupported,
    ttsSupported: synthSupported,
    listening,
    speaking,
    startListening,
    stopListening,
    speak,
    cancelSpeak,
  };
}
