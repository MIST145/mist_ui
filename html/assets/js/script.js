let progressBar;
let notifyCount          = 1;
let currentlyAnnouncing  = false;
const announcementQueue  = [];

// ── Notify queue (FIX: limite de notificações visíveis) ───────────────────────
const MAX_VISIBLE_NOTIFIES = 5;
let   activeNotifyCount    = 0;
const notifyQueue          = [];

// ── Edit Mode State ───────────────────────────────────────────────────────────
let editModeActive = false;
let activeEditKey  = null;
let isDragging     = false;
let dragOffsetX    = 0;
let dragOffsetY    = 0;
let editedKeys     = new Set();

const EDIT_SELECTORS = {
    notify:      '.notifys-container',
    progressbar: '.progress-bar',
    helpnotify:  '.help-notify',
    announce:    '.announces'
};

// ── Avisa o client que a página está pronta ───────────────────────────────────
$(document).ready(function () {
    $.post(`https://${GetParentResourceName()}/hudLoaded`);
});

// ── NUI message listener ──────────────────────────────────────────────────────
window.addEventListener('message', function (event) {
    const data = event.data;

    switch (data.type) {

        case "loadhud": {
            loadhtml();
            $('.progress-bar').hide();
            $('.help-notify').hide();
            // FIX: race condition — só avisa o Lua que pode enviar setPositions
            // depois de loadhtml() ter terminado e o DOM estar construído.
            $.post(`https://${GetParentResourceName()}/hudReady`);
            break;
        }

        case "editMode": {
            if (data.data && data.data.state) {
                activateEditMode();
            } else {
                deactivateEditMode(false);
            }
            break;
        }

        case "setPositions": {
            if (data.data) {
                applyAllPositions(data.data);
            }
            break;
        }

        case "progressbar": {
            if (!editModeActive) {
                startProgressbar(data.data.text, data.data.time);
            }
            break;
        }

        case "progressbar:cancel": {
            if (!editModeActive) {
                cancelProgressbar();
            }
            break;
        }

        case "notify": {
            if (!editModeActive) {
                notify(data.data.type, data.data.title, data.data.msg, data.data.time, data.data.icon);
            }
            break;
        }

        case "announce": {
            if (!editModeActive) {
                announce(data.data.title, data.data.msg, data.data.time);
            }
            break;
        }

        case "helpNotify": {
            if (editModeActive) break;
            if (!data.data.show) {
                $('.help-notify').fadeOut(400);
            } else {
                $('.help-notify').fadeIn();
                $('.help_text').text(data.data.text);
                $('.key').text(data.data.key);
            }
            break;
        }

        case "send-sound": {
            const audio = new Audio(`${data.data.sound}`);
            audio.volume = 0.3;
            audio.play();
            break;
        }
    }
});

// ── Escape key ────────────────────────────────────────────────────────────────
window.addEventListener("keyup", (event) => {
    if (event.key === "Escape") {
        if (editModeActive) {
            deactivateEditMode(false);
        } else {
            $.post(`https://${GetParentResourceName()}/close`);
        }
    }
});

// ── notify ────────────────────────────────────────────────────────────────────
// FIX: fila de notificações com limite de MAX_VISIBLE_NOTIFIES visíveis.
// Notificações em excesso ficam em fila e aparecem quando houver espaço.
function notify(type, title, msg, time, icon) {
    if (activeNotifyCount >= MAX_VISIBLE_NOTIFIES) {
        notifyQueue.push({ type, title, msg, time, icon });
        return;
    }
    _renderNotify(type, title, msg, time, icon);
}

function _renderNotify(type, title, msg, time, icon) {
    activeNotifyCount++;

    // FIX: animação adaptativa — verifica posição X do container.
    // Se o container estiver na metade direita do ecrã, a animação
    // vem da direita em vez da esquerda, evitando o efeito visual errado.
    updateNotifyAnimation();

    const id = notifyCount;
    $('.notifys-container').append(`
        <div class="notify-container" id="notify-Id-${id}">
            <div class="notify-progress">
                <div class="progress-${type}-fill" id="progress-id-${id}"></div>
            </div>
            <div class="notify-con">
                <iconify-icon icon="${icon}" class="notify-icon-ify-${type}" width="1.25vw" height="2.22vh"></iconify-icon>
                <p class="notify-title-${type}">${title}</p>
                <p class="notify-txt">${msg}</p>
            </div>
        </div>
    `);

    $.post(`https://${GetParentResourceName()}/sound`, JSON.stringify({ type: "notify" }));
    $(`#progress-id-${id}`).animate({ height: "100%" }, time);

    setTimeout(() => {
        // FIX: usa a animação correcta conforme o lado do container
        const isRight   = $('.notifys-container').hasClass('notify-from-right');
        const fadeOutFn = isRight ? 'notifyFadeOutRight 0.5s' : 'notifyFadeOut 0.5s';
        $(`#notify-Id-${id}`).css({ animation: fadeOutFn });
        setTimeout(() => {
            $(`#notify-Id-${id}`).remove();
            activeNotifyCount--;
            _processNotifyQueue();
        }, 500);
    }, time);

    notifyCount++;
}

function _processNotifyQueue() {
    if (notifyQueue.length > 0 && activeNotifyCount < MAX_VISIBLE_NOTIFIES) {
        const next = notifyQueue.shift();
        _renderNotify(next.type, next.title, next.msg, next.time, next.icon);
    }
}

// FIX: animação adaptativa ────────────────────────────────────────────────────
// Adiciona/remove a classe 'notify-from-right' no container conforme a posição.
// O CSS tem animações diferentes para cada classe.
function updateNotifyAnimation() {
    const el = document.querySelector('.notifys-container');
    if (!el) return;
    const rect    = el.getBoundingClientRect();
    const isRight = rect.left > window.innerWidth / 2;
    $('.notifys-container').toggleClass('notify-from-right', isRight);
}

// ── announce ──────────────────────────────────────────────────────────────────
function announce(title, msg, time) {
    if (currentlyAnnouncing) {
        announcementQueue.push({ title, msg, time });
        return;
    }
    currentlyAnnouncing = true;
    const id = notifyCount;

    $('.announces').append(`
        <div class="announce-box" id="announce-Id-${id}">
            <div class="announce-shadow"></div>
            <img class="announce-icon" src="./assets/img/info-announce.svg">
            <div class="title-strich">
                <div class="announce-strich-left">
                    <div class="strich-announce" style="transform: rotate(155deg);"></div>
                    <div class="strich-announce" style="transform: rotate(155deg);"></div>
                    <div class="strich-announce" style="opacity: 0.72; transform: rotate(155deg);"></div>
                    <div class="strich-announce" style="opacity: 0.48; transform: rotate(155deg);"></div>
                    <div class="strich-announce" style="opacity: 0.16; transform: rotate(155deg);"></div>
                </div>
                <p class="announce-title">${title}</p>
                <div class="announce-strich-left" style="right: -1.16vw;">
                    <div class="strich-announce" style="opacity: 0.16;"></div>
                    <div class="strich-announce" style="opacity: 0.48;"></div>
                    <div class="strich-announce" style="opacity: 0.72;"></div>
                    <div class="strich-announce"></div>
                    <div class="strich-announce"></div>
                </div>
            </div>
            <p class="announce-msg">${msg}</p>
            <div class="announce-progress">
                <div class="announce-progress-fill" id="announce-id-${id}"></div>
            </div>
        </div>
    `);

    $.post(`https://${GetParentResourceName()}/sound`, JSON.stringify({ type: "announce" }));
    $(`#announce-id-${id}`).animate({ width: "100%" }, time);

    setTimeout(() => {
        $(`#announce-Id-${id}`).css({ animation: "fadeOutAnnounce 0.5s" });
        setTimeout(() => $(`#announce-Id-${id}`).remove(), 500);
        currentlyAnnouncing = false;
        processAnnouncementQueue();
    }, time);

    notifyCount++;
}

function processAnnouncementQueue() {
    if (announcementQueue.length > 0) {
        const { title, msg, time } = announcementQueue.shift();
        announce(title, msg, time);
    }
}

// ── progressbar ───────────────────────────────────────────────────────────────
function startProgressbar(text, time) {
    if (progressBar) clearInterval(progressBar);

    $('.progress-bar').show();
    $('.progress-txt').text(text);
    $('.progress-bar-fill').css("width", "0%");
    $('.progress-percent').text("0%");

    const start    = Date.now();
    const interval = 10;

    progressBar = setInterval(() => {
        const percent = Math.min(Math.round(((Date.now() - start) / time) * 100), 100);
        $('.progress-bar-fill').css("width", percent + "%");
        $('.progress-percent').text(percent + "%");
        if (percent >= 100) cancelProgressbar();
    }, interval);
}

function cancelProgressbar() {
    clearInterval(progressBar);
    progressBar = null;
    $('.progress-bar').hide();
}

// ── Edit Mode — Activate ──────────────────────────────────────────────────────
function activateEditMode() {
    editModeActive = true;
    activeEditKey  = null;
    isDragging     = false;
    editedKeys     = new Set();
    showEditPanel();
}

// ── Edit Mode — Deactivate ────────────────────────────────────────────────────
function deactivateEditMode(save) {
    if (activeEditKey) {
        removePreview(activeEditKey);
        removeEditBorder(activeEditKey);
        $(EDIT_SELECTORS[activeEditKey]).off('mousedown.editdrag').css('cursor', '');
        activeEditKey = null;
    }

    $('#ui-edit-panel').remove();

    if (!progressBar) {
        $('.progress-bar').hide();
    }
    $('.help-notify').hide();

    isDragging     = false;
    editModeActive = false;

    if (save) {
        const positions = {};
        for (const key in EDIT_SELECTORS) {
            if (!editedKeys.has(key)) continue;
            const el = document.querySelector(EDIT_SELECTORS[key]);
            if (el) {
                const rect = el.getBoundingClientRect();
                positions[key] = {
                    left: ((rect.left / window.innerWidth)  * 100).toFixed(4) + '%',
                    top:  ((rect.top  / window.innerHeight) * 100).toFixed(4) + '%'
                };
            }
        }
        if (Object.keys(positions).length > 0) {
            $.post(`https://${GetParentResourceName()}/savePositions`, JSON.stringify(positions));
        }
        // Atualiza animação após guardar nova posição
        updateNotifyAnimation();
    }

    $.post(`https://${GetParentResourceName()}/closeEdit`);
}

// ── Edit Panel ────────────────────────────────────────────────────────────────
function showEditPanel() {
    if ($('#ui-edit-panel').length > 0) return;

    $('.hud').append(`
        <div id="ui-edit-panel">
            <div class="uep-header">
                <div class="uep-header-icon">⚙</div>
                <div class="uep-header-text">
                    <p class="uep-title">UI POSITION EDITOR</p>
                    <p class="uep-subtitle">Seleciona um elemento para mover</p>
                </div>
            </div>
            <div class="uep-divider"></div>
            <div class="uep-list">
                <div class="uep-item" id="uep-btn-notify" data-key="notify">
                    <div class="uep-item-indicator"></div>
                    <span class="uep-item-label">NOTIFICATIONS</span>
                    <span class="uep-item-arrow">›</span>
                </div>
                <div class="uep-item" id="uep-btn-progressbar" data-key="progressbar">
                    <div class="uep-item-indicator"></div>
                    <span class="uep-item-label">PROGRESSBAR</span>
                    <span class="uep-item-arrow">›</span>
                </div>
                <div class="uep-item" id="uep-btn-helpnotify" data-key="helpnotify">
                    <div class="uep-item-indicator"></div>
                    <span class="uep-item-label">HELP NOTIFY</span>
                    <span class="uep-item-arrow">›</span>
                </div>
                <div class="uep-item" id="uep-btn-announce" data-key="announce">
                    <div class="uep-item-indicator"></div>
                    <span class="uep-item-label">ANNOUNCE</span>
                    <span class="uep-item-arrow">›</span>
                </div>
            </div>
            <div class="uep-divider"></div>
            <div class="uep-hint">
                <span class="uep-hint-key">ESC</span>
                <span class="uep-hint-text">para cancelar</span>
            </div>
            <div class="uep-footer">
                <div class="uep-save" id="uep-save">✓ GUARDAR & FECHAR</div>
                <div class="uep-cancel" id="uep-cancel">✕ CANCELAR</div>
            </div>
        </div>
    `);

    $('.uep-item').on('click', function () {
        selectEditComponent($(this).data('key'));
    });

    $('#uep-save').on('click', function () {
        deactivateEditMode(true);
    });

    $('#uep-cancel').on('click', function () {
        deactivateEditMode(false);
    });
}

// ── Select component in edit mode ─────────────────────────────────────────────
function selectEditComponent(key) {
    if (activeEditKey && activeEditKey !== key) {
        removePreview(activeEditKey);
        removeEditBorder(activeEditKey);
        $(EDIT_SELECTORS[activeEditKey]).off('mousedown.editdrag').css('cursor', '');
        $(`#uep-btn-${activeEditKey}`).removeClass('uep-item-active');
    }

    if (activeEditKey === key) {
        removePreview(key);
        removeEditBorder(key);
        $(EDIT_SELECTORS[key]).off('mousedown.editdrag').css('cursor', '');
        $(`#uep-btn-${key}`).removeClass('uep-item-active');
        activeEditKey = null;
        return;
    }

    activeEditKey = key;
    $(`#uep-btn-${key}`).addClass('uep-item-active');

    showPreview(key);
    convertElementToAbsolute(key);
    addEditBorder(key);
    setupDrag(key);
}

// ── Show preview content ──────────────────────────────────────────────────────
function showPreview(key) {
    switch (key) {
        case 'notify': {
            if ($('.edit-preview-notify').length === 0) {
                $('.notifys-container').append(`
                    <div class="notify-container edit-preview-notify">
                        <div class="notify-progress">
                            <div class="progress-info-fill" style="height:60%"></div>
                        </div>
                        <div class="notify-con">
                            <iconify-icon icon="ep:info-filled" class="notify-icon-ify-info" width="1.25vw" height="2.22vh"></iconify-icon>
                            <p class="notify-title-info">NOTIFICAÇÃO</p>
                            <p class="notify-txt">Exemplo de notificação de informação</p>
                        </div>
                    </div>
                `);
            }
            break;
        }
        case 'progressbar': {
            $('.progress-bar').show();
            $('.progress-txt').text('Exemplo de progressbar...');
            $('.progress-bar-fill').css('width', '60%');
            $('.progress-percent').text('60%');
            break;
        }
        case 'helpnotify': {
            $('.help-notify').show();
            $('.help_text').text('Para interagir com o objeto');
            $('.key').text('E');
            break;
        }
        case 'announce': {
            if ($('.edit-preview-announce').length === 0) {
                $('.announces').append(`
                    <div class="announce-box edit-preview-announce">
                        <div class="announce-shadow"></div>
                        <img class="announce-icon" src="./assets/img/info-announce.svg">
                        <div class="title-strich">
                            <div class="announce-strich-left">
                                <div class="strich-announce" style="transform:rotate(155deg)"></div>
                                <div class="strich-announce" style="transform:rotate(155deg)"></div>
                                <div class="strich-announce" style="opacity:.72;transform:rotate(155deg)"></div>
                                <div class="strich-announce" style="opacity:.48;transform:rotate(155deg)"></div>
                                <div class="strich-announce" style="opacity:.16;transform:rotate(155deg)"></div>
                            </div>
                            <p class="announce-title">EXEMPLO</p>
                            <div class="announce-strich-left" style="right:-1.16vw">
                                <div class="strich-announce" style="opacity:.16"></div>
                                <div class="strich-announce" style="opacity:.48"></div>
                                <div class="strich-announce" style="opacity:.72"></div>
                                <div class="strich-announce"></div>
                                <div class="strich-announce"></div>
                            </div>
                        </div>
                        <p class="announce-msg">Mensagem de announce de exemplo para posicionamento</p>
                        <div class="announce-progress">
                            <div class="announce-progress-fill" style="width:50%"></div>
                        </div>
                    </div>
                `);
            }
            break;
        }
    }
}

// ── Remove preview content ────────────────────────────────────────────────────
function removePreview(key) {
    switch (key) {
        case 'notify':
            $('.edit-preview-notify').remove();
            break;
        case 'progressbar':
            if (!progressBar) {
                $('.progress-bar').hide();
                $('.progress-bar-fill').css('width', '0%');
            }
            break;
        case 'helpnotify':
            $('.help-notify').hide();
            break;
        case 'announce':
            $('.edit-preview-announce').remove();
            break;
    }
}

// ── Add / remove edit border ──────────────────────────────────────────────────
function addEditBorder(key) {
    $(EDIT_SELECTORS[key]).addClass('ui-edit-active').css('cursor', 'grab');
}

function removeEditBorder(key) {
    $(EDIT_SELECTORS[key]).removeClass('ui-edit-active').css('cursor', '');
}

// ── Convert element to absolute positioning ───────────────────────────────────
function convertElementToAbsolute(key) {
    const el = document.querySelector(EDIT_SELECTORS[key]);
    if (!el) return;
    const rect = el.getBoundingClientRect();
    $(el).css({
        position:  'absolute',
        top:       rect.top  + 'px',
        left:      rect.left + 'px',
        bottom:    'auto',
        right:     'auto',
        transform: 'none'
    });
    editedKeys.add(key);
}

// ── Setup drag ────────────────────────────────────────────────────────────────
function setupDrag(key) {
    const el = $(EDIT_SELECTORS[key]);
    el.off('mousedown.editdrag');
    el.on('mousedown.editdrag', function (e) {
        if (!editModeActive || activeEditKey !== key) return;
        if ($(e.target).closest('#ui-edit-panel').length) return;
        e.preventDefault();
        e.stopPropagation();
        isDragging  = true;
        const rect  = this.getBoundingClientRect();
        dragOffsetX = e.clientX - rect.left;
        dragOffsetY = e.clientY - rect.top;
        $(this).css('cursor'