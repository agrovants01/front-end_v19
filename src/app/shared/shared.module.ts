import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SidebarComponent } from './sidebar/sidebar.component';
import { RouterModule } from '@angular/router';
import { MapModule } from './map/map.module';
import { LayoutModule } from '@angular/cdk/layout';
import { FrameworksModule } from '../frameworks/frameworks.module';
import { AuthModule } from '../auth/auth.module';


@NgModule({
    declarations: [
        SidebarComponent,
    ],
    imports: [
        CommonModule,
        RouterModule,
        MapModule,
        LayoutModule,
        FrameworksModule,
        AuthModule,
    ],
    exports: [
        SidebarComponent,
    ]
})
export class SharedModule { }
