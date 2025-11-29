/**
 * SpeechService - Uses Android's native speech recognition (Google)
 * Much faster and more accurate than on-device Whisper
 */
import Voice, {
  SpeechResultsEvent,
  SpeechErrorEvent,
  SpeechEndEvent,
} from '@react-native-voice/voice';
import { Platform, PermissionsAndroid } from 'react-native';

type SpeechCallback = (text: string) => void;
type ErrorCallback = (error: string) => void;

class SpeechService {
  private isListening = false;
  private onResult: SpeechCallback | null = null;
  private onPartial: SpeechCallback | null = null;
  private onError: ErrorCallback | null = null;
  private finalResult = '';

  constructor() {
    // Set up Voice event handlers
    Voice.onSpeechStart = this.handleSpeechStart;
    Voice.onSpeechEnd = this.handleSpeechEnd;
    Voice.onSpeechResults = this.handleSpeechResults;
    Voice.onSpeechPartialResults = this.handleSpeechPartialResults;
    Voice.onSpeechError = this.handleSpeechError;
  }

  private handleSpeechStart = () => {
    console.log('SpeechService: Speech started');
    this.isListening = true;
  };

  private handleSpeechEnd = (e: SpeechEndEvent) => {
    console.log('SpeechService: Speech ended', e);
    this.isListening = false;
  };

  private handleSpeechResults = (e: SpeechResultsEvent) => {
    console.log('SpeechService: Results:', e.value);
    if (e.value && e.value.length > 0) {
      this.finalResult = e.value[0] || '';
      if (this.onResult) {
        this.onResult(this.finalResult);
      }
    }
  };

  private handleSpeechPartialResults = (e: SpeechResultsEvent) => {
    console.log('SpeechService: Partial results:', e.value);
    if (e.value && e.value.length > 0 && this.onPartial) {
      this.onPartial(e.value[0] || '');
    }
  };

  private handleSpeechError = (e: SpeechErrorEvent) => {
    console.error('SpeechService: Error:', e.error);
    this.isListening = false;
    if (this.onError) {
      this.onError(e.error?.message || 'Speech recognition error');
    }
  };

  async checkPermission(): Promise<boolean> {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          {
            title: 'Microphone Permission',
            message: 'FieldMind needs microphone access for voice input',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.error('SpeechService: Permission error:', err);
        return false;
      }
    }
    return true;
  }

  async isAvailable(): Promise<boolean> {
    try {
      const available = await Voice.isAvailable();
      console.log('SpeechService: Available:', available);
      return available === 1 || available === true;
    } catch (e) {
      console.error('SpeechService: Availability check failed:', e);
      return false;
    }
  }

  /**
   * Start listening for speech
   * @param language - Language code (e.g., 'en-US', 'es-ES', 'ru-RU')
   * @param onResult - Callback for final result
   * @param onPartial - Callback for partial results (live transcription)
   * @param onError - Callback for errors
   */
  async startListening(
    language: string = 'en-US',
    onResult: SpeechCallback,
    onPartial?: SpeechCallback,
    onError?: ErrorCallback
  ): Promise<void> {
    if (this.isListening) {
      console.log('SpeechService: Already listening');
      return;
    }

    const hasPermission = await this.checkPermission();
    if (!hasPermission) {
      throw new Error('Microphone permission not granted');
    }

    this.onResult = onResult;
    this.onPartial = onPartial || null;
    this.onError = onError || null;
    this.finalResult = '';

    try {
      console.log('SpeechService: Starting with language:', language);
      await Voice.start(language);
    } catch (e) {
      console.error('SpeechService: Start error:', e);
      throw e;
    }
  }

  async stopListening(): Promise<string> {
    if (!this.isListening) {
      console.log('SpeechService: Not listening');
      return this.finalResult;
    }

    try {
      await Voice.stop();
      console.log('SpeechService: Stopped, final result:', this.finalResult);
      return this.finalResult;
    } catch (e) {
      console.error('SpeechService: Stop error:', e);
      throw e;
    }
  }

  async cancel(): Promise<void> {
    try {
      await Voice.cancel();
      this.isListening = false;
      this.finalResult = '';
    } catch (e) {
      console.error('SpeechService: Cancel error:', e);
    }
  }

  async destroy(): Promise<void> {
    try {
      await Voice.destroy();
      this.isListening = false;
    } catch (e) {
      console.error('SpeechService: Destroy error:', e);
    }
  }

  getIsListening(): boolean {
    return this.isListening;
  }
}

export default new SpeechService();

