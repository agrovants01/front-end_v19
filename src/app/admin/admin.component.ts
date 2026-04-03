import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { UploadDataComponent } from './upload-data/upload-data.component';
import { UploadAnalysisLayerComponent } from './upload-analysis-layer/upload-analysis-layer.component';
import { AuthService } from 'src/app/auth/services/auth.service';


@Component({
    standalone: false,
    selector: 'app-admin',
    templateUrl: './admin.component.html',
    styles: [
    ]
})
export class AdminComponent implements OnInit {

    constructor(
        public authService: AuthService // 💡 Inyectamos AuthService
    ) { }

    ngOnInit(): void {
    }
}
