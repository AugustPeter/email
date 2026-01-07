// ==================== ESTADO DA APLICAÇÃO ====================
let currentUser = null;
let notes = [];
let currentNoteId = null;
let autoSaveTimeout = null;
let popupWindows = [];

// ==================== INICIALIZAÇÃO ====================
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    setupEventListeners();
    setupKeyboardShortcuts();
    loadTheme();
    checkAutoLogin();
});

// ==================== CONFIGURAÇÃO INICIAL ====================
function initializeApp() {
    console.log('App inicializado');
}

function checkAutoLogin() {
    const savedEmail = localStorage.getItem('userEmail');
    if (savedEmail) {
        login(savedEmail);
    }
}

// ==================== LOGIN E AUTENTICAÇÃO ====================
function login(email) {
    if (!email || !validateEmail(email)) {
        showStatus('Por favor, insira um e-mail válido', 'error');
        return;
    }

    currentUser = email;
    localStorage.setItem('userEmail', email);
    
    document.getElementById('userEmail').textContent = email;
    document.getElementById('loginScreen').classList.remove('active');
    document.getElementById('mainApp').classList.add('active');
    
    loadNotes();
    showStatus('Login realizado com sucesso!', 'success');
}

function logout() {
    if (confirm('Deseja realmente sair? Certifique-se de que suas notas foram sincronizadas.')) {
        currentUser = null;
        currentNoteId = null;
        notes = [];
        localStorage.removeItem('userEmail');
        
        // Fechar todos os pop-ups
        popupWindows.forEach(popup => popup.close());
        popupWindows = [];
        
        document.getElementById('mainApp').classList.remove('active');
        document.getElementById('loginScreen').classList.add('active');
        document.getElementById('emailInput').value = '';
        
        showStatus('Logout realizado', 'info');
    }
}

function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

// ==================== GERENCIAMENTO DE NOTAS ====================
function loadNotes() {
    // Carregar notas do localStorage (modo offline)
    const savedNotes = localStorage.getItem(`notes_${currentUser}`);
    if (savedNotes) {
        notes = JSON.parse(savedNotes);
    } else {
        notes = [];
    }
    
    // Tentar sincronizar com o servidor
    syncWithServer();
    
    renderNotesList();
}

function saveNotesToLocal() {
    localStorage.setItem(`notes_${currentUser}`, JSON.stringify(notes));
}

function createNote() {
    const newNote = {
        id: Date.now().toString(),
        title: 'Nova Nota',
        content: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        userEmail: currentUser
    };
    
    notes.unshift(newNote);
    saveNotesToLocal();
    renderNotesList();
    selectNote(newNote.id);
    
    // Focar no título
    document.getElementById('noteTitle').focus();
    document.getElementById('noteTitle').select();
    
    showStatus('Nova nota criada', 'success');
}

function selectNote(noteId) {
    currentNoteId = noteId;
    const note = notes.find(n => n.id === noteId);
    
    if (!note) return;
    
    // Atualizar UI
    document.getElementById('noNoteSelected').style.display = 'none';
    document.getElementById('noteEditor').classList.remove('hidden');
    
    document.getElementById('noteTitle').value = note.title;
    document.getElementById('noteContent').value = note.content;
    
    updateCharCount();
    updateLastSaved(note.updatedAt);
    updateDocumentTitle();
    
    // Atualizar seleção na lista
    document.querySelectorAll('.note-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.noteId === noteId) {
            item.classList.add('active');
        }
    });
}

function saveCurrentNote(manual = false) {
    if (!currentNoteId) return;
    
    const note = notes.find(n => n.id === currentNoteId);
    if (!note) return;
    
    const title = document.getElementById('noteTitle').value || 'Sem título';
    const content = document.getElementById('noteContent').value;
    
    note.title = title;
    note.content = content;
    note.updatedAt = new Date().toISOString();
    
    saveNotesToLocal();
    renderNotesList();
    updateDocumentTitle();
    updateLastSaved(note.updatedAt);
    
    if (manual) {
        showStatus('Nota salva com sucesso!', 'success');
    }
    
    // Sincronizar com servidor em background
    syncWithServer();
}

function deleteCurrentNote() {
    if (!currentNoteId) return;
    
    const note = notes.find(n => n.id === currentNoteId);
    if (!note) return;
    
    if (confirm(`Deseja realmente excluir a nota "${note.title}"?`)) {
        notes = notes.filter(n => n.id !== currentNoteId);
        saveNotesToLocal();
        
        currentNoteId = null;
        document.getElementById('noteEditor').classList.add('hidden');
        document.getElementById('noNoteSelected').style.display = 'flex';
        
        renderNotesList();
        showStatus('Nota excluída', 'info');
        
        syncWithServer();
    }
}

function renderNotesList() {
    const notesList = document.getElementById('notesList');
    
    if (notes.length === 0) {
        notesList.innerHTML = '<div class="no-note"><p>Nenhuma nota ainda</p></div>';
        return;
    }
    
    // Ordenar por data de atualização
    const sortedNotes = [...notes].sort((a, b) => 
        new Date(b.updatedAt) - new Date(a.updatedAt)
    );
    
    notesList.innerHTML = sortedNotes.map(note => `
        <div class="note-item ${note.id === currentNoteId ? 'active' : ''}" 
             data-note-id="${note.id}"
             onclick="selectNote('${note.id}')">
            <div class="note-item-title">${escapeHtml(note.title)}</div>
            <div class="note-item-preview">${escapeHtml(note.content.substring(0, 50))}${note.content.length > 50 ? '...' : ''}</div>
            <div class="note-item-date">${formatDate(note.updatedAt)}</div>
        </div>
    `).join('');
}

// ==================== POP-UP WINDOWS ====================
function openNoteInPopup() {
    if (!currentNoteId) {
        showStatus('Selecione uma nota primeiro', 'error');
        return;
    }
    
    const note = notes.find(n => n.id === currentNoteId);
    if (!note) return;
    
    // Criar janela pop-up
    const popup = window.open('', `note_${note.id}`, 'width=600,height=400,resizable=yes,scrollbars=yes');
    
    if (!popup) {
        showStatus('Pop-up bloqueado! Permita pop-ups para este site', 'error');
        return;
    }
    
    const theme = document.body.getAttribute('data-theme') || 'light';
    
    popup.document.write(`
        <!DOCTYPE html>
        <html lang="pt-BR" data-theme="${theme}">
        <head>
            <meta charset="UTF-8">
            <title>${escapeHtml(note.title)}</title>
            <style>
                ${getPopupStyles()}
            </style>
        </head>
        <body>
            <div class="popup-window">
                <div class="popup-header" id="popupHeader">
                    <div class="popup-title">${escapeHtml(note.title)}</div>
                    <div class="popup-controls">
                        <button id="alwaysOnTopBtn" title="Sempre no topo">📌</button>
                        <button onclick="window.close()" title="Fechar">✖</button>
                    </div>
                </div>
                <div class="popup-content">
                    <textarea class="popup-textarea" id="popupContent">${escapeHtml(note.content)}</textarea>
                </div>
            </div>
            <script>
                let alwaysOnTop = false;
                const noteId = '${note.id}';
                
                // Always on top
                document.getElementById('alwaysOnTopBtn').addEventListener('click', function() {
                    alwaysOnTop = !alwaysOnTop;
                    this.classList.toggle('active', alwaysOnTop);
                    if (alwaysOnTop) {
                        document.querySelector('.popup-window').classList.add('always-on-top');
                    } else {
                        document.querySelector('.popup-window').classList.remove('always-on-top');
                    }
                });
                
                // Sincronizar conteúdo com a janela principal
                const textarea = document.getElementById('popupContent');
                textarea.addEventListener('input', function() {
                    if (window.opener && !window.opener.closed) {
                        window.opener.updateNoteFromPopup(noteId, textarea.value);
                    }
                });
                
                // Auto-resize
                window.addEventListener('resize', function() {
                    localStorage.setItem('popup_size_' + noteId, JSON.stringify({
                        width: window.outerWidth,
                        height: window.outerHeight
                    }));
                });
            </script>
        </body>
        </html>
    `);
    
    popup.document.close();
    popupWindows.push(popup);
    
    showStatus('Nota aberta em pop-up', 'success');
}

function updateNoteFromPopup(noteId, content) {
    const note = notes.find(n => n.id === noteId);
    if (!note) return;
    
    note.content = content;
    note.updatedAt = new Date().toISOString();
    
    saveNotesToLocal();
    
    // Atualizar editor se estiver visualizando a mesma nota
    if (currentNoteId === noteId) {
        document.getElementById('noteContent').value = content;
        updateCharCount();
    }
    
    renderNotesList();
}

function getPopupStyles() {
    return `
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        :root {
            --bg-primary: #ffffff;
            --bg-secondary: #f5f5f5;
            --text-primary: #000000;
            --text-secondary: #666666;
            --border-color: #cccccc;
            --accent-color: #0078d4;
        }
        
        [data-theme="dark"] {
            --bg-primary: #1e1e1e;
            --bg-secondary: #252526;
            --text-primary: #e0e0e0;
            --text-secondary: #a0a0a0;
            --border-color: #3e3e42;
            --accent-color: #0e639c;
        }
        
        body {
            font-family: 'Segoe UI', sans-serif;
            background: var(--bg-primary);
            color: var(--text-primary);
            height: 100vh;
            overflow: hidden;
        }
        
        .popup-window {
            height: 100%;
            display: flex;
            flex-direction: column;
        }
        
        .popup-header {
            padding: 10px 15px;
            background: var(--bg-secondary);
            border-bottom: 1px solid var(--border-color);
            display: flex;
            justify-content: space-between;
            align-items: center;
            user-select: none;
        }
        
        .popup-title {
            font-weight: 600;
            flex: 1;
        }
        
        .popup-controls {
            display: flex;
            gap: 8px;
        }
        
        .popup-controls button {
            padding: 4px 8px;
            background: transparent;
            border: 1px solid var(--border-color);
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
            color: var(--text-primary);
        }
        
        .popup-controls button:hover {
            background: var(--border-color);
        }
        
        .popup-controls button.active {
            background: var(--accent-color);
            color: white;
            border-color: var(--accent-color);
        }
        
        .popup-content {
            flex: 1;
            padding: 15px;
            overflow-y: auto;
        }
        
        .popup-textarea {
            width: 100%;
            height: 100%;
            border: none;
            resize: none;
            font-family: 'Consolas', 'Courier New', monospace;
            font-size: 14px;
            line-height: 1.6;
            background: var(--bg-primary);
            color: var(--text-primary);
        }
        
        .popup-textarea:focus {
            outline: none;
        }
    `;
}

// ==================== SINCRONIZAÇÃO COM SERVIDOR ====================
async function syncWithServer() {
    if (!currentUser) return;
    
    const syncIcon = document.querySelector('.sync-icon');
    syncIcon.classList.add('spinning');
    
    try {
        // Enviar notas locais para o servidor
        const response = await fetch('/api/sync', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: currentUser,
                notes: notes
            })
        });
        
        if (response.ok) {
            const data = await response.json();
            
            // Atualizar notas locais com as do servidor
            if (data.notes && data.notes.length > 0) {
                notes = data.notes;
                saveNotesToLocal();
                renderNotesList();
                
                // Atualizar nota atual se ainda estiver aberta
                if (currentNoteId) {
                    selectNote(currentNoteId);
                }
            }
            
            showStatus('Sincronizado com sucesso!', 'success');
        } else {
            console.error('Erro na sincronização');
        }
    } catch (error) {
        // Modo offline - continuar usando dados locais
        console.log('Modo offline:', error);
    } finally {
        syncIcon.classList.remove('spinning');
    }
}

async function sendNotesViaEmail() {
    if (!currentUser) return;
    
    const syncIcon = document.querySelector('.sync-icon');
    syncIcon.classList.add('spinning');
    
    try {
        const response = await fetch('/api/send-email', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: currentUser,
                notes: notes
            })
        });
        
        if (response.ok) {
            showStatus('Notas enviadas por e-mail!', 'success');
        } else {
            showStatus('Erro ao enviar e-mail. Sincronização local mantida.', 'error');
        }
    } catch (error) {
        showStatus('Erro ao enviar e-mail. Sincronização local mantida.', 'error');
    } finally {
        syncIcon.classList.remove('spinning');
    }
}

// ==================== TEMA ====================
function toggleTheme() {
    const currentTheme = document.body.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.body.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    
    // Atualizar pop-ups abertos
    popupWindows.forEach(popup => {
        if (!popup.closed) {
            popup.document.documentElement.setAttribute('data-theme', newTheme);
        }
    });
}

function loadTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.body.setAttribute('data-theme', savedTheme);
}

// ==================== MINIPLAYER ====================
let miniplayerWindow = null;

function toggleMiniplayer() {
    if (miniplayerWindow && !miniplayerWindow.closed) {
        // Fechar janela existente
        miniplayerWindow.close();
        miniplayerWindow = null;
        showStatus('Miniplayer fechado', 'info');
        return;
    }
    
    // Abrir nova janela pop-up
    const width = 400;
    const height = 500;
    const left = window.screen.width - width - 20;
    const top = 20;
    
    miniplayerWindow = window.open(
        '', 
        'miniplayer',
        `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=no,status=no,menubar=no,toolbar=no,location=no`
    );
    
    if (!miniplayerWindow) {
        showStatus('Pop-up bloqueado! Permita pop-ups para este site', 'error');
        return;
    }
    
    const currentNote = currentNoteId ? notes.find(n => n.id === currentNoteId) : null;
    const theme = document.body.getAttribute('data-theme') || 'light';
    
    miniplayerWindow.document.write(`
        <!DOCTYPE html>
        <html lang="pt-BR" data-theme="${theme}">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>📝 Notas - Miniplayer</title>
            <style>
                ${getMiniplayerStyles()}
            </style>
        </head>
        <body>
            <div class="miniplayer-container">
                <div class="miniplayer-header">
                    <div class="miniplayer-title">📝 Minhas Notas</div>
                    <div class="miniplayer-controls">
                        <button id="pinBtn" class="control-btn" title="Sempre no topo">📌</button>
                        <button id="themeBtn" class="control-btn" title="Tema">🌓</button>
                        <button id="closeBtn" class="control-btn" title="Fechar">✖</button>
                    </div>
                </div>
                
                <div class="notes-selector">
                    <select id="noteSelect" class="note-select">
                        <option value="">Selecione uma nota...</option>
                        ${notes.map(n => `
                            <option value="${n.id}" ${currentNote && n.id === currentNote.id ? 'selected' : ''}>
                                ${escapeHtml(n.title)}
                            </option>
                        `).join('')}
                    </select>
                    <button id="newNoteBtn" class="btn-new" title="Nova nota">➕</button>
                </div>
                
                <div class="miniplayer-editor">
                    ${currentNote ? `
                        <input type="text" 
                               id="miniTitle" 
                               class="mini-title" 
                               placeholder="Título"
                               value="${escapeHtml(currentNote.title)}">
                        <textarea id="miniContent" 
                                  class="mini-content" 
                                  placeholder="Escreva aqui...">${escapeHtml(currentNote.content)}</textarea>
                        <div class="mini-footer">
                            <span id="charCount">${currentNote.content.length} caracteres</span>
                            <span id="lastSaved"></span>
                        </div>
                    ` : `
                        <div class="no-note-selected">
                            <p>Selecione uma nota ou crie uma nova</p>
                        </div>
                    `}
                </div>
            </div>
            
            <script>
                let currentNoteId = '${currentNote ? currentNote.id : ''}';
                let autoSaveTimeout = null;
                let alwaysOnTop = false;
                
                // Sincronizar com janela principal
                function syncWithMain() {
                    if (window.opener && !window.opener.closed) {
                        const noteId = currentNoteId;
                        const title = document.getElementById('miniTitle')?.value;
                        const content = document.getElementById('miniContent')?.value;
                        
                        if (noteId && title !== undefined && content !== undefined) {
                            window.opener.updateNoteFromMiniplayer(noteId, title, content);
                        }
                    }
                }
                
                // Botões de controle
                document.getElementById('closeBtn').addEventListener('click', () => {
                    window.close();
                });
                
                document.getElementById('pinBtn').addEventListener('click', function() {
                    alwaysOnTop = !alwaysOnTop;
                    this.classList.toggle('active', alwaysOnTop);
                    this.style.background = alwaysOnTop ? '#0078d4' : '';
                    this.style.color = alwaysOnTop ? 'white' : '';
                });
                
                document.getElementById('themeBtn').addEventListener('click', function() {
                    const current = document.documentElement.getAttribute('data-theme');
                    const newTheme = current === 'dark' ? 'light' : 'dark';
                    document.documentElement.setAttribute('data-theme', newTheme);
                    
                    if (window.opener && !window.opener.closed) {
                        window.opener.document.body.setAttribute('data-theme', newTheme);
                        window.opener.localStorage.setItem('theme', newTheme);
                    }
                });
                
                // Seletor de notas
                document.getElementById('noteSelect').addEventListener('change', function() {
                    const noteId = this.value;
                    if (noteId && window.opener && !window.opener.closed) {
                        window.opener.selectNoteInMiniplayer(noteId);
                        window.opener.refreshMiniplayer();
                    }
                });
                
                // Nova nota
                document.getElementById('newNoteBtn').addEventListener('click', function() {
                    if (window.opener && !window.opener.closed) {
                        window.opener.createNoteFromMiniplayer();
                        setTimeout(() => {
                            if (window.opener && !window.opener.closed) {
                                window.opener.refreshMiniplayer();
                            }
                        }, 200);
                    }
                });
                
                // Auto-save
                const titleInput = document.getElementById('miniTitle');
                const contentInput = document.getElementById('miniContent');
                
                if (titleInput && contentInput) {
                    const updateCharCount = () => {
                        document.getElementById('charCount').textContent = 
                            contentInput.value.length + ' caracteres';
                    };
                    
                    const autoSave = () => {
                        clearTimeout(autoSaveTimeout);
                        autoSaveTimeout = setTimeout(() => {
                            syncWithMain();
                            document.getElementById('lastSaved').textContent = 'Salvo agora';
                        }, 1000);
                    };
                    
                    titleInput.addEventListener('input', autoSave);
                    contentInput.addEventListener('input', () => {
                        updateCharCount();
                        autoSave();
                    });
                }
                
                // Atalhos
                document.addEventListener('keydown', (e) => {
                    if (e.ctrlKey && e.key === 's') {
                        e.preventDefault();
                        syncWithMain();
                        document.getElementById('lastSaved').textContent = 'Salvo!';
                    }
                });
            </script>
        </body>
        </html>
    `);
    
    miniplayerWindow.document.close();
    showStatus('Miniplayer aberto - Agora fica visível em qualquer aba!', 'success');
}

function getMiniplayerStyles() {
    return `
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        :root {
            --bg-primary: #ffffff;
            --bg-secondary: #f5f5f5;
            --bg-tertiary: #e9e9e9;
            --text-primary: #000000;
            --text-secondary: #666666;
            --border-color: #cccccc;
            --accent-color: #0078d4;
        }
        
        [data-theme="dark"] {
            --bg-primary: #1e1e1e;
            --bg-secondary: #252526;
            --bg-tertiary: #2d2d30;
            --text-primary: #e0e0e0;
            --text-secondary: #a0a0a0;
            --border-color: #3e3e42;
            --accent-color: #0e639c;
        }
        
        body {
            font-family: 'Segoe UI', sans-serif;
            background: var(--bg-primary);
            color: var(--text-primary);
            height: 100vh;
            overflow: hidden;
        }
        
        .miniplayer-container {
            height: 100%;
            display: flex;
            flex-direction: column;
        }
        
        .miniplayer-header {
            padding: 10px 15px;
            background: var(--accent-color);
            color: white;
            display: flex;
            justify-content: space-between;
            align-items: center;
            user-select: none;
        }
        
        .miniplayer-title {
            font-weight: 600;
            font-size: 0.95em;
        }
        
        .miniplayer-controls {
            display: flex;
            gap: 5px;
        }
        
        .control-btn {
            padding: 4px 8px;
            background: rgba(255, 255, 255, 0.2);
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            color: white;
            transition: background 0.2s;
        }
        
        .control-btn:hover {
            background: rgba(255, 255, 255, 0.3);
        }
        
        .control-btn.active {
            background: rgba(255, 255, 255, 0.4);
        }
        
        .notes-selector {
            padding: 10px;
            background: var(--bg-secondary);
            border-bottom: 1px solid var(--border-color);
            display: flex;
            gap: 8px;
        }
        
        .note-select {
            flex: 1;
            padding: 8px;
            border: 1px solid var(--border-color);
            border-radius: 6px;
            background: var(--bg-primary);
            color: var(--text-primary);
            font-size: 14px;
        }
        
        .btn-new {
            padding: 8px 12px;
            background: var(--accent-color);
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 16px;
        }
        
        .btn-new:hover {
            opacity: 0.9;
        }
        
        .miniplayer-editor {
            flex: 1;
            display: flex;
            flex-direction: column;
            overflow: hidden;
        }
        
        .mini-title {
            padding: 12px;
            border: none;
            border-bottom: 1px solid var(--border-color);
            background: var(--bg-primary);
            color: var(--text-primary);
            font-size: 1.1em;
            font-weight: 600;
        }
        
        .mini-title:focus {
            outline: none;
            background: var(--bg-secondary);
        }
        
        .mini-content {
            flex: 1;
            padding: 15px;
            border: none;
            resize: none;
            font-family: 'Consolas', 'Courier New', monospace;
            font-size: 14px;
            line-height: 1.6;
            background: var(--bg-primary);
            color: var(--text-primary);
        }
        
        .mini-content:focus {
            outline: none;
        }
        
        .mini-footer {
            padding: 8px 12px;
            background: var(--bg-secondary);
            border-top: 1px solid var(--border-color);
            display: flex;
            justify-content: space-between;
            font-size: 0.8em;
            color: var(--text-secondary);
        }
        
        .no-note-selected {
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            color: var(--text-secondary);
            text-align: center;
            padding: 20px;
        }
    `;
}

// Funções chamadas pelo miniplayer
function updateNoteFromMiniplayer(noteId, title, content) {
    const note = notes.find(n => n.id === noteId);
    if (!note) return;
    
    note.title = title;
    note.content = content;
    note.updatedAt = new Date().toISOString();
    
    saveNotesToLocal();
    renderNotesList();
    
    // Atualizar editor se estiver visualizando a mesma nota
    if (currentNoteId === noteId) {
        document.getElementById('noteTitle').value = title;
        document.getElementById('noteContent').value = content;
        updateCharCount();
        updateLastSaved(note.updatedAt);
    }
    
    syncWithServer();
}

function selectNoteInMiniplayer(noteId) {
    selectNote(noteId);
}

function createNoteFromMiniplayer() {
    createNote();
}

function refreshMiniplayer() {
    if (miniplayerWindow && !miniplayerWindow.closed) {
        miniplayerWindow.close();
        miniplayerWindow = null;
        setTimeout(() => toggleMiniplayer(), 100);
    }
}

// Remover código antigo do miniplayer inline
let miniplayerMode = false;
let miniplayerPosition = { x: 0, y: 0 };
let isDragging = false;
let dragOffset = { x: 0, y: 0 };

function setupMiniplayerDrag() {
    // Não usado mais - miniplayer é janela separada
}

function removeMiniplayerDrag() {
    // Não usado mais
}

function startDragging(e) {
    // Não usado mais
}

function drag(e) {
    // Não usado mais
}

function stopDragging() {
    // Não usado mais
}

function loadMiniplayerState() {
    // Não carregar automaticamente mais
}

// ==================== SIDEBAR TOGGLE ====================
function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    sidebar.classList.toggle('show');
    localStorage.setItem('sidebarVisible', sidebar.classList.contains('show'));
}

function loadSidebarState() {
    const sidebarVisible = localStorage.getItem('sidebarVisible');
    if (sidebarVisible === 'true') {
        document.querySelector('.sidebar').classList.add('show');
    }
}

// Carregar estado da sidebar ao fazer login
document.addEventListener('DOMContentLoaded', () => {
    loadSidebarState();
});

// ==================== ATUALIZAR TÍTULO ====================
function updateDocumentTitle() {
    const note = currentNoteId ? notes.find(n => n.id === currentNoteId) : null;
    const titleElement = document.querySelector('.header-left h2');
    
    if (note) {
        titleElement.textContent = note.title || 'Sem título';
        document.title = `${note.title || 'Sem título'} - Notas`;
    } else {
        titleElement.textContent = 'Sem título';
        document.title = 'Notas';
    }
}

// ==================== TAMANHO DA FONTE ====================
function changeFontSize(size) {
    document.getElementById('noteContent').style.fontSize = size + 'px';
    localStorage.setItem('fontSize', size);
}

function loadFontSize() {
    const savedSize = localStorage.getItem('fontSize') || '16';
    document.getElementById('noteContent').style.fontSize = savedSize + 'px';
    document.getElementById('fontSizeSelect').value = savedSize;
}

// ==================== UTILIDADES ====================
function updateCharCount() {
    const content = document.getElementById('noteContent').value;
    document.getElementById('charCount').textContent = `${content.length} caracteres`;
}

function updateLastSaved(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    
    let text = '';
    if (diffMins < 1) {
        text = 'Salvo agora';
    } else if (diffMins < 60) {
        text = `Salvo há ${diffMins} min`;
    } else {
        text = `Salvo às ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
    }
    
    document.getElementById('lastSaved').textContent = text;
}

function formatDate(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
        return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
        return 'Ontem';
    } else if (diffDays < 7) {
        return `${diffDays} dias atrás`;
    } else {
        return date.toLocaleDateString('pt-BR');
    }
}

function showStatus(message, type = 'info') {
    const statusBar = document.getElementById('statusBar');
    const statusText = document.getElementById('statusText');
    
    statusText.textContent = message;
    statusBar.className = `status-bar ${type} show`;
    
    setTimeout(() => {
        statusBar.classList.remove('show');
    }, 3000);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ==================== EVENT LISTENERS ====================
function setupEventListeners() {
    // Login
    document.getElementById('loginBtn').addEventListener('click', () => {
        const email = document.getElementById('emailInput').value.trim();
        login(email);
    });
    
    document.getElementById('emailInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const email = document.getElementById('emailInput').value.trim();
            login(email);
        }
    });
    
    // Logout
    document.getElementById('logoutBtn').addEventListener('click', logout);
    
    // Nova nota
    document.getElementById('newNoteBtn').addEventListener('click', createNote);
    
    // Salvar nota
    document.getElementById('saveBtn').addEventListener('click', () => saveCurrentNote(true));
    
    // Excluir nota
    document.getElementById('deleteBtn').addEventListener('click', deleteCurrentNote);
    
    // Pop-up
    document.getElementById('popupBtn').addEventListener('click', openNoteInPopup);
    
    // Sincronização
    document.getElementById('syncBtn').addEventListener('click', sendNotesViaEmail);
    
    // Tema
    document.getElementById('themeToggle').addEventListener('click', toggleTheme);
    
    // Miniplayer
    document.getElementById('miniplayerBtn').addEventListener('click', toggleMiniplayer);
    
    // Toggle Sidebar
    document.getElementById('toggleSidebarBtn').addEventListener('click', toggleSidebar);
    
    // Tamanho da fonte
    document.getElementById('fontSizeSelect').addEventListener('change', (e) => {
        changeFontSize(e.target.value);
    });
    
    // Auto-save ao editar
    document.getElementById('noteTitle').addEventListener('input', () => {
        clearTimeout(autoSaveTimeout);
        autoSaveTimeout = setTimeout(() => saveCurrentNote(false), 1000);
    });
    
    document.getElementById('noteContent').addEventListener('input', () => {
        updateCharCount();
        clearTimeout(autoSaveTimeout);
        autoSaveTimeout = setTimeout(() => saveCurrentNote(false), 1000);
    });
    
    // Carregar tamanho de fonte
    loadFontSize();
}

// ==================== ATALHOS DE TECLADO ====================
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Ctrl + N - Nova nota
        if (e.ctrlKey && e.key === 'n') {
            e.preventDefault();
            if (currentUser) createNote();
        }
        
        // Ctrl + S - Salvar
        if (e.ctrlKey && e.key === 's') {
            e.preventDefault();
            if (currentNoteId) saveCurrentNote(true);
        }
        
        // Ctrl + Shift + P - Pop-up
        if (e.ctrlKey && e.shiftKey && e.key === 'P') {
            e.preventDefault();
            if (currentNoteId) openNoteInPopup();
        }
        
        // Ctrl + E - Sincronizar/Enviar
        
        // Ctrl + M - Miniplayer
        if (e.ctrlKey && e.key === 'm') {
            e.preventDefault();
            if (currentUser) toggleMiniplayer();
        }
        
        // Ctrl + B - Toggle Sidebar
        if (e.ctrlKey && e.key === 'b') {
            e.preventDefault();
            if (currentUser) toggleSidebar();
        }
        
        if (e.ctrlKey && e.key === 'e') {
            e.preventDefault();
            if (currentUser) sendNotesViaEmail();
        }
    });
}

// Expor funções globais para pop-ups e miniplayer
window.updateNoteFromPopup = updateNoteFromPopup;
window.updateNoteFromMiniplayer = updateNoteFromMiniplayer;
window.selectNoteInMiniplayer = selectNoteInMiniplayer;
window.createNoteFromMiniplayer = createNoteFromMiniplayer;
window.refreshMiniplayer = refreshMiniplayer;