import React, { createContext, useContext, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LanguageCode } from '../utils/languageCodes';
import TranslationAgent from '../agents/TranslationAgent';

interface LanguageContextType {
  currentLanguage: LanguageCode;
  setLanguage: (lang: LanguageCode) => Promise<void>;
  translateToUser: (text: string, fromLang?: LanguageCode) => Promise<string>;
  translateToEnglish: (text: string) => Promise<string>;
}

const LanguageContext = createContext<LanguageContextType | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [currentLanguage, setCurrentLanguage] = useState<LanguageCode>('en');
  
  const setLanguage = useCallback(async (lang: LanguageCode) => {
    setCurrentLanguage(lang);
    await AsyncStorage.setItem('userLanguage', lang);
  }, []);
  
  const translateToUser = useCallback(async (text: string, fromLang: LanguageCode = 'en') => {
    return TranslationAgent.translate(text, fromLang, currentLanguage);
  }, [currentLanguage]);
  
  const translateToEnglish = useCallback(async (text: string) => {
    return TranslationAgent.translateToEnglish(text, currentLanguage);
  }, [currentLanguage]);
  
  return (
    <LanguageContext.Provider value={{ currentLanguage, setLanguage, translateToUser, translateToEnglish }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within LanguageProvider');
  return context;
}

