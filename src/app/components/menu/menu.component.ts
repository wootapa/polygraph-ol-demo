import { Component } from '@angular/core';
import { and, Evaluator, or } from '@wootapa/object-evaluator-ol';
import { Feature } from 'ol';
import GeometryType from 'ol/geom/GeometryType';
import { IDoDrawResult, MapService } from 'src/app/providers/map.service';

@Component({
    selector: 'app-menu',
    templateUrl: './menu.component.html',
    styleUrls: ['./menu.component.scss']
})
export class MenuComponent {
    private filters: Evaluator[] = [];
    private handles: IDoDrawResult[] = [];
    constructor(private mapService: MapService) { }

    clear() {
        this.handles.forEach(handle => handle.remove());
        this.handles.length = 0;
        this.filters.length = 0;
        this.mapService.applyFilter();
    }

    addOperatorDistance(operand) {
        const distance = +window.prompt("Distance in meters", "500000");
        this.addOperator('Point', operand, distance);
    }

    addOperator(geometryType: string, operand, distance?: number) {
        const oe = and();
        this.filters.push(oe);

        this.mapService.$doDraw.next({
            type: geometryType as GeometryType,
            onDone: drawResult => {
                this.handles.push(drawResult);

                if (['dwithin', 'beyond'].includes(operand)) { 
                    drawResult.feature.set('distance', distance);
                }

                const evaluate = (feature: Feature, isDone = true) => {
                    oe.clear();
                    switch (operand) {
                        case 'intersects':
                            oe.intersects(feature);
                            break;
                        case 'disjoint':
                            oe.disjoint(feature);
                            break;
                        case 'contains':
                            oe.contains(feature);
                            break;
                        case 'within':
                            oe.within(feature);
                            break;
                        case 'dwithin':
                            oe.distanceWithin(feature, distance);
                            break;
                        case 'beyond':
                            oe.distanceBeyond(feature, distance);
                            break;
                        default:
                            throw new Error('Unknown operand: ' + operand);
                    }

                    const oeParent = this.filters.reduce((oeParent, oe) => oeParent.addEvaluator(oe), or());
                    this.mapService.applyFilter(oeParent, isDone);
                };

                this.mapService.$doTranslate.next({
                    feature: drawResult.feature,
                    onDone: translateResult => {
                        translateResult.$onTranslateEnd.subscribe(f => evaluate(f))
                        translateResult.$onTranslating.subscribe(f => evaluate(f, false))
                    }
                });
                evaluate(drawResult.feature);
            }
        });
    }
}
