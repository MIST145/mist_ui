-- // Comando de teste: /notifytest \\ --
-- Coloca este ficheiro em qualquer resource cliente ou adiciona diretamente ao client.lua do mist_notify

RegisterCommand("notifytest", function()

    -- NOTIFY - info
    exports["mist_ui"]:notify("info", "INFO", "Isto é uma notificação de informação!", 5000)
    Wait(5500)

    -- NOTIFY - success
    exports["mist_ui"]:notify("success", "SUCESSO", "Ação concluída com sucesso!", 5000)
    Wait(5500)

    -- NOTIFY - warning
    exports["mist_ui"]:notify("warning", "AVISO", "Tens pouco combustível no veículo!", 5000)
    Wait(5500)

    -- NOTIFY - error
    exports["mist_ui"]:notify("error", "ERRO", "Não tens permissão para fazer isso!", 5000)
    Wait(5500)

    -- PROGRESSBAR
    exports["mist_ui"]:progressbar("A arrancar o motor...", 5000)
    Wait(5500)

    -- ANNOUNCE
    exports["mist_ui"]:announce("AVISO SERVIDOR", "Manutenção programada para as 22h00. Prepara-te!", 6000)
    Wait(7000)

    -- HELPNOTIFY (mostra durante 4 segundos num loop)
    local showHelp = true
    Citizen.CreateThread(function()
        while showHelp do
            Wait(0)
            exports["mist_ui"]:helpnotify("E", "Para entrar no veículo")
        end
    end)
    Wait(4000)
    showHelp = false

    exports["mist_ui"]:notify("success", "TESTE", "Todos os componentes testados com sucesso!", 5000)

end, false)

-- // Comando para testar o cancel do progressbar \\ --
RegisterCommand("progresstest", function()
    exports["mist_ui"]:progressbar("Este progressbar vai ser cancelado...", 10000)
    Wait(3000)
    exports["mist_ui"]:cancel_progressbar()
    exports["mist_ui"]:notify("warning", "CANCELADO", "O progressbar foi cancelado manualmente!", 5000)
end, false)

print("^0[^5Mist-Notify^0] ^3Comandos de teste carregados: /notifytest | /progresstest^0")