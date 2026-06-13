import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { SortDirection } from '@angular/material/sort';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { UserList } from '../users/users.interface';
import { catchError, delay, map, retry, tap } from 'rxjs/operators';
import { ProfileList } from './profiles.interface';
import { IndexData, IndexList, IndexRange } from '../indexes/index.interface';
import { Backup } from '../backup/backup.interface';
import { HttpErrorResponse } from '@angular/common/http';
import { throwError } from 'rxjs';
import { AgrochemicalList } from '../agrochemicals/agrochemicals.interface';
import { AdjuvantList } from '../adjuvants/adjuvants.interface';
import { OrdenPedido, UsuarioSelect, ListadoItem } from '../orden-pedido/orden-pedido.interface';

@Injectable({
    providedIn: 'root'
})
export class AdminService {




    private baseUrl: string = environment.baseUrl;

    constructor(private http: HttpClient) { }

    /* Backend */

    //postFull en backend
    saveFlights(flights: any) {
        return this.http.post<any>(
            `${this.baseUrl}/file`,
            flights
        );
    }

    // usuarioGetById en backend
    getUser(userId: string): Observable<UserList> {
        return this.http.get<UserList>(`${this.baseUrl}/usuario/${userId}`)
    }

    // usuarioPost en backend
    saveUser(user: UserList): Observable<UserList> {
        //console.log("📤 Enviando datos al backend (usuario):", user);

        return this.http.post<UserList>(`${this.baseUrl}/usuario`, user).pipe(
            tap((response) => {
                //console.log("✅ Respuesta exitosa del backend:", response);
            }),
            catchError((error: HttpErrorResponse) => {
                return throwError(() => error);
            })
        );
    }

    // updateBatchFlights(vuelos: any[], cambios: any): Observable<any> {
    //     const payload = { vuelos, cambios }; // Prepara el objeto con los datos requeridos
    //     return this.http.put(`${this.baseUrl}/vuelo/admin/batch-update`, payload);
    // }

    updateBatchFlights(vuelos: any[], cambios: any): Observable<any> {
        const payload = { vuelos, cambios };
        return this.http.put(`${this.baseUrl}/vuelo/admin/batch-update`, payload, { withCredentials: true });
    }

    // usuarioPut en el backend
    updateUser(user: UserList): Observable<UserList> {
        return this.http.put<UserList>(`${this.baseUrl}/usuario/editUsuario/${user.usuarioId}`, user)
    }

    // usuarioDelete en backend
    deleteUser(user: UserList) {
        return this.http.delete<any>(`${this.baseUrl}/usuario/${user.usuarioId}`)
    }

    getUsuerProfiles() {
        return this.http.get<ProfileList[]>(`${this.baseUrl}/perfil`);

    }

    getUsuersAdminList(sort: string = '', order: SortDirection, page: number = 0, filter: string = '', limit: number) {
        const params = new HttpParams().appendAll({
            sort,
            order,
            page: page,
            q: filter,
            limit
        })
        return this.http.get<any>(`${this.baseUrl}/usuario/admin`, { params })
            .pipe(
                delay(0),
                map(users => {
                    const { count, rows } = users;
                    rows.forEach((user: any) => {
                        const perfil = user.Perfil.nombrePerfil;
                        delete user.Perfil;
                        user.perfilUsuario = perfil
                        user.estadoColor = user.estado === 'verde' ? 'text-success' : 'text-danger';
                    })
                    return {
                        items: rows,
                        total_count: count
                    };
                })
            );
    }


    private formatDate(date: string): string {
        const fecha = new Date(date);
        if (isNaN(fecha.getTime())) {
            return 'Fecha inválida';
        } else {
            const dia = fecha.getDate();
            const mes = fecha.getMonth() + 1;
            const año = fecha.getFullYear();
            return `${dia}/${mes}/${año}`;
        }
    }



    // Obtener vuelos de un propietario por usuarioId
    getOwnerFlightsRemito(usuarioId: string) {

        return this.http.get<any>(`${this.baseUrl}/vuelo/remito/${usuarioId}`);

    }
    // Fin obtener vuelos de un propietario por usuarioId



    updateUserStatus(user: UserList, activo: boolean): Observable<any> {
        return this.http.put<any>(`${this.baseUrl}/usuario/editUsuarioEstado/${user.usuarioId}`, { activo })
    }

    getIndexesAdminList(sort: string = '', order: SortDirection, page: number = 0, filter: string = '', limit: number) {
        const params = new HttpParams().appendAll({
            sort,
            order,
            page: page,
            q: filter,
            limit
        })
        return this.http.get<any>(`${this.baseUrl}/indice/admin`, { params })
            .pipe(
                delay(0),
                map((indexes) => {
                    const { count, rows } = indexes;
                    return {
                        items: rows,
                        total_count: count
                    };
                })
            );
    }

    getIndexes() {
        return this.http.get<IndexData[]>(`${this.baseUrl}/indice/`);
    }

    getIndexRange(index: string) {
        return this.http.get<IndexRange[]>(`${this.baseUrl}/rango/${index}`)
    }

    saveIndex(index: IndexData): Observable<IndexData> {
        return this.http.post<IndexData>(`${this.baseUrl}/indice`, index)
    }


    updateIndex(index: IndexData): Observable<IndexData> {
        return this.http.put<IndexData>(`${this.baseUrl}/indice/${index.indiceId}`, index)
    }

    deleteIndex(index: IndexList) {
        return this.http.delete<any>(`${this.baseUrl}/indice/${index.indiceId}`)
    }


    borrarBackup(backup: Backup) {
        return this.http.delete<any>(`${this.baseUrl}/backup/${backup.backupId}`, {
            params: {
                nombreBackup: backup.nombreBackup
            }
        })
            .pipe(
                delay(500)
            );
    }

    restaurarBackup(backup: Backup) {
        return this.http.post<any>(`${this.baseUrl}/backup/restore`, {
            nombreBackup: backup.nombreBackup,
            backupId: backup.backupId
        })
            .pipe(
                delay(500)
            );
    }

    saveBackup(backup: Backup): Observable<Backup> {
        return this.http.post<Backup>(`${this.baseUrl}/backup`, backup)
            .pipe(
                delay(500)
            )
    }

    getBackupCount(): Observable<any> {
        return this.http.get<any>(`${this.baseUrl}/backup/count`);
    }

    /* FakeBackend */

    saveFlightsFake(flights: any) {
        return this.http.post<any>(
            `${this.baseUrl}/vuelos`,
            flights
        );
    }

    getUsuersAdminListFake(sort: string, order: SortDirection, page: number, filter: string = '') {
        const filterValue = filter.trim().toLocaleLowerCase();
        return this.http.get<any>(`${this.baseUrl}/usuarios?_sort=${sort}&_order=${order}&_start=${page}&_limit=30&q=${filterValue}`)
            .pipe(
                delay(0),
                map((data) => {
                    const total_count = 100;
                    return {
                        items: data,
                        total_count
                    }
                })
            );

    }

    saveUserFake(user: UserList): Observable<UserList> {
        const id = Math.random().toString();
        const userFake: any = {
            aliasUsuario: user.aliasUsuario,
            apellidoUsuario: user.apellidoUsuario,
            nombreUsuario: user.nombreUsuario,
            telefonoUsuario: user.telefonoUsuario,
            cuitUsuario: user.cuitUsuario,
            perfilUsuario: user.perfilUsuario,
            emailUsuario: user.emailUsuario,
            usuarioId: id,
            id
        }
        return this.http.post<UserList>(`${this.baseUrl}/usuarios`, userFake)
            .pipe(
                delay(500)
            )
    }
    updateUserFake(user: UserList): Observable<UserList> {
        const id = Math.random().toString();
        const userFake: any = {
            aliasUsuario: user.aliasUsuario,
            apellidoUsuario: user.apellidoUsuario,
            nombreUsuario: user.nombreUsuario,
            telefonoUsuario: user.telefonoUsuario,
            cuitUsuario: user.cuitUsuario,
            perfilUsuario: user.perfilUsuario,
            emailUsuario: user.emailUsuario,
            usuarioId: id,
            id
        }
        return this.http.put<UserList>(`${this.baseUrl}/usuarios/${user.usuarioId}`, userFake)
            .pipe(
                delay(500)
            )
    }


    getUsuerProfilesFake() {
        return this.http.get<ProfileList[]>(`${this.baseUrl}/perfiles`)
            .pipe(
                delay(500)
            );

    }

    deleteUserFake(user: UserList) {
        return this.http.delete<any>(`${this.baseUrl}/usuarios/${user.usuarioId}`)
            .pipe(
                delay(500)
            );

    }


    getIndexesAdminListFake(sort: string, order: SortDirection, page: number, filter: string = '') {
        const filterValue = filter.trim().toLocaleLowerCase();
        return this.http.get<any>(`${this.baseUrl}/indices?_sort=${sort}&_order=${order}&_start=${page}&_limit=30&q=${filterValue}`)
            .pipe(
                delay(500),
                map((data) => {
                    const total_count = 3;
                    return {
                        items: data,
                        total_count
                    }
                })
            );

    }

    saveIndexFake(index: IndexData): Observable<IndexData> {
        const id = Math.random().toString();
        const indexFake: any = {
            nombreIndice: index.nombreIndice,
            siglasIndice: index.siglasIndice,
            indiceId: id,
            referencia: index.referencia,
            id
        }
        return this.http.post<IndexData>(`${this.baseUrl}/indices`, indexFake)
            .pipe(
                delay(500)
            )
    }

    updateIndexFake(index: IndexData): Observable<IndexData> {
        const id = Math.random().toString();
        const indexFake: any = {
            nombreIndice: index.nombreIndice,
            siglasIndice: index.siglasIndice,
            rerefencia: index.referencia,
            indiceId: id,
            id
        }
        return this.http.put<IndexData>(`${this.baseUrl}/indices/${index.indiceId}`, indexFake)
            .pipe(
                delay(500)
            )
    }


    deleteIndexFake(index: IndexList) {
        return this.http.delete<any>(`${this.baseUrl}/index/${index.indiceId}`)
            .pipe(
                delay(500)
            );

    }

    getBackupsList(sort: string, order: SortDirection, page: number, filter: string = '') {
        const filterValue = filter.trim().toLocaleLowerCase();
        return this.http.get<any>(`${this.baseUrl}/backup?_sort=${sort}&_order=${order}&_start=${page}&_limit=30&q=${filterValue}`)
            .pipe(
                delay(500),
                map((data) => {
                    const total_count = 3;
                    return {
                        items: data,
                        total_count
                    }
                })
            );

    }

    //Gestion de ultimo remito

    getUltimoRemito(): Observable<any> {
        return this.http.get(`${this.baseUrl}/vuelo/remito/ultimoRemito`);
    }

    actualizaNumRemito(vueloId: string, numRemito: string): Observable<any> {
        return this.http.put(`${this.baseUrl}/vuelo/remito/${vueloId}`, { numRemito });
    }

    //Gestión de remitos

    //postRemito para el backend
    postRemito(remitoData: any): Observable<any> {
        return this.http.post<any>(
            `${this.baseUrl}/remito`,
            remitoData,
            { withCredentials: true }
        ).pipe(
            catchError((error: HttpErrorResponse) => {
                return throwError(() => error);
            })
        );
    }

    // En admin.service.ts
    getRemitoPorNumero(numRemito: string, fk_Usuario?: string): Observable<any> {
        let params = new HttpParams();
        if (fk_Usuario) {
            params = params.set('fk_Usuario', fk_Usuario);
        }
        return this.http.get<any>(`${this.baseUrl}/remito/${numRemito}`, { params });
    }

    // Obtener todos los remitos de un propietario (con rango de fechas opcional)
    getRemitosPorPropietario(
        usuarioId: string,
        fechaInicio?: string,
        fechaFin?: string
    ): Observable<any[]> {
        let params = new HttpParams();

        if (fechaInicio) {
            params = params.set('fechaInicio', fechaInicio);
        }

        if (fechaFin) {
            params = params.set('fechaFin', fechaFin);
        }

        return this.http.get<any[]>(
            `${this.baseUrl}/remito/propietario/${usuarioId}`,
            { params }
        ).pipe(
            catchError((error: HttpErrorResponse) => {
                return throwError(() => error);
            })
        );
    }

    getFlightsAdminList(
        sort: string = '',
        order: SortDirection,
        page: number = 0,
        filter: string = '',
        limit: number,
        range: { fechaDesde: string; fechaHasta: string } | null = null,
    ) {
        const perfil = localStorage.getItem('perfil');
        const idUsuarioLogueado = localStorage.getItem('idUsuarioLogueado');

        // Configura los parámetros iniciales
        let params = new HttpParams().appendAll({
            sort,
            order,
            page: page,
            q: filter,
            limit
        });

        // Si el rango de fechas está definido, agrega los parámetros correspondientes
        if (range) {
            params = params
                .set('fechaDesde', range.fechaDesde)
                .set('fechaHasta', range.fechaHasta);
        }

        // Si el perfil es PILOTO, agrega el parámetro pilotoId
        if (perfil === 'PILOTO' && idUsuarioLogueado) {
            params = params.set('pilotoId', idUsuarioLogueado);
        }

        // Llama al endpoint
        return this.http.get<any>(`${this.baseUrl}/vuelo/admin/vuelos`, { params })
            .pipe(
                delay(0), // Simula un retraso (puedes eliminarlo si no lo necesitas)
                map(flights => {
                    const { count, rows } = flights;

                    // Formatea las fechas de los vuelos
                    rows.forEach((flight: any) => {
                        const [año, mes, dia] = flight.fechaVuelo.split('-');
                        flight.fechaVuelo = `${dia}/${mes}/${año}`; // Formato dd/mm/yyyy
                    });

                    // Devuelve los datos transformados
                    return {
                        items: rows,
                        total_count: count
                    };
                })
            );
    }

    // getGestionList(
    //     sort: string,
    //     order: 'asc' | 'desc',
    //     page: number,
    //     search: string = '',
    //     limit: number = 100,
    //     range?: { fechaDesde: string; fechaHasta: string }
    // ): Observable<{ count: number; rows: any[] }> {

    //     console.log('🔍 Base URL:', this.baseUrl);
    //     console.log('📅 Rango recibido en servicio:', range);

    //     let params = new HttpParams()
    //         .set('sort', sort)
    //         .set('order', order)
    //         .set('page', page.toString())
    //         .set('limit', limit.toString());

    //     if (search) {
    //         params = params.set('q', search);
    //     }

    //     // ===============================
    //     // 🔥 NORMALIZACIÓN OBLIGATORIA ISO
    //     // ===============================
    //     if (range) {

    //         const toISO = (fecha: string): string => {
    //             if (!fecha) return '';

    //             // Si ya viene YYYY-MM-DD o ISO completo
    //             if (fecha.includes('-')) {
    //                 return fecha.split('T')[0];
    //             }

    //             // Si viene dd/MM/yyyy
    //             const [dia, mes, anio] = fecha.split('/');
    //             return `${anio}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
    //         };

    //         const fechaDesdeISO = toISO(range.fechaDesde);
    //         const fechaHastaISO = toISO(range.fechaHasta);

    //         params = params
    //             .set('fechaDesde', fechaDesdeISO)
    //             .set('fechaHasta', fechaHastaISO);

    //         console.log('📤 Fechas enviadas al backend (ISO):', {
    //             fechaDesdeISO,
    //             fechaHastaISO
    //         });

    //     } else {
    //         console.log('📤 No se enviaron fechas (range es undefined)');
    //     }

    //     // URL correcta
    //     const url = `${this.baseUrl}/vuelo/vuelos/gestion`;
    //     console.log('🌐 URL completa de gestion:', url);
    //     console.log('📋 Parámetros:', params.toString());

    //     return this.http
    //         .get<{ count: number; rows: any[] }>(url, { params })
    //         .pipe(
    //             tap(response => {
    //                 console.log('✅ Respuesta recibida de gestion');
    //                 console.log('📊 Total registros:', response.count);

    //                 if (response.rows && response.rows.length > 0) {
    //                     console.log('📄 Primer registro:', response.rows[0]);

    //                     const fechas = response.rows.map(r => r.fechaVuelo);
    //                     console.log('📅 Rango de fechas en respuesta:');
    //                     console.log('   Primera fecha:', fechas[0]);
    //                     console.log('   Última fecha:', fechas[fechas.length - 1]);
    //                 } else {
    //                     console.log('⚠️ Respuesta sin registros');
    //                 }
    //             }),
    //             catchError(error => {
    //                 console.error('❌ Error en getGestionList');
    //                 console.error('   URL:', error.url);
    //                 console.error('   Status:', error.status);
    //                 console.error('   Status Text:', error.statusText);
    //                 console.error(
    //                     '   Error (primeros 200 chars):',
    //                     error.error?.text?.substring(0, 200) || error.error
    //                 );
    //                 throw error;
    //             })
    //         );
    // }








    //==============================
    // MÉTODO PARA OBTENER LA LISTA DE GESTIÓN CON FILTRO DE FECHAS
    //==============================

    getGestionList(
        sort: string,
        order: 'asc' | 'desc',
        page: number,
        search: string = '',
        limit: number = 100,
        range?: { fechaDesde: string; fechaHasta: string }
    ): Observable<{ count: number; rows: any[] }> {

        let params = new HttpParams()
            .set('sort', sort)
            .set('order', order)
            .set('page', page.toString())
            .set('limit', limit.toString());

        if (search) {
            params = params.set('q', search);
        }

        // ===============================
        // 🔥 NORMALIZACIÓN OBLIGATORIA ISO
        // ===============================
        if (range) {

            const toISO = (fecha: string): string => {
                if (!fecha) return '';

                if (fecha.includes('-')) {
                    return fecha.split('T')[0];
                }

                const [dia, mes, anio] = fecha.split('/');
                return `${anio}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
            };

            const fechaDesdeISO = toISO(range.fechaDesde);
            const fechaHastaISO = toISO(range.fechaHasta);

            params = params
                .set('fechaDesde', fechaDesdeISO)
                .set('fechaHasta', fechaHastaISO);
        }

        const url = `${this.baseUrl}/vuelo/vuelos/gestion`;

        return this.http
            .get<{ count: number; rows: any[] }>(url, { params })
            .pipe(
                catchError(error => {
                    throw error;
                })
            );
    }











    // ============================================
    // MÉTODOS PARA AGROQUÍMICOS
    // ============================================


    // Obtener listado de agroquímicos
    getAgrochemicalsList(
        sortActive: string,
        sortDirection: string,
        pageIndex: number,
        search: string,
        pageSize: number
    ): Observable<{ items: AgrochemicalList[], total_count: number }> {
        const params = new HttpParams()
            .set('sortActive', sortActive)
            .set('sortDirection', sortDirection)
            .set('pageIndex', pageIndex)
            .set('search', search)
            .set('pageSize', pageSize);

        return this.http.get<{ items: AgrochemicalList[], total_count: number }>(
            `${this.baseUrl}/listado-agroquimicos`,
            { params }
        );
    }

    // Guardar nuevo agroquímico
    saveAgrochemical(agrochemical: AgrochemicalList): Observable<AgrochemicalList> {
        return this.http.post<AgrochemicalList>(`${this.baseUrl}/listado-agroquimicos`, agrochemical);
    }

    // Actualizar agroquímico
    updateAgrochemical(agrochemical: AgrochemicalList): Observable<AgrochemicalList> {
        return this.http.put<AgrochemicalList>(`${this.baseUrl}/listado-agroquimicos/${agrochemical.listadoAgroqId}`, agrochemical);
    }

    // Eliminar agroquímico
    deleteAgrochemical(agrochemical: AgrochemicalList): Observable<AgrochemicalList> {
        return this.http.delete<AgrochemicalList>(`${this.baseUrl}/listado-agroquimicos/${agrochemical.listadoAgroqId}`);
    }


    eliminarDuplicados(): Observable<any> {
        return this.http.delete<any>(`${this.baseUrl}/listado-agroquimicos/eliminar-duplicados`);
    }











    // ============================================
    // MÉTODOS PARA COADYUVANTES
    // ============================================

    // Obtener listado de coadyuvantes
    getAdjuvantsList(
        sortActive: string,
        sortDirection: string,
        pageIndex: number,
        search: string,
        pageSize: number
    ): Observable<{ items: AdjuvantList[], total_count: number }> {
        const params = new HttpParams()
            .set('sortActive', sortActive)
            .set('sortDirection', sortDirection)
            .set('pageIndex', pageIndex)
            .set('search', search)
            .set('pageSize', pageSize);

        return this.http.get<{ items: AdjuvantList[], total_count: number }>(
            `${this.baseUrl}/listado-coadyuvantes`,
            { params }
        );
    }

    // Guardar nuevo coadyuvante
    saveAdjuvant(adjuvant: AdjuvantList): Observable<AdjuvantList> {
        return this.http.post<AdjuvantList>(`${this.baseUrl}/listado-coadyuvantes`, adjuvant);
    }

    // Actualizar coadyuvante
    updateAdjuvant(adjuvant: AdjuvantList): Observable<AdjuvantList> {
        return this.http.put<AdjuvantList>(`${this.baseUrl}/listado-coadyuvantes/${adjuvant.ListadoCoadId}`, adjuvant);
    }

    // Eliminar coadyuvante
    deleteAdjuvant(adjuvant: AdjuvantList): Observable<AdjuvantList> {
        return this.http.delete<AdjuvantList>(`${this.baseUrl}/listado-coadyuvantes/${adjuvant.ListadoCoadId}`);
    }

    // Eliminar duplicados de coadyuvantes
    eliminarDuplicadosCoadyuvantes(): Observable<any> {
        return this.http.delete<any>(`${this.baseUrl}/listado-coadyuvantes/eliminar-duplicados`);
    }

    // ===============================
    // ORDEN DE PEDIDO
    // ===============================

    getOrdenesList(
        sortActive: string,
        sortDirection: 'asc' | 'desc',
        pageIndex: number,
        search: string = '',
        pageSize: number = 50
    ): Observable<{ items: OrdenPedido[]; total_count: number }> {
        const params = new HttpParams()
            .set('sortActive', sortActive)
            .set('sortDirection', sortDirection)
            .set('pageIndex', pageIndex.toString())
            .set('search', search)
            .set('pageSize', pageSize.toString());
        return this.http.get<{ items: OrdenPedido[]; total_count: number }>(
            `${this.baseUrl}/orden-pedido`, { params }
        );
    }

    saveOrden(orden: OrdenPedido): Observable<OrdenPedido> {
        return this.http.post<OrdenPedido>(`${this.baseUrl}/orden-pedido`, orden);
    }

    updateOrden(orden: OrdenPedido): Observable<OrdenPedido> {
        return this.http.put<OrdenPedido>(`${this.baseUrl}/orden-pedido/${orden.opId}`, orden);
    }

    deleteOrden(orden: OrdenPedido): Observable<OrdenPedido> {
        return this.http.delete<OrdenPedido>(`${this.baseUrl}/orden-pedido/${orden.opId}`);
    }

    getPilotos(): Observable<UsuarioSelect[]> {
        return this.http.get<UsuarioSelect[]>(`${this.baseUrl}/orden-pedido/pilotos`);
    }

    getPropietarios(): Observable<UsuarioSelect[]> {
        return this.http.get<UsuarioSelect[]>(`${this.baseUrl}/orden-pedido/propietarios`);
    }

    getAgroquimicos(): Observable<ListadoItem[]> {
        return this.http.get<ListadoItem[]>(`${this.baseUrl}/orden-pedido/agroquimicos`);
    }

    getCoadyuvantes(): Observable<ListadoItem[]> {
        return this.http.get<ListadoItem[]>(`${this.baseUrl}/orden-pedido/coadyuvantes`);
    }

    calcularTarifa(cultivo: string, superficie: number): Observable<any> {
        return this.http.post<any>(`${this.baseUrl}/orden-pedido/calcular-tarifa`, { cultivo, superficie });
    }

}
