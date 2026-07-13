# recetitas media service

Además del almacenamiento, la VPS sirve directos WebRTC mediante MediaMTX. La autorización de publicación y lectura se valida contra la API de recetitas.app; ningún secreto de emisión se guarda en el navegador más allá de la sesión activa.

- Señalización WHIP/WHEP: `https://media-recetitas.hex-rp.com/live/...`
- Transporte WebRTC: puerto fijo 8189 UDP/TCP
- `LIVE_AUTH_URL`: endpoint de autorización de la API
- `LIVE_AUTH_TOKEN`: secreto compartido entre la API y la VPS

Servicio de almacenamiento de fotos y videos para recetas. Recibe archivos autenticados desde la API de recetitas.app, valida JPEG, PNG, WebP, MP4, WebM o QuickTime y los guarda fuera del directorio de la aplicación.

Los videos se validan con FFprobe y se convierten a MP4 H.264 de hasta 720 × 1280 para reproducirse de forma consistente en la web.

- Servicio local: `127.0.0.1:3004`
- Archivos persistentes: `/var/lib/recetitas-media`
- Publicación: `https://media-recetitas.hex-rp.com/files/...`
- Límite por imagen: 8 MB
- Límite de entrada por video: 50 MB
- Duración máxima: 35 segundos
