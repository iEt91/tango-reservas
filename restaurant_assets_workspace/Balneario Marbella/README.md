# Balneario Marbella — implementación individual

La composición toma `reference.png` (941 × 1672 px) como autoridad visual y escala a un viewport desktop de 1920 px de ancho. La captura de validación resultante mide 1920 × 3410 px.

## Contenido editable

Todo el contenido reemplazable está centralizado en `data.js`:

- identidad, descripción, dirección, teléfono, WhatsApp, Instagram y URL pública;
- foto, textos y CTA del hero;
- cuatro destacados;
- categorías, platos, descripciones, precios, disponibilidad e imágenes del menú;
- foto de experiencia;
- textos y destinos de reservas y delivery;
- seis imágenes y epígrafes de galería;
- horarios y datos de contacto;
- flags `showMenu`, `showReservations`, `showDelivery`, `showWhatsApp`, `showGallery` y `showMap`.

Los recortes de `media/reference-defaults/` son los contenidos comerciales iniciales aprobados. Pueden reemplazarse sin alterar tamaño, posición, máscara ni composición de sus slots.

## Diseño fijo

El HTML y `styles.css` conservan la geometría, máscaras, proporciones, tipografías, colores, textura, ondas, ramas, iconografía, mapa ilustrado, reservas, delivery, polaroids y footer. Los assets estructurales se cargan desde `assets/` mediante `asset-loader.js`.

## Validación visual

La carpeta `validation/` contiene:

- `marbella-1920-full.png`: captura completa a 1920 px de ancho;
- `reference-1920.png`: reference escalada proporcionalmente;
- `overlay-50.png`: superposición al 50 %;
- `diff-amplified.png`: diferencias amplificadas.

Servir la raíz del repositorio con `python -m http.server 8765 --bind 127.0.0.1` y abrir:

`http://127.0.0.1:8765/restaurant_assets_workspace/Balneario%20Marbella/index.html`
