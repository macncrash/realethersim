import { LitElement, html, type TemplateResult } from 'lit';
import { StoreController } from '@nanostores/lit';
import { $telemetry } from '../store';

// Real-time telemetry (FR-3 telemetry panel). Re-renders only when $telemetry changes
// (~4 Hz), so it never competes with the 60fps render loop.
export class TelemetryPanel extends LitElement {
  protected override createRenderRoot(): HTMLElement {
    return this;
  }

  private telemetry = new StoreController(this, $telemetry);

  override render(): TemplateResult {
    const t = this.telemetry.value;
    const lle = Number.isNaN(t.lle) ? '—' : t.lle.toFixed(4);
    return html`
      <div class="section">
        <h4>Telemetry</h4>
        <div class="row"><span>fps</span><span class="v">${t.fps.toFixed(0)}</span></div>
        <div class="row"><span>particles</span><span class="v">${t.particles.toLocaleString()}</span></div>
        <div class="row"><span>substeps / frame</span><span class="v">${t.substeps}</span></div>
        <div class="row"><span>backend</span><span class="v">${t.backend}</span></div>
        <div class="row"><span>largest Lyapunov</span><span class="v">${lle}</span></div>
      </div>
    `;
  }
}

customElements.define('aether-telemetry-panel', TelemetryPanel);
