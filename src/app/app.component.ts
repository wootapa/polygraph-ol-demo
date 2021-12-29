import { Component } from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'polygraph-demo';

  constructor() {
    document.addEventListener('gesturestart', e => e.preventDefault());
  }
}
