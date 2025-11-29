import { useState, useCallback } from 'react';
import AudioService from '../services/AudioService';

export function useVoiceRecording() {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  
  const startRecording = useCallback(async () => {
    console.log('useVoiceRecording: startRecording called');
    setIsRecording(true);
    setDuration(0);
    try {
      await AudioService.startRecording();
    } catch (e) {
      console.error('useVoiceRecording: startRecording failed', e);
      setIsRecording(false);
    }
  }, []);
  
  const stopRecording = useCallback(async () => {
    console.log('useVoiceRecording: stopRecording called');
    setIsRecording(false);
    try {
      const path = await AudioService.stopRecording();
      return path;
    } catch (e) {
      console.error('useVoiceRecording: stopRecording failed', e);
      return '';
    }
  }, []);
  
  return { isRecording, duration, startRecording, stopRecording };
}

