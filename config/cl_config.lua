cl_config = {}

cl_config.server = {
    server_name = "MIST",
    server_logo = "./assets/img/logo.png" -- caminho para o logo (usado no announce)
}

cl_config.general = {
    language = "en", -- "de", "en", "fr"
    prime_events = {
        ["prime_notify"]              = "mist_ui:notify",
        ["prime_announce"]            = "mist_ui:announce",
        ["prime_helpnotify"]          = "mist_ui:helpnotify",
        ["prime_progressbar"]         = "mist_ui:progressbar",
        ["prime_progressbar:cancel"]  = "mist_ui:progressbar:cancel"
    }
}

cl_config.notify = {
    sound = {
        type = "custom", -- "custom" ou "fivem"
        ["custom"] = {
            sound = "./assets/sounds/notify.mp3"
        },
        ["fivem"] = {
            sound = {
                soundName    = "ATM_WINDOW",
                soundSetName = "HUD_FRONTEND_DEFAULT_SOUNDSET"
            }
        }
    },
    icons = {
        ["success"] = "ep:success-filled",
        ["warning"] = "ep:warning-filled",
        ["error"]   = "ep:circle-close-filled",
        ["info"]    = "ep:info-filled"
    }
}

cl_config.announce = {
    sound = {
        type = "custom", -- "custom" ou "fivem"
        ["custom"] = {
            sound = "./assets/sounds/announce_1.mp3"
        },
        ["fivem"] = {
            sound = {
                soundName    = "OTHER_TEXT",
                soundSetName = "HUD_AWARDS"
            }
        }
    }
}

cl_config.language = {
    ["en"] = {},
    ["de"] = {},
    ["fr"] = {}
}