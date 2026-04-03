import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnChanges, SimpleChanges, Input, OnInit } from '@angular/core';
import { MapService } from 'src/app/shared/services/map.service';

@Component({
  standalone: false,

    selector: 'app-references',
    templateUrl: './references.component.html',
    styles: []
})
export class ReferencesComponent {

    constructor(
        public mapService: MapService
    ) { }

    ngOnInit(): void {

    }

}
