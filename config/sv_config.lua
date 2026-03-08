sv_config = {}

sv_config.general = {
    esx_events = {
        ["esx:getSharedObject"] = "esx:getSharedObject"
    },
    txAdmin = {
        enable = true,
        events = {
            ["txAdmin:events:scheduledRestart"] = "txAdmin:events:scheduledRestart",
            ["txAdmin:events:announcement"]     = "txAdmin:events:announcement"
        }
    }
}

sv_config.announce = {
    enable  = true,
    command = "announce",
    time    = 6000,
    groups  = {
        ["owner"] = true,
        ["admin"] = true
    }
}

sv_config.language = {
    ["en"] = {
        ["announce"] = {
            ["command"] = {
                ["no_perms"] = "You do not have the permissions to do that!",
                ["no_value"] = "You must enter at least 1 character!"
            },
            ["txAdmin"] = {
                ["scheduled_restart"]            = "The server will restart in %s minutes!",
                ["scheduled_restart_disconnect"] = "The server will restart in %s seconds. Disconnect now!"
            }
        }
    },
    ["de"] = {
        ["announce"] = {
            ["command"] = {
                ["no_perms"] = "Dazu hast du keine Rechte!",
                ["no_value"] = "Du musst mindestens 1 zeichen angeben!"
            },
            ["txAdmin"] = {
                ["scheduled_restart"]            = "Der Server wird in %s Minuten neugestartet!",
                ["scheduled_restart_disconnect"] = "Der Server wird in %s Sekunden neugestartet. Trenne die Verbindung jetzt!"
            }
        }
    },
    ["fr"] = {
        ["announce"] = {
            ["command"] = {
                ["no_perms"] = "Vous n'avez pas les permissions pour faire cela!",
                ["no_value"] = "Vous devez entrer au moins 1 caractère!"
            },
            ["txAdmin"] = {
                ["scheduled_restart"]            = "Le serveur redémarrera dans %s minutes!",
                ["scheduled_restart_disconnect"] = "Le serveur redémarrera dans %s secondes. Déconnectez-vous maintenant!"
            }
        }
    }
}
