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
    link: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M6.5 9.5a3 3 0 0 0 4.2 0l2.3-2.3a3 3 0 0 0-4.2-4.2L7.6 4.2"/><path d="M9.5 6.5a3 3 0 0 0-4.2 0L3 8.8A3 3 0 0 0 7.2 13l1.2-1.2"/></svg>',
    close: '<svg viewBox="0 0 16 16"><path d="M4 4l8 8M12 4l-8 8" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
    plus: '<svg viewBox="0 0 10 10"><path d="M5 1.5v7M1.5 5h7" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>',
    grip: '<svg viewBox="0 0 16 16" fill="currentColor"><circle cx="5.5" cy="3" r="1.3"/><circle cx="10.5" cy="3" r="1.3"/><circle cx="5.5" cy="8" r="1.3"/><circle cx="10.5" cy="8" r="1.3"/><circle cx="5.5" cy="13" r="1.3"/><circle cx="10.5" cy="13" r="1.3"/></svg>',
    chev: '<svg viewBox="0 0 16 16" fill="currentColor"><path fill-rule="evenodd" d="M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708z"/></svg>',
    branch: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="4" cy="3" r="1.6"/><circle cx="4" cy="13" r="1.6"/><circle cx="12" cy="6" r="1.6"/><path d="M4 4.6v6.8M12 7.6c0 3-4 2.5-7.2 4.4"/></svg>',
    text: '<svg viewBox="0 0 16 16" fill="currentColor"><path d="M2 3.5a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11a.5.5 0 0 1-.5-.5zm0 3a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11a.5.5 0 0 1-.5-.5zm0 3a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11a.5.5 0 0 1-.5-.5zm0 3a.5.5 0 0 1 .5-.5h6a.5.5 0 0 1 0 1h-6a.5.5 0 0 1-.5-.5z"/></svg>',
    heading: '<svg viewBox="0 0 16 16" fill="currentColor"><path d="M3 2.5a.5.5 0 0 1 1 0V7h8V2.5a.5.5 0 0 1 1 0v11a.5.5 0 0 1-1 0V8H4v5.5a.5.5 0 0 1-1 0v-11z"/></svg>',
    up: '<svg viewBox="0 0 16 16" fill="currentColor"><path d="M8 3.3 3.6 7.7a.5.5 0 0 0 .7.7L7.5 5.2V13a.5.5 0 0 0 1 0V5.2l3.2 3.2a.5.5 0 0 0 .7-.7L8 3.3z"/></svg>',
    down: '<svg viewBox="0 0 16 16" fill="currentColor"><path d="M8 12.7 3.6 8.3a.5.5 0 0 1 .7-.7l3.2 3.2V3a.5.5 0 0 1 1 0v7.8l3.2-3.2a.5.5 0 0 1 .7.7L8 12.7z"/></svg>',
    trash: '<svg viewBox="0 0 16 16" fill="currentColor"><path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6zM14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1 0-2H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.1 4 4 4.1V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.1L11.9 4H4.1z"/></svg>'
  };

  const esc = s => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  // Shiny sends an empty named list as [].
  const asObj = x => (x && !Array.isArray(x)) ? x : {};

  // A text is edited as it reads and stored as markdown: the edited HTML
  // back to markdown, for what the editor can make (paragraphs, bold,
  // italic, links, code, lists, headings, quotes).
  function mdInline(node) {
    let out = '';
    node.childNodes.forEach(n => {
      if (n.nodeType === 3) { out += n.nodeValue.replace(/\u00a0/g, ' '); return; }
      if (n.nodeType !== 1) return;
      const tag = n.tagName.toLowerCase(), inner = mdInline(n);
      const wrap = m => {
        const t = inner.trim();
        if (!t) return inner;
        const lead = inner.match(/^\s*/)[0], tail = inner.match(/\s*$/)[0];
        return lead + m + t + m + tail;
      };
      if (tag === 'b' || tag === 'strong') out += wrap('**');
      else if (tag === 'i' || tag === 'em') out += wrap('*');
      else if (tag === 'code') out += wrap('`');
      else if (tag === 'a') out += `[${inner}](${n.getAttribute('href') || ''})`;
      else if (tag === 'br') out += '\n';
      else out += inner;
    });
    return out;
  }
  function htmlToMd(root) {
    const blocks = [];
    let loose = '';
    const flush = () => { if (loose.trim()) blocks.push(loose.trim()); loose = ''; };
    root.childNodes.forEach(n => {
      if (n.nodeType === 3) { loose += n.nodeValue; return; }
      if (n.nodeType !== 1) return;
      const tag = n.tagName.toLowerCase();
      if (/^(b|strong|i|em|a|code|span|br)$/.test(tag)) { loose += tag === 'br' ? '\n' : mdInline({ childNodes: [n] }); return; }
      flush();
      const h = /^h([1-6])$/.exec(tag);
      if (h) blocks.push('#'.repeat(+h[1]) + ' ' + mdInline(n).trim());
      else if (tag === 'ul' || tag === 'ol') {
        blocks.push([...n.children].map((li, k) => (tag === 'ol' ? (k + 1) + '. ' : '- ') + mdInline(li).trim()).join('\n'));
      } else if (tag === 'blockquote') blocks.push(htmlToMd(n).split('\n').map(l => '> ' + l).join('\n'));
      else if (tag === 'pre') blocks.push('```\n' + n.textContent.replace(/\n$/, '') + '\n```');
      else { const t = mdInline(n).trim(); if (t) blocks.push(t); }
    });
    flush();
    return blocks.join('\n\n');
  }

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
        pieces: null,
        head: null
      };
      this.tocOn = localStorage.getItem('blockr-page-toc') !== 'off';
      this.narrow = this.isNarrow();
      this.readOnly = el.classList.contains('bp-readonly');
      // a page served for readers (options(blockr.page.mode = "read"))
      this.read = this.readOnly;
      this.applyGutter();
      this.applyToc();
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
      this.el.querySelector('.bp-v-graph').classList.toggle('bp-on', !this.gutterOff);
    }
    // Contents: a column on wide views, a sheet over the page on narrow ones.
    applyToc() {
      this.el.classList.toggle('bp-no-toc', !this.tocOn);
      const on = this.narrow ? this.el.classList.contains('bp-toc-open') : this.tocOn;
      this.el.querySelector('.bp-v-toc').classList.toggle('bp-on', on);
    }

    // Source beside the page: wide views only, two columns do not fit a phone.
    sourceOn() { return this.source.on && !this.narrow && !this.read; }
    sendSource() {
      const on = this.sourceOn();
      this.el.classList.toggle('bp-source', on);
      this.el.querySelector('.bp-v-code').classList.toggle('bp-on', on);
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
      this.state = { items: msg.items || [], blocks: asObj(msg.blocks), links: msg.links || [], name: msg.name || 'Untitled page' };
      if (msg.fresh && !this.freshDone.has(msg.fresh)) this.pendingFresh = msg.fresh;
      if (this.pendingEdit != null) {
        const it = this.state.items[this.pendingEdit];
        if (it && (it.text != null || it.section != null)) this.editing = this.pendingEdit;
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
      blockNodes.forEach(n => this.waitFor(n));
      this.doc.querySelectorAll(':scope > .bp-gen').forEach(n => n.remove());

      // the page's title, the board's name, then the items; a folded
      // section hides what follows it up to the next section
      const seq = [this.titleNode()];
      if (src) seq.push(this.srcNode(-1, 0));
      let folded = false;
      items.forEach((it, i) => {
        const sec = it.section != null;
        if (sec) folded = false;
        const hidden = folded;
        if (!hidden) seq.push(this.insLine(i, false));
        if (it.block != null) {
          const node = blockNodes.get(it.block);
          if (node) {
            node.classList.toggle('bp-compact', hidden);
            node.classList.remove('bp-unplaced');
            // text is a prose block, shown as text
            const prose = !!(this.state.blocks[it.block] || {}).prose;
            node.classList.toggle('bp-prose', prose);
            // the report's two switches: Output off makes the block a step
            node.classList.toggle('bp-step', it.output === false && !prose);
            node.classList.toggle('bp-open', it.output === false && this.openSteps.has(it.block));
            node.classList.toggle('bp-code-on', it.code === true);
            seq.push(node);
            blockNodes.delete(it.block);
            if (src && !hidden) seq.push(this.srcNode(i, 0));
          }
        } else if (!hidden) {
          seq.push(sec ? this.sectionNode(it, i) : this.textNode(it, i));
          if (src) seq.push(this.srcNode(i, sec && this.editing !== i ? 2 : 0));
        }
        if (sec && this.folded.has(it.section)) folded = true;
      });
      seq.push(this.insLine(items.length, true));
      if (src) seq.unshift(this.srcHead());
      this.el.querySelector('.bp-nm').textContent = this.state.name;
      // blocks the board has but the reading order does not list yet
      blockNodes.forEach(n => n.classList.add('bp-unplaced'));

      let ref = this.doc.firstChild;
      for (const node of seq) {
        if (node === ref) { ref = ref.nextSibling; continue; }
        this.doc.insertBefore(node, ref);
      }

      const one = this.doc.querySelector('.bp-writer input');
      if (one) { one.focus(); one.select(); }
      const ed = this.doc.querySelector('.bp-writer .bp-ed');
      if (ed) {
        document.execCommand('defaultParagraphSeparator', false, 'p');
        ed.focus();
        const sel = document.getSelection();
        sel.selectAllChildren(ed);
        sel.collapseToEnd();
      }

      if (this.pendingFresh) {
        const node = this.doc.querySelector(`:scope > .bp-blk[data-block-id="${this.pendingFresh}"]:not(.bp-unplaced)`);
        if (node) {
          this.freshDone.add(this.pendingFresh);
          this.pendingFresh = null;
          if (node.classList.contains('bp-prose')) {
            // a new text: the cursor in it, once its editor is up
            let n = 0;
            const focus = () => {
              const pm = node.querySelector('.ProseMirror');
              if (pm) pm.focus();
              else if (n++ < 40) setTimeout(focus, 50);
            };
            focus();
          } else {
            if (node.classList.contains('bp-out-hidden')) {
              node.classList.add('bp-band-open');
              this.shown(node);
            } else {
              this.openPanel(node.dataset.blockId);
            }
            setTimeout(() => this.jumpTo(node), 50);
          }
        }
      }

      this.buildToc();
      this.refreshPanel();
      // the cards are on the page before the first order arrives; show it once laid out
      this.el.classList.add('bp-laid-out');
      this.scheduleRail();
      if (this.mo) this.mo.takeRecords();
    }

    insLine(at, last) {
      const d = document.createElement('div');
      d.className = 'bp-ins bp-gen' + (last ? ' bp-ins-last' : '');
      d.dataset.at = at;
      d.innerHTML = last
        ? `<button type="button" class="bp-insbtn">${ICON.plus}<span class="bp-insl">Add block</span></button>`
        : '<span class="bp-insline"></span>';
      return d;
    }

    // The page's title: the board's name. A click renames it.
    titleNode() {
      const d = document.createElement('div');
      d.className = 'bp-title bp-gen';
      if (this.editing === 'title') {
        d.classList.add('bp-writer', 'bp-title-writer');
        d.innerHTML = `<input type="text" spellcheck="true" value="${esc(this.state.name)}" aria-label="Page title">`;
      } else {
        d.innerHTML = `<h1>${esc(this.state.name)}</h1>`;
      }
      return d;
    }

    textNode(it, i) {
      const d = document.createElement('div');
      d.dataset.index = i;
      if (this.editing === i) {
        // edited as it reads, on the tint it has under the pointer
        d.className = 'bp-writer bp-text-writer bp-gen';
        d.innerHTML = `<div class="bp-ed" contenteditable="true" spellcheck="true">${it.text.trim() ? it.html : '<p><br></p>'}</div>`;
        return d;
      }
      d.className = 'bp-text bp-gen' + (it.text.trim() ? '' : ' bp-text-empty');
      d.innerHTML = `<button type="button" class="bp-handle bp-hb bp-hb-s" aria-label="Move or remove">${ICON.grip}</button>` +
        (it.html || '<p class="bp-placeholder">Empty text</p>');
      return d;
    }

    // A section: the page's one level of headings, a view on a dock board.
    sectionNode(it, i) {
      const d = document.createElement('div');
      d.dataset.index = i;
      if (this.editing === i) {
        d.className = 'bp-writer bp-sec-writer bp-gen';
        d.innerHTML = `<input type="text" spellcheck="true" value="${esc(it.section)}" placeholder="Section title" aria-label="Section title">`;
        return d;
      }
      const folded = this.folded.has(it.section);
      d.className = 'bp-text bp-heading bp-section bp-gen' + (folded ? ' bp-folded' : '');
      d.innerHTML = `<button type="button" class="bp-handle bp-hb bp-hb-s" aria-label="Move or remove">${ICON.grip}</button>` +
        `<h2>${esc(it.section) || '<span class="bp-placeholder">Untitled section</span>'}` +
        `<button type="button" class="bp-fold bp-hb bp-hb-s" aria-label="Fold section">${ICON.chev}</button>` +
        (folded ? '<span class="bp-foldn">folded</span>' : '') + '</h2>';
      return d;
    }

    // An item's source, in the second column beside it. Headings carry their
    // own top margin, which the source line matches.
    srcNode(i, lvl) {
      const d = document.createElement('div');
      const it = i < 0 ? {} : this.state.items[i];
      d.className = 'bp-src bp-gen' + (it.block != null ? ' bp-src-chunk' : '') + (lvl ? ' bp-src-h' + Math.min(lvl, 3) : '') + (i < 0 ? ' bp-src-head' : '');
      d.dataset.src = i;
      const txt = i < 0 ? this.source.head : this.source.pieces && this.source.pieces[i];
      d.innerHTML = txt == null ? '' : txt.split('\n').map(l => `<div class="bp-ln${lineClass(l)}">${tint(l) || '&nbsp;'}</div>`).join('');
      return d;
    }

    srcHead() {
      const d = document.createElement('div');
      d.className = 'bp-srchead bp-gen';
      const f = this.source.fmt;
      d.innerHTML = `<span class="bp-fmt"><button type="button" data-fmt="qmd" class="${f === 'qmd' ? 'bp-on' : ''}">.qmd</button>` +
        `<button type="button" data-fmt="R" class="${f === 'R' ? 'bp-on' : ''}">.R</button></span>` +
        '<span class="bp-bsp"></span><button type="button" class="bp-srcact" data-dl="page_dl">Download</button>' +
        '<button type="button" class="bp-srcact" data-dl="page_html">Render HTML</button>';
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
        const one = e.target.tagName === 'INPUT';
        if (e.key === 'Enter' && (one || e.ctrlKey || e.metaKey)) { e.preventDefault(); this.finishEdit(true); }
        if (e.key === 'k' && (e.ctrlKey || e.metaKey) && !one) { e.preventDefault(); this.fmt('link'); }
        if (e.key === 'Escape') { e.preventDefault(); this.finishEdit(false); }
      });
      // The texts read as one document: at a text's edge the arrow keys go
      // on to the next text, Backspace and Delete join two texts that touch.
      this.doc.addEventListener('prose-edge', e => this.onEdge(e));
      this.doc.addEventListener('prose-slash', e => this.onSlash(e));
      this.doc.addEventListener('prose-at', e => this.onAt(e));
      // the text written in last, where a value from a table goes
      this.doc.addEventListener('focusin', e => {
        const host = e.target.closest && e.target.closest('.bp-blk.bp-prose');
        if (host) this._lastText = host.dataset.blockId;
      });
      // A text left empty goes.
      this.doc.addEventListener('focusout', e => {
        const host = e.target.closest && e.target.closest('.bp-blk.bp-prose');
        if (host && !this.read) setTimeout(() => this.dropIfEmpty(host), 0);
        if (host) setTimeout(() => this.placePlus(), 0);
      });
      // Below the last item is where the next sentence goes.
      this.wrap.addEventListener('click', e => {
        if (this.read || (e.target !== this.wrap && e.target !== this.doc)) return;
        const last = this.doc.lastElementChild;
        if (last && e.clientY > last.getBoundingClientRect().bottom) this.writeAt(this.state.items.length);
      });
      // Cmd/Ctrl+Z outside a text undoes the page's last change: a block
      // added, removed or moved, two texts joined. In a text it is the
      // text's own.
      document.addEventListener('keydown', e => {
        const k = (e.key || '').toLowerCase();
        if (!(e.metaKey || e.ctrlKey) || e.altKey || (k !== 'z' && k !== 'y') || this.read) return;
        if (e.target.closest && e.target.closest('.ProseMirror, input, textarea, select, [contenteditable="true"], .blockr-menu')) return;
        e.preventDefault();
        this.send({ type: k === 'y' || e.shiftKey ? 'redo' : 'undo' });
      });
      // Cmd/Ctrl+F: find, and replace, in the page's texts.
      document.addEventListener('keydown', e => {
        if (!(e.metaKey || e.ctrlKey) || e.altKey || (e.key || '').toLowerCase() !== 'f') return;
        if (!this.el.isConnected) return;
        e.preventDefault();
        this.openFind();
      });
      // Escape closes the panel, unless a menu or a field has it.
      document.addEventListener('keydown', e => {
        if (e.key !== 'Escape' || !this.panelFor || this.openMenu || e.defaultPrevented) return;
        if (e.target.closest && e.target.closest('.ProseMirror, input, textarea, select, .blockr-menu')) return;
        this.closePanel();
      });
      // Pasted text comes in plain.
      this.doc.addEventListener('paste', e => {
        if (!e.target.closest('.bp-ed')) return;
        e.preventDefault();
        document.execCommand('insertText', false, (e.clipboardData || window.clipboardData).getData('text/plain'));
      });
      // A click outside a text being edited keeps it.
      document.addEventListener('mousedown', e => {
        if (!this.doc.querySelector('.bp-writer .bp-ed')) return;
        if (e.target.closest('.bp-text-writer, .bp-fmtbar')) return;
        this.finishEdit(true);
      }, true);
      // Selected words in a text being edited get a small bar: bold, italic, link.
      document.addEventListener('selectionchange', () => { this.placeBar(); this.placePlus(); });
      // A title or a section commits when it loses the focus.
      this.doc.addEventListener('focusout', e => {
        if (e.target.tagName === 'INPUT' && e.target.closest('.bp-writer')) setTimeout(() => this.finishEdit(true), 0);
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
      // The item under the pointer, from pointer events: its hover buttons
      // show while it holds the class. CSS :hover goes stale when the page
      // re-renders under a pointer that is not moving.
      const setZone = z => {
        if (this.zone === z) return;
        if (this.zone) this.zone.classList.remove('bp-hover');
        this.zone = z;
        if (z) z.classList.add('bp-hover');
      };
      this.doc.addEventListener('pointermove', e => setZone(e.target.closest('.bp-blk, .bp-text, .bp-ins')));
      this.doc.addEventListener('pointerleave', () => setZone(null));
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
        this.applyToc();
        if (a.dataset.block) this.jumpBlock(a.dataset.block);
        else this.jumpIndex(+a.dataset.index);
      });
      // The three switches in the bar: graph, code, contents.
      this.el.querySelector('.bp-v-graph').addEventListener('click', () => {
        localStorage.setItem(this.gutterKey(), this.gutterOff ? 'on' : 'off');
        this.applyGutter();
        this.scheduleRail();
      });
      this.el.querySelector('.bp-v-code').addEventListener('click', () => {
        this.source.on = !this.sourceOn();
        localStorage.setItem('blockr-page-source', this.source.on ? 'on' : 'off');
        this.sendSource();
        this.render();
      });
      this.el.querySelector('.bp-v-toc').addEventListener('click', () => {
        if (this.narrow) this.el.classList.toggle('bp-toc-open');
        else {
          this.tocOn = !this.tocOn;
          localStorage.setItem('blockr-page-toc', this.tocOn ? 'on' : 'off');
        }
        this.applyToc();
        this.scheduleRail();
      });
      this.el.querySelector('.bp-name').addEventListener('click', e => this.nameMenu(e.currentTarget));
      this.el.querySelector('.bp-save').addEventListener('click', e => this.saveMenu(e.currentTarget));
      // The source's head: Quarto or R script, Download, Render HTML.
      this.doc.addEventListener('click', e => {
        const f = e.target.closest('.bp-srchead [data-fmt]');
        if (f && f.dataset.fmt !== this.source.fmt) {
          this.source.fmt = f.dataset.fmt;
          localStorage.setItem('blockr-page-source-fmt', this.source.fmt);
          this.sendSource();
          this.render();
        }
        const d = e.target.closest('.bp-srchead [data-dl]');
        if (d) {
          const a = this.el.querySelector(`.bp-offscreen a[id$="${d.dataset.dl}"]`);
          if (a) a.click();
        }
      });
      window.addEventListener('resize', () => {
        const n = this.isNarrow();
        if (n === this.narrow) return;
        this.narrow = n;
        this.el.classList.remove('bp-toc-open');
        this.applyGutter();
        this.applyToc();
        this.sendSource();
        this.render();
      });
      this.scrollEl.addEventListener('scroll', () => this.spy(), { passive: true });
      // Outputs settle after first paint (plots, tables): redraw the gutter then.
      if (window.ResizeObserver) new ResizeObserver(() => this.scheduleRail()).observe(this.doc);
      // A block's first result ends its skeleton. An output block waits for
      // all its outputs; once Shiny has been idle for a while without a new
      // value, whatever still waits is shown as it is.
      if (window.jQuery) {
        window.jQuery(this.doc).on('shiny:value shiny:error', e => {
          if (this._quiet) { clearTimeout(this._quiet); this._quiet = setTimeout(() => this.releaseAll(), 1500); }
          const blk = e.target.closest && e.target.closest('.bp-blk.bp-loading[data-bp-wait="output"]');
          if (!blk || !e.target.closest('.bp-out')) return;
          e.target.dataset.bpGot = '1';
          const outs = [...blk.querySelectorAll('.bp-out .shiny-bound-output')];
          if (outs.every(o => o === e.target || o.dataset.bpGot)) requestAnimationFrame(() => this.ready(blk));
        });
        window.jQuery(document).on('shiny:idle', () => {
          clearTimeout(this._quiet);
          this._quiet = setTimeout(() => this.releaseAll(), 1500);
        });
      }
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
      // a click in the space between two items writes there
      const gap = t.closest('.bp-ins');
      if (gap && !gap.classList.contains('bp-ins-last')) return this.writeAt(+gap.dataset.at);
      if (t.closest('.bp-handle')) {
        if (this._dragged) { this._dragged = false; return; }
        return this.itemMenu(this.itemIndexOf(t), t.closest('.bp-handle'));
      }
      if (t.closest('.bp-fold')) {
        const key = this.state.items[this.itemIndexOf(t)].section;
        this.folded.has(key) ? this.folded.delete(key) : this.folded.add(key);
        return this.render();
      }
      // a cell of a table: its value into the text
      const td = t.closest('.bp-out table.blockr-table td:not(.blockr-row-number)');
      if (blk && td && !blk.classList.contains('bp-prose')) return this.cellMenu(blk.dataset.blockId, td);
      if (blk && t.closest('.bp-bh')) {
        if (blk.classList.contains('bp-compact')) return this.jumpBlock(blk.dataset.blockId);
        const idx = this.itemIndexOf(blk);
        if (t.closest('.bp-code-t')) return this.send({ type: 'toggle', index: idx, field: 'code' });
        if (t.closest('.bp-eye-t')) return this.send({ type: 'toggle', index: idx, field: 'output' });
        if (t.closest('.bp-more')) return this.blockMoreMenu(idx, blk.dataset.blockId, t.closest('.bp-more'));
        // a chart's settings are part of its chart: they open where it is
        if (t.closest('.bp-ctl-t') && blk.classList.contains('bp-out-hidden')) {
          blk.classList.toggle('bp-band-open');
          this.shown(blk);
          return this.scheduleRail();
        }
        // Controls, the block's name, a step's line: its settings, beside the text
        if (t.closest('.bp-ctl-t') || !t.closest('.bp-gh, .bp-handle')) {
          return this.togglePanel(blk.dataset.blockId);
        }
        return;
      }
      if (t.closest('.bp-title h1')) {
        this.editing = 'title';
        return this.render();
      }
      const txt = t.closest('.bp-text');
      if (txt && !t.closest('a')) {
        this.editing = +txt.dataset.index;
        this.render();
      }
    }

    /* ---- the texts as one document ---------------------------------------------- */
    isProse(it) { return !!it && it.block != null && !!(this.state.blocks[it.block] || {}).prose; }
    blockNode(id) { return this.doc.querySelector(`:scope > .bp-blk[data-block-id="${CSS.escape(id)}"]`); }
    proseOf(id) {
      const n = this.blockNode(id);
      const el = n && n.querySelector('.blockr-prose');
      return el ? el.blockrProse : null;
    }
    // the nearest text before (step -1) or after (+1) item i that shows
    textNear(i, step) {
      const items = this.state.items;
      for (let j = i + step; j >= 0 && j < items.length; j += step) {
        if (!this.isProse(items[j])) continue;
        const n = this.blockNode(items[j].block);
        if (n && !n.classList.contains('bp-compact')) return j;
      }
      return -1;
    }
    focusItem(j, where, x) {
      const p = this.proseOf(this.state.items[j].block);
      if (p) p.focusAt(where, x);
    }
    // Writing at gap `at`: in the text that touches it, or in a new one.
    writeAt(at) {
      const items = this.state.items;
      if (at > 0 && this.isProse(items[at - 1])) return this.focusItem(at - 1, 'end');
      if (at < items.length && this.isProse(items[at])) return this.focusItem(at, 'start');
      this.send({ type: 'add_block', at: at, registry: 'new_prose_block', from: '' });
    }
    dropIfEmpty(host) {
      if (!host.isConnected || host.contains(document.activeElement) || this.slashing === host) return;
      const p = host.querySelector('.blockr-prose');
      const inst = p && p.blockrProse;
      if (!inst || inst.field || !inst.isEmpty()) return;
      const i = this.itemIndexOf(host);
      if (i >= 0) this.send({ type: 'remove', index: i });
    }
    onEdge(e) {
      if (this.read) return;
      const blk = e.target.closest('.bp-blk');
      const i = blk ? this.itemIndexOf(blk) : -1;
      if (i < 0) return;
      const { dir, x, empty } = e.detail;
      const items = this.state.items;
      if (dir === 'up' || dir === 'left' || dir === 'down' || dir === 'right') {
        const back = dir === 'up' || dir === 'left';
        const j = this.textNear(i, back ? -1 : 1);
        if (j < 0) return;
        e.preventDefault();
        const where = { up: 'last', left: 'end', down: 'first', right: 'start' }[dir];
        return this.focusItem(j, where, x);
      }
      if (dir === 'back') {
        if (i > 0 && this.isProse(items[i - 1])) {
          const a = this.proseOf(items[i - 1].block), b = this.proseOf(items[i].block);
          if (!a || !b) return;
          e.preventDefault();
          const was = a.text();
          a.join(b.text());
          // undo brings both texts back as they were
          return this.send({ type: 'remove', index: i, texts: [items[i - 1].block], prior: { [items[i - 1].block]: was } });
        }
        if (empty) {
          e.preventDefault();
          const j = this.textNear(i, -1);
          if (j >= 0) this.focusItem(j, 'end');
          return this.send({ type: 'remove', index: i });
        }
        return;
      }
      if (dir === 'forward' && i + 1 < items.length && this.isProse(items[i + 1])) {
        const a = this.proseOf(items[i].block), b = this.proseOf(items[i + 1].block);
        if (!a || !b) return;
        e.preventDefault();
        const was = a.text();
        a.join(b.text());
        this.send({ type: 'remove', index: i + 1, texts: [items[i].block], prior: { [items[i].block]: was } });
      }
    }

    // The bar over selected words: bold, italic, link. One per page, kept out
    // of the document so a render does not take it.
    bar() {
      if (this._bar) return this._bar;
      const b = document.createElement('div');
      b.className = 'bp-fmtbar';
      b.innerHTML = '<button type="button" data-f="bold" aria-label="Bold"><b>B</b></button>' +
        '<button type="button" data-f="italic" aria-label="Italic"><i>I</i></button>' +
        `<button type="button" data-f="link" aria-label="Link">${ICON.link}</button>` +
        '<input type="url" placeholder="Paste a link" aria-label="Link">';
      b.addEventListener('mousedown', e => { if (e.target.tagName !== 'INPUT') e.preventDefault(); });
      b.addEventListener('click', e => { const f = e.target.closest('[data-f]'); if (f) this.fmt(f.dataset.f); });
      const inp = b.querySelector('input');
      inp.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
          e.preventDefault();
          const url = inp.value.trim();
          this.restoreSel();
          if (url) document.execCommand('createLink', false, /^[a-z]+:/i.test(url) ? url : 'https://' + url);
          b.classList.remove('bp-linking');
          this.placeBar();
        }
        if (e.key === 'Escape') { e.preventDefault(); b.classList.remove('bp-linking'); this.restoreSel(); }
      });
      this.el.appendChild(b);
      this._bar = b;
      return b;
    }
    placeBar() {
      const ed = this.doc.querySelector('.bp-writer .bp-ed');
      const b = this._bar;
      if (b && b.classList.contains('bp-linking')) return;
      const sel = document.getSelection();
      if (!ed || !sel.rangeCount || sel.isCollapsed || !ed.contains(sel.anchorNode)) { this.hideBar(); return; }
      const bar = this.bar();
      const r = sel.getRangeAt(0).getBoundingClientRect(), pr = this.el.getBoundingClientRect();
      bar.classList.add('bp-show');
      bar.style.left = Math.max(8, r.left + r.width / 2 - pr.left - bar.offsetWidth / 2) + 'px';
      bar.style.top = (r.top - pr.top - bar.offsetHeight - 8) + 'px';
    }
    hideBar() { if (this._bar) this._bar.classList.remove('bp-show', 'bp-linking'); }
    restoreSel() {
      const ed = this.doc.querySelector('.bp-writer .bp-ed');
      if (!ed || !this._range) return;
      ed.focus();
      const sel = document.getSelection();
      sel.removeAllRanges();
      sel.addRange(this._range);
    }
    fmt(f) {
      if (f === 'bold' || f === 'italic') { document.execCommand(f); return; }
      // a link: on a link, take it off; otherwise ask for the address
      const sel = document.getSelection();
      if (!sel.rangeCount) return;
      const a = sel.anchorNode && sel.anchorNode.parentElement && sel.anchorNode.parentElement.closest('a');
      if (a) { document.execCommand('unlink'); return; }
      if (sel.isCollapsed) return;
      this._range = sel.getRangeAt(0).cloneRange();
      const b = this.bar();
      b.classList.add('bp-show', 'bp-linking');
      const inp = b.querySelector('input');
      inp.value = '';
      inp.focus();
    }

    finishEdit(save) {
      const w = this.doc.querySelector('.bp-writer');
      if (!w) return;
      const ed = w.querySelector('.bp-ed');
      const val = ed ? htmlToMd(ed) : w.querySelector('input').value;
      this.hideBar();
      if (this.editing === 'title') {
        this.editing = null;
        if (save && val.trim() && val.trim() !== this.state.name) {
          this.state.name = val.trim();
          this.send({ type: 'rename', name: val.trim() });
        }
        return this.render();
      }
      const i = +w.dataset.index;
      const it = this.state.items[i];
      const cur = it ? (it.section != null ? it.section : it.text) : null;
      this.editing = null;
      if (save && it && val !== cur) this.send({ type: 'edit_text', index: i, text: val });
      else if (it && !String(cur).trim() && (!save || !val.trim())) this.send({ type: 'edit_text', index: i, text: '' });
      this.render();
    }

    /* ---- menus: blockr.ui's Blockr.menu, the dock's "+" menu ---------------------------- */
    menu(anchor, cfg) {
      this.closeMenu();
      if (!window.Blockr || !Blockr.menu) return;
      const user = cfg.onClose;
      const h = Blockr.menu(anchor, Object.assign({}, cfg, {
        onClose: () => {
          if (this.openMenu === h) this.openMenu = null;
          if (user) user();
          // the menu hands focus back to its button, which would keep a hover
          // button showing after the pointer has left
          setTimeout(() => { if (document.activeElement === anchor && anchor && anchor.closest('.bp-hb')) anchor.blur(); }, 0);
        }
      }));
      this.openMenu = h;
    }
    closeMenu() {
      if (this.openMenu) { const m = this.openMenu; this.openMenu = null; m.close(); }
    }
    // A pick closes the menu; the next one opens after that has settled.
    then(fn) { return () => setTimeout(fn, 0); }

    // The add menu: one list. Text and Section on top, then the blocks that
    // read from the nearest block above, first of them ready for Enter, then
    // the blocks without an input; typing searches all of them. A block from
    // another input is the last row. `opt.add(registry, from)` and
    // `opt.section()` replace what a pick does; `opt.inText` leaves out Text,
    // for the menu that "/" opens in a text; `opt.onClose` runs when the menu
    // and any menu it leads to are gone.
    insertMenu(at, anchor, opt = {}) {
      const items = this.state.items;
      const above = items.slice(0, at).filter(it => it.block != null && !this.isProse(it)).map(it => it.block);
      const last = above.length ? above[above.length - 1] : null;
      const ins = anchor.closest('.bp-ins');
      const mark = () => ins && ins.classList.add('bp-open');
      const unmark = () => { if (ins) ins.classList.remove('bp-open'); if (opt.onClose) opt.onClose(); };
      const addFn = opt.add || ((id, from) => this.send({ type: 'add_block', at: at, registry: id, from: from || '' }));
      const add = (r, from) => () => addFn(r.id, from);
      const blockRows = (list, from) => {
        const out = [];
        let cat = null;
        list.forEach(r => {
          if (r.category !== cat) { cat = r.category; out.push({ title: cat }); }
          out.push({ label: r.name, badge: r.package, keywords: r.id + ' ' + r.category,
            mark: { icon: r.icon, category: r.category }, onSelect: add(r, from) });
        });
        return out;
      };
      const rows = [];
      if (!opt.inText) {
        rows.push({ label: 'Text', meta: 'a paragraph', icon: ICON.text,
          onSelect: () => addFn('new_prose_block', '') });
      }
      rows.push({ label: 'Section', meta: 'a heading', icon: ICON.heading,
        onSelect: opt.section || (() => { this.pendingEdit = at; this.send({ type: 'add_section', at: at, text: '' }); }) });
      if (last) rows.push({ divider: true }, ...blockRows(this.registry.filter(r => r.append), last));
      const free = this.registry.filter(r => !r.append);
      if (free.length) {
        rows.push({ divider: true }, { title: 'Without input' });
        free.forEach(r => rows.push({ label: r.name, badge: r.package, keywords: r.id + ' ' + r.category,
          mark: { icon: r.icon, category: r.category }, onSelect: add(r, '') }));
      }
      if (above.length > 1) {
        rows.push({ divider: true }, { label: 'From another block…', icon: ICON.branch,
          onSelect: this.then(() => { mark(); this.fromMenu(anchor, at, above, unmark, addFn); }) });
      }
      mark();
      this.menu(anchor, {
        caption: last ? 'Add after ' + this.blockName(last) : 'Add',
        filter: 'Search blocks', minWidth: 320, items: rows,
        onClose: () => setTimeout(() => { if (!this.openMenu) unmark(); }, 0)
      });
      // the first block that reads from the one above is the row Enter takes
      const h = this.openMenu;
      if (last && h && h.el) {
        const mk = h.el.querySelector('.blockr-menu__item .blockr-block-mark');
        if (mk) mk.closest('.blockr-menu__item').dispatchEvent(new MouseEvent('mousemove', { bubbles: true }));
      }
    }

    fromMenu(anchor, at, above, onClose, addFn) {
      this.menu(anchor, {
        caption: 'Read from',
        items: above.slice().reverse().map(id => ({
          label: this.blockName(id),
          onSelect: this.then(() => this.blockMenu(anchor, at, id, onClose, addFn))
        })),
        onClose: () => setTimeout(() => { if (!this.openMenu && onClose) onClose(); }, 0)
      });
    }

    // Every registered block by category; appending offers only the blocks
    // that can take an input, as the dock does.
    blockMenu(anchor, at, from, onClose, addFn) {
      const send = addFn || ((id, f) => this.send({ type: 'add_block', at: at, registry: id, from: f || '' }));
      const rows = [];
      let cat = null;
      this.registry.filter(r => !from || r.append).forEach(r => {
        if (r.category !== cat) { cat = r.category; rows.push({ title: cat }); }
        rows.push({
          label: r.name, badge: r.package, keywords: r.id,
          mark: { icon: r.icon, category: r.category },
          onSelect: () => send(r.id, from || '')
        });
      });
      this.menu(anchor, {
        caption: from ? 'Append to ' + this.blockName(from) : 'Add block',
        filter: 'Search blocks', minWidth: 300, items: rows,
        onClose: () => { if (onClose) onClose(); }
      });
    }

    /* ---- "/" in a text, and the + beside an empty line ------------------------------ */
    onSlash(e) {
      if (this.read) return;
      const host = e.target.closest('.bp-blk.bp-prose');
      const i = host ? this.itemIndexOf(host) : -1;
      if (i < 0) return;
      e.preventDefault();
      this.slashMenu(host, i, e.detail, true);
    }

    // The add menu at the cursor's line in text item i. A pick splits the
    // text there and puts the new block between the halves. Closed without a
    // pick, what was typed goes into the text: "/" and the search.
    slashMenu(host, i, rect, typed) {
      const prose = host.querySelector('.blockr-prose').blockrProse;
      if (!prose) return;
      const a = this.caretAnchor(rect);
      this.slashing = host;
      this.hidePlus();
      let picked = false, query = '', erased = false;
      const go = payload => {
        picked = true;
        const sp = prose.splitHere() || { before: prose.text(), after: '' };
        if (payload.section) this.pendingEdit = sp.before.trim() ? i + 1 : i;
        // the line the menu came from goes from the text at once
        if (sp.before.trim()) prose.dropLine();
        this.send(Object.assign({ type: 'insert_in_text', index: i, before: sp.before, after: sp.after }, payload));
      };
      this.insertMenu(i + 1, a, {
        inText: true,
        add: (id, from) => go({ registry: id, from: from || '' }),
        section: () => go({ section: true }),
        onClose: () => {
          a.remove();
          this.slashing = null;
          if (picked) return;
          if (typed && !erased) prose.typeHere('/' + query);
          else prose.focusAt('here');
        }
      });
      const f = this.openMenu && this.openMenu.el && this.openMenu.el.querySelector('.blockr-menu__filter-input');
      if (f) {
        f.addEventListener('input', () => { query = f.value; });
        // Backspace on an empty search takes the "/" back
        f.addEventListener('keydown', ev => {
          if (ev.key === 'Backspace' && !f.value) { ev.preventDefault(); erased = true; this.closeMenu(); }
        });
      }
    }

    // A point to hang a menu on: the cursor's place in a text.
    caretAnchor(rect) {
      const pr = this.el.getBoundingClientRect();
      const a = document.createElement('span');
      a.className = 'bp-caret-anchor';
      a.style.left = (rect.left - pr.left) + 'px';
      a.style.top = (rect.top - pr.top) + 'px';
      a.style.height = Math.max(16, rect.bottom - rect.top) + 'px';
      this.el.appendChild(a);
      return a;
    }

    /* ---- "@" in a text: a value from a block above ------------------------------- */
    onAt(e) {
      if (this.read) return;
      const host = e.target.closest('.bp-blk.bp-prose');
      const i = host ? this.itemIndexOf(host) : -1;
      if (i < 0) return;
      const above = this.state.items.slice(0, i)
        .filter(it => it.block != null && !this.isProse(it)).map(it => it.block).reverse();
      if (!above.length) return;
      e.preventDefault();
      const prose = host.querySelector('.blockr-prose').blockrProse;
      const a = this.caretAnchor(e.detail);
      this.slashing = host;
      let picked = false, query = '', done = false;
      const finish = () => {
        if (done) return;
        done = true;
        a.remove();
        this.slashing = null;
        if (!picked) prose.typeHere('@' + query);
      };
      const pick = (expr, open) => { picked = true; prose.insertChip(expr, open); };
      this.menu(a, {
        caption: 'A value from',
        filter: 'Search blocks', minWidth: 280,
        items: above.map(id => ({
          label: this.blockName(id),
          onSelect: () => this.valuesMenu(a, id, pick, finish)
        })),
        // a pick waits for the block's values, and the menu they fill
        onClose: () => setTimeout(() => { if (!this.openMenu && !this._valuesCb) finish(); }, 0)
      });
      const f = this.openMenu && this.openMenu.el && this.openMenu.el.querySelector('.blockr-menu__filter-input');
      if (f) f.addEventListener('input', () => { query = f.value; });
    }

    // The values block `id` reports, from R, each with its value now.
    valuesMenu(anchor, id, pick, finish) {
      this._valuesFor = id;
      this._valuesCb = values => {
        const rows = values.map(v => ({ label: v.label, meta: v.value, keywords: v.expr,
          onSelect: () => pick(v.expr) }));
        if (rows.length) rows.push({ divider: true });
        rows.push({ label: 'Your own code…', meta: id, mono: true, onSelect: () => pick(id, true) });
        this.menu(anchor, {
          caption: this.blockName(id), filter: values.length > 6 ? 'Search values' : false,
          minWidth: 300, items: rows,
          onClose: () => setTimeout(() => { if (!this.openMenu) finish(); }, 0)
        });
      };
      if (window.Shiny && Shiny.setInputValue) {
        Shiny.setInputValue(this.ns + 'page_values_req', { id: id, nonce: Math.random() }, { priority: 'event' });
      }
    }
    gotValues(msg) {
      if (msg.id !== this._valuesFor || !this._valuesCb) return;
      const cb = this._valuesCb;
      this._valuesCb = null;
      cb(msg.values || []);
    }

    /* ---- a block's settings, beside the text ------------------------------------- */
    // The panel takes the place of the contents. The block's settings (its
    // band, live Shiny inputs) move into it and back; the page keeps its
    // shape while you change them, and the output changes in place.
    panel() {
      if (this._panel) return this._panel;
      const p = document.createElement('aside');
      p.className = 'bp-panel';
      p.addEventListener('click', e => {
        if (e.target.closest('.bp-ip-x')) return this.closePanel();
        const sw = e.target.closest('[data-switch]');
        if (sw && this.panelFor) {
          const idx = this.state.items.findIndex(it => it.block === this.panelFor);
          if (idx >= 0) this.send({ type: 'toggle', index: idx, field: sw.dataset.switch });
        }
        const from = e.target.closest('[data-from]');
        if (from) this.jumpBlock(from.dataset.from);
      });
      this.el.querySelector('.bp-body').appendChild(p);
      this._panel = p;
      return p;
    }
    togglePanel(id) { this.panelFor === id ? this.closePanel() : this.openPanel(id); }
    openPanel(id) {
      if (this.read) return;
      this.closePanel();
      const node = this.blockNode(id);
      if (!node) return;
      const p = this.panel();
      const mark = node.querySelector('.bp-bh > :first-child');
      p.innerHTML = '<div class="bp-ip-head">' + (mark ? mark.outerHTML : '') +
        `<span class="bp-ip-name">${esc(this.blockName(id))}</span>` +
        `<button type="button" class="bp-ip-x bp-hb" aria-label="Close">${ICON.close}</button></div>` +
        '<div class="bp-ip-body"></div><div class="bp-ip-doc"></div>';
      const band = node.querySelector(':scope > .bp-band');
      if (band && !node.classList.contains('bp-out-hidden')) {
        p.querySelector('.bp-ip-body').appendChild(band);
        this._band = { node: node, band: band };
        this.shown(band);
      }
      this.panelFor = id;
      node.classList.add('bp-selected');
      this.el.classList.add('bp-panel-open');
      this.refreshPanel();
      this.scheduleRail();
    }
    closePanel() {
      if (!this.panelFor) return;
      const b = this._band;
      if (b && b.node.isConnected) {
        b.node.insertBefore(b.band, b.node.querySelector(':scope > .bp-codeview'));
        this.shown(b.node);
      }
      this._band = null;
      const node = this.blockNode(this.panelFor);
      if (node) node.classList.remove('bp-selected');
      this.panelFor = null;
      this.el.classList.remove('bp-panel-open');
      this.scheduleRail();
    }
    // the report's switches and what the block reads from, as the state has them
    refreshPanel() {
      if (!this.panelFor) return;
      const id = this.panelFor;
      const it = this.state.items.find(x => x.block === id);
      if (!it || !this.blockNode(id)) {
        // the block went, its settings with it
        if (this._band) this._band.band.remove();
        this._band = null;
        this.panelFor = null;
        this.el.classList.remove('bp-panel-open');
        return;
      }
      const sw = (f, label, on) => `<button type="button" class="bp-ip-sw" data-switch="${f}" aria-pressed="${on}">` +
        `<span>${label}</span><span class="bp-sw${on ? ' bp-on' : ''}"></span></button>`;
      const from = this.parents(id);
      this._panel.querySelector('.bp-ip-doc').innerHTML =
        '<div class="bp-ip-lab">In the document</div>' +
        sw('output', 'Output', it.output !== false) + sw('code', 'Code', it.code === true) +
        (from.length ? '<div class="bp-ip-lab">Reads from</div>' +
          from.map(f => `<button type="button" class="bp-ip-from" data-from="${esc(f)}">${esc(this.blockName(f))}</button>`).join('') : '');
      this._panel.querySelector('.bp-ip-name').textContent = this.blockName(id);
    }

    /* ---- find and replace in the texts ------------------------------------------- */
    findBar() {
      if (this._find) return this._find;
      const f = document.createElement('div');
      f.className = 'bp-find';
      f.innerHTML =
        '<div class="bp-find-row"><span class="blockr-input"><input class="blockr-input__field bp-find-q" type="text" placeholder="Find in the text" aria-label="Find"></span>' +
        '<span class="bp-find-n"></span>' +
        `<button type="button" class="bp-hb" data-find="prev" aria-label="Previous">${ICON.up}</button>` +
        `<button type="button" class="bp-hb" data-find="next" aria-label="Next">${ICON.down}</button>` +
        '<button type="button" class="bp-find-t" data-find="toggle">Replace</button>' +
        `<button type="button" class="bp-hb" data-find="close" aria-label="Close">${ICON.close}</button></div>` +
        '<div class="bp-find-row bp-find-rep"><span class="blockr-input"><input class="blockr-input__field bp-find-r" type="text" placeholder="Replace with" aria-label="Replace with"></span>' +
        '<button type="button" class="bp-find-t" data-find="one">Replace</button>' +
        '<button type="button" class="bp-find-t" data-find="all">All</button></div>';
      const q = f.querySelector('.bp-find-q'), r = f.querySelector('.bp-find-r');
      q.addEventListener('input', () => this.runFind(0));
      f.addEventListener('keydown', e => { if (e.key === 'Escape') { e.preventDefault(); this.closeFind(); } });
      const keys = e => {
        if (e.key === 'Enter' && e.target === q) { e.preventDefault(); this.stepFind(e.shiftKey ? -1 : 1); }
        else if (e.key === 'Enter' && e.target === r) { e.preventDefault(); this.replaceFind(false); }
      };
      q.addEventListener('keydown', keys);
      r.addEventListener('keydown', keys);
      f.addEventListener('click', e => {
        const b = e.target.closest('[data-find]');
        if (!b) return;
        const a = b.dataset.find;
        if (a === 'prev' || a === 'next') this.stepFind(a === 'prev' ? -1 : 1);
        if (a === 'close') this.closeFind();
        if (a === 'toggle') { f.classList.toggle('bp-find-open'); if (f.classList.contains('bp-find-open')) r.focus(); }
        if (a === 'one') this.replaceFind(false);
        if (a === 'all') this.replaceFind(true);
      });
      this.el.querySelector('.bp-body').appendChild(f);
      this._find = f;
      return f;
    }
    openFind() {
      const f = this.findBar();
      f.classList.add('bp-show');
      f.classList.toggle('bp-find-ro', this.read);
      const q = f.querySelector('.bp-find-q');
      const sel = String(document.getSelection() || '').trim();
      if (sel && sel.length < 80 && !sel.includes('\n')) q.value = sel;
      q.focus();
      q.select();
      this.runFind(0);
    }
    closeFind() {
      if (!this._find) return;
      this._find.classList.remove('bp-show');
      this.matches = [];
      if (window.CSS && CSS.highlights) { CSS.highlights.delete('bp-find'); CSS.highlights.delete('bp-find-cur'); }
    }
    // every match in the texts, in reading order
    runFind(at) {
      const q = this._find.querySelector('.bp-find-q').value;
      this.matches = [];
      if (q) {
        this.state.items.forEach(it => {
          if (!this.isProse(it)) return;
          const p = this.proseOf(it.block);
          if (p) p.find(q).forEach(m => this.matches.push(Object.assign({ block: it.block }, m)));
        });
      }
      this.matchAt = Math.min(Math.max(0, at), Math.max(0, this.matches.length - 1));
      this.paintFind(true);
    }
    stepFind(d) {
      if (!this.matches || !this.matches.length) return;
      this.matchAt = (this.matchAt + d + this.matches.length) % this.matches.length;
      this.paintFind(true);
    }
    paintFind(scroll) {
      const n = this.matches.length;
      const q = this._find.querySelector('.bp-find-q').value;
      this._find.querySelector('.bp-find-n').textContent = !q ? '' : n ? `${this.matchAt + 1} of ${n}` : 'No match';
      const range = m => { const p = this.proseOf(m.block); return p && p.rangeOf(m); };
      const cur = n ? this.matches[this.matchAt] : null;
      if (cur && scroll) {
        const node = this.blockNode(cur.block);
        if (node && node.classList.contains('bp-compact')) this.jumpBlock(cur.block);
        const r = range(cur), sr = this.scrollEl.getBoundingClientRect();
        if (r) {
          const b = r.getBoundingClientRect();
          if (b.top < sr.top + 70 || b.bottom > sr.bottom - 40) this.scrollEl.scrollTop += b.top - sr.top - sr.height / 3;
        }
      }
      if (window.CSS && CSS.highlights && window.Highlight) {
        CSS.highlights.set('bp-find', new Highlight(...this.matches.map(range).filter(Boolean)));
        const c = cur && range(cur);
        if (c) CSS.highlights.set('bp-find-cur', new Highlight(c)); else CSS.highlights.delete('bp-find-cur');
      }
    }
    replaceFind(all) {
      if (this.read || !this.matches || !this.matches.length) return;
      const r = this._find.querySelector('.bp-find-r').value;
      if (!all) {
        const m = this.matches[this.matchAt];
        const p = this.proseOf(m.block);
        if (p) p.replaceRange(m, r);
        return this.runFind(this.matchAt);
      }
      // from the last match back, so the positions before it stay put
      const n = this.matches.length;
      this.matches.slice().reverse().forEach(m => { const p = this.proseOf(m.block); if (p) p.replaceRange(m, r); });
      this.runFind(0);
      this.toast(n === 1 ? 'Replaced 1 match.' : `Replaced ${n} matches.`);
    }

    // A table cell: "Use in text" puts it in the text as inline R, so it
    // follows the block: in the text written in last if that reads below
    // the block, else in the next text below it, else in a new one.
    cellMenu(id, td) {
      const tr = td.closest('tr'), table = td.closest('table');
      const row = +((tr.querySelector('.blockr-row-number') || {}).textContent || NaN);
      const th = table.querySelectorAll('thead th')[[...tr.children].indexOf(td)];
      const col = th && th.dataset.column;
      if (!col || !(row > 0)) return;
      const ref = /^[A-Za-z.][A-Za-z0-9._]*$/.test(col) && !/^\.[0-9]/.test(col) ? `${id}$${col}` : `${id}[[${JSON.stringify(col)}]]`;
      const expr = `${ref}[${row}]`;
      const value = td.textContent.trim();
      td.classList.add('bp-cell-on');
      this.menu(td, {
        items: [
          { label: 'Use in text', meta: value, onSelect: () => this.useInText(id, expr) },
          { label: 'Copy', meta: value, onSelect: () => navigator.clipboard && navigator.clipboard.writeText(value) }
        ],
        onClose: () => td.classList.remove('bp-cell-on')
      });
    }
    useInText(id, expr) {
      const items = this.state.items;
      const at = items.findIndex(it => it.block === id);
      const last = items.findIndex(it => it.block === this._lastText);
      let j = last > at && this.isProse(items[last]) ? last : -1;
      if (j < 0) j = this.textNear(at, 1);
      if (j < 0) {
        return this.send({ type: 'add_block', at: at + 1, registry: 'new_prose_block', from: '', text: '`r ' + expr + '`' });
      }
      const p = this.proseOf(items[j].block);
      if (!p) return;
      if (items[j].block !== this._lastText) p.focusAt('end');
      p.insertChip(expr);
    }

    plusBtn() {
      if (this._plus) return this._plus;
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'bp-plus bp-hb';
      b.setAttribute('aria-label', 'Add');
      b.innerHTML = ICON.plus;
      b.addEventListener('mousedown', e => e.preventDefault());
      b.addEventListener('click', () => {
        const p = this._plusFor;
        const host = p && p.closest('.bp-blk.bp-prose');
        const i = host ? this.itemIndexOf(host) : -1;
        if (i < 0) return;
        const r = p.getBoundingClientRect();
        this.slashMenu(host, i, { left: r.left, top: r.top, bottom: r.bottom }, false);
      });
      this.wrap.appendChild(b);
      this._plus = b;
      return b;
    }
    hidePlus() { if (this._plus) this._plus.classList.remove('bp-show'); this._plusFor = null; }
    // The + shows beside the empty line the cursor is on.
    placePlus() {
      if (this.read || this.slashing) return this.hidePlus();
      const sel = document.getSelection();
      const n = sel.rangeCount && sel.isCollapsed ? sel.anchorNode : null;
      const el = n && (n.nodeType === 1 ? n : n.parentElement);
      const pm = el && el.closest('.bp-blk.bp-prose .ProseMirror');
      const p = pm && el.closest('p');
      if (!p || p.parentElement !== pm || p.textContent.trim() || p.querySelector('.blockr-r-chip')) return this.hidePlus();
      const b = this.plusBtn();
      const r = p.getBoundingClientRect(), wr = this.wrap.getBoundingClientRect();
      b.style.left = (r.left - wr.left - 30) + 'px';
      b.style.top = (r.top - wr.top + r.height / 2 - 11) + 'px';
      b.classList.add('bp-show');
      this._plusFor = p;
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
          if (ins) this.blockMenu(ins.querySelector('.bp-insline'), srcIdx + 1, id);
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

    // A skeleton in the block's place until its first result: grey rows for
    // an output, a grey area for a chart. Steps show no result, so no wait.
    waitFor(node) {
      if (node.dataset.bpInit) return;
      node.dataset.bpInit = '1';
      const w = node.dataset.bpWait;
      if (!w) return;
      const it = this.state.items.find(x => x.block === node.dataset.blockId);
      if (it && it.output === false) return;
      const host = node.querySelector(w === 'draw' ? '.bp-band' : '.bp-out');
      if (!host) return;
      const sk = document.createElement('div');
      sk.className = 'bp-skel';
      sk.innerHTML = w === 'draw' ? '<i class="bp-sk-box"></i>'
        : '<i class="bp-sk-r bp-sk-h"></i><i class="bp-sk-r" style="width:92%"></i><i class="bp-sk-r" style="width:78%"></i><i class="bp-sk-r" style="width:86%"></i>';
      host.prepend(sk);
      node.classList.add('bp-loading');
      if (w === 'draw') {
        // a chart is done when its canvas or svg is there
        const drawn = () => [...host.querySelectorAll('canvas, svg')].some(c => c.getBoundingClientRect().width > 150);
        const mo = new MutationObserver(() => { if (drawn()) { mo.disconnect(); this.ready(node); } });
        mo.observe(host, { childList: true, subtree: true });
        node._bpMo = mo;
      }
    }
    ready(node) {
      if (!node.classList.contains('bp-loading')) return;
      if (node._bpMo) { node._bpMo.disconnect(); node._bpMo = null; }
      const sk = node.querySelector('.bp-skel');
      node.classList.remove('bp-loading');
      if (sk) { sk.classList.add('bp-gone'); setTimeout(() => sk.remove(), 400); }
      this.scheduleRail();
    }
    releaseAll() {
      this._quiet = null;
      this.doc.querySelectorAll('.bp-blk.bp-loading').forEach(n => this.ready(n));
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
      const leaves = [];
      this.state.items.forEach(it => {
        if (it.block == null) return;
        const el = this.doc.querySelector(`:scope > .bp-blk[data-block-id="${it.block}"]:not(.bp-unplaced)`);
        if (!el) return;
        // text has no dot; text that reads from a block is a leaf off its line
        if ((this.state.blocks[it.block] || {}).prose) {
          if (this.parents(it.block).length) leaves.push({ id: it.block, el });
          return;
        }
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
      leaves.forEach(lf => {
        const yt = lf.el.getBoundingClientRect().top - wr.top + 12;
        this.parents(lf.id).forEach(p => {
          if (!ys.has(p)) return;
          const xp = lx(lane.get(p)), yp = ys.get(p), xt = xp + 14;
          s += `<path class="bp-edge bp-edge-leaf" data-from="${p}" data-to="${esc(lf.id)}" d="M${xp} ${yp}V${yt - 6}Q${xp} ${yt} ${xp + 6} ${yt}H${xt - 3}"/>` +
            `<rect class="bp-leaf" data-id="${esc(lf.id)}" x="${xt - 3}" y="${yt - 3}" width="6" height="6" rx="1"/>`;
        });
      });
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
      let h = '<div class="bp-th">Contents</div>' +
        `<a class="bp-t-h bp-t-h1" data-index="-1">${esc(this.state.name)}</a>`;
      this.state.items.forEach((it, i) => {
        if (it.section != null) {
          h += `<a class="bp-t-h bp-t-h2" data-index="${i}">${esc(it.section)}</a>`;
        } else if (it.block != null) {
          if (!(this.state.blocks[it.block] || {}).prose) {
            h += `<a class="bp-t-b" data-block="${esc(it.block)}" data-index="${i}"><i></i>${esc(this.blockName(it.block))}</a>`;
          }
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
      if (i < 0) { this.scrollEl.scrollTop = 0; return; }
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
          if (it.section != null && this.folded.has(it.section)) { this.folded.delete(it.section); break; }
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
    Shiny.addCustomMessageHandler('blockr-page-values', msg => { const p = pageFor(msg.target); if (p) p.gotValues(msg); });
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
      p.source.head = msg.head || null;
      p.render();
    });
    return true;
  }
  if (!register()) document.addEventListener('DOMContentLoaded', register);
})();
