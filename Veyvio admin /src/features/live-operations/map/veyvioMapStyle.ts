import type { StyleSpecification } from 'maplibre-gl'

/**
 * Light operational basemap for Veyvio Command.
 *
 * CARTO light tiles stay neutral so operational markers remain the strongest
 * visual elements on the page.
 */
export const veyvioMapStyle: StyleSpecification = {
  version: 8,
  name: 'Veyvio Command Light',
  glyphs: 'https://fonts.openmaptiles.org/{fontstack}/{range}.pbf',
  sources: {
    cartoLight: {
      type: 'raster',
      tiles: [
        'https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png',
        'https://b.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png',
        'https://c.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png',
        'https://d.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png',
      ],
      tileSize: 512,
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
      maxzoom: 20,
    },
  },
  layers: [
    {
      id: 'veyvio-background',
      type: 'background',
      paint: {
        'background-color': '#F7FAFF',
      },
    },
    {
      id: 'veyvio-light-basemap',
      type: 'raster',
      source: 'cartoLight',
      paint: {
        'raster-opacity': 0.92,
        'raster-saturation': -0.15,
        'raster-contrast': -0.05,
        'raster-brightness-min': 0.16,
        'raster-brightness-max': 0.98,
      },
    },
  ],
}
