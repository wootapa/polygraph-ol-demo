import { AfterViewInit, Component, ElementRef, Input, ViewChild } from '@angular/core';
import { Collection, Feature } from 'ol';
import ScaleLine from 'ol/control/ScaleLine';
import { getSize, getTopRight } from 'ol/extent';
import LineString from 'ol/geom/LineString';
import Point from 'ol/geom/Point';
import Polygon, { circular as circularPolygon } from 'ol/geom/Polygon';
import { defaults, DoubleClickZoom, Draw, Translate } from 'ol/interaction';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import Map from 'ol/Map';
import { toLonLat } from 'ol/proj';
import { OSM } from 'ol/source';
import VectorSource from 'ol/source/Vector';
import { Circle as CircleStyle, Fill, Stroke, Style, Text } from 'ol/style';
import { Subject } from 'rxjs';
import { MapService } from '../../providers/map.service';

@Component({
    selector: 'app-map',
    templateUrl: './map.component.html',
    styleUrls: ['./map.component.scss']
})
export class MapComponent implements AfterViewInit {
    @Input() type: any = 'WMS';
    @ViewChild('title') titleEl: ElementRef;
    map: Map;

    constructor(
        private elRef: ElementRef,
        private mapService: MapService
    ) { }

    ngAfterViewInit(): void {
        // Fire everything up when service is ready
        this.mapService.$onReady.subscribe(() => {
            this.createMap();
            this.titleEl.nativeElement.innerText = this.type;

            if (this.type == 'WFS') {
                this.mapService.$doDraw.subscribe(request => {
                    const source = new VectorSource();
                    const layer = new VectorLayer({
                        source: source,
                        style: this.getDrawStyle()
                    });

                    const draw = new Draw({
                        source: source,
                        type: request.type
                    });

                    draw.on("drawend", e => {
                        this.map.removeInteraction(draw);

                        if (request.onDone) {
                            request.onDone({
                                feature: e.feature,
                                remove: () => this.map.removeLayer(layer)
                            });
                        }
                    });

                    const translate = new Translate({
                        layers: [layer]
                    });

                    translate.on("translateend", (e) => this.mapService.$onTranslate.next({
                        feature: e.features[0],
                        isEnd: true
                    }));
                    translate.on("translating", (e) => this.mapService.$onTranslate.next({
                        feature: e.features[0],
                        isEnd: false
                    }));

                    this.map.addInteraction(draw);
                    this.map.addInteraction(translate);
                    this.map.addLayer(layer);
                });
            }
        });
    }

    createMap() {
        this.map = new Map({
            target: this.elRef.nativeElement,
            layers: [
                new TileLayer({
                    source: new OSM()
                }),
                this.type === 'WMS'
                    ? this.mapService.wmsLayer.olLayer
                    : this.mapService.wfsLayer.olLayer,
            ],
            controls: [new ScaleLine()],
            interactions: defaults().getArray().filter(ia => !(ia instanceof DoubleClickZoom)),
            view: this.mapService.view
        });
    }

    getDrawStyle() {
        const blue = [0, 153, 255, 1];
        const white = [255, 255, 255, 1];
        const whiteTrans = [255, 255, 255, .3];
        const fill = new Fill({ color: whiteTrans });
        const strokeBorder = new Stroke({ color: white, width: 8 });
        const stroke = new Stroke({ color: blue, width: 6 });
        const distanceBorder = new Stroke({ color: white, width: 3, lineCap: "butt" });
        const distanceStroke = new Stroke({ color: blue, width: 1 });
        const distanceText = new Text({
            font: 'light 7px Arial', placement: 'point',
            fill: new Fill({ color: blue }),
            stroke: new Stroke({ color: white, width: 3 })
        });

        const pointStyle = [
            new Style({
                image: new CircleStyle({
                    radius: 10,
                    stroke: new Stroke({ color: white, width: 9 })
                })
            }),
            new Style({
                image: new CircleStyle({
                    radius: 10,
                    stroke: stroke
                }),
                text: new Text({
                    text: '+',
                    font: 'light 7px Arial'
                })
            })
        ];

        const pointDistanceStyle = [
            ...pointStyle,

            new Style({
                stroke: distanceBorder,
                fill: fill,
                geometry: (feature: Feature) => {
                    // Make circle
                    const geom = feature.getGeometry() as Point;
                    const distance = feature.get('distance');
                    const lonlat = toLonLat(geom.getCoordinates(), this.mapService.view.getProjection());
                    const circle4326 = circularPolygon([lonlat[0], lonlat[1]], distance, 64);
                    const circle = circle4326.transform('EPSG:4326', this.mapService.view.getProjection()) as Polygon;
                    feature.set('circle-geom', circle);

                    // Make radiusline
                    const [extentWidth, extentHeight] = getSize(circle.getExtent());
                    const right = getTopRight(circle.getExtent());
                    right[1] -= extentHeight / 2;
                    const line = new LineString([geom.getFirstCoordinate(), right]);
                    feature.set('radius-geom', line);

                    return circle;
                }
            }),
            new Style({
                stroke: distanceStroke,
                fill: fill,
                geometry: (feature: Feature) => {
                    return feature.get('circle-geom');
                }
            }),
            new Style({
                stroke: distanceBorder,
                fill: fill,
                geometry: (feature: Feature) => {
                    return feature.get('radius-geom');
                }
            }),
            new Style({
                stroke: distanceStroke,
                fill: fill,
                geometry: (feature: Feature) => {
                    return feature.get('radius-geom');
                }
            }),
            new Style({
                text: distanceText,

                geometry: (feature: Feature) => {
                    distanceText.setText(this.mapService.view.getResolution() < 8000 ? `${feature.get('distance')}m` : '...');
                    return new Point((feature.get('radius-geom') as LineString).getFlatMidpoint());
                }
            }),
        ];

        const defaultStyle = [
            new Style({
                stroke: strokeBorder,
                fill: fill
            }),
            new Style({
                stroke: stroke
            }),
        ];

        return (feature: Feature) => {
            if (feature.getGeometry() instanceof Point) {
                if (feature.get('distance')) {
                    return pointDistanceStyle;
                }
                return pointStyle;
            }
            return defaultStyle;
        };
    };
}

