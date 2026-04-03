// weather.service.ts - VERSIÓN CORREGIDA CON DEBUG
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

export interface ForecastDay {
    fecha: Date;
    diaSemana: string;
    fechaCorta: string;
    tempMax: number;
    tempMin: number;
    precipitacion: number;
    codigoClima: number;
    descripcionClima: string;
    icono: string;
    sunrise?: Date;
    sunset?: Date;
    datosHorarios?: HourlyData[];
}

export interface HourlyData {
    hora: string;        // Formato: "01:00", "02:00", etc. (hora Argentina)
    horaUTC: string;     // Para debug
    temperatura: number;
    precipitacion: number;
    humedad: number;
    vientoVelocidad: number;
    vientoDireccion: number;
    codigoClima: number;
    descripcionClima: string;
    icono: string;
    fechaHoraArgentina: Date;  // IMPORTANTE: guardar la fecha completa
    fechaHoraUTC: Date;        // Para referencia
}

@Injectable({
    providedIn: 'root'
})
export class WeatherService {
    private apiUrl = 'https://api.open-meteo.com/v1/forecast';

    // Offset de Argentina (UTC-3) en milisegundos
    private offsetArgentina = -3 * 60 * 60 * 1000;

    // Cache para geocodificación (evita llamadas repetidas)
    private geocodingCache = new Map<string, string>();

    constructor(private http: HttpClient) { }

    // Método de geocodificación con caché
    async obtenerNombreUbicacion(lat: number, lon: number): Promise<string> {
        // Clave única para estas coordenadas (redondeadas a 4 decimales)
        const cacheKey = `${lat.toFixed(4)},${lon.toFixed(4)}`;

        // Verificar cache
        if (this.geocodingCache.has(cacheKey)) {
            console.log('Usando ubicación desde caché:', cacheKey);
            const cachedValue = this.geocodingCache.get(cacheKey);
            return cachedValue || `Lat: ${lat.toFixed(4)}, Lon: ${lon.toFixed(4)}`;
        }

        // Si no está en caché, obtener de la API
        try {
            const nombre = await this.geocodificarInversa(lat, lon);

            // Guardar en caché
            this.geocodingCache.set(cacheKey, nombre);

            // Limitar tamaño del caché (mantener solo 50 ubicaciones) - VERSIÓN CORREGIDA
            if (this.geocodingCache.size > 50) {
                // Obtener la primera clave usando destructuring
                const firstEntry = this.geocodingCache.entries().next().value;
                if (firstEntry && firstEntry[0]) {
                    this.geocodingCache.delete(firstEntry[0]);
                }

                // Alternativa más segura: convertir a array y tomar la primera
                // const keys = Array.from(this.geocodingCache.keys());
                // if (keys.length > 0) {
                //     this.geocodingCache.delete(keys[0]);
                // }
            }

            return nombre;
        } catch (error) {
            console.error('Error en geocodificación:', error);
            // Fallback a coordenadas
            const fallback = `Lat: ${lat.toFixed(4)}, Lon: ${lon.toFixed(4)}`;
            this.geocodingCache.set(cacheKey, fallback);
            return fallback;
        }
    }

    getPronostico7Dias(latitud: number, longitud: number): Observable<ForecastDay[]> {
        const params = {
            latitude: latitud.toString(),
            longitude: longitud.toString(),
            daily: 'weathercode,temperature_2m_max,temperature_2m_min,precipitation_sum,sunrise,sunset',
            hourly: 'temperature_2m,precipitation,relativehumidity_2m,windspeed_10m,winddirection_10m,weathercode',
            timezone: 'auto',
            forecast_days: 8
        };

        return this.http.get(this.apiUrl, { params }).pipe(
            map((response: any) => {
                // DEBUG: Ver lo que devuelve la API
                console.log('=== DEBUG API RESPONSE ===');
                console.log('Timezone recibida:', response.timezone);
                console.log('Timezone offset (seg):', response.utc_offset_seconds);
                console.log('Primera fecha diaria:', response.daily?.time?.[0]);
                console.log('Primera hora horaria:', response.hourly?.time?.[0]);
                console.log('Total horas:', response.hourly?.time?.length);
                console.log('=== FIN DEBUG ===');

                return this.procesarDatosCompletos(response);
            }),
            catchError(error => {
                console.error('Error en API de clima:', error);
                return throwError(() => new Error('No se pudo obtener el pronóstico'));
            })
        );
    }

    private procesarDatosCompletos(data: any): ForecastDay[] {
        const pronostico: ForecastDay[] = [];

        if (!data.daily || !data.daily.time) {
            throw new Error('Formato de datos incorrecto');
        }

        // Obtener offset de la API (si viene)
        const offsetAPISegundos = data.utc_offset_seconds || -10800; // -10800 = UTC-3 (Argentina)
        console.log('Offset API (seg):', offsetAPISegundos, '=> horas:', offsetAPISegundos / 3600);

        // Procesar datos horarios
        const datosHorariosPorDia = this.procesarDatosHorariosPorDia(data, offsetAPISegundos);

        // Tomar 7 días
        for (let i = 0; i < 7 && i < data.daily.time.length; i++) {


            const sunrise = data.daily.sunrise?.[i]
                ? new Date(data.daily.sunrise[i])
                : undefined;

            const sunset = data.daily.sunset?.[i]
                ? new Date(data.daily.sunset[i])
                : undefined;




            // La fecha de la API viene en la zona horaria especificada
            const fechaStr = data.daily.time[i]; // "2026-01-31"
            const fecha = new Date(fechaStr + 'T12:00:00'); // Mediodía en la zona horaria local

            const codigo = data.daily.weathercode[i];

            // Obtener datos horarios para este día
            let datosHorariosDia: HourlyData[] = [];
            if (datosHorariosPorDia[i]) {
                datosHorariosDia = datosHorariosPorDia[i];
            }

            pronostico.push({
                fecha: fecha,
                diaSemana: this.getDiaSemana(fecha),
                fechaCorta: this.getFechaCorta(fecha),
                tempMax: Math.round(data.daily.temperature_2m_max[i]),
                tempMin: Math.round(data.daily.temperature_2m_min[i]),
                precipitacion: data.daily.precipitation_sum ?
                    Math.round(data.daily.precipitation_sum[i] * 10) / 10 : 0,
                codigoClima: codigo,
                descripcionClima: this.getDescripcionClima(codigo),
                icono: this.getIconoClima(codigo),
                sunrise: sunrise,
                sunset: sunset,
                datosHorarios: datosHorariosDia
            });
        }

        return pronostico;
    }

    private procesarDatosHorariosPorDia(data: any, offsetAPISegundos: number): HourlyData[][] {
        const datosPorDia: HourlyData[][] = [];

        if (!data.hourly || !data.hourly.time) {
            return datosPorDia;
        }

        console.log('=== PROCESANDO DATOS HORARIOS ===');
        console.log('Total registros horarios:', data.hourly.time.length);
        console.log('Primeros 5 registros:');
        for (let i = 0; i < Math.min(5, data.hourly.time.length); i++) {
            console.log(`  ${i}: ${data.hourly.time[i]} => UTC: ${new Date(data.hourly.time[i]).toISOString()}`);
        }

        // Mapa para agrupar por día
        const datosPorDiaMap = new Map<string, HourlyData[]>();

        for (let i = 0; i < data.hourly.time.length; i++) {
            // La API devuelve en la zona horaria especificada (auto)
            const fechaHoraStr = data.hourly.time[i]; // "2026-01-31T00:00"
            const fechaHoraLocal = new Date(fechaHoraStr);

            // Convertir a UTC para cálculos consistentes
            const fechaHoraUTC = new Date(fechaHoraLocal.getTime() - (offsetAPISegundos * 1000));

            // Convertir a Argentina (UTC-3)
            const fechaHoraArgentina = new Date(fechaHoraUTC.getTime() + this.offsetArgentina);

            // Obtener la fecha en Argentina para agrupar
            const fechaKey = fechaHoraArgentina.getFullYear() + '-' +
                (fechaHoraArgentina.getMonth() + 1).toString().padStart(2, '0') + '-' +
                fechaHoraArgentina.getDate().toString().padStart(2, '0');

            // Crear objeto de datos horarios
            const hourlyData: HourlyData = {
                hora: this.formatearHora(fechaHoraArgentina),
                horaUTC: this.formatearHora(fechaHoraUTC),
                temperatura: Math.round(data.hourly.temperature_2m[i] * 10) / 10,
                precipitacion: Math.round(data.hourly.precipitation[i] * 10) / 10,
                humedad: Math.round(data.hourly.relativehumidity_2m[i]),
                vientoVelocidad: Math.round(data.hourly.windspeed_10m[i] * 10) / 10,
                vientoDireccion: Math.round(data.hourly.winddirection_10m[i]),
                codigoClima: data.hourly.weathercode[i],
                descripcionClima: this.getDescripcionClima(data.hourly.weathercode[i]),
                icono: this.getIconoClima(data.hourly.weathercode[i]),
                fechaHoraArgentina: fechaHoraArgentina,
                fechaHoraUTC: fechaHoraUTC
            };

            // DEBUG las primeras horas
            if (i < 3) {
                console.log(`Hora ${i}:`, {
                    original: fechaHoraStr,
                    local: fechaHoraLocal.toISOString(),
                    UTC: fechaHoraUTC.toISOString(),
                    ARG: fechaHoraArgentina.toISOString(),
                    horaArgentina: hourlyData.hora,
                    fechaKey: fechaKey
                });
            }

            // Agregar al mapa por día
            if (!datosPorDiaMap.has(fechaKey)) {
                datosPorDiaMap.set(fechaKey, []);
            }
            datosPorDiaMap.get(fechaKey)!.push(hourlyData);
        }

        // Ordenar las fechas y convertir a array
        const fechasOrdenadas = Array.from(datosPorDiaMap.keys()).sort();

        console.log('Días encontrados:', fechasOrdenadas.length);
        fechasOrdenadas.forEach((fechaKey, index) => {
            const horasDelDia = datosPorDiaMap.get(fechaKey)!;
            console.log(`Día ${index} (${fechaKey}): ${horasDelDia.length} horas`);
            if (horasDelDia.length > 0) {
                console.log(`  Primera hora: ${horasDelDia[0].hora} (UTC: ${horasDelDia[0].horaUTC})`);
                console.log(`  Última hora: ${horasDelDia[horasDelDia.length - 1].hora} (UTC: ${horasDelDia[horasDelDia.length - 1].horaUTC})`);
            }
            datosPorDia.push(horasDelDia);
        });

        return datosPorDia;
    }

    // MÉTODO CORREGIDO - Mostrar todas las horas pero encontrar la actual
    getHorasConIndiceActual(datosHorarios: HourlyData[], esHoy: boolean): { horas: HourlyData[], indiceActual: number } {
        if (!datosHorarios || datosHorarios.length === 0) {
            return { horas: [], indiceActual: -1 };
        }

        const ahora = new Date();
        console.log('=== FILTRANDO HORAS ===');
        console.log('Hora actual (local):', ahora.toISOString());
        console.log('Hora actual (locale AR):', ahora.toLocaleString('es-AR'));
        console.log('Total horas disponibles:', datosHorarios.length);

        // Si NO es hoy, devolver todas las horas sin índice actual
        if (!esHoy) {
            console.log('No es hoy, devolviendo todas las horas');
            return {
                horas: datosHorarios,
                indiceActual: -1
            };
        }

        // Si ES hoy, encontrar la hora más cercana a la actual
        let indiceMasCercano = -1;
        let diferenciaMinima = Infinity;

        datosHorarios.forEach((horaData, index) => {
            const diferencia = Math.abs(horaData.fechaHoraArgentina.getTime() - ahora.getTime());

            // DEBUG las primeras horas
            if (index < 3) {
                console.log(`Hora ${index} (${horaData.hora}):`, {
                    fechaARG: horaData.fechaHoraArgentina.toISOString(),
                    diferenciaMin: Math.round(diferencia / 60000),
                    ahora: ahora.toISOString()
                });
            }

            if (diferencia < diferenciaMinima) {
                diferenciaMinima = diferencia;
                indiceMasCercano = index;
            }
        });

        console.log('Índice de hora actual encontrado:', indiceMasCercano);
        if (indiceMasCercano >= 0) {
            console.log('Hora en ese índice:', datosHorarios[indiceMasCercano].hora);
            console.log('Fecha en ese índice:', datosHorarios[indiceMasCercano].fechaHoraArgentina.toISOString());
        }

        return {
            horas: datosHorarios,
            indiceActual: indiceMasCercano
        };
    }

    // Método alternativo: mostrar horas desde ahora en adelante (si quedan)
    getHorasDesdeAhora(datosHorarios: HourlyData[]): HourlyData[] {
        const ahora = new Date();
        console.log('Filtrando horas desde ahora:', ahora.toISOString());

        const horasFiltradas = datosHorarios.filter(horaData => {
            return horaData.fechaHoraArgentina >= ahora;
        });

        console.log('Horas después de filtrar:', horasFiltradas.length);

        // Si no hay horas futuras, devolver las últimas 24
        if (horasFiltradas.length === 0 && datosHorarios.length > 0) {
            console.log('No hay horas futuras, mostrando últimas 24 horas');
            return datosHorarios.slice(-24);
        }

        return horasFiltradas;
    }

    private formatearHora(fecha: Date): string {
        return fecha.getHours().toString().padStart(2, '0') + ':' +
            fecha.getMinutes().toString().padStart(2, '0');
    }

    private getDiaSemana(fecha: Date): string {
        const dias = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'];
        return dias[fecha.getDay()];
    }

    private getFechaCorta(fecha: Date): string {
        const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        return `${fecha.getDate()} ${meses[fecha.getMonth()]}`;
    }

    private getDescripcionClima(codigo: number): string {
        const descripciones: { [key: number]: string } = {
            0: 'Cielo despejado',
            1: 'Mayormente despejado',
            2: 'Parcialmente nublado',
            3: 'Nublado',
            45: 'Niebla',
            48: 'Niebla con escarcha',
            51: 'Llovizna ligera',
            53: 'Llovizna moderada',
            55: 'Llovizna densa',
            61: 'Lluvia ligera',
            63: 'Lluvia moderada',
            65: 'Lluvia fuerte',
            71: 'Nieve ligera',
            73: 'Nieve moderada',
            75: 'Nieve fuerte',
            77: 'Granizo',
            80: 'Chubascos ligeros',
            81: 'Chubascos moderados',
            82: 'Chubascos fuertes',
            85: 'Chubascos de nieve',
            86: 'Chubascos de nieve fuertes',
            95: 'Tormenta',
            96: 'Tormenta con granizo',
            99: 'Tormenta con granizo fuerte'
        };

        return descripciones[codigo] || 'Condiciones variables';
    }

    private getIconoClima(codigo: number): string {
        const iconos: { [key: number]: string } = {
            0: '☀️',
            1: '🌤️',
            2: '⛅',
            3: '☁️',
            45: '🌫️',
            48: '🌫️',
            51: '🌦️',
            53: '🌦️',
            55: '🌦️',
            61: '🌧️',
            63: '🌧️',
            65: '🌧️',
            71: '🌨️',
            73: '🌨️',
            75: '🌨️',
            77: '🌨️',
            80: '🌦️',
            81: '🌦️',
            82: '🌦️',
            85: '🌨️',
            86: '🌨️',
            95: '⛈️',
            96: '⛈️',
            99: '⛈️'
        };

        return iconos[codigo] || '☁️';
    }

    private async geocodificarInversa(lat: number, lon: number): Promise<string> {
        try {
            const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10`;

            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'TuAppMeteorologica/1.0' // Nombre de tu app
                }
            });

            const data = await response.json();

            // Construir nombre de ubicación basado en lo que devuelva Nominatim
            if (data.address) {
                const address = data.address;

                // Prioridad de nombres: ciudad > pueblo > municipio > estado > país
                if (address.city) return `${address.city}, ${address.state || address.country}`;
                if (address.town) return `${address.town}, ${address.state || address.country}`;
                if (address.village) return `${address.village}, ${address.state || address.country}`;
                if (address.municipality) return `${address.municipality}, ${address.state || address.country}`;
                if (address.county) return `${address.county}, ${address.state || address.country}`;
                if (address.state) return `${address.state}, ${address.country}`;

                return address.country || 'Ubicación desconocida';
            }

            return 'Ubicación desconocida';
        } catch (error) {
            console.error('Error en geocodificación:', error);
            return `Lat: ${lat.toFixed(4)}, Lon: ${lon.toFixed(4)}`; // Fallback a coordenadas
        }
    }
}
