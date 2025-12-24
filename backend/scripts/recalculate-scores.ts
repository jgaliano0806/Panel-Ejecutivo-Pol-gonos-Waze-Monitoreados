/**
 * Script para recalcular todos los scores de riesgo
 */

import { riskScoringService } from '../src/services/riskScoringService';

async function main() {
    console.log('Iniciando recálculo de scores...\n');

    try {
        await riskScoringService.calculateAllRiskScores();

        console.log('\n✅ Scores recalculados correctamente');

        // Obtener resumen por grupos
        const summaries = await riskScoringService.getGroupRiskSummaries();
        console.log('\n📊 Resumen por Grupos:');
        summaries.forEach(g => {
            console.log(`   ${g.group_name}: ${g.polygon_count} polígonos, avg=${g.avg_risk_score.toFixed(1)}, críticos=${g.critical_polygons}`);
        });

    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }

    process.exit(0);
}

main();

