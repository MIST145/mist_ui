-- // locals \\ --
local hudLoaded   = false
local helpTimer   = 0
local helpShowing = false  -- single flag instead of per-call threads

local strings = {"<script","<img","<svg","<style","<link","<iframe","<video","<audio","<body","<head","<html"}

-- // HUD loaded callback \\ --
-- Apenas envia loadhud. As posições são restauradas em hudReady,
-- que só é chamado depois do DOM estar completamente construído.
RegisterNUICallback("hudLoaded", function(data, cb)
    hudLoaded = true
    SendNUIMessage({ type = "loadhud" })
    cb("ok")
end)

-- // HUD ready callback — chamado pelo JS após loadhtml() estar completo \\ --
-- FIX: race condition — setPositions chegava antes do DOM estar pronto.
RegisterNUICallback("hudReady", function(data, cb)
    local keys = { "notify", "progressbar", "helpnotify", "announce" }
    local positions = {}
    local hasAny = false

    for _, key in ipairs(keys) do
        local left = GetResourceKvpString("ui_pos_" .. key .. "_left")
        local top  = GetResourceKvpString("ui_pos_" .. key .. "_top")
        if left and top then
            positions[key] = { left = left, top = top }
            hasAny = true
        end
    end

    if hasAny then
        SendNUIMessage({ type = "setPositions", data = positions })
    end

    cb("ok")
end)

-- // Sound callback \\ --
RegisterNUICallback("sound", function(data, cb)
    if string.lower(cl_config[data.type].sound.type) == "custom" then
        sendData("send-sound", { sound = cl_config[data.type].sound["custom"].sound })
    elseif string.lower(cl_config[data.type].sound.type) == "fivem" then
        PlaySoundFrontend(-1,
            cl_config[data.type].sound["fivem"].sound.soundName,
            cl_config[data.type].sound["fivem"].sound.soundSetName,
            1)
    end
    cb("ok")
end)

-- // Close NUI callback (ESC fora do modo de edição) \\ --
RegisterNUICallback("close", function(data, cb)
    SetNuiFocus(false, false)
    cb("ok")
end)

-- // Save UI Positions callback \\ --
RegisterNUICallback("savePositions", function(data, cb)
    if type(data) == "table" then
        for key, pos in pairs(data) do
            if pos.left and pos.top then
                SetResourceKvp("ui_pos_" .. key .. "_left", pos.left)
                SetResourceKvp("ui_pos_" .. key .. "_top",  pos.top)
            end
        end
    end
    cb("ok")
end)

-- // Close Edit callback \\ --
RegisterNUICallback("closeEdit", function(data, cb)
    SetNuiFocus(false, false)
    cb("ok")
end)

-- // /ui_edit \\ --
RegisterCommand("ui_edit", function()
    SetNuiFocus(true, true)
    SendNUIMessage({
        type = "editMode",
        data = { state = true }
    })
end, false)

-- // /ui_reset \\ --
RegisterCommand("ui_reset", function()
    local keys = { "notify", "progressbar", "helpnotify", "announce" }
    for _, key in ipairs(keys) do
        DeleteResourceKvp("ui_pos_" .. key .. "_left")
        DeleteResourceKvp("ui_pos_" .. key .. "_top")
    end
    TriggerEvent(cl_config.general.prime_events["prime_notify"], "success", "UI Reset", "Posições restauradas para o padrão.", 4000)
end, false)

-- // Events \\ --

-- FIX: thread leak — em vez de criar uma nova thread por cada chamada,
-- existe uma única thread persistente que verifica o timer.
-- O event handler apenas atualiza o timer e envia o estado para a NUI.
RegisterNetEvent(cl_config.general.prime_events["prime_helpnotify"])
AddEventHandler(cl_config.general.prime_events["prime_helpnotify"], function(key, text)
    if not checkString({ text or "not defined" }) then return end
    helpTimer   = GetGameTimer()
    helpShowing = true
    sendData("helpNotify", { show = true, key = key or "E", text = text or "not defined" })
end)

-- // Thread único persistente para helpnotify \\ --
-- Verifica a cada 100ms se o helpnotify deve ser escondido.
-- Substitui o padrão anterior de criar uma thread por chamada de evento.
Citizen.CreateThread(function()
    while true do
        Wait(100)
        if helpShowing and GetGameTimer() - helpTimer >= 600 then
            helpShowing = false
            sendData("helpNotify", { show = false })
        end
    end
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
print("^0[^5Mist-UI^0] ^2Client started!^0")