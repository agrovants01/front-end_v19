import { Component, OnInit } from '@angular/core';
import { MapService } from 'src/app/shared/services/map.service';

@Component({
  standalone: false,
    selector: 'app-view',
    templateUrl: './view.component.html',
    styles: []
})
export class ViewComponent implements OnInit {
    displayedColumns: string[] = ['index', 'date', 'week', 'options'];

    constructor(
        public mapService: MapService
    ) { }

    ngOnInit(): void {
    }

}
