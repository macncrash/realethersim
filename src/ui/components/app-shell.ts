import { LitElement, html, type TemplateResult } from 'lit';
import { StoreController } from '@nanostores/lit';
import { bootstrap } from '../../app/bootstrap';
import { APP_VERSION } from '../../version';
import { $demoMode } from '../store';
import './archetype-switcher';
import './params-panel';
import './hierarchy-tree';
import './telemetry-panel';
import './snapshot-controls';
import './learn-panel';
import './command-palette';
import './code-viewer';
import './demo-details';

// Renders into light DOM (createRenderRoot -> this) so the global stylesheet and Tweakpane's
// injected styles apply, and so the canvas lives in the normal document for the renderer.
export class EtherApp extends LitElement {
  protected override createRenderRoot(): HTMLElement {
    return this;
  }

  // Demo mode goes full-screen: the control panel + learn box hide so the sim fills the view with
  // minimal distraction (exit via the badge or Esc — see command-palette).
  private demo = new StoreController(this, $demoMode);

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
    const hide = this.demo.value ? 'display:none' : '';
    return html`
      <div class="layout">
        <canvas class="view"></canvas>
        <aside class="panel" style=${hide}>
          <h1 class="brand" style="margin-bottom:6px">
            ETHERSIM <span style="font-size:.5em;font-weight:400;opacity:.45;letter-spacing:0">v${APP_VERSION}</span>
          </h1>
          <div style="display:flex;flex-wrap:wrap;gap:7px;margin:0 0 12px">
            <button
              title="Search all systems (⌘K)"
              @click=${() => window.dispatchEvent(new CustomEvent('ethersim:palette'))}
              style="font:inherit;font-size:11px;letter-spacing:.04em;color:#9fd;background:#10303c;border:1px solid #244;border-radius:6px;padding:4px 10px;cursor:pointer"
            >
              ⌘K&nbsp;search
            </button>
            <button
              title="View this system's source code"
              @click=${() => window.dispatchEvent(new CustomEvent('ethersim:code'))}
              style="font:inherit;font-size:11px;letter-spacing:.04em;color:#9fd;background:#10303c;border:1px solid #244;border-radius:6px;padding:4px 10px;cursor:pointer"
            >
              &lt;/&gt;&nbsp;source
            </button>
          </div>
          <ether-archetype-switcher></ether-archetype-switcher>
          <ether-params-panel></ether-params-panel>
          <ether-hierarchy-tree></ether-hierarchy-tree>
          <ether-telemetry-panel></ether-telemetry-panel>
          <ether-snapshot-controls></ether-snapshot-controls>
        </aside>
        <ether-learn-panel style=${hide}></ether-learn-panel>
        <ether-demo-details></ether-demo-details>
        <ether-command-palette></ether-command-palette>
        <ether-code-viewer></ether-code-viewer>
      </div>
    `;
  }
}

customElements.define('ether-app', EtherApp);
