# conflict-atlas

Atlas interactivo de conflictos geopolíticos con mapa mundial (D3), filtros por intensidad, panel de detalle y soporte multilenguaje.

## Estructura modular

- `index.html`: layout principal y carga de librerías externas.
- `assets/css/styles.css`: estilos y temas (claro/oscuro).
- `assets/js/app.js`: lógica de UI, mapa, filtros, i18n e interacciones.
- `assets/data/conflicts.js`: datasets geopolíticos y utilidades de mapeo ISO.
- `server.js`: backend local y endpoint `POST /api/news`.

## Cambios criticos aplicados

- Mapeo de paises corregido para `world-atlas` usando IDs numericos ISO-3166 (`COUNTRY_ID_TO_ISO`).
- Se elimino la llamada directa del frontend a proveedores de IA.
- La app ahora consulta noticias via backend en `POST /api/news`.
- Se agrego timeout y manejo de error mas robusto para carga de noticias.

## Ejecucion local (estatico)

Puedes abrir `index.html` directamente en el navegador, pero la seccion de noticias requiere backend.

## Ejecucion local (con backend)

1. Instala dependencias:

```bash
npm install
```

2. Crea tu archivo de entorno desde el ejemplo:

```bash
copy .env.example .env
```

3. Configura `ANTHROPIC_API_KEY` en `.env`.

4. Inicia el servidor:

```bash
npm start
```

5. Abre:

`http://localhost:3000`

## Backend requerido para noticias

El frontend envia:

```json
{
	"conflictName": "Guerra Rusia-Ucrania",
	"region": "Europa del Este",
	"query": "guerra rusia ucrania frente 2025",
	"language": "es",
	"maxItems": 5
}
```

El backend debe responder con JSON:

```json
{
	"news": [
		{
			"headline": "...",
			"summary": "...",
			"source": "...",
			"date": "2026-03-06"
		}
	]
}
```

Notas:

- Devuelve entre 3 y 5 items cuando sea posible.
- Si no hay resultados, responde `{"news":[]}`.
- No expongas API keys en frontend. Usa variables de entorno en backend.
- Si falta `ANTHROPIC_API_KEY`, el endpoint devuelve `503` con `news: []`.