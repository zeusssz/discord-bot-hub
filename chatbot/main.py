import discord
from discord.app_commands import CommandTree
from transformers import AutoModelForCausalLM, AutoTokenizer
import os
from dotenv import load_dotenv

load_dotenv()

model_name = "microsoft/DialoGPT-medium"
tokenizer = AutoTokenizer.from_pretrained(model_name)
model = AutoModelForCausalLM.from_pretrained(model_name)

intents = discord.Intents.default()
intents.message_content = True
client = discord.Client(intents=intents)
tree = CommandTree(client)

@client.event
async def on_ready():
    await tree.sync()
    print(f'We have logged in as {client.user}')

@tree.command(name="chat", description="Chat with the bot.")
async def chat(interaction: discord.Interaction, message: str):
    input_ids = tokenizer.encode(message + tokenizer.eos_token, return_tensors='pt')
    chat_history_ids = model.generate(input_ids, max_length=1000, pad_token_id=tokenizer.eos_token_id)
    bot_response = tokenizer.decode(chat_history_ids[:, input_ids.shape[-1]:][0], skip_special_tokens=True)
    await interaction.response.send_message(bot_response)
    
token = os.getenv('CHAT-TOKEN')
client.run(token)
