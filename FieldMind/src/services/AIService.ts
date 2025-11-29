import { CactusLM, CactusSTT, CactusConfig } from 'cactus-react-native';

class AIService {
  private static instance: AIService;
  
  private lm: CactusLM | null = null;
  private stt: CactusSTT | null = null;
  private visionLM: CactusLM | null = null;
  
  static getInstance(): AIService {
    if (!AIService.instance) {
      AIService.instance = new AIService();
    }
    return AIService.instance;
  }
  
  async initLM(corpusDir?: string): Promise<void> {
    this.lm = new CactusLM({
      model: 'lfm2-1.2b-rag',
      contextSize: 2048,
      corpusDir
    });
    await this.lm.download({ onProgress: (p) => console.log(`LM: ${p * 100}%`) });
    await this.lm.init();
  }
  
  async initSTT(): Promise<void> {
    this.stt = new CactusSTT({ model: 'whisper-small' });
    await this.stt.download({ onProgress: (p) => console.log(`STT: ${p * 100}%`) });
    await this.stt.init();
  }
  
  async initVision(): Promise<void> {
    this.visionLM = new CactusLM({ model: 'lfm2-vl-450m' });
    await this.visionLM.download({ onProgress: (p) => console.log(`Vision: ${p * 100}%`) });
    await this.visionLM.init();
  }
  
  getLM(): CactusLM { return this.lm!; }
  getSTT(): CactusSTT { return this.stt!; }
  getVision(): CactusLM { return this.visionLM!; }
  
  async destroyAll(): Promise<void> {
    await this.lm?.destroy();
    await this.stt?.destroy();
    await this.visionLM?.destroy();
  }
}

export default AIService.getInstance();

