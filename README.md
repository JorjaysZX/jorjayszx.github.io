# Beat Teams PWA — versión 2

## Mejoras de esta versión
- Guarda automáticamente nombres, colores, configuración, cuadro y resultados en el almacenamiento local del navegador.
- Al volver a abrir, recupera el torneo con los relojes detenidos por seguridad.
- Botón de pantalla completa.
- Solicitud de mantener la pantalla encendida durante el duelo cuando Android/navegador lo permite.
- Resultados de las partidas por cronómetro avanzan automáticamente en el cuadro.
- Torneo de 4 equipos (dos semifinales y final) o 6 equipos (dos duelos iniciales, dos pases directos a semifinal y final).

## Instalación PWA en Android
1. Descomprime el ZIP.
2. Publica los archivos de la carpeta en un hosting estático HTTPS.
3. Abre la URL con Chrome para Android.
4. Menú ⋮ → Instalar aplicación / Añadir a pantalla de inicio.
5. Abre la app una vez con conexión para que se cachee y luego prueba sin conexión.

No abras `index.html` desde el administrador de archivos: el modo PWA y el funcionamiento offline requieren HTTPS o localhost.

## Prueba local en PC
En la carpeta del proyecto ejecuta `python -m http.server 8000` y visita `http://localhost:8000`.

## Uso
1. En Equipos y torneo, elige 4 o 6, número de rondas y tiempo.
2. Edita nombres y colores y pulsa Guardar equipos.
3. Pulsa Generar / reiniciar torneo.
4. En Cuadro, selecciona el primer duelo.
5. En Cara a cara, pulsa Iniciar. El reloj izquierdo comienza por defecto; puedes tocar el otro panel para cambiar el turno.
6. Una respuesta incorrecta deja el turno en el equipo actual. Toca al rival únicamente cuando haya acertado.
7. Al agotarse un reloj, esa ronda se adjudica al rival automáticamente. Si nadie ha ganado el duelo todavía, pulsa Siguiente ronda.
8. Al ganar dos rondas, el equipo avanza automáticamente en el cuadro.
9. Los resultados y la configuración se guardan localmente en el navegador de ese dispositivo.

## Limitaciones
- Es una PWA, no un APK nativo. No está publicada en Google Play.
- No se ha probado en todos los modelos Android. El navegador puede restringir sonido, pantalla completa o mantener pantalla encendida.
- El almacenamiento es local al navegador/app y no se sincroniza entre dispositivos. Borrar datos del navegador puede borrar el torneo.
- Mantén la aplicación visible durante los duelos para evitar restricciones de temporizador en segundo plano.
