import { LitElement, html, type TemplateResult } from 'lit';
import { $engine } from '../store';
import { migrate } from '../../state/migrations';
import { getFactory } from '../../core/registry';
import { extractText } from '../../state/pngMeta';

const MAX_JSON = 8 * 1024 * 1024; // 8 MB cap for snapshot JSON
const MAX_PNG = 64 * 1024 * 1024; // 64 MB cap for an imported image

// Snapshot + image export/import (FR-3.3). Everything is client-side: nothing is uploaded. Imports
// are validated by the zod schema (via migrate) and the archetype id is checked against the
// registry before anything is applied.
export class SnapshotControls extends LitElement {
  protected override createRenderRoot(): HTMLElement {
    return this;
  }

  private exportSnapshot(): void {
    const engine = $engine.get();
    if (!engine) return;
    const json = JSON.stringify(engine.exportSnapshot(), null, 2);
    const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ether-snapshot.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  private async importFile(ev: Event): Promise<void> {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    try {
      let raw: unknown;
      const isPng = file.type === 'image/png' || file.name.toLowerCase().endsWith('.png');
      if (isPng) {
        if (file.size > MAX_PNG) throw new Error('image too large');
        const text = extractText(new Uint8Array(await file.arrayBuffer()), 'ethersim');
        if (!text) throw new Error('no ETHERSIM snapshot embedded in this image');
        raw = JSON.parse(text);
      } else {
        if (file.size > MAX_JSON) throw new Error('snapshot too large');
        raw = JSON.parse(await file.text());
      }
      const snap = migrate(raw); // zod-validates; throws on anything malformed
      getFactory(snap.archetypeId); // throws if the archetype isn't registered
      $engine.get()?.importSnapshot(snap);
    } catch (err) {
      console.error('[ethersim] import failed', err);
    } finally {
      input.value = '';
    }
  }

  override render(): TemplateResult {
    return html`
      <div class="section">
        <h4>Snapshot</h4>
        <div class="row" style="gap:6px;flex-wrap:wrap;justify-content:flex-start">
          <button @click=${() => this.exportSnapshot()}>Export</button>
          <button @click=${() => void $engine.get()?.exportImage()}>Screenshot</button>
          <label class="filebtn" style="background:#14203a;border:1px solid var(--panel-border);border-radius:6px;padding:6px 10px;cursor:pointer">
            Import
            <input type="file" accept="application/json,image/png" @change=${(e: Event) => this.importFile(e)} />
          </label>
          <button @click=${() => $engine.get()?.togglePause()}>Pause</button>
        </div>
        <div class="hint" style="opacity:.5;font-size:11px;margin-top:6px">Screenshot embeds the full setup — re-import the PNG to recreate it.</div>
      </div>
    `;
  }
}

customElements.define('ether-snapshot-controls', SnapshotControls);
