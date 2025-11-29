import AIService from '../services/AIService';
import type { Message } from 'cactus-react-native';

class QueryAgent {
  private conversationHistory: Message[] = [];
  
  constructor() {
    this.conversationHistory = [{
      role: 'system',
      content: `You are a construction specification assistant. 
Answer questions about project specs accurately and concisely.
Always cite the source document when possible.
If you don't know the answer, say so - don't make things up.`
    }];
  }
  
  async query(
    question: string,
    onToken?: (token: string) => void
  ): Promise<{ answer: string; sources: string[] }> {
    this.conversationHistory.push({ role: 'user', content: question });
    
    const lm = AIService.getLM();
    const result = await lm.complete({
      messages: this.conversationHistory,
      onToken
    });
    
    this.conversationHistory.push({ role: 'assistant', content: result.response });
    
    // Keep conversation manageable (last 10 exchanges)
    if (this.conversationHistory.length > 21) {
      this.conversationHistory = [
        this.conversationHistory[0], // system prompt
        ...this.conversationHistory.slice(-20)
      ];
    }
    
    return {
      answer: result.response,
      sources: this.extractSources(result.response)
    };
  }
  
  private extractSources(response: string): string[] {
    // Parse references from response
    const matches = response.match(/\[([^\]]+)\]/g) || [];
    return matches.map(m => m.slice(1, -1));
  }
  
  clearHistory(): void {
    this.conversationHistory = [this.conversationHistory[0]];
  }
}

export default new QueryAgent();

