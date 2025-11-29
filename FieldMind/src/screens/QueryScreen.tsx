import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCactusLM, type Message, type CactusLMCompleteResult } from 'cactus-react-native';
import { useLanguage } from '../hooks/useLanguage';
import { SUPPORTED_LANGUAGES } from '../utils/languageCodes';
import { DocumentDirectoryPath, exists, mkdir, writeFile } from '@dr.pogodin/react-native-fs';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface Props {
  navigation: any;
}

const QueryScreen = ({ navigation }: Props) => {
  const { currentLanguage } = useLanguage();
  
  // Corpus must be set up BEFORE the hook is initialized
  const [corpusDir, setCorpusDir] = useState<string | null>(null);
  const [isSettingUp, setIsSettingUp] = useState(true);
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [result, setResult] = useState<CactusLMCompleteResult | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  // Set up corpus directory with sample specs FIRST
  useEffect(() => {
    setupCorpus();
  }, []);

  const setupCorpus = async () => {
    try {
      const corpusPath = `${DocumentDirectoryPath}/rag_corpus`;
      const dirExists = await exists(corpusPath);

      if (!dirExists) {
        await mkdir(corpusPath);
      }

      // Write sample specification documents
      const electricalSpec = `ELECTRICAL PANEL SCHEDULE - BUILDING A

Panel: MDP-1 (Main Distribution Panel)
Location: Electrical Room 101
Voltage: 480/277V, 3-Phase, 4-Wire
Main Breaker: 2000A

Circuit Breakers:
- CB-1: 400A - Lighting Panel LP-1
- CB-2: 400A - Lighting Panel LP-2  
- CB-3: 200A - HVAC Unit AHU-1
- CB-4: 200A - HVAC Unit AHU-2
- CB-5: 100A - Elevator Motor
- CB-6: 100A - Fire Pump

Conduit Specifications:
- Zone A: 3/4" EMT for branch circuits
- Zone B: 1" EMT for feeders
- Zone C: 1-1/4" EMT for main feeders
- All outdoor: Rigid galvanized steel`;

      const rebarSpec = `REBAR SCHEDULE - CORRIDOR B

Foundation:
- Mat foundation: #8 bars @ 12" O.C. both ways, top and bottom
- Edge reinforcement: #6 bars continuous
- Cover: 3" clear

Columns (C1-C12):
- Vertical bars: 8-#9 bars
- Ties: #4 @ 12" O.C.
- Lap splice: 48 bar diameters minimum

Beams (B1-B8):
- Top reinforcement: 4-#8 bars continuous
- Bottom reinforcement: 3-#8 bars
- Stirrups: #4 @ 8" O.C. at ends, 12" O.C. at middle
- Clear cover: 1.5"

Slab:
- Thickness: 6"
- Top: #4 @ 12" O.C. both ways
- Bottom: #4 @ 10" O.C. both ways

Notes:
- All rebar: ASTM A615 Grade 60
- Minimum lap splice: 40 bar diameters`;

      const hvacSpec = `HVAC SPECIFICATIONS

AIR HANDLING UNITS:

AHU-1 (Serves Floors 1-3):
- Capacity: 15,000 CFM
- Cooling: 45 tons
- Heating: 500 MBH gas-fired
- Filter: MERV 13
- Location: Mechanical Room 101

AHU-2 (Serves Floors 4-5):
- Capacity: 10,000 CFM
- Cooling: 30 tons
- Heating: 350 MBH gas-fired
- Filter: MERV 13
- Location: Penthouse

DUCTWORK:
- Main supply: Galvanized steel, rectangular
- Branch ducts: Galvanized steel or flex duct
- Insulation: 2" fiberglass wrap, R-8

CONTROLS:
- BMS: Johnson Controls Metasys
- Setpoints: 72°F cooling, 70°F heating`;

      const plumbingSpec = `PLUMBING RISER DIAGRAM

DOMESTIC WATER SYSTEM:
Main Supply: 4" copper, entering at Mechanical Room B-01
- Pressure: 65 PSI at main
- Water heater: 500 gallon, 199,000 BTU

Risers:
- Riser R-1 (East): 2" copper, serves floors 1-5
- Riser R-2 (West): 2" copper, serves floors 1-5
- Riser R-3 (Core): 1-1/2" copper, serves restrooms

Branch Lines:
- Lavatory: 1/2" copper
- Water closet: 1" copper (flush valve)
- Urinal: 3/4" copper

SANITARY WASTE:
Main Stack: 6" cast iron
Branch Drains:
- Lavatory: 1-1/4" 
- Water closet: 4"
- Floor drain: 3"`;

      // Write all spec files to corpus
      await writeFile(`${corpusPath}/electrical_panel_schedule.txt`, electricalSpec, 'utf8');
      await writeFile(`${corpusPath}/rebar_schedule_corridor_b.txt`, rebarSpec, 'utf8');
      await writeFile(`${corpusPath}/hvac_specifications.txt`, hvacSpec, 'utf8');
      await writeFile(`${corpusPath}/plumbing_riser_diagram.txt`, plumbingSpec, 'utf8');

      console.log('Corpus set up at:', corpusPath);
      setCorpusDir(corpusPath);
      setIsSettingUp(false);
    } catch (error) {
      console.error('Error setting up corpus:', error);
      setIsSettingUp(false);
    }
  };

  // Use the RAG-specific model with corpus directory
  // IMPORTANT: corpusDir must be set before this hook runs
  const lm = useCactusLM({
    model: 'lfm2-1.2b-rag',  // RAG-specific model
    corpusDir: corpusDir || undefined,
  });

  // Auto-download model after corpus is ready
  useEffect(() => {
    if (corpusDir && !lm.isDownloaded && !lm.isDownloading) {
      console.log('Starting RAG model download...');
      lm.download();
    }
  }, [corpusDir, lm.isDownloaded, lm.isDownloading]);

  const handleInit = async () => {
    console.log('Initializing RAG model with corpus:', corpusDir);
    try {
      await lm.init();
      console.log('RAG Model initialized!');
    } catch (e) {
      console.error('Init error:', e);
    }
  };

  // Get language name for prompts
  const getLanguageName = () => {
    const lang = SUPPORTED_LANGUAGES[currentLanguage as keyof typeof SUPPORTED_LANGUAGES];
    return lang?.name || 'English';
  };

  const handleSend = async () => {
    if (!inputText.trim() || lm.isGenerating) return;
    
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputText.trim(),
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, userMessage]);
    const currentInput = inputText.trim();
    setInputText('');

    try {
      // Build prompt based on user's language preference
      const targetLang = getLanguageName();
      const needsTranslation = currentLanguage !== 'en';
      
      // For non-English, we add translation instruction directly to the user message
      // This is more effective than system prompt for smaller models
      const systemPrompt = `Answer construction spec questions. Be direct, factual. Include measurements. Max 2 sentences. No greetings.`;
      
      let userContent = currentInput;
      if (needsTranslation) {
        // Add explicit translation instruction at the end of user message
        userContent = `${currentInput}\n\n[IMPORTANT: Answer in ${targetLang} language only. Translate all technical terms.]`;
      }

      const apiMessages: Message[] = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent }
      ];

      console.log('Calling complete with RAG, language:', targetLang);
      const completionResult = await lm.complete({ messages: apiMessages });
      console.log('RAG Complete result:', completionResult);
      setResult(completionResult);

      // Clean up response - remove any LLM artifacts
      let cleanResponse = completionResult.response || '';
      cleanResponse = cleanResponse.replace(/<\|[^>]+\|>/g, '').trim();
      
      // Remove common LLM filler phrases
      const fillerPatterns = [
        /^(Sure|Of course|Certainly|Here's|I'd be happy to|Based on)[,!.]?\s*/i,
        /^(According to the documents?|The documents? (show|indicate|state))[,:]?\s*/i,
      ];
      for (const pattern of fillerPatterns) {
        cleanResponse = cleanResponse.replace(pattern, '');
      }

      // If translation was requested but response is still in English, do a separate translation
      if (needsTranslation && cleanResponse && /^[a-zA-Z0-9\s.,'":\-\/()]+$/.test(cleanResponse)) {
        console.log('Response appears to be English, translating to', targetLang);
        try {
          const translateResult = await lm.complete({
            messages: [
              { role: 'user', content: `Translate to ${targetLang}: "${cleanResponse}"` }
            ],
          });
          if (translateResult.response) {
            let translated = translateResult.response.replace(/<\|[^>]+\|>/g, '').trim();
            // Remove any "Translation:" prefix
            translated = translated.replace(/^(Translation|Translated|Here'?s?)[:\s]*/i, '');
            if (translated) {
              cleanResponse = translated;
              console.log('Translated response:', cleanResponse);
            }
          }
        } catch (translateError) {
          console.log('Translation failed, using English:', translateError);
        }
      }

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: cleanResponse || 'No information found.',
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error: any) {
      console.error('Query error:', error);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Error: ${error.message || 'Failed to get response'}`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    }
  };

  const handleClear = () => {
    setMessages([]);
    setResult(null);
    lm.reset();
  };

  // Show setup progress
  if (isSettingUp) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Spec Lookup</Text>
          <View style={{ width: 60 }} />
        </View>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#1976d2" />
          <Text style={styles.progressText}>Setting up document corpus...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Show download progress
  if (lm.isDownloading) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Spec Lookup</Text>
          <View style={{ width: 60 }} />
        </View>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#1976d2" />
          <Text style={styles.progressText}>
            Downloading RAG model: {Math.round(lm.downloadProgress * 100)}%
          </Text>
          <Text style={styles.progressSubtext}>~800MB - This may take a few minutes</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Spec Lookup</Text>
        <TouchableOpacity onPress={handleClear} style={styles.clearButton}>
          <Text style={styles.clearText}>Clear</Text>
        </TouchableOpacity>
      </View>

      {/* RAG Status Bar */}
      <View style={styles.ragBar}>
        <Text style={styles.ragText}>
          📚 4 specs • 🌐 {getLanguageName()}
        </Text>
      </View>

      {/* Init button */}
      {lm.isDownloaded && (
        <View style={styles.initBar}>
          <TouchableOpacity 
            style={[styles.initButton, lm.isInitializing && styles.initButtonDisabled]} 
            onPress={handleInit}
            disabled={lm.isInitializing || lm.isGenerating}
          >
            {lm.isInitializing ? (
              <>
                <ActivityIndicator size="small" color="#fff" />
                <Text style={styles.initButtonText}> Initializing...</Text>
              </>
            ) : (
              <Text style={styles.initButtonText}>Init RAG Model</Text>
            )}
          </TouchableOpacity>
          <Text style={styles.initHint}>Tap Init before first query</Text>
        </View>
      )}

      {lm.error && (
        <View style={styles.errorBar}>
          <Text style={styles.errorText}>Error: {lm.error}</Text>
        </View>
      )}

      <KeyboardAvoidingView 
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={100}
      >
        <ScrollView 
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd()}
        >
          {messages.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>🔍</Text>
              <Text style={styles.emptyTitle}>Ask about specs</Text>
              <Text style={styles.emptyText}>
                Ask in any language. Answers in {getLanguageName()}.
              </Text>
              <View style={styles.exampleQueries}>
                <Text style={styles.exampleTitle}>Try asking:</Text>
                <Text style={styles.exampleText}>• Conduit size for Zone C?</Text>
                <Text style={styles.exampleText}>• Rebar spacing, corridor B slab?</Text>
                <Text style={styles.exampleText}>• AHU-1 capacity?</Text>
                <Text style={styles.exampleText}>• Main water supply size?</Text>
              </View>
            </View>
          )}

          {messages.map((message) => (
            <View
              key={message.id}
              style={[
                styles.messageBubble,
                message.role === 'user' ? styles.userBubble : styles.assistantBubble
              ]}
            >
              <Text style={[
                styles.messageText,
                message.role === 'user' ? styles.userText : styles.assistantText
              ]}>
                {message.content}
              </Text>
              <Text style={styles.timestamp}>
                {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
          ))}

          {/* Streaming text from hook */}
          {lm.completion && (
            <View style={[styles.messageBubble, styles.assistantBubble]}>
              <Text style={[styles.messageText, styles.assistantText]}>
                {lm.completion}
                <Text style={styles.cursor}>▋</Text>
              </Text>
            </View>
          )}

          {lm.isGenerating && !lm.completion && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#1976d2" />
              <Text style={styles.loadingText}>Searching specs...</Text>
            </View>
          )}
        </ScrollView>

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder={`Ask in any language...`}
            placeholderTextColor="#666"
            multiline
            maxLength={500}
            editable={!lm.isGenerating}
          />
          <TouchableOpacity
            style={[
              styles.sendButton, 
              (!inputText.trim() || lm.isGenerating) && styles.sendButtonDisabled
            ]}
            onPress={handleSend}
            disabled={!inputText.trim() || lm.isGenerating}
          >
            <Text style={styles.sendButtonText}>
              {lm.isGenerating ? '...' : 'Ask'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a1a',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a2e',
  },
  backButton: {
    padding: 4,
    width: 60,
  },
  backText: {
    color: '#1976d2',
    fontSize: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  clearButton: {
    padding: 4,
    width: 60,
    alignItems: 'flex-end',
  },
  clearText: {
    color: '#f44336',
    fontSize: 14,
  },
  ragBar: {
    backgroundColor: '#1a237e',
    padding: 8,
    alignItems: 'center',
  },
  ragText: {
    color: '#fff',
    fontSize: 12,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  progressText: {
    marginTop: 16,
    fontSize: 18,
    color: '#fff',
    fontWeight: '600',
  },
  progressSubtext: {
    marginTop: 8,
    fontSize: 14,
    color: '#888',
  },
  initBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1a1a2e',
    padding: 12,
    gap: 12,
  },
  initButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  initButtonDisabled: {
    backgroundColor: '#2E7D32',
  },
  initButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  initHint: {
    color: '#888',
    fontSize: 12,
  },
  errorBar: {
    backgroundColor: '#b71c1c',
    padding: 12,
  },
  errorText: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 20,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  exampleQueries: {
    marginTop: 24,
    backgroundColor: '#1a1a2e',
    padding: 16,
    borderRadius: 12,
    width: '100%',
  },
  exampleTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#888',
    marginBottom: 8,
  },
  exampleText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  messageBubble: {
    maxWidth: '85%',
    padding: 12,
    borderRadius: 16,
    marginBottom: 12,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#1976d2',
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#1a1a2e',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
  },
  userText: {
    color: '#fff',
  },
  assistantText: {
    color: '#ddd',
  },
  timestamp: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  cursor: {
    color: '#1976d2',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  loadingText: {
    color: '#888',
    marginLeft: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#1a1a2e',
    backgroundColor: '#0a0a1a',
  },
  input: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    color: '#fff',
    maxHeight: 100,
    marginRight: 8,
  },
  sendButton: {
    backgroundColor: '#1976d2',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  sendButtonDisabled: {
    backgroundColor: '#333',
  },
  sendButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
});

export default QueryScreen;
