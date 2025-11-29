import AIService from '../services/AIService';
import type { Tool, Message } from 'cactus-react-native';
import { Issue, IssueType } from '../models/Issue';

const issueExtractionTool: Tool = {
  name: 'create_issue',
  description: 'Create a structured construction site issue from voice description',
  parameters: {
    type: 'object',
    properties: {
      location: {
        type: 'string',
        description: 'Location code or description (e.g., C7, Level 2 Room 205)'
      },
      type: {
        type: 'string',
        description: 'Issue type: rebar, electrical, plumbing, hvac, structural, safety, quality, rfi, other'
      },
      severity: {
        type: 'string',
        description: 'Severity level: low, medium, high, critical'
      },
      description: {
        type: 'string',
        description: 'Detailed description of the issue'
      },
      action_required: {
        type: 'string',
        description: 'Required action or next steps'
      },
      trade: {
        type: 'string',
        description: 'Relevant trade: electrical, plumbing, mechanical, structural, general'
      }
    },
    required: ['location', 'type', 'description']
  }
};

class CaptureAgent {
  async extractIssue(
    voiceTranscription: string,
    photoAnalysis?: string
  ): Promise<Partial<Issue>> {
    const lm = AIService.getLM();
    
    let content = `Extract issue details from this voice note: "${voiceTranscription}"`;
    if (photoAnalysis) {
      content += `\n\nPhoto analysis: ${photoAnalysis}`;
    }
    
    const messages: Message[] = [
      {
        role: 'system',
        content: 'You are a construction issue extraction assistant. Extract structured data from worker reports.'
      },
      { role: 'user', content }
    ];
    
    const result = await lm.complete({
      messages,
      tools: [issueExtractionTool]
    });
    
    if (result.functionCalls && result.functionCalls.length > 0) {
      const call = result.functionCalls[0];
      return {
        location: call.arguments.location,
        type: call.arguments.type as IssueType,
        severity: call.arguments.severity || 'medium',
        description: call.arguments.description,
        actionRequired: call.arguments.action_required || '',
        trade: call.arguments.trade || 'general'
      };
    }
    
    throw new Error('Failed to extract issue data');
  }
  
  async analyzePhoto(photoPath: string): Promise<string> {
    const vision = AIService.getVision();
    
    const result = await vision.complete({
      messages: [{
        role: 'user',
        content: 'Describe any construction issues, defects, or safety concerns visible in this image. Be specific about locations and severity.',
        images: [photoPath]
      }]
    });
    
    return result.response;
  }
}

export default new CaptureAgent();

