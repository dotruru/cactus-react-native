import { Platform } from 'react-native';
import { CactusUtil } from 'cactus-react-native';

let cachedDeviceId: string | null = null;

export const getDeviceId = async (): Promise<string> => {
  if (cachedDeviceId) return cachedDeviceId;
  
  try {
    const id = await CactusUtil.getDeviceId();
    if (id) {
      cachedDeviceId = id;
      return id;
    }
  } catch (e) {
    console.warn('Failed to get device ID from CactusUtil', e);
  }
  
  // Fallback
  cachedDeviceId = 'unknown-device-' + Math.random().toString(36).slice(2);
  return cachedDeviceId;
};

