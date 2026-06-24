import { LitElement, html, nothing, type TemplateResult } from 'lit';
import { StoreController } from '@nanostores/lit';
import {
  $archetypeId,
  $demoMode,
  listFactories,
  selectArchetype,
  selectRandom,
  resetCurrent,
  setDemoMode,
} from '../store';

interface Item {
  id: string;
  label: string;
  category: string;
}

// Cmd-K / Cmd-F / "/" command palette: fuzzy-search every system across all categories, jump to one
// with the keyboard or a click, plus Random, Reset-to-defaults, and Demo-mode actions. Renders into
// light DOM with a scoped <style> block so it overlays the whole app.
export class CommandPalette extends LitElement {
  protected override createRenderRoot(): HTMLElement {
    return this;
  }

  private demo = new StoreController(this, $demoMode);
  private cur = new StoreController(this, $archetypeId);

  private open = false;
  private query = '';
  private active = 0;

  override connectedCallback(): void {
    super.connectedCallback();
    window.addEventListener('keydown', this.onKey);
    window.addEventListener('ethersim:palette', this.onOpenEvent);
  }
  override disconnectedCallback(): void {
    super.disconnectedCallback();
    window.removeEventListener('keydown', this.onKey);
    window.removeEventListener('ethersim:palette', this.onOpenEvent);
  }

  private onOpenEvent = (): void => this.show();

  private isTyping(e: KeyboardEvent): boolean {
    const t = e.target as HTMLElement | null;
    return !!t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable);
  }

  private onKey = (e: KeyboardEvent): void => {
    const k = e.key.toLowerCase();
    if ((e.metaKey || e.ctrlKey) && (k === 'k' || k === 'f')) {
      e.preventDefault();
      this.toggle();
      return;
    }
    if (k === '/' && !this.open && !this.isTyping(e)) {
      e.preventDefault();
      this.show();
      return;
    }
    if (!this.open) return;
    if (k === 'escape') {
      e.preventDefault();
      this.hide();
    } else if (k === 'arrowdown') {
      e.preventDefault();
      this.move(1);
    } else if (k === 'arrowup') {
      e.preventDefault();
      this.move(-1);
    } else if (k === 'enter') {
      e.preventDefault();
      this.choose();
    }
  };

  private toggle(): void {
    this.open ? this.hide() : this.show();
  }
  private show(): void {
    this.open = true;
    this.query = '';
    this.active = 0;
    this.requestUpdate();
    requestAnimationFrame(() => (this.querySelector('.cmdp-input') as HTMLInputElement | null)?.focus());
  }
  private hide(): void {
    this.open = false;
    this.requestUpdate();
  }

  private filtered(): Item[] {
    const all: Item[] = listFactories().map((f) => ({ id: f.id, label: f.label, category: f.category }));
    const q = this.query.trim().toLowerCase();
    if (!q) {
      return all.sort((a, b) => a.category.localeCompare(b.category) || a.label.localeCompare(b.label));
    }
    const scored = all
      .map((it) => {
        const hay = `${it.label} ${it.category} ${it.id}`.toLowerCase();
        const lbl = it.label.toLowerCase();
        let score = -1;
        if (lbl.startsWith(q)) score = 0;
        else if (lbl.includes(q)) score = 1;
        else if (hay.includes(q)) score = 2;
        return { it, score };
      })
      .filter((s) => s.score >= 0)
      .sort((a, b) => a.score - b.score || a.it.label.localeCompare(b.it.label));
    return scored.map((s) => s.it);
  }

  private move(d: number): void {
    const n = this.filtered().length;
    if (n === 0) return;
    this.active = (this.active + d + n) % n;
    this.requestUpdate();
    requestAnimationFrame(() => this.querySelector('.cmdp-row.active')?.scrollIntoView({ block: 'nearest' }));
  }

  private choose(): void {
    const list = this.filtered();
    const item = list[this.active];
    if (item) {
      selectArchetype(item.id);
      this.hide();
    }
  }

  private onInput(e: Event): void {
    this.query = (e.target as HTMLInputElement).value;
    this.active = 0;
    this.requestUpdate();
  }

  private demoBadge(): TemplateResult | typeof nothing {
    if (!this.demo.value) return nothing;
    return html`<button class="cmdp-badge" @click=${() => setDemoMode(false)} title="Stop demo mode">
      <span class="cmdp-dot"></span> demo · click to stop
    </button>`;
  }

  override render(): TemplateResult | typeof nothing {
    if (!this.open) {
      return this.demo.value
        ? html`<style>
              .cmdp-badge {
                position: fixed; left: 16px; bottom: 16px; z-index: 9998; display: flex; align-items: center;
                gap: 7px; font: inherit; font-size: 12px; color: #eafff7; background: #163d33cc;
                border: 1px solid #2f8a6a; border-radius: 999px; padding: 6px 12px; cursor: pointer;
                backdrop-filter: blur(4px);
              }
              .cmdp-dot { width: 8px; height: 8px; border-radius: 50%; background: #5af0c8; animation: cmdpPulse 1.6s infinite; }
              @keyframes cmdpPulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
            </style>
            ${this.demoBadge()}`
        : nothing;
    }
    const list = this.filtered();
    const curId = this.cur.value;
    return html`
      <style>
        .cmdp-back {
          position: fixed; inset: 0; z-index: 9999; display: grid; place-items: start center;
          padding-top: 12vh; background: rgba(2, 6, 14, 0.62); backdrop-filter: blur(3px);
          font-family: inherit;
        }
        .cmdp-box {
          width: min(560px, 92vw); max-height: 70vh; display: flex; flex-direction: column;
          background: #0d1622; border: 1px solid #244; border-radius: 12px; overflow: hidden;
          box-shadow: 0 24px 80px rgba(0, 0, 0, 0.6);
        }
        .cmdp-input {
          width: 100%; box-sizing: border-box; padding: 16px 18px; font-size: 16px; color: #dff;
          background: transparent; border: none; border-bottom: 1px solid #1d3340; outline: none;
          font-family: inherit;
        }
        .cmdp-input::placeholder { color: #5a7; opacity: 0.5; }
        .cmdp-list { overflow-y: auto; padding: 6px; }
        .cmdp-row {
          display: flex; align-items: center; gap: 10px; padding: 9px 12px; border-radius: 7px;
          cursor: pointer; color: #bcd;
        }
        .cmdp-row.active { background: #16384a; color: #eafffb; }
        .cmdp-row:hover { background: #122c3a; }
        .cmdp-row.cur .cmdp-label::after { content: ' ●'; color: #5af0c8; font-size: 0.7em; }
        .cmdp-label { flex: 1; }
        .cmdp-cat {
          font-size: 11px; letter-spacing: 0.04em; text-transform: uppercase; color: #5a8; opacity: 0.75;
          background: #0f2430; padding: 2px 7px; border-radius: 999px;
        }
        .cmdp-empty { padding: 24px; text-align: center; color: #678; }
        .cmdp-foot {
          display: flex; align-items: center; gap: 8px; padding: 8px 12px; border-top: 1px solid #1d3340;
          font-size: 12px; color: #79a;
        }
        .cmdp-act {
          font: inherit; font-size: 12px; color: #cfe; background: #14323f; border: 1px solid #2a4a58;
          border-radius: 6px; padding: 5px 10px; cursor: pointer;
        }
        .cmdp-act:hover { background: #1c4252; }
        .cmdp-act.on { background: #1f5a4a; border-color: #2f8a6a; color: #eafff7; }
        .cmdp-hint { margin-left: auto; opacity: 0.7; }
        .cmdp-hint kbd {
          background: #102330; border: 1px solid #244; border-radius: 4px; padding: 1px 5px; font-size: 11px;
        }
      </style>
      <div class="cmdp-back" @pointerdown=${(e: Event) => e.target === e.currentTarget && this.hide()}>
        <div class="cmdp-box">
          <input
            class="cmdp-input"
            placeholder="Search ${list.length} systems…  (type to filter, ↵ to open)"
            .value=${this.query}
            @input=${(e: Event) => this.onInput(e)}
          />
          <div class="cmdp-list">
            ${list.length === 0
              ? html`<div class="cmdp-empty">No system matches “${this.query}”.</div>`
              : list.map(
                  (it, i) => html`
                    <div
                      class="cmdp-row ${i === this.active ? 'active' : ''} ${it.id === curId ? 'cur' : ''}"
                      @pointerenter=${() => {
                        this.active = i;
                        this.requestUpdate();
                      }}
                      @click=${() => {
                        selectArchetype(it.id);
                        this.hide();
                      }}
                    >
                      <span class="cmdp-label">${it.label}</span>
                      <span class="cmdp-cat">${it.category}</span>
                    </div>
                  `,
                )}
          </div>
          <div class="cmdp-foot">
            <button
              class="cmdp-act"
              @click=${() => {
                selectRandom();
                this.hide();
              }}
            >
              🎲 Random
            </button>
            <button
              class="cmdp-act"
              @click=${() => {
                resetCurrent();
                this.hide();
              }}
            >
              ↺ Reset defaults
            </button>
            <button class="cmdp-act ${this.demo.value ? 'on' : ''}" @click=${() => setDemoMode(!this.demo.value)}>
              ${this.demo.value ? '⏸ Demo on' : '▶ Demo'}
            </button>
            <span class="cmdp-hint"><kbd>↑↓</kbd> <kbd>↵</kbd> <kbd>esc</kbd></span>
          </div>
        </div>
      </div>
    `;
  }
}

customElements.define('ether-command-palette', CommandPalette);
