let progressBar;
let isOpen = false;
let notifyCount = 1;
let currentlyAnnouncing = false;
const announcementQueue = [];

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

        case "progressbar": {
            startProgressbar(data.data.text, data.data.time);
            break;
        }

        case "progressbar:cancel": {
            cancelProgressbar();
            break;
        }

        case "notify": {
            notify(data.data.type, data.data.title, data.data.msg, data.data.time, data.data.icon);
            break;
        }

        case "announce": {
            announce(data.data.title, data.data.msg, data.data.time);
            break;
        }

        case "helpNotify": {
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

// ── Escape closes any open UI element ────────────────────────────────────────
window.addEventListener("keyup", (event) => {
    if (event.key === "Escape") {
        $.post(`https://${GetParentResourceName()}/close`);
    }
});

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

    const start = Date.now();
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