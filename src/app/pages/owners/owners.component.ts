import * as L from 'leaflet';
import { Component, Input, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { debounceTime, switchMap, takeUntil } from 'rxjs/operators';
import { SidebarService } from 'src/app/shared/services/sidebar.service';
import { OwnerPreview, UserPreview } from '../owner/owner.interface';
import { OwnerService } from '../services/owner.service';
import { OrderCriterion } from '../components/search/orderCriterion.interface';
import { MapComponent } from '../../shared/map/map.component';
import { MapService } from 'src/app/shared/services/map.service';
import { FlightsService } from '../services/flights.service';
import { AuthService } from 'src/app/auth/services/auth.service';

@Component({
    standalone: false,
    selector: 'app-owners',
    host: { 'class': 'sidebar__content-flex' },
    templateUrl: './owners.component.html',
    styles: []
})
export class OwnersComponent implements OnInit {

    flights: any[] = [];

    private unsubscribe$ = new Subject<void>();
    private searchTerms$ = new Subject<string>();

    title: string = 'Propietarios'; //Title of the Search Bar

    admin = this.authService.auth.perfilUsuario == "ADMIN";
    piloto = this.authService.auth.perfilUsuario == "PILOTO";



    orderOptions: string[] = this.admin ? ['Propietario', 'Piloto', 'Último Vuelo', 'Cant. Vuelos'] : ['Propietario', 'Último Vuelo', 'Cant. Vuelos'];

    owners: OwnerPreview[] = [];
    users: UserPreview[] = [];

    constructor(
        public authService: AuthService,
        private ownerService: OwnerService,
        public sidebarService: SidebarService,
        private router: Router,
        private route: ActivatedRoute,
        private mapService: MapService,
        private flightsService: FlightsService
    ) { }

    ngOnInit(): void {

        // Esto carga los poligonos en el mapa al iniciar el componente, muestra todos.
        this.mapService.map$
            .pipe(takeUntil(this.unsubscribe$))
            .subscribe((map: L.Map) => {
                // Hacer la llamada al servicio para obtener todos los vuelos
                this.flightsService.getAllFlights()
                    .pipe(takeUntil(this.unsubscribe$))
                    .subscribe(flights => {
                        // Agregar vuelos al mapa
                        this.mapService.addFlightsToMap(flights);
                        this.flights = flights; // Guardar los vuelos para otras operaciones si es necesario
                    });
            })

        if (this.admin) {
            this.ownerService.searchOwnersAndPilots()
                .pipe(takeUntil(this.unsubscribe$))
                .subscribe((users) => {
                    this.users = users;
                });
        } else {
            this.ownerService.searchOwners()
                .pipe(takeUntil(this.unsubscribe$))
                .subscribe((owners) => {
                    this.owners = owners;
                });
        }

        //this.mapService.removeAllFeatures();



        // Search con debounce + switchMap para cancelar requests previos
        this.searchTerms$
            .pipe(
                debounceTime(300),
                switchMap((value: string) => {
                    if (!value || value === '') {
                        return this.admin
                            ? this.ownerService.searchOwnersAndPilots()
                            : this.ownerService.searchOwners();
                    }
                    return this.admin
                        ? this.ownerService.searchOwnersAndPilots(value)
                        : this.ownerService.searchOwners(value);
                }),
                takeUntil(this.unsubscribe$)
            )
            .subscribe((data: any) => {
                if (this.admin) {
                    this.users = data;
                } else {
                    this.owners = data;
                }
            });

    }

    updateValues(value: string): void {
        this.searchTerms$.next(value);
    }

    /** Criterion Order:
     *  true -> Ascendent
     *  false -> Descendent
     * **/

    /*Backend*/
    orderOwners(orderCriterion: OrderCriterion) {
        const { option, criterion } = orderCriterion;
        if (this.admin && this.users.length > 0) {
            this.ownerService.sortUsers(this.users, option, criterion);
        } else {
            this.ownerService.sortOwners(this.owners, option, criterion);
        }
    }

    /** FakeBackend*/
    /*orderOwners(orderCriterion: OrderCriterion) {
      const { option, criterion } = orderCriterion;
      this.ownerService.sortOwnersFake(option, criterion)
        .pipe(takeUntil(this.unsubscribe$))
        .subscribe((data) => {
          this.owners = [];
          this.owners = data;
        })

    }*/

    goToOwner(id: string, perfil?: string): void {
        localStorage.setItem("idPropietarioElegido", id);
        if (perfil) {
            localStorage.setItem("perfilUsuarioElegido", perfil);
        } else {
            localStorage.removeItem("perfilUsuarioElegido");
        }
        this.router.navigateByUrl(`owner/${id}`);
    }

}
