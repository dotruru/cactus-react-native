import type { UseCactusLMResult } from 'cactus-react-native';

interface VisionAnalysisResult {
  description: string;
  issues: string[];
  severity: 'low' | 'medium' | 'high' | 'critical' | 'none';
  trade: string;
  confidence: number;
}

class VisionService {
  /**
   * Analyze a construction site photo for issues
   */
  async analyzePhoto(
    lm: UseCactusLMResult,
    imagePath: string,
    context?: string
  ): Promise<VisionAnalysisResult> {
    console.log('VisionService: analyzePhoto called');
    console.log('VisionService: Analyzing photo:', imagePath);

    // Direct, factual prompt - no fluff
    const userPrompt = context 
      ? `Construction photo at ${context}. State visible issues in 1-2 sentences. Be specific about defects, materials, measurements if visible. No introductions.`
      : "State what you see. If construction issue visible, describe it in 1-2 factual sentences. Include material type, defect type, approximate size if visible. No greetings or filler.";

    try {
      console.log('VisionService: Calling lm.complete...');
      const result = await lm.complete({
        messages: [
          { 
            role: 'user', 
            content: userPrompt, 
            images: [imagePath] 
          }
        ],
      });

      console.log('VisionService: Analysis complete, response:', result.response?.substring(0, 100));

      // Parse the response to extract structured data
      let response = result.response || 'Unable to analyze image';
      
      // Clean markdown formatting
      response = response
        .replace(/<\|[^>]+\|>/g, '')  // Remove LLM artifacts
        .replace(/\*\*/g, '')          // Remove bold markdown
        .replace(/\*/g, '')            // Remove italic markdown
        .replace(/#{1,6}\s/g, '')      // Remove heading markdown
        .replace(/`/g, '')             // Remove code markdown
        .trim();
      
      return {
        description: response,
        issues: this.extractIssues(response),
        severity: this.extractSeverity(response),
        trade: this.extractTrade(response),
        confidence: result.success ? 0.85 : 0.5,
      };
    } catch (error) {
      console.error('VisionService: Analysis error:', error);
      throw error;
    }
  }

  /**
   * Quick check if photo contains construction-related content
   */
  async quickClassify(
    lm: UseCactusLMResult,
    imagePath: string
  ): Promise<{ isConstruction: boolean; category: string }> {
    if (!lm.isInitialized) {
      throw new Error('Vision model not initialized');
    }

    try {
      const result = await lm.complete({
        messages: [
          { 
            role: 'user', 
            content: 'Briefly classify this image. Is it a construction site? What category: electrical, plumbing, structural, hvac, safety equipment, tools, or other?',
            images: [imagePath]
          }
        ],
      });

      const response = (result.response || '').toLowerCase();
      const isConstruction = response.includes('construction') || 
                            response.includes('building') ||
                            response.includes('site') ||
                            response.includes('electrical') ||
                            response.includes('plumbing') ||
                            response.includes('structural');

      let category = 'other';
      if (response.includes('electrical')) category = 'electrical';
      else if (response.includes('plumbing')) category = 'plumbing';
      else if (response.includes('structural')) category = 'structural';
      else if (response.includes('hvac')) category = 'hvac';
      else if (response.includes('safety')) category = 'safety';

      return { isConstruction, category };
    } catch (error) {
      console.error('VisionService: Quick classify error:', error);
      return { isConstruction: false, category: 'other' };
    }
  }

  /**
   * Generate a caption for the photo
   */
  async generateCaption(
    lm: UseCactusLMResult,
    imagePath: string
  ): Promise<string> {
    if (!lm.isInitialized) {
      throw new Error('Vision model not initialized');
    }

    try {
      const result = await lm.complete({
        messages: [
          { 
            role: 'user', 
            content: 'Provide a brief, descriptive caption for this construction site photo in one sentence.',
            images: [imagePath]
          }
        ],
      });

      return result.response?.trim() || 'Construction site photo';
    } catch (error) {
      console.error('VisionService: Caption error:', error);
      return 'Construction site photo';
    }
  }

  private extractIssues(response: string): string[] {
    const issues: string[] = [];
    const lines = response.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      // Look for bullet points or numbered issues
      if (trimmed.match(/^[-•*]\s+/) || trimmed.match(/^\d+[.)]\s+/)) {
        const issue = trimmed.replace(/^[-•*\d.)]+\s+/, '');
        if (issue.length > 10) { // Filter out very short lines
          issues.push(issue);
        }
      }
    }

    // If no bullet points found, try to extract sentences mentioning issues
    if (issues.length === 0) {
      const keywords = ['issue', 'problem', 'defect', 'concern', 'damage', 'missing', 'incorrect', 'unsafe'];
      const sentences = response.split(/[.!?]+/);
      for (const sentence of sentences) {
        const lower = sentence.toLowerCase();
        if (keywords.some(kw => lower.includes(kw))) {
          issues.push(sentence.trim());
        }
      }
    }

    return issues.slice(0, 5); // Limit to 5 issues
  }

  private extractSeverity(response: string): 'low' | 'medium' | 'high' | 'critical' | 'none' {
    const lower = response.toLowerCase();
    
    if (lower.includes('critical') || lower.includes('immediate') || lower.includes('dangerous')) {
      return 'critical';
    }
    if (lower.includes('high') || lower.includes('serious') || lower.includes('significant')) {
      return 'high';
    }
    if (lower.includes('medium') || lower.includes('moderate') || lower.includes('notable')) {
      return 'medium';
    }
    if (lower.includes('low') || lower.includes('minor') || lower.includes('small')) {
      return 'low';
    }
    if (lower.includes('no issue') || lower.includes('no problem') || lower.includes('looks good')) {
      return 'none';
    }
    
    return 'medium'; // Default to medium if unclear
  }

  private extractTrade(response: string): string {
    const lower = response.toLowerCase();
    
    if (lower.includes('electrical') || lower.includes('wiring') || lower.includes('conduit') || lower.includes('panel')) {
      return 'electrical';
    }
    if (lower.includes('plumbing') || lower.includes('pipe') || lower.includes('drain') || lower.includes('water')) {
      return 'plumbing';
    }
    if (lower.includes('structural') || lower.includes('concrete') || lower.includes('rebar') || lower.includes('beam')) {
      return 'structural';
    }
    if (lower.includes('hvac') || lower.includes('duct') || lower.includes('ventilation') || lower.includes('air')) {
      return 'hvac';
    }
    if (lower.includes('safety') || lower.includes('hazard') || lower.includes('ppe') || lower.includes('fall')) {
      return 'safety';
    }
    
    return 'general';
  }
}

export default new VisionService();

