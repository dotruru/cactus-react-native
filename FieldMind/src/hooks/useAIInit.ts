import { useState, useEffect } from 'react';
import AIService from '../services/AIService';

interface InitProgress {
  stt: { status: 'pending' | 'downloading' | 'ready' | 'error'; progress: number; error?: string };
  lm: { status: 'pending' | 'downloading' | 'ready' | 'error'; progress: number; error?: string };
  vision: { status: 'pending' | 'downloading' | 'ready' | 'error'; progress: number; error?: string };
}

export function useAIInit(corpusDir?: string) {
  const [isReady, setIsReady] = useState(false);
  const [sttReady, setSttReady] = useState(false);
  const [progress, setProgress] = useState<InitProgress>({
    stt: { status: 'pending', progress: 0 },
    lm: { status: 'pending', progress: 0 },
    vision: { status: 'pending', progress: 0 },
  });
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    async function init() {
      console.log('useAIInit: Starting AI initialization...');
      
      // Initialize STT first (most important for voice)
      try {
        setProgress(p => ({ ...p, stt: { status: 'downloading', progress: 0 } }));
        console.log('useAIInit: Initializing STT...');
        await AIService.initSTT();
        setProgress(p => ({ ...p, stt: { status: 'ready', progress: 100 } }));
        setSttReady(true);
        console.log('useAIInit: STT ready!');
      } catch (e) {
        const errMsg = e instanceof Error ? e.message : 'STT init failed';
        console.error('useAIInit: STT initialization failed:', errMsg);
        setProgress(p => ({ ...p, stt: { status: 'error', progress: 0, error: errMsg } }));
      }

      // Initialize LM (for RAG queries)
      try {
        setProgress(p => ({ ...p, lm: { status: 'downloading', progress: 0 } }));
        console.log('useAIInit: Initializing LM...');
        await AIService.initLM(corpusDir);
        setProgress(p => ({ ...p, lm: { status: 'ready', progress: 100 } }));
        console.log('useAIInit: LM ready!');
      } catch (e) {
        const errMsg = e instanceof Error ? e.message : 'LM init failed';
        console.error('useAIInit: LM initialization failed:', errMsg);
        setProgress(p => ({ ...p, lm: { status: 'error', progress: 0, error: errMsg } }));
      }

      // Initialize Vision (for photo analysis)
      try {
        setProgress(p => ({ ...p, vision: { status: 'downloading', progress: 0 } }));
        console.log('useAIInit: Initializing Vision...');
        await AIService.initVision();
        setProgress(p => ({ ...p, vision: { status: 'ready', progress: 100 } }));
        console.log('useAIInit: Vision ready!');
      } catch (e) {
        const errMsg = e instanceof Error ? e.message : 'Vision init failed';
        console.error('useAIInit: Vision initialization failed:', errMsg);
        setProgress(p => ({ ...p, vision: { status: 'error', progress: 0, error: errMsg } }));
      }

      // Mark as ready even if some components failed (graceful degradation)
      setIsReady(true);
      console.log('useAIInit: Initialization complete');
    }
    
    init();
    
    return () => { 
      console.log('useAIInit: Cleaning up...');
      AIService.destroyAll(); 
    };
  }, [corpusDir]);
  
  return { isReady, sttReady, progress, error };
}
