-- // locals \\ --
local hudLoaded  = false
local helpTimer  = 0

local strings = {"<script","<img","<svg","<style","<link","<iframe","<video","<audio","<body","<head","<html"}

-- // HUD loaded callback \\ --
RegisterNUICallback("hudLoaded", function()
    hudLoaded = true
    SendNUIMessage({ type = "loadhud" })
end)

-- // Sound callback \\ --
RegisterNUICallback("sound", function(data)
    if string.lower(cl_config[data.type].sound.type) == "custom" then
        sendData("send-sound", { sound = cl_config[data.type].sound["custom"].sound })
    elseif string.lower(cl_config[data.type].sound.type) == "fivem" then
        PlaySoundFrontend(-1,
            cl_config[data.type].sound["fivem"].sound.soundName,
            cl_config[data.type].sound["fivem"].sound.soundSetName,
            1)
    end
end)

-- // Events \\ --

RegisterNetEvent(cl_config.general.prime_events["prime_helpnotify"])
AddEventHandler(cl_config.general.prime_events["prime_helpnotify"], function(key, text)
    if not checkString({ text or "not defined" }) then return end

    -- Renova o timer a cada chamada
    helpTimer = GetGameTimer()
    sendData("helpNotify", { show = true, key = key or "E", text = text or "not defined" })

    -- Só esconde se passarem 600ms sem nova chamada
    Citizen.CreateThread(function()
        Wait(600)
        if GetGameTimer() - helpTimer >= 600 then
            sendData("helpNotify", { show = false })
        end
    end)
end)

RegisterNetEvent(cl_config.general.prime_events["prime_progressbar"])
AddEventHandler(cl_config.general.prime_events["prime_progressbar"], function(text, time)
    if not checkString({ text or "not defined" }) then return end
    sendData("progressbar", { text = text or "not defined", time = time or 5000 })
end)

RegisterNetEvent(cl_config.general.prime_events["prime_progressbar:cancel"])
AddEventHandler(cl_config.general.prime_events["prime_progressbar:cancel"], function()
    sendData("progressbar:cancel")
end)

RegisterNetEvent(cl_config.general.prime_events["prime_notify"])
AddEventHandler(cl_config.general.prime_events["prime_notify"], function(type, title, msg, time)
    type = type or "info"
    if not checkString({ title or "not defined", msg or "not defined", type }) then return end
    sendData("notify", {
        type  = type,
        title = title or "not defined",
        msg   = msg   or "not defined",
        time  = time  or 5000,
        icon  = cl_config.notify.icons["" .. type .. ""]
    })
end)

RegisterNetEvent(cl_config.general.prime_events["prime_announce"])
AddEventHandler(cl_config.general.prime_events["prime_announce"], function(title, msg, time)
    if not checkString({ title or "not defined", msg or "not defined" }) then return end
    sendData("announce", {
        title = title or "not defined",
        msg   = msg   or "not defined",
        time  = time  or 5000
    })
end)

-- // Functions \\ --

function sendData(sendtype, data)
    SendNUIMessage({ type = sendtype, data = data })
end

function checkString(checkTxt)
    for _, v in ipairs(checkTxt) do
        for _, ka in ipairs(strings) do
            if string.find(v, ka) then
                return false
            end
        end
    end
    return true
end

-- // Exports \\ --

exports('notify', function(type, title, msg, time)
    TriggerEvent(cl_config.general.prime_events["prime_notify"], type, title, msg, time)
end)

exports('progressbar', function(msg, time)
    TriggerEvent(cl_config.general.prime_events["prime_progressbar"], msg, time)
end)

exports('cancel_progressbar', function()
    TriggerEvent(cl_config.general.prime_events["prime_progressbar:cancel"])
end)

exports('helpnotify', function(key, msg)
    TriggerEvent(cl_config.general.prime_events["prime_helpnotify"], key, msg)
end)

exports('announce', function(title, msg, time)
    TriggerEvent(cl_config.general.prime_events["prime_announce"], title, msg, time)
end)

-- // Print \\ --
print("^0[^5Mist-Notify^0] ^2Script started!^0")