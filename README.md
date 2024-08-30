# 🤖 Discord Bot Hub

Welcome to the Discord Bot Hub! This repository contains multiple Discord bots designed for various functionalities. Currently, it includes:

- **ModeratorBot**: A feature rich bot for server moderation and management.
- **MusicBot**: A bot for playing music in voice channels.
- **EconomyBot**: A bot for managing an in-server economy system.
- **ChatBot**: A bot for engaging in conversational interactions using AI.

⚠️**WARNING**⚠️
<br>
ChatBot will use a considerable amount of processing power to run, and it is reccommended to have a powerful computer to run it, especially if you plan to run all the bots.
It is recommended to have good CPU/GPU, if you plan to increase the default context window, or require faster responses.

## Dependencies 
- pip
- discord.py

## Bots Overview

### ModeratorBot

**Features:**
- Ban, kick, and mute users.
- Manage roles and permissions.
- Send welcome and leave messages.
- Log message deletions and edits.
- AutoMod

**Setup:**
1. Edit the `.env` file in the directory and add your Discord bot token.
2. Run `python moderatorbot/main.py`.
3. Setup your roleIDs which are left as placeholders.

### MusicBot

**Features:**
- Play, pause, skip, and stop music.
- Queue songs and manage playlists.
- Search for music and play from YouTube.
- Spotify support for boosters.

**Setup:**
1. Edit `.env` file in the directory and add your Discord bot token.
2. Run `python musicbot/main.py`.
3. Setup your roleIDs which are left as placeholders.

### EconomyBot

**Features:**
- Manage virtual currency with commands like `/bal`, `/rob`, and `/coinflip`.
- Create and manage lootboxes.
- View top balances with `/baltop`.

**Setup:**
1. Edit the `.env` file in the directory and add your Discord bot token.
2. Run `python economybot/main.py`.
3. Customise messages, odds, cooldowns, etc.

### ChatBot

**Features:**
- Have conversational interactions with AI.
- Respond to user messages with AI-generated replies.
- Engage your server, especially when there arent many users active at a given time.

**Setup:**
1. Edit the `.env` file and add your Discord bot token.
2. Edit the code to match with variable in the `.env` file, if you are running all 4 bots.
3. Run `python chatbot/main.py`.

## Installation

1. Clone this repository:
   ```bash
   git clone https://github.com/zeusssz/discord-bot-hub.git
   ```
2. Install the required dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Navigate to the desired bot file(s).
4. Run the bot(s). 

## Contributing

Feel free to contribute by opening issues or submitting pull requests. Your contributions are welcome!

## Contact

For any questions or issues, please contact @roboxer_ on discord.
