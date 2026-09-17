TModLoaderUWP runs the real desktop Terraria and tModLoader on Xbox Series S and Series X in Developer Mode. It plays at 1080p on a controller, signs in to Steam on the console, downloads Terraria from your own account, and installs Workshop mods through the in-game Mod Browser.

## Before installing

- An Xbox in Developer Mode
- A Steam account that owns Terraria
- The Steam mobile app, for signing in

Both files install as one package, the MSIX with `Microsoft.VCLibs.x64.14.00.appx` as its dependency. The console does not ship with VCLibs and the app will not start without it.

Set the app to Game mode in Dev Home before launching it. App mode caps it near 1 GB of memory and Terraria's assets will not load.

Quit to the main menu before leaving the app. The console kills a suspended developer mode app after a few seconds, and that can tear a world file mid-save.

Not affiliated with Re-Logic or the tModLoader team.
