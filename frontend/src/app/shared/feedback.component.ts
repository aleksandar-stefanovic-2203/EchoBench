import { Component, input } from '@angular/core';
import type { Failure } from '../core/models';
@Component({ selector: 'app-feedback', template: `@if (error(); as e) { <div class="notice error" role="alert"><strong>{{e.message}}</strong>@for (field of fields(); track field[0]) { <p>{{field[1]}}</p> }</div> } @if (message()) { <div class="notice" role="status">{{message()}}</div> }` })
export class FeedbackComponent {
  error = input<Failure | null>(null); message = input('');
  fields() { return Object.entries(this.error()?.fields ?? {}); }
}
