import { Injectable } from '@angular/core';
import { Location } from '@angular/common';
import { GlobalsService } from './globals.service';

@Injectable({
    providedIn: 'root'
})
export class SidebarService {

    extendedSidebar: boolean = false;
    filterOptions: boolean = false;

    constructor(
        private location: Location,
        private globalsService: GlobalsService
    ) {
        /* Desktop Media Query */
        this.globalsService.desktop
            .subscribe((desktop) => {
                if (desktop) {
                    this.extendedSidebar = false;
                    this.filterOptions = true;
                } else {
                    this.filterOptions = false;
                }
            })
    };

    toggleSidebar() {
        this.extendedSidebar = this.extendedSidebar ? false : true;
    }

    toggleFilter() {
        this.filterOptions = this.filterOptions ? false : true;
    }

}
