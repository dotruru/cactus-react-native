import AIService from '../services/AIService';
import type { Message } from 'cactus-react-native';
import { SUPPORTED_LANGUAGES, LanguageCode } from '../utils/languageCodes';

class TranslationAgent {
  private cache = new Map<string, string>();
  
  async translate(
    text: string,
    fromLang: LanguageCode,
    toLang: LanguageCode
  ): Promise<string> {
    if (fromLang === toLang) return text;
    
    const cacheKey = `${fromLang}:${toLang}:${text}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }
    
    const lm = AIService.getLM();
    
    const fromName = SUPPORTED_LANGUAGES[fromLang].name;
    const toName = SUPPORTED_LANGUAGES[toLang].name;
    
    const messages: Message[] = [
      {
        role: 'system',
        content: `You are a translator. Translate the following ${fromName} text to ${toName}. 
Output ONLY the translation, nothing else. Preserve technical terms and location codes.`
      },
      { role: 'user', content: text }
    ];
    
    const result = await lm.complete({ messages });
    const translation = result.response.trim();
    
    this.cache.set(cacheKey, translation);
    return translation;
  }
  
  async translateToEnglish(text: string, fromLang: LanguageCode): Promise<string> {
    return this.translate(text, fromLang, 'en');
  }
  
  async translateFromEnglish(text: string, toLang: LanguageCode): Promise<string> {
    return this.translate(text, 'en', toLang);
  }
  
  clearCache(): void {
    this.cache.clear();
  }
}

export default new TranslationAgent();

