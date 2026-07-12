import { useState, useEffect, useRef, useCallback } from 'react';
import { Question } from '../types';

const POSITIVE_WORDS = ['sim', 'claro', 'ótimo', 'bom', 'gostei', 'certeza', 'ok', 'beleza', 'excelente', 'rápido'];
const NEGATIVE_WORDS = ['não', 'ruim', 'péssimo', 'errado', 'difícil', 'problema', 'demora', 'caro', 'infelizmente'];

const analyzeSentiment = (text: string) => {
  const lower = text.toLowerCase();

  const isPositive = POSITIVE_WORDS.some(w => lower.includes(w));
  const isNegative = NEGATIVE_WORDS.some(w => lower.includes(w));

  if (isPositive && !isNegative) return 'positive';
  if (isNegative && !isPositive) return 'negative';
  return 'neutral';
};

export function useVoiceConversation(questions: Question[], speed: number = 1.1) {
  const [status, setStatus] = useState<'idle' | 'speaking' | 'listening' | 'processing' | 'completed'>('idle');
  const [transcript, setTranscript] = useState<{role: 'agent'|'user', text: string}[]>([]);
  const [sentiment, setSentiment] = useState<'positive' | 'neutral' | 'negative'>('neutral');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const recognitionRef = useRef<any>(null);
  const [isSupported, setIsSupported] = useState(false);

  // Keep track of latest state for callbacks
  const stateRef = useRef({ questions, currentQuestionIndex, speed });
  useEffect(() => {
    stateRef.current = { questions, currentQuestionIndex, speed };
  }, [questions, currentQuestionIndex, speed]);

  const speak = useCallback((text: string, isFinal = false) => {
    setStatus('speaking');
    setTranscript(prev => [...prev, { role: 'agent', text }]);

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'pt-BR';
        utterance.rate = stateRef.current.speed;

        utterance.onend = () => {
            if (!isFinal) {
                setStatus('listening');
                try {
                  recognitionRef.current?.start();
                } catch (e) {
                  console.log("Recognition already started or error", e);
                }
            } else {
                setStatus('completed');
            }
        };
        window.speechSynthesis.speak(utterance);
    } else {
       // Fallback for no TTS
       setTimeout(() => {
           if (!isFinal) setStatus('listening');
           else setStatus('completed');
       }, 2000);
    }
  }, []);

  const handleUserResponse = useCallback((text: string) => {
    setStatus('processing');
    setTranscript(prev => [...prev, { role: 'user', text }]);
    setSentiment(analyzeSentiment(text));

    const { questions, currentQuestionIndex } = stateRef.current;

    setTimeout(() => {
      const nextIndex = currentQuestionIndex + 1;
      if (nextIndex < questions.length) {
        setCurrentQuestionIndex(nextIndex);
        speak(questions[nextIndex].text, false);
      } else {
        speak("Obrigada pelas respostas. Entraremos em contato em breve.", true);
      }
    }, 1500);
  }, [speak]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        setIsSupported(true);
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.lang = 'pt-BR';
        recognition.interimResults = true;

        recognition.onresult = (event: any) => {
          let finalTranscript = '';
          let interimTranscript = '';

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript;
            } else {
              interimTranscript += event.results[i][0].transcript;
            }
          }

          if (interimTranscript) {
             setSentiment(analyzeSentiment(interimTranscript));
          }

          if (finalTranscript) {
             handleUserResponse(finalTranscript);
          }
        };

        recognition.onerror = (event: any) => {
          console.error('Speech recognition error', event.error);
          if (event.error === 'no-speech') {
              // Maybe restart listening?
          }
        };

        recognitionRef.current = recognition;
      }
    }
  }, [handleUserResponse]);

  const startCall = () => {
    if (questions.length > 0) {
      setCurrentQuestionIndex(0);
      setTranscript([]);
      speak(questions[0].text, false);
    }
  };

  const submitTextResponse = (text: string) => {
      if (status === 'listening') {
          handleUserResponse(text);
      }
  };

  return { status, transcript, sentiment, startCall, isSupported, submitTextResponse };
}