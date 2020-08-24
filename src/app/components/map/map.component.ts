import { AfterViewInit, Component, ElementRef, Input, ViewChild } from '@angular/core';
import { Collection, Feature } from 'ol';
import ScaleLine from 'ol/control/ScaleLine';
import Point from 'ol/geom/Point';
import { circular as circularPolygon } from 'ol/geom/Polygon';
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

                    this.map.addInteraction(draw);
                    this.map.addLayer(layer);
                });

                this.mapService.$doTranslate.subscribe(request => {
                    const translate = new Translate({
                        features: new Collection([request.feature])
                    });

                    if (request.onDone) {
                        const result = {
                            start: () => {
                                if (!this.map.getInteractions().getArray().includes(translate)) {
                                    this.map.addInteraction(translate);
                                }
                            },
                            stop: () => {
                                if (this.map.getInteractions().getArray().includes(translate)) {
                                    this.map.removeInteraction(translate);
                                }
                            },
                            $onTranslateEnd: new Subject<Feature>(),
                            $onTranslating: new Subject<Feature>()
                        };
                        request.onDone(result);
                        translate.on("translateend", () => result.$onTranslateEnd.next(request.feature));
                        translate.on("translating", () => result.$onTranslating.next(request.feature));
                    }

                    this.map.addInteraction(translate);
                })
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
        const strokeBorder = new Stroke({ color: white, width: 7 });
        const strokeDash = new Stroke({ color: blue, width: 1, lineDash: [3, 3] });
        const stroke = new Stroke({ color: blue, width: 5 });

        const pointStyle = [
            new Style({
                stroke: strokeDash,
                fill: fill,
                geometry: (feature: Feature) => {
                    const geom = feature.getGeometry();
                    const distance = feature.get('distance');

                    if (distance && geom instanceof Point) {
                        const lonlat = toLonLat(geom.getCoordinates(), this.mapService.view.getProjection());
                        const circle4326 = circularPolygon([lonlat[0], lonlat[1]], distance, 64);
                        return circle4326.transform('EPSG:4326', this.mapService.view.getProjection());
                    }
                    return geom;
                }
            }),
            new Style({
                image: new CircleStyle({
                    radius: 10,
                    stroke: strokeBorder
                })
            }),
            new Style({
                image: new CircleStyle({
                    radius: 9,
                    stroke: stroke
                }),
                text: new Text({
                    text: '+',
                    font: '9pt Monospace'
                })
            })
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
                return pointStyle;
            }
            return defaultStyle;
        };
    };
}

