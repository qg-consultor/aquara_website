# Aquara Water Systems - Website Source Code

Sitio web oficial de Aquara Water Systems (https://aquaraws.com), desarrollado con HTML, Vanilla CSS, JavaScript (ESModules) y React con Three.js / React Three Fiber para los efectos 3D interactivos de agua.

## Requisitos de Entorno

- **Node.js**: `v18.x` o superior (Recomendado Node.js `v20 LTS`)
- **npm**: `v9.x` o superior

## Instrucciones de Instalación y Desarrollo

1. Clonar o extraer el proyecto en tu máquina local.
2. Abrir una terminal en el directorio raíz del proyecto.
3. Instalar las dependencias:

```bash
npm install
```

4. Iniciar el servidor de desarrollo local:

```bash
npm run dev
```

El sitio estará disponible en `http://localhost:5173`.

## Instrucciones de Compilación para Producción (Build)

Para generar los archivos estáticos de producción:

```bash
npm run build
```

Este comando compilará y minificará el sitio en el directorio `dist/`.

## Estructura del Proyecto

- `index.html`: Estructura principal HTML5 del sitio y secciones.
- `index.css`: Sistema de diseño, tokens de color, glassmorphism y estilos responsivos.
- `index.js`: Interacciones DOM, lógica de navegación, sliders y modal de contacto.
- `src/`: Componentes React (`WaterHero.jsx`) para renderizado WebGL 3D.
- `public/`: Recursos estáticos públicos (`robots.txt`, `sitemap.xml`, `.htaccess`, modelos 3D `.glb`).
- `vite.config.js`: Configuración del empaquetador Vite (`base: '/'`).
