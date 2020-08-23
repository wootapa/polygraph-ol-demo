import { Injectable } from '@angular/core';
import { ReplaySubject, Subject } from 'rxjs';
import { WLayerWMS } from '../models/layer.wms';
import { WLayerWFS } from '../models/layer.wfs';
import View from 'ol/View';
import { getCenter, Extent } from 'ol/extent';
import GeometryType from 'ol/geom/GeometryType';
import { Evaluator, defaultProjection, and } from '@wootapa/object-evaluator-ol';
import { Feature } from 'ol';
import { register } from 'ol/proj/proj4';
import proj4 from 'proj4';
import { get, transformExtent } from 'ol/proj';
import { ILayerDef } from '../models/layer';


export interface IDoDrawResult {
    feature: Feature,
    remove(): void
}

export interface IDoDraw {
    type: GeometryType,
    onDone?(result: IDoDrawResult): void;
}

export interface IDoTranslateResult {
    start(): void,
    stop(): void,
    $onTranslateEnd: Subject<Feature>
    $onTranslating: Subject<Feature>
}

export interface IDoTranslate {
    feature: Feature,
    onDone?(result: IDoTranslateResult): void;
}

@Injectable()
export class MapService {
    public wmsLayer: WLayerWMS;
    public wfsLayer: WLayerWFS;
    public view: View;

    public $onReady = new ReplaySubject<void>(1);
    public $doDraw = new Subject<IDoDraw>();
    public $doTranslate = new Subject<IDoTranslate>();

    constructor() {
        // Setup projections
        proj4.defs("EPSG:3857", "+proj=merc +a=6378137 +b=6378137 +lat_ts=0.0 +lon_0=0.0 +x_0=0.0 +y_0=0 +k=1.0 +units=m +nadgrids=@null +wktext  +no_defs");
        proj4.defs("EPSG:4326", "+proj=longlat +datum=WGS84 +no_defs");
        proj4.defs("EPSG:2285","+proj=lcc +lat_1=48.73333333333333 +lat_2=47.5 +lat_0=47 +lon_0=-120.8333333333333 +x_0=500000.0001016001 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=us-ft +no_defs");
        register(proj4);

        // Define context for the layer we'll use
        const context: ILayerDef = {
            geomField: 'the_geom',
            url: 'https://demo.geo-solutions.it/geoserver',
            layerName: 'topp:states',
            extent: [-126.13206836431365, 19.10784570899716, -65.5830401516955, 51.82396709579581] as Extent,
            projection: 'EPSG:4326',
            viewProjection: 'EPSG:3857'
        };
        context.extent = transformExtent(context.extent, 'EPSG:4326', context.viewProjection)

        // Construct the shared view
        this.view = new View({
            center: getCenter(context.extent),
            zoom: 3,
            projection: context.viewProjection
        });

        // Make sure evaluators use the same projection
        defaultProjection(get(context.viewProjection));

        // Create layers
        this.wmsLayer = new WLayerWMS(context);
        this.wfsLayer = new WLayerWFS(context);

        // Tell subscribers we're ready
        this.$onReady.next()
    }

    applyFilter(oe: Evaluator = and(), isDone = true) {
        [this.wmsLayer, this.wfsLayer].forEach(layer => layer.applyFilter(oe, isDone));
    }
}
