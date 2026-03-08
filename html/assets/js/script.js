let progressBar;
let isOpen = false;
let notifyCount = 1;
let currentlyAnnouncing = false;
const announcementQueue = [];

// ── Edit Mode State ───────────────────────────────────────────────────────────
let editModeActive = false;
let activeEditKey  = null;
let isDragging     = false;
let dragOffsetX    = 0;
let dragOffsetY    = 0;
let editedKeys     = new Set(); // tracks which elements were positioned this session

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

    // Hide elements that should normally be hidden when not in use
    if (!progressBar) {
        $('.progress-bar').hide();
    }
    $('.help-notify').hide();

    isDragging     = false;
    editModeActive = false;

    if (save) {
        const positions = {};
        for (const key in EDIT_SELECTORS) {
            // Only save elements that were actually selected and converted this session
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
        const key = $(this).data('key');
        selectEditComponent(key);
    });

    $('#uep-save').on('click', function () {
        deactivateEditMode(true);
    });

    $('#uep-cancel').on('click', function () {
        deactivateEditMode(false);
    });
}

// ── Select a component in edit mode ──────────────────────────────────────────
function selectEditComponent(key) {
    // Deselect previous if different
    if (activeEditKey && activeEditKey !== key) {
        removePreview(activeEditKey);
        removeEditBorder(activeEditKey);
        $(EDIT_SELECTORS[activeEditKey]).off('mousedown.editdrag').css('cursor', '');
        $(`#uep-btn-${activeEditKey}`).removeClass('uep-item-active');
    }

    // Toggle off if clicking the same
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

// ── Show preview content for the selected element ────────────────────────────
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
    $(EDIT_SELECTORS[key]).addClass('ui-edit-active');
    $(EDIT_SELECTORS[key]).css('cursor', 'grab');
}

function removeEditBorder(key) {
    $(EDIT_SELECTORS[key]).removeClass('ui-edit-active');
    $(EDIT_SELECTORS[key]).css('cursor', '');
}

// ── Convert element from bottom/transform positioning to top/left ─────────────
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

// ── Setup drag on a specific element ─────────────────────────────────────────
function setupDrag(key) {
    const el = $(EDIT_SELECTORS[key]);
    el.off('mousedown.editdrag');
    el.on('mousedown.editdrag', function (e) {
        if (!editModeActive || activeEditKey !== key) return;
        // Ignore clicks on the edit panel itself
        if ($(e.target).closest('#ui-edit-panel').length) return;
        e.preventDefault();
        e.stopPropagation();
        isDragging  = true;
        const rect  = this.getBoundingClientRect();
        dragOffsetX = e.clientX - rect.left;
        dragOffsetY = e.clientY - rect.top;
        $(this).css('cursor', 'grabbing');
    });
}

// ── Global mouse move handler ─────────────────────────────────────────────────
document.addEventListener('mousemove', function (e) {
    if (!isDragging || !activeEditKey) return;
    const el = document.querySelector(EDIT_SELECTORS[activeEditKey]);
    if (!el) return;

    const elWidth  = el.offsetWidth;
    const elHeight = el.offsetHeight;

    const newLeft = Math.max(0, Math.min(window.innerWidth  - elWidth,  e.clientX - dragOffsetX));
    const newTop  = Math.max(0, Math.min(window.innerHeight - elHeight, e.clientY - dragOffsetY));

    $(el).css({ left: newLeft + 'px', top: newTop + 'px' });
});

// ── Global mouse up handler ───────────────────────────────────────────────────
document.addEventListener('mouseup', function () {
    if (isDragging && activeEditKey) {
        $(EDIT_SELECTORS[activeEditKey]).css('cursor', 'grab');
    }
    isDragging = false;
});

// ── Apply all positions received from Lua (on resource start) ────────────────
function applyAllPositions(positions) {
    for (const key in positions) {
        if (!EDIT_SELECTORS[key] || !positions[key]) continue;
        const el = $(EDIT_SELECTORS[key]);
        if (!el.length) continue;
        el.css({
            position:  'absolute',
            top:       positions[key].top,
            left:      positions[key].left,
            bottom:    'auto',
            right:     'auto',
            transform: 'none'
        });
    }
}

// ── notify ────────────────────────────────────────────────────────────────────
function notify(type, title, msg, time, icon) {
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
        $(`#notify-Id-${id}`).css({ animation: "fadeOut 0.5s" });
        setTimeout(() => $(`#notify-Id-${id}`).remove(), 500);
    }, time);
    notifyCount++;
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

// ── loadhtml ──────────────────────────────────────────────────────────────────
function loadhtml() {
    const css = `
        body{overflow:hidden}
        *{margin:0;line-height:0;user-select:none}
        .hud{position:absolute;height:56.25vw;width:100vw}

        /* ── notifys ── */
        .notifys-container{position:absolute;width:auto;bottom:12.6vw;left:1.51vw}
        .notify-con{position:relative;bottom:0;width:9.95vw;border-radius:.42vw;background:var(--notify-background-color);box-shadow:0vw 0vw 1.67vw 0vw var(--notify-box-shadow) inset;margin-left:.73vw;padding-top:1.93vw;padding-left:3.75vw;padding-right:1.25vw;padding-bottom:1.04vw}
        .notify-icon-ify-error,.notify-icon-ify-success,.notify-icon-ify-info,.notify-icon-ify-warning{position:absolute;top:50%;transform:translateY(-50%);left:1.25vw;color:var(--notify-type-error)}
        .notify-icon-ify-success{color:var(--notify-type-success)}
        .notify-icon-ify-info{color:var(--notify-type-info)}
        .notify-icon-ify-warning{color:var(--notify-type-warning)}
        .notify-container{position:relative;width:auto;animation:fadeIn .5s;margin-bottom:.63vw;bottom:0;height:auto;left:0}
        .notify-txt{width:auto;max-width:9.95vw;color:#FFF;text-shadow:0vw 0vw .42vw rgba(0,0,0,0.24);font-family:"Gilroy-Medium";font-size:.63vw;font-style:normal;font-weight:400;line-height:1.4;text-align:left;word-break:break-word}
        .notify-progress{position:absolute;left:0;width:.31vw;height:100%;border-radius:.21vw;background:rgba(0,0,0,0.48)}
        .progress-info-fill{position:absolute;bottom:0;left:0;width:.31vw;height:0;border-radius:.21vw;background:var(--notify-type-info-progress)}
        .progress-warning-fill{position:absolute;bottom:0;left:0;width:.31vw;height:0;border-radius:.21vw;background:var(--notify-type-warning-progress)}
        .progress-error-fill{position:absolute;bottom:0;left:0;width:.31vw;height:0;border-radius:.21vw;background:var(--notify-type-error-progress)}
        .progress-success-fill{position:absolute;bottom:0;left:0;width:.31vw;height:0;border-radius:.21vw;background:var(--notify-type-success-progress)}
        .notify-title-success,.notify-title-warning,.notify-title-info,.notify-title-error{position:absolute;color:var(--notify-type-success);top:.94vw;left:3.75vw;font-family:"Gilroy-SemiBold";font-size:.73vw;font-weight:600;line-height:normal;text-transform:uppercase}
        .notify-title-warning{color:var(--notify-type-warning)}
        .notify-title-info{color:var(--notify-type-info)}
        .notify-title-error{color:var(--notify-type-error)}

        /* ── progressbar ── */
        .progress-bar{position:absolute;bottom:5.57vw;left:50%;transform:translateX(-50%);width:18.33vw;height:5.42vw;text-align:center}
        .progress-bar-con{position:absolute;top:2.55vw;left:0;width:100%;height:.31vw;border-radius:15.63vw;background:rgba(0,0,0,0.48)}
        .progress-bar-fill{position:absolute;left:0;width:0;height:.31vw;border-radius:15.63vw;background:var(--progressbar-color);box-shadow:0vw 0vw .42vw 0vw var(--progressbar-color-box-shadow)}
        .progress-percent{position:absolute;bottom:.1vw;left:50%;transform:translateX(-50%);color:#fff;font-family:"Gilroy-SemiBold";font-size:1.67vw;font-weight:600;line-height:normal;letter-spacing:.07vw}
        .progress-txt{position:absolute;top:1.2vw;width:100%;left:50%;transform:translate(-50%,-50%);color:#FFF;opacity:.78;font-family:"Gilroy-SemiBold";font-size:.83vw;font-weight:600;line-height:normal;letter-spacing:.03vw}

        /* ── help notify ── */
        .help-notify{position:absolute;bottom:1.09vw;left:41.82vw;width:16.35vw;height:5.42vw}
        .help-shadow{position:absolute;width:16.35vw;height:5.42vw;background:rgba(0,0,0,0.24);filter:blur(1.88vw)}
        .control-key{position:absolute;width:2.5vw;height:2.5vw;left:0;border-radius:15.63vw;background:rgb(17,34,231)}
        .key{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);color:#FFF;font-family:"Gilroy-SemiBold";font-size:1.04vw;font-weight:500;line-height:normal;letter-spacing:.04vw}
        .control-infos{position:absolute;width:13.02vw;height:2.5vw;top:1.46vw;left:50%;transform:translateX(-50%)}
        .help_text{position:absolute;color:#FFF;top:50%;transform:translateY(-50%);left:2.81vw;font-family:"Gilroy-SemiBold";font-size:.83vw;font-weight:600;line-height:normal;letter-spacing:.03vw;white-space:nowrap}

        /* ── announce ── */
        .announces{position:absolute;top:1.41vw;width:23.33vw;height:auto;left:40.16vw}
        .announce-box{position:relative;margin:0;left:50%;width:fit-content;animation:fadeInAnnounce .5s;transform:translateX(-50%)}
        .announce-shadow{position:absolute;height:100%;width:19.68vw;border-radius:23.33vw;background:rgba(0,0,0,0.32);filter:blur(2.5vw)}
        .announce-msg{position:relative;padding-top:4.95vw;width:19.68vw;left:50%;transform:translateX(-50%);color:#FFF;text-align:center;word-break:break-word;font-family:"Gilroy-Medium";font-size:.83vw;font-weight:400;line-height:1.4;letter-spacing:-.03vw;text-transform:uppercase}
        .announce-progress{position:absolute;left:0;margin-top:1.25vw;width:100%;height:.31vw;border-radius:15.63vw;background:rgba(0,0,0,0.48)}
        .announce-progress-fill{position:absolute;width:0;height:.31vw;border-radius:15.63vw;background:var(--announce-progress-fill);box-shadow:0vw 0vw .42vw 0vw var(--announce-progress-box-shadow)}
        .title-strich{position:absolute;display:flex;flex-direction:row-reverse;top:1.93vw;left:50%;height:auto;width:auto;transform:translateX(-50%)}
        .announce-title{position:relative;width:auto;display:inline-block;color:var(--announce-title);text-shadow:0vw 0vw .63vw rgba(0,0,0,0.48),0vw 0vw 1.25vw var(--announce-title-shadow);font-family:"Gilroy-Bold";font-size:2.5vw;font-weight:400;line-height:normal;letter-spacing:-.07vw;white-space:nowrap;text-transform:uppercase;padding-left:.78vw;padding-right:.78vw}
        .announce-strich-left{position:relative;display:flex;align-items:flex-start;width:2.8vw;top:.99vw}
        .strich-announce{position:relative;width:.21vw;height:1.25vw;margin-right:.16vw;transform:rotate(-155deg);border-radius:.05vw;background:var(--announce-lines);box-shadow:0vw 0vw .42vw 0vw var(--announce-lines-shadow)}
        .announce-icon{position:absolute;width:6.67vw;height:6.67vw;left:50%;transform:translateX(-50%)}

        /* ── edit mode: active element highlight ── */
        .ui-edit-active {
            outline:        0.13vw dashed rgba(49, 181, 255, 0.85) !important;
            outline-offset: 0.6vw !important;
            border-radius:  0.42vw !important;
        }

        /* ── UI Edit Panel ── */
        #ui-edit-panel {
            position:         absolute;
            top:              50%;
            right:            1.25vw;
            transform:        translateY(-50%);
            width:            13.5vw;
            background:       rgba(4, 12, 30, 0.96);
            border:           0.06vw solid rgba(49, 181, 255, 0.25);
            border-radius:    0.73vw;
            box-shadow:       0 0 2.5vw rgba(0, 0, 0, 0.6), 0 0 1vw rgba(49, 181, 255, 0.08);
            z-index:          9999;
            overflow:         hidden;
            pointer-events:   all;
        }
        .uep-header {
            display:     flex;
            align-items: center;
            gap:         0.63vw;
            padding:     0.83vw 0.9vw 0.73vw;
        }
        .uep-header-icon {
            font-size:   0.83vw;
            color:       rgba(49, 181, 255, 0.9);
            line-height: 1 !important;
            flex-shrink: 0;
        }
        .uep-header-text {
            display:        flex;
            flex-direction: column;
            gap:            0.18vw;
        }
        .uep-title {
            color:          #ffffff;
            font-family:    "Gilroy-Bold";
            font-size:      0.67vw;
            font-weight:    700;
            letter-spacing: 0.09vw;
            line-height:    1.3 !important;
            text-transform: uppercase;
        }
        .uep-subtitle {
            color:       rgba(255, 255, 255, 0.4);
            font-family: "Gilroy-Medium";
            font-size:   0.5vw;
            line-height: 1.3 !important;
        }
        .uep-divider {
            height:     0.05vw;
            background: rgba(255, 255, 255, 0.07);
            margin:     0;
        }
        .uep-list {
            padding: 0.42vw 0;
        }
        .uep-item {
            display:     flex;
            align-items: center;
            gap:         0.63vw;
            padding:     0.6vw 0.9vw;
            cursor:      pointer;
            transition:  background 0.12s;
            position:    relative;
        }
        .uep-item:hover {
            background: rgba(49, 181, 255, 0.07);
        }
        .uep-item:hover .uep-item-indicator {
            background: rgba(49, 181, 255, 0.5);
        }
        .uep-item:hover .uep-item-arrow {
            opacity: 0.7;
            right:   0.73vw;
        }
        .uep-item-active {
            background: rgba(49, 181, 255, 0.12) !important;
        }
        .uep-item-active .uep-item-indicator {
            background: rgba(49, 181, 255, 1) !important;
            box-shadow: 0 0 0.42vw rgba(49, 181, 255, 0.7) !important;
        }
        .uep-item-active .uep-item-label {
            color: #ffffff !important;
        }
        .uep-item-active .uep-item-arrow {
            opacity: 1 !important;
            color:   rgba(49, 181, 255, 1) !important;
            right:   0.73vw !important;
        }
        .uep-item-indicator {
            width:        0.35vw;
            height:       0.35vw;
            border-radius: 50%;
            background:   rgba(255, 255, 255, 0.2);
            flex-shrink:  0;
            transition:   background 0.12s, box-shadow 0.12s;
            line-height:  1 !important;
        }
        .uep-item-label {
            color:          rgba(255, 255, 255, 0.65);
            font-family:    "Gilroy-SemiBold";
            font-size:      0.6vw;
            font-weight:    600;
            letter-spacing: 0.07vw;
            line-height:    1.3 !important;
            text-transform: uppercase;
            flex:           1;
            transition:     color 0.12s;
        }
        .uep-item-arrow {
            color:      rgba(255, 255, 255, 0.2);
            font-size:  0.73vw;
            line-height: 1 !important;
            position:   absolute;
            right:      0.83vw;
            transition: opacity 0.12s, right 0.12s, color 0.12s;
        }
        .uep-hint {
            display:         flex;
            align-items:     center;
            justify-content: center;
            gap:             0.42vw;
            padding:         0.42vw 0.9vw;
        }
        .uep-hint-key {
            background:     rgba(255, 255, 255, 0.08);
            border:         0.05vw solid rgba(255, 255, 255, 0.15);
            border-radius:  0.21vw;
            color:          rgba(255, 255, 255, 0.5);
            font-family:    "Gilroy-SemiBold";
            font-size:      0.46vw;
            padding:        0.15vw 0.35vw;
            line-height:    1.4 !important;
            letter-spacing: 0.04vw;
        }
        .uep-hint-text {
            color:       rgba(255, 255, 255, 0.3);
            font-family: "Gilroy-Medium";
            font-size:   0.48vw;
            line-height: 1.3 !important;
        }
        .uep-footer {
            border-top:     0.05vw solid rgba(255, 255, 255, 0.07);
            padding:        0.63vw;
            display:        flex;
            flex-direction: column;
            gap:            0.35vw;
        }
        .uep-save {
            background:     rgba(49, 181, 255, 0.18);
            border:         0.06vw solid rgba(49, 181, 255, 0.4);
            color:          rgba(49, 181, 255, 1);
            font-family:    "Gilroy-SemiBold";
            font-size:      0.56vw;
            font-weight:    600;
            letter-spacing: 0.06vw;
            text-transform: uppercase;
            text-align:     center;
            padding:        0.52vw;
            border-radius:  0.35vw;
            cursor:         pointer;
            line-height:    1.4 !important;
            transition:     background 0.12s, border-color 0.12s;
        }
        .uep-save:hover {
            background:   rgba(49, 181, 255, 0.28);
            border-color: rgba(49, 181, 255, 0.7);
        }
        .uep-cancel {
            color:          rgba(255, 255, 255, 0.3);
            font-family:    "Gilroy-Medium";
            font-size:      0.5vw;
            text-transform: uppercase;
            text-align:     center;
            padding:        0.42vw;
            border-radius:  0.31vw;
            cursor:         pointer;
            line-height:    1.4 !important;
            letter-spacing: 0.04vw;
            transition:     color 0.12s, background 0.12s;
        }
        .uep-cancel:hover {
            color:      rgba(255, 255, 255, 0.6);
            background: rgba(255, 255, 255, 0.04);
        }

        /* ── animations ── */
        @keyframes fadeIn{0%{left:-20.83vw;opacity:0}100%{left:0;opacity:1}}
        @keyframes fadeOut{0%{left:0;opacity:1}100%{left:-20.83vw;opacity:0}}
        @keyframes fadeInAnnounce{0%{top:-20.83vw;opacity:0}100%{top:0;opacity:1}}
        @keyframes fadeOutAnnounce{0%{top:0;opacity:1}100%{top:-20.83vw;opacity:0}}
    `;

    $('.hud').append(`
        <style>${css}</style>

        <div class="notifys-container"></div>

        <div class="progress-bar">
            <p class="progress-txt"></p>
            <div class="progress-bar-con">
                <div class="progress-bar-fill"></div>
            </div>
            <p class="progress-percent">0%</p>
        </div>

        <div class="help-notify">
            <div class="help-shadow"></div>
            <div class="control-infos">
                <p class="help_text"></p>
                <div class="control-key">
                    <p class="key">E</p>
                </div>
            </div>
        </div>

        <div class="announces"></div>
    `);
}