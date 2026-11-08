# Recuperación de la interfaz

La versión actual detecta fallos de los procesos de WebView2 desde la parte nativa de Windows. Ante una caída del renderizador o del motor completo, reinicia la aplicación y activa renderizado por software para el siguiente arranque.

También comprueba cada cinco segundos que la interfaz haya enviado una señal de actividad. Si pasan más de treinta segundos sin señal, solicita la recuperación. No cuenta como bloqueo una ventana minimizada u oculta, una suspensión del equipo o una pausa del inspector en desarrollo.

La recuperación automática admite hasta tres intentos consecutivos. El contador se conserva entre reinicios para evitar un ciclo infinito y se restablece después de dos minutos de actividad saludable. El menú nativo Interfaz > Recuperar interfaz, con Ctrl+Shift+R, permite una recuperación manual aun cuando el contenido web esté en blanco.

El trabajo se guarda al editar (con una espera de 200 ms), al cambiar opciones y periódicamente. Se restauran entrada, salida, preset, densidad y opciones. Se restaura el último guardado completo: no se garantiza conservar una modificación todavía pendiente al instante de una caída. El límite del documento guardado es de 32 MB.

Los archivos propios de recuperación están en %LOCALAPPDATA%\com.apexshield.obfuscator:

- workspace.json: último trabajo guardado.
- recovery.json: contador de intentos y modo gráfico de compatibilidad.
- recovery.log: registro de arranques y fallos, sin el contenido del código fuente.

Se respetan las modificaciones del botón de GitHub en src/style.css.

## Verificación realizada

- Suite JavaScript completa aprobada, incluyendo 1.600 ejecuciones equivalentes del ofuscador.
- Prueba de captura y restauración de fuente, salida, preset, controles y Unicode.
- Prueba nativa de persistencia del límite de intentos y recuperación manual.
- En una copia del ejecutable release, se terminó exclusivamente su proceso renderizador: se registró ProcessFailed kind=1, la aplicación se reinició automáticamente y se verificó visualmente la restauración de fuente y salida.
- Se terminó exclusivamente el proceso principal de WebView2 de esa copia: se registró ProcessFailed kind=0, la aplicación se reinició nuevamente, conservó el trabajo y quedó una sola instancia.
- Se verificó el arranque con renderizado por software.
- Se cerró la copia de prueba y se retiraron su ejecutable y su documento de prueba.

## Alcance

La captura original no identifica por sí sola la causa de la pantalla en blanco. El control de actividad detecta bloqueos y arranques incompletos, y WebView2 notifica las caídas de sus procesos. Una corrupción puramente visual que siga enviando señales y no produzca un evento del motor no puede detectarse de manera fiable con esas señales; para ese caso se dispone del menú nativo y del modo gráfico de compatibilidad.

En este equipo se dejó activado el modo gráfico de compatibilidad y el contador de intentos en cero después de las pruebas.
