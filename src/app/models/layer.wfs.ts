import { and, Evaluator } from '@wootapa/object-evaluator-ol';
import { Feature } from 'ol';
import GeoJSON from 'ol/format/GeoJSON';
import Point from 'ol/geom/Point';
import VectorLayer from 'ol/layer/Vector';
import { Vector as VectorSource } from 'ol/source';
import { Fill, Stroke, Style, Text } from 'ol/style';
import CircleStyle from 'ol/style/Circle';
import { ILayerDef, WLayer } from './layer';

const hiddenStyle = new Style();
const formatJson = new GeoJSON();

export class WLayerWFS extends WLayer {

    constructor(def: ILayerDef) {
        super('WFS', def);

        this.olLayer = new VectorLayer({
            source: new VectorSource(),
            style: this.getStyle()
        });
        this.populate();
    }

    get source(): VectorSource {
        return this.olLayer.getSource() as VectorSource;
    }

    private getStyle() {
        const polyStyle = new Style({
            stroke: new Stroke({
                color: 'rgba(0, 0, 0, .5)',
                width: 1,
            }),
            fill: new Fill({
                color: null,
            }),
            text: new Text({
                text: '',
                font: '9pt Monospace',
                stroke: new Stroke({
                    color: 'black',
                    width: 0.75
                })
            })
        });

        const defaultStyle = new Style({
            image: new CircleStyle({
                radius: 3,
                fill: new Fill({
                    color: [0, 153, 255, 1]
                })
            })
        });

        return (feature: Feature) => {
            const geom = feature.getGeometry();

            if (!(geom instanceof Point)) {
                const persons = feature.get('PERSONS');
                const color = (persons > 2000000 && persons < 4000000)
                    ? 'rgba(255, 77, 77, .7)'
                    : persons > 4000000
                        ? 'rgba(77, 77, 255, .7)'
                        : 'rgba(77, 255, 77, .7)';

                polyStyle.getFill().setColor(color);
                polyStyle.getText().setText(feature.get('STATE_ABBR'));
                return polyStyle;
            }
            return defaultStyle;
        }
    }

    private async populate(oe: Evaluator = and()) {
        const payload = `<GetFeature
                xmlns="http://www.opengis.net/wfs" service="WFS" version="1.1.0" outputFormat="application/json"
                xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.opengis.net/wfs http://schemas.opengis.net/wfs/1.1.0/wfs.xsd">
                <Query typeName="${this.def.layerName}" srsName="${this.def.viewProjection}">
                ${oe.done().asOgcXml({ geometryName: 'the_geom' })}
                </Query>
            </GetFeature>`;

        const response = await fetch(`${this.def.url}/wfs`, {
            method: 'POST',
            body: payload
        });
        const jsonFeatures = await response.json();
        let features = formatJson.readFeatures(jsonFeatures);
        this.source.addFeatures(features);
    }

    public applyFilter(oe: Evaluator, isDone: boolean) {
        oe.done();
        //oe.resetReport();
        this.source.forEachFeature(feature => {
            feature.setStyle(
                oe.evaluate(feature)
                    ? null        // visible (use layer style)
                    : hiddenStyle // hidden (overrides layer style)
            );
        });
        //console.log(oe.getReport(), oe.asTree());
    }
}
