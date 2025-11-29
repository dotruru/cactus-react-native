import { CachesDirectoryPath, exists, unlink, writeFile } from '@dr.pogodin/react-native-fs';
import LiveAudioStream from 'react-native-live-audio-stream';
import { Platform } from 'react-native';

// WAV format constants for Whisper
const SAMPLE_RATE = 16000;
const CHANNELS = 1;
const BITS_PER_SAMPLE = 16;

class AudioConverter {
  private audioChunks: string[] = [];
  private isRecording = false;
  private currentPath: string | null = null;
  private initialized = false;

  private initStream(): void {
    if (this.initialized || Platform.OS !== 'android') {
      return;
    }

    try {
      LiveAudioStream.init({
        sampleRate: SAMPLE_RATE,
        channels: CHANNELS,
        bitsPerSample: BITS_PER_SAMPLE,
        audioSource: 6, // VOICE_RECOGNITION
        bufferSize: 2048, // Smaller buffer for more frequent callbacks
      });

      LiveAudioStream.on('data', (data: string) => {
        if (this.isRecording && data) {
          this.audioChunks.push(data);
          // Log every 10 chunks to show progress
          if (this.audioChunks.length % 10 === 0) {
            console.log('AudioConverter: Captured', this.audioChunks.length, 'chunks');
          }
        }
      });

      this.initialized = true;
      console.log('AudioConverter: LiveAudioStream initialized');
    } catch (e) {
      console.error('AudioConverter: Failed to init LiveAudioStream:', e);
    }
  }

  /**
   * Start recording raw PCM audio
   */
  startRecording(): void {
    if (Platform.OS !== 'android') {
      console.log('AudioConverter: Only Android supported for WAV recording');
      return;
    }

    // Initialize on first use
    this.initStream();

    // Clear previous recording
    this.audioChunks = [];
    this.currentPath = `${CachesDirectoryPath}/recording_${Date.now()}.wav`;

    try {
      // Set recording flag BEFORE starting to ensure we capture all data
      this.isRecording = true;
      LiveAudioStream.start();
      console.log('AudioConverter: Started recording PCM audio to', this.currentPath);
    } catch (e) {
      console.error('AudioConverter: Failed to start recording:', e);
      this.isRecording = false;
      throw e;
    }
  }

  /**
   * Stop recording and save as WAV file
   */
  async stopRecording(): Promise<string> {
    if (!this.isRecording) {
      throw new Error('Not recording');
    }

    this.isRecording = false;

    try {
      LiveAudioStream.stop();
      console.log('AudioConverter: Stopped recording, chunks:', this.audioChunks.length);

      if (this.audioChunks.length === 0) {
        throw new Error('No audio data captured');
      }

      // Convert base64 chunks to WAV
      const wavPath = await this.saveAsWav(this.audioChunks, this.currentPath!);
      this.audioChunks = [];

      return wavPath;
    } catch (e) {
      this.audioChunks = [];
      console.error('AudioConverter: Failed to stop recording:', e);
      throw e;
    }
  }

  /**
   * Create WAV header
   */
  private createWavHeader(dataLength: number): Uint8Array {
    const header = new ArrayBuffer(44);
    const view = new DataView(header);

    const byteRate = SAMPLE_RATE * CHANNELS * (BITS_PER_SAMPLE / 8);
    const blockAlign = CHANNELS * (BITS_PER_SAMPLE / 8);

    // RIFF chunk
    this.writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + dataLength, true);
    this.writeString(view, 8, 'WAVE');

    // fmt chunk
    this.writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true); // chunk size
    view.setUint16(20, 1, true); // PCM format
    view.setUint16(22, CHANNELS, true);
    view.setUint32(24, SAMPLE_RATE, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, BITS_PER_SAMPLE, true);

    // data chunk
    this.writeString(view, 36, 'data');
    view.setUint32(40, dataLength, true);

    return new Uint8Array(header);
  }

  private writeString(view: DataView, offset: number, str: string): void {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  }

  /**
   * Save PCM chunks as WAV file
   */
  private async saveAsWav(chunks: string[], filePath: string): Promise<string> {
    console.log('AudioConverter: Saving WAV file...');

    // Decode base64 chunks
    const allBytes: number[] = [];
    for (const chunk of chunks) {
      try {
        const binaryString = atob(chunk);
        for (let i = 0; i < binaryString.length; i++) {
          allBytes.push(binaryString.charCodeAt(i));
        }
      } catch (e) {
        console.warn('AudioConverter: Failed to decode chunk:', e);
      }
    }

    console.log('AudioConverter: Total PCM bytes:', allBytes.length);

    const pcmData = new Uint8Array(allBytes);
    const wavHeader = this.createWavHeader(pcmData.length);

    // Combine header + PCM data
    const wavData = new Uint8Array(wavHeader.length + pcmData.length);
    wavData.set(wavHeader, 0);
    wavData.set(pcmData, wavHeader.length);

    // Convert to base64 for writing
    let binary = '';
    for (let i = 0; i < wavData.length; i++) {
      binary += String.fromCharCode(wavData[i]);
    }
    const base64Wav = btoa(binary);

    await writeFile(filePath, base64Wav, 'base64');
    console.log('AudioConverter: WAV saved to', filePath, '- size:', wavData.length, 'bytes');

    return filePath;
  }

  /**
   * Check if WAV recording is available
   */
  isAvailable(): boolean {
    return Platform.OS === 'android';
  }

  /**
   * Clean up audio files
   */
  async cleanup(path: string): Promise<void> {
    try {
      if (await exists(path)) {
        await unlink(path);
        console.log('AudioConverter: Cleaned up', path);
      }
    } catch (e) {
      console.warn('AudioConverter: Cleanup error:', e);
    }
  }
}

export default new AudioConverter();
