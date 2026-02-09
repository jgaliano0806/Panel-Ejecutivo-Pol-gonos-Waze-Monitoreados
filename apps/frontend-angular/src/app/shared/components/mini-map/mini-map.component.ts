import { Component, Input, OnInit, OnChanges, SimpleChanges, ElementRef, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import maplibregl, { Map, Marker, NavigationControl } from 'maplibre-gl';

export interface MiniMapMarker {
  lat: number;
  lng: number;
  id: string;
  type?: string;
  subtype?: string;
  color?: string;
  label?: string;
}

@Component({
  selector: 'app-mini-map',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div #mapContainer class="w-full h-full rounded-xl overflow-hidden"></div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
      height: 100%;
    }
  `]
})
export class MiniMapComponent implements OnInit, AfterViewInit, OnChanges, OnDestroy {
  @ViewChild('mapContainer') mapContainer!: ElementRef<HTMLDivElement>;

  @Input() center: [number, number] = [-31.4201, -64.1888]; // [lat, lng] - Córdoba default
  @Input() zoom = 15;
  @Input() markers: MiniMapMarker[] = [];
  @Input() isDark = true;

  private map: Map | null = null;
  private mapMarkers: Marker[] = [];

  ngOnInit(): void {}

  ngAfterViewInit(): void {
    this.initMap();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (this.map) {
      if (changes['center'] && !changes['center'].firstChange) {
        this.map.flyTo({
          center: [this.center[1], this.center[0]], // MapLibre uses [lng, lat]
          zoom: this.zoom,
          duration: 1000
        });
      }
      if (changes['markers'] && !changes['markers'].firstChange) {
        this.updateMarkers();
      }
      if (changes['isDark'] && !changes['isDark'].firstChange) {
        this.updateMapStyle();
      }
    }
  }

  ngOnDestroy(): void {
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
  }

  private initMap(): void {
    if (!this.mapContainer?.nativeElement) return;

    const style = this.isDark
      ? 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json'
      : 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';

    this.map = new Map({
      container: this.mapContainer.nativeElement,
      style,
      center: [this.center[1], this.center[0]], // MapLibre uses [lng, lat]
      zoom: this.zoom,
      attributionControl: false,
    });

    // Add navigation controls
    this.map.addControl(new NavigationControl({ showCompass: false }), 'top-right');

    this.map.on('load', () => {
      this.updateMarkers();
    });
  }

  private updateMapStyle(): void {
    if (!this.map) return;

    const style = this.isDark
      ? 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json'
      : 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';

    this.map.setStyle(style);
  }

  private updateMarkers(): void {
    if (!this.map) return;

    // Remove existing markers
    this.mapMarkers.forEach(marker => marker.remove());
    this.mapMarkers = [];

    // Add new markers
    this.markers.forEach(markerData => {
      const el = document.createElement('div');
      el.className = 'mini-map-marker';
      el.style.cssText = `
        width: 24px;
        height: 24px;
        border-radius: 50%;
        background-color: ${markerData.color || '#ef4444'};
        border: 3px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        cursor: pointer;
      `;

      const marker = new Marker({ element: el })
        .setLngLat([markerData.lng, markerData.lat])
        .addTo(this.map!);

      this.mapMarkers.push(marker);
    });
  }
}
