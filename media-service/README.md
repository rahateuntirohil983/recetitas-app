# recetitas media service

Servicio mínimo de almacenamiento de imágenes para recetas. Recibe archivos autenticados desde la API de recetitas.app, valida JPEG, PNG o WebP y los guarda fuera del directorio de la aplicación.

- Servicio local: `127.0.0.1:3004`
- Archivos persistentes: `/var/lib/recetitas-media`
- Publicación: `https://media-recetitas.hex-rp.com/files/...`
- Límite por imagen: 8 MB
