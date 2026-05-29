import React from 'react';
import { createRoot } from 'react-dom/client';
import WaterHeroComponent from './WaterHero';

const container = document.getElementById('hero-canvas');
if (container) {
    const root = createRoot(container);
    root.render(<WaterHeroComponent />);
}
