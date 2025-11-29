import { DocumentDirectoryPath, exists, mkdir, writeFile, readDir, unlink, readFile } from '@dr.pogodin/react-native-fs';
import DatabaseService from './DatabaseService';

export interface SpecDocument {
  id: string;
  filename: string;
  zone: string;
  trade: string;
  version: string;
  lastUpdated: number;
  localPath: string;
}

class SpecService {
  private corpusDir: string;
  private isInitialized = false;

  constructor() {
    this.corpusDir = `${DocumentDirectoryPath}/fieldmind/corpus`;
  }

  async init(): Promise<string> {
    if (this.isInitialized) return this.corpusDir;

    try {
      // Create corpus directory structure
      if (!(await exists(this.corpusDir))) {
        await mkdir(this.corpusDir);
      }

      // Create trade subdirectories
      const trades = ['electrical', 'plumbing', 'hvac', 'structural', 'general'];
      for (const trade of trades) {
        const tradeDir = `${this.corpusDir}/${trade}`;
        if (!(await exists(tradeDir))) {
          await mkdir(tradeDir);
        }
      }

      this.isInitialized = true;
      console.log('SpecService initialized, corpus at:', this.corpusDir);
      return this.corpusDir;
    } catch (error) {
      console.error('SpecService init error:', error);
      throw error;
    }
  }

  getCorpusDir(): string {
    return this.corpusDir;
  }

  async addSpec(
    filename: string,
    content: string,
    trade: string = 'general',
    zone?: string
  ): Promise<SpecDocument> {
    await this.init();

    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const safeFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
    const tradeDir = `${this.corpusDir}/${trade}`;
    const localPath = `${tradeDir}/${safeFilename}`;

    // Ensure trade directory exists
    if (!(await exists(tradeDir))) {
      await mkdir(tradeDir);
    }

    // Write the content
    await writeFile(localPath, content, 'utf8');

    // Save to database
    const spec: SpecDocument = {
      id,
      filename: safeFilename,
      zone: zone || '',
      trade,
      version: '1.0',
      lastUpdated: Date.now(),
      localPath,
    };

    await DatabaseService.saveSpec(spec);
    console.log('Spec added:', spec.filename);

    return spec;
  }

  async addSpecFromText(
    name: string,
    text: string,
    trade: string = 'general',
    zone?: string
  ): Promise<SpecDocument> {
    const filename = name.endsWith('.txt') ? name : `${name}.txt`;
    return this.addSpec(filename, text, trade, zone);
  }

  async listSpecs(): Promise<SpecDocument[]> {
    return DatabaseService.getSpecs();
  }

  async deleteSpec(id: string): Promise<void> {
    const specs = await this.listSpecs();
    const spec = specs.find(s => s.id === id);
    
    if (spec && await exists(spec.localPath)) {
      await unlink(spec.localPath);
    }
    
    await DatabaseService.deleteSpec(id);
  }

  async getSpecContent(id: string): Promise<string | null> {
    const specs = await this.listSpecs();
    const spec = specs.find(s => s.id === id);
    
    if (!spec || !(await exists(spec.localPath))) {
      return null;
    }

    return readFile(spec.localPath, 'utf8');
  }

  async getCorpusStats(): Promise<{ totalSpecs: number; byTrade: Record<string, number> }> {
    const specs = await this.listSpecs();
    const byTrade: Record<string, number> = {};

    for (const spec of specs) {
      byTrade[spec.trade] = (byTrade[spec.trade] || 0) + 1;
    }

    return {
      totalSpecs: specs.length,
      byTrade,
    };
  }

  // Add sample specs for demo/testing
  async addSampleSpecs(): Promise<void> {
    await this.init();

    const sampleSpecs = [
      {
        name: 'electrical-panel-schedule',
        trade: 'electrical',
        content: `ELECTRICAL PANEL SCHEDULE - BUILDING A

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

Panel: LP-1 (Lighting Panel)
Location: Level 1 Electrical Closet
Voltage: 277/480V
Circuits:
- 1-20: General Lighting (20A each)
- 21-30: Emergency Lighting (20A each)
- 31-40: Receptacles (20A each)

Conduit Specifications:
- Zone A: 3/4" EMT for branch circuits
- Zone B: 1" EMT for feeders
- Zone C: 1-1/4" EMT for main feeders
- All outdoor: Rigid galvanized steel`
      },
      {
        name: 'rebar-schedule-corridor-b',
        trade: 'structural',
        zone: 'corridor-b',
        content: `REBAR SCHEDULE - CORRIDOR B

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
- Temperature steel: #3 @ 18" O.C.

Notes:
- All rebar: ASTM A615 Grade 60
- Minimum lap splice: 40 bar diameters
- Hooks: Standard 90-degree hooks per ACI 318`
      },
      {
        name: 'plumbing-riser-diagram',
        trade: 'plumbing',
        content: `PLUMBING RISER DIAGRAM

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
- Shower: 1/2" copper

SANITARY WASTE:
Main Stack: 6" cast iron
- Connects to 8" municipal sewer

Vent Stack: 4" cast iron through roof
Branch Drains:
- Lavatory: 1-1/4" 
- Water closet: 4"
- Floor drain: 3"

FIXTURE COUNTS PER FLOOR:
- Water closets: 8 (4M, 4F)
- Lavatories: 6
- Urinals: 4
- Drinking fountains: 2`
      },
      {
        name: 'hvac-specifications',
        trade: 'hvac',
        content: `HVAC SPECIFICATIONS

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
- Return: Galvanized steel
- Insulation: 2" fiberglass wrap, R-8

DIFFUSERS:
- Office areas: 24"x24" 4-way ceiling diffusers
- Corridors: Linear slot diffusers
- Conference rooms: VAV boxes with reheat

CONTROLS:
- BMS: Johnson Controls Metasys
- Zone sensors: Temperature and CO2
- Setpoints: 72°F cooling, 70°F heating
- Unoccupied setback: ±5°F`
      },
    ];

    for (const spec of sampleSpecs) {
      try {
        await this.addSpecFromText(spec.name, spec.content, spec.trade, spec.zone);
      } catch (e) {
        console.log('Spec may already exist:', spec.name);
      }
    }

    console.log('Sample specs added');
  }
}

export default new SpecService();
