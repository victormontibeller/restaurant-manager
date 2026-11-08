// Adaptado de spartan-ng/helm button (MIT, Robin Goetz). Tema local em styles.css.
import { Directive, input } from '@angular/core';
import { BrnButton } from '@spartan-ng/brain/button';

@Directive({
  selector: 'button[hlmBtn], a[hlmBtn]',
  exportAs: 'hlmBtn',
  hostDirectives: [{ directive: BrnButton, inputs: ['disabled'] }],
  host: {
    class: 'spartan-button',
    'data-slot': 'button',
    '[attr.data-variant]': 'variant()',
    '[attr.data-size]': 'size()',
  },
})
export class HlmButton {
  readonly variant = input<'default' | 'secondary' | 'outline' | 'ghost' | 'destructive'>(
    'default',
  );
  readonly size = input<'default' | 'sm' | 'lg' | 'icon'>('default');
}
