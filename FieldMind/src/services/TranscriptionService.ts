import AIService from './AIService';

interface TranscriptionResult {
  text: string;
  language: string;
  confidence: number;
}

class TranscriptionService {
  async transcribe(
    audioPath: string,
    language: string = 'en',
    onToken?: (token: string) => void
  ): Promise<TranscriptionResult> {
    console.log('TranscriptionService: Starting transcription for', audioPath);
    
    const stt = AIService.getSTT();
    
    if (!stt) {
      console.warn('TranscriptionService: STT not initialized yet');
      throw new Error('Speech-to-text model not ready. Please wait for initialization.');
    }
    
    // Whisper language codes: en, ru, zh, es, etc.
    const prompt = `<|startoftranscript|><|${language}|><|transcribe|><|notimestamps|>`;
    
    console.log('TranscriptionService: Calling STT with prompt:', prompt);
    
    try {
      const result = await stt.transcribe({
        audioFilePath: audioPath,
        prompt,
        onToken
      });
      
      console.log('TranscriptionService: Transcription complete:', result);
      
      return {
        text: result.response.trim(),
        language,
        confidence: result.success ? 1.0 : 0.0
      };
    } catch (e) {
      console.error('TranscriptionService: Transcription error:', e);
      throw new Error(`Transcription failed: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  }
}

export default new TranscriptionService();
