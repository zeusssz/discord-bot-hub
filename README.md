# 🤖 <br> Discord Bot Hub

![Stars](https://img.shields.io/github/stars/zeusssz/discord-bot-hub?style=flat-square)  ![Forks](https://img.shields.io/github/forks/zeusssz/discord-bot-hub?style=flat-square)  ![Issues](https://img.shields.io/github/issues/zeusssz/discord-bot-hub?style=flat-square)  ![License](https://img.shields.io/github/license/zeusssz/discord-bot-hub?style=flat-square)  ![Last Commit](https://img.shields.io/github/last-commit/zeusssz/discord-bot-hub?style=flat-square)

Welcome to the **Discord Bot Hub**! This repository contains multiple Discord bots designed for various functionalities. (If you wish to use `discord.js` instead of `discord.py`, you may go to the [JS version](https://github.com/zeusssz/discord-bot-hub/tree/js-version) of this repo. Be warned, as the JS version is extremely buggy, and the port is still not finished.)
<br>
<br>
A CLI to handle all the bots is currently in progress

---
# 📦 Requirements
- pip
- discord.py
- Others given in [requirements](requirements.txt)

## 🛠️ Bots Included

### 🚨 **ModeratorBot**

**Features:**
- Ban, kick, and mute users.
- Manage roles and permissions.
- Send welcome and leave messages.
- Log message deletions and edits.
- AutoMod

**Setup:**
1. Edit the `.env` file in the directory and add your Discord bot token.
2. Run `python moderatorbot/main.py`.
3. Set up your roleIDs, which are left as placeholders.

---

### 🎵 **MusicBot**

**Features:**
- Play, pause, skip, and stop music.
- Queue songs and manage playlists.
- Search for music and play from YouTube.
- Spotify support for boosters.

**Setup:**
1. Edit the `.env` file in the directory and add your Discord bot token.
2. Run `python musicbot/main.py`.
3. Set up your roleIDs, which are left as placeholders.

---

### 💰 **EconomyBot**

**Features:**
- Manage virtual currency with commands like `/bal`, `/rob`, and `/coinflip`.
- Create and manage lootboxes.
- View top balances with `/baltop`.

**Setup:**
1. Edit the `.env` file in the directory and add your Discord bot token.
2. Run `python economybot/main.py`.
3. Customize messages, odds, cooldowns, etc.

---

### 🗣️ **ChatBot**

**Features:**
- Have conversational interactions with AI.
- Respond to user messages with AI-generated replies.
- Engage your server, especially when there aren’t many users active at a given time.

**Setup:**
1. Edit the `.env` file and add your Discord bot token.
2. Edit the code to match with variables in the `.env` file, if you are running all 4 bots.
3. Run `python chatbot/main.py`.
4. (Optional) You may change the AI Model being used, or you may also fine-tune it. For fine-tuning, please [read this](https://huggingface.co/docs/transformers/en/training).

---

## 🛠️ Installation

1. **Clone this repository:**
   ```bash
   git clone https://github.com/zeusssz/discord-bot-hub.git
   ```
2. **Install the required dependencies:**
   ```bash
   pip install -r requirements.txt
   ```
3. **Navigate to the desired bot file(s).**
4. **Run the bot(s).**

---

## 💡 Contributing

Feel free to contribute by opening issues or submitting pull requests. Your contributions are welcome!.
<br>
Read the [contribution guidelines](CONTRIBUTING.md) to learn how to write according to the guidelines of the repo.

---

## ℹ️ Info

For any questions or issues, please contact [@roboxer_](https://discordapp.com/users/844557128139014205) on Discord.
