# Frame Asset Sources

Bundled device frame PNGs in this directory.

## desktop.png

Generated programmatically by `scripts/generate-frames.mjs`. SVG rasterized via Sharp. Canvas 1480x1040 with screen rect at (40, 40) sized 1400x800. Original 84EM work, MIT-licensed alongside the rest of the project.

## tablet.png

iPad Pro 11" portrait, silver. Canvas 2068x2788 with screen rect at (200, 200) sized 1668x2388.

Source: https://github.com/jonnyjackson26/device-frames-media (`device-frames-output/Apple iPad/iPad Pro 11 A12X to M2/Portrait - Silver/frame.png`)

## mobile.png

iPhone 16 Pro, black titanium. Canvas 1406x2822 with screen rect at (102, 100) sized 1206x2622.

Source: https://github.com/jonnyjackson26/device-frames-media (`device-frames-output/Apple iPhone/16 Pro/Black Titanium/frame.png`)

## Replacing assets

To swap in different frames, drop the new PNG over the existing file and update the corresponding entry in `frames.json` with the new `canvas` and `screen` rectangle. No code change needed.

The `jonnyjackson26/device-frames-media` index at https://raw.githubusercontent.com/jonnyjackson26/device-frames-media/main/device-frames-output/index.json has `frame`, `frameSize`, and `screen` for every device, suitable for direct paste into `frames.json`.
