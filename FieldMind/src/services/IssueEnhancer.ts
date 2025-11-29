/**
 * IssueEnhancer - Uses LLM to enhance, translate, and structure issue descriptions
 */
import type { UseCactusLMResult } from 'cactus-react-native';

export interface EnhancedIssue {
  // Structured fields
  type: 'electrical' | 'plumbing' | 'structural' | 'hvac' | 'safety' | 'rebar' | 'quality' | 'other';
  severity: 'low' | 'medium' | 'high' | 'critical';
  location: string;
  
  // Enhanced description
  description: string;
  originalInput: string;
  
  // Action items
  suggestedAction: string;
  urgency: string;
}

class IssueEnhancer {
  /**
   * Enhance a raw voice transcription into a structured issue
   */
  async enhanceIssue(
    lm: UseCactusLMResult,
    rawInput: string,
    photoAnalysis?: string,
    currentLocation?: string
  ): Promise<EnhancedIssue> {
    const systemPrompt = `You are a construction site issue analyzer. Given a voice note from a worker, extract and structure the information.

IMPORTANT: Respond ONLY with valid JSON, no other text.

JSON format:
{
  "type": "electrical|plumbing|structural|hvac|safety|rebar|quality|other",
  "severity": "low|medium|high|critical",
  "location": "extracted location or 'unspecified'",
  "description": "clear, professional description of the issue",
  "suggestedAction": "recommended next step",
  "urgency": "immediate|today|this week|when convenient"
}

Guidelines:
- If severity isn't clear, default to "medium"
- Make the description clear and professional
- Extract any location mentioned (zone, level, room, area)
- Suggest practical actions`;

    let userPrompt = `Voice note from worker: "${rawInput}"`;
    
    if (photoAnalysis) {
      userPrompt += `\n\nPhoto analysis: ${photoAnalysis}`;
    }
    
    if (currentLocation) {
      userPrompt += `\n\nCurrent location context: ${currentLocation}`;
    }

    try {
      console.log('IssueEnhancer: Processing input:', rawInput);
      
      const result = await lm.complete({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        maxTokens: 300,
      });

      console.log('IssueEnhancer: LLM response:', result.response);

      // Parse JSON from response
      const jsonMatch = result.response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          type: parsed.type || 'other',
          severity: parsed.severity || 'medium',
          location: parsed.location || currentLocation || 'unspecified',
          description: parsed.description || rawInput,
          originalInput: rawInput,
          suggestedAction: parsed.suggestedAction || '',
          urgency: parsed.urgency || 'when convenient',
        };
      }

      // Fallback if JSON parsing fails
      return this.createFallback(rawInput, currentLocation);
    } catch (error) {
      console.error('IssueEnhancer: Error:', error);
      return this.createFallback(rawInput, currentLocation);
    }
  }

  /**
   * Translate text to English using LLM
   */
  async translateToEnglish(
    lm: UseCactusLMResult,
    text: string,
    sourceLanguage: string
  ): Promise<string> {
    if (sourceLanguage === 'en' || sourceLanguage === 'en-US') {
      return text;
    }

    try {
      const result = await lm.complete({
        messages: [
          { 
            role: 'system', 
            content: 'You are a translator. Translate the following text to English. Only output the translation, nothing else.' 
          },
          { role: 'user', content: text }
        ],
        maxTokens: 200,
      });

      return result.response.trim() || text;
    } catch (error) {
      console.error('IssueEnhancer: Translation error:', error);
      return text;
    }
  }

  /**
   * Generate a summary of the issue for display
   */
  async generateSummary(
    lm: UseCactusLMResult,
    issue: EnhancedIssue
  ): Promise<string> {
    try {
      const result = await lm.complete({
        messages: [
          { 
            role: 'system', 
            content: 'Create a one-line summary (max 10 words) of this construction issue. Be concise.' 
          },
          { 
            role: 'user', 
            content: `Type: ${issue.type}, Severity: ${issue.severity}, Description: ${issue.description}` 
          }
        ],
        maxTokens: 30,
      });

      return result.response.trim();
    } catch (error) {
      console.error('IssueEnhancer: Summary error:', error);
      return `${issue.severity} ${issue.type} issue`;
    }
  }

  private createFallback(rawInput: string, location?: string): EnhancedIssue {
    // Simple keyword-based classification as fallback
    const input = rawInput.toLowerCase();
    
    let type: EnhancedIssue['type'] = 'other';
    if (input.includes('wire') || input.includes('electric') || input.includes('outlet') || input.includes('panel')) {
      type = 'electrical';
    } else if (input.includes('pipe') || input.includes('leak') || input.includes('water') || input.includes('drain')) {
      type = 'plumbing';
    } else if (input.includes('crack') || input.includes('beam') || input.includes('column') || input.includes('foundation')) {
      type = 'structural';
    } else if (input.includes('hvac') || input.includes('vent') || input.includes('duct') || input.includes('air')) {
      type = 'hvac';
    } else if (input.includes('danger') || input.includes('hazard') || input.includes('unsafe') || input.includes('safety')) {
      type = 'safety';
    } else if (input.includes('rebar') || input.includes('reinforcement')) {
      type = 'rebar';
    }

    let severity: EnhancedIssue['severity'] = 'medium';
    if (input.includes('urgent') || input.includes('critical') || input.includes('emergency') || input.includes('danger')) {
      severity = 'critical';
    } else if (input.includes('serious') || input.includes('major') || input.includes('bad')) {
      severity = 'high';
    } else if (input.includes('minor') || input.includes('small')) {
      severity = 'low';
    }

    return {
      type,
      severity,
      location: location || 'unspecified',
      description: rawInput,
      originalInput: rawInput,
      suggestedAction: 'Review and assess',
      urgency: severity === 'critical' ? 'immediate' : 'when convenient',
    };
  }
}

export default new IssueEnhancer();

