import { BreakpointObserver } from '@angular/cdk/layout';
import { StepperOrientation, STEPPER_GLOBAL_OPTIONS } from '@angular/cdk/stepper';
import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { Observable, Subject } from 'rxjs';
import { map, takeUntil } from 'rxjs/operators';
import { warningAlert } from 'src/app/shared/services/alerts';
import { AdminService } from '../services/admin.service';
import { errorAlert, successAlert } from '../../shared/services/alerts';
import { GlobalsService } from 'src/app/shared/services/globals.service';
import Swal from 'sweetalert2';

@Component({
    standalone: false,
    selector: 'app-upload-data',
    templateUrl: './upload-data.component.html',
    providers: [
        {
            provide: STEPPER_GLOBAL_OPTIONS,
            useValue: { showError: true },
        }
    ],
    styles: [
    ]
})
export class UploadDataComponent implements OnInit {

    @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

    private unsubscribe$ = new Subject<void>();


    stepperOrientation!: Observable<StepperOrientation>;

    flightsForm: FormGroup = this.fb.group({
        flights: ['', [Validators.required]]
    })

    flights: any;
    selectedFileName: string = '';

    constructor(
        private fb: FormBuilder,
        public breakpointObserver: BreakpointObserver,
        private adminService: AdminService,
        private globalsService: GlobalsService
    ) { }

    ngOnInit(): void {
        this.stepperOrientation = this.breakpointObserver
            .observe('(min-width: 800px)')
            .pipe(map(({ matches }) => (matches ? 'horizontal' : 'vertical')));
    }

    openFileInput() {
        this.fileInput.nativeElement.click();
    }

    onFileChanged(event: any) {
        const selectedFile = event.target.files[0];
        this.selectedFileName = selectedFile ? selectedFile.name : '';
        const fileReader: FileReader = new FileReader();
        fileReader.readAsText(selectedFile, "UTF-8");
        fileReader.onload = () => {
            const file: string = (fileReader.result) ? fileReader.result.toString() : '';
            if (file.length > 0) {
                this.flights = JSON.parse(file);
                this.flightsForm.get('flights')?.setValue(this.flights);
            }
        }
        fileReader.onerror = (error: any) => {
            console.log(error);
            errorAlert('El archivo no es soportado');
        }
    }

    uploadFlights(flights: any) {
        if (flights) {
            Swal.fire({
                title: `¿Está seguro de que desea registrar los vuelos?`,
                text: 'Recuerde completar la información de nuevos propietarios',
                showDenyButton: true,
                confirmButtonText: `Confirmar`,
                denyButtonText: `Cancelar`,
                width: 'auto',
                reverseButtons: true,
            }).then((result: any) => {
                if (result.isConfirmed) {
                    this.adminService.saveFlights(flights)
                        .pipe(takeUntil(this.unsubscribe$))
                        .subscribe((_) => {
                            successAlert('Los vuelos han sido creados')
                                .then(() => {
                                    this.globalsService.return();
                                })
                        }, (error) => {
                            console.log(error);
                            errorAlert('Los vuelos no han sido almacenados');
                            return;
                        });
                }
            });
        } else {
            warningAlert('Debe subir un archivo');
            return;
        }
    }
}

