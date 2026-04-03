import { Component, OnInit } from '@angular/core';

@Component({
  standalone: false,
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
    title = 'agrovants-frontEnd';

    ngOnInit(): void {
        /*  window.addEventListener('beforeunload', (event) => {
            event.preventDefault();
            localStorage.clear();
          })
        */
    }

}
