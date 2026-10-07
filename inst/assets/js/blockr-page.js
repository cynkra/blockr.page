/* blockr.page: the board as one linear document.
 *
 * R owns the reading order (`items`) and the board; this file owns the layout.
 * Block cards arrive in the document container as server-rendered DOM (with
 * live Shiny bindings) and are only ever MOVED, never rebuilt. Text items, the
 * insert lines, the gutter graph and the contents are drawn here from the
 * state R pushes on every change. Gestures go back as one input,
 * `<ns>page_action`.
 */
(function () {
  'use strict';


  const SVG_NS = 'http://www.w3.org/2000/svg';

  const ICON = {
    code: '<svg viewBox="0 0 16 16" fill="currentColor"><path d="M10.478 1.647a.5.5 0 1 0-.956-.294l-4 13a.5.5 0 0 0 .956.294l4-13zM4.854 4.146a.5.5 0 0 1 0 .708L1.707 8l3.147 3.146a.5.5 0 0 1-.708.708l-3.5-3.5a.5.5 0 0 1 0-.708l3.5-3.5a.5.5 0 0 1 .708 0zm6.292 0a.5.5 0 0 0 0 .708L14.293 8l-3.147 3.146a.5.5 0 0 0 .708.708l3.5-3.5a.5.5 0 0 0 0-.708l-3.5-3.5a.5.5 0 0 0-.708 0z"/></svg>',
    chevron: '<svg class="bp-chevron" viewBox="0 0 12 12" width="12" height="12"><polyline points="3 4.5 6 7.5 9 4.5" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    list: '<svg viewBox="0 0 16 16" fill="currentColor"><path d="M5 11.5a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9a.5.5 0 0 1-.5-.5zm-3 1a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm0 4a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm0 4a1 1 0 1 0 0-2 1 1 0 0 0 0 2z"/></svg>',
    filecode: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"><path d="M3.5 1.5h6l3 3v10h-9z"/><path d="M9.5 1.5v3h3"/><path d="M6.3 8 5 9.5 6.3 11M9.7 8 11 9.5 9.7 11" stroke-linecap="round"/></svg>',
    plus: '<svg viewBox="0 0 10 10"><path d="M5 1.5v7M1.5 5h7" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>',
    grip: '<svg viewBox="0 0 16 16" fill="currentColor"><circle cx="5.5" cy="3" r="1.3"/><circle cx="10.5" cy="3" r="1.3"/><circle cx="5.5" cy="8" r="1.3"/><circle cx="10.5" cy="8" r="1.3"/><circle cx="5.5" cy="13" r="1.3"/><circle cx="10.5" cy="13" r="1.3"/></svg>',
    chev: '<svg viewBox="0 0 16 16" fill="currentColor"><path fill-rule="evenodd" d="M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708z"/></svg>',
    plusb: '<svg viewBox="0 0 16 16" fill="currentColor"><path d="M2 2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2zm6 3.5a.5.5 0 0 0-.5.5v1.5H6a.5.5 0 0 0 0 1h1.5V10a.5.5 0 0 0 1 0V8.5H10a.5.5 0 0 0 0-1H8.5V6a.5.5 0 0 0-.5-.5z"/></svg>',
    branch: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="4" cy="3" r="1.6"/><circle cx="4" cy="13" r="1.6"/><circle cx="12" cy="6" r="1.6"/><path d="M4 4.6v6.8M12 7.6c0 3-4 2.5-7.2 4.4"/></svg>',
    data: '<svg viewBox="0 0 16 16" fill="currentColor"><path d="M8 1c-3.3 0-6 1.1-6 2.5v9C2 13.9 4.7 15 8 15s6-1.1 6-2.5v-9C14 2.1 11.3 1 8 1zm0 1.2c2.8 0 4.8.9 4.8 1.3S10.8 4.8 8 4.8 3.2 3.9 3.2 3.5 5.2 2.2 8 2.2zM3.2 5.3C4.3 5.8 6 6 8 6s3.7-.2 4.8-.7V8c0 .4-2 1.3-4.8 1.3S3.2 8.4 3.2 8V5.3zm0 4.5c1.1.5 2.8.7 4.8.7s3.7-.2 4.8-.7v2.7c0 .4-2 1.3-4.8 1.3s-4.8-.9-4.8-1.3V9.8z"/></svg>',
    text: '<svg viewBox="0 0 16 16" fill="currentColor"><path d="M2 3.5a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11a.5.5 0 0 1-.5-.5zm0 3a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11a.5.5 0 0 1-.5-.5zm0 3a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11a.5.5 0 0 1-.5-.5zm0 3a.5.5 0 0 1 .5-.5h6a.5.5 0 0 1 0 1h-6a.5.5 0 0 1-.5-.5z"/></svg>',
    heading: '<svg viewBox="0 0 16 16" fill="currentColor"><path d="M3 2.5a.5.5 0 0 1 1 0V7h8V2.5a.5.5 0 0 1 1 0v11a.5.5 0 0 1-1 0V8H4v5.5a.5.5 0 0 1-1 0v-11z"/></svg>',
    up: '<svg viewBox="0 0 16 16" fill="currentColor"><path d="M8 3.3 3.6 7.7a.5.5 0 0 0 .7.7L7.5 5.2V13a.5.5 0 0 0 1 0V5.2l3.2 3.2a.5.5 0 0 0 .7-.7L8 3.3z"/></svg>',
    down: '<svg viewBox="0 0 16 16" fill="currentColor"><path d="M8 12.7 3.6 8.3a.5.5 0 0 1 .7-.7l3.2 3.2V3a.5.5 0 0 1 1 0v7.8l3.2-3.2a.5.5 0 0 1 .7.7L8 12.7z"/></svg>',
    trash: '<svg viewBox="0 0 16 16" fill="currentColor"><path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6zM14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1 0-2H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.1 4 4 4.1V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.1L11.9 4H4.1z"/></svg>'
  };

  const esc = s => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  function headingLevel(md) {
    const m = /^\s*(#{1,6})\s/.exec(md || '');
    return m ? m[1].length : 0;
  }
  function headingText(md) {
    return (md || '').split('\n')[0].replace(/^\s*#{1,6}\s+/, '').trim();
  }
  // Shiny sends an empty named list as [].
  const asObj = x => (x && !Array.isArray(x)) ? x : {};

  /* ---- graph layout: one lane per branch, edges run down the parent lane --- */
  function assignLanes(nodes) {
    const row = new Map(nodes.map((n, i) => [n.id, i]));
    const kids = new Map(nodes.map(n => [n.id, []]));
    nodes.forEach(n => n.from.forEach(p => kids.has(p) && kids.get(p).push(n.id)));
    const lastKid = id => Math.max(row.get(id), ...kids.get(id).map(k => row.get(k)));
    const lane = new Map();
    const busy = (l, r, except) => nodes.some((q, i) =>
      i < r && q.id !== except && lane.get(q.id) === l && lastKid(q.id) >= r);
    nodes.forEach((n, r) => {
      const ps = n.from.filter(p => lane.has(p));
      let l = 0;
      if (ps.length) {
        const p = ps[0];
        if (ps.length === 1 && kids.get(p).length === 1 && !busy(lane.get(p), r, p)) {
          lane.set(n.id, lane.get(p));
          return;
        }
        l = lane.get(p) + 1;
      }
      while (busy(l, r)) l++;
      lane.set(n.id, l);
    });
    const nLanes = lane.size ? Math.max(...lane.values()) + 1 : 1;
    return { lane, nLanes };
  }

  function lineClass(l) {
    if (/^```/.test(l) || /^#\+ /.test(l) || /^(#' )?---$/.test(l)) return ' bp-ln-fence';
    if (/^#\| /.test(l)) return ' bp-ln-opt';
    if (/^(#' )?#{1,6} /.test(l)) return ' bp-ln-hd';
    return '';
  }
  function tint(l) {
    if (/^(```|#\||#\+|#' )/.test(l)) return esc(l);
    return esc(l)
      .replace(/(&quot;)(.*?)(&quot;)/g, '<span class="bp-tk-s">$1$2$3</span>')
      .replace(/\b([A-Za-z][A-Za-z0-9.]*)::/g, '<span class="bp-tk-ns">$1::</span>')
      .replace(/ (&lt;-) /g, ' <span class="bp-tk-op">$1</span> ');
  }

  class Page {
    constructor(el) {
      this.el = el;
      this.ns = el.dataset.ns;
      this.doc = el.querySelector('.bp-doc');
      this.wrap = el.querySelector('.bp-docwrap');
      this.rail = el.querySelector('.bp-rail');
      this.scrollEl = el.querySelector('.bp-scroll');
      this.tip = document.createElement('div');
      this.tip.className = 'bp-gtip';
      this.wrap.appendChild(this.tip);
      this.toc = el.querySelector('.bp-toc');
      this.toastEl = el.querySelector('.bp-toast');
      const reg = el.querySelector('.bp-registry');
      this.registry = reg ? JSON.parse(reg.textContent || '[]') : [];
      this.state = { items: [], blocks: {}, links: [] };
      this.folded = new Set();
      this.editing = null;
      this.pendingEdit = null;
      this.pendingFresh = null;
      this.freshDone = new Set();
      this.openSteps = new Set();
      this.source = {
        on: localStorage.getItem('blockr-page-source') === 'on',
        fmt: localStorage.getItem('blockr-page-source-fmt') === 'R' ? 'R' : 'qmd',
        pieces: null
      };
      this.narrow = this.isNarrow();
      this.readOnly = el.classList.contains('bp-readonly');
      // a page served for readers (options(blockr.page.mode = "read"))
      this.read = this.readOnly;
      this.applyGutter();
      this.bind();
      this.sendSource();
    }

    // The gutter has one setting for wide views and one for narrow ones; a
    // narrow view starts without it, so a phone shows the document alone.
    isNarrow() { return this.el.clientWidth < 760; }
    gutterKey() { return this.narrow ? 'blockr-page-gutter-narrow' : 'blockr-page-gutter'; }
    applyGutter() {
      const v = localStorage.getItem(this.gutterKey());
      this.gutterOff = v ? v === 'off' : this.narrow;
      this.el.classList.toggle('bp-no-gutter', this.gutterOff);
      this.el.querySelector('.bp-gutlabel').setAttribute('aria-label', this.gutterOff ? 'Show graph' : 'Hide graph');
    }

    // Source beside the page: wide views only, two columns do not fit a phone.
    sourceOn() { return this.source.on && !this.narrow && !this.read; }
    sendSource() {
      const on = this.sourceOn();
      this.el.classList.toggle('bp-source', on);
      if (window.Shiny && Shiny.setInputValue) {
        Shiny.setInputValue(this.ns + 'page_source', { on: on, fmt: this.source.fmt });
      }
    }

    send(payload) {
      if (!window.Shiny || !Shiny.setInputValue) return;
      Shiny.setInputValue(this.ns + 'page_action', Object.assign({ nonce: Date.now() + Math.random() }, payload),
        { priority: 'event' });
    }

    blockAbove(at) {
      const items = this.state.items;
      for (let i = Math.min(at, items.length) - 1; i >= 0; i--) if (items[i].block != null) return items[i].block;
      return null;
    }
    blockName(id) {
      const b = this.state.blocks[id];
      return b ? b.name : id;
    }
    parents(id) {
      return this.state.links.filter(l => l.to === id).map(l => l.from);
    }
    ancestors(id) {
      const out = new Set([id]);
      const st = [id];
      while (st.length) this.parents(st.pop()).forEach(p => { if (!out.has(p)) { out.add(p); st.push(p); } });
      return out;
    }

    /* ---- state from R ------------------------------------------------------ */
    update(msg) {
      this.state = { items: msg.items || [], blocks: asObj(msg.blocks), links: msg.links || [] };
      if (msg.fresh && !this.freshDone.has(msg.fresh)) this.pendingFresh = msg.fresh;
      if (this.pendingEdit != null) {
        const it = this.state.items[this.pendingEdit];
        if (it && it.text != null) this.editing = this.pendingEdit;
        this.pendingEdit = null;
      }
      this.render();
    }

    /* ---- the document -------------------------------------------------------- */
    render() {
      this.closeMenu();
      const src = this.sourceOn();
      const items = this.state.items;
      const blockNodes = new Map();
      this.doc.querySelectorAll(':scope > .bp-blk').forEach(n => blockNodes.set(n.dataset.blockId, n));
      this.doc.querySelectorAll(':scope > .bp-gen').forEach(n => n.remove());

      const seq = [];
      let foldLevel = 0;
      items.forEach((it, i) => {
        const lvl = it.text != null ? headingLevel(it.text) : 0;
        if (lvl && foldLevel && lvl <= foldLevel) foldLevel = 0;
        const hidden = foldLevel > 0;
        if (!hidden) seq.push(this.insLine(i, false));
        if (it.block != null) {
          const node = blockNodes.get(it.block);
          if (node) {
            node.classList.toggle('bp-compact', hidden);
            node.classList.remove('bp-unplaced');
            // the report's two switches: Output off makes the block a step
            node.classList.toggle('bp-step', it.output === false);
            node.classList.toggle('bp-open', it.output === false && this.openSteps.has(it.block));
            node.classList.toggle('bp-code-on', it.code === true);
            seq.push(node);
            blockNodes.delete(it.block);
            if (src && !hidden) seq.push(this.srcNode(i, 0));
          }
        } else if (!hidden) {
          seq.push(this.textNode(it, i, lvl));
          if (src) seq.push(this.srcNode(i, this.editing === i ? 0 : lvl));
        }
        if (lvl && !foldLevel && this.folded.has(headingText(it.text))) foldLevel = lvl;
      });
      seq.push(this.insLine(items.length, true));
      if (src) seq.unshift(this.srcHead());
      const name = items.length && items[0].text != null && headingLevel(items[0].text) === 1 ? headingText(items[0].text) : 'Untitled page';
      this.el.querySelector('.bp-nm').textContent = name;
      // blocks the board has but the reading order does not list yet
      blockNodes.forEach(n => n.classList.add('bp-unplaced'));

      let ref = this.doc.firstChild;
      for (const node of seq) {
        if (node === ref) { ref = ref.nextSibling; continue; }
        this.doc.insertBefore(node, ref);
      }

      const ta = this.doc.querySelector('.bp-writer textarea');
      if (ta) {
        const grow = () => { ta.style.height = 'auto'; ta.style.height = ta.scrollHeight + 'px'; };
        ta.addEventListener('input', grow);
        grow();
        ta.focus();
        ta.setSelectionRange(ta.value.length, ta.value.length);
      }

      if (this.pendingFresh) {
        const node = this.doc.querySelector(`:scope > .bp-blk[data-block-id="${this.pendingFresh}"]:not(.bp-unplaced)`);
        if (node) {
          this.freshDone.add(this.pendingFresh);
          this.pendingFresh = null;
          node.classList.add('bp-band-open');
          this.shown(node);
          setTimeout(() => this.jumpTo(node), 50);
        }
      }

      this.buildToc();
      this.scheduleRail();
      if (this.mo) this.mo.takeRecords();
    }

    insLine(at, last) {
      const d = document.createElement('div');
      d.className = 'bp-ins bp-gen' + (last ? ' bp-ins-last' : '');
      d.dataset.at = at;
      d.innerHTML = last
        ? `<button type="button" class="bp-insbtn">${ICON.plus}<span class="bp-insl">Add block</span></button>`
        : `<span class="bp-insline"></span><button type="button" class="bp-insbtn bp-hb bp-hb-s" aria-label="Insert">${ICON.plus}</button>`;
      return d;
    }

    textNode(it, i, lvl) {
      const d = document.createElement('div');
      d.dataset.index = i;
      if (this.editing === i) {
        d.className = 'bp-writer bp-gen';
        d.innerHTML = `<textarea spellcheck="true">${esc(it.text)}</textarea>
          <div class="bp-wf"><span>**bold** · *italic* · # heading · Ctrl+Enter</span><span class="bp-bsp"></span>
          <button type="button" class="bp-wdiscard">Discard</button><button type="button" class="bp-wdone">Done</button></div>`;
        return d;
      }
      d.className = 'bp-text bp-gen' + (lvl ? ' bp-heading' : '') + (it.text.trim() ? '' : ' bp-text-empty');
      d.innerHTML = `<button type="button" class="bp-handle bp-hb bp-hb-s" aria-label="Move or remove">${ICON.grip}</button>` +
        (it.html || '<p class="bp-placeholder">Empty text</p>');
      if (lvl) {
        const h = d.querySelector('h1,h2,h3,h4,h5,h6');
        if (h) {
          const folded = this.folded.has(headingText(it.text));
          d.classList.toggle('bp-folded', folded);
          h.insertAdjacentHTML('beforeend',
            `<button type="button" class="bp-fold bp-hb bp-hb-s" aria-label="Fold section">${ICON.chev}</button>` +
            (folded ? '<span class="bp-foldn">folded</span>' : ''));
        }
      }
      return d;
    }

    // An item's source, in the second column beside it. Headings carry their
    // own top margin, which the source line matches.
    srcNode(i, lvl) {
      const d = document.createElement('div');
      const it = this.state.items[i];
      d.className = 'bp-src bp-gen' + (it.block != null ? ' bp-src-chunk' : '') + (lvl ? ' bp-src-h' + Math.min(lvl, 3) : '');
      d.dataset.src = i;
      const txt = this.source.pieces && this.source.pieces[i];
      d.innerHTML = txt == null ? '' : txt.split('\n').map(l => `<div class="bp-ln${lineClass(l)}">${tint(l) || '&nbsp;'}</div>`).join('');
      return d;
    }

    srcHead() {
      const d = document.createElement('div');
      d.className = 'bp-srchead bp-gen';
      d.innerHTML = `<button type="button" class="bp-coltitle">${this.source.fmt === 'R' ? 'R script' : 'Quarto'}${ICON.chevron}</button>`;
      return d;
    }

    shown(node) {
      if (window.jQuery) window.jQuery(node).trigger('shown');
      window.dispatchEvent(new Event('resize'));
    }

    /* ---- gestures --------------------------------------------------------------- */
    bind() {
      this.doc.addEventListener('click', e => this.onClick(e));
      this.doc.addEventListener('keydown', e => {
        if (!e.target.closest('.bp-writer')) return;
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); this.finishEdit(true); }
        if (e.key === 'Escape') { e.preventDefault(); this.finishEdit(false); }
      });
      // The graph stays still while you read; pointing at a dot lights its
      // path and names the block.
      this.rail.addEventListener('mouseover', e => {
        const d = e.target.closest('.bp-dot');
        if (!d || this.el.classList.contains('bp-dragging')) return;
        this.hl(d.dataset.id);
        const r = d.getBoundingClientRect(), wr = this.wrap.getBoundingClientRect();
        this.tip.textContent = this.blockName(d.dataset.id);
        this.tip.style.left = (r.left - wr.left - 8) + 'px';
        this.tip.style.top = (r.top + r.height / 2 - wr.top) + 'px';
        this.tip.classList.add('bp-show');
      });
      this.rail.addEventListener('mouseout', e => {
        if (!e.target.closest('.bp-dot') || this.el.classList.contains('bp-dragging')) return;
        this.hl(null);
        this.tip.classList.remove('bp-show');
      });
      // A dot: drag to a gap to add a block there, onto a block to connect,
      // or click for a block right below.
      // A grip: drag to move the item, click for its menu.
      this.doc.addEventListener('mousedown', e => {
        const h = e.target.closest('.bp-handle');
        if (h && e.button === 0 && !this.read) this.startMove(e, this.itemIndexOf(h));
      });
      this.rail.addEventListener('mousedown', e => {
        const d = e.target.closest('.bp-dot');
        if (d && e.button === 0) this.startDrag(e, d.dataset.id);
      });
      this.toc.addEventListener('click', e => {
        const a = e.target.closest('a');
        if (!a) return;
        this.el.classList.remove('bp-toc-open');
        if (a.dataset.block) this.jumpBlock(a.dataset.block);
        else this.jumpIndex(+a.dataset.index);
      });
      this.el.querySelector('.bp-gutlabel').addEventListener('click', () => {
        localStorage.setItem(this.gutterKey(), this.gutterOff ? 'on' : 'off');
        this.applyGutter();
        this.scheduleRail();
      });
      this.el.querySelector('.bp-name').addEventListener('click', e => this.nameMenu(e.currentTarget));
      this.el.querySelector('.bp-save').addEventListener('click', e => this.saveMenu(e.currentTarget));
      // The right column's title is its switch: Contents, or the source as
      // Quarto or as an R script, beside the page.
      this.el.addEventListener('click', e => {
        const t = e.target.closest('.bp-coltitle');
        if (t) this.columnMenu(t);
      });
      window.addEventListener('resize', () => {
        const n = this.isNarrow();
        if (n === this.narrow) return;
        this.narrow = n;
        this.applyGutter();
        this.sendSource();
        this.render();
      });
      this.el.querySelector('.bp-toc-toggle').addEventListener('click', () => this.el.classList.toggle('bp-toc-open'));
      this.scrollEl.addEventListener('scroll', () => this.spy(), { passive: true });
      // Outputs settle after first paint (plots, tables): redraw the gutter then.
      if (window.ResizeObserver) new ResizeObserver(() => this.scheduleRail()).observe(this.doc);
      // A block card inserted by R before its item arrives, or after it.
      // render() moves cards itself and drops those records (takeRecords).
      this.mo = new MutationObserver(muts => {
        if (muts.some(m => [...m.addedNodes].some(n => n.classList && n.classList.contains('bp-blk')))) this.render();
      });
      this.mo.observe(this.doc, { childList: true });
    }

    itemIndexOf(el) {
      const t = el.closest('[data-index]');
      if (t) return +t.dataset.index;
      const b = el.closest('.bp-blk');
      return b ? this.state.items.findIndex(it => it.block === b.dataset.blockId) : -1;
    }

    onClick(e) {
      const t = e.target;
      const blk = t.closest('.bp-blk');
      if (this.read) return;
      if (t.closest('.bp-insbtn')) return this.insertMenu(+t.closest('.bp-ins').dataset.at, t.closest('.bp-insbtn'));
      if (t.closest('.bp-handle')) {
        if (this._dragged) { this._dragged = false; return; }
        return this.itemMenu(this.itemIndexOf(t), t.closest('.bp-handle'));
      }
      if (t.closest('.bp-fold')) {
        const key = headingText(this.state.items[this.itemIndexOf(t)].text);
        this.folded.has(key) ? this.folded.delete(key) : this.folded.add(key);
        return this.render();
      }
      if (t.closest('.bp-wdone')) return this.finishEdit(true);
      if (t.closest('.bp-wdiscard')) return this.finishEdit(false);
      if (blk && t.closest('.bp-bh')) {
        if (blk.classList.contains('bp-compact')) return this.jumpBlock(blk.dataset.blockId);
        const idx = this.itemIndexOf(blk);
        if (t.closest('.bp-code-t')) return this.send({ type: 'toggle', index: idx, field: 'code' });
        if (t.closest('.bp-eye-t')) return this.send({ type: 'toggle', index: idx, field: 'output' });
        if (t.closest('.bp-more')) return this.blockMoreMenu(idx, blk.dataset.blockId, t.closest('.bp-more'));
        if (t.closest('.bp-ctl-t')) {
          if (blk.classList.contains('bp-step')) this.openSteps.add(blk.dataset.blockId);
          blk.classList.toggle('bp-band-open');
          blk.classList.toggle('bp-open', blk.classList.contains('bp-step') && this.openSteps.has(blk.dataset.blockId));
          this.shown(blk);
          return this.scheduleRail();
        }
        // a step opens and closes from anywhere on its line
        if (blk.classList.contains('bp-step') && !t.closest('.bp-gh')) {
          const id = blk.dataset.blockId;
          this.openSteps.has(id) ? this.openSteps.delete(id) : this.openSteps.add(id);
          blk.classList.toggle('bp-open', this.openSteps.has(id));
          this.shown(blk);
          return this.scheduleRail();
        }
        return;
      }
      const txt = t.closest('.bp-text');
      if (txt && !t.closest('a')) {
        this.editing = +txt.dataset.index;
        this.render();
      }
    }

    finishEdit(save) {
      const w = this.doc.querySelector('.bp-writer');
      if (!w) return;
      const i = +w.dataset.index;
      const it = this.state.items[i];
      const val = w.querySelector('textarea').value;
      this.editing = null;
      if (save && it && val !== it.text) this.send({ type: 'edit_text', index: i, text: val });
      else if (!save && it && !it.text.trim()) this.send({ type: 'edit_text', index: i, text: '' });
      this.render();
    }

    /* ---- menus: blockr.ui's Blockr.menu, the dock's "+" menu ---------------------------- */
    menu(anchor, cfg) {
      this.closeMenu();
      if (!window.Blockr || !Blockr.menu) return;
      const user = cfg.onClose;
      const h = Blockr.menu(anchor, Object.assign({}, cfg, {
        onClose: () => { if (this.openMenu === h) this.openMenu = null; if (user) user(); }
      }));
      this.openMenu = h;
    }
    closeMenu() {
      if (this.openMenu) { const m = this.openMenu; this.openMenu = null; m.close(); }
    }
    // A pick closes the menu; the next one opens after that has settled.
    then(fn) { return () => setTimeout(fn, 0); }

    insertMenu(at, anchor) {
      const items = this.state.items;
      const above = items.slice(0, at).filter(it => it.block != null).map(it => it.block);
      const last = this.blockAbove(at);
      const ins = anchor.closest('.bp-ins');
      const mark = () => ins && ins.classList.add('bp-open');
      const unmark = () => ins && ins.classList.remove('bp-open');
      const rows = [];
      if (last) {
        rows.push({ label: 'Block', meta: 'after ' + this.blockName(last), icon: ICON.plusb,
          onSelect: this.then(() => { mark(); this.blockMenu(anchor, at, last, unmark); }) });
      }
      if (above.length > 1) {
        rows.push({ label: 'Block from another input', icon: ICON.branch,
          onSelect: this.then(() => { mark(); this.fromMenu(anchor, at, above, unmark); }) });
      }
      rows.push({ label: 'Block without input', icon: ICON.data,
        onSelect: this.then(() => { mark(); this.blockMenu(anchor, at, null, unmark); }) });
      rows.push({ divider: true });
      rows.push({ label: 'Text', onSelect: () => { this.pendingEdit = at; this.send({ type: 'add_text', at: at, text: '' }); } });
      rows.push({ label: 'Heading', onSelect: () => { this.pendingEdit = at; this.send({ type: 'add_text', at: at, text: '## ' }); } });
      mark();
      this.menu(anchor, { items: rows, onClose: () => setTimeout(() => { if (!this.openMenu) unmark(); }, 0) });
    }

    fromMenu(anchor, at, above, onClose) {
      this.menu(anchor, {
        caption: 'Read from',
        items: above.slice().reverse().map(id => ({
          label: this.blockName(id),
          onSelect: this.then(() => this.blockMenu(anchor, at, id, onClose))
        })),
        onClose: () => setTimeout(() => { if (!this.openMenu && onClose) onClose(); }, 0)
      });
    }

    // Every registered block by category; appending offers only the blocks
    // that can take an input, as the dock does.
    blockMenu(anchor, at, from, onClose) {
      const rows = [];
      let cat = null;
      this.registry.filter(r => !from || r.append).forEach(r => {
        if (r.category !== cat) { cat = r.category; rows.push({ title: cat }); }
        rows.push({
          label: r.name, badge: r.package, keywords: r.id,
          mark: { icon: r.icon, category: r.category },
          onSelect: () => this.send({ type: 'add_block', at: at, registry: r.id, from: from || '' })
        });
      });
      this.menu(anchor, {
        caption: from ? 'Append to ' + this.blockName(from) : 'Add block',
        filter: 'Search blocks', minWidth: 300, items: rows,
        onClose: () => { if (onClose) onClose(); }
      });
    }

    nameMenu(anchor) {
      if (this.readOnly) return;
      const file = this.el.querySelector('.bp-offscreen input[type="file"]');
      this.menu(anchor, { items: [
        { label: 'Open from file…', onSelect: () => file && file.click() }
      ] });
    }

    saveMenu(anchor) {
      const dl = this.el.querySelector('.bp-offscreen a.shiny-download-link[id$="serialize"]');
      this.menu(anchor, { items: [
        { label: 'Download', meta: 'workflow file', onSelect: () => dl && dl.click() }
      ] });
    }

    columnMenu(anchor) {
      const src = this.sourceOn(), fmt = this.source.fmt;
      const show = f => {
        this.source.on = f !== null;
        if (f) this.source.fmt = f;
        localStorage.setItem('blockr-page-source', this.source.on ? 'on' : 'off');
        localStorage.setItem('blockr-page-source-fmt', this.source.fmt);
        this.sendSource();
        this.render();
      };
      const click = id => { const a = this.el.querySelector(`.bp-offscreen a[id$="${id}"]`); if (a) a.click(); };
      const items = [
        { label: 'Contents', current: !src, onSelect: () => show(null) },
        { label: 'Quarto', meta: '.qmd', mono: true, current: src && fmt === 'qmd', onSelect: () => show('qmd') },
        { label: 'R script', meta: '.R', mono: true, current: src && fmt === 'R', onSelect: () => show('R') }
      ];
      if (src) {
        items.push({ divider: true },
          { label: 'Download', meta: '.' + fmt, mono: true, onSelect: () => click('page_dl') },
          { label: 'Render HTML', onSelect: () => click('page_html') });
      }
      this.menu(anchor, { items: items });
    }

    blockMoreMenu(index, id, anchor) {
      this.menu(anchor, { align: 'end', items: [
        { label: 'Move up', onSelect: () => this.send({ type: 'move', index: index, dir: -1 }) },
        { label: 'Move down', onSelect: () => this.send({ type: 'move', index: index, dir: 1 }) },
        { label: 'Copy block ID', meta: id, mono: true, onSelect: () => navigator.clipboard && navigator.clipboard.writeText(id) },
        { divider: true },
        { label: 'Remove block', icon: 'trash', danger: true, onSelect: () => this.send({ type: 'remove', index: index }) }
      ] });
    }

    itemMenu(index, anchor) {
      if (index < 0) return;
      const it = this.state.items[index];
      this.menu(anchor, { items: [
        { label: 'Move up', onSelect: () => this.send({ type: 'move', index: index, dir: -1 }) },
        { label: 'Move down', onSelect: () => this.send({ type: 'move', index: index, dir: 1 }) },
        { divider: true },
        { label: it.block != null ? 'Remove block' : 'Remove', icon: 'trash', danger: true,
          onSelect: () => this.send({ type: 'remove', index: index }) }
      ] });
    }

    /* ---- drag from a dot --------------------------------------------------------------- */
    startDrag(e, id) {
      e.preventDefault();
      this.closeMenu();
      const items = this.state.items;
      const srcIdx = items.findIndex(it => it.block === id);
      const wr = () => this.wrap.getBoundingClientRect();
      const dot = this.rail.querySelector(`.bp-dot[data-id="${CSS.escape(id)}"]`);
      const dr = dot.getBoundingClientRect();
      const x0 = dr.left + dr.width / 2 - wr().left, y0 = dr.top + dr.height / 2 - wr().top;
      const wire = document.createElementNS(SVG_NS, 'svg');
      wire.setAttribute('class', 'bp-wire');
      const path = document.createElementNS(SVG_NS, 'path');
      wire.appendChild(path);
      this.wrap.appendChild(wire);
      const say = document.createElement('div');
      say.className = 'bp-say';
      this.el.appendChild(say);
      let moved = false, target = null, last = null;
      this.tip.classList.remove('bp-show');
      this.hl(id);

      const clear = () => {
        this.doc.querySelectorAll('.bp-drop-ok,.bp-drop-no').forEach(n => n.classList.remove('bp-drop-ok', 'bp-drop-no'));
        this.doc.querySelectorAll('.bp-ins.bp-drop').forEach(n => n.classList.remove('bp-drop'));
      };
      const sayAt = (ev, msg, bad) => {
        const r = this.el.getBoundingClientRect();
        say.textContent = msg;
        say.className = 'bp-say bp-show' + (bad ? ' bp-bad' : '');
        say.style.left = (ev.clientX - r.left + 14) + 'px';
        say.style.top = (ev.clientY - r.top + 16) + 'px';
      };
      const verdict = to => {
        const ti = items.findIndex(it => it.block === to);
        if (ti < srcIdx) return [false, `${this.blockName(to)} sits above ${this.blockName(id)}`];
        if (this.parents(to).includes(id)) return [false, `${this.blockName(to)} already reads from ${this.blockName(id)}`];
        if (this.ancestors(id).has(to)) return [false, 'That would make a cycle'];
        const b = this.state.blocks[to];
        if (b && b.free === false) return [false, `All inputs of ${this.blockName(to)} are taken`];
        return [true, 'Connect to ' + this.blockName(to)];
      };
      const onMove = ev => {
        last = ev;
        const r = wr(), x = ev.clientX - r.left, y = ev.clientY - r.top;
        if (Math.abs(x - x0) + Math.abs(y - y0) > 6) { moved = true; this.el.classList.add('bp-dragging'); }
        if (!moved) return;
        const dx = x - x0, dy = y - y0, bend = Math.min(36, Math.abs(dx) * .5) * (dx < 0 ? -1 : 1);
        path.setAttribute('d', `M${x0},${y0} C${x0 + bend},${y0 + dy * .2} ${x - bend},${y - dy * .2} ${x},${y}`);
        clear(); target = null; say.className = 'bp-say';
        const el = document.elementFromPoint(ev.clientX, ev.clientY);
        let blk = el && el.closest('.bp-blk');
        if (!blk) {
          const near = [...this.rail.querySelectorAll('.bp-dot')].find(d => {
            const b = d.getBoundingClientRect();
            return Math.hypot(b.left + b.width / 2 - ev.clientX, b.top + b.height / 2 - ev.clientY) < 14;
          });
          if (near) blk = this.doc.querySelector(`:scope > .bp-blk[data-block-id="${CSS.escape(near.dataset.id)}"]`);
        }
        if (blk && blk.dataset.blockId === id) return;
        if (blk && !blk.classList.contains('bp-compact')) {
          const [ok, msg] = verdict(blk.dataset.blockId);
          blk.classList.add(ok ? 'bp-drop-ok' : 'bp-drop-no');
          sayAt(ev, msg, !ok);
          if (ok) target = { type: 'link', to: blk.dataset.blockId };
          return;
        }
        if (ev.clientY < dr.top - 10) { sayAt(ev, 'New blocks go below ' + this.blockName(id), true); return; }
        let best = null, bd = Infinity;
        this.doc.querySelectorAll(':scope > .bp-ins').forEach(n => {
          if (+n.dataset.at <= srcIdx) return;
          const b = n.getBoundingClientRect(), d = Math.abs(b.top + b.height / 2 - ev.clientY);
          if (d < bd) { bd = d; best = n; }
        });
        if (best) {
          best.classList.add('bp-drop');
          best.dataset.label = 'New block here, reads from ' + this.blockName(id);
          target = { type: 'gap', ins: best };
        }
      };
      // Near the top or bottom edge the document scrolls under the wire.
      const tick = setInterval(() => {
        if (!last || !moved) return;
        const sr = this.scrollEl.getBoundingClientRect();
        const step = last.clientY > sr.bottom - 60 ? 16 : last.clientY < sr.top + 60 ? -16 : 0;
        if (step) { this.scrollEl.scrollTop += step; onMove(last); }
      }, 16);
      const onUp = () => {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        clearInterval(tick);
        this.el.classList.remove('bp-dragging');
        wire.remove(); say.remove(); clear(); this.hl(null);
        if (!moved) {
          const ins = this.doc.querySelector(`:scope > .bp-ins[data-at="${srcIdx + 1}"]`);
          if (ins) this.blockMenu(ins.querySelector('.bp-insbtn'), srcIdx + 1, id);
          return;
        }
        if (!target) return;
        if (target.type === 'link') return this.send({ type: 'connect', from: id, to: target.to });
        const ins = target.ins;
        ins.classList.add('bp-drop');
        this.blockMenu(ins.querySelector('.bp-insline'), +ins.dataset.at, id, () => ins.classList.remove('bp-drop'));
      };
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    }

    // Drag an item by its grip into another gap. A block stays below the
    // blocks it reads from and above the ones that read from it; outside
    // that range the gap says why and nothing moves.
    startMove(e, index) {
      const it = this.state.items[index];
      if (!it) return;
      const pos = id => this.state.items.findIndex(x => x.block === id);
      let lo = 0, hi = this.state.items.length, loWhy = null, hiWhy = null;
      if (it.block != null) {
        this.parents(it.block).forEach(p => { const k = pos(p) + 1; if (k > lo) { lo = k; loWhy = p; } });
        this.state.links.forEach(l => {
          if (l.from !== it.block) return;
          const k = pos(l.to);
          if (k >= 0 && k < hi) { hi = k; hiWhy = l.to; }
        });
      }
      const node = it.block != null
        ? this.doc.querySelector(`:scope > .bp-blk[data-block-id="${CSS.escape(it.block)}"]`)
        : this.doc.querySelector(`:scope > .bp-text[data-index="${index}"]`);
      const say = document.createElement('div');
      say.className = 'bp-say';
      this.el.appendChild(say);
      const x0 = e.clientX, y0 = e.clientY;
      let moved = false, target = null, last = null;
      const clear = () => this.doc.querySelectorAll('.bp-ins.bp-drop, .bp-ins.bp-drop-bad')
        .forEach(n => n.classList.remove('bp-drop', 'bp-drop-bad'));
      const onMove = ev => {
        last = ev;
        if (!moved && Math.abs(ev.clientX - x0) + Math.abs(ev.clientY - y0) < 6) return;
        if (!moved) {
          moved = true;
          this.el.classList.add('bp-dragging');
          if (node) node.classList.add('bp-moving');
        }
        clear(); target = null; say.className = 'bp-say';
        let best = null, bd = Infinity;
        this.doc.querySelectorAll(':scope > .bp-ins').forEach(n => {
          const b = n.getBoundingClientRect(), d = Math.abs(b.top + b.height / 2 - ev.clientY);
          if (d < bd) { bd = d; best = n; }
        });
        if (!best) return;
        const at = +best.dataset.at;
        if (at === index || at === index + 1) return;
        const r = this.el.getBoundingClientRect();
        const sayAt = msg => {
          say.textContent = msg;
          say.className = 'bp-say bp-show bp-bad';
          say.style.left = (ev.clientX - r.left + 14) + 'px';
          say.style.top = (ev.clientY - r.top + 16) + 'px';
        };
        if (at < lo) { best.classList.add('bp-drop-bad'); return sayAt(`${this.blockName(it.block)} reads from ${this.blockName(loWhy)}, so it stays below it`); }
        if (at > hi) { best.classList.add('bp-drop-bad'); return sayAt(`${this.blockName(hiWhy)} reads from ${this.blockName(it.block)}, so it stays above it`); }
        best.classList.add('bp-drop');
        best.dataset.label = 'Move here';
        target = at;
      };
      const tick = setInterval(() => {
        if (!last || !moved) return;
        const sr = this.scrollEl.getBoundingClientRect();
        const step = last.clientY > sr.bottom - 60 ? 16 : last.clientY < sr.top + 60 ? -16 : 0;
        if (step) { this.scrollEl.scrollTop += step; onMove(last); }
      }, 16);
      const onUp = () => {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        clearInterval(tick);
        say.remove(); clear();
        this.el.classList.remove('bp-dragging');
        if (node) node.classList.remove('bp-moving');
        if (!moved) return;
        this._dragged = true;
        setTimeout(() => { this._dragged = false; }, 0);
        if (target != null) this.send({ type: 'move_to', index: index, at: target });
      };
      e.preventDefault();
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    }

    toast(msg) {
      this.toastEl.textContent = msg;
      this.toastEl.classList.add('bp-show');
      clearTimeout(this._tt);
      this._tt = setTimeout(() => this.toastEl.classList.remove('bp-show'), 2800);
    }

    /* ---- the gutter --------------------------------------------------------------------- */
    scheduleRail() {
      if (this._raf) return;
      this._raf = requestAnimationFrame(() => { this._raf = null; this.drawRail(); this.spy(); });
    }

    drawRail() {
      if (this.gutterOff) { this.rail.innerHTML = ''; return; }
      const phone = this.el.clientWidth < 760;
      const o = phone ? { laneW: 10, x0: 8, r: 6, dot: 4, pad: 6, gap: 6 } : { laneW: 16, x0: 14, r: 10, dot: 5, pad: 10, gap: 36 };
      const wr = this.wrap.getBoundingClientRect();
      const ys = new Map();
      const nodes = [];
      this.state.items.forEach(it => {
        if (it.block == null) return;
        const el = this.doc.querySelector(`:scope > .bp-blk[data-block-id="${it.block}"]:not(.bp-unplaced)`);
        if (!el) return;
        const r = el.querySelector('.bp-bh').getBoundingClientRect();
        ys.set(it.block, r.top - wr.top + r.height / 2);
        nodes.push({ id: it.block, from: this.parents(it.block) });
      });
      const { lane, nLanes } = assignLanes(nodes);
      const lx = l => o.x0 + l * o.laneW;
      let s = '';
      nodes.forEach(n => n.from.forEach(p => {
        if (!ys.has(p)) return;
        const xp = lx(lane.get(p)), yp = ys.get(p), xc = lx(lane.get(n.id)), yc = ys.get(n.id);
        let d;
        if (yc < yp) {
          // an input below its consumer: a dashed hook, the order rule was bypassed
          d = `M${xp} ${yp}H${xp - 8}V${yc}H${xc}`;
          s += `<path class="bp-edge bp-edge-back" data-from="${p}" data-to="${n.id}" d="${d}"/>`;
          return;
        }
        if (xp === xc) d = `M${xp} ${yp}V${yc}`;
        else {
          const R = Math.min(o.r, Math.abs(xc - xp)), sg = Math.sign(xc - xp);
          d = `M${xp} ${yp}V${yc - R}Q${xp} ${yc} ${xp + sg * R} ${yc}H${xc}`;
        }
        s += `<path class="bp-edge" data-from="${p}" data-to="${n.id}" d="${d}"/>`;
      }));
      const steps = new Set(this.state.items.filter(it => it.output === false).map(it => it.block));
      nodes.forEach(n => {
        const x = lx(lane.get(n.id)), y = ys.get(n.id);
        s += steps.has(n.id)
          ? `<rect class="bp-dot bp-dot-step" data-id="${esc(n.id)}" x="${x - o.dot + .5}" y="${y - o.dot + .5}" width="${2 * o.dot - 1}" height="${2 * o.dot - 1}" rx="2"/>`
          : `<circle class="bp-dot" data-id="${esc(n.id)}" cx="${x}" cy="${y}" r="${o.dot}"/>`;
      });
      const railW = o.x0 + (nLanes - 1) * o.laneW + o.pad;
      this.rail.innerHTML = s;
      this.rail.setAttribute('width', railW);
      this.rail.setAttribute('height', this.wrap.scrollHeight);
      const gut = railW + o.gap;
      if (this._gut !== gut) {
        this._gut = gut;
        this.wrap.style.setProperty('--bp-gutter', gut + 'px');
        this.scheduleRail();
      }
    }

    hl(id) {
      const set = id ? this.ancestors(id) : null;
      this.rail.classList.toggle('bp-hl', !!set);
      this.rail.querySelectorAll('.bp-edge').forEach(e =>
        e.classList.toggle('bp-hot', !!set && set.has(e.dataset.to) && set.has(e.dataset.from)));
      this.rail.querySelectorAll('.bp-dot').forEach(d => d.classList.toggle('bp-hot', !!set && set.has(d.dataset.id)));
    }

    /* ---- contents ----------------------------------------------------------------------- */
    buildToc() {
      let h = this.read || this.narrow ? '<div class="bp-th">Contents</div>'
        : `<button type="button" class="bp-coltitle">Contents${ICON.chevron}</button>`;
      this.state.items.forEach((it, i) => {
        if (it.text != null) {
          const lvl = headingLevel(it.text);
          if (lvl) h += `<a class="bp-t-h bp-t-h${Math.min(lvl, 3)}" data-index="${i}">${esc(headingText(it.text))}</a>`;
        } else {
          h += `<a class="bp-t-b" data-block="${esc(it.block)}" data-index="${i}"><i></i>${esc(this.blockName(it.block))}</a>`;
        }
      });
      this.toc.innerHTML = h;
      this.spy();
    }

    spy() {
      const top = this.scrollEl.getBoundingClientRect().top + 90;
      let cur = -1;
      this.doc.querySelectorAll(':scope > .bp-blk:not(.bp-unplaced), :scope > .bp-text').forEach(el => {
        if (el.getBoundingClientRect().top < top) cur = Math.max(cur, this.itemIndexOf(el));
      });
      let best = null;
      this.toc.querySelectorAll('a').forEach(a => { if (+a.dataset.index <= cur) best = a; });
      this.toc.querySelectorAll('a').forEach(a => a.classList.toggle('bp-cur', a === best));
      const bid = best && best.dataset.block;
      this.rail.querySelectorAll('.bp-dot').forEach(d => d.classList.toggle('bp-cur', d.dataset.id === bid));
    }

    jumpTo(el) {
      if (!el) return;
      this.scrollEl.scrollTop += el.getBoundingClientRect().top - this.scrollEl.getBoundingClientRect().top - 24;
      el.classList.add('bp-flash');
      setTimeout(() => el.classList.remove('bp-flash'), 900);
    }
    jumpIndex(i) {
      const it = this.state.items[i];
      if (!it) return;
      if (it.block != null) return this.jumpBlock(it.block);
      this.jumpTo(this.doc.querySelector(`:scope > .bp-text[data-index="${i}"]`));
    }
    jumpBlock(id) {
      let node = this.doc.querySelector(`:scope > .bp-blk[data-block-id="${id}"]`);
      if (node && node.classList.contains('bp-compact')) {
        // unfold the section that hides it
        const idx = this.state.items.findIndex(it => it.block === id);
        for (let i = idx; i >= 0; i--) {
          const it = this.state.items[i];
          if (it.text != null && this.folded.has(headingText(it.text))) { this.folded.delete(headingText(it.text)); break; }
        }
        this.render();
        node = this.doc.querySelector(`:scope > .bp-blk[data-block-id="${id}"]`);
      }
      this.jumpTo(node);
    }
  }

  /* ---- wiring --------------------------------------------------------------------------- */
  const pages = new Map();
  function pageFor(target) {
    if (pages.has(target)) return pages.get(target);
    const el = document.getElementById(target);
    if (!el) return null;
    const p = new Page(el);
    pages.set(target, p);
    return p;
  }

  function register() {
    if (!window.Shiny || !Shiny.addCustomMessageHandler) return false;
    Shiny.addCustomMessageHandler('blockr-page', msg => { const p = pageFor(msg.target); if (p) p.update(msg); });
    Shiny.addCustomMessageHandler('blockr-page-toast', msg => { const p = pageFor(msg.target); if (p) p.toast(msg.msg); });
    Shiny.addCustomMessageHandler('blockr-page-code', msg => {
      const p = pageFor(msg.target);
      if (!p) return;
      Object.entries(asObj(msg.code)).forEach(([id, txt]) => {
        const n = p.doc.querySelector(`:scope > .bp-blk[data-block-id="${CSS.escape(id)}"] .bp-codeview`);
        if (n) n.textContent = txt;
      });
      p.scheduleRail();
    });
    Shiny.addCustomMessageHandler('blockr-page-source', msg => {
      const p = pageFor(msg.target);
      if (!p || msg.fmt !== p.source.fmt) return;
      p.source.pieces = msg.pieces || [];
      p.render();
    });
    return true;
  }
  if (!register()) document.addEventListener('DOMContentLoaded', register);
})();
