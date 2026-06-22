import { LitElement, html, type TemplateResult } from 'lit';
import { bootstrap } from '../../app/bootstrap';
import './archetype-switcher';
import './params-panel';
import './hierarchy-tree';
import './telemetry-panel';
import './snapshot-controls';
import './learn-panel';

// Renders into light DOM (createRenderRoot -> this) so the global stylesheet and Tweakpane's
// injected styles apply, and so the canvas lives in the normal document for the renderer.
export class EtherApp extends LitElement {
  protected override createRenderRoot(): HTMLElement {
    return this;
  }

  override firstUpdated(): void {
    const canvas = this.querySelector('canvas.view') as HTMLCanvasElement | null;
    if (!canvas) return;
    void bootstrap(canvas).catch((err: unknown) => {
      console.error('[ethersim] bootstrap failed', err);
      const banner = document.createElement('div');
      banner.style.cssText =
        'position:fixed;inset:0;display:grid;place-items:center;padding:24px;text-align:center;color:#ff6b6b';
      banner.textContent = 'ETHERSIM failed to start: ' + ((err as Error)?.message ?? String(err));
      document.body.appendChild(banner);
    });
  }

  override render(): TemplateResult {
    return html`
      <div class="layout">
        <canvas class="view"></canvas>
        <aside class="panel">
          <h1 class="brand">ETHERSIM</h1>
          <ether-archetype-switcher></ether-archetype-switcher>
          <ether-params-panel></ether-params-panel>
          <ether-hierarchy-tree></ether-hierarchy-tree>
          <ether-telemetry-panel></ether-telemetry-panel>
          <ether-snapshot-controls></ether-snapshot-controls>
        </aside>
        <ether-learn-panel></ether-learn-panel>
      </div>
    `;
  }
}

customElements.define('ether-app', EtherApp);
