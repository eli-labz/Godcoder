import { useCallback, useEffect, useRef, useState } from "react";
import { Tooltip } from "antd";
import { Mic, Radio, Volume2, AudioLines } from "lucide-react";
import { useSpeech } from "@/hooks/useSpeech";

interface VoiceControlsProps {
  /** Append a dictated transcript chunk to the composer. */
  onTranscript: (text: string) => void;
  /** Send a finalized transcript directly (used by voice-to-voice). */
  onSend?: (text: string) => void;
  /** Latest agent reply text — read aloud when TTS / voice-loop is on. */
  replyText?: string;
  /** Identity of the latest reply; changing it triggers a fresh read-aloud. */
  replyId?: string;
  /** Icon size; smaller for narrow toolbars. */
  size?: number;
}

/** TTS / STT / Voice-to-Voice / Push-to-Talk icon buttons for the composer.
 * Self-contained: owns speech recognition + synthesis and the hands-free loop.
 * Consumers feed it the latest reply (to read aloud) and the dictation/send
 * callbacks. Buttons disable themselves where the platform lacks support. */
export default function VoiceControls({ onTranscript, onSend, replyText, replyId, size = 16 }: VoiceControlsProps) {
  const { sttSupported, ttsSupported, listening, speaking, startListening, stopListening, speak, cancelSpeak } =
    useSpeech();

  const [ttsEnabled, setTtsEnabled] = useState(false);
  const [voiceLoop, setVoiceLoop] = useState(false);
  const [pttActive, setPttActive] = useState(false);

  // Keep mutable state available to stable callbacks/effects without re-binding.
  const voiceLoopRef = useRef(voiceLoop);
  voiceLoopRef.current = voiceLoop;
  const lastSpokenRef = useRef<string | undefined>(undefined);

  const handleFinal = useCallback(
    (text: string) => {
      if (voiceLoopRef.current && onSend) onSend(text);
      else onTranscript(text);
    },
    [onSend, onTranscript],
  );

  // ── Speech-to-text (toggle) ──────────────────────────────────────────────
  const toggleStt = useCallback(() => {
    if (listening) stopListening();
    else startListening(handleFinal, { continuous: true });
  }, [listening, startListening, stopListening, handleFinal]);

  // ── Push-to-talk (hold) ──────────────────────────────────────────────────
  const startPtt = useCallback(() => {
    if (!sttSupported) return;
    setPttActive(true);
    startListening(handleFinal, { continuous: true });
  }, [sttSupported, startListening, handleFinal]);

  const endPtt = useCallback(() => {
    setPttActive((was) => {
      if (was) stopListening();
      return false;
    });
  }, [stopListening]);

  // ── Text-to-speech: read each new reply aloud ────────────────────────────
  useEffect(() => {
    if (!replyId || !replyText) return;
    if (lastSpokenRef.current === replyId) return;
    if (!ttsEnabled && !voiceLoop) return;
    lastSpokenRef.current = replyId;
    speak(replyText);
  }, [replyId, replyText, ttsEnabled, voiceLoop, speak]);

  // ── Voice-to-voice: re-open the mic once the reply finishes speaking ─────
  useEffect(() => {
    if (voiceLoop && !speaking && !listening) {
      startListening(handleFinal, { continuous: true });
    }
    // Intentionally keyed on `speaking` so the mic reopens after each reply,
    // not on every `listening` flip (which would tight-loop on silence).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voiceLoop, speaking]);

  const toggleTts = useCallback(() => {
    setTtsEnabled((on) => {
      if (on) cancelSpeak();
      return !on;
    });
  }, [cancelSpeak]);

  const toggleVoiceLoop = useCallback(() => {
    setVoiceLoop((on) => {
      const next = !on;
      if (next) setTtsEnabled(true);
      else {
        stopListening();
        cancelSpeak();
      }
      return next;
    });
  }, [stopListening, cancelSpeak]);

  const sttActive = listening && !pttActive;

  const base =
    "flex items-center justify-center p-1.5 rounded-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed";
  const idle = "text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-[var(--hover-bg)]";
  const on = "text-white bg-blue-600 hover:bg-blue-700";

  return (
    <div className="flex items-center gap-0.5">
      <Tooltip title={ttsSupported ? (ttsEnabled ? "Read replies aloud: on" : "Read replies aloud (TTS)") : "Text-to-speech unavailable"}>
        <button
          type="button"
          aria-label="Toggle read replies aloud"
          disabled={!ttsSupported}
          onClick={toggleTts}
          className={`${base} ${ttsEnabled || speaking ? on : idle}`}
        >
          <Volume2 size={size} />
        </button>
      </Tooltip>

      <Tooltip title={sttSupported ? (sttActive ? "Stop dictation" : "Dictate (speech-to-text)") : "Speech recognition unavailable"}>
        <button
          type="button"
          aria-label="Toggle dictation"
          disabled={!sttSupported}
          onClick={toggleStt}
          className={`${base} ${sttActive ? on : idle}`}
        >
          <Mic size={size} />
        </button>
      </Tooltip>

      <Tooltip title={sttSupported && ttsSupported ? (voiceLoop ? "Voice-to-voice: on" : "Voice-to-voice (hands-free)") : "Voice-to-voice unavailable"}>
        <button
          type="button"
          aria-label="Toggle voice-to-voice"
          disabled={!sttSupported || !ttsSupported}
          onClick={toggleVoiceLoop}
          className={`${base} ${voiceLoop ? on : idle}`}
        >
          <AudioLines size={size} />
        </button>
      </Tooltip>

      <Tooltip title={sttSupported ? "Push to talk (hold)" : "Push-to-talk unavailable"}>
        <button
          type="button"
          aria-label="Push to talk"
          disabled={!sttSupported}
          onPointerDown={startPtt}
          onPointerUp={endPtt}
          onPointerLeave={endPtt}
          onPointerCancel={endPtt}
          className={`${base} ${pttActive ? on : idle}`}
        >
          <Radio size={size} />
        </button>
      </Tooltip>
    </div>
  );
}
