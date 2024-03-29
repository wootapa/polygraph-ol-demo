import Layer from 'ol/layer/Layer';
import { Polygraph } from '@wootapa/polygraph-ol';
import { Extent } from 'ol/extent';
import { ProjectionLike } from 'ol/proj';

export interface ILayerDef {
    geomField: string,
    url: string,
    layerName: string,
    extent?: Extent,
    projection: ProjectionLike,
    viewProjection: ProjectionLike
}

export abstract class WLayer {
    public olLayer: Layer;

    constructor(public name: string, protected def: ILayerDef) { }

    public abstract applyFilter(oe: Polygraph, isDone: boolean): void;
}
