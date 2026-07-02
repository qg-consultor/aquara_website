import React from 'react';
import { createRoot } from 'react-dom/client';
import WaterHeroComponent, { WaterBackgroundComponent } from './WaterHero';

const bgContainer = document.getElementById('bg-canvas');
if (bgContainer) {
    const bgRoot = createRoot(bgContainer);
    bgRoot.render(<WaterBackgroundComponent />);
}

const container = document.getElementById('hero-canvas');
if (container) {
    const root = createRoot(container);
    root.render(<WaterHeroComponent />);
}
