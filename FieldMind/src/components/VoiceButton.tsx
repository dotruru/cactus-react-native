import React, { useRef, useState } from 'react';
import { Pressable, Text, StyleSheet, Animated, View, Alert } from 'react-native';
import { useVoiceRecording } from '../hooks/useVoiceRecording';
import type { UseCactusSTTResult } from 'cactus-react-native';

interface Props {
  onTranscription: (text: string) => void;
  language?: string;
  disabled?: boolean;
  stt?: UseCactusSTTResult;
  sttReady?: boolean;
}

const MIN_RECORDING_DURATION_MS = 1000; // Increased to 1 second for better audio

export function VoiceButton({ onTranscription, language = 'en', disabled = false, stt, sttReady = false }: Props) {
  const { isRecording, startRecording, stopRecording } = useVoiceRecording();
  const scale = useRef(new Animated.Value(1)).current;
  const recordingStartTime = useRef<number | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const handlePressIn = async () => {
    if (disabled) return;
    
    console.log('VoiceButton: Press In');
    Animated.spring(scale, { toValue: 1.2, useNativeDriver: true }).start();
    recordingStartTime.current = Date.now();
    try {
      await startRecording();
    } catch (e) {
      console.error('VoiceButton: Failed to start recording', e);
      recordingStartTime.current = null;
    }
  };
  
  const handlePressOut = async () => {
    if (disabled) return;
    
    console.log('VoiceButton: Press Out');
    Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();
    
    if (!recordingStartTime.current) {
      console.log('VoiceButton: Recording was not started, skipping stop');
      return;
    }
    
    const elapsed = Date.now() - recordingStartTime.current;
    if (elapsed < MIN_RECORDING_DURATION_MS) {
      const waitTime = MIN_RECORDING_DURATION_MS - elapsed;
      console.log(`VoiceButton: Waiting ${waitTime}ms for minimum duration`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    recordingStartTime.current = null;
    
    try {
      setIsProcessing(true);
      const audioPath = await stopRecording();
      console.log('VoiceButton: Recording stopped at', audioPath);
      
      if (audioPath && stt && sttReady) {
        console.log('VoiceButton: Starting transcription...');
        
        // Remove file:// prefix if present - native code expects raw path
        const cleanAudioPath = audioPath.replace(/^file:\/\//, '');
        console.log('VoiceButton: Audio path (clean):', cleanAudioPath);
        console.log('VoiceButton: Language:', language);
        
        // Use Whisper prompt format
        const prompt = `<|startoftranscript|><|${language}|><|transcribe|><|notimestamps|>`;
        console.log('VoiceButton: Prompt:', prompt);
        
        try {
          const result = await stt.transcribe({ 
            audioFilePath: cleanAudioPath,
            prompt: prompt,
          });
          
          console.log('VoiceButton: Transcription result:', JSON.stringify(result, null, 2));
          
          if (result.success && result.response) {
            const text = result.response.trim();
            console.log('VoiceButton: Transcribed text:', text);
            onTranscription(text);
          } else if (!result.success) {
            console.error('VoiceButton: Transcription failed:', result.response);
            Alert.alert('Transcription Failed', result.response || 'Unknown error');
          } else {
            console.warn('VoiceButton: Empty transcription response');
            onTranscription('(no speech detected)');
          }
        } catch (transcribeError: any) {
          console.error('VoiceButton: Transcribe error:', transcribeError);
          
          // Check if it's a format error
          if (transcribeError?.message?.includes('transcription failed')) {
            Alert.alert(
              'Audio Format Issue', 
              'Live voice recording requires WAV format conversion. ' +
              'Use the "Test with Sample WAV" button to verify transcription works.\n\n' +
              'Full voice recording support coming soon!'
            );
          } else {
            Alert.alert('Transcription Error', transcribeError?.message || 'Failed to transcribe audio');
          }
        }
      } else if (!sttReady) {
        console.warn('VoiceButton: STT not ready');
      } else if (!audioPath) {
        console.warn('VoiceButton: No audio path returned');
      }
    } catch (e: any) {
      console.error('VoiceButton: Error in handlePressOut:', e);
    } finally {
      setIsProcessing(false);
    }
  };
  
  const buttonDisabled = disabled || isProcessing;
  
  return (
    <View style={styles.container}>
      <Pressable 
        onPressIn={handlePressIn} 
        onPressOut={handlePressOut}
        disabled={buttonDisabled}
      >
        <Animated.View style={[
          styles.button, 
          { transform: [{ scale }] },
          buttonDisabled && styles.disabled,
          isRecording && styles.recording,
        ]}>
          <Text style={styles.icon}>
            {isProcessing ? '⏳' : isRecording ? '🔴' : '🎤'}
          </Text>
        </Animated.View>
      </Pressable>
      {isRecording && (
        <Text style={styles.hint}>Recording...</Text>
      )}
      {isProcessing && (
        <Text style={styles.hint}>Transcribing...</Text>
      )}
      {!isRecording && !isProcessing && !disabled && (
        <Text style={styles.hint}>Hold to speak</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  button: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  disabled: {
    backgroundColor: '#555',
    opacity: 0.6,
  },
  recording: {
    backgroundColor: '#d9534f',
  },
  icon: {
    fontSize: 36,
  },
  hint: {
    marginTop: 8,
    fontSize: 14,
    color: '#888',
  },
});
