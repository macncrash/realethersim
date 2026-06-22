import { LitElement, html, type TemplateResult } from 'lit';
import { $engine } from '../store';
import { migrate } from '../../state/migrations';

// Snapshot export/import (FR-3.3) + pause. Validates/migrates on import via the zod schema.
export class SnapshotControls extends LitElement {
  protected override createRenderRoot(): HTMLElement {
    return this;
  }

  private exportSnapshot(): void {
    const engine = $engine.get();
    if (!engine) return;
    const json = JSON.stringify(engine.exportSnapshot(), null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'aether-snapshot.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  private async importSnapshot(ev: Event): Promise<void> {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    try {
      const snap = migrate(JSON.parse(await file.text()));
      $engine.get()?.importSnapshot(snap);
    } catch (err) {
      console.error('[aether] snapshot import failed', err);
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
          <label class="filebtn" style="background:#14203a;border:1px solid var(--panel-border);border-radius:6px;padding:6px 10px;cursor:pointer">
            Import
            <input type="file" accept="application/json" @change=${(e: Event) => this.importSnapshot(e)} />
          </label>
          <button @click=${() => $engine.get()?.togglePause()}>Pause</button>
        </div>
      </div>
    `;
  }
}

customElements.define('aether-snapshot-controls', SnapshotControls);
