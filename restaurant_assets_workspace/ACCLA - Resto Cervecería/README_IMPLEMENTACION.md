# ACCLA — paquete web de reemplazo

Este ZIP fue armado a partir de la imagen de referencia que adjuntaste.

## Archivos

- `index.html` — estructura completa.
- `styles.css` — réplica visual responsive.
- `data.js` — horarios, datos del negocio, acciones y menú.
- `asset-loader.js` — resuelve automáticamente los assets locales por nombre base.
- `menu.js` — menú desplegable/carrusel por categorías.
- `script.js` — navegación mobile, horarios y modales.
- `reference-media/` — recortes fotográficos de la referencia para que la web pueda verse inmediatamente.
- `README_IMPLEMENTACION.md` — este archivo.

## IMPORTANTE: carpeta `assets`

NO copié tus 14 assets al ZIP.

El código busca directamente:

`./assets/01_logo_accla`
`./assets/02_flecha_derecha_dorada`
`./assets/03_lupulo_lineal`
`./assets/04_icono_bolsa_retiro`
`./assets/05_icono_cumpleanos`
`./assets/06_icono_amigos`
`./assets/07_icono_cena_especial`
`./assets/08_lettering_buena_cerveza_llevar`
`./assets/09_pin_ubicacion`
`./assets/10_icono_reloj`
`./assets/11_icono_email`
`./assets/12_icono_instagram`
`./assets/13_icono_facebook`
`./assets/14_lettering_footer`

No hace falta que la extensión sea exactamente `.png`: `asset-loader.js` prueba automáticamente:

`.png`, `.webp`, `.jpg`, `.jpeg`, `.svg`.

Por eso podés descomprimir estos archivos dentro de:

`restaurant_assets_workspace/ACCLA - Resto Cervecería/`

dejando tu carpeta `assets` actual donde ya está.

## Menú interactivo

La sección MENÚ funciona como pediste:

1. estado compacto;
2. click en `BURGERS`, `CERVEZAS`, `PICADAS` o `PIZZAS`;
3. la propia sección MENÚ crece hacia abajo;
4. RESERVAS baja de posición;
5. se abre un carrusel;
6. cada producto muestra EXCLUSIVAMENTE:
   - imagen;
   - nombre;
   - precio;
7. al cambiar de categoría, cambia el contenido sin colapsar toda la sección;
8. al volver a clickear la categoría activa, se cierra.

Los datos temporales están centralizados en `data.js`.

## Conectar Tango Reservas

En `data.js`:

```js
actions: {
  bookingUrl: "",
  orderUrl: "",
  whatsappUrl: ""
}
```

Podés reemplazar esas rutas por las URLs/endpoints reales.

Los formularios actuales funcionan como demostración local y NO escriben todavía en Supabase.

## Fotografías

Los 14 assets de tu carpeta no contienen las fotografías del mockup. Para evitar pedirte más archivos, incluí en `reference-media/` recortes de la propia referencia adjuntada.

Esto permite abrir el sitio inmediatamente y evaluar composición/proporciones.

Más adelante, si tenés las fotos originales en alta resolución, solamente hay que sustituir los archivos de `reference-media` o cambiar las rutas correspondientes.

## Cómo probar

1. Descomprimí el ZIP.
2. Copiá los archivos dentro de la carpeta de ACCLA, al mismo nivel donde está `assets`.
3. Conservá la carpeta `assets` existente.
4. Abrí `index.html`, o mejor servilo con tu servidor local.
5. Probá:
   - navegación;
   - reservar;
   - menú;
   - todas las categorías;
   - flechas del carrusel;
   - pedidos;
   - responsive.

## Estructura esperada

```text
ACCLA - Resto Cervecería/
│
├── assets/
│   ├── 01_logo_accla.*
│   ├── 02_flecha_derecha_dorada.*
│   └── ...
│
├── reference-media/
│   └── ...
│
├── index.html
├── styles.css
├── data.js
├── asset-loader.js
├── menu.js
├── script.js
└── README_IMPLEMENTACION.md
```
