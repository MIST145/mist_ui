local ESX      = nil
local language = sv_config.language[cl_config.general.language]

-- // get ESX \\ --
if exports["es_extended"]:getSharedObject() then
    ESX = exports["es_extended"]:getSharedObject()
else
    TriggerEvent(sv_config.general.esx_events["esx:getSharedObject"], function(obj) ESX = obj end)
end

-- // /announce command \\ --
if sv_config.announce.enable then
    RegisterCommand(sv_config.announce.command, function(source, args)
        local src = source
        local msg = table.concat(args, " ")

        if src ~= 0 then
            if msg ~= nil and msg ~= "" then
                local xPlayer = ESX.GetPlayerFromId(src)
                if sv_config.announce.groups[xPlayer.getGroup()] then
                    TriggerClientEvent(cl_config.general.prime_events["prime_announce"], -1, "Announce", msg, sv_config.announce.time)
                else
                    TriggerClientEvent(cl_config.general.prime_events["prime_notify"], src, "error", "Mist Notify", language["announce"]["command"]["no_perms"], 5000)
                end
            else
                TriggerClientEvent(cl_config.general.prime_events["prime_notify"], src, "error", "Mist Notify", language["announce"]["command"]["no_value"], 5000)
            end
        else
            -- chamada via consola/txAdmin
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

print("^0[^5Mist-Notify^0] ^2Server started!^0")
