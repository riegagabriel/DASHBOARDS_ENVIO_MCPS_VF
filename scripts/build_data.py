"""
Genera data/mcps.json — todas las MCP (vigentes + identidades ANTERIOR)

Fuentes de verdad (jerarquía):
  1. LISTA_FINAL_MCPS_11_08.xlsx    — lista canónica de 3 388 MCPs + conteo final + carpetaOrigen
  2. VERSIONES_PADRONES_MCP.xlsx    — conteos por etapa (8 hojas: FEB, ABR, JUN×2, JUL×3, AGO)
  3. BASE_MCPS_FINALISISIMA_FUSIONADA.xlsx — datos de error (causa, pendiente, descripción)
  4. LISTA_HISTORICA_COMPLETA_MCP.xlsx     — ROL_FILA, ID_VINCULO, clasificación, filas ANTERIOR

Ejecutar: py scripts/build_data.py
"""

import json, re, sys, unicodedata
from pathlib import Path

import numpy as np
import pandas as pd

sys.stdout.reconfigure(encoding="utf-8")

ROOT       = Path(__file__).parent.parent
SOURCE_DIR = ROOT / "data" / "source"
OUT_DIR    = ROOT / "data"

LISTA_FINAL_PATH    = ROOT / "LISTA_FINAL_MCPS_11_08.xlsx"
VERSIONES_PATH      = ROOT / "VERSIONES_PADRONES_MCP.xlsx"
BASE_FUSIONADA_PATH = SOURCE_DIR / "BASE_MCPS_FINALISISIMA_FUSIONADA.xlsx"
LISTA_HISTORICA_PATH = SOURCE_DIR / "LISTA_HISTORICA_COMPLETA_MCP.xlsx"
PROVINCIA_GPKG      = SOURCE_DIR / "PROVINCIA.gpkg"


# ─────────────────────────────────────────────────────────────────
# Limpieza de texto
# ─────────────────────────────────────────────────────────────────

def _unescape_xml(s: str) -> str:
    return re.sub(r'_x([0-9A-Fa-f]{4})_', lambda m: chr(int(m.group(1), 16)), s)

def _fix_garbled(s: str) -> str:
    try:
        buf = bytearray()
        for c in s:
            o = ord(c)
            buf.append(o) if 0x0080 <= o <= 0x009F else buf.extend(c.encode("cp1252"))
        return buf.decode("utf-8")
    except Exception:
        return s

def _is_nan(v) -> bool:
    try:
        return bool(pd.isna(v))
    except (TypeError, ValueError):
        return False

def clean(x, upper=True) -> str | None:
    if _is_nan(x):
        return None
    s = re.sub(r'\s{2,}', ' ', re.sub(r'[\r\n]+', ' ', _unescape_xml(_fix_garbled(str(x).strip())))).strip()
    s = unicodedata.normalize("NFC", s)
    return s.upper() if upper else s

def cod9(x) -> str | None:
    if _is_nan(x):
        return None
    try:
        return str(int(float(x))).zfill(9)
    except Exception:
        return None

def nn(v):
    """None-or-float (json.dumps no serializa np.float64/NaN)."""
    return None if _is_nan(v) else float(v)

def ns(v):
    """None-or-string."""
    return None if _is_nan(v) else v

def ni(v) -> int | None:
    return None if _is_nan(v) else int(v)

def normalize_id_vinculo(x):
    if _is_nan(x):
        return None
    c = cod9(x)
    return c if c is not None else str(x)

CAUSA_MAP = [
    (["fuera del hito", "eq. operativo", "equipo operativo"],          "Envío fuera de plazo (Eq. Operativo)"),
    (["revisión manual", "revision manual"],                            "Error de revisión manual"),
    (["distrito", "quitad"],                                            "Electores de otro distrito quitados"),
    (["no validada"],                                                   "Otras causas puntuales"),
    (["omitió la inclusión","omitio la inclusion","omitió un anexo",
      "omitio un anexo","faltó incluir","falto incluir"],               "GEO: omisión de listas/anexos"),
    (["desactualizada","extemporaneo","extemporáneo",
      "extemporaneos","extemporáneos"],                                 "GEO: información desactualizada o extemporánea"),
    (["asignó erroneamente","asigno erroneamente","dni"],               "GEO: asignación incorrecta (códigos/DNI)"),
]

def categorizar_causa(causa) -> str | None:
    if _is_nan(causa):
        return None
    c = causa.lower()
    for keywords, cat in CAUSA_MAP:
        if any(k in c for k in keywords):
            return cat
    return "Otras causas puntuales"


# ─────────────────────────────────────────────────────────────────
# Carga de fuentes
# ─────────────────────────────────────────────────────────────────

def load_lista_final() -> dict[str, dict]:
    """Fuente 1: lista canónica. Retorna {cod: {cantidad, carpetaOrigen}}."""
    df = pd.read_excel(LISTA_FINAL_PATH)
    df["_COD"] = df["COD_MCP_RENIEC"].apply(cod9)
    return {
        row["_COD"]: {
            "cantidad": ni(row["CANTIDAD_ELECTORES"]),
            "carpetaOrigen": ns(row["CARPETA_ORIGEN"]),
        }
        for _, row in df.iterrows() if row["_COD"]
    }


def load_versiones() -> dict[str, dict]:
    """
    Fuente 2: conteos por etapa (todas las rondas).
    Retorna {cod: {feb, abr, jun, jul, ago,
                   esAbrilReal, esJunioReal, esJulioReal, esAgostoReal}}.

    Lógica de arrastre:
      feb → abr (si no hay envío real) → jun → jul → ago
    """
    xl = pd.ExcelFile(VERSIONES_PATH)

    def read_sheet(name: str) -> dict[str, int]:
        df = xl.parse(name)
        df["_COD"] = df["COD_MCP_RENIEC"].apply(cod9)
        return {row["_COD"]: ni(row["CANTIDAD"]) for _, row in df.iterrows() if row["_COD"]}

    feb  = read_sheet("1_FEBRERO")
    abr  = read_sheet("2_ABRIL")
    jun1 = read_sheet("3_JUNIO_ORIG")
    jun2 = read_sheet("4_JUNIO_POST")
    jun  = {**jun1, **jun2}
    jul  = {
        **read_sheet("5_JULIO_JAEN"),
        **read_sheet("6_JULIO_PICHANAQUI"),
        **read_sheet("7_JULIO_31MCPS"),
    }
    ago  = read_sheet("8_AGOSTO")

    all_cods = set(feb) | set(abr) | set(jun) | set(jul) | set(ago)
    out: dict[str, dict] = {}
    for cod in all_cods:
        feb_val = feb.get(cod)
        abr_real = cod in abr;  abr_val = abr.get(cod) if abr_real else feb_val
        jun_real = cod in jun;  jun_val = jun.get(cod) if jun_real else abr_val
        jul_real = cod in jul;  jul_val = jul.get(cod) if jul_real else jun_val
        ago_real = cod in ago;  ago_val = ago.get(cod) if ago_real else jul_val
        out[cod] = {
            "feb": feb_val,
            "abr": abr_val, "esAbrilReal":  abr_real,
            "jun": jun_val, "esJunioReal":  jun_real,
            "jul": jul_val, "esJulioReal":  jul_real,
            "ago": ago_val, "esAgostoReal": ago_real,
        }
    return out


def load_base_fusionada() -> dict[str, dict]:
    """
    Fuente 3: datos de error.
    Retorna {cod: {estadoError, causa, causaCategoria, errorPendienteDetalle,
                   descripcionCaso, fuenteResultadoFinal}}.
    """
    df = pd.read_excel(BASE_FUSIONADA_PATH, sheet_name="BASE_FUSIONADA")
    df["_COD"] = df["COD_MCP_RENIEC"].apply(cod9)
    for col in ["CAUSA_ERROR_SUBSANADO", "ERROR_PENDIENTE_CAUSA",
                "ERROR_PENDIENTE_DETALLE", "DESCRIPCION_CASO"]:
        df[col] = df[col].apply(lambda x: clean(x, upper=False))

    out: dict[str, dict] = {}
    for _, row in df.iterrows():
        cod = row["_COD"]
        if not cod:
            continue
        es_pendiente = str(row.get("ERROR_PENDIENTE", "")).strip().upper() == "SI"
        es_subsanado = not _is_nan(row.get("CAUSA_ERROR_SUBSANADO"))
        if es_pendiente:
            estado = "PENDIENTE"
            causa  = clean(row.get("ERROR_PENDIENTE_CAUSA"), upper=False)
        elif es_subsanado:
            estado = "SUBSANADO"
            causa  = clean(row.get("CAUSA_ERROR_SUBSANADO"), upper=False)
        else:
            estado = "SIN ERROR"
            causa  = None
        out[cod] = {
            "estadoError":           estado,
            "causa":                 causa,
            "causaCategoria":        categorizar_causa(causa),
            "errorPendienteDetalle": ns(row.get("ERROR_PENDIENTE_DETALLE")),
            "descripcionCaso":       ns(row.get("DESCRIPCION_CASO")),
            "fuenteResultadoFinal":  ns(row.get("FUENTE_CANTIDAD_FINAL")),
        }
    return out


def load_historica() -> dict[str, dict]:
    """
    Fuente 4: metadatos de identidad + filas ANTERIOR.
    Retorna {cod: {..., _esAnterior: bool}}.
    Para filas ANTERIOR también incluye los valores de etapa
    pre-extraídos como enteros nativos (sin numpy).
    """
    df = pd.read_excel(LISTA_HISTORICA_PATH, sheet_name="LISTA_HISTORICA_MCP")
    for col in ["DEPARTAMENTO", "PROVINCIA", "DISTRITO", "MCP"]:
        df[col] = df[col].apply(clean)
    df["NOTA"] = df["NOTA"].apply(lambda x: clean(x, upper=False))
    df["_COD"] = df["COD_MCP_RENIEC"].apply(cod9)
    df["UBIGEO"] = df["UBIGEO"].apply(lambda x: cod9(x)[:6] if cod9(x) else None)

    def _ni_col(row, col):
        v = row.get(col)
        return None if _is_nan(v) else int(v)

    out: dict[str, dict] = {}
    for _, row in df.iterrows():
        cod = row["_COD"]
        if not cod or _is_nan(cod):
            continue
        es_anterior = str(row.get("ROL_FILA", "")).strip().upper() == "ANTERIOR"
        entry: dict = {
            "rolFila":                ns(row.get("ROL_FILA")),
            "idVinculo":              normalize_id_vinculo(row.get("ID_VINCULO")),
            "clasificacionHistorica": ns(row.get("CLASIFICACION_HISTORICA")),
            "nota":                   ns(row.get("NOTA")),
            "ubigeo":                 ns(row.get("UBIGEO")),
            "departamento":           ns(row.get("DEPARTAMENTO")),
            "provincia":              ns(row.get("PROVINCIA")),
            "distrito":               ns(row.get("DISTRITO")),
            "mcp":                    ns(row.get("MCP")),
            "_esAnterior":            es_anterior,
        }
        if es_anterior:
            entry["_ant_etapaFebrero"]  = _ni_col(row, "HIST_FEBRERO")
            entry["_ant_etapaAbril"]    = _ni_col(row, "HIST_ABRIL_CORTE")
            entry["_ant_etapaJunio"]    = _ni_col(row, "HIST_JUNIO_CON_CORRECCIONES")
            entry["_ant_etapaFinal"]    = _ni_col(row, "RESULTADO_FINAL")
            entry["_ant_esAbrilReal"]   = not _is_nan(row.get("HIST_ABRIL_SUBSANACION"))
            entry["_ant_esJunioReal"]   = not _is_nan(row.get("HIST_JUNIO_SUBSANACION"))
            entry["_ant_descripcion"]   = clean(row.get("DESCRIPCION_CASO"), upper=False) if "DESCRIPCION_CASO" in row.index else None
        out[cod] = entry
    return out


# ─────────────────────────────────────────────────────────────────
# Construcción del JSON
# ─────────────────────────────────────────────────────────────────

def build_mcps() -> list[dict]:
    print("Cargando fuentes...")
    final_map   = load_lista_final()
    ver_map     = load_versiones()
    error_map   = load_base_fusionada()
    hist_map    = load_historica()
    print(f"  LISTA_FINAL:    {len(final_map):,} MCPs")
    print(f"  VERSIONES:      {len(ver_map):,} MCPs con dato en alguna etapa")
    print(f"  BASE_FUSIONADA: {len(error_map):,} MCPs con datos de error")
    print(f"  LISTA_HISTORICA:{len(hist_map):,} filas (vigentes + anteriores)")

    records: list[dict] = []

    # ── Vigentes: iteramos sobre LISTA_FINAL (fuente canónica) ──────
    for cod, fin in final_map.items():
        ver   = ver_map.get(cod, {})
        err   = error_map.get(cod, {
            "estadoError": "SIN ERROR", "causa": None, "causaCategoria": None,
            "errorPendienteDetalle": None, "descripcionCaso": None, "fuenteResultadoFinal": None,
        })
        hist  = hist_map.get(cod, {})

        feb = ver.get("feb")
        abr = ver.get("abr")
        jun = ver.get("jun")
        jul = ver.get("jul")
        ago = ver.get("ago")
        final_val = fin["cantidad"]
        es_abr_real = ver.get("esAbrilReal",  False)
        es_jun_real = ver.get("esJunioReal",  False)
        es_jul_real = ver.get("esJulioReal",  False)
        es_ago_real = ver.get("esAgostoReal", False)

        if feb is not None and final_val is not None:
            variacion_abs = final_val - feb
            variacion_pct = round(variacion_abs / feb * 100, 2) if feb != 0 else None
        else:
            variacion_abs = None
            variacion_pct = None

        n_cor = (
            (1 if feb is not None else 0)
            + (1 if es_abr_real else 0)
            + (1 if es_jun_real else 0)
            + (1 if es_jul_real else 0)
            + (1 if es_ago_real else 0)
        )

        records.append({
            "codMcpReniec":           cod,
            "cod":                    cod,
            "ubigeo":                 hist.get("ubigeo"),
            "departamento":           hist.get("departamento"),
            "provincia":              hist.get("provincia"),
            "distrito":               hist.get("distrito"),
            "mcp":                    hist.get("mcp"),
            "rolFila":                hist.get("rolFila") or "UNICA",
            "idVinculo":              hist.get("idVinculo"),
            "clasificacionHistorica": hist.get("clasificacionHistorica"),
            "carpetaOrigen":          fin["carpetaOrigen"],
            "etapaFebrero":           feb,
            "etapaAbril":             abr,
            "etapaJunio":             jun,
            "etapaJulio":             jul,
            "etapaAgosto":            ago,
            "etapaFinal":             final_val,
            "esAbrilReal":            es_abr_real,
            "esJunioReal":            es_jun_real,
            "esJulioReal":            es_jul_real,
            "esAgostoReal":           es_ago_real,
            "variacionAbs":           variacion_abs,
            "variacionPct":           variacion_pct,
            "nCorrecciones":          n_cor,
            "estadoError":            err.get("estadoError", "SIN ERROR"),
            "causa":                  err.get("causa"),
            "causaCategoria":         err.get("causaCategoria"),
            "errorPendienteDetalle":  err.get("errorPendienteDetalle"),
            "descripcionCaso":        err.get("descripcionCaso"),
            "nota":                   hist.get("nota"),
            "fuenteResultadoFinal":   err.get("fuenteResultadoFinal"),
        })

    # ── Anteriores: filas históricas (identidades reclasificadas) ──
    for cod, hist in hist_map.items():
        if not hist.get("_esAnterior"):
            continue
        records.append({
            "codMcpReniec":           cod,
            "cod":                    cod,
            "ubigeo":                 hist.get("ubigeo"),
            "departamento":           hist.get("departamento"),
            "provincia":              hist.get("provincia"),
            "distrito":               hist.get("distrito"),
            "mcp":                    hist.get("mcp"),
            "rolFila":                "ANTERIOR",
            "idVinculo":              hist.get("idVinculo"),
            "clasificacionHistorica": hist.get("clasificacionHistorica"),
            "carpetaOrigen":          None,
            "etapaFebrero":           hist.get("_ant_etapaFebrero"),
            "etapaAbril":             hist.get("_ant_etapaAbril"),
            "etapaJunio":             hist.get("_ant_etapaJunio"),
            "etapaJulio":             None,
            "etapaAgosto":            None,
            "etapaFinal":             hist.get("_ant_etapaFinal"),
            "esAbrilReal":            hist.get("_ant_esAbrilReal", False),
            "esJunioReal":            hist.get("_ant_esJunioReal", False),
            "esJulioReal":            False,
            "esAgostoReal":           False,
            "variacionAbs":           None,
            "variacionPct":           None,
            "nCorrecciones":          0,
            "estadoError":            "SIN ERROR",
            "causa":                  None,
            "causaCategoria":         None,
            "errorPendienteDetalle":  None,
            "descripcionCaso":        hist.get("_ant_descripcion"),
            "nota":                   hist.get("nota"),
            "fuenteResultadoFinal":   None,
        })

    return records


def build_provincias_geojson():
    import geopandas as gpd
    gdf = gpd.read_file(PROVINCIA_GPKG)
    gdf["nombdep"]  = gdf["nombdep"].str.upper().str.strip()
    gdf["nombprov"] = gdf["nombprov"].str.upper().str.strip().replace(
        {"ANTONIO RAYMONDI": "ANTONIO RAIMONDI"}
    )
    gdf["idProv"]   = gdf["nombdep"] + " - " + gdf["nombprov"]
    gdf["geometry"] = gdf["geometry"].simplify(0.01, preserve_topology=True)
    return json.loads(gdf[["idProv", "nombdep", "nombprov", "geometry"]].to_json())


def main():
    OUT_DIR.mkdir(exist_ok=True)

    mcps = build_mcps()
    vigentes = [m for m in mcps if m["rolFila"] != "ANTERIOR"]
    anteriores = [m for m in mcps if m["rolFila"] == "ANTERIOR"]

    with open(OUT_DIR / "mcps.json", "w", encoding="utf-8") as f:
        json.dump(mcps, f, ensure_ascii=False, allow_nan=False, separators=(",", ":"))

    total_elec = sum(m["etapaFinal"] or 0 for m in vigentes)
    sin_error   = sum(1 for m in vigentes if m["estadoError"] == "SIN ERROR")
    subsanados  = sum(1 for m in vigentes if m["estadoError"] == "SUBSANADO")
    pendientes  = sum(1 for m in vigentes if m["estadoError"] == "PENDIENTE")
    nuevas      = sum(1 for m in vigentes if m["etapaFebrero"] is None)
    dups        = len(vigentes) - len({m["cod"] for m in vigentes})

    print(f"\n=== mcps.json generado ===")
    print(f"  Filas totales    : {len(mcps):,}  ({len(vigentes):,} vigentes + {len(anteriores)} anteriores)")
    print(f"  Total electores  : {total_elec:,}")
    print(f"  SIN ERROR        : {sin_error:,}")
    print(f"  SUBSANADO        : {subsanados:,}")
    print(f"  PENDIENTE        : {pendientes:,}")
    print(f"  Nuevas (post-feb): {nuevas:,}")
    print(f"  Duplicados       : {dups}")

    if PROVINCIA_GPKG.exists():
        geojson = build_provincias_geojson()
        with open(OUT_DIR / "provincias.geojson", "w", encoding="utf-8") as f:
            json.dump(geojson, f, ensure_ascii=False)
        print(f"  provincias.geojson: {len(geojson['features'])} features")
    else:
        print(f"  provincias.geojson: omitido (PROVINCIA.gpkg no encontrado en {PROVINCIA_GPKG})")


if __name__ == "__main__":
    main()
