const { Client, GatewayIntentBits } = require('discord.js');
const { AutoTokenizer, AutoModelForCausalLM } = require('@xenova/transformers');
const dotenv = require('dotenv');

dotenv.config();

const modelName = 'microsoft/DialoGPT-medium';
const tokenizer = new AutoTokenizer.from_pretrained(modelName);
const model = new AutoModelForCausalLM.from_pretrained(modelName);

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

client.once('ready', () => {
    console.log(`We have logged in as ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    if (message.content.startsWith('!chat')) {
        const userInput = message.content.slice('!chat '.length);
        const inputIds = tokenizer.encode(userInput + tokenizer.eos_token, { returnTensors: 'pt' });
        const chatHistoryIds = await model.generate(inputIds, { max_length: 1000, pad_token_id: tokenizer.eos_token_id });
        const botResponse = tokenizer.decode(chatHistoryIds[0].slice(inputIds.shape[-1]), { skip_special_tokens: true });

        message.channel.send(botResponse);
    }
});

const token = process.env['CHAT-TOKEN'];
client.login(token);
