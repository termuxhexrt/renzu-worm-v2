/**
 * RENZU WORM v2 - Chat Engine
 * Streaming SSE + Markdown + Tool Panels
 */

// ══════ CHAT ENGINE ══════
const Worm = (() => {
    let chatId = null;
    let history = [];
    let streaming = false;
    let attachments = [];

    const $ = (s) => document.querySelector(s);
    const $$ = (s) => document.querySelectorAll(s);

    const dom = {};

    function init() {
        dom.messages = $('#messages');
        dom.inner = $('#messages-inner');
        dom.input = $('#chat-input');
        dom.sendBtn = $('#btn-send');
        dom.chatList = $('#chat-list');
        dom.welcome = $('#welcome');
        dom.statusDot = $('#status-dot');
        dom.providerInfo = $('#provider-info');
        dom.modelBtn = $('#model-selector-btn');
        dom.modelDropdown = $('#model-dropdown');
        dom.activeModelName = $('#active-model-name');
        dom.fileInput = $('#file-input');
        dom.filePreview = $('#file-preview');
        dom.attachBtn = $('#btn-attach');

        bindEvents();
        loadConfig();
        loadChats();
        loadModels();
        autoResize();
    }

    function bindEvents() {
        dom.sendBtn.addEventListener('click', send);
        dom.input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
        });
        dom.input.addEventListener('input', autoResize);
        $('#btn-toggle').addEventListener('click', () => $('#sidebar').classList.toggle('hidden'));
        $('#btn-new-chat').addEventListener('click', newChat);
        $('#btn-new-top').addEventListener('click', newChat);
        $('#btn-shodan').addEventListener('click', () => ToolPanel.open('shodan'));
        $('#btn-vt').addEventListener('click', () => ToolPanel.open('vt'));
        $('#overlay').addEventListener('click', () => { ToolPanel.close('shodan'); ToolPanel.close('vt'); });

        // Safe event binding helper
        const bind = (sel, fn) => { const el = $(sel); if (el) el.addEventListener('click', fn); };

        // Share Button
        bind('#btn-share', shareLink);

        // Voice Input (F6)
        bind('#btn-mic', toggleVoice);

        // File upload
        dom.attachBtn.addEventListener('click', () => dom.fileInput.click());
        dom.fileInput.addEventListener('change', handleFileSelect);

        // Model selector
        dom.modelBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            dom.modelDropdown.classList.toggle('open');
        });
        document.addEventListener('click', () => dom.modelDropdown.classList.remove('open'));
        dom.modelDropdown.addEventListener('click', (e) => e.stopPropagation());

        $$('.prompt-card').forEach(card => {
            card.addEventListener('click', () => {
                dom.input.value = card.dataset.prompt;
                autoResize();
                dom.input.focus();
            });
        });
    }

    function autoResize() {
        dom.input.style.height = 'auto';
        dom.input.style.height = Math.min(dom.input.scrollHeight, 160) + 'px';
    }

    async function loadConfig() {
        try {
            const r = await fetch('/api/config');
            const c = await r.json();
            dom.providerInfo.textContent = `${c.provider} :: ${c.model}`;
            if (c.model_info && c.model_info.name) {
                dom.activeModelName.textContent = c.model_info.name;
            } else {
                dom.activeModelName.textContent = c.model;
            }
            dom.statusDot.classList.toggle('off', !c.has_key);
            $('#badge-shodan').classList.toggle('active', c.shodan);
            $('#badge-vt').classList.toggle('active', c.virustotal);
        } catch (e) { console.error(e); }
    }

    async function loadModels() {
        try {
            const r = await fetch('/api/models');
            const models = await r.json();
            dom.modelDropdown.innerHTML = models.map(m => `
                <div class="model-option ${m.active ? 'active' : ''}" data-id="${m.id}" onclick="Worm.switchModel('${m.id}')">
                    <div class="model-option-left">
                        <div class="model-option-name">${esc(m.name)}</div>
                        <div class="model-option-desc">${esc(m.desc)}</div>
                    </div>
                    <span class="model-tag ${m.tag}">${m.tag}</span>
                </div>
            `).join('');
        } catch (e) { console.error(e); }
    }

    async function switchModel(modelId) {
        try {
            const r = await fetch('/api/models/switch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ model: modelId }),
            });
            const data = await r.json();
            if (data.success) {
                dom.activeModelName.textContent = data.info.name;
                dom.providerInfo.textContent = `Mistral AI :: ${modelId}`;
                dom.modelDropdown.classList.remove('open');
                loadModels();
            }
        } catch (e) { console.error(e); }
    }

    let _firstLoad = true;
    async function loadChats() {
        try {
            const r = await fetch('/api/chats');
            if (r.redirected || r.url.includes('/login')) {
                window.location.href = '/login';
                return;
            }
            const text = await r.text();
            let chats;
            try { chats = JSON.parse(text); } catch (e) {
                window.location.href = '/login';
                return;
            }
            dom.chatList.innerHTML = chats.map(c => `
                <div class="chat-item ${c.id === chatId ? 'active' : ''}" data-id="${c.id}" onclick="Worm.openChat('${c.id}')">
                    <span class="chat-item-text">${esc(c.title)}</span>
                    <button class="chat-item-del" onclick="event.stopPropagation(); Worm.delChat('${c.id}')">x</button>
                </div>
            `).join('');
            // Only auto-load most recent chat on FIRST page load
            if (_firstLoad && !chatId && chats.length > 0) {
                _firstLoad = false;
                openChat(chats[0].id);
            }
            _firstLoad = false;
        } catch (e) { console.error('loadChats error:', e); }
    }

    function newChat() {
        chatId = null;
        history = [];
        dom.inner.innerHTML = '';
        dom.welcome.style.display = 'flex';
        dom.inner.appendChild(dom.welcome);
        loadChats();
        dom.input.focus();
    }

    async function openChat(id) {
        try {
            const r = await fetch(`/api/chats/${id}`);
            const data = await r.json();
            chatId = id;
            history = data.messages || [];
            renderAll();
            dom.welcome.style.display = 'none';
            loadChats();
        } catch (e) { console.error(e); }
    }

    async function delChat(id) {
        try {
            await fetch(`/api/chats/${id}`, { method: 'DELETE' });
            if (chatId === id) newChat();
            else loadChats();
        } catch (e) { console.error(e); }
    }

    function renderAll() {
        dom.inner.innerHTML = '';
        history.forEach(m => addMsg(m.role, m.content));
        scrollDown();
    }

    async function send() {
        const text = dom.input.value.trim();
        const atts = window._wormAttachments || [];
        if ((!text && atts.length === 0) || streaming) return;

        dom.welcome.style.display = 'none';
        streaming = true;
        dom.sendBtn.disabled = true;
        dom.input.value = '';
        autoResize();

        // Build display text
        let displayText = text;
        if (atts.length > 0) {
            const fileNames = atts.map(a => a.name).join(', ');
            displayText = text ? `${text}\n\n[Attached: ${fileNames}]` : `[Attached: ${fileNames}]`;
        }

        addMsg('user', displayText);
        const el = addMsg('assistant', '', true);
        const textEl = el.querySelector('.msg-text');

        const currentAttachments = [...atts];
        window._wormAttachments = [];
        renderFilePreview();

        let full = '';

        try {
            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: text,
                    chat_id: chatId,
                    history,
                    attachments: currentAttachments,
                }),
            });

            const reader = res.body.getReader();
            const dec = new TextDecoder();

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = dec.decode(value, { stream: true });
                for (const line of chunk.split('\n')) {
                    if (!line.startsWith('data: ')) continue;
                    try {
                        const d = JSON.parse(line.slice(6));
                        if (d.status) {
                            // Show retry/status messages to user
                            textEl.innerHTML = `<span style="color:var(--text-muted);font-size:0.8rem">${esc(d.status)}</span>`;
                            scrollDown();
                        }
                        if (d.token) {
                            full += d.token;
                            textEl.innerHTML = md(full);
                            scrollDown();
                        }
                        if (d.done) {
                            chatId = d.chat_id;
                            history.push({ role: 'user', content: text }, { role: 'assistant', content: full });
                            loadChats();

                            // Parse worm_edit blocks
                            parseWormEdits(textEl, full);
                        }
                        if (d.error) {
                            textEl.innerHTML = `<span style="color:var(--accent)">Error: ${esc(d.error)}</span>`;
                        }
                    } catch (e) { }
                }
            }
        } catch (e) {
            textEl.innerHTML = `<span style="color:var(--accent)">Connection failed: ${esc(e.message)}</span>`;
        }

        const typ = el.querySelector('.typing');
        if (typ) typ.remove();

        streaming = false;
        dom.sendBtn.disabled = false;
        dom.input.focus();
    }

    // ══════ WORM SELF-EDIT PARSER ══════
    function parseWormEdits(textEl, rawContent) {
        if (!window._wormPendingEdits) {
            window._wormPendingEdits = {};
            window._wormEditCounter = 0;
        }

        // Robust regex for both lowercase and uppercase tags
        const editRegex = /```(?:worm_edit|WORM_EDIT)\s*\n([\s\S]*?)```/gi;
        let match;
        const edits = [];
        while ((match = editRegex.exec(rawContent)) !== null) {
            const block = match[1];
            const fileMatch = block.match(/FILE:\s*(.+)/);
            // Non-greedy find until REPLACE:
            const findMatch = block.match(/FIND:\s*\n([\s\S]*?)(?=\nREPLACE:)/);
            const replaceMatch = block.match(/REPLACE:\s*\n([\s\S]*?)$/);

            if (fileMatch && findMatch) {
                edits.push({
                    file: fileMatch[1].trim(),
                    find: findMatch[1].trim(),
                    replace: replaceMatch ? replaceMatch[1].trim() : '',
                    raw: match[0]
                });
            }
        }

        if (edits.length === 0) return;

        // Replace each worm_edit code block with an interactive Apply panel
        let html = textEl.innerHTML;
        edits.forEach((edit) => {
            const i = window._wormEditCounter++;
            const editId = `worm-edit-${Date.now()}-${i}`;
            window._wormPendingEdits[editId] = edit;

            const panelHtml = `
                <div class="worm-edit-panel" id="${editId}" style="background:linear-gradient(135deg,rgba(220,38,38,var(--op,0.08)),rgba(20,20,30,0.5));border:1px solid rgba(220,38,38,0.4);border-radius:12px;padding:18px;margin:15px 0;box-shadow:0 10px 30px rgba(0,0,0,0.3);position:relative;overflow:hidden">
                    <div style="position:absolute;top:0;left:0;width:100%;height:2px;background:linear-gradient(90deg,transparent,var(--accent),transparent)"></div>
                    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
                        <div style="display:flex;align-items:center;gap:10px">
                            <div style="width:30px;height:30px;background:var(--accent);border-radius:8px;display:flex;align-items:center;justify-content:center;box-shadow:0 0 15px var(--accent-glow)">
                                <svg style="width:16px;height:16px;fill:#fff" viewBox="0 0 24 24"><path d="M22.7 19l-9.1-9.1c.9-2.3.4-5-1.5-6.9-2-2-5-2.4-7.4-1.3L9 6l-3 3-4.3-4.3C.6 7.1 1 10.1 3 12.1c1.9 1.9 4.6 2.4 6.9 1.5l9.1 9.1c.4.4 1 .4 1.4 0l2.3-2.3c.4-.4.4-1.1 0-1.4z"/></svg>
                            </div>
                            <span style="color:var(--accent);font-weight:800;font-size:0.9rem;letter-spacing:1px;font-family:'JetBrains Mono'">[WORM_EVOLUTION_PROTOCOL]</span>
                        </div>
                        <code style="background:rgba(255,255,255,0.06);padding:4px 10px;border-radius:6px;font-size:0.75rem;border:1px solid rgba(255,255,255,0.1);color:var(--accent-cyan)">${esc(edit.file)}</code>
                    </div>
                    
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:15px">
                        <div>
                            <div style="font-size:0.65rem;color:var(--text-muted);margin-bottom:4px;text-transform:uppercase;letter-spacing:1px">Current Code (Find):</div>
                            <pre style="background:#050508;padding:12px;border-radius:8px;font-size:0.75rem;max-height:180px;overflow:auto;border:1px solid rgba(255,255,255,0.04);margin:0;color:#f87171"><code>${esc(edit.find)}</code></pre>
                        </div>
                        <div>
                            <div style="font-size:0.65rem;color:#22c55e;margin-bottom:4px;text-transform:uppercase;letter-spacing:1px">New Code (Replace):</div>
                            <pre style="background:#050508;padding:12px;border-radius:8px;font-size:0.75rem;max-height:180px;overflow:auto;border:1px solid rgba(34,197,94,0.15);margin:0;color:#4ade80"><code>${esc(edit.replace)}</code></pre>
                        </div>
                    </div>

                    <div style="display:flex;gap:10px;align-items:center">
                        <button onclick="Worm.applyEdit('${editId}')" style="background:var(--accent);color:#fff;border:none;padding:10px 24px;border-radius:8px;cursor:pointer;font-weight:700;font-size:0.85rem;transition:all 0.3s;box-shadow:0 4px 15px var(--accent-glow);display:flex;align-items:center;gap:8px" id="${editId}-btn">
                            <span style="font-size:1.1rem">⚡</span> APPLY EVOLUTION
                        </button>
                        <button onclick="Worm.undoEdit('${editId}')" style="background:rgba(255,255,255,0.03);color:var(--text-muted);border:1px solid rgba(255,255,255,0.08);padding:10px 18px;border-radius:8px;cursor:pointer;font-size:0.8rem;transition:all 0.2s" id="${editId}-undo" disabled>↩ Undo</button>
                        <div id="${editId}-status" style="font-size:0.75rem;font-weight:500"></div>
                    </div>
                </div>`;

            // Much more robust HTML replacement (handles highlight.js wrapping and variations)
            // Look for any pre/code block that contains the language-worm_edit class or starts with FILE:
            const panelPlaceholder = `___WORM_EDIT_PANEL_${i}___`;

            // Try matching the standard code block structure
            const codeBlockRegex = /<pre class="code-block">[\s\S]*?<code class="hljs language-(?:worm_edit|WORM_EDIT)">[\s\S]*?<\/code><\/pre>/gi;
            // Also try a simpler fallback
            const fallbackRegex = /<pre><code class="language-(?:worm_edit|WORM_EDIT)">[\s\S]*?<\/code><\/pre>/gi;

            let replaced = false;
            // First pass, try replacing only FIRST occurrence each loop
            if (codeBlockRegex.test(html)) {
                html = html.replace(/<pre class="code-block">[\s\S]*?<code class="hljs language-(?:worm_edit|WORM_EDIT)">[\s\S]*?<\/code><\/pre>/i, panelHtml);
                replaced = true;
            } else if (fallbackRegex.test(html)) {
                html = html.replace(/<pre><code class="language-(?:worm_edit|WORM_EDIT)">[\s\S]*?<\/code><\/pre>/i, panelHtml);
                replaced = true;
            }
        });
        textEl.innerHTML = html;
    }

    // Apply a self-edit
    async function applyEdit(editId) {
        const edit = window._wormPendingEdits?.[editId];
        const btn = document.getElementById(`${editId}-btn`);
        const status = document.getElementById(`${editId}-status`);
        const undoBtn = document.getElementById(`${editId}-undo`);

        if (!edit || !btn) return;

        try {
            btn.disabled = true;
            btn.textContent = '⌛ Evolving...';
            if (status) status.innerHTML = `<span style="color:var(--text-muted)">Connecting to brain...</span>`;

            const res = await fetch('/api/self/edit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ file: edit.file, find: edit.find, replace: edit.replace })
            });
            const data = await res.json();

            if (data.status === 'applied') {
                btn.textContent = '✅ Evolved!';
                btn.style.background = '#22c55e';
                btn.style.boxShadow = '0 0 20px rgba(34,197,94,0.4)';
                if (undoBtn) undoBtn.disabled = false;
                if (status) status.innerHTML = `<span style="color:#22c55e">✓ Protocol Successful. Refresh now.</span>`;
            } else {
                btn.disabled = false;
                btn.textContent = '⚡ Try Again';
                if (status) status.innerHTML = `<span style="color:#ef4444">❌ Error: ${data.error || 'Failed'}</span>`;
            }
        } catch (e) {
            btn.disabled = false;
            btn.textContent = '⚡ Try Again';
            if (status) status.innerHTML = `<span style="color:#ef4444">❌ Connection loss.</span>`;
        }
    }

    // Undo a self-edit
    async function undoEdit(editId) {
        const edit = window._wormPendingEdits?.[editId];
        const undoBtn = document.getElementById(`${editId}-undo`);
        const status = document.getElementById(`${editId}-status`);
        if (!edit || !undoBtn) return;

        try {
            undoBtn.textContent = '⏳ Undoing...';
            undoBtn.disabled = true;
            if (status) status.innerHTML = `<span style="color:var(--text-muted)">Rolling back protocol...</span>`;

            const res = await fetch('/api/self/undo', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ file: edit.file })
            });
            const data = await res.json();
            if (data.status === 'restored') {
                undoBtn.textContent = '✅ Restored';
                if (status) status.innerHTML = `<span style="color:var(--accent-amber)">✓ Rollback complete. Refresh page.</span>`;
            } else {
                undoBtn.textContent = '❌ Failed';
                undoBtn.disabled = false;
                if (status) status.innerHTML = `<span style="color:#ef4444">❌ Rollback error: ${data.error}</span>`;
            }
        } catch (e) {
            undoBtn.disabled = false;
            undoBtn.textContent = '⚡ Retry Undo';
        }
    }


    function addMsg(role, content, isTyping = false) {
        const div = document.createElement('div');
        div.className = `msg ${role}`;

        const avatarSvg = role === 'user'
            ? '<svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>'
            : '<svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>';

        const label = role === 'user' ? 'YOU' : 'WORM';

        div.innerHTML = `
            <div class="msg-avatar">${avatarSvg}</div>
            <div class="msg-body">
                <div class="msg-label">${label}</div>
                <div class="msg-text">${content ? md(content) : ''}${isTyping ? '<div class="typing"><span></span><span></span><span></span></div>' : ''}</div>
            </div>
        `;

        dom.inner.appendChild(div);

        // Ensure self-edits are parsed even when loading chat history
        if (content && /```(?:worm_edit|WORM_EDIT)/i.test(content)) {
            setTimeout(() => {
                parseWormEdits(div.querySelector('.msg-text'), content);
            }, 50);
        }

        scrollDown();
        return div;
    }

    // ── Markdown ──
    function md(text) {
        if (!text) return '';

        // Normalize line endings
        text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

        // Split text into segments: code blocks vs normal text
        const segments = [];
        let remaining = text;

        while (remaining.length > 0) {
            // Find opening ```
            const openMatch = remaining.match(/```(\w*)\n?/);
            if (!openMatch) {
                segments.push({ type: 'text', content: remaining });
                break;
            }

            const openIdx = openMatch.index;

            // Push text before the code block
            if (openIdx > 0) {
                segments.push({ type: 'text', content: remaining.substring(0, openIdx) });
            }

            const lang = openMatch[1] || 'code';
            const afterOpen = remaining.substring(openIdx + openMatch[0].length);

            // Find closing ``` (must be at start of line or start of remaining)
            const closeMatch = afterOpen.match(/\n```(?:\s*\n|$)|^```(?:\s*\n|$)/m);
            if (!closeMatch) {
                // No closing found — treat as incomplete code block (still streaming)
                segments.push({ type: 'code', lang, content: afterOpen });
                break;
            }

            const codeContent = afterOpen.substring(0, closeMatch.index);
            segments.push({ type: 'code', lang, content: codeContent });

            remaining = afterOpen.substring(closeMatch.index + closeMatch[0].length);
        }

        // Render segments
        let html = '';
        for (const seg of segments) {
            if (seg.type === 'code') {
                const isRunnable = ['javascript', 'js'].includes(seg.lang.toLowerCase());
                const runBtn = isRunnable ? `<button class="code-run-btn" onclick="runCodeBlock(this)">▶ Run</button>` : '';
                // Use highlight.js if available
                let highlighted;
                try {
                    if (window.hljs && seg.lang && seg.lang !== 'code' && hljs.getLanguage(seg.lang)) {
                        highlighted = hljs.highlight(seg.content.trim(), { language: seg.lang }).value;
                    } else if (window.hljs) {
                        highlighted = hljs.highlightAuto(seg.content.trim()).value;
                    } else {
                        highlighted = esc(seg.content.trim());
                    }
                } catch (e) {
                    highlighted = esc(seg.content.trim());
                }
                html += `<pre class="code-block"><div class="code-bar"><span class="code-lang">${seg.lang}</span>${runBtn}<button class="code-copy" onclick="Worm.copy(this)">copy</button></div><code class="hljs language-${seg.lang}">${highlighted}</code></pre>`;
            } else {
                html += renderTextBlock(seg.content);
            }
        }

        // Post-render: KaTeX math
        setTimeout(() => {
            try {
                if (window.renderMathInElement) {
                    document.querySelectorAll('.msg-text').forEach(el => {
                        renderMathInElement(el, {
                            delimiters: [
                                { left: '$$', right: '$$', display: true },
                                { left: '$', right: '$', display: false },
                                { left: '\\(', right: '\\)', display: false },
                                { left: '\\[', right: '\\]', display: true }
                            ],
                            throwOnError: false
                        });
                    });
                }
            } catch (e) { }
        }, 50);

        return html;
    }

    function renderTextBlock(text) {
        if (!text) return '';

        // LaTeX display math $$...$$
        text = text.replace(/\$\$([^$]+?)\$\$/g, (_, math) => {
            try {
                if (window.katex) return katex.renderToString(math.trim(), { displayMode: true, throwOnError: false });
            } catch (e) { }
            return `<div class="katex-display">$$${esc(math)}$$</div>`;
        });

        // LaTeX inline math $...$
        text = text.replace(/\$([^$\n]+?)\$/g, (_, math) => {
            try {
                if (window.katex) return katex.renderToString(math.trim(), { displayMode: false, throwOnError: false });
            } catch (e) { }
            return `<span class="katex-inline">$${esc(math)}$</span>`;
        });

        // Inline code (must come before other formatting)
        text = text.replace(/`([^`\n]+)`/g, '<code>$1</code>');

        // Bold & italic
        text = text.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
        text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        text = text.replace(/\*(.+?)\*/g, '<em>$1</em>');

        // Headers
        text = text.replace(/^#### (.+)$/gm, '<h4>$1</h4>');
        text = text.replace(/^### (.+)$/gm, '<h3>$1</h3>');
        text = text.replace(/^## (.+)$/gm, '<h2>$1</h2>');
        text = text.replace(/^# (.+)$/gm, '<h1>$1</h1>');

        // Blockquotes
        text = text.replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>');

        // Unordered lists
        text = text.replace(/^[\-\*] (.+)$/gm, '<li>$1</li>');
        text = text.replace(/(<li>[\s\S]*?<\/li>)/g, (match) => {
            if (!match.startsWith('<ul>')) return '<ul>' + match + '</ul>';
            return match;
        });
        text = text.replace(/<\/ul>\s*<ul>/g, '');

        // Ordered lists
        text = text.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');

        // HR
        text = text.replace(/^---$/gm, '<hr>');

        // Links
        text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');

        // Tables — robust parser
        const tableLines = text.split('\n');
        let i = 0;
        let newText = '';
        while (i < tableLines.length) {
            const line = tableLines[i];
            // Check if this looks like a table header
            if (line.trim().startsWith('|') && line.trim().endsWith('|') && i + 1 < tableLines.length) {
                const nextLine = tableLines[i + 1];
                // Check if next line is a separator (all pipes, dashes, colons, spaces)
                if (nextLine && /^[\|\s\-:]+$/.test(nextLine.trim()) && nextLine.includes('-')) {
                    // Found a table! Collect all rows
                    const headerLine = line;
                    const sepLine = nextLine;
                    i += 2; // skip header + separator

                    const parseRow = (row) => {
                        let cells = row.split('|');
                        if (cells[0].trim() === '') cells = cells.slice(1);
                        if (cells.length > 0 && cells[cells.length - 1].trim() === '') cells = cells.slice(0, -1);
                        return cells.map(c => c.trim());
                    };

                    const heads = parseRow(headerLine).map(c => `<th>${c}</th>`).join('');
                    let rows = '';

                    while (i < tableLines.length && tableLines[i].trim().startsWith('|')) {
                        const cells = parseRow(tableLines[i]);
                        rows += `<tr>${cells.map(c => `<td>${c}</td>`).join('')}</tr>`;
                        i++;
                    }

                    newText += `<table><thead><tr>${heads}</tr></thead><tbody>${rows}</tbody></table>\n`;
                    continue;
                }
            }
            newText += line + '\n';
            i++;
        }
        text = newText;

        // Paragraphs
        text = text.replace(/\n\n/g, '</p><p>');
        text = text.replace(/\n/g, '<br>');
        text = `<p>${text}</p>`;

        // Cleanup
        text = text.replace(/<p>\s*<\/p>/g, '');
        text = text.replace(/<p>\s*(<(?:h[1-4]|pre|ul|blockquote|hr|table)>)/g, '$1');
        text = text.replace(/(<\/(?:h[1-4]|pre|ul|blockquote|table)>)\s*<\/p>/g, '$1');
        text = text.replace(/<p>\s*(<hr>)/g, '$1');

        return text;
    }

    function copy(btn) {
        const code = btn.closest('pre').querySelector('code');
        navigator.clipboard.writeText(code.textContent).then(() => {
            btn.textContent = 'copied';
            btn.classList.add('ok');
            setTimeout(() => { btn.textContent = 'copy'; btn.classList.remove('ok'); }, 2000);
        });
    }

    function renderFilePreview() {
        const atts = window._wormAttachments || [];
        if (atts.length === 0) {
            dom.filePreview.classList.remove('has-files');
            dom.filePreview.innerHTML = '';
            return;
        }
        dom.filePreview.classList.add('has-files');
        // Re-render is handled by the extendWorm below
    }

    function removeFile(idx) {
        if (!window._wormAttachments) return;
        window._wormAttachments.splice(idx, 1);
        // Trigger re-render from the extend module
        if (window._renderWormPreview) window._renderWormPreview();
    }

    function scrollDown() { dom.messages.scrollTop = dom.messages.scrollHeight; }

    function esc(t) {
        const d = document.createElement('div');
        d.textContent = t;
        return d.innerHTML;
    }

    // ═══ REPORT & EXPORT ═══
    async function generateReport() {
        if (!chatId) return alert('No active chat. Start a conversation first.');
        const btn = $('#btn-report');
        btn.classList.add('loading');
        btn.textContent = 'Generating...';

        try {
            const r = await fetch('/api/report', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chat_id: chatId }),
            });
            const data = await r.json();
            if (data.error) {
                alert('Report error: ' + data.error);
                return;
            }

            addMsg('assistant', data.report);
            scrollDown();

            downloadFile(`pentest-report-${chatId.slice(0, 8)}.md`, data.report);
        } catch (e) {
            alert('Failed to generate report: ' + e.message);
        } finally {
            btn.classList.remove('loading');
            btn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg> Report';
        }
    }

    async function exportChat() {
        if (!chatId) return alert('No active chat. Start a conversation first.');
        try {
            const r = await fetch(`/api/export/${chatId}`);
            const data = await r.json();
            if (data.error) return alert('Export error: ' + data.error);
            downloadFile(`worm-chat-${chatId.slice(0, 8)}.md`, data.markdown);
        } catch (e) {
            alert('Export failed: ' + e.message);
        }
    }

    function downloadFile(filename, content) {
        const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    }

    async function autoScan() {
        const target = prompt('Enter IP address or domain to auto-scan:');
        if (!target || !target.trim()) return;

        const btn = $('#btn-autoscan');
        btn.classList.add('loading');
        btn.textContent = 'Scanning...';

        dom.welcome.style.display = 'none';
        addMsg('user', `Auto-Scan: ${target.trim()}`);
        const el = addMsg('assistant', '', true);
        const textEl = el.querySelector('.msg-text');
        textEl.innerHTML = '<span style="color:var(--accent)">Running Shodan + VirusTotal + AI Analysis...</span>';

        try {
            const r = await fetch('/api/tools/autoscan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ target: target.trim() }),
            });
            const data = await r.json();

            if (data.error) {
                textEl.innerHTML = `<span style="color:var(--accent)">Error: ${esc(data.error)}</span>`;
                return;
            }

            // Display the AI analysis
            if (data.analysis) {
                textEl.innerHTML = md(data.analysis);
            } else {
                textEl.innerHTML = '<span style="color:var(--text-muted)">No analysis available</span>';
            }

            const typ = el.querySelector('.typing');
            if (typ) typ.remove();
            scrollDown();

        } catch (e) {
            textEl.innerHTML = `<span style="color:var(--accent)">Scan failed: ${esc(e.message)}</span>`;
        } finally {
            btn.classList.remove('loading');
            btn.innerHTML = '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="22" y1="12" x2="18" y2="12"/><line x1="6" y1="12" x2="2" y2="12"/><line x1="12" y1="6" x2="12" y2="2"/><line x1="12" y1="22" x2="12" y2="18"/></svg> Scan';
        }
    }

    // ═══ VOICE INPUT (F6) ═══
    let recognition = null;
    let isRecording = false;

    function toggleVoice() {
        const mic = $('#btn-mic');

        if (isRecording && recognition) {
            recognition.stop();
            return;
        }

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            alert('Voice input not supported in this browser. Use Chrome.');
            return;
        }

        recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        let finalTranscript = dom.input.value;

        recognition.onstart = () => {
            isRecording = true;
            mic.classList.add('recording');
            mic.title = 'Stop Recording';
        };

        recognition.onresult = (e) => {
            let interim = '';
            for (let i = e.resultIndex; i < e.results.length; i++) {
                if (e.results[i].isFinal) {
                    finalTranscript += e.results[i][0].transcript + ' ';
                } else {
                    interim += e.results[i][0].transcript;
                }
            }
            dom.input.value = finalTranscript + interim;
            dom.input.dispatchEvent(new Event('input'));
        };

        recognition.onend = () => {
            isRecording = false;
            mic.classList.remove('recording');
            mic.title = 'Voice Input';
            dom.input.value = finalTranscript.trim();
            dom.input.focus();
        };

        recognition.onerror = (e) => {
            isRecording = false;
            mic.classList.remove('recording');
            if (e.error !== 'no-speech') alert('Mic error: ' + e.error);
        };

        recognition.start();
    }

    // ═══ CODE SANDBOX (F7) ═══
    window.runCodeBlock = function (btn) {
        const wrapper = btn.closest('.code-block');
        const codeEl = wrapper.querySelector('code');
        const code = codeEl.textContent;

        let outputEl = wrapper.querySelector('.code-output');
        if (!outputEl) {
            outputEl = document.createElement('div');
            outputEl.className = 'code-output';
            wrapper.appendChild(outputEl);
        }

        outputEl.classList.remove('error');
        outputEl.textContent = '';

        const logs = [];
        const origLog = console.log;
        const origError = console.error;
        console.log = (...args) => logs.push(args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' '));
        console.error = (...args) => logs.push('ERROR: ' + args.join(' '));

        try {
            const result = eval(code);
            const output = logs.join('\n');
            outputEl.textContent = output || (result !== undefined ? String(result) : '(no output)');
        } catch (e) {
            outputEl.textContent = `Error: ${e.message}`;
            outputEl.classList.add('error');
        } finally {
            console.log = origLog;
            console.error = origError;
        }
    };

    // ═══ PLUGIN SYSTEM (F8) ═══
    async function openPlugins() {
        try {
            const r = await fetch('/api/plugins');
            const plugins = await r.json();
            const names = Object.entries(plugins).map(([id, p]) => `${p.icon} ${p.name} (${id})`).join('\n');
            const choice = prompt(`Available plugins:\n${names}\n\nEnter plugin ID:`);
            if (!choice) return;

            const plugin = plugins[choice.trim()];
            if (!plugin) return alert('Unknown plugin: ' + choice);

            const cmdList = plugin.commands.join('\n');
            const cmd = prompt(`${plugin.name} commands:\n${cmdList}\n\nEnter command to run:`);
            if (!cmd) return;

            const target = prompt('Enter target (IP/domain/value):');
            if (!target) return;

            dom.welcome.style.display = 'none';
            addMsg('user', `Plugin [${plugin.name}]: ${cmd.replace('{target}', target)}`);
            const el = addMsg('assistant', '', true);
            const textEl = el.querySelector('.msg-text');
            textEl.innerHTML = `<span style="color:var(--accent-green)">Running ${plugin.name}...</span>`;

            const resp = await fetch('/api/plugins/run', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ plugin: choice.trim(), command: cmd, params: { target } }),
            });
            const data = await resp.json();

            if (data.output) {
                textEl.innerHTML = md(data.output);
            } else {
                textEl.innerHTML = `<span style="color:var(--accent)">Error: ${esc(data.error || 'Unknown')}</span>`;
            }

            const typ = el.querySelector('.typing');
            if (typ) typ.remove();
            scrollDown();
        } catch (e) {
            alert('Plugin error: ' + e.message);
        }
    }

    // ═══ SESSION ENCRYPTION (F9) ═══
    async function encryptExport() {
        if (!chatId) return alert('No active chat.');
        const password = prompt('Enter encryption password:');
        if (!password) return;

        try {
            const r = await fetch(`/api/export/${chatId}`);
            const chatData = await r.json();
            if (chatData.error) return alert(chatData.error);

            const encResp = await fetch('/api/encrypt', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: chatData.markdown, password }),
            });
            const encData = await encResp.json();
            if (encData.error) return alert(encData.error);

            downloadFile(`worm-encrypted-${chatId.slice(0, 8)}.enc`, encData.encrypted);
            alert('Chat exported and encrypted!');
        } catch (e) {
            alert('Encryption failed: ' + e.message);
        }
    }

    // ═══ DUAL AGENT MODE (F10) ═══
    async function dualAgent() {
        const message = prompt('Enter prompt for dual-agent comparison:');
        if (!message) return;

        dom.welcome.style.display = 'none';
        addMsg('user', `[Dual Agent] ${message}`);
        const el = addMsg('assistant', '', true);
        const textEl = el.querySelector('.msg-text');
        textEl.innerHTML = '<span style="color:var(--accent-cyan)">Running dual agents...</span>';

        try {
            const r = await fetch('/api/agent/dual', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message }),
            });
            const data = await r.json();

            let html = '';
            if (data.agent_a) {
                html += `<h3 style="color:var(--accent)">Agent A: ${esc(data.agent_a.model)}</h3>\n${md(data.agent_a.response)}`;
            }
            if (data.agent_b) {
                html += `<hr style="border-color:var(--border);margin:16px 0"><h3 style="color:var(--accent-cyan)">Agent B: ${esc(data.agent_b.model)}</h3>\n${md(data.agent_b.response)}`;
            }

            textEl.innerHTML = html || 'No results';
            const typ = el.querySelector('.typing');
            if (typ) typ.remove();
            scrollDown();
        } catch (e) {
            textEl.innerHTML = `<span style="color:var(--accent)">Dual agent failed: ${esc(e.message)}</span>`;
        }
    }

    return { init, openChat, delChat, copy, newChat, switchModel, removeFile, applyEdit, undoEdit };
})();

// ══════ FILE UPLOAD HANDLER ══════
function handleFileSelect(e) {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    files.forEach(async (file) => {
        const formData = new FormData();
        formData.append('file', file);

        try {
            const r = await fetch('/api/upload', { method: 'POST', body: formData });
            const data = await r.json();

            if (data.error) {
                console.error('Upload error:', data.error);
                return;
            }

            Worm._addAttachment(data);
        } catch (err) {
            console.error('Upload failed:', err);
        }
    });

    e.target.value = '';
}

// Expose internal attachment methods
(function extendWorm() {
    const $ = (s) => document.querySelector(s);
    let _attachments = [];

    // Monkey-patch via exposed reference
    Worm._addAttachment = function (data) {
        // Access the module's attachments via a shared reference
        _addToPreview(data);
    };

    function _addToPreview(data) {
        // We need to push to the Worm's attachments - use a global bridge
        if (!window._wormAttachments) window._wormAttachments = [];
        window._wormAttachments.push(data);
        _renderPreview();
    }

    function _renderPreview() {
        const preview = $('#file-preview');
        const atts = window._wormAttachments || [];

        if (atts.length === 0) {
            preview.classList.remove('has-files');
            preview.innerHTML = '';
            return;
        }

        preview.classList.add('has-files');
        preview.innerHTML = atts.map((a, i) => {
            let icon = '';
            let thumb = '';

            if (a.type === 'image' && a.data) {
                thumb = `<img class="file-chip-thumb" src="${a.data}" alt="">`;
            } else if (a.type === 'code') {
                icon = `<svg class="file-chip-icon code" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>`;
            } else {
                icon = `<svg class="file-chip-icon doc" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`;
            }

            return `<div class="file-chip">
                ${thumb}${icon}
                <span class="file-chip-name">${a.name}</span>
                <button class="file-chip-close" onclick="Worm.removeFile(${i})">&times;</button>
            </div>`;
        }).join('');
    }
    // ══════ PAYLOAD GENERATOR ══════
    async function openPayloadGen() {
        const ip = prompt('Enter your listener IP (LHOST):');
        if (!ip) return;
        const port = prompt('Enter your listener port (LPORT):', '4444');
        if (!port) return;

        addMsg('user', `Generate reverse shells for ${ip}:${port}`);
        const el = addMsg('assistant', '', true);
        const textEl = el.querySelector('.msg-text');
        textEl.innerHTML = '<span class="typing">Generating payloads...</span>';

        try {
            const res = await fetch('/api/tools/payload', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ip, port })
            });
            const data = await res.json();
            if (data.error) { textEl.innerHTML = `<span style="color:var(--accent)">Error: ${esc(data.error)}</span>`; return; }

            let html = `<h3>Reverse Shells for ${esc(ip)}:${esc(port)}</h3>`;
            for (const [name, payload] of Object.entries(data.payloads)) {
                const label = name.replace(/_/g, ' ').toUpperCase();
                html += `<div style="margin:10px 0"><strong style="color:var(--accent)">${label}</strong><pre style="background:#0a0a12;padding:12px;border-radius:8px;overflow-x:auto;border:1px solid rgba(255,255,255,0.06);cursor:pointer;position:relative" onclick="navigator.clipboard.writeText(this.innerText).then(()=>{this.style.borderColor='#22c55e';setTimeout(()=>this.style.borderColor='rgba(255,255,255,0.06)',1000)})" title="Click to copy"><code>${esc(payload)}</code></pre></div>`;
            }
            html += '<p style="color:var(--text-muted);font-size:0.75rem">Click any payload to copy</p>';
            textEl.innerHTML = html;
            scrollDown();
        } catch (e) {
            textEl.innerHTML = `<span style="color:var(--accent)">Payload gen failed: ${esc(e.message)}</span>`;
        }
    }

    // ══════ ENCODER/DECODER ══════
    async function openEncoder() {
        const text = prompt('Enter text to encode/decode:');
        if (!text) return;
        const action = prompt('Action? (encode / decode):', 'encode');
        if (!action) return;
        const encoding = prompt('Format? (base64 / hex / url / rot13 / binary):', 'base64');
        if (!encoding) return;

        addMsg('user', `${action} "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}" as ${encoding}`);
        const el = addMsg('assistant', '', true);
        const textEl = el.querySelector('.msg-text');

        try {
            const res = await fetch('/api/tools/encoder', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text, action, encoding })
            });
            const data = await res.json();
            textEl.innerHTML = `
                <h3>${esc(action.toUpperCase())} — ${esc(encoding.toUpperCase())}</h3>
                <div style="margin:8px 0;color:var(--text-muted);font-size:0.75rem">Input:</div>
                <pre style="background:#0a0a12;padding:12px;border-radius:8px;border:1px solid rgba(255,255,255,0.06);overflow-x:auto"><code>${esc(text)}</code></pre>
                <div style="margin:8px 0;color:var(--accent);font-size:0.75rem">Result:</div>
                <pre style="background:#0a0a12;padding:12px;border-radius:8px;border:1px solid var(--accent);overflow-x:auto;cursor:pointer" onclick="navigator.clipboard.writeText(this.innerText).then(()=>{this.style.borderColor='#22c55e';setTimeout(()=>this.style.borderColor='var(--accent)',1000)})" title="Click to copy"><code>${esc(data.result)}</code></pre>
            `;
            scrollDown();
        } catch (e) {
            textEl.innerHTML = `<span style="color:var(--accent)">Encoder failed: ${esc(e.message)}</span>`;
        }
    }

    // ══════ HASH IDENTIFIER ══════
    async function openHashTool() {
        const hash = prompt('Paste hash to identify:');
        if (!hash) return;

        addMsg('user', `Identify hash: ${hash.substring(0, 40)}${hash.length > 40 ? '...' : ''}`);
        const el = addMsg('assistant', '', true);
        const textEl = el.querySelector('.msg-text');

        try {
            const res = await fetch('/api/tools/hash', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ hash })
            });
            const data = await res.json();
            if (data.error) { textEl.innerHTML = `<span style="color:var(--accent)">${esc(data.error)}</span>`; return; }

            const types = data.possible_types.map(t => `<span style="background:rgba(220,38,38,0.15);color:var(--accent);padding:4px 10px;border-radius:6px;font-weight:600">${esc(t)}</span>`).join(' ');
            textEl.innerHTML = `
                <h3>Hash Analysis</h3>
                <div style="background:#0a0a12;padding:16px;border-radius:10px;border:1px solid rgba(255,255,255,0.06);margin:10px 0">
                    <div style="font-size:0.75rem;color:var(--text-muted);margin-bottom:4px">HASH</div>
                    <code style="word-break:break-all;font-size:0.85rem">${esc(data.hash)}</code>
                    <div style="margin-top:12px;display:flex;gap:10px;flex-wrap:wrap">
                        <span style="background:rgba(255,255,255,0.05);padding:4px 10px;border-radius:6px;font-size:0.75rem">Length: ${data.length}</span>
                        <span style="background:rgba(255,255,255,0.05);padding:4px 10px;border-radius:6px;font-size:0.75rem">Hex: ${data.is_hex ? 'Yes' : 'No'}</span>
                    </div>
                </div>
                <div style="margin-top:12px">
                    <div style="font-size:0.75rem;color:var(--text-muted);margin-bottom:8px">POSSIBLE TYPES</div>
                    <div style="display:flex;gap:8px;flex-wrap:wrap">${types}</div>
                </div>
            `;
            scrollDown();
        } catch (e) {
            textEl.innerHTML = `<span style="color:var(--accent)">Hash ID failed: ${esc(e.message)}</span>`;
        }
    }

    // ══════ OSINT RECON ══════
    async function openOsintRecon() {
        const target = prompt('Enter target domain or IP:');
        if (!target) return;

        addMsg('user', `OSINT Recon: ${target}`);
        const el = addMsg('assistant', '', true);
        const textEl = el.querySelector('.msg-text');
        textEl.innerHTML = '<span class="typing">Running OSINT modules... DNS + Shodan + VirusTotal</span>';

        try {
            const res = await fetch('/api/tools/osint', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ target })
            });
            const data = await res.json();
            if (data.error) { textEl.innerHTML = `<span style="color:var(--accent)">${esc(data.error)}</span>`; return; }

            let html = `<h3>OSINT Recon: ${esc(target)}</h3>`;
            const m = data.modules;

            // DNS
            if (m.dns) {
                html += `<div style="background:#0a0a12;padding:14px;border-radius:10px;border:1px solid rgba(255,255,255,0.06);margin:8px 0">
                    <strong style="color:#3b82f6">DNS Resolution</strong>
                    <div style="margin-top:6px">${m.dns.status === 'ok' ? m.dns.ips.map(ip => `<code style="margin:2px 4px;padding:2px 8px;background:rgba(59,130,246,0.1);border-radius:4px">${esc(ip)}</code>`).join('') : `<span style="color:var(--accent)">${esc(m.dns.error)}</span>`}</div>
                </div>`;
            }

            // Shodan
            if (m.shodan) {
                html += `<div style="background:#0a0a12;padding:14px;border-radius:10px;border:1px solid rgba(255,255,255,0.06);margin:8px 0">
                    <strong style="color:#f59e0b">Shodan</strong>`;
                if (m.shodan.status === 'ok') {
                    html += `<div style="margin-top:6px;display:flex;gap:12px;flex-wrap:wrap;font-size:0.8rem">
                        <div>Org: <strong>${esc(m.shodan.org)}</strong></div>
                        <div>OS: <strong>${esc(m.shodan.os || 'N/A')}</strong></div>
                        <div>Ports: <strong>${m.shodan.ports.join(', ') || 'N/A'}</strong></div>
                    </div>`;
                    if (m.shodan.vulns && m.shodan.vulns.length) {
                        html += `<div style="margin-top:6px"><span style="color:var(--accent);font-weight:600">Vulnerabilities:</span> ${m.shodan.vulns.map(v => `<code style="color:var(--accent)">${esc(v)}</code>`).join(' ')}</div>`;
                    }
                } else {
                    html += `<div style="margin-top:4px;color:var(--text-muted)">${esc(m.shodan.error || 'No data')}</div>`;
                }
                html += `</div>`;
            }

            // VirusTotal
            if (m.virustotal) {
                html += `<div style="background:#0a0a12;padding:14px;border-radius:10px;border:1px solid rgba(255,255,255,0.06);margin:8px 0">
                    <strong style="color:#22c55e">VirusTotal</strong>`;
                if (m.virustotal.status === 'ok') {
                    const stats = m.virustotal.last_analysis_stats || {};
                    html += `<div style="margin-top:6px;display:flex;gap:12px;flex-wrap:wrap;font-size:0.8rem">
                        <div>Reputation: <strong>${m.virustotal.reputation}</strong></div>
                        <div style="color:#22c55e">Clean: ${stats.harmless || 0}</div>
                        <div style="color:var(--accent)">Malicious: ${stats.malicious || 0}</div>
                        <div style="color:#f59e0b">Suspicious: ${stats.suspicious || 0}</div>
                    </div>`;
                } else {
                    html += `<div style="margin-top:4px;color:var(--text-muted)">${esc(m.virustotal.error || 'No data')}</div>`;
                }
                html += `</div>`;
            }

            textEl.innerHTML = html;
            scrollDown();
        } catch (e) {
            textEl.innerHTML = `<span style="color:var(--accent)">OSINT recon failed: ${esc(e.message)}</span>`;
        }
    }

    // Share function
    async function shareLink() {
        const btn = document.getElementById('btn-share');
        if (btn) btn.style.opacity = '0.5';
        try {
            const res = await fetch('/api/share', { method: 'POST', credentials: 'include' });
            if (res.status === 401) {
                alert('Session expired — please log in again.');
                window.location.href = '/login';
                return;
            }
            let data;
            try { data = await res.json(); } catch (e) { throw new Error('Invalid response from server (are you logged in?)'); }

            if (data.error) {
                alert('Share Error: ' + data.error);
            } else {
                const url = data.url;
                prompt('Public link generated! Share this URL (Ctrl+C to copy):\n\nNote: If you reload or close the server, the link will expire.', url);
            }
        } catch (e) {
            alert('Share Error: ' + e.message);
        } finally {
            if (btn) btn.style.opacity = '1';
        }
    }

    // Expose globally so Worm.removeFile can trigger re-render
    window._renderWormPreview = _renderPreview;
    window.shareLink = shareLink;
})();

// ══════ TOOL PANELS ══════
const ToolPanel = (() => {
    function open(tool) {
        document.getElementById(`panel-${tool}`).classList.add('open');
        document.getElementById('overlay').classList.add('show');
    }

    function close(tool) {
        document.getElementById(`panel-${tool}`).classList.remove('open');
        document.getElementById('overlay').classList.remove('show');
    }

    async function runShodan() {
        const query = document.getElementById('shodan-query').value.trim();
        const type = document.getElementById('shodan-type').value;
        const output = document.getElementById('shodan-output');

        if (!query) return;

        output.style.display = 'block';
        output.textContent = 'Scanning...';

        try {
            const r = await fetch('/api/tools/shodan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query, type }),
            });
            const data = await r.json();
            output.textContent = JSON.stringify(data, null, 2);
        } catch (e) {
            output.textContent = `Error: ${e.message}`;
        }
    }

    async function runVT() {
        const query = document.getElementById('vt-query').value.trim();
        const type = document.getElementById('vt-type').value;
        const output = document.getElementById('vt-output');

        if (!query) return;

        output.style.display = 'block';
        output.textContent = 'Analyzing...';

        try {
            const r = await fetch('/api/tools/virustotal', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query, type }),
            });
            const data = await r.json();
            output.textContent = JSON.stringify(data, null, 2);
        } catch (e) {
            output.textContent = `Error: ${e.message}`;
        }
    }

    return { open, close, runShodan, runVT };
})();

// ══════ TEMPLATES PANEL ══════
const TemplatesPanel = (() => {
    let templates = null;

    async function load() {
        if (templates) return templates;
        try {
            const r = await fetch('/api/templates');
            templates = await r.json();
            return templates;
        } catch (e) {
            console.error('Failed to load templates:', e);
            return {};
        }
    }

    async function open() {
        const panel = document.getElementById('templates-panel');
        const overlay = document.getElementById('templates-overlay');
        const content = document.getElementById('templates-content');

        const data = await load();
        content.innerHTML = '';

        for (const [category, items] of Object.entries(data)) {
            const cat = document.createElement('div');
            cat.className = 'template-category';
            cat.innerHTML = `
                <div class="template-category-header">
                    <span class="template-category-title">${category}</span>
                    <span class="template-category-count">${items.length}</span>
                </div>
                <div class="template-category-items">
                    ${items.map(t => `
                        <div class="template-item" data-prompt="${t.prompt.replace(/"/g, '&quot;')}">
                            <div class="template-item-title">${t.title}</div>
                            <div class="template-item-preview">${t.prompt}</div>
                        </div>
                    `).join('')}
                </div>
            `;

            // Accordion toggle
            cat.querySelector('.template-category-header').addEventListener('click', () => {
                cat.classList.toggle('open');
            });

            // Click-to-insert
            cat.querySelectorAll('.template-item').forEach(item => {
                item.addEventListener('click', () => {
                    const input = document.getElementById('chat-input');
                    input.value = item.dataset.prompt;
                    input.focus();
                    input.dispatchEvent(new Event('input'));
                    close();
                });
            });

            content.appendChild(cat);
        }

        panel.classList.add('open');
        overlay.classList.add('active');
    }

    function close() {
        document.getElementById('templates-panel').classList.remove('open');
        document.getElementById('templates-overlay').classList.remove('active');
    }

    function init() {
        document.getElementById('btn-templates').addEventListener('click', open);
        document.getElementById('templates-close').addEventListener('click', close);
        document.getElementById('templates-overlay').addEventListener('click', close);
    }

    return { init, open, close };
})();

document.addEventListener('DOMContentLoaded', () => {
    Worm.init();
    TemplatesPanel.init();
});
