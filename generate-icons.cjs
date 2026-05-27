const sharp = require('sharp');
const fs = require('fs');

async function processImages() {
    console.log('Generating padded icons for Capacitor...');

    const logoPath = 'src/assets/logo.png';
    const iconPath = 'assets/icon.png';
    const splashPath = 'assets/splash.png';

    // Create an icon that fits well in a circle or square
    await sharp(logoPath)
        .resize({
            width: 800,
            height: 800,
            fit: 'contain',
            background: { r: 255, g: 255, b: 255, alpha: 1 } // White background for the icon
        })
        .toFile(iconPath);

    // Create a splash image
    // The splash image usually needs logo in center
    await sharp(logoPath)
        .resize({
            width: 600,
            height: 600,
            fit: 'contain',
            background: { r: 255, g: 255, b: 255, alpha: 1 } // Or use transparent and let capacitor style it
        })
        .extend({
            top: 600,
            bottom: 600,
            left: 600,
            right: 600,
            background: { r: 255, g: 255, b: 255, alpha: 1 }
        })
        .resize(2732, 2732)
        .toFile(splashPath);

    console.log('Done.');
}

processImages().catch(console.error);
