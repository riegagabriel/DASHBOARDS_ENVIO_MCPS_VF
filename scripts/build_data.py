"""
Genera los archivos estáticos que consume el dashboard Next.js:
  - data/mcps.json       — todas las MCP (vigentes + identidad histórica ANTERIOR)
  - data/provincias.geojson — límites de provincia para el mapa de coropletas

Fuentes (data/source/, no se versionan al repo salvo los .xlsx):
  - LISTA_HISTORICA_COMPLETA_MCP.xlsx — identidad + evolución Feb→Abril→Junio→Final
  - BASE_MCPS_FINALISISIMA_FUSIONADA.xlsx — causas de error + narrativa de casos
  - PROVINCIA.gpkg — límites geográficos (no se commitea, ver .gitignore)

Ejecutar: python scripts/build_data.py
Misma lógica de limpieza/cruce que dashboard-mcps-problemas/app.py (proyecto
hermano en Streamlit) — si se corrige un bug de datos ahí, replicar aquí.
"""

import json
import re
import sys
import unicodedata
from pathlib import Path

import numpy as np
import pandas as pd

sys.stdout.reconfigure(encoding="utf-8")

ROOT = Path(__file__).parent.parent
SOURCE_DIR = ROOT / "data" / "source"
OUT_DIR = ROOT / "data"

LISTA_HISTORICA_PATH = SOURCE_DIR / "LISTA_HISTORICA_COMPLETA_MCP.xlsx"
BASE_FUSIONADA_PATH = SOURCE_DIR / "BASE_MCPS_FINALISISIMA_FUSIONADA.xlsx"
PROVINCIA_GPKG = SOURCE_DIR / "PROVINCIA.gpkg"


# ─────────────────────────────────────────────────────────────────────────────
# LIMPIEZA DE TEXTO (idéntica a la del dashboard Streamlit hermano)
# ─────────────────────────────────────────────────────────────────────────────

def unescape_excel_xml(s: str) -> str:
    return re.sub(r'_x([0-9A-Fa-f]{4})_', lambda m: chr(int(m.group(1), 16)), s)


def fix_garbled(s: str) -> str:
    try:
        buf = bytearray()
        for c in s:
            o = ord(c)
            if 0x0080 <= o <= 0x009F:
                buf.append(o)
            else:
                try:
                    buf.extend(c.encode("cp1252"))
                except UnicodeEncodeError:
                    return s
        return buf.decode("utf-8")
    except Exception:
        return s


def collapse_whitespace(s: str) -> str:
    s = re.sub(r'[\r\n]+', ' ', s)
    s = re.sub(r'\s{2,}', ' ', s)
    return s.strip()


def normalize_text(x):
    if pd.isna(x):
        return None
    s = str(x).strip()
    s = unescape_excel_xml(s)
    s = fix_garbled(s)
    s = collapse_whitespace(s)
    s = s.upper()
    return unicodedata.normalize("NFC", s)


def normalize_text_preserve_case(x):
    if pd.isna(x):
        return None
    s = str(x).strip()
    s = unescape_excel_xml(s)
    s = fix_garbled(s)
    s = collapse_whitespace(s)
    return unicodedata.normalize("NFC", s)


def normalize_cod(x, width=9):
    if pd.isna(x):
        return None
    try:
        return str(int(float(x))).zfill(width)
    except Exception:
        return None


def normalize_id_vinculo(x):
    """ID_VINCULO es casi siempre un código numérico (float sin padding al
    leer de Excel, ej. 10202001.0); en los 17 casos de cambio de identidad
    es un texto propio (ej. "BELLAVISTA_CALLARU"). Se normaliza el primer
    caso a 9 dígitos con ceros; el segundo se deja tal cual."""
    if pd.isna(x):
        return None
    cod = normalize_cod(x, 9)
    return cod if cod is not None else str(x)


def categorizar_causa(causa):
    if _is_nan(causa):
        return None
    c = causa.lower()
    if "fuera del hito" in c or "eq. operativo" in c or "equipo operativo" in c:
        return "Envío fuera de plazo (Eq. Operativo)"
    if "revisión manual" in c or "revision manual" in c:
        return "Error de revisión manual"
    if "distrito" in c and "quitad" in c:
        return "Electores de otro distrito quitados"
    if "no validada" in c:
        return "Otras causas puntuales"
    if any(k in c for k in ["omitió la inclusión", "omitio la inclusion", "omitió un anexo", "omitio un anexo", "faltó incluir", "falto incluir"]):
        return "GEO: omisión de listas/anexos"
    if any(k in c for k in ["desactualizada", "extemporaneo", "extemporáneo", "extemporaneos", "extemporáneos"]):
        return "GEO: información desactualizada o extemporánea"
    if any(k in c for k in ["asignó erroneamente", "asigno erroneamente", "dni"]):
        return "GEO: asignación incorrecta (códigos/DNI)"
    return "Otras causas puntuales"


def _is_nan(v) -> bool:
    """Detecta cualquier representación de 'faltante' de pandas/numpy: None,
    float('nan'), np.nan, y pd.NA (este último no es instancia de float, por
    eso un chequeo simple `isinstance(v, float)` no alcanza)."""
    try:
        return bool(pd.isna(v))
    except (TypeError, ValueError):
        return False


def nn(v):
    """None-or-float: convierte NaN/None a None, numérico a float nativo (json.dumps no serializa np.float64/NaN)."""
    if _is_nan(v):
        return None
    return float(v)


def ns(v):
    """None-or-string: convierte NaN/None a None; deja el resto tal cual.
    apply(axis=1) puede devolver np.nan (float) en vez de None en columnas
    de texto cuando el resultado es mixto — json.dumps no sabe serializar
    NaN como null, así que hay que limpiarlo explícitamente en cada campo
    de texto que salga de un apply/merge, no solo en los numéricos."""
    if _is_nan(v):
        return None
    return v


# ─────────────────────────────────────────────────────────────────────────────
# CARGA Y CRUCE
# ─────────────────────────────────────────────────────────────────────────────

def build_mcps():
    hist = pd.read_excel(LISTA_HISTORICA_PATH, sheet_name="LISTA_HISTORICA_MCP")
    fus = pd.read_excel(BASE_FUSIONADA_PATH, sheet_name="BASE_FUSIONADA")

    for d in (hist, fus):
        for col in ["DEPARTAMENTO", "PROVINCIA", "DISTRITO", "MCP"]:
            if col in d.columns:
                d[col] = d[col].apply(normalize_text)

    for col in ["CAUSA_ERROR_SUBSANADO", "ERROR_PENDIENTE_CAUSA", "ERROR_PENDIENTE_DETALLE", "DESCRIPCION_CASO"]:
        fus[col] = fus[col].apply(normalize_text_preserve_case)
    hist["NOTA"] = hist["NOTA"].apply(normalize_text_preserve_case)

    hist["_COD"] = hist["COD_MCP_RENIEC"].apply(lambda x: normalize_cod(x, 9))
    fus["_COD"] = fus["COD_MCP_RENIEC"].apply(lambda x: normalize_cod(x, 9))
    hist["UBIGEO"] = hist["UBIGEO"].apply(lambda x: normalize_cod(x, 6))

    cols_fus = [
        "_COD", "CAUSA_ERROR_SUBSANADO", "ERROR_PENDIENTE", "ERROR_PENDIENTE_CAUSA",
        "ERROR_PENDIENTE_DETALLE", "PRIMERA_SUBSANACION (ABRIL)", "SEGUNDA SUBSANACION (JUNIO)",
        "CORRECCION_A_ENVIO_JUNIO", "PADRON_ENVIADO_A_JUNIO_CON_CORRECCIONES",
        "DESCRIPCION_CASO",
    ]
    df = hist.merge(fus[cols_fus], on="_COD", how="left")

    df["ETAPA_FEBRERO"] = pd.to_numeric(df["HIST_FEBRERO"], errors="coerce")
    df["ETAPA_ABRIL"] = pd.to_numeric(df["HIST_ABRIL_CORTE"], errors="coerce")
    junio_efectivo = pd.to_numeric(df["HIST_JUNIO_CON_CORRECCIONES"], errors="coerce")
    df["ETAPA_JUNIO"] = junio_efectivo.fillna(df["ETAPA_ABRIL"])
    df["ETAPA_FINAL"] = pd.to_numeric(df["RESULTADO_FINAL"], errors="coerce")

    df["ES_ABRIL_REAL"] = df["PRIMERA_SUBSANACION (ABRIL)"].notna()
    df["ES_JUNIO_REAL"] = df["PADRON_ENVIADO_A_JUNIO_CON_CORRECCIONES"].notna()

    df["VARIACION_ABS"] = df["ETAPA_FINAL"] - df["ETAPA_FEBRERO"]
    df["VARIACION_PCT"] = np.where(
        df["ETAPA_FEBRERO"].fillna(0) != 0,
        df["VARIACION_ABS"] / df["ETAPA_FEBRERO"] * 100,
        np.nan,
    )
    df["N_CORRECCIONES"] = df[
        ["PRIMERA_SUBSANACION (ABRIL)", "SEGUNDA SUBSANACION (JUNIO)", "CORRECCION_A_ENVIO_JUNIO"]
    ].notna().sum(axis=1)

    df["ES_SUBSANADO"] = df["CAUSA_ERROR_SUBSANADO"].notna()
    df["ES_PENDIENTE"] = df["ERROR_PENDIENTE"].astype(str).str.strip().str.upper().eq("SI")

    def estado_error(row):
        if row["ES_PENDIENTE"]:
            return "PENDIENTE"
        if row["ES_SUBSANADO"]:
            return "SUBSANADO"
        return "SIN ERROR"

    df["ESTADO_ERROR"] = df.apply(estado_error, axis=1)

    def causa_unificada(row):
        if row["ESTADO_ERROR"] == "PENDIENTE":
            return row["ERROR_PENDIENTE_CAUSA"]
        if row["ESTADO_ERROR"] == "SUBSANADO":
            return row["CAUSA_ERROR_SUBSANADO"]
        return None

    df["CAUSA"] = df.apply(causa_unificada, axis=1)
    df["CAUSA_CATEGORIA"] = df["CAUSA"].apply(categorizar_causa)

    records = []
    for _, row in df.iterrows():
        records.append({
            # codMcpReniec: mismo valor normalizado (9 dígitos, con ceros a
            # la izquierda) que `cod` — el crudo de Excel es un float sin
            # padding (10202001.0 en vez de "010202001") y perdería el cero.
            "codMcpReniec": ns(row["_COD"]),
            "cod": ns(row["_COD"]),
            "ubigeo": ns(row["UBIGEO"]),
            "departamento": ns(row["DEPARTAMENTO"]),
            "provincia": ns(row["PROVINCIA"]),
            "distrito": ns(row["DISTRITO"]),
            "mcp": ns(row["MCP"]),
            "rolFila": ns(row["ROL_FILA"]),
            "idVinculo": normalize_id_vinculo(row["ID_VINCULO"]),
            "clasificacionHistorica": row["CLASIFICACION_HISTORICA"] if pd.notna(row["CLASIFICACION_HISTORICA"]) else None,
            "etapaFebrero": nn(row["ETAPA_FEBRERO"]),
            "etapaAbril": nn(row["ETAPA_ABRIL"]),
            "etapaJunio": nn(row["ETAPA_JUNIO"]),
            "etapaFinal": nn(row["ETAPA_FINAL"]),
            "esAbrilReal": bool(row["ES_ABRIL_REAL"]),
            "esJunioReal": bool(row["ES_JUNIO_REAL"]),
            "variacionAbs": nn(row["VARIACION_ABS"]),
            "variacionPct": nn(row["VARIACION_PCT"]),
            "nCorrecciones": int(row["N_CORRECCIONES"]),
            "estadoError": ns(row["ESTADO_ERROR"]),
            "causa": ns(row["CAUSA"]),
            "causaCategoria": ns(row["CAUSA_CATEGORIA"]),
            "errorPendienteDetalle": row["ERROR_PENDIENTE_DETALLE"] if pd.notna(row["ERROR_PENDIENTE_DETALLE"]) else None,
            "descripcionCaso": row["DESCRIPCION_CASO"] if pd.notna(row["DESCRIPCION_CASO"]) else None,
            "nota": row["NOTA"] if pd.notna(row["NOTA"]) else None,
            "fuenteResultadoFinal": row["FUENTE_RESULTADO_FINAL"] if pd.notna(row["FUENTE_RESULTADO_FINAL"]) else None,
        })
    return records


def build_provincias_geojson():
    import geopandas as gpd

    gdf = gpd.read_file(PROVINCIA_GPKG)
    gdf["nombdep"] = gdf["nombdep"].str.upper().str.strip()
    gdf["nombprov"] = gdf["nombprov"].str.upper().str.strip()
    gdf["nombprov"] = gdf["nombprov"].replace({"ANTONIO RAYMONDI": "ANTONIO RAIMONDI"})
    gdf["idProv"] = gdf["nombdep"] + " - " + gdf["nombprov"]
    gdf["geometry"] = gdf["geometry"].simplify(0.01, preserve_topology=True)
    return json.loads(gdf[["idProv", "nombdep", "nombprov", "geometry"]].to_json())


def main():
    OUT_DIR.mkdir(exist_ok=True)

    mcps = build_mcps()
    with open(OUT_DIR / "mcps.json", "w", encoding="utf-8") as f:
        # allow_nan=False: si se cuela un NaN sin limpiar, falla acá con un
        # error claro en vez de producir un mcps.json con literales `NaN`
        # (JSON inválido — TypeScript lo rechaza al importarlo).
        json.dump(mcps, f, ensure_ascii=False, allow_nan=False)
    vigentes = [m for m in mcps if m["rolFila"] != "ANTERIOR"]
    print(f"mcps.json: {len(mcps)} filas totales, {len(vigentes)} vigentes")
    print(f"  suma etapaFinal (vigentes): {sum(m['etapaFinal'] or 0 for m in vigentes):,.0f}")
    print(f"  codigos duplicados: {len(vigentes) - len(set(m['cod'] for m in vigentes))}")

    geojson = build_provincias_geojson()
    with open(OUT_DIR / "provincias.geojson", "w", encoding="utf-8") as f:
        json.dump(geojson, f, ensure_ascii=False)
    print(f"provincias.geojson: {len(geojson['features'])} features")


if __name__ == "__main__":
    main()
