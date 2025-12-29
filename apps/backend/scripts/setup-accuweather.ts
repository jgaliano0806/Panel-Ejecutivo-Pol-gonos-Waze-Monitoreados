/**
 * Script para configurar AccuWeather
 * Ejecutar: npx ts-node scripts/setup-accuweather.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function question(query: string): Promise<string> {
    return new Promise(resolve => rl.question(query, resolve));
}

async function setupAccuWeather() {
    console.log('🌤️ Configuración de AccuWeather\n');
    console.log('Este script te ayudará a configurar AccuWeather como proveedor de clima.\n');
    console.log('Para obtener una API Key:');
    console.log('1. Visita: https://developer.accuweather.com/');
    console.log('2. Crea una cuenta');
    console.log('3. Crea una nueva aplicación');
    console.log('4. Copia tu API Key\n');

    const envPath = path.join(__dirname, '../.env');
    let envContent = '';

    // Leer archivo .env existente si existe
    if (fs.existsSync(envPath)) {
        envContent = fs.readFileSync(envPath, 'utf-8');
    }

    // Preguntar si quiere usar AccuWeather
    const useAccuWeather = await question('¿Deseas usar AccuWeather? (s/n, default: n): ');

    if (useAccuWeather.toLowerCase() === 's' || useAccuWeather.toLowerCase() === 'si') {
        const apiKey = await question('Ingresa tu AccuWeather API Key: ');

        if (!apiKey || apiKey.trim() === '') {
            console.log('❌ API Key no puede estar vacía');
            process.exit(1);
        }

        // Actualizar o agregar variables
        let updatedContent = envContent;

        // Actualizar WEATHER_PROVIDER
        if (updatedContent.includes('WEATHER_PROVIDER=')) {
            updatedContent = updatedContent.replace(/WEATHER_PROVIDER=.*/g, 'WEATHER_PROVIDER=accuweather');
        } else {
            updatedContent += '\n# Configuración de Clima\nWEATHER_PROVIDER=accuweather\n';
        }

        // Actualizar ACCUWEATHER_API_KEY
        if (updatedContent.includes('ACCUWEATHER_API_KEY=')) {
            updatedContent = updatedContent.replace(/ACCUWEATHER_API_KEY=.*/g, `ACCUWEATHER_API_KEY=${apiKey.trim()}`);
        } else {
            updatedContent += `ACCUWEATHER_API_KEY=${apiKey.trim()}\n`;
        }

        // Escribir archivo
        fs.writeFileSync(envPath, updatedContent, 'utf-8');
        console.log('\n✅ Configuración completada!');
        console.log('   - WEATHER_PROVIDER=accuweather');
        console.log('   - ACCUWEATHER_API_KEY configurada');
        console.log('\n⚠️  Reinicia el servidor backend para aplicar los cambios.');
    } else {
        // Usar Open-Meteo
        let updatedContent = envContent;

        if (updatedContent.includes('WEATHER_PROVIDER=')) {
            updatedContent = updatedContent.replace(/WEATHER_PROVIDER=.*/g, 'WEATHER_PROVIDER=openmeteo');
        } else {
            updatedContent += '\n# Configuración de Clima\nWEATHER_PROVIDER=openmeteo\n';
        }

        // Remover ACCUWEATHER_API_KEY si existe
        updatedContent = updatedContent.replace(/ACCUWEATHER_API_KEY=.*\n?/g, '');

        fs.writeFileSync(envPath, updatedContent, 'utf-8');
        console.log('\n✅ Configurado para usar Open-Meteo (gratuito)');
        console.log('\n⚠️  Reinicia el servidor backend para aplicar los cambios.');
    }

    rl.close();
}

setupAccuWeather()
    .then(() => {
        console.log('\n✅ Script completado');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Error:', error);
        process.exit(1);
    });

