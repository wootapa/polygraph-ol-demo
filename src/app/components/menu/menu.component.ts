import { Component } from '@angular/core';
import { and, Polygraph, or } from '@wootapa/polygraph-ol';
import GeometryType from 'ol/geom/GeometryType';
import { IDoDrawResult, MapService } from 'src/app/providers/map.service';

@Component({
    selector: 'app-menu',
    templateUrl: './menu.component.html',
    styleUrls: ['./menu.component.scss']
})
export class MenuComponent {
    private filters: Polygraph[] = [];
    private drawHandles: IDoDrawResult[] = [];

    constructor(private mapService: MapService) {
        this.mapService.$onTranslate.subscribe(e => this.apply(e.isEnd));
    }

    apply(isEnd = true) {
        const oeCombined = this.filters.reduce((oeParent, oe) => oeParent.addPolygraph(oe), Polygraph.or());
        this.mapService.applyFilter(oeCombined, isEnd);
    }

    clear() {
        this.drawHandles.forEach(handle => handle.remove());
        this.drawHandles.length = this.filters.length = 0;
        this.apply();
    }

    addOperator(geometryType: string, operand: string) {
        const oe = and();
        this.filters.push(oe);

        this.mapService.$doDraw.next({
            type: geometryType as GeometryType,
            onDone: drawResult => {
                this.drawHandles.push(drawResult);

                switch (operand) {
                    case 'intersects':
                        oe.intersects(drawResult.feature);
                        break;
                    case 'disjoint':
                        oe.disjoint(drawResult.feature);
                        break;
                    case 'contains':
                        oe.contains(drawResult.feature);
                        break;
                    case 'within':
                        oe.within(drawResult.feature);
                        break;
                    case 'dwithin': {
                        const distance = +window.prompt("Distance in meters", "500000");
                        drawResult.feature.set('distance', distance);
                        oe.distanceWithin(drawResult.feature, distance);
                        break;
                    }
                    case 'beyond': {
                        const distance = +window.prompt("Distance in meters", "500000");
                        drawResult.feature.set('distance', distance);
                        oe.distanceBeyond(drawResult.feature, distance);
                        break;
                    }
                    default:
                        throw new Error('Unknown operand: ' + operand);
                }
                this.apply();
            }
        });
    }
}
