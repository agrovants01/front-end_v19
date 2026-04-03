import { Component, Input, Output, EventEmitter, AfterViewInit, OnDestroy, ViewChild, ElementRef, OnInit } from '@angular/core';
import * as L from 'leaflet';
import { WeatherService, ForecastDay, HourlyData } from '../../../services/weather.service';
import { Chart, ChartConfiguration, registerables } from 'chart.js';

// Registrar todos los componentes de Chart.js
Chart.register(...registerables);

@Component({
  standalone: false,
    selector: 'app-weather-forecast',
    templateUrl: './weather-forecast.component.html',
    styleUrls: ['./weather-forecast.component.css']
})
export class WeatherForecastComponent implements OnInit, OnDestroy {
    @ViewChild('sunCanvas', { static: false })
    sunCanvas?: ElementRef<HTMLCanvasElement>;

    @Input() map!: L.Map;
    @Output() close = new EventEmitter<void>();

    sunPath = '';
    solX = 0;
    solY = 0;
    esDeDia = true;

    pronostico: ForecastDay[] = [];
    cargando: boolean = false;
    error: string = '';
    ubicacionActual: string = 'Cargando ubicación...';

    // Propiedades para el detalle horario
    diaSeleccionado: ForecastDay | null = null;
    datosHorarios: HourlyData[] = [];
    mostrarDetalleHorario: boolean = false;
    mostrarMensajeDiaPasado: boolean = false;
    indiceHoraActual: number = -1;

    // Gráfico Chart.js
    chart: Chart | null = null;

    constructor(private weatherService: WeatherService) { }




    ngOnInit(): void {
        this.cargarPronostico();
    }

    ngOnDestroy(): void {
        // Limpiar el gráfico al destruir el componente
        this.destruirGrafico();
    }

    async cargarPronostico(): Promise<void> {
        this.cargando = true;
        this.error = '';
        this.diaSeleccionado = null;
        this.mostrarDetalleHorario = false;
        this.datosHorarios = [];
        this.destruirGrafico();

        const centro = this.map.getCenter();

        // Mostrar coordenadas mientras carga
        this.ubicacionActual = `Cargando ubicación...`;

        // Obtener pronóstico y ubicación en paralelo
        try {
            // Llamada al pronóstico
            const pronosticoObservable = this.weatherService.getPronostico7Dias(centro.lat, centro.lng);

            // Llamada a geocodificación
            const nombreUbicacionPromise = this.weatherService.obtenerNombreUbicacion(centro.lat, centro.lng);

            // Combinar ambas promesas
            const [_, nombreUbicacion] = await Promise.all([
                pronosticoObservable.toPromise().then(data => {
                    this.pronostico = data;
                }),
                nombreUbicacionPromise
            ]);

            this.ubicacionActual = nombreUbicacion;
            this.cargando = false;

        } catch (error) {
            console.error('Error cargando pronóstico:', error);

            if (error instanceof Error) {
                this.error = error.message;
            } else {
                this.error = 'Error al cargar el pronóstico';
            }

            // Fallback a coordenadas
            const centro = this.map.getCenter();
            this.ubicacionActual = `${centro.lat.toFixed(4)}, ${centro.lng.toFixed(4)}`;
            this.cargando = false;
        }
    }

    seleccionarDia(dia: ForecastDay): void {
        this.diaSeleccionado = dia;
        this.mostrarDetalleHorario = true;



        if (dia.datosHorarios && dia.datosHorarios.length > 0) {
            // Verificar si es hoy
            const esHoy = this.esDiaHoy(dia.fecha);

            // Usar el nuevo método del servicio
            const resultado = this.weatherService.getHorasConIndiceActual(dia.datosHorarios, esHoy);

            this.datosHorarios = resultado.horas;
            this.indiceHoraActual = resultado.indiceActual;
            //this.mostrarDetalleHorario = true;
            this.mostrarMensajeDiaPasado = !esHoy;

            setTimeout(() => {
                this.crearGraficoHorario();
            }, 100);
        } else {
            console.warn('No hay datos horarios para este día');
            this.error = 'No hay datos horarios disponibles para este día';
            setTimeout(() => {
                this.error = '';
            }, 3000);
        }
    }

    getHoraActualArgentina(): string {
        const ahora = new Date();
        return ahora.toLocaleTimeString('es-AR', {
            timeZone: 'America/Argentina/Buenos_Aires',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });
    }

    getFechaActualArgentina(): string {
        const ahora = new Date();
        return ahora.toLocaleDateString('es-AR', {
            timeZone: 'America/Argentina/Buenos_Aires',
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    // Método para verificar si es hoy
    esDiaHoy(fecha: Date): boolean {
        const hoy = new Date();
        return fecha.getDate() === hoy.getDate() &&
            fecha.getMonth() === hoy.getMonth() &&
            fecha.getFullYear() === hoy.getFullYear();
    }

    cerrarDetalleHorario(): void {
        this.diaSeleccionado = null;
        this.mostrarDetalleHorario = false;
        this.mostrarMensajeDiaPasado = false;
        this.datosHorarios = [];
        this.indiceHoraActual = -1;
        this.destruirGrafico();
    }

    crearGraficoHorario(): void {
        // Destruir gráfico anterior si existe
        this.destruirGrafico();

        const canvas = document.getElementById('grafico-temperatura') as HTMLCanvasElement;
        if (!canvas || this.datosHorarios.length === 0) {
            console.warn('No se puede crear el gráfico: canvas no encontrado o sin datos');
            return;
        }

        // Preparar datos para el gráfico
        const labels = this.datosHorarios.map(h => h.hora);
        const temperaturas = this.datosHorarios.map(h => h.temperatura);
        const precipitaciones = this.datosHorarios.map(h => h.precipitacion);

        // DATOS DE VIENTO - Convertir m/s a km/h para mejor visualización
        const velocidadesViento = this.datosHorarios.map(h => Math.round(h.vientoVelocidad * 3.6 * 10) / 10);

        // Configuración del gráfico - TIPO EXPLÍCITO
        const config: ChartConfiguration<'line'> = {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Temperatura (°C)',
                        data: temperaturas,
                        borderColor: '#ff4444',
                        backgroundColor: 'rgba(255, 68, 68, 0.1)',
                        borderWidth: 3,
                        fill: true,
                        tension: 0.4,
                        yAxisID: 'y',
                        pointBackgroundColor: '#ff4444',
                        pointBorderColor: '#ffffff',
                        pointBorderWidth: 2,
                        pointRadius: 4,
                        pointHoverRadius: 6
                    },
                    {
                        label: 'Precipitación (mm)',
                        data: precipitaciones,
                        borderColor: '#4fc3f7',
                        backgroundColor: 'rgba(79, 195, 247, 0.1)',
                        borderWidth: 2,
                        fill: true,
                        tension: 0.4,
                        yAxisID: 'y1',
                        pointBackgroundColor: '#4fc3f7',
                        pointBorderColor: '#ffffff',
                        pointBorderWidth: 2,
                        pointRadius: 3,
                        pointHoverRadius: 5
                    },
                    {
                        label: 'Viento (km/h)',
                        data: velocidadesViento,
                        borderColor: '#9c27b0',
                        backgroundColor: 'rgba(156, 39, 176, 0.1)',
                        borderWidth: 2,
                        fill: false,
                        tension: 0.4,
                        yAxisID: 'y2',
                        pointBackgroundColor: '#9c27b0',
                        pointBorderColor: '#ffffff',
                        pointBorderWidth: 2,
                        pointRadius: 3,
                        pointHoverRadius: 5,
                        borderDash: [5, 5]
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                layout: {
                    padding: {
                        top: 40, // Más espacio arriba para la etiqueta de hora
                        bottom: 10,
                        left: 15,
                        right: 15
                    }
                },
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            color: 'rgba(255, 255, 255, 0.8)',
                            font: {
                                size: 11
                            },
                            padding: 10,
                            boxWidth: 12,
                            usePointStyle: true
                        }
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        callbacks: {
                            label: function (context) {
                                let label = context.dataset.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                if (context.parsed.y !== null) {
                                    if (context.datasetIndex === 0) {
                                        label += context.parsed.y + '°C';
                                    } else if (context.datasetIndex === 1) {
                                        label += context.parsed.y + ' mm';
                                    } else if (context.datasetIndex === 2) {
                                        label += context.parsed.y + ' km/h';
                                    }
                                }
                                return label;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: {
                            color: 'rgba(255, 255, 255, 0.05)',
                        },
                        ticks: {
                            color: 'rgba(255, 255, 255, 0.6)',
                            font: {
                                size: 10
                            },
                            maxRotation: 45,
                            minRotation: 45,
                            padding: 3
                        },
                        border: {
                            display: false
                        }
                    },
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        grid: {
                            color: 'rgba(255, 255, 255, 0.05)',
                        },
                        ticks: {
                            color: '#ff4444',
                            font: {
                                size: 10
                            },
                            padding: 5,
                            callback: function (value) {
                                if (typeof value === 'number') {
                                    return value + '°C';
                                }
                                return value;
                            }
                        },
                        title: {
                            display: false,
                        },
                        border: {
                            display: false
                        }
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        grid: {
                            drawOnChartArea: false,
                        },
                        ticks: {
                            color: '#4fc3f7',
                            font: {
                                size: 10
                            },
                            padding: 5,
                            callback: function (value) {
                                if (typeof value === 'number') {
                                    return value + ' mm';
                                }
                                return value;
                            }
                        },
                        title: {
                            display: false,
                        },
                        border: {
                            display: false
                        }
                    },
                    y2: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        grid: {
                            drawOnChartArea: false,
                        },
                        ticks: {
                            color: '#9c27b0',
                            font: {
                                size: 10
                            },
                            padding: 5,
                            callback: function (value) {
                                if (typeof value === 'number') {
                                    return value + ' km/h';
                                }
                                return value;
                            }
                        },
                        title: {
                            display: false,
                        },
                        border: {
                            display: false
                        }
                    }
                },
                animation: {
                    duration: 500,
                    easing: 'easeOutQuart',
                    onComplete: () => {
                        // Solo dibujar línea de hora actual después de que la animación termine
                        if (this.esDiaSeleccionadoHoy() && !this.mostrarMensajeDiaPasado) {
                            this.calcularYAgregarLineaHoraExacta();
                        }
                    }
                }
            }
        };

        try {
            this.chart = new Chart(canvas, config);
        } catch (error) {
            console.error('Error al crear el gráfico:', error);
        }
    }

    private calcularYAgregarLineaHoraExacta(): void {
        if (!this.chart) return;

        console.log('=== CALCULANDO POSICIÓN EXACTA DE HORA ACTUAL ===');

        // Obtener la hora actual exacta
        const ahora = new Date();
        const horaActualArgentina = this.getHoraActualArgentina();

        // Parsear hora y minutos actuales
        const [horaActualStr, minutosActualStr] = horaActualArgentina.split(':');
        const horaActual = parseInt(horaActualStr, 10);
        const minutosActual = parseInt(minutosActualStr, 10);

        // Convertir a fracción de hora con precisión (ej: 18:09 = 18.15)
        const horaActualFraccion = horaActual + (minutosActual / 60);

        console.log(`Hora actual: ${horaActualArgentina} (${horaActualFraccion.toFixed(2)} en fracción)`);

        // Si no hay datos horarios, salir
        if (this.datosHorarios.length === 0) {
            console.warn('No hay datos horarios disponibles');
            return;
        }

        // Calcular la posición exacta considerando el rango de horas disponibles
        // Primero, convertir todas las horas del gráfico a fracciones
        const horasGrafico = this.datosHorarios.map((horaData, index) => {
            const [horaStr] = horaData.hora.split(':');
            const hora = parseInt(horaStr, 10);
            return {
                index,
                horaFraccion: hora,
                horaString: horaData.hora
            };
        });

        // Encontrar las dos horas más cercanas
        let horaAnterior = horasGrafico[0];
        let horaSiguiente = horasGrafico[horasGrafico.length - 1];

        for (const hora of horasGrafico) {
            if (hora.horaFraccion <= horaActualFraccion &&
                hora.horaFraccion >= horaAnterior.horaFraccion) {
                horaAnterior = hora;
            }
            if (hora.horaFraccion >= horaActualFraccion &&
                hora.horaFraccion <= horaSiguiente.horaFraccion) {
                horaSiguiente = hora;
            }
        }

        console.log(`Hora anterior: ${horaAnterior.horaString} (índice ${horaAnterior.index})`);
        console.log(`Hora siguiente: ${horaSiguiente.horaString} (índice ${horaSiguiente.index})`);

        // Calcular la posición exacta
        let posicionExacta = horaAnterior.index;

        if (horaAnterior.index !== horaSiguiente.index) {
            // Calcular el progreso entre las dos horas
            const intervaloHoras = horaSiguiente.horaFraccion - horaAnterior.horaFraccion;
            const progreso = (horaActualFraccion - horaAnterior.horaFraccion) / intervaloHoras;

            posicionExacta = horaAnterior.index + progreso;

            console.log(`Progreso entre horas: ${progreso.toFixed(3)} (${(progreso * 100).toFixed(1)}%)`);
        } else {
            console.log('La hora actual coincide exactamente con una hora del gráfico');
        }

        console.log(`Posición final en gráfico: ${posicionExacta.toFixed(2)}`);

        // Calcular posición en píxeles
        const xScale = this.chart.scales['x'];
        if (!xScale) {
            console.warn('No se encontró la escala X del gráfico');
            return;
        }

        const pixelPosition = xScale.getPixelForValue(posicionExacta);
        console.log(`Posición en píxeles: ${pixelPosition}`);

        // Dibujar la línea en el canvas
        this.dibujarLineaHoraExactaEnCanvas(pixelPosition, horaActualArgentina);
    }

    private dibujarLineaHoraExactaEnCanvas(xPos: number, horaActual: string): void {
        if (!this.chart) return;

        const chartArea = this.chart.chartArea;
        if (!chartArea) return;

        const ctx = this.chart.ctx;

        // Guardar el estado actual del contexto
        ctx.save();

        // === LÍNEA VERTICAL SÓLIDA CON DEGRADADO ===
        // Crear un gradiente vertical para la línea
        const gradient = ctx.createLinearGradient(xPos, chartArea.top, xPos, chartArea.bottom);
        gradient.addColorStop(0, '#ffc107');      // Amarillo brillante arriba
        gradient.addColorStop(0.7, '#ffc107');    // Amarillo en el medio
        gradient.addColorStop(1, 'rgba(255, 193, 7, 0.3)'); // Más transparente abajo

        // Línea principal
        ctx.beginPath();
        ctx.moveTo(xPos, chartArea.top);
        ctx.lineTo(xPos, chartArea.bottom);
        ctx.lineWidth = 2;
        ctx.strokeStyle = gradient;
        ctx.setLineDash([]); // Línea sólida, no punteada
        ctx.stroke();

        // Efecto de sombra/brillo alrededor de la línea
        ctx.beginPath();
        ctx.moveTo(xPos - 1, chartArea.top);
        ctx.lineTo(xPos - 1, chartArea.bottom);
        ctx.lineWidth = 4;
        ctx.strokeStyle = 'rgba(255, 193, 7, 0.1)';
        ctx.stroke();

        // === ETIQUETA EN LA PARTE SUPERIOR ===
        const labelHeight = 20;
        const labelWidth = 50; // Un poco más ancho para mejor visualización
        const labelY = chartArea.top - labelHeight - 8; // Más arriba
        const borderRadius = 4;

        // Fondo de la etiqueta (rectángulo redondeado manual)
        this.dibujarRectanguloRedondeado(ctx,
            xPos - labelWidth / 2,
            labelY,
            labelWidth,
            labelHeight,
            borderRadius);

        ctx.fillStyle = 'rgba(255, 193, 7, 0.95)';
        ctx.fill();

        // Borde de la etiqueta
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.25)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Texto de la hora
        ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Nunito, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#000';
        ctx.fillText(horaActual, xPos, labelY + labelHeight / 2);

        // Pequeña sombra debajo de la etiqueta
        ctx.beginPath();
        ctx.moveTo(xPos - labelWidth / 2 + 2, labelY + labelHeight);
        ctx.lineTo(xPos + labelWidth / 2 - 2, labelY + labelHeight);
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
        ctx.stroke();

        // Triángulo/punta debajo de la etiqueta
        ctx.beginPath();
        ctx.moveTo(xPos - 5, chartArea.top);
        ctx.lineTo(xPos + 5, chartArea.top);
        ctx.lineTo(xPos, chartArea.top - 4);
        ctx.closePath();
        ctx.fillStyle = 'rgba(255, 193, 7, 0.95)';
        ctx.fill();

        // Borde del triángulo
        ctx.beginPath();
        ctx.moveTo(xPos - 5, chartArea.top);
        ctx.lineTo(xPos + 5, chartArea.top);
        ctx.lineTo(xPos, chartArea.top - 4);
        ctx.closePath();
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)';
        ctx.lineWidth = 0.5;
        ctx.stroke();

        // === CÍRCULO EN LA LÍNEA (EN EL DATASET DE TEMPERATURA) ===
        const xScale = this.chart.scales['x'];
        if (xScale) {
            const labels = this.chart.data.labels || [];
            let indiceMasCercano = 0;
            let minDistancia = Infinity;

            labels.forEach((label, index) => {
                const pixelPos = xScale.getPixelForValue(index);
                const distancia = Math.abs(pixelPos - xPos);
                if (distancia < minDistancia) {
                    minDistancia = distancia;
                    indiceMasCercano = index;
                }
            });

            // Dibujar círculo en el dataset de temperatura (índice 0)
            const datasetIndex = 0;
            const meta = this.chart.getDatasetMeta(datasetIndex);

            if (meta.data && meta.data[indiceMasCercano]) {
                const punto = meta.data[indiceMasCercano];
                const yPos = punto.y;

                // Círculo con efecto de brillo/halo
                ctx.beginPath();
                ctx.arc(xPos, yPos, 10, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(255, 193, 7, 0.2)';
                ctx.fill();

                // Círculo principal
                ctx.beginPath();
                ctx.arc(xPos, yPos, 6, 0, Math.PI * 2);
                ctx.fillStyle = '#ffc107';
                ctx.fill();

                // Borde blanco
                ctx.beginPath();
                ctx.arc(xPos, yPos, 6, 0, Math.PI * 2);
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 2;
                ctx.stroke();

                // Punto central más brillante
                ctx.beginPath();
                ctx.arc(xPos, yPos, 2, 0, Math.PI * 2);
                ctx.fillStyle = '#ffffff';
                ctx.fill();
            }
        }

        // Restaurar el estado del contexto
        ctx.restore();

        console.log(`Línea dibujada en x=${xPos} para hora ${horaActual}`);
    }

    // Método auxiliar para dibujar rectángulos redondeados
    private dibujarRectanguloRedondeado(
        ctx: CanvasRenderingContext2D,
        x: number,
        y: number,
        width: number,
        height: number,
        radius: number
    ): void {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
    }








    destruirGrafico(): void {
        if (this.chart) {
            try {
                this.chart.destroy();
            } catch (error) {
                console.warn('Error al destruir el gráfico:', error);
            }
            this.chart = null;
        }
    }

    obtenerColorTemperatura(temp: number): string {
        if (temp >= 30) return '#ff4444';
        if (temp >= 25) return '#ff8844';
        if (temp >= 20) return '#ffaa44';
        if (temp >= 15) return '#ffcc44';
        if (temp >= 10) return '#44aaff';
        if (temp >= 5) return '#4488ff';
        return '#4444ff';
    }

    obtenerColorHumedad(humedad: number): string {
        if (humedad >= 80) return '#4fc3f7';
        if (humedad >= 60) return '#8bc34a';
        if (humedad >= 40) return '#ffcc44';
        if (humedad >= 20) return '#ff8844';
        return '#ff4444';
    }

    obtenerDireccionViento(grados: number): string {
        const gradosNormalizados = ((grados % 360) + 360) % 360;

        const direcciones = [
            'N', 'NNE', 'NE', 'ENE',
            'E', 'ESE', 'SE', 'SSE',
            'S', 'SSO', 'SO', 'OSO',
            'O', 'ONO', 'NO', 'NNO'
        ];

        const indice = Math.round(gradosNormalizados / 22.5) % 16;
        return direcciones[indice];
    }

    obtenerIconoViento(grados: number): string {
        const gradosNormalizados = ((grados % 360) + 360) % 360;

        if (gradosNormalizados >= 337.5 || gradosNormalizados < 22.5) return '⬆️';
        if (gradosNormalizados >= 22.5 && gradosNormalizados < 67.5) return '↗️';
        if (gradosNormalizados >= 67.5 && gradosNormalizados < 112.5) return '➡️';
        if (gradosNormalizados >= 112.5 && gradosNormalizados < 157.5) return '↘️';
        if (gradosNormalizados >= 157.5 && gradosNormalizados < 202.5) return '⬇️';
        if (gradosNormalizados >= 202.5 && gradosNormalizados < 247.5) return '↙️';
        if (gradosNormalizados >= 247.5 && gradosNormalizados < 292.5) return '⬅️';
        return '↖️';
    }

    formatearVelocidadViento(velocidad: number): string {
        // m/s a km/h (1 m/s = 3.6 km/h)
        const kmh = Math.round(velocidad * 3.6 * 10) / 10;
        return `${kmh} km/h`;
    }

    obtenerIntensidadLluvia(precipitacion: number): string {
        if (precipitacion === 0) return 'Sin lluvia';
        if (precipitacion < 0.5) return 'Lluvia muy ligera';
        if (precipitacion < 2.5) return 'Lluvia ligera';
        if (precipitacion < 7.5) return 'Lluvia moderada';
        if (precipitacion < 15) return 'Lluvia fuerte';
        return 'Lluvia muy fuerte';
    }

    obtenerColorPrecipitacion(precipitacion: number): string {
        if (precipitacion === 0) return '#8bc34a';
        if (precipitacion < 0.5) return '#4fc3f7';
        if (precipitacion < 2.5) return '#2196f3';
        if (precipitacion < 7.5) return '#1976d2';
        if (precipitacion < 15) return '#0d47a1';
        return '#311b92';
    }

    cerrar(): void {
        this.close.emit();
    }

    recargar(): void {
        this.cerrarDetalleHorario();
        this.cargarPronostico();
    }

    getIndiceDiaSeleccionado(): number {
        if (!this.diaSeleccionado) return -1;
        return this.pronostico.findIndex(dia =>
            dia.fecha.getDate() === this.diaSeleccionado!.fecha.getDate() &&
            dia.fecha.getMonth() === this.diaSeleccionado!.fecha.getMonth()
        );
    }

    cambiarDia(direccion: 'anterior' | 'siguiente'): void {
        if (!this.diaSeleccionado) return;

        const indiceActual = this.getIndiceDiaSeleccionado();
        if (indiceActual === -1) return;

        const nuevoIndice = direccion === 'anterior' ? indiceActual - 1 : indiceActual + 1;

        if (nuevoIndice >= 0 && nuevoIndice < this.pronostico.length) {
            this.seleccionarDia(this.pronostico[nuevoIndice]);
        }
    }

    hayDatosHorarios(): boolean {
        return this.datosHorarios && this.datosHorarios.length > 0;
    }

    getRangoHoras(): string {
        if (!this.hayDatosHorarios()) return 'No hay datos';

        const primeraHora = this.datosHorarios[0].hora;
        const ultimaHora = this.datosHorarios[this.datosHorarios.length - 1].hora;

        return `${primeraHora} - ${ultimaHora}`;
    }

    getTemperaturaPromedio(): number {
        if (!this.hayDatosHorarios()) return 0;

        const suma = this.datosHorarios.reduce((total, hora) => total + hora.temperatura, 0);
        return Math.round((suma / this.datosHorarios.length) * 10) / 10;
    }

    getPrecipitacionTotal(): number {
        if (!this.hayDatosHorarios()) return 0;

        const total = this.datosHorarios.reduce((suma, hora) => suma + hora.precipitacion, 0);
        return Math.round(total * 10) / 10;
    }

    // Método para ver si estamos viendo el día de hoy
    esDiaSeleccionadoHoy(): boolean {
        if (!this.diaSeleccionado) return false;
        return this.esDiaHoy(this.diaSeleccionado.fecha);
    }
}
