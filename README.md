# mist_ui

Versão simplificada do prime_hud — mantém apenas:
- `notify`
- `progressbar` / `cancel_progressbar`
- `announce`
- `helpnotify`

## Instalação

1. Coloca a pasta `mist_ui` em `resources/`
2. Adiciona `ensure mist_ui` ao teu `server.cfg`
3. Copia as tuas fonts para `html/assets/fonts/` (Collonse-Bold.ttf, Gilroy-*.ttf)
4. Copia os teus sons para `html/assets/sounds/` (notify.mp3, announce_1.mp3)
5. Copia o teu logo para `html/assets/img/logo.png`
6. Copia o ficheiro `html/assets/img/info-announce.svg` do prime_hud original

## Uso (exports)

```lua
-- Notify
exports["mist_ui"]:notify("info", "Título", "Mensagem", 5000)
exports["mist_ui"]:notify("success", "Título", "Mensagem", 5000)
exports["mist_ui"]:notify("error", "Título", "Mensagem", 5000)
exports["mist_ui"]:notify("warning", "Título", "Mensagem", 5000)

-- Progressbar
exports["mist_ui"]:progressbar("A carregar...", 5000)
exports["mist_ui"]:cancel_progressbar()

-- Announce
exports["mist_ui"]:announce("TÍTULO", "Mensagem do announce", 5000)

-- Help Notify (chamar num loop enquanto quiser mostrar)
exports["mist_ui"]:helpnotify("E", "Para abrir a porta")
```

## Eventos (alternativa aos exports)

```lua
TriggerEvent("mist_ui",        "info", "Título", "Mensagem", 5000)
TriggerEvent("mist_progressbar",   "A carregar...", 5000)
TriggerEvent("prime_progressbar:cancel")
TriggerEvent("prime_announce",     "TÍTULO", "Mensagem", 5000)
TriggerEvent("prime_helpnotify",   "E", "Para abrir a porta")
```

## Ficheiros que tens de copiar do prime_hud original

- `html/assets/fonts/` — todas as fontes .ttf
- `html/assets/sounds/notify.mp3`
- `html/assets/sounds/announce_1.mp3`
- `html/assets/img/logo.png`
- `html/assets/img/info-announce.svg`
