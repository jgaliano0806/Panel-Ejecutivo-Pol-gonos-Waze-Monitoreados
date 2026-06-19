#!/usr/bin/env node
/**
 * Genera HTML y PDF del paquete de documentación ISO 9001:2015.
 * Combina todos los documentos de docs/iso9001/ en un solo PDF.
 *
 * Uso: npm run docs:iso-pdf
 * Requiere: playwright (chromium)
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const isoDir = path.join(projectRoot, 'docs', 'iso9001');

const REGISTRO_FILES = [
  'registros/RP-001_Registro_Monitoreo.md',
  'registros/RP-002_Registro_Alertas.md',
  'registros/RP-003_Registro_Zonas_Peligrosas.md',
  'registros/RP-004_Registro_Siniestros.md',
  'registros/RP-005_Registro_Consulta_Incidentes.md',
  'registros/RP-006_Informe_Estadistico.md',
  'registros/RP-007_Registro_Cambios_Admin.md',
  'registros/RP-008_Registro_Usuarios.md',
  'registros/RP-009_Bitacora_Turno.md',
  'registros/RP-010_Registro_No_Conformidades.md',
];

const INSTRUCTIVO_FILES = [
  'instructivos/IP-001_Monitoreo_Tiempo_Real.md',
  'instructivos/IP-002_Gestion_Alertas.md',
  'instructivos/IP-003_Zonas_Peligrosas.md',
  'instructivos/IP-004_Registro_Siniestros.md',
  'instructivos/IP-005_Consulta_Incidentes.md',
  'instructivos/IP-006_Analisis_Estadistico.md',
  'instructivos/IP-007_Administracion_Sistema.md',
  'instructivos/IP-008_Gestion_Usuarios.md',
  'instructivos/IP-009_Inicio_Cierre_Turno.md',
  'instructivos/IP-010_Incidencias_Operativas.md',
];

const DOCUMENT_SETS = {
  full: [
    'MANUAL_SGC_ISO9001.md',
    'MANUAL_USUARIO.md',
    'MANUAL_PROCESOS.md',
    ...INSTRUCTIVO_FILES,
    ...REGISTRO_FILES,
    'PROC-001_Control_Documentos.md',
    'PROC-002_Desarrollo_Software.md',
    'PROC-003_Gestion_Cambios.md',
    'PROC-004_Pruebas_Verificacion.md',
    'PROC-005_Despliegue_Mantenimiento.md',
    'PROC-006_No_Conformidades_Mejora.md',
    'REG-001_Registro_Documentos.md',
    'REG-002_Registro_Riesgos.md',
  ],
  usuario: ['MANUAL_USUARIO.md'],
  procesos: ['MANUAL_PROCESOS.md'],
  instructivos: INSTRUCTIVO_FILES,
  registros: REGISTRO_FILES,
};

const preset = process.argv[2] || 'full';
const DOCUMENT_ORDER = DOCUMENT_SETS[preset] || DOCUMENT_SETS.full;

const OUTPUT_NAMES = {
  full: { html: 'MANUAL_SGC_ISO9001.html', pdf: 'MANUAL_SGC_ISO9001.pdf', title: 'SGC ISO 9001:2015' },
  usuario: { html: 'MANUAL_USUARIO.html', pdf: 'MANUAL_USUARIO.pdf', title: 'Manual de Usuario' },
  procesos: { html: 'MANUAL_PROCESOS.html', pdf: 'MANUAL_PROCESOS.pdf', title: 'Manual de Procesos' },
  instructivos: { html: 'INSTRUCTIVOS_PROCESOS.html', pdf: 'INSTRUCTIVOS_PROCESOS.pdf', title: 'Instructivos de Procesos' },
  registros: { html: 'REGISTROS_PROCESOS.html', pdf: 'REGISTROS_PROCESOS.pdf', title: 'Registros de Procesos' },
};
const output = OUTPUT_NAMES[preset] || OUTPUT_NAMES.full;
const htmlPath = path.join(isoDir, output.html);
const pdfPath = path.join(isoDir, output.pdf);

const CSS = `
  @page { size: A4; margin: 20mm; }
  @media print {
    body { font-size: 10pt; }
    .no-print { display: none !important; }
    pre, code { font-size: 8pt; white-space: pre-wrap; word-break: break-word; }
    h1, h2, h3, h4 { page-break-after: avoid; }
    pre, table, .doc-section { page-break-inside: avoid; }
    .page-break { page-break-before: always; }
  }
  @media screen {
    .no-print {
      position: fixed; top: 10px; right: 10px; z-index: 9999;
      background: #1e3a5f; color: white; padding: 10px 20px;
      border-radius: 8px; cursor: pointer; font-weight: bold;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    }
    .no-print:hover { background: #152a45; }
  }
  body {
    font-family: 'Segoe UI', system-ui, sans-serif;
    line-height: 1.55; max-width: 800px; margin: 0 auto;
    padding: 2rem; color: #1f2937;
  }
  .cover {
    text-align: center; padding: 4rem 2rem; margin-bottom: 2rem;
    border: 2px solid #1e3a5f; border-radius: 8px;
  }
  .cover h1 { font-size: 1.8rem; color: #1e3a5f; border: none; margin-bottom: 0.5rem; }
  .cover .subtitle { font-size: 1.1rem; color: #4b5563; margin: 1rem 0; }
  .cover .meta { font-size: 0.9rem; color: #6b7280; }
  .cover .iso-badge {
    display: inline-block; background: #1e3a5f; color: white;
    padding: 0.4rem 1.2rem; border-radius: 4px; font-size: 0.85rem;
    margin-top: 1.5rem; letter-spacing: 0.05em;
  }
  h1 { color: #111827; border-bottom: 2px solid #1e3a5f; padding-bottom: 0.5rem; font-size: 1.5rem; }
  h2 { color: #1e3a5f; margin-top: 1.8rem; font-size: 1.2rem; }
  h3 { color: #2563eb; margin-top: 1.3rem; font-size: 1.05rem; }
  h4 { color: #3b82f6; margin-top: 1rem; }
  code, pre {
    background: #f3f4f6; padding: 0.15em 0.35em; border-radius: 3px;
    font-family: 'Consolas', 'Courier New', monospace; font-size: 0.88em;
  }
  pre {
    padding: 0.8rem; overflow-x: auto; border-left: 4px solid #1e3a5f;
    margin: 0.8rem 0;
  }
  pre code { padding: 0; background: none; }
  table { border-collapse: collapse; width: 100%; margin: 0.8rem 0; font-size: 0.9em; }
  th, td { border: 1px solid #d1d5db; padding: 0.4rem 0.6rem; text-align: left; }
  th { background: #f3f4f6; font-weight: 600; }
  blockquote {
    border-left: 4px solid #1e3a5f; margin: 0.8rem 0;
    padding: 0.5rem 1rem; color: #4b5563; background: #f9fafb;
  }
  hr { border: none; border-top: 1px solid #e5e7eb; margin: 1.5rem 0; }
  .doc-meta { color: #6b7280; font-size: 0.85em; margin-bottom: 1rem; }
  ul, ol { margin: 0.5rem 0; padding-left: 1.5rem; }
  li { margin: 0.2rem 0; }
  .toc { background: #f9fafb; padding: 1.5rem; border-radius: 8px; margin: 2rem 0; }
  .toc h2 { margin-top: 0; }
  .toc ol { line-height: 1.8; }
  .footer-note {
    margin-top: 3rem; padding-top: 1rem; border-top: 1px solid #e5e7eb;
    font-size: 0.8em; color: #9ca3af; text-align: center;
  }
  .diagram-box {
    background: #f0f4f8; border: 1px solid #c5d4e8; border-radius: 6px;
    padding: 1rem; margin: 1rem 0; page-break-inside: avoid;
  }
  .diagram-box .diagram-title {
    font-weight: 600; color: #1e3a5f; margin: 0 0 0.5rem 0; font-size: 0.95em;
  }
  .diagram-box pre { margin: 0; border-left: none; background: transparent; }
  .mermaid { text-align: center; margin: 1rem 0; page-break-inside: avoid; }
  .mermaid svg { max-width: 100%; height: auto; }
  .meta-table { font-size: 0.92em; margin: 0.8rem 0 1.2rem 0; }
  .meta-table th { width: 28%; }
  .checklist {
    background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px;
    padding: 0.5rem 0.9rem; margin: 0.6rem 0; page-break-inside: avoid;
  }
  .check-item { margin: 0.3rem 0; }
  .sub-item {
    margin: 0.1rem 0 0.1rem 1.8rem; padding-left: 0.4rem;
    color: #374151; font-size: 0.95em;
  }
  .sub-marker { color: #1e3a5f; margin-right: 0.35rem; }
  .instructivo-form h1, .registro-form h1 {
    background: #f0f4f8; padding: 0.6rem 0.8rem; border-radius: 4px;
    border-bottom: 2px solid #1e3a5f;
  }
  .registro-form table td { min-height: 1.5em; vertical-align: top; }
  .registro-form table tr:nth-child(n+2) td { min-height: 2em; }
  .form-note { font-size: 0.9em; color: #6b7280; font-style: italic; }
  .fill-blank {
    border-bottom: 1px solid #9ca3af; padding: 0 0.2rem;
    font-family: 'Consolas', monospace;
  }
`;

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function inlineFormat(text) {
  let result = escapeHtml(text);
  result = result.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  result = result.replace(/`([^`]+)`/g, '<code>$1</code>');
  result = result.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>');
  result = result.replace(/_{3,}/g, '<span class="fill-blank">________</span>');
  return result;
}

function parseTableCells(row) {
  const trimmed = row.trim();
  if (!trimmed.startsWith('|')) return [];
  const parts = trimmed.split('|');
  return parts.slice(1, parts.length - 1).map((c) => c.trim());
}

function isTableSeparator(cells) {
  return cells.length > 0 && cells.every((c) => /^:?-{2,}:?$/.test(c));
}

function markdownToHtml(md) {
  const lines = md.split('\n');
  const html = [];
  let inCode = false;
  let codeLang = '';
  let inTable = false;
  let codeBuffer = [];
  let tableRows = [];
  let listType = null;
  let metaBuffer = [];
  let inChecklist = false;
  let inDocHeader = false;

  function closeChecklist() {
    if (!inChecklist) return;
    html.push('</div>');
    inChecklist = false;
  }

  function flushMeta() {
    if (metaBuffer.length === 0) return;
    html.push('<table class="meta-table"><tr><th>Campo</th><th>Valor</th></tr>');
    metaBuffer.forEach(({ key, value }) => {
      html.push(`<tr><td>${inlineFormat(key)}</td><td>${inlineFormat(value)}</td></tr>`);
    });
    html.push('</table>');
    metaBuffer = [];
  }

  function closeList() {
    if (!listType) return;
    html.push(listType === 'ol' ? '</ol>' : '</ul>');
    listType = null;
  }

  function openList(type) {
    if (listType === type) return;
    closeList();
    html.push(type === 'ol' ? '<ol>' : '<ul>');
    listType = type;
  }

  function beginBlock() {
    closeChecklist();
    flushMeta();
    closeList();
  }

  function flushTable() {
    if (tableRows.length === 0) return;
    const rows = [];
    tableRows.forEach((row) => {
      const cells = parseTableCells(row);
      if (cells.length === 0) return;
      if (rows.length === 1 && isTableSeparator(cells)) return;
      rows.push(cells);
    });
    if (rows.length > 0) {
      html.push('<table>');
      rows.forEach((cells, i) => {
        const tag = i === 0 ? 'th' : 'td';
        html.push('<tr>' + cells.map((c) => `<${tag}>${inlineFormat(c)}</${tag}>`).join('') + '</tr>');
      });
      html.push('</table>');
    }
    tableRows = [];
    inTable = false;
  }

  function flushCodeBlock() {
    if (!codeBuffer.length) return;
    const content = codeBuffer.join('\n');
    if (codeLang === 'mermaid') {
      html.push(`<div class="mermaid">${content}</div>`);
    } else {
      html.push('<pre><code>' + escapeHtml(content) + '</code></pre>');
    }
    codeBuffer = [];
    codeLang = '';
    inCode = false;
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith('```')) {
      if (inCode) {
        flushCodeBlock();
      } else {
        beginBlock();
        flushTable();
        inCode = true;
        codeLang = line.slice(3).trim().toLowerCase();
      }
      continue;
    }

    if (inCode) {
      codeBuffer.push(line);
      continue;
    }

    if (line.includes('|') && line.trim().startsWith('|')) {
      beginBlock();
      inTable = true;
      tableRows.push(line);
      continue;
    }
    if (inTable) {
      flushTable();
    }

    if (inDocHeader && /^\*\*.+?:\*\*/.test(line)) {
      beginBlock();
      const parts = line.split(/\s*\|\s*(?=\*\*)/);
      parts.forEach((part) => {
        const metaMatch = part.match(/^\*\*(.+?):\*\*\s*(.+)$/);
        if (metaMatch) {
          metaBuffer.push({ key: metaMatch[1], value: metaMatch[2].trim() });
        }
      });
      continue;
    }

    if (line.startsWith('#### ')) {
      inDocHeader = false;
      beginBlock();
      html.push(`<h4>${inlineFormat(line.slice(5))}</h4>`);
    } else if (line.startsWith('### ')) {
      inDocHeader = false;
      beginBlock();
      html.push(`<h3>${inlineFormat(line.slice(4))}</h3>`);
    } else if (line.startsWith('## ')) {
      inDocHeader = false;
      beginBlock();
      html.push(`<h2>${inlineFormat(line.slice(3))}</h2>`);
    } else if (line.startsWith('# ')) {
      inDocHeader = true;
      beginBlock();
      html.push(`<h1>${inlineFormat(line.slice(2))}</h1>`);
    } else if (line.startsWith('> ')) {
      inDocHeader = false;
      beginBlock();
      html.push(`<blockquote><p>${inlineFormat(line.slice(2))}</p></blockquote>`);
    } else if (/^---+$/.test(line.trim())) {
      inDocHeader = false;
      beginBlock();
      html.push('<hr>');
    } else if (/^[-*] \[[ x]\] /.test(line)) {
      const checked = /^[-*] \[x\] /.test(line);
      const text = line.replace(/^[-*] \[[ x]\] /, '');
      if (!inChecklist) {
        closeList();
        flushMeta();
        html.push('<div class="checklist">');
        inChecklist = true;
      }
      html.push(`<p class="check-item">${checked ? '☑' : '☐'} ${inlineFormat(text)}</p>`);
    } else if (/^(\s{2,})[-*] (.+)$/.test(line)) {
      const subMatch = line.match(/^(\s{2,})[-*] (.+)$/);
      html.push(`<p class="sub-item"><span class="sub-marker">▸</span>${inlineFormat(subMatch[2])}</p>`);
    } else if (/^[-*] /.test(line)) {
      closeChecklist();
      flushMeta();
      openList('ul');
      html.push(`<li>${inlineFormat(line.slice(2))}</li>`);
    } else if (/^\d+\. /.test(line)) {
      closeChecklist();
      flushMeta();
      openList('ol');
      html.push(`<li>${inlineFormat(line.replace(/^\d+\. /, ''))}</li>`);
    } else if (line.trim() === '') {
      closeChecklist();
      flushMeta();
      closeList();
    } else if (/^_\((.+)\)_$/.test(line.trim())) {
      beginBlock();
      const note = line.trim().match(/^_\((.+)\)_$/)[1];
      html.push(`<p class="form-note">(${inlineFormat(note)})</p>`);
    } else {
      beginBlock();
      html.push(`<p>${inlineFormat(line)}</p>`);
    }
  }

  if (inCode && codeBuffer.length) flushCodeBlock();
  closeChecklist();
  flushMeta();
  closeList();
  flushTable();

  return html.join('\n');
}

function buildCoverPage() {
  const today = new Date().toISOString().slice(0, 10);
  const titles = {
    full: { h1: 'Sistema de Gestión de la Calidad', badge: 'ISO 9001:2015' },
    usuario: { h1: 'Manual de Usuario', badge: 'SGC-PWY-MU-001' },
    procesos: { h1: 'Manual de Procesos Operativos', badge: 'SGC-PWY-MP-001' },
    instructivos: { h1: 'Instructivos de Procesos Operativos', badge: 'SGC-PWY-IP-SERIE' },
    registros: { h1: 'Registros de Procesos Operativos', badge: 'SGC-PWY-RP-SERIE' },
  };
  const t = titles[preset] || titles.full;

  const tocItems = {
    full: `
        <li>SGC-PWY-001 — Manual del Sistema de Gestión de la Calidad</li>
        <li>SGC-PWY-MU-001 — Manual de Usuario</li>
        <li>SGC-PWY-MP-001 — Manual de Procesos Operativos</li>
        <li>SGC-PWY-IP-001 a IP-010 — Instructivos de procesos operativos</li>
        <li>SGC-PWY-RP-001 a RP-010 — Registros de procesos operativos</li>
        <li>SGC-PWY-PROC-001 — Control de documentos y registros</li>
        <li>SGC-PWY-PROC-002 — Desarrollo de software</li>
        <li>SGC-PWY-PROC-003 — Gestión de cambios</li>
        <li>SGC-PWY-PROC-004 — Pruebas y verificación</li>
        <li>SGC-PWY-PROC-005 — Despliegue y mantenimiento</li>
        <li>SGC-PWY-PROC-006 — No conformidades y mejora continua</li>
        <li>SGC-PWY-REG-001 — Registro maestro de documentación</li>
        <li>SGC-PWY-REG-002 — Registro de riesgos y oportunidades</li>`,
    usuario: `
        <li>Introducción y requisitos de acceso</li>
        <li>Inicio de sesión, perfil y navegación</li>
        <li>Módulos: Mapa, Notificaciones, Zonas peligrosas</li>
        <li>Módulos: Incidentes, Siniestros, Estadísticas</li>
        <li>Administración, TTS, roles y permisos</li>
        <li>Resolución de problemas e incidencias</li>`,
    procesos: `
        <li>PRO-OP-001 — Monitoreo de tráfico en tiempo real</li>
        <li>PRO-OP-002 — Gestión de alertas y notificaciones</li>
        <li>PRO-OP-003 — Respuesta a zonas peligrosas</li>
        <li>PRO-OP-004 — Registro de siniestros viales</li>
        <li>PRO-OP-005 — Consulta de incidentes e histórico</li>
        <li>PRO-OP-006 — Análisis estadístico operativo</li>
        <li>PRO-OP-007 — Administración del sistema</li>
        <li>PRO-OP-008 — Gestión de usuarios y accesos</li>
        <li>PRO-OP-009 — Inicio y cierre de turno</li>
        <li>PRO-OP-010 — Gestión de incidencias operativas</li>`,
    instructivos: `
        <li>IP-001 — Monitoreo de tráfico en tiempo real</li>
        <li>IP-002 — Gestión de alertas y notificaciones</li>
        <li>IP-003 — Respuesta a zonas peligrosas</li>
        <li>IP-004 — Registro de siniestros viales</li>
        <li>IP-005 — Consulta de incidentes e histórico</li>
        <li>IP-006 — Análisis estadístico operativo</li>
        <li>IP-007 — Administración del sistema</li>
        <li>IP-008 — Gestión de usuarios y accesos</li>
        <li>IP-009 — Inicio y cierre de turno</li>
        <li>IP-010 — Gestión de incidencias operativas</li>`,
    registros: `
        <li>RP-001 — Verificación de monitoreo en tiempo real</li>
        <li>RP-002 — Alertas atendidas</li>
        <li>RP-003 — Respuesta a zonas peligrosas</li>
        <li>RP-004 — Validación de siniestros viales</li>
        <li>RP-005 — Consulta de incidentes</li>
        <li>RP-006 — Informe estadístico operativo</li>
        <li>RP-007 — Cambios administrativos</li>
        <li>RP-008 — Gestión de usuarios y accesos</li>
        <li>RP-009 — Bitácora de turno</li>
        <li>RP-010 — No conformidades operativas</li>`,
  };

  return `
    <div class="cover">
      <div class="iso-badge">${t.badge}</div>
      <h1>${t.h1}</h1>
      <p class="subtitle">Panel Ejecutivo Waze – Monitoreo de Tráfico en Tiempo Real</p>
      <p class="meta">
        <strong>Organización:</strong> CASISA – Caminos de las Sierras<br>
        <strong>Área:</strong> GED (Gestión y Desarrollo)<br>
        <strong>Versión:</strong> 1.0<br>
        <strong>Fecha de emisión:</strong> ${today}<br>
        <strong>Estado:</strong> Vigente
      </p>
    </div>
    <div class="toc">
      <h2>Contenido</h2>
      <ol>${tocItems[preset] || tocItems.full}
      </ol>
    </div>
    <div class="page-break"></div>
  `;
}

function buildHtml() {
  const sections = DOCUMENT_ORDER.map((filename, index) => {
    const filePath = path.join(isoDir, filename);
    if (!fs.existsSync(filePath)) {
      console.warn('Advertencia: no se encuentra', filename);
      return '';
    }
    const md = fs.readFileSync(filePath, 'utf-8');
    const body = markdownToHtml(md);
    const pageBreak = index > 0 ? '<div class="page-break"></div>' : '';
    const formClass = filename.startsWith('instructivos/') ? ' instructivo-form'
      : filename.startsWith('registros/') ? ' registro-form' : '';
    return `${pageBreak}<div class="doc-section${formClass}">${body}</div>`;
  }).join('\n');

  const mermaidScript = `
  <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
  <script>
    mermaid.initialize({ startOnLoad: false, theme: 'neutral', securityLevel: 'loose', fontFamily: 'Segoe UI, system-ui, sans-serif' });
  </script>`;

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${output.title} – Panel Ejecutivo Waze</title>
  <style>${CSS}</style>
  ${mermaidScript}
</head>
<body>
  <button class="no-print" onclick="window.print()">Guardar como PDF</button>
  ${buildCoverPage()}
  ${sections}
  <div class="footer-note">
    Documento generado automáticamente — CASISA / GED — Panel Ejecutivo Waze — ISO 9001:2015
  </div>
</body>
</html>`;
}

async function renderMermaid(page) {
  const hasMermaid = await page.evaluate(() => document.querySelectorAll('.mermaid').length > 0);
  if (!hasMermaid) return;
  await page.evaluate(async () => {
    if (typeof mermaid === 'undefined') return;
    await mermaid.run({ querySelector: '.mermaid' });
  });
  await page.waitForSelector('.mermaid svg', { timeout: 15000 }).catch(() => {
    console.warn('Advertencia: no se pudo renderizar el diagrama Mermaid; se exportará como texto.');
  });
}

async function generatePdf() {
  let browser;
  try {
    browser = await chromium.launch();
    const page = await browser.newPage();
    await page.goto(`file://${htmlPath}`, { waitUntil: 'networkidle' });
    await renderMermaid(page);
    await page.pdf({
      path: pdfPath,
      format: 'A4',
      margin: { top: '18mm', right: '18mm', bottom: '18mm', left: '18mm' },
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: `<div style="font-size:8px; width:100%; text-align:center; color:#9ca3af; margin-top:5mm;">${output.title} — Panel Ejecutivo Waze — CASISA</div>`,
      footerTemplate: '<div style="font-size:8px; width:100%; text-align:center; color:#9ca3af; margin-bottom:5mm;">CASISA — Página <span class="pageNumber"></span> de <span class="totalPages"></span></div>',
    });
    console.log('PDF generado:', pdfPath);
  } catch (err) {
    console.error('Error al generar PDF:', err.message);
    if (err.message.includes('Executable doesn\'t exist') || err.message.includes('browser')) {
      console.error('Ejecute: npx playwright install chromium');
    }
    process.exit(1);
  } finally {
    if (browser) await browser.close();
  }
}

(async () => {
  console.log(`Generando documentación ISO (${preset})...`);
  const html = buildHtml();
  fs.writeFileSync(htmlPath, html, 'utf-8');
  console.log('HTML generado:', htmlPath);
  await generatePdf();
  console.log('Proceso completado.');
})();
