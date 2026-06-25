import { LitElement, html, nothing, type TemplateResult } from 'lit';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { StoreController } from '@nanostores/lit';
import katex from 'katex';
import { $archetypeId, $demoDetails, $demoMode } from '../store';
import { getFactory } from '../../core/registry';
import { getDoc } from '../learn/content';

// KaTeX HTML cache (equations are static per system).
const texCache = new Map<string, string>();
function tex(latex: string): string {
  let v = texCache.get(latex);
  if (v === undefined) {
    try {
      v = katex.renderToString(latex, { throwOnError: false, displayMode: true });
    } catch {
      v = latex;
    }
    texCache.set(latex, v);
  }
  return v;
}

// Demo-mode "teaching" overlay: when demo mode is showing AND the user has toggled details on (the
// ℹ button in the top badge), the current system's name, about text, and key formulae fade in at the
// bottom over the black — without leaving demo mode. As demo cycles, this updates with each system,
// so it reads like a self-running, narrated screensaver.
export class DemoDetails extends LitElement {
  protected override createRenderRoot(): HTMLElement {
    return this;
  }

  private demo = new StoreController(this, $demoMode);
  private details = new StoreController(this, $demoDetails);
  private archId = new StoreController(this, $archetypeId);

  override render(): TemplateResult | typeof nothing {
    if (!this.demo.value || !this.details.value) return nothing;
    const id = this.archId.value;
    const doc = getDoc(id);
    const title = doc?.title ?? getFactory(id).label;
    const eqs = doc?.equations.slice(0, 3) ?? [];

    return html`
      <style>
        .dd-wrap {
          position: fixed; left: 0; right: 0; bottom: 0; z-index: 9990; pointer-events: none;
          padding: 64px 6vw 30px; display: flex; flex-direction: column; align-items: center; gap: 12px;
          text-align: center; font-family: inherit;
          background: linear-gradient(to top, rgba(2, 6, 12, 0.94) 18%, rgba(2, 6, 12, 0.66) 58%, transparent);
          animation: ddFade 0.5s ease both;
        }
        @keyframes ddFade { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
        .dd-title { font-size: 22px; font-weight: 600; letter-spacing: 0.06em; color: #eafff7; }
        .dd-about { max-width: 780px; font-size: 14.5px; line-height: 1.55; color: #bcd6d1; }
        .dd-eqs { display: flex; flex-wrap: wrap; justify-content: center; gap: 4px 26px; margin-top: 2px; color: #dffaf3; }
        .dd-eqs .katex { font-size: 1.02em; }
        .dd-eqs .katex-display { margin: 4px 0; }
      </style>
      <div class="dd-wrap">
        <div class="dd-title">${title}</div>
        ${doc?.about ? html`<div class="dd-about">${doc.about}</div>` : nothing}
        ${eqs.length
          ? html`<div class="dd-eqs">${eqs.map((eq) => html`<span>${unsafeHTML(tex(eq.latex))}</span>`)}</div>`
          : nothing}
      </div>
    `;
  }
}

customElements.define('ether-demo-details', DemoDetails);
