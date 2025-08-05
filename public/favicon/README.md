# RunJS Favicon System

This directory contains the favicon assets for the RunJS application.

## Design Concept

The RunJS favicon combines Node.js and JavaScript visual branding:
- **Node.js Hexagon**: Green hexagon background (#68a063) filling the entire favicon space
- **JavaScript Play Button**: Yellow play triangle (#f7df1e) inside for code execution
- **Full Coverage**: Hexagon extends to the edges for maximum visual impact
- **Dual Branding**: Combines both Node.js and JavaScript official colors
- **Bold Design**: Strong, recognizable icon that stands out in browser tabs

## Files

### SVG Icons (Scalable)
- `favicon.svg` - High-quality version for modern browsers (48x48 optimized)
- `icon.svg` - Simplified version for small sizes (16x16 optimized)
- `/favicon.svg` - Root favicon for fallback

### PNG Icons (Legacy Support)
- `favicon-16x16.png` - 16×16 pixels
- `favicon-32x32.png` - 32×32 pixels
- `android-chrome-192x192.png` - 192×192 pixels (Android)
- `android-chrome-512x512.png` - 512×512 pixels (Android)
- `apple-touch-icon.png` - 180×180 pixels (iOS)
- `mstile-150x150.png` - 150×150 pixels (Windows tiles)

### Configuration Files
- `site.webmanifest` - Web app manifest with theme colors and metadata
- `browserconfig.xml` - Internet Explorer/Edge tile configuration
- `favicon.ico` - Legacy favicon for older browsers

## Color Palette

- **Hexagon Background**: #68a063 (Node.js official green)
- **Play Button**: #f7df1e (JavaScript official yellow)

The dual-color design ensures:
- High contrast between green hexagon and yellow play button
- Professional appearance combining both technology brands
- Instantly recognizable as a Node.js/JavaScript execution environment
- Clear visual hierarchy with the play button prominently displayed

## Browser Support

The favicon system supports:
- Modern browsers (Chrome, Firefox, Safari, Edge) - SVG icons
- iOS Safari - Apple touch icon
- Android Chrome - High-res PNG icons
- Windows tiles - Custom tile colors and images
- Legacy browsers - Fallback to ICO format

## Theme Integration

The favicon combines two universally recognizable symbols from the JavaScript ecosystem: the Node.js hexagon and the execution/play concept. The Node.js green hexagon immediately identifies the runtime environment, while the JavaScript yellow play button clearly communicates the core functionality of running code. This dual-branding approach creates a favicon that's instantly recognizable to developers familiar with both technologies.