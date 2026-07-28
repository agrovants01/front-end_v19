import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { forkJoin, MonoTypeOperatorFunction, Observable, Subject } from 'rxjs';
import { map, takeUntil } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { OwnerDataInfoComponent } from '../components/owner-data-info/owner-data-info.component';
import { OwnerPreview, UserPreview, OwnerListInput } from '../owner/owner.interface';
import { Piloto } from '../owner/pilot.interface';
import { Cultivo } from '../owner/cultivo.interface';
import { Tecnico } from '../owner/tecnico.interface';
import { Agroquimico } from '../owner/agroquimico.interface';
import { Coadyuvante } from '../owner/coadyuvante.interface';
import { PilotoTecnico } from '../owner/piloto-tecnico.interface';

@Injectable({
    providedIn: 'root'
})
export class OwnerService {

    private baseUrl: string = environment.baseUrl;
    public elementDeleted: Subject<any> = new Subject();
    public elementUpdated: Subject<any> = new Subject();

    constructor(
        private http: HttpClient,
        private dialog: MatDialog,
    ) { }

    /* Backend Agrovants */

    searchOwners(value: string = ''): Observable<OwnerPreview[]> {
        const params = new HttpParams().appendAll({
            q: value,
        });
        return this.http.get<OwnerPreview[]>(
            `${this.baseUrl}/busqueda/propietarios`, { params }
        );
    }

    searchOwnersAndPilots(value: string = ''): Observable<UserPreview[]> {
        const params = new HttpParams().appendAll({
            q: value,
        });
        return this.http.get<UserPreview[]>(
            `${this.baseUrl}/busqueda/propietariosYpilotos`, { params }
        );
    }

    sortOwners(owners: OwnerPreview[], option: string, criterion: boolean) {

        switch (option) {
            case 'Propietario':
                if (criterion) {
                    owners.sort((a, b) => {
                        if (a.nombrePropietario.length > 0) {
                            if (b.nombrePropietario.length > 0) {
                                return a.nombrePropietario.localeCompare(b.nombrePropietario)
                            } else {
                                return a.nombrePropietario.localeCompare(b.aliasPropietario)
                            }
                        }
                        return (b.nombrePropietario.length > 0) ? a.aliasPropietario.localeCompare(b.nombrePropietario) : a.aliasPropietario.localeCompare(b.aliasPropietario);
                    });
                    return;
                }
                owners.sort((a, b) => {
                    if (a.nombrePropietario.length > 0) {
                        if (b.nombrePropietario.length > 0) {
                            return a.nombrePropietario.localeCompare(b.nombrePropietario)
                        } else {
                            return a.nombrePropietario.localeCompare(b.aliasPropietario)
                        }
                    }
                    return (b.nombrePropietario.length > 0) ? a.aliasPropietario.localeCompare(b.nombrePropietario) : a.aliasPropietario.localeCompare(b.aliasPropietario);
                }).reverse();
                break;

            case 'Último Vuelo':
                if (criterion) {
                    owners.sort((a, b) => {
                        return (
                            <any>new Date(a.ultimoVuelo) -
                            <any>new Date(b.ultimoVuelo)
                        );
                    });
                    return;
                }
                owners
                    .sort((a, b) => {
                        return (
                            <any>new Date(a.ultimoVuelo) -
                            <any>new Date(b.ultimoVuelo)
                        );
                    })
                    .reverse();
                break;

            case 'Cant. Vuelos':
                if (criterion) {
                    owners.sort((a, b) => {
                        return a.cantidadVuelos - b.cantidadVuelos;
                    });
                    return;
                }
                owners
                    .sort((a, b) => {
                        return a.cantidadVuelos - b.cantidadVuelos;
                    })
                    .reverse();
                break;
        }
    }

    sortUsers(users: UserPreview[], option: string, criterion: boolean) {
        switch (option) {
            case 'Propietario':
                if (criterion) {
                    users.sort((a, b) => (a.nombrePropietario || a.aliasPropietario).localeCompare(b.nombrePropietario || b.aliasPropietario));
                } else {
                    users.sort((a, b) => (a.nombrePropietario || a.aliasPropietario).localeCompare(b.nombrePropietario || b.aliasPropietario)).reverse();
                }
                break;

            case 'Piloto':
                if (criterion) {
                    users.sort((a, b) => a.perfil.localeCompare(b.perfil));
                } else {
                    users.sort((a, b) => a.perfil.localeCompare(b.perfil)).reverse();
                }
                break;

            case 'Último Vuelo':
                if (criterion) {
                    users.sort((a, b) => <any>new Date(a.ultimoVuelo) - <any>new Date(b.ultimoVuelo));
                } else {
                    users.sort((a, b) => <any>new Date(a.ultimoVuelo) - <any>new Date(b.ultimoVuelo)).reverse();
                }
                break;

            case 'Cant. Vuelos':
                if (criterion) {
                    users.sort((a, b) => a.cantidadVuelos - b.cantidadVuelos);
                } else {
                    users.sort((a, b) => a.cantidadVuelos - b.cantidadVuelos).reverse();
                }
                break;
        }
    }


    // Este se puede reutilizar para elegir propietario en creacion de vuelo en perfil piloto
    getOwnersList(): Observable<OwnerListInput[]> {
        return this.http.get<OwnerListInput[]>(
            `${this.baseUrl}/usuario/admin/propietariosInput`
        )
    }

    getPilotos(): Observable<Piloto[]> {
        return this.http.get<Piloto[]>(`${this.baseUrl}/usuario/pilotos`);
    }

    getPilotosTenicos(): Observable<PilotoTecnico[]> {
        return this.http.get<PilotoTecnico[]>(`${this.baseUrl}/usuario/pilotosTecnicos`);
    }


    getCultivos(): Observable<Cultivo[]> {
        return this.http.get<Cultivo[]>(`${this.baseUrl}/cultivo/cultivos`);
    }

    getTecnicos(): Observable<Tecnico[]> {
        return this.http.get<Tecnico[]>(`${this.baseUrl}/usuario/tecnicos`);
    }

    getAgroquimicos(): Observable<Agroquimico[]> {
        return this.http.get<Agroquimico[]>(`${this.baseUrl}/agroquimico/agroquimicos`);
    }

    getCoadyuvantes(): Observable<Coadyuvante[]> {
        return this.http.get<Coadyuvante[]>(`${this.baseUrl}/coadyuvante/coadyuvantes`);
    }

    // envia como parametros el id del propietario, y las fechas de rango.
    getOwnerFlights(usuarioId: string, fechaDesde: Date, fechaHasta: Date) {
        const params = new HttpParams().appendAll({
            fechaDesde: fechaDesde.toString(),
            fechaHasta: fechaHasta.toString(),
        });
        return this.http.get<any>(

            // vueloGet en backend
            `${this.baseUrl}/vuelo/${usuarioId}`, { params }
            //http://localhost:3000/api/vuelo/mTbGkFAugiVZ1Yp-y9e-2
        )

    }


    // esto es vueloGetByPilot en el backend
    getOwnerFlightsByPilot(pilotoId: string, fechaDesde: Date, fechaHasta: Date) {
        const params = new HttpParams().appendAll({
            fechaDesde: fechaDesde.toString(),
            fechaHasta: fechaHasta.toString(),
        });

        return this.http.get<any>(
            `${this.baseUrl}/vuelo/piloto/${pilotoId}`, { params }
        );
    }

    // Obtener vuelos realizados por un piloto específico (para admin)
    getPilotFlights(pilotoId: string, fechaDesde: Date, fechaHasta: Date) {
        const params = new HttpParams().appendAll({
            fechaDesde: fechaDesde.toString(),
            fechaHasta: fechaHasta.toString(),
        });

        return this.http.get<any>(
            `${this.baseUrl}/vuelo/piloto-vuelos/${pilotoId}`, { params }
        );
    }


    // actualizaVuelo en backend
    updateFlight(vueloId: string, updatedFlightData: any): Observable<any> {
        return this.http.put(`${this.baseUrl}/vuelo/actualizaVuelo/${vueloId}`, updatedFlightData); // Actualización del vuelo existente
    }

    saveFlight(req: any): Observable<any[]> {
        return this.http.post<any[]>(`${this.baseUrl}/vuelo/`, req);
    }


    processFlights(flights: any[], mapService: any) {
        flights.forEach(element => {
            element.visibility = true;
            if (element.geometryVuelo && element.geometryVuelo.coordinates) {
                element.path = mapService.geojsonSvgPath(element.geometryVuelo.coordinates);
            }
        })
        return flights;
    }



    //bajaVuelo en backend
    deleteOwnerFlight(vueloId: string) {
        return this.http.put<any>(`${this.baseUrl}/vuelo/bajaVuelo/${vueloId}`, {});
    }

    //Para dar de baja varios vuelos a la vez
    deleteOwnerFlights(vueloIds: string[]) {
        const observables = vueloIds.map(id => this.deleteOwnerFlight(id));
        return forkJoin(observables);
    }




    sortOwnerData(ownerData: any[], criterion: boolean): any[] {
        let fullOwnerData: any[] = [];

        ownerData.forEach((data: any) => {
            if (data !== null) {
                if (data) {
                    fullOwnerData = fullOwnerData.concat(data)
                } else {
                    fullOwnerData = fullOwnerData.concat(data)
                }
            }
        })

        if (criterion) {
            fullOwnerData.sort((a, b) => {
                return (
                    <any>new Date(a.date) -
                    <any>new Date(b.date)
                );
            })
        } else {
            fullOwnerData.sort((a, b) => {
                return (
                    <any>new Date(a.date) -
                    <any>new Date(b.date)
                );
            }).reverse();
        }

        return fullOwnerData;
    }

    openInfoDialog(data: any, type: string) {
        this.dialog.open(OwnerDataInfoComponent, {
            width: '92vw',
            maxWidth: '1100px',
            data: {
                type,
                data
            },
        })
    }

    /* FackeBackend */

    getOwnersFake(): Observable<OwnerPreview[]> {
        return this.http.get<OwnerPreview[]>(
            `${this.baseUrl}/propietarios/`
        )
    };

    searchOwnersFake(value: string): Observable<OwnerPreview[]> {
        const searchValue = value.trim().toLocaleLowerCase();
        return this.http.get<OwnerPreview[]>(
            `${this.baseUrl}/propietarios/?q=${searchValue}`
        )
    }

    sortOwnersFake(option: string, criterion: boolean): Observable<OwnerPreview[]> {

        switch (option) {
            case 'Propietario':
                if (criterion) {
                    return this.http.get<OwnerPreview[]>(
                        `${this.baseUrl}/propietarios/?_sort=nombrePropietario&_order=asc`
                    );
                }
                return this.http.get<OwnerPreview[]>(
                    `${this.baseUrl}/propietarios/?_sort=nombrePropietario&_order=desc`
                );
                break;

            case 'Último Vuelo':
                if (criterion) {
                    return this.http.get<OwnerPreview[]>(
                        `${this.baseUrl}/propietarios/?_sort=ultimoVuelo&_order=asc`
                    );
                }
                return this.http.get<OwnerPreview[]>(
                    `${this.baseUrl}/propietarios/?_sort=ultimoVuelo&_order=desc`
                );
                break;

            case 'Cant. Vuelos':
                if (criterion) {
                    return this.http.get<OwnerPreview[]>(
                        `${this.baseUrl}/propietarios/?_sort=cantidadVuelos&_order=asc`
                    );
                }
                return this.http.get<OwnerPreview[]>(
                    `${this.baseUrl}/propietarios/?_sort=cantidadVuelos&_order=desc`
                );
                break;
        }
        return new Observable<OwnerPreview[]>();
    }


}
