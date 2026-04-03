import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, from, of, throwError } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import * as L from 'leaflet';
import { environment } from 'src/environments/environment';

export interface WmsLayerInfo {
  name: string;
  title: string;
  abstract?: string;
  boundingBox?: {
    minx: number;
    miny: number;
    maxx: number;
    maxy: number;
    crs: string;
  };
}

export interface GeoserverCapabilities {
  layers: WmsLayerInfo[];
  version: string;
}

@Injectable({
  providedIn: 'root'
})
export class WmsLayerService {
  private geoserverUrl: string = environment.geoServerUrl;

  private knownLayerBounds: { [layerName: string]: L.LatLngBoundsExpression } = {
    'sinfondoverde': [[-32.84, -68.61], [-32.83, -68.59]],
    'geonode:sinfondoverde': [[-32.84, -68.61], [-32.83, -68.59]],
  };
  private capabilitiesCache: GeoserverCapabilities | null = null;

  constructor(private http: HttpClient) {}

  /**
   * Get all layers from Geoserver capabilities
   */
  getCapabilities(geoserverUrl?: string): Observable<GeoserverCapabilities> {
    const url = geoserverUrl || this.geoserverUrl;
    const capabilitiesUrl = url.replace('/wms', '') + '/wms?SERVICE=WMS&REQUEST=GetCapabilities';

    return this.http.get(capabilitiesUrl, { responseType: 'text' }).pipe(
      map(xml => this.parseCapabilities(xml)),
      catchError(error => {
        console.error('[WmsLayerService] Error fetching capabilities:', error);
        return of({ layers: [], version: '' });
      })
    );
  }

  /**
   * Parse GetCapabilities XML response
   */
  private parseCapabilities(xml: string): GeoserverCapabilities {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, 'text/xml');
    const layers: WmsLayerInfo[] = [];

    const layerElements = doc.querySelectorAll('Layer[queryable="1"], Layer');
    layerElements.forEach((layerEl) => {
      const name = layerEl.querySelector('Name')?.textContent;
      const title = layerEl.querySelector('Title')?.textContent;
      const abstract = layerEl.querySelector('Abstract')?.textContent;

      if (name && !name.includes('__')) { // Skip internal layers
        const bbox = layerEl.querySelector('BoundingBox');
        const layer: WmsLayerInfo = {
          name: name,
          title: title || name,
          abstract: abstract || ''
        };

        if (bbox) {
          layer.boundingBox = {
            minx: parseFloat(bbox.getAttribute('minx') || '0'),
            miny: parseFloat(bbox.getAttribute('miny') || '0'),
            maxx: parseFloat(bbox.getAttribute('maxx') || '0'),
            maxy: parseFloat(bbox.getAttribute('maxy') || '0'),
            crs: bbox.getAttribute('SRS') || bbox.getAttribute('crs') || 'EPSG:4326'
          };
        }

        layers.push(layer);
      }
    });

    return {
      layers,
      version: doc.querySelector('WMS_Capabilities')?.getAttribute('version') || ''
    };
  }

  /**
   * Get bounding box for a specific layer
   */
  getLayerBounds(layerName: string, geoserverUrl?: string): Observable<L.LatLngBoundsExpression | null> {
    // First check known bounds
    const knownBounds = this.knownLayerBounds[layerName];
    if (knownBounds) {
      return of(knownBounds);
    }

    const url = geoserverUrl || this.geoserverUrl;
    const capabilitiesUrl = url.replace('/wms', '') + '/wms?SERVICE=WMS&REQUEST=GetCapabilities';

    return this.http.get(capabilitiesUrl, { responseType: 'text' }).pipe(
      map(xml => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(xml, 'text/xml');
        
        const layerEls = Array.from(doc.querySelectorAll('Layer'));
        for (const layerEl of layerEls) {
          const name = layerEl.querySelector('Name')?.textContent;
          if (name === layerName) {
            const bbox = layerEl.querySelector('BoundingBox');
            if (bbox) {
              const minx = parseFloat(bbox.getAttribute('minx') || '0');
              const miny = parseFloat(bbox.getAttribute('miny') || '0');
              const maxx = parseFloat(bbox.getAttribute('maxx') || '0');
              const maxy = parseFloat(bbox.getAttribute('maxy') || '0');
              
              return [[miny, minx], [maxy, maxx]] as L.LatLngBoundsExpression;
            }
          }
        }
        return null;
      }),
      catchError(error => {
        console.error('[WmsLayerService] Error getting layer bounds:', error);
        return of(null);
      })
    );
  }

  /**
   * Create a WMS layer with error handling
   * Uses L.Geoserver.wms from leaflet-geoserver-request package
   */
  createWmsLayer(layerName: string, options?: {
    geoserverUrl?: string;
    opacity?: number;
    styles?: string;
    format?: string;
  }): L.Layer {
    const url = options?.geoserverUrl || this.geoserverUrl;
    
    console.log(`[WmsLayerService] Creating WMS layer: ${layerName}`);
    console.log(`[WmsLayerService] Using URL: ${url}`);

    // Use standard Leaflet WMS tile layer
    const wmsLayer = L.tileLayer.wms(url, {
      layers: layerName,
      transparent: true,
      format: options?.format || 'image/png',
      opacity: options?.opacity ?? 1.0,
      crs: L.CRS.EPSG4326,
    });

    wmsLayer.on('loading', () => {
      console.log(`[WmsLayerService] Loading WMS layer: ${layerName}`);
    });

    wmsLayer.on('load', () => {
      console.log(`[WmsLayerService] WMS layer loaded successfully: ${layerName}`);
    });

    wmsLayer.on('tileerror', (error: any) => {
      console.warn(`[WmsLayerService] Tile error:`, error);
    });

    wmsLayer.on('tileload', (event: any) => {
      console.log(`[WmsLayerService] Tile loaded:`, event.tile?.src?.substring(0, 100));
    });

    return wmsLayer;
  }

  /**
   * Add WMS layer to map with optional zoom to bounds
   * Uses known bounds first, then tries GetCapabilities, then falls back to Mendoza region
   */
  addWmsLayerToMap(map: L.Map, layerName: string, options?: {
    geoserverUrl?: string;
    opacity?: number;
    zoomToBounds?: boolean;
    flyTo?: boolean;
  }): Observable<L.Layer> {
    return new Observable(observer => {
      const wmsLayer = this.createWmsLayer(layerName, {
        geoserverUrl: options?.geoserverUrl,
        opacity: options?.opacity
      });

      // Add to map
      wmsLayer.addTo(map);

      // Set z-index if supported
      if ((wmsLayer as any).setZIndex) {
        (wmsLayer as any).setZIndex(1000);
      }

      console.log(`[WmsLayerService] Layer added to map`);

      if (options?.zoomToBounds) {
        // First check known bounds
        const knownBounds = this.knownLayerBounds[layerName];
        if (knownBounds) {
          console.log(`[WmsLayerService] Using known bounds for ${layerName}`);
          if (options?.flyTo) {
            map.flyToBounds(knownBounds, { duration: 1, padding: [50, 50] });
          } else {
            map.fitBounds(knownBounds, { padding: [50, 50] });
          }
        } else {
          // Try to get bounds from GetCapabilities (may fail due to CORS)
          this.getLayerBounds(layerName, options?.geoserverUrl).subscribe({
            next: (bounds) => {
              if (bounds) {
                if (options?.flyTo) {
                  map.flyToBounds(bounds, { duration: 1 });
                } else {
                  map.fitBounds(bounds);
                }
                console.log(`[WmsLayerService] Zoomed to bounds for ${layerName}`);
              } else {
                console.warn(`[WmsLayerService] No bounds found for layer: ${layerName}`);
              }
            },
            error: (err) => {
              console.warn(`[WmsLayerService] GetCapabilities failed (CORS), using Mendoza bounds`);
              // Fallback to Mendoza region (where most layers are)
              const mendozaBounds: L.LatLngBoundsExpression = [[-33, -69], [-32.5, -68]];
              if (options?.flyTo) {
                map.flyToBounds(mendozaBounds, { duration: 1, padding: [50, 50] });
              } else {
                map.fitBounds(mendozaBounds, { padding: [50, 50] });
              }
            }
          });
        }
      }

      observer.next(wmsLayer);
      observer.complete();
    });
  }

  /**
   * Get known bounds for a layer
   */
  getKnownBounds(layerName: string): L.LatLngBoundsExpression | null {
    return this.knownLayerBounds[layerName] || null;
  }

  /**
   * Add known bounds for a layer (can be used to register bounds dynamically)
   */
  addKnownBounds(layerName: string, bounds: L.LatLngBoundsExpression): void {
    this.knownLayerBounds[layerName] = bounds;
    console.log(`[WmsLayerService] Registered bounds for ${layerName}`);
  }

  /**
   * Search layers by name or title
   */
  searchLayers(query: string, geoserverUrl?: string): Observable<WmsLayerInfo[]> {
    return this.getCapabilities(geoserverUrl).pipe(
      map(capabilities => {
        const lowerQuery = query.toLowerCase();
        return capabilities.layers.filter(layer => 
          layer.name.toLowerCase().includes(lowerQuery) ||
          layer.title.toLowerCase().includes(lowerQuery)
        );
      })
    );
  }

  /**
   * Get layer info by name
   */
  getLayerInfo(layerName: string, geoserverUrl?: string): Observable<WmsLayerInfo | null> {
    return this.getCapabilities(geoserverUrl).pipe(
      map(capabilities => {
        return capabilities.layers.find(l => l.name === layerName) || null;
      })
    );
  }
}
