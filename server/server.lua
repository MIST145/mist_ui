-- // FIX: ESX como dependência opcional \\
-- Se es_extended não estiver presente, o resource não crasha.
-- O comando /announce usa IsPlayerAceAllowed como fallback.
local ESX    = nil
local hasESX = false

pcall(function()
    ESX    = exports["es_extended"]:getSharedObject()
    hasESX = ESX ~= nil
end)

if not hasESX then
    -- Fallback: AddEventHandler para versões muito antigas de ESX que emitem o evento
    AddEventHandler(sv_config.general.esx_events["esx:getSharedObject"], function(obj)
        ESX    = obj
        hasESX = true
    end)
end

local language = sv_config.language[cl_config.general.language]

-- // Função auxiliar: verificar grupo/permissão do jogador \\ --
-- Com ESX: verifica getGroup() contra sv_config.announce.groups
-- Sem ESX: verifica ace permission "mist_ui.announce" (configurável no server.cfg)
local function playerHasAnnouncePermission(src)
    if hasESX and ESX then
        local xPlayer = ESX.GetPlayerFromId(src)
        if xPlayer then
            return sv_config.announce.groups[xPlayer.getGroup()] == true
        end
        return false
    else
        -- Fallback sem ESX: usa ace permissions nativas do FiveM
        -- Para dar permissão: add ace group.admin mist_ui.announce allow
        return IsPlayerAceAllowed(tostring(src), "mist_ui.announce")
    end
end

-- // /announce command \\ --
if sv_config.announce.enable then
    RegisterCommand(sv_config.announce.command, function(source, args)
        local src = source
        local msg = table.concat(args, " ")

        if src ~= 0 then
            if msg ~= nil and msg ~= "" then
                if playerHasAnnouncePermission(src) then
                    TriggerClientEvent(cl_config.general.prime_events["prime_announce"], -1, "Announce", msg, sv_config.announce.time)
                else
                    TriggerClientEvent(cl_config.general.prime_events["prime_notify"], src, "error", "Mist UI", language["announce"]["command"]["no_perms"], 5000)
                end
            else
                TriggerClientEvent(cl_config.general.prime_events["prime_notify"], src, "error", "Mist UI", language["announce"]["command"]["no_value"], 5000)
            end
        else
            -- Chamada via consola/txAdmin — sempre permitida
            TriggerClientEvent(cl_config.general.prime_events["prime_announce"], -1, "Console", msg, sv_config.announce.time)
        end
    end)
end

-- // txAdmin events \\ --
if sv_config.general.txAdmin.enable then
    AddEventHandler(sv_config.general.txAdmin.events["txAdmin:events:scheduledRestart"], function(eventData)
        if eventData.secondsRemaining ~= 60 then
            TriggerClientEvent(cl_config.general.prime_events["prime_announce"], -1, "txAdmin",
                string.format(language["announce"]["txAdmin"]["scheduled_restart"], math.ceil(eventData.secondsRemaining / 60)), 7500)
        else
            TriggerClientEvent(cl_config.general.prime_events["prime_announce"], -1, "txAdmin",
                string.format(language["announce"]["txAdmin"]["scheduled_restart_disconnect"], eventData.secondsRemaining), 7500)
        end
    end)

    AddEventHandler(sv_config.general.txAdmin.events["txAdmin:events:announcement"], function(data)
        TriggerClientEvent(cl_config.general.prime_events["prime_announce"], -1, "txAdmin",
            data.author .. ": " .. data.message, 7500)
    end)
end

-- // Print \\ --
if hasESX then
    print("^0[^5Mist-UI^0] ^2Server started! ^7(ESX detected)^0")
else
    print("^0[^5Mist-UI^0] ^2Server started! ^3(No ESX — using ace permissions for /announce)^0")
    print("^0[^5Mist-UI^0] ^3To grant /announce: add ace group.admin mist_ui.announce allow^0")
end