#!/usr/bin/env bash
# =============================================================
# clone-prod-to-pre.sh
# Sincroniza la base de datos de PRODUCCIÓN → PRE-PRODUCCIÓN
#
# Uso:
#   bash scripts/clone-prod-to-pre.sh
#   bash scripts/clone-prod-to-pre.sh --dry-run   (no ejecuta nada)
#   bash scripts/clone-prod-to-pre.sh --no-backup  (omite backup previo)
#
# Requisitos:
#   · Docker en PATH (docker compose v2)
#   · Los contenedores de PROD y PREPROD deben estar corriendo.
#   · Variables de entorno opcionales (ver sección CONFIG).
#
# Tiempo estimado: 1-3 minutos según el tamaño de la DB.
# =============================================================

set -euo pipefail

# ----------------------------------------------------------
# COLORES
# ----------------------------------------------------------
RED='\033[0;31m'; YELLOW='\033[1;33m'; GREEN='\033[0;32m'
CYAN='\033[0;36m'; BOLD='\033[1m'; RESET='\033[0m'

info()    { echo -e "${CYAN}[INFO]${RESET}  $*"; }
ok()      { echo -e "${GREEN}[OK]${RESET}    $*"; }
warn()    { echo -e "${YELLOW}[WARN]${RESET}  $*"; }
error()   { echo -e "${RED}[ERROR]${RESET} $*" >&2; }
header()  { echo -e "\n${BOLD}${CYAN}=== $* ===${RESET}"; }

# ----------------------------------------------------------
# CONFIG — sobreescribible por variables de entorno
# ----------------------------------------------------------
PROD_CONTAINER="${PROD_DB_CONTAINER:-panel-waze-postgres}"
PRE_CONTAINER="${PRE_DB_CONTAINER:-panel-waze-preprod-postgres}"

PROD_DB="${PROD_DB_NAME:-panel_waze}"
PRE_DB="${PRE_DB_NAME:-panel_waze_preprod}"

PROD_USER="${PROD_DB_USER:-postgres}"
PRE_USER="${PRE_DB_USER:-postgres}"

PROD_PASS="${PROD_DB_PASSWORD:-postgres}"
PRE_PASS="${PREPROD_DB_PASSWORD:-preprod_changeme}"

DUMP_DIR="${DUMP_DIR:-./backups/db-sync}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
DUMP_FILE="${DUMP_DIR}/prod_snapshot_${TIMESTAMP}.dump"
BACKUP_BEFORE_FILE="${DUMP_DIR}/preprod_backup_before_${TIMESTAMP}.dump"

DRY_RUN=false
DO_BACKUP=true

# ----------------------------------------------------------
# PARSEO DE ARGUMENTOS
# ----------------------------------------------------------
for arg in "$@"; do
  case "$arg" in
    --dry-run)   DRY_RUN=true ;;
    --no-backup) DO_BACKUP=false ;;
    --help|-h)
      echo "Uso: $0 [--dry-run] [--no-backup]"
      echo "  --dry-run    Muestra los pasos sin ejecutarlos"
      echo "  --no-backup  Omite el backup de preprod antes de limpiarla"
      exit 0 ;;
    *) error "Argumento desconocido: $arg"; exit 1 ;;
  esac
done

run() {
  if $DRY_RUN; then
    echo -e "${YELLOW}[DRY-RUN]${RESET} $*"
  else
    eval "$@"
  fi
}

# ----------------------------------------------------------
# VALIDACIONES PREVIAS
# ----------------------------------------------------------
header "Validando entorno"

command -v docker &>/dev/null || { error "docker no está en PATH"; exit 1; }

docker inspect "$PROD_CONTAINER" --format '{{.State.Running}}' 2>/dev/null | grep -q "true" \
  || { error "Contenedor PROD '$PROD_CONTAINER' no está corriendo."; exit 1; }

docker inspect "$PRE_CONTAINER" --format '{{.State.Running}}' 2>/dev/null | grep -q "true" \
  || { error "Contenedor PREPROD '$PRE_CONTAINER' no está corriendo."; exit 1; }

ok "Contenedores encontrados y corriendo."

mkdir -p "$DUMP_DIR"
ok "Directorio de dumps: $DUMP_DIR"

# ----------------------------------------------------------
# ADVERTENCIA Y CONFIRMACIÓN
# ----------------------------------------------------------
header "Confirmación"
warn "Este script ELIMINARÁ todos los datos de la DB pre-producción ('$PRE_DB')"
warn "y los reemplazará con una copia de producción ('$PROD_DB')."
echo ""
if ! $DRY_RUN; then
  read -r -p "¿Confirmar? Escribe 'CLONAR' para continuar: " CONFIRM
  if [[ "$CONFIRM" != "CLONAR" ]]; then
    error "Operación cancelada por el usuario."
    exit 1
  fi
fi

# ----------------------------------------------------------
# PASO 1: Backup de pre-prod (por seguridad)
# ----------------------------------------------------------
header "Paso 1/4: Backup de Pre-Producción (antes de limpiar)"

if $DO_BACKUP; then
  info "Generando backup de seguridad de '$PRE_DB' → $BACKUP_BEFORE_FILE"
  run "docker exec -e PGPASSWORD='${PRE_PASS}' '${PRE_CONTAINER}' \
    pg_dump -U '${PRE_USER}' -d '${PRE_DB}' \
      --format=custom --compress=6 \
      --no-password \
    > '${BACKUP_BEFORE_FILE}'"
  ok "Backup guardado: $BACKUP_BEFORE_FILE"
else
  warn "Opción --no-backup: se omite el backup de pre-prod."
fi

# ----------------------------------------------------------
# PASO 2: Dump de Producción
# ----------------------------------------------------------
header "Paso 2/4: Dump de Producción"

info "Ejecutando pg_dump en '$PROD_CONTAINER' (DB: $PROD_DB)..."
run "docker exec -e PGPASSWORD='${PROD_PASS}' '${PROD_CONTAINER}' \
  pg_dump -U '${PROD_USER}' -d '${PROD_DB}' \
    --format=custom \
    --compress=6 \
    --no-password \
    --verbose \
  > '${DUMP_FILE}'"

if ! $DRY_RUN; then
  DUMP_SIZE=$(du -sh "$DUMP_FILE" | cut -f1)
  ok "Dump generado: $DUMP_FILE ($DUMP_SIZE)"
fi

# ----------------------------------------------------------
# PASO 3: Limpiar DB de Pre-Producción
# ----------------------------------------------------------
header "Paso 3/4: Limpiar Pre-Producción"

info "Terminando conexiones activas a '$PRE_DB'..."
run "docker exec -e PGPASSWORD='${PRE_PASS}' '${PRE_CONTAINER}' \
  psql -U '${PRE_USER}' -d postgres -c \
  \"SELECT pg_terminate_backend(pid) FROM pg_stat_activity \
    WHERE datname = '${PRE_DB}' AND pid <> pg_backend_pid();\""

info "Eliminando base de datos '$PRE_DB'..."
run "docker exec -e PGPASSWORD='${PRE_PASS}' '${PRE_CONTAINER}' \
  psql -U '${PRE_USER}' -d postgres -c \
  \"DROP DATABASE IF EXISTS \\\"${PRE_DB}\\\";\""

info "Recreando base de datos '$PRE_DB'..."
run "docker exec -e PGPASSWORD='${PRE_PASS}' '${PRE_CONTAINER}' \
  psql -U '${PRE_USER}' -d postgres -c \
  \"CREATE DATABASE \\\"${PRE_DB}\\\" OWNER \\\"${PRE_USER}\\\";\""

ok "Base de datos pre-prod recreada limpia."

# ----------------------------------------------------------
# PASO 4: Restaurar dump en Pre-Producción
# ----------------------------------------------------------
header "Paso 4/4: Restaurar dump en Pre-Producción"

info "Copiando dump al contenedor pre-prod..."
run "docker cp '${DUMP_FILE}' '${PRE_CONTAINER}':/tmp/prod_snapshot.dump"

info "Ejecutando pg_restore en '$PRE_CONTAINER'..."
run "docker exec -e PGPASSWORD='${PRE_PASS}' '${PRE_CONTAINER}' \
  pg_restore \
    -U '${PRE_USER}' \
    -d '${PRE_DB}' \
    --no-password \
    --no-owner \
    --no-privileges \
    --exit-on-error \
    /tmp/prod_snapshot.dump"

info "Limpiando archivo temporal en el contenedor..."
run "docker exec '${PRE_CONTAINER}' rm -f /tmp/prod_snapshot.dump"

# ----------------------------------------------------------
# POST-RESTORE: ajustes opcionales para pre-prod
# ----------------------------------------------------------
header "Post-restauración: ajustes de Pre-Producción"

# Actualizar secuencias (por seguridad tras restore)
info "Actualizando secuencias de la DB..."
run "docker exec -e PGPASSWORD='${PRE_PASS}' '${PRE_CONTAINER}' \
  psql -U '${PRE_USER}' -d '${PRE_DB}' -c \
  \"SELECT setval(c.oid::regclass, \
           GREATEST(1, (SELECT MAX(id) FROM information_schema.tables AS t \
                        JOIN pg_class AS c2 ON c2.relname = t.table_name \
                        WHERE t.table_schema='public' LIMIT 1))) \
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace \
    WHERE c.relkind = 'S' AND n.nspname = 'public';\""

# Analizar tablas para que el planner tenga estadísticas frescas
info "Ejecutando ANALYZE para actualizar estadísticas del planner..."
run "docker exec -e PGPASSWORD='${PRE_PASS}' '${PRE_CONTAINER}' \
  psql -U '${PRE_USER}' -d '${PRE_DB}' -c 'ANALYZE;'"

# ----------------------------------------------------------
# RESUMEN FINAL
# ----------------------------------------------------------
header "Resumen"

if ! $DRY_RUN; then
  # Contar tablas restauradas
  TABLE_COUNT=$(docker exec -e PGPASSWORD="${PRE_PASS}" "${PRE_CONTAINER}" \
    psql -U "${PRE_USER}" -d "${PRE_DB}" -tAc \
    "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE';" 2>/dev/null || echo "N/D")

  echo ""
  ok "Sincronización completada exitosamente."
  echo -e "  ${BOLD}Tablas restauradas:${RESET} $TABLE_COUNT"
  echo -e "  ${BOLD}Dump fuente:${RESET}        $DUMP_FILE"
  [ "$DO_BACKUP" = true ] && \
  echo -e "  ${BOLD}Backup previo:${RESET}      $BACKUP_BEFORE_FILE"
  echo -e "  ${BOLD}Pre-prod DB:${RESET}        $PRE_DB @ $PRE_CONTAINER"
  echo ""
  info "Pre-producción ahora es una copia fiel de producción del ${TIMESTAMP}."
  info "URL: http://10.1.0.136/preprod"
else
  echo ""
  ok "DRY-RUN completado. Ningún dato fue modificado."
fi
