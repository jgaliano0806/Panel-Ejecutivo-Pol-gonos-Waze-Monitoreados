import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';

// Load env vars
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/waze_db',
});

async function runAudit() {
  const reportPath = path.join(__dirname, '../docs/DB_AUDIT_REPORT.md');
  // Ensure docs dir exists
  if (!fs.existsSync(path.dirname(reportPath))) {
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  }

  let report = '# Database Audit Report\n\n';
  report += `Date: ${new Date().toISOString()}\n\n`;

  try {
    console.log('Running Database Audit...');

    // 1. Table Sizes
    report += '## 1. Table Sizes\n\n';
    report += '| Table Name | Size |\n|------------|------|\n';
    const resSizes = await pool.query(`
      SELECT table_name,
             pg_size_pretty(pg_total_relation_size(quote_ident(table_name))) as size
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY pg_total_relation_size(quote_ident(table_name)) DESC;
    `);
    resSizes.rows.forEach(row => {
      report += `| ${row.table_name} | ${row.size} |\n`;
    });
    report += '\n';

    // 2. Indexes
    report += '## 2. Indexes\n\n';
    report += '| Table | Index Name | Definition | Size |\n|-------|------------|------------|------|\n';
    const resIndexes = await pool.query(`
      SELECT
          tablename,
          indexname,
          indexdef,
          pg_size_pretty(pg_relation_size(indexname::regclass)) as index_size
      FROM pg_indexes
      WHERE schemaname = 'public'
      ORDER BY pg_relation_size(indexname::regclass) DESC;
    `);
    resIndexes.rows.forEach(row => {
      report += `| ${row.tablename} | ${row.indexname} | \`${row.indexdef}\` | ${row.index_size} |\n`;
    });
    report += '\n';

    // 3. Missing FK Indexes
    report += '## 3. Tables/Columns with Missing FK Indexes\n\n';
    const resMissingIdx = await pool.query(`
      SELECT
          tc.table_name,
          kcu.column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
          AND NOT EXISTS (
              SELECT 1 FROM pg_indexes
              WHERE tablename = tc.table_name
              AND indexdef LIKE '%' || kcu.column_name || '%'
          );
    `);
    if (resMissingIdx.rows.length === 0) {
      report += '✅ No missing FK indexes found.\n';
    } else {
      resMissingIdx.rows.forEach(row => {
        report += `- Table: **${row.table_name}**, Column: **${row.column_name}**\n`;
      });
    }
    report += '\n';

    // 4. Tables without Primary Key
    report += '## 4. Tables without Primary Key\n\n';
    const resNoPK = await pool.query(`
      SELECT table_name
      FROM information_schema.tables t
      WHERE table_schema = 'public'
          AND table_type = 'BASE TABLE'
          AND NOT EXISTS (
              SELECT 1 FROM information_schema.table_constraints tc
              WHERE tc.table_name = t.table_name
              AND tc.constraint_type = 'PRIMARY KEY'
          );
    `);
    if (resNoPK.rows.length === 0) {
      report += '✅ All tables have Primary Keys.\n';
    } else {
      resNoPK.rows.forEach(row => {
        report += `- ${row.table_name}\n`;
      });
    }
    report += '\n';

    // 5. Inefficient Columns
    report += '## 5. Potentially Inefficient Columns\n\n';
    const resInefficient = await pool.query(`
      SELECT table_name, column_name, data_type, character_maximum_length
      FROM information_schema.columns
      WHERE table_schema = 'public'
          AND (
              (data_type = 'character varying' AND character_maximum_length > 1000)
              OR (data_type = 'text' AND table_name NOT LIKE '%_description%')
          );
    `);
    if (resInefficient.rows.length === 0) {
      report += '✅ No obviously inefficient columns found.\n';
    } else {
      resInefficient.rows.forEach(row => {
        report += `- **${row.table_name}.${row.column_name}**: ${row.data_type}(${row.character_maximum_length || ''})\n`;
      });
    }
    report += '\n';

    // 6. Tables without updated_at
    report += '## 6. Tables without `updated_at`\n\n';
    const resNoUpdatedAt = await pool.query(`
      SELECT table_name
      FROM information_schema.tables t
      WHERE table_schema = 'public'
          AND table_type = 'BASE TABLE'
          AND NOT EXISTS (
              SELECT 1 FROM information_schema.columns c
              WHERE c.table_name = t.table_name
              AND c.column_name = 'updated_at'
          );
    `);
    if (resNoUpdatedAt.rows.length === 0) {
      report += '✅ All tables have `updated_at`.\n';
    } else {
      resNoUpdatedAt.rows.forEach(row => {
        report += `- ${row.table_name}\n`;
      });
    }
    report += '\n';

    fs.writeFileSync(reportPath, report);
    console.log(`Audit report generated at: ${reportPath}`);

  } catch (err) {
    console.error('Error running audit:', err);
  } finally {
    await pool.end();
  }
}

runAudit();
