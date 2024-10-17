import discord
from discord.app_commands import CommandTree
from transformers import AutoModelForCausalLM, AutoTokenizer
import os
from dotenv import load_dotenv
from collections import defaultdict

load_dotenv()

model_name = "microsoft/DialoGPT-medium"
tokenizer = AutoTokenizer.from_pretrained(model_name)
model = AutoModelForCausalLM.from_pretrained(model_name)

intents = discord.Intents.default()
intents.message_content = True
client = discord.Client(intents=intents)
tree = CommandTree(client)
chat_history = defaultdict(list)

@client.event
async def on_ready():
    await tree.sync()
    print(f'We have logged in as {client.user}')

@tree.command(name="chat", description="Chat with the bot.")
async def chat(interaction: discord.Interaction, message: str):
    user_id = interaction.user.id
    chat_history[user_id].append(tokenizer.encode(message + tokenizer.eos_token, return_tensors='pt'))
    input_ids = torch.cat(chat_history[user_id]) if chat_history[user_id] else None

    try:
        chat_history_ids = model.generate(
            input_ids,
            max_length=1000,
            pad_token_id=tokenizer.eos_token_id
        )
        bot_response = tokenizer.decode(chat_history_ids[:, input_ids.shape[-1]:][0], skip_special_tokens=True)
        chat_history[user_id].append(chat_history_ids[:, input_ids.shape[-1]:])
        if len(chat_history[user_id]) > 10:
            chat_history[user_id] = chat_history[user_id][-10:]

        await interaction.response.send_message(f"**Bot:** {bot_response}")

    except Exception as e:
        await interaction.response.send_message("Sorry, I encountered an error. Please try again later.")

token = os.getenv('CHAT_TOKEN')
client.run(token)
