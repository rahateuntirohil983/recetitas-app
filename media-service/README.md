# recetitas media service

Servicio de almacenamiento de fotos y videos para recetas. Recibe archivos autenticados desde la API de recetitas.app, valida JPEG, PNG, WebP, MP4, WebM o QuickTime y los guarda fuera del directorio de la aplicación.

Los videos se validan con FFprobe y se convierten a MP4 H.264 de hasta 720 × 1280 para reproducirse de forma consistente en la web.

- Servicio local: `127.0.0.1:3004`
- Archivos persistentes: `/var/lib/recetitas-media`
- Publicación: `https://media-recetitas.hex-rp.com/files/...`
- Límite por imagen: 8 MB
- Límite de entrada por video: 50 MB
- Duración máxima: 35 segundos
