---
name: web-design-guidelines
description: Revisa el código de la interfaz de usuario para el cumplimiento de las Directrices de Interfaz Web. Úsalo cuando se te pida "revisar mi interfaz de usuario", "verificar la accesibilidad", "auditar el diseño", "revisar la experiencia de usuario (UX)" o "verificar mi sitio frente a las mejores prácticas".
metadata:
  author: vercel
  version: "1.0.0"
  argument-hint: <archivo-o-patrón>
---

# Directrices de Interfaz Web

Revisa los archivos para el cumplimiento de las Directrices de Interfaz Web.

## Cómo funciona

1. Obtén las directrices más recientes de la URL fuente a continuación
2. Lee los archivos especificados (o solicita al usuario archivos/patrones)
3. Verifica frente a todas las reglas en las directrices obtenidas
4. Muestra los hallazgos en el formato conciso `archivo:línea`

## Fuente de las Directrices

Obtén directrices frescas antes de cada revisión:

```
https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md
```

Usa WebFetch para recuperar las reglas más recientes. El contenido obtenido contiene todas las reglas e instrucciones de formato de salida.

## Uso

Cuando un usuario proporciona un argumento de archivo o patrón:

1. Obtén las directrices de la URL fuente anterior
2. Lee los archivos especificados
3. Aplica todas las reglas de las directrices obtenidas
4. Muestra los hallazgos usando el formato especificado en las directrices

Si no se especifican archivos, pregunta al usuario qué archivos revisar.
