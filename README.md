<div align="center">
  <img src="src-tauri/icons/icon.png" width="150" alt="ApexShield" />
  <h1>ApexShield</h1>
  <p><strong>Ofuscación de JavaScript con una interfaz táctica para Windows.</strong></p>
  <p>Análisis AST · Cifrado de cadenas · Presets configurables · Recuperación automática</p>
  <p><a href="../../releases/latest">Descargar la última versión</a> · <a href="#desarrollo">Compilar desde el código fuente</a></p>
</div>

---

ApexShield transforma código JavaScript mediante análisis de su árbol de sintaxis abstracta (AST). Permite combinar renombrado de identificadores, ocultación de cadenas, transformaciones de literales, propiedades calculadas y aplanamiento del flujo de control desde una aplicación de escritorio.

Desarrollado por **[ZeroCool22](https://github.com/ZeroCool22)** con **Tauri, Rust, JavaScript, Babel y Vite**.

## Descarga e instalación

Entrá a **[Releases](../../releases/latest)** y elegí una descarga:

| Archivo | Uso |
| --- | --- |
| `ApexShield_1.0.0_x64-setup.exe` | Instalador recomendado para Windows x64. |
| `ApexShield_1.0.0_windows-x64_portable.zip` | Extraer y ejecutar `ApexShield.exe` sin instalar la aplicación. |
| `ApexShield_1.0.0_x64_en-US.msi` | Instalador alternativo en formato MSI. |
| `SHA256SUMS.txt` | Sumas SHA-256 de los archivos publicados. |

La aplicación utiliza **Microsoft Edge WebView2 Runtime**. El instalador está configurado para descargarlo si falta; la ejecución sin instalación requiere que ya esté disponible en el equipo. No necesitás Node.js ni Rust para usar los ejecutables. [Información de Tauri sobre WebView2](https://v2.tauri.app/distribute/windows-installer/#webview2-installation-options).

## Funciones

- **Cuatro presets:** Táctico, Blindado, Militar y Chernobyl.
- **Renombrado de identificadores** con análisis de alcance y dos estilos de nombres.
- **Ocultación de cadenas con RC4**, tabla rotada y caché de descifrado.
- **Control Flow Flattening** con densidad configurable y omisión de bloques incompatibles.
- **Propiedades calculadas**, transformaciones de números y booleanos, código muerto y predicados opacos.
- **Opciones de anti-formateo, anti-debugging y silenciamiento de consola.**
- **Editor de entrada y salida**, carga de archivos, copiado, descarga y ajuste de línea.
- **Prueba rápida de JavaScript** en un Web Worker separado, con límite de cinco segundos.
- **Estadísticas** de tiempo, tamaño, expansión y entropía.
- **Autoguardado y restauración** de entrada, salida y opciones.
- **Recuperación nativa** ante fallos detectados del motor web, con límite de reintentos y modo gráfico de compatibilidad.
- **CLI** para ofuscar archivos desde la terminal.

## Presets

| Preset | Enfoque |
| --- | --- |
| Táctico (`tactical`) | Transformaciones ligeras y renombrado de identificadores. |
| Blindado (`armored`) | Cadenas ocultas, propiedades calculadas y opciones adicionales de ofuscación. |
| Militar (`military`) | Combina cadenas, renombrado, código muerto y aplanamiento de flujo. |
| Chernobyl (`paranoid`) | Mayor densidad de transformaciones, nombres confusos y consola silenciada. |

Los controles de la interfaz permiten personalizar las opciones del preset seleccionado.

## Uso

1. Pegá tu JavaScript o cargá un archivo.
2. Elegí un preset y ajustá sus opciones.
3. Presioná **OFUSCAR CÓDIGO**.
4. Copiá o descargá el resultado.

ApexShield recibe **JavaScript**. Transpilá TypeScript o JSX antes de ofuscarlo. La prueba rápida sirve para lógica JavaScript sin DOM: no incluye `window` ni `document` y no ejecuta importaciones estáticas de módulos.

Si la ventana deja de dibujarse correctamente, usá **Interfaz → Recuperar interfaz** o **Ctrl+Shift+R**. La aplicación restaura el último autoguardado completo. Más detalles en [RECUPERACION.md](RECUPERACION.md).

## Desarrollo

Requisitos para compilar en Windows:

- Node.js 24 y PNPM.
- Rust 1.90 o superior y Cargo.
- Microsoft C++ Build Tools y WebView2, según los [requisitos de Tauri para Windows](https://v2.tauri.app/start/prerequisites/#windows).

Desde la carpeta del proyecto:

```powershell
pnpm install --frozen-lockfile
pnpm tauri:dev
```

La aplicación de desarrollo se abre automáticamente. Guardá los cambios de estilo en `src/style.css` para verlos durante el desarrollo.

### Ejecutable release sin instaladores

```powershell
pnpm tauri:build --no-bundle
```

Resultado: `src-tauri/target/release/ApexShield.exe`.

### Ejecutable e instaladores

```powershell
pnpm tauri:build
```

Los instaladores quedan en `src-tauri/target/release/bundle/nsis/` y `src-tauri/target/release/bundle/msi/`.

### Pruebas

```powershell
pnpm test
cargo test --manifest-path src-tauri/Cargo.toml --lib
```

La suite incluye 1.600 ejecuciones comparativas del ofuscador, más pruebas de módulos, Unicode, CLI y restauración de la sesión.

### CLI

```powershell
pnpm cli -i entrada.js -o salida.obf.js -p armored
pnpm cli -i entrada.js --seed 42 --no-antitamper
pnpm cli --help
```

## Estructura

- `src/`: interfaz, recuperación de sesión y motor de ofuscación.
- `src/obfuscator/transforms/`: transformaciones del AST.
- `src-tauri/`: aplicación nativa, recuperación del motor web e instaladores.
- `bin/`: interfaz de línea de comandos.
- `test/`: pruebas automatizadas.

## Autor

**ZeroCool22** · [GitHub](https://github.com/ZeroCool22)
