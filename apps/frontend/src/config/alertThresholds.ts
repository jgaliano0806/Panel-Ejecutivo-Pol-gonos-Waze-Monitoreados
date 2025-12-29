export const ALERT_THRESHOLDS = {
    speed: {
        critical: 20,  // km/h
        high: 15,
        medium: 10
    },
    delay: {
        critical: 180, // segundos
        high: 120,
        medium: 60
    },
    coverage: {
        critical: 0.9,  // 90% diferencia de cobertura
        high: 0.7,
        medium: 0.5
    }
} as const;
