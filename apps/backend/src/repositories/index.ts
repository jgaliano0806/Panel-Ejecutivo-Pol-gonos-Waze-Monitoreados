import { Pool } from 'pg';
import { dbService } from '../database/dbService'; // Use existing dbService to get pool if needed, or better, pass pool to initialize
import { WazeAlertRepository } from './WazeAlertRepository';
import { WazeJamRepository } from './WazeJamRepository';
import { WeatherRepository } from './WeatherRepository';
import { PolygonRepository } from './PolygonRepository';
import { RiskScoreRepository } from './RiskScoreRepository';
import { WazeIrregularityRepository } from './WazeIrregularityRepository';

export class RepositoryFactory {
  private static instance: RepositoryFactory;

  public readonly wazeAlerts: WazeAlertRepository;
  public readonly wazeJams: WazeJamRepository;
  public readonly weather: WeatherRepository;
  public readonly polygons: PolygonRepository;
  public readonly riskScores: RiskScoreRepository;
  public readonly wazeIrregularities: WazeIrregularityRepository;

  private constructor(private db: Pool) {
    this.wazeAlerts = new WazeAlertRepository(db);
    this.wazeJams = new WazeJamRepository(db);
    this.weather = new WeatherRepository(db);
    this.polygons = new PolygonRepository(db);
    this.riskScores = new RiskScoreRepository(db);
    this.wazeIrregularities = new WazeIrregularityRepository(db);
  }

  static initialize(db: Pool): void {
    if (!RepositoryFactory.instance) {
      RepositoryFactory.instance = new RepositoryFactory(db);
    }
  }

  static getInstance(): RepositoryFactory {
    if (!RepositoryFactory.instance) {
      // Fallback: Try to get pool from dbService if initialized, otherwise throw
      // In a real generic app we might throw, but here we can try to facilitate usage
      // assuming dbService is singleton and has pool?
      // Actually dbService doesn't expose pool directly publicly in the snippet I saw earlier,
      // but let's assume valid initialization flow in server.ts
      throw new Error('RepositoryFactory not initialized. Call initialize(db) first.');
    }
    return RepositoryFactory.instance;
  }
}

// Shortcut export
export const repositories = () => RepositoryFactory.getInstance();
