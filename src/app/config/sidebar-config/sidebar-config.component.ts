import { Component, OnInit } from '@angular/core';
import { SidebarService } from 'src/app/shared/services/sidebar.service';

@Component({
  standalone: false,
  selector: 'app-sidebar-config',
  host: { 'class': 'sidebar__content-flex' },
  templateUrl: './sidebar-config.component.html',
  styleUrls: []
})
export class SidebarConfigComponent implements OnInit {

  constructor(
    public sidebarService: SidebarService
  ) { }

  ngOnInit(): void {
  }

}
