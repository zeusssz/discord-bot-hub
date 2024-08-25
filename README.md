# Discord Bot Hub

Welcome to the Discord Bot Hub! This repository contains multiple Discord bots designed for various functionalities. Currently, it includes:

- **ModerationBot**: A feature rich bot for server moderation and management.
- **MusicBot**: A bot for playing music in voice channels.
- **EconomyBot**: A bot for managing an in-server economy system.
- **ChatBot**: A bot for engaging in conversational interactions using AI.

## Dependencies 
- pip
- discord.py

## Bots Overview

### ModerationBot

**Features:**
- Ban, kick, and mute users.
- Manage roles and permissions.
- Send welcome and leave messages.
- Log message deletions and edits.
- AutoMod

**Setup:**
1. Edit the `.env` file in the directory and add your Discord bot token.
2. Run `python moderationbot.py`.
3. Setup your roleIDs which are left as placeholders.

### MusicBot

**Features:**
- Play, pause, skip, and stop music.
- Queue songs and manage playlists.
- Search for music and play from YouTube.
- Spotify support for boosters.

**Setup:**
1. Edit `.env` file in the directory and add your Discord bot token.
2. Run `python musicbot.py`.
3. Setup your roleIDs which are left as placeholders.

### EconomyBot

**Features:**
- Manage virtual currency with commands like `/bal`, `/rob`, and `/coinflip`.
- Create and manage lootboxes.
- View top balances with `/baltop`.

**Setup:**
1. Edit the `.env` file in the directory and add your Discord bot token.
2. Run `python bot.py`.
3. Customise messages, odds, cooldowns, etc.

### ChatBot

**Features:**
- Have conversational interactions with AI.
- Respond to user messages with AI-generated replies.
- Engage your server, especially when there arent many users active at a given time.

**Setup:**
1. Edit the `.env` file and add your Discord bot token and.
2. Run `python main.py`.

## Installation

1. Clone this repository:
   ```bash
   git clone https://github.com/zeusssz/discord-bot-hub.git
   ```
2. Install the required dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Navigate to the desired bot file.
4. Run the bot. 

## Contributing

Feel free to contribute by opening issues or submitting pull requests. Your contributions are welcome!

## Contact

For any questions or issues, please contact @roboxer_ on discord.
