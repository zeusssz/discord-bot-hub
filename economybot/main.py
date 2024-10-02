import discord
from discord.app_commands import CommandTree
import random
import json
import asyncio
import logging
import os
from discord.ext import tasks
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(level=logging.INFO)

intents = discord.Intents.default()
intents.message_content = True
client = discord.Client(intents=intents)
tree = CommandTree(client)

LOOTBOX_AMOUNT = random.randint(30, 100)
users = {}

rob_cooldowns = {}
coinflip_cooldowns = {}

def save_users():
    try:
        with open('users.json', 'w') as f:
            json.dump(users, f)
    except Exception as e:
        logging.error(f"Error saving users: {e}")

def load_users():
    global users
    try:
        with open('users.json', 'r') as f:
            users = json.load(f)
    except FileNotFoundError:
        users = {}
    except Exception as e:
        logging.error(f"Error loading users: {e}")
        users = {}
    return users

@client.event
async def on_ready():
    await tree.sync()
    logging.info(f'Logged in as {client.user}!')
    load_users()

@tree.command(name="coinflip", description="Bet an amount of francs and flip a coin.")
async def coinflip(interaction: discord.Interaction, amount: int):
    user_id = str(interaction.user.id)
    if user_id not in users or "balance" not in users[user_id] or users[user_id]["balance"] < amount:
        await interaction.response.send_message("You don't have enough francs to bet that amount.", ephemeral=True)
        return

    if user_id in coinflip_cooldowns and coinflip_cooldowns[user_id] > asyncio.get_event_loop().time():
        await interaction.response.send_message("You are on cooldown for the coinflip command.", ephemeral=True)
        return

    if random.choice(['heads', 'tails']) == 'heads':
        users[user_id]["balance"] += amount
        await interaction.response.send_message(f"Congratulations {interaction.user.mention}, you won {amount} francs!")
    else:
        users[user_id]["balance"] -= amount
        await interaction.response.send_message(f"Sorry {interaction.user.mention}, you lost {amount} francs.")

    coinflip_cooldowns[user_id] = asyncio.get_event_loop().time() + 30  # 30 seconds cooldown
    save_users()

@tree.command(name="bal", description="Check your balance.")
async def bal(interaction: discord.Interaction):
    user_id = str(interaction.user.id)
    balance = users.get(user_id, {"balance": 100})["balance"]
    await interaction.response.send_message(f"{interaction.user.mention}, you have {balance} francs.")

@tree.command(name="baltop", description="Show the top 5 richest users.")
async def baltop(interaction: discord.Interaction):
    top_users = sorted(users.items(), key=lambda x: x[1]["balance"], reverse=True)[:5]
    embed = discord.Embed(title="Top 5 Richest Users", color=discord.Color.gold())
    for user_id, data in top_users:
        user = await client.fetch_user(int(user_id))
        embed.add_field(name=user.name, value=f"{data['balance']} francs", inline=False)
    await interaction.response.send_message(embed=embed)

@tree.command(name="rob", description="Rob another user for francs.")
async def rob(interaction: discord.Interaction, target: discord.Member):
    if interaction.user == target:
        await interaction.response.send_message("You cannot rob yourself!", ephemeral=True)
        return

    user_id = str(interaction.user.id)
    target_id = str(target.id)
    if user_id not in users or "balance" not in users[user_id] or users[user_id]["balance"] < 0:
        await interaction.response.send_message("You don't have enough francs to rob.", ephemeral=True)
        return

    if user_id in rob_cooldowns and rob_cooldowns[user_id] > asyncio.get_event_loop().time():
        await interaction.response.send_message("You are on cooldown for the rob command.", ephemeral=True)
        return

    if random.randint(1, 100) <= 10:
        stolen_amount = random.randint(30, 100)
        users[target_id] = users.get(target_id, {"balance": 100})
        users[target_id]["balance"] -= stolen_amount
        users[user_id]["balance"] += stolen_amount
        await interaction.response.send_message(f"Successful robbery! You stole {stolen_amount} francs from {target.mention}.")
    else:
        loss = int(users[user_id]["balance"] * 0.10)
        users[user_id]["balance"] -= loss
        await interaction.response.send_message(f"Robbery failed! You lost {loss} francs.")

    rob_cooldowns[user_id] = asyncio.get_event_loop().time() + 60  # 60s cooldown
    save_users()

async def lootbox_timeout(message_sent):
    await asyncio.sleep(10)
    await message_sent.delete()

@client.event
async def on_message(message):
    if message.author == client.user:
        return

    if random.random() < 0.1:
        lootbox_amount = random.randint(30, 100)

        embed = discord.Embed(title="Lootbox Available!",
                              description=f"Claim the lootbox to get {lootbox_amount} francs!",
                              color=0xFFD700)
        view = discord.ui.View()
        button = discord.ui.Button(label="Claim", style=discord.ButtonStyle.primary)
        view.add_item(button)

        winners = set()

        async def claim_button_callback(interaction: discord.Interaction):
            user_id = str(interaction.user.id)

            if user_id in winners:
                await interaction.response.send_message("You have already claimed this lootbox!", ephemeral=True)
                return

            if len(winners) >= 3:
                await interaction.response.send_message("The lootbox has already been claimed by 3 users.", ephemeral=True)
                return

            users = load_users()

            if user_id in users:
                users[user_id]["balance"] += lootbox_amount
            else:
                users[user_id] = {"balance": lootbox_amount}

            save_users(users)
            winners.add(user_id)
            winners_list = "\n".join(f"<@{user_id}>" for user_id in winners)
            embed.description = f"Claim the lootbox to get {lootbox_amount} francs!\n\n**Winners so far:**\n{winners_list}"
            await interaction.response.edit_message(embed=embed, view=view)

            if len(winners) >= 3:
                button.disabled = True
                await interaction.edit_original_message(embed=embed, view=view)

        button.callback = claim_button_callback

        message_sent = await message.channel.send(embed=embed, view=view)

        try:
            await asyncio.wait_for(lootbox_timeout(message_sent), timeout=20)
        except asyncio.TimeoutError:
            await message_sent.delete()

token = os.environ['ECON-TOKEN']
client.run(token)
