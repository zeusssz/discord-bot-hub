const { Client, GatewayIntentBits, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, InteractionType } = require('discord.js');
const { CommandTree } = require('discord.js/commands');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

dotenv.config();

const LOOTBOX_AMOUNT = Math.floor(Math.random() * (100 - 30 + 1)) + 30;
const usersFilePath = path.resolve('users.json');
let users = {};

const robCooldowns = {};
const coinflipCooldowns = {};

function loadUsers() {
    try {
        if (fs.existsSync(usersFilePath)) {
            users = JSON.parse(fs.readFileSync(usersFilePath, 'utf8'));
        } else {
            users = {};
        }
    } catch (error) {
        console.error(`Error loading users: ${error}`);
        users = {};
    }
}

function saveUsers() {
    try {
        fs.writeFileSync(usersFilePath, JSON.stringify(users, null, 2));
    } catch (error) {
        console.error(`Error saving users: ${error}`);
    }
}

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});
const tree = new CommandTree(client);

client.once('ready', () => {
    loadUsers();
    console.log(`Logged in as ${client.user.tag}!`);
    tree.sync();
});

tree.command('coinflip', async (interaction, amount) => {
    const userId = interaction.user.id;

    if (!users[userId] || users[userId].balance < amount) {
        await interaction.reply({ content: "You don't have enough francs to bet that amount.", ephemeral: true });
        return;
    }

    if (coinflipCooldowns[userId] && coinflipCooldowns[userId] > Date.now()) {
        await interaction.reply({ content: "You are on cooldown for the coinflip command.", ephemeral: true });
        return;
    }

    if (Math.random() < 0.5) {
        users[userId].balance += amount;
        await interaction.reply(`Congratulations ${interaction.user}, you won ${amount} francs!`);
    } else {
        users[userId].balance -= amount;
        await interaction.reply(`Sorry ${interaction.user}, you lost ${amount} francs.`);
    }

    coinflipCooldowns[userId] = Date.now() + 30 * 1000; // 30 seconds cooldown
    saveUsers();
});

tree.command('bal', async (interaction) => {
    const userId = interaction.user.id;
    const balance = users[userId] ? users[userId].balance : 100;
    await interaction.reply(`${interaction.user}, you have ${balance} francs.`);
});

tree.command('baltop', async (interaction) => {
    const topUsers = Object.entries(users)
        .sort((a, b) => b[1].balance - a[1].balance)
        .slice(0, 5);

    const embed = new EmbedBuilder()
        .setTitle('Top 5 Richest Users')
        .setColor('GOLD');

    for (const [userId, data] of topUsers) {
        const user = await client.users.fetch(userId);
        embed.addFields({ name: user.username, value: `${data.balance} francs`, inline: false });
    }

    await interaction.reply({ embeds: [embed] });
});

tree.command('rob', async (interaction, target) => {
    if (interaction.user.id === target.id) {
        await interaction.reply({ content: 'You cannot rob yourself!', ephemeral: true });
        return;
    }

    const userId = interaction.user.id;
    const targetId = target.id;

    if (!users[userId] || users[userId].balance <= 0) {
        await interaction.reply({ content: "You don't have enough francs to rob.", ephemeral: true });
        return;
    }

    if (robCooldowns[userId] && robCooldowns[userId] > Date.now()) {
        await interaction.reply({ content: "You are on cooldown for the rob command.", ephemeral: true });
        return;
    }

    if (Math.random() <= 0.1) {
        const stolenAmount = Math.floor(Math.random() * (100 - 30 + 1)) + 30;
        users[targetId] = users[targetId] || { balance: 100 };
        users[targetId].balance -= stolenAmount;
        users[userId].balance += stolenAmount;
        await interaction.reply(`Successful robbery! You stole ${stolenAmount} francs from ${target}.`);
    } else {
        const loss = Math.floor(users[userId].balance * 0.10);
        users[userId].balance -= loss;
        await interaction.reply(`Robbery failed! You lost ${loss} francs.`);
    }

    robCooldowns[userId] = Date.now() + 60 * 1000; // 60 seconds cooldown
    saveUsers();
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    if (Math.random() < 0.1) {
        const lootboxAmount = Math.floor(Math.random() * (100 - 30 + 1)) + 30;
        const embed = new EmbedBuilder()
            .setTitle('Lootbox Available!')
            .setDescription(`Claim the lootbox to get ${lootboxAmount} francs!`)
            .setColor(0xFFD700);

        const button = new ButtonBuilder()
            .setCustomId('claim')
            .setLabel('Claim')
            .setStyle(ButtonStyle.Primary);

        const row = new ActionRowBuilder().addComponents(button);
        const messageSent = await message.channel.send({ embeds: [embed], components: [row] });

        const winners = new Set();

        const filter = (interaction) => interaction.customId === 'claim' && interaction.isButton();
        const collector = messageSent.createMessageComponentCollector({ filter, time: 20000 });

        collector.on('collect', async (interaction) => {
            const userId = interaction.user.id;

            if (winners.has(userId)) {
                await interaction.reply({ content: 'You have already claimed this lootbox!', ephemeral: true });
                return;
            }

            if (winners.size >= 3) {
                await interaction.reply({ content: 'The lootbox has already been claimed by 3 users.', ephemeral: true });
                return;
            }

            users = loadUsers();

            if (users[userId]) {
                users[userId].balance += lootboxAmount;
            } else {
                users[userId] = { balance: lootboxAmount };
            }

            saveUsers();
            winners.add(userId);
            embed.setDescription(`Claim the lootbox to get ${lootboxAmount} francs!\n\n**Winners so far:**\n${Array.from(winners).map((id) => `<@${id}>`).join('\n')}`);
            await interaction.update({ embeds: [embed], components: [row] });

            if (winners.size >= 3) {
                button.setDisabled(true);
                await interaction.message.edit({ embeds: [embed], components: [row] });
                collector.stop();
            }
        });

        collector.on('end', async () => {
            await messageSent.delete();
        });
    }
});

const token = process.env['ECON-TOKEN'];
client.login(token);
