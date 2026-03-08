fx_version 'cerulean'
game 'gta5'

author 'Mist Scripts'
description 'mist_ui - Notify / Progressbar / Announce / HelpNotify'
version '1.0.0'

lua54 'yes'

ui_page 'html/index.html'

shared_scripts {
    'config/cl_config.lua'
}

client_scripts {
    'client/client.lua',
    'client/test.lua' -- remove esta linha em producao
}

server_scripts {
    'config/sv_config.lua',
    'server/server.lua'
}

files {
    'html/**'
}

export {
    "progressbar",
    "cancel_progressbar",
    "helpnotify",
    "announce",
    "notify"
}