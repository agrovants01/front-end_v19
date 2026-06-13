import { Directive, ElementRef, HostListener, Optional, Renderer2, Self } from '@angular/core';
import { NgControl } from '@angular/forms';

@Directive({
    standalone: false,
    selector: '[appFormatNumber]'
})
export class FormatNumberDirective {
    constructor(
        private el: ElementRef,
        private renderer: Renderer2,
        @Self() @Optional() private control: NgControl
    ) {}

    @HostListener('focus') onFocus(): void {
        if (!this.control) return;
        const raw = this.control.value;
        if (raw !== null && raw !== undefined) {
            this.renderer.setProperty(this.el.nativeElement, 'value', raw);
        }
    }

    @HostListener('blur') onBlur(): void {
        if (!this.control) return;
        const raw = this.control.value;
        if (raw !== null && raw !== undefined && raw !== '') {
            const num = parseFloat(raw);
            if (!isNaN(num)) {
                const formatted = num.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                this.renderer.setProperty(this.el.nativeElement, 'value', formatted);
            }
        }
    }
}
