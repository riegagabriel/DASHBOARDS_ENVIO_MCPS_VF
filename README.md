# Dashboard MCP — Resumen (Next.js)

Auditoría de correcciones del padrón de MCPs (RENIEC) — herramienta de auditoría
interna. Versión Next.js/Vercel del dashboard que antes vivía en Streamlit
(`DASHBOARD_MCPS_PROBLEMAS`, proyecto hermano).

## Vistas

1. **Resumen ejecutivo** — KPIs, evolución del padrón por etapa, composición
   por estado de error, causas agrupadas, causas por provincia.
2. **Evolución de electores** — Top 20 MCPs por variación, proporción de
   correcciones, tabla filtrable por departamento/provincia.
3. **Mapa de errores** — filtros, gráfico de errores por provincia, mapa de
   coropletas (estado del error / causa predominante), tabla filtrable.
4. **Ficha por MCP** — buscador por nombre/código/departamento/provincia;
   incluye identidades históricas reclasificadas (ej. una MCP que cambió de
   distrito), mostrando a qué identidad vigente corresponde el resultado final.

Todos los KPIs se calculan sobre la lista final de MCPs únicas (vigentes) —
nunca sobre las filas de identidad histórica.

## Cómo correr localmente

```bash
npm install
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000).

## Datos

Los datos vienen de 2 fuentes (`data/source/`, no versionadas al repo — ver
`.gitignore`):

- `LISTA_HISTORICA_COMPLETA_MCP.xlsx` — identidad, historial de cambios de
  distrito/código, evolución Febrero→Abril→Junio→Final.
- `BASE_MCPS_FINALISISIMA_FUSIONADA.xlsx` — causas de error, detalle de
  electores pendientes, narrativa de casos especiales.
- `PROVINCIA.gpkg` — límites geográficos para el mapa de coropletas.

`scripts/build_data.py` cruza ambas fuentes y genera los estáticos que
consume la app (sí versionados):

- `data/mcps.json` — todas las MCP (vigentes + identidad histórica).
- `data/provincias.geojson` — límites de provincia.

Para regenerar tras actualizar los Excel fuente:

```bash
python scripts/build_data.py
```

Requiere `pandas`, `numpy`, `openpyxl` y `geopandas` (esta última solo para
leer el `.gpkg`).

## Stack

Next.js 16 (App Router) + TypeScript + Tailwind CSS + `react-plotly.js`
(mismo motor de mapas MapLibre que se validó en la versión Streamlit).

## Despliegue

Pensado para desplegarse en Vercel importando este repositorio directamente
— no requiere backend ni base de datos, todos los datos son estáticos
(`data/*.json`).
