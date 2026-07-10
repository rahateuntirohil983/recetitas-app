# Auditoría breve de recetitas.app

## Alcance

Landing publicada en Sites, recorrida en escritorio desde la portada hasta el formulario de registro. Se verificaron también las rutas de assets publicadas y la consola del navegador.

## Objetivo del usuario

Entender rápidamente qué es recetitas.app y dejar su correo para enterarse cuando abra la comunidad.

## Evidencia

1. `01-live-home.png` — portada publicada.
2. `02-manifest-after-cta.png` — destino del CTA “Explorar recetas”.
3. `03-signup-after-cta.png` — destino del CTA “Compartir la mía”.
4. `04-form-success.png` — confirmación después de enviar el formulario.

## Lo que funciona bien

- La propuesta se entiende en el primer viewport: recetas de gente real, guardar y volver a cocinar.
- La jerarquía editorial es distintiva y consistente con la referencia visual.
- Los dos CTA principales son claros y llevan a secciones reales.
- El formulario tiene etiqueta accesible, validación nativa y estado de confirmación con `role="status"`.
- La portada publicada carga sin errores de consola y sin overflow horizontal.

## Riesgos y oportunidades

1. El formulario todavía es una simulación local: confirma el correo, pero no lo persiste ni lo envía a una lista real.
2. “Mis guardadas” y “Compartir receta” en el footer vuelven a llevar al registro; cuando exista la app deberían apuntar a rutas reales o presentarse como acciones futuras.
3. La landing no muestra prueba social todavía. Una cifra pequeña (“recetas guardadas”, “cocineros reales”) podría reforzar confianza cuando haya datos reales.
4. El contraste y los focos visibles están cuidados en la implementación, pero la conformidad WCAG completa requiere una pasada con lector de pantalla y teclado en varios navegadores.

## Mejoras aplicadas

- Se corrigió el adaptador de Sites para servir `dist/client` y eliminar el 404 de producción.
- Se convirtió el logo y las fotografías a WebP y se añadieron `decoding`, `fetchpriority` y `loading` apropiados. El paquete publicado bajó aproximadamente de 5.9 MB a 0.7 MB.
- Se añadió el mensaje “Sin spam…” debajo del formulario para reducir fricción y aumentar confianza.

## Próximas mejoras recomendadas

- Conectar el formulario a una lista de espera real con consentimiento y política de privacidad.
- Añadir eventos de analítica para medir clics en ambos CTA y envíos válidos.
- Sustituir los enlaces de placeholder del footer cuando estén definidas las rutas de la red social.
