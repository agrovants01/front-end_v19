import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { BackupLoginService } from '../services/backup-login.service';

@Component({
    standalone: false,
    selector: 'app-backup-login',
    templateUrl: './backup-login.component.html',
    styleUrls: ['./backup-login.component.css']
})
export class BackupLoginComponent {

    loginForm: FormGroup = this.fb.group({
        password: ['', [Validators.required]]
    });

    errorMsg: string = '';
    isLoading: boolean = false;
    private returnUrl: string = '/admin/backups';

    constructor(
        private fb: FormBuilder,
        private backupLoginService: BackupLoginService,
        private router: Router,
        private route: ActivatedRoute
    ) {
        this.route.queryParams.subscribe(params => {
            if (params['returnUrl']) {
                this.returnUrl = params['returnUrl'];
            }
        });

        if (this.backupLoginService.isBackupAuthenticated()) {
            this.router.navigate([this.returnUrl]);
        }
    }

    onSubmit(): void {
        if (this.loginForm.invalid) {
            this.loginForm.markAllAsTouched();
            return;
        }

        this.isLoading = true;
        this.errorMsg = '';

        const password = this.loginForm.get('password')?.value;

        this.backupLoginService.authenticate(password).subscribe((success) => {
            this.isLoading = false;
            if (success) {
                this.router.navigate([this.returnUrl]);
            } else {
                this.errorMsg = 'Contraseña incorrecta';
            }
        });
    }

    cancel(): void {
        this.router.navigate(['/admin']);
    }
}
