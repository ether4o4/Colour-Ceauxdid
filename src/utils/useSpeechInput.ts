/**
 * Tap-to-talk voice input. Wraps expo-speech-recognition into a small hook:
 * partial transcripts stream out via onPartial (live text in the box), and the
 * final transcript fires onFinal (where the caller sends it).
 */
import { useCallback, useState } from 'react';
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';

interface Options {
  onPartial?: (text: string) => void;
  onFinal?: (text: string) => void;
  lang?: string;
}

export function useSpeechInput({ onPartial, onFinal, lang = 'en-US' }: Options) {
  const [listening, setListening] = useState(false);

  useSpeechRecognitionEvent('start', () => setListening(true));
  useSpeechRecognitionEvent('end', () => setListening(false));
  useSpeechRecognitionEvent('error', () => setListening(false));
  useSpeechRecognitionEvent('result', (event) => {
    const text = event.results?.[0]?.transcript ?? '';
    if (!text) return;
    if (event.isFinal) onFinal?.(text);
    else onPartial?.(text);
  });

  const start = useCallback(async () => {
    try {
      const perm = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!perm.granted) return;
      ExpoSpeechRecognitionModule.start({
        lang,
        interimResults: true,
        continuous: false,
      });
    } catch {
      setListening(false);
    }
  }, [lang]);

  const stop = useCallback(() => {
    try { ExpoSpeechRecognitionModule.stop(); } catch {}
  }, []);

  return { listening, start, stop };
}
