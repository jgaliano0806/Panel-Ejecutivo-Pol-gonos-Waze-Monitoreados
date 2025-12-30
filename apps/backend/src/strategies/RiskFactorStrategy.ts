export interface RiskAnalysisData {
    snapshot: any; // Ideally typed as PolygonSnapshotDB
    weather: any;  // Ideally typed as PolygonWeatherDataDB
    polygonId: string;
}

export interface RiskFactorStrategy {
    name: string;
    weight: number;
    calculate(data: RiskAnalysisData): Promise<number> | number;
}
