import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
    standalone: false,
    name: 'numberSeparator'
})
export class NumberSeparatorPipe implements PipeTransform {
    transform(value: number | string | null | undefined): string {
        if (value === null || value === undefined || value === '') return '';
        const num = typeof value === 'string' ? parseFloat(value) : value;
        if (isNaN(num)) return '';
        return `$ ${num.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
}
