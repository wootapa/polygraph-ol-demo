import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { AppComponent } from './app.component';
import { MapComponent } from './components/map/map.component';
import { MenuComponent } from './components/menu/menu.component';
import { MapService } from './providers/map.service';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';

@NgModule({
  declarations: [
    AppComponent,
    MapComponent,
    MenuComponent
  ],
  imports: [
    BrowserModule,
    NgbModule
  ],
  providers: [ MapService],
  bootstrap: [AppComponent]
})
export class AppModule { }
