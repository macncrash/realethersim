import { LitElement, html, type TemplateResult } from 'lit';
import { bootstrap } from '../../app/bootstrap';
import './archetype-switcher';
import './params-panel';
import './hierarchy-tree';
import './telemetry-panel';
import './snapshot-controls';

// Renders into light DOM (createRenderRoot -> this) so the global stylesheet and Tweakpane's
// injected styles apply, and so the canvas lives in the normal document for the renderer.
export class AetherApp extends LitElement {
  protected override createRenderRoot(): HTMLElement {
    return this;
  }

  override firstUpdated(): void {
    const canvas = this.querySelector('canvas.view') as HTMLCanvasElement | null;
    if (!canvas) return;
    void bootstrap(canvas).catch((err: unknown) => {
      console.error('[aether] bootstrap failed', err);
      const banner = document.createElement('div');
      banner.style.cssText =
        'position:fixed;inset:0;display:grid;place-items:center;padding:24px;text-align:center;color:#ff6b6b';
      banner.textContent = 'AETHER-SIM failed to start: ' + ((err as Error)?.message ?? String(err));
      document.body.appendChild(banner);
    });
  }

  override render(): TemplateResult {
    return html`
      <div class="layout">
        <canvas class="view"></canvas>
        <aside class="panel">
          <h1 class="brand">AETHER·SIM</h1>
          <aether-archetype-switcher></aether-archetype-switcher>
          <aether-params-panel></aether-params-panel>
          <aether-hierarchy-tree></aether-hierarchy-tree>
          <aether-telemetry-panel></aether-telemetry-panel>
          <aether-snapshot-controls></aether-snapshot-controls>
        </aside>
      </div>
    `;
  }
}

customElements.define('aether-app', AetherApp);
