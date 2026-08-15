# Instalacion en Windows

## Situacion actual

El cliente final no debe instalar el codigo fuente ni ejecutar comandos de
`npm`. Debe recibir un instalador de Windows generado con Tauri.

El proyecto debe compilarse primero para Windows. Los binarios de macOS no son
compatibles con Windows.

La aplicacion compilada esta pensada para Windows de 64 bits con procesadores
Intel o AMD.

## 1. Generar el instalador

Este proceso lo realiza el desarrollador o encargado de la entrega en una
computadora Windows.

### Requisitos de la computadora de compilacion

- Windows 10 u 11 de 64 bits.
- Node.js LTS.
- Rust con el target MSVC.
- Visual Studio Build Tools con la carga "Desktop development with C++".
- Bun.
- WebView2.

### Estructura de carpetas

Los dos proyectos deben conservarse juntos:

```text
C:\distribuidora-stumpfs\
├── distribuidora-front\
└── distribuidora-backend\
```

### Comandos de compilacion

Abrir PowerShell y ejecutar:

```powershell
cd C:\distribuidora-stumpfs\distribuidora-backend
npm ci
npm run db:generate
npm run db:push

cd ..\distribuidora-front
npm ci
node scripts/setup-sidecar.js
npm run tauri:build
```

El instalador se genera normalmente dentro de:

```text
distribuidora-front\src-tauri\target\release\bundle\nsis\
```

El archivo recomendado para entregar al cliente es:

```text
Distribuidora_0.1.0_x64-setup.exe
```

Tambien se genera un instalador `.msi`, que puede utilizarse en instalaciones
corporativas.

Antes de cada entrega conviene actualizar la version en
`src-tauri/tauri.conf.json`.

## 2. Instalacion del cliente final

1. Entregar el archivo `Distribuidora_x64-setup.exe`.
2. Ejecutarlo como administrador.
3. Seguir el asistente de instalacion.
4. Abrir `Distribuidora` desde el menu Inicio o el acceso directo.
5. Ir a `Cargar Excel`.
6. Seleccionar el archivo de ventas.
7. Consultar el dashboard.

Para utilizar el dashboard, el cliente final no necesita instalar:

- Node.js.
- npm.
- Rust.
- Bun.
- SQLite.
- PostgreSQL.
- Un servidor backend.

El backend local y SQLite estan incluidos dentro de la aplicacion Tauri.

## 3. Ubicacion de los datos

La base de datos activa se guarda en:

```text
%APPDATA%\com.distribuidora.app\distribuidora.db
```

Los backups semanales se guardan en:

```text
%APPDATA%\com.distribuidora.app\backups\
```

No se debe borrar esta carpeta al actualizar la aplicacion. La base incluida
en el instalador es solamente una semilla vacia; los datos importados se
guardan en el directorio de datos del usuario.

Para realizar un backup externo, cerrar la aplicacion y copiar la carpeta
`backups` a otra ubicacion segura.

## 4. Chat de ventas

El dashboard funciona sin dependencias externas. Sin embargo, el chat de
ventas requiere actualmente Codex CLI instalado en la computadora del cliente.

En PowerShell:

```powershell
npm install -g @openai/codex
codex login
codex login status
```

Este paso requiere Node.js e internet. `codex login` abre el navegador para
iniciar sesion con la cuenta de ChatGPT.

Si el cliente no utilizara el chat, no es necesario instalar Codex CLI ni
Node.js.

## 5. Pruebas antes de entregar

En una computadora limpia se debe verificar:

- Que el instalador complete la instalacion correctamente.
- Que la aplicacion abra sin Node.js instalado.
- Que se pueda cargar un archivo Excel.
- Que los datos permanezcan despues de cerrar y volver a abrir la aplicacion.
- Que una actualizacion no elimine la base de datos.
- Que el chat funcione, si forma parte de la entrega.

## Recomendaciones de entrega

- Entregar el instalador Windows, no el repositorio completo.
- Firmar digitalmente el instalador para reducir advertencias de Windows
  Defender SmartScreen.
- Verificar que WebView2 este instalado o que el instalador pueda descargarlo.
- Definir previamente si el cliente recibira una base vacia o datos historicos.
- Conservar una copia externa de los backups y de los archivos Excel originales.
