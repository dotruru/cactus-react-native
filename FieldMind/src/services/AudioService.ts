import AudioRecorderPlayer, {
  AudioEncoderAndroidType,
  AudioSourceAndroidType,
  AVEncoderAudioQualityIOSType,
  OutputFormatAndroidType,
} from 'react-native-audio-recorder-player';
import { CachesDirectoryPath, exists, unlink } from '@dr.pogodin/react-native-fs';
import { Platform, PermissionsAndroid } from 'react-native';

class AudioService {
  private currentPath: string | null = null;

  private async checkPermissions(): Promise<boolean> {
    if (Platform.OS === 'android') {
      try {
        const grants = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        ]);

        const audioGranted = grants['android.permission.RECORD_AUDIO'] === PermissionsAndroid.RESULTS.GRANTED;
        
        if (audioGranted) {
          console.log('AudioService: RECORD_AUDIO permission granted');
          return true;
        } else {
          console.log('AudioService: RECORD_AUDIO permission not granted:', grants);
          return false;
        }
      } catch (err) {
        console.error('AudioService: Permission check error:', err);
        return false;
      }
    }
    return true; // iOS permissions handled by Info.plist
  }
  
  async startRecording(): Promise<void> {
    console.log('AudioService: startRecording called');
    
    if (!(await this.checkPermissions())) {
      console.log('AudioService: Permissions not granted, cannot start recording');
      throw new Error('Microphone permission not granted');
    }

    // Record as M4A (AAC) - widely compatible
    const timestamp = Date.now();
    const path = `${CachesDirectoryPath}/recording_${timestamp}.m4a`;
    this.currentPath = path;
    
    console.log('AudioService: Starting recording to path:', path);
    try {
      const result = await AudioRecorderPlayer.startRecorder(path, {
        AudioSourceAndroid: AudioSourceAndroidType.MIC,
        AudioEncoderAndroid: AudioEncoderAndroidType.AAC,
        OutputFormatAndroid: OutputFormatAndroidType.MPEG_4,
        AVEncoderAudioQualityKeyIOS: AVEncoderAudioQualityIOSType.high,
        AVNumberOfChannelsKeyIOS: 1,
        AVSampleRateKeyIOS: 16000,
      });
      console.log('AudioService: Recording started successfully:', result);
    } catch (error) {
      console.error('AudioService: Error starting recording:', error);
      throw error;
    }
  }
  
  async stopRecording(): Promise<string> {
    console.log('AudioService: stopRecording called');
    try {
      const result = await AudioRecorderPlayer.stopRecorder();
      console.log('AudioService: Recording stopped, result:', result);
      console.log('AudioService: Returning path:', this.currentPath);
      return this.currentPath!;
    } catch (error) {
      console.error('AudioService: Error stopping recording:', error);
      throw error;
    }
  }
  
  async deleteRecording(path: string): Promise<void> {
    try {
      if (await exists(path)) {
        await unlink(path);
        console.log('AudioService: Deleted recording:', path);
      }
    } catch (error) {
      console.error('AudioService: Error deleting recording:', error);
    }
  }
}

export default new AudioService();
