# Contributing

If you would like to contribute, please feel free to fork the codebase and submit a pull request. I use Biome for linting and formatting, so make sure you have that set up in your editor of choice.

## Setup

To get the code ready for modifications, do the following:

1. Fork & clone the repository's main branch
2. Run `bun ci` ([install bun](https://bun.com/docs/installation))
3. Make any changes
4. Run `bun test` to ensure all tests pass
5. [Submit a pull request](https://github.com/jorduino/eddybot/compare) (Make sure to follow the [conventional commit format](https://www.conventionalcommits.org/en/v1.0.0/))

## Testing changes locally

If you want to test changes you've made locally, follow the instructions in the [README](https://github.com/jorduino/eddybot/blob/main/README.md) to setup the token, then start the bot with `bun start`

## Adding new commands

If you'd like to add a new command for the bot, make sure you follow the DiscordJS [slash commands guide](https://discordjs.guide/legacy/app-creation/creating-commands#individual-command-files), or reference the layout in one of the other command files. Once your file is added in /src/commands, it should automatically propagate to your bot.
