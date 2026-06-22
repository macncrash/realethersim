import { LitElement, html, type TemplateResult } from 'lit';
import { StoreController } from '@nanostores/lit';
import { $archetypeId, listFactories, selectArchetype } from '../store';

// Live archetype switch (FR-3.1): no reload — selecting a tab updates the store, which the
// engine turns into an atomic driver+scene rebuild.
export class ArchetypeSwitcher extends LitElement {
  protected override createRenderRoot(): HTMLElement {
    return this;
  }

  private current = new StoreController(this, $archetypeId);

  override render(): TemplateResult {
    const active = this.current.value;
    return html`
      <div class="section">
        <h4>Archetype</h4>
        <div class="tabs">
          ${listFactories().map(
            (f) => html`<button
              class="tab ${f.id === active ? 'active' : ''}"
              @click=${() => selectArchetype(f.id)}
            >${f.label}</button>`,
          )}
        </div>
      </div>
    `;
  }
}

customElements.define('aether-archetype-switcher', ArchetypeSwitcher);
