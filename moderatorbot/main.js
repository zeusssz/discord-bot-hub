const { Client, GatewayIntentBits, Partials, ActivityType, EmbedBuilder, PermissionsBitField, Collection } = require('discord.js');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const fs = require('fs');
const path = require('path');
const { DateTime } = require('luxon');
const { setTimeout } = require('timers/promises');
const logging = require('winston');
const dotenv = require('dotenv');

dotenv.config();

logging.configure({
    level: 'info',
    format: logging.format.printf(info => `${info.level}: ${info.message}`),
    transports: [
        new logging.transports.Console(),
        new logging.transports.File({ filename: 'logs.log' })
    ]
});

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.MessageContent
    ],
    partials: [Partials.Message, Partials.Channel, Partials.Reaction]
});

const starredMessages = new Set();
const commands = [];

const GUILD_ID = 0; // your guild id here
const ROLES_FILE = "roles.json";
const BANS_FILE = "bans.json";
const MUTES_FILE = "mutes.json";
const WARNINGS_FILE = "warnings.json";
const BANNED_WORDS = "banned_words.json";
const NOTES_FILE = "notes.json";
const STAR_EMOJI = '⭐';
const STARBOARD_CHANNEL_ID = 0; // your starboard channel id
const WELCOME_CHANNEL_ID = 0; // your welcome channel id

const logCapture = [];

class LogHandler extends logging.transports.Stream {
    constructor(options) {
        super(options);
    }

    log(info, callback) {
        logCapture.push(info.message);
        if (logCapture.length > 100) {
            logCapture.shift();
        }
        callback();
    }
}

logging.add(new LogHandler());

const bannedWordPatterns = [];

function loadData(filePath) {
    if (!fs.existsSync(filePath)) {
        return {};
    }
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function saveData(filePath, data) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 4));
}

const filesToInitialize = [ROLES_FILE, BANS_FILE, MUTES_FILE, WARNINGS_FILE, BANNED_WORDS, NOTES_FILE];
filesToInitialize.forEach(file => {
    if (!fs.existsSync(file)) {
        fs.writeFileSync(file, JSON.stringify({}));
    }
});

client.once('ready', async () => {
    const rest = new REST({ version: '9' }).setToken(process.env.DISCORD_TOKEN);
    try {
        await rest.put(
            Routes.applicationGuildCommands(client.user.id, GUILD_ID),
            { body: commands }
        );
        logging.info("Bot is ready and commands are synced globally!");
        await scheduleUnbans();
    } catch (error) {
        logging.error(error);
    }
});

async function scheduleUnbans() {
    const bansData = loadData(BANS_FILE);
    for (const [userId, unbanTimeStr] of Object.entries(bansData)) {
        const unbanTime = DateTime.fromISO(unbanTimeStr);
        const now = DateTime.local();
        if (unbanTime > now) {
            const delay = unbanTime.diff(now).toMillis();
            setTimeout(delay, () => unbanUser(userId));
        }
    }
}

async function unbanUser(userId) {
    const guild = client.guilds.cache.get(GUILD_ID);
    const user = await client.users.fetch(userId);
    await guild.members.unban(user);
    const bansData = loadData(BANS_FILE);
    delete bansData[userId];
    saveData(BANS_FILE, bansData);
}

client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    const { commandName } = interaction;

    if (commandName === 'roleadd') {
        const { options } = interaction;
        const member = options.getMember('member');
        const role = options.getRole('role');

        if (interaction.member.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
            await member.roles.add(role);
            const rolesData = loadData(ROLES_FILE);
            if (!rolesData[member.id]) {
                rolesData[member.id] = [];
            }
            if (!rolesData[member.id].includes(role.id)) {
                rolesData[member.id].push(role.id);
            }
            saveData(ROLES_FILE, rolesData);
            await interaction.reply(`Role ${role.name} added to ${member}`);
        } else {
            await interaction.reply({ content: "You don't have permission to use this command.", ephemeral: true });
        }
    } else if (commandName === 'ban') {
        const { options } = interaction;
        const member = options.getMember('member');
        const duration = options.getString('duration');
        const reason = options.getString('reason') || "No reason provided";

        if (interaction.member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
            await member.send(`You have been banned for: ${duration} because of ${reason}\n-# To appeal, click [here](<https://example.com>)`);
            await member.ban({ reason });
            await interaction.reply(`${member} has been banned for: ${reason} (${duration})`);

            if (duration !== "Permanent") {
                const now = DateTime.local();
                let unbanTime;
                if (duration === "1d") {
                    unbanTime = now.plus({ days: 1 });
                } else if (duration === "7d") {
                    unbanTime = now.plus({ days: 7 });
                } else if (duration === "14d") {
                    unbanTime = now.plus({ days: 14 });
                }
                const bansData = loadData(BANS_FILE);
                bansData[member.id] = unbanTime.toISO();
                saveData(BANS_FILE, bansData);
                const delay = unbanTime.diff(now).toMillis();
                setTimeout(delay, () => unbanUser(member.id));
            }
        } else {
            await interaction.reply({ content: "You don't have permission to use this command.", ephemeral: true });
        }
    } else if (commandName === 'kick') {
        const { options } = interaction;
        const member = options.getMember('member');
        const reason = options.getString('reason') || "No reason provided";

        if (interaction.member.permissions.has(PermissionsBitField.Flags.KickMembers)) {
            await member.kick(reason);
            await interaction.reply(`${member} has been kicked for: ${reason}`);
        } else {
            await interaction.reply({ content: "You don't have permission to use this command.", ephemeral: true });
        }
    } else if (commandName === 'warn') {
        const { options } = interaction;
        const member = options.getMember('member');
        const reason = options.getString('reason');

        if (interaction.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
            const currentTimestamp = Math.floor(Date.now() / 1000);
            const warningsData = loadData(WARNINGS_FILE);
            if (!warningsData[member.id]) {
                warningsData[member.id] = [];
            }
            warningsData[member.id].push(`${reason} | <t:${currentTimestamp}:R>`);
            saveData(WARNINGS_FILE, warningsData);

            try {
                await member.send(`You have been warned for: ${reason}`);
                await interaction.reply(`${member} has been warned for: ${reason}`);
            } catch (error) {
                await interaction.reply({ content: `Could not send a DM to ${member}.`, ephemeral: true });
            }
        } else {
            await interaction.reply({ content: "You don't have permission to use this command.", ephemeral: true });
        }
    } else if (commandName === 'warns') {
        const { options } = interaction;
        const member = options.getMember('member');
        const warningsData = loadData(WARNINGS_FILE);
        const userWarnings = warningsData[member.id] || [];

        if (userWarnings.length === 0) {
            await interaction.reply({ content: `${member.displayName} has no warnings.`, ephemeral: true });
            return;
        }

        const embed = new EmbedBuilder()
            .setTitle(`Warnings for ${member.displayName}`)
            .setColor('DARK_RED');

        userWarnings.forEach((warning, index) => {
            const [reason, timestamp] = warning.split(' | ');
            embed.addFields({ name: `Warning ${index + 1}`, value: `**Reason:** ${reason}\n**Timestamp:** ${timestamp}`, inline: false });
        });

        await interaction.reply({ embeds: [embed] });
    } else if (commandName === 'delwarn') {
        const { options } = interaction;
        const member = options.getMember('member');
        const warningIndex = options.getInteger('warning_index');

        if (interaction.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
            const warningsData = loadData(WARNINGS_FILE);
            const userWarnings = warningsData[member.id] || [];

            if (userWarnings.length === 0) {
                await interaction.reply({ content: `${member.displayName} has no warnings.`, ephemeral: true });
                return;
            }

            if (warningIndex <= 0 || warningIndex > userWarnings.length) {
                await interaction.reply({ content: `Invalid warning index. Please provide a number between 1 and ${userWarnings.length}.`, ephemeral: true });
                return;
            }

            const removedWarning = userWarnings.splice(warningIndex - 1, 1)[0];
            saveData(WARNINGS_FILE, warningsData);

            await interaction.reply(`Removed warning ${warningIndex} from ${member}: ${removedWarning}`);
        } else {
            await interaction.reply({ content: "You don't have permission to use this command.", ephemeral: true });
        }
    } else if (commandName === 'purge') {
        const { options } = interaction;
        const numberOfMessages = options.getInteger('number_of_messages');

        if (interaction.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
            if (numberOfMessages <= 0) {
                await interaction.reply({ content: "Please specify a positive number of messages to delete.", ephemeral: true });
                return;
            }

            await interaction.deferReply({ ephemeral: false });

            const messages = await interaction.channel.messages.fetch({ limit: numberOfMessages + 1 });
            const deletedMessages = await interaction.channel.bulkDelete(messages);

            await interaction.channel.send(`:white_check_mark: | ${deletedMessages.size - 1} messages have been deleted.`);
        } else {
            await interaction.reply({ content: "You don't have permission to use this command.", ephemeral: true });
        }
    } else if (commandName === 'mute') {
        const { options } = interaction;
        const member = options.getMember('member');
        const reason = options.getString('reason') || "No reason provided";
        const days = options.getInteger('days') || 0;
        const hours = options.getInteger('hours') || 0;
        const minutes = options.getInteger('minutes') || 0;

        if (interaction.member.permissions.has(PermissionsBitField.Flags.MuteMembers)) {
            if (days < 0 || hours < 0 || minutes < 0) {
                await interaction.reply({ content: "Duration values cannot be negative.", ephemeral: true });
                return;
            }

            let totalDuration = DateTime.local().plus({ days, hours, minutes });
            if (totalDuration.diff(DateTime.local()).as('minutes') < 5) {
                await interaction.reply({ content: "Minimum mute duration is 5 minutes.", ephemeral: true });
                return;
            } else if (totalDuration.diff(DateTime.local()).as('days') > 30) {
                await interaction.reply({ content: "Maximum mute duration is 30 days.", ephemeral: true });
                return;
            }

            await member.timeout(totalDuration.toMillis(), reason);
            await interaction.reply(`${member} has been muted for: ${reason} (Duration: \`${totalDuration.toRelative()}\`)`);

            const mutesData = loadData(MUTES_FILE);
            mutesData[member.id] = totalDuration.toISO();
            saveData(MUTES_FILE, mutesData);
        } else {
            await interaction.reply({ content: "You don't have permission to use this command.", ephemeral: true });
        }
    } else if (commandName === 'note') {
        const { options } = interaction;
        const member = options.getMember('member');
        const note = options.getString('note');

        if (interaction.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
            const notesData = loadData(NOTES_FILE);
            if (!notesData[member.id]) {
                notesData[member.id] = [];
            }
            const formattedNote = `${note} - ${interaction.user.tag}`;
            notesData[member.id].push(formattedNote);
            saveData(NOTES_FILE, notesData);
            await interaction.reply(`Note added to ${member}`);
        } else {
            await interaction.reply({ content: "You don't have permission to use this command.", ephemeral: true });
        }
    } else if (commandName === 'notes') {
        const { options } = interaction;
        const member = options.getMember('member');
        const notesData = loadData(NOTES_FILE);
        const userNotes = notesData[member.id] || [];

        if (userNotes.length === 0) {
            await interaction.reply({ content: `${member.displayName} has no notes.`, ephemeral: true });
            return;
        }

        const embed = new EmbedBuilder()
            .setTitle(`Notes for ${member.displayName}`)
            .setColor('DARK_RED');

        userNotes.forEach((note, index) => {
            embed.addFields({ name: `Note ${index + 1}`, value: note, inline: false });
        });

        await interaction.reply({ embeds: [embed] });
    } else if (commandName === 'whois') {
        const { options } = interaction;
        const member = options.getMember('member');

        if (interaction.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
            const nickname = member.displayName;
            const username = member.user.username;
            const user_id = member.id;
            const roles = member.roles.cache.filter(role => role.id !== interaction.guild.id).map(role => role.toString()).join(", ");

            const warningsData = loadData(WARNINGS_FILE);
            const userWarnings = warningsData[member.id] || [];

            const notesData = loadData(NOTES_FILE);
            const userNotes = notesData[member.id] || [];

            const discordJoinDate = member.user.createdAt.toLocaleDateString();
            const serverJoinDate = member.joinedAt.toLocaleDateString();

            const embed = new EmbedBuilder()
                .setTitle(`Information for ${nickname}`)
                .setColor('DARK_RED')
                .addFields(
                    { name: 'Username', value: `**${nickname}** \`(@${username})\``, inline: false },
                    { name: 'User ID', value: `\`\`\`${user_id}\`\`\``, inline: false },
                    { name: 'Roles', value: roles || 'No roles', inline: false },
                    { name: 'Warnings', value: userWarnings.length ? userWarnings.join("\n") : 'No warnings', inline: false },
                    { name: 'Notes', value: userNotes.length ? userNotes.join("\n") : 'No notes', inline: false },
                    { name: 'Discord Join Date', value: discordJoinDate, inline: true },
                    { name: 'Server Join Date', value: serverJoinDate, inline: true }
                );

            await interaction.reply({ embeds: [embed] });
        } else {
            await interaction.reply({ content: "You don't have permission to use this command.", ephemeral: true });
        }
    } else if (commandName === 'membercount') {
        const guild = interaction.guild;
        if (guild) {
            const totalMembers = guild.memberCount;
            const embed = new EmbedBuilder()
                .setTitle('Member Count')
                .setDescription(`**${totalMembers}**`)
                .setColor('DARK_RED');
            await interaction.reply({ embeds: [embed] });
        } else {
            await interaction.reply({ content: "Could not retrieve the member count.", ephemeral: true });
        }
    } else if (commandName === 'serverstatus') {
        if (interaction.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
            const recentErrors = logCapture.filter(log => log.includes('ERROR')).slice(-100);
            const recentWarnings = logCapture.filter(log => log.includes('WARNING')).slice(-100);

            let status = "🟢 All systems operational";
            if (recentErrors.length) {
                status = "🔴 There are recent errors";
            } else if (recentWarnings.length) {
                status = "🟠 There are recent warnings";
            }

            const embed = new EmbedBuilder()
                .setTitle('Server Status')
                .setColor(status === "🟢 All systems operational" ? 'GREEN' : status === "🔴 There are recent errors" ? 'RED' : 'ORANGE')
                .addFields({ name: 'Status', value: status, inline: false });

            if (recentWarnings.length) {
                embed.addFields({ name: 'Recent Warnings', value: recentWarnings.slice(-5).join("\n"), inline: false });
            }

            await interaction.reply({ embeds: [embed] });
        } else {
            await interaction.reply({ content: "You don't have permission to use this command.", ephemeral: true });
        }
    }
});

client.on('messageCreate', async message => {
    if (message.author.bot) return;

    if (bannedWordPatterns.some(pattern => pattern.test(message.content))) {
        try {
            await message.delete();
            await message.channel.send(`${message.author}, your message contained banned words and has been deleted.`);
        } catch (error) {
            logging.error(`Could not delete message in ${message.channel.name} by ${message.author.tag}.`);
        }
    }
});

client.on('messageReactionAdd', async (reaction, user) => {
    if (reaction.emoji.name === STAR_EMOJI) {
        const message = reaction.message;
        if (!starredMessages.has(message.id)) {
            const starboardChannel = client.channels.cache.get(STARBOARD_CHANNEL_ID);
            if (reaction.count >= 3) {
                starredMessages.add(message.id);

                const embed = new EmbedBuilder()
                    .setDescription(message.content)
                    .setColor('GOLD')
                    .setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL() })
                    .addFields({ name: 'Jump to message', value: `[Click here](${message.url})`, inline: false });

                if (message.attachments.size > 0) {
                    const imageAttachments = message.attachments.filter(attachment => ['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(path.extname(attachment.url).slice(1)));
                    if (imageAttachments.size > 0) {
                        embed.setImage(imageAttachments.first().url);
                    } else {
                        await starboardChannel.send({ embeds: [embed] });
                        for (const attachment of message.attachments.values()) {
                            await starboardChannel.send(attachment.url);
                        }
                    }
                } else {
                    await starboardChannel.send({ embeds: [embed] });
                }
            }
        }
    }
});

client.on('guildMemberAdd', async member => {
    const welcomeChannel = client.channels.cache.get(WELCOME_CHANNEL_ID);

    if (welcomeChannel) {
        const embed = new EmbedBuilder()
            .setTitle(`Welcome to the server, \`${member.user.username}\`!`)
            .setDescription(`We are glad to have you here, ${member}. Enjoy your stay!`)
            .setColor('DARK_RED')
            .setFooter({ text: `Joined on ${member.joinedAt.toLocaleDateString()}` });

        if (member.user.avatar) {
            embed.setThumbnail(member.user.displayAvatarURL());
        } else {
            embed.setThumbnail(member.user.defaultAvatarURL);
        }

        await welcomeChannel.send({ embeds: [embed] });
    } else {
        logging.error("Welcome channel not found. Make sure the channel ID is correct.");
    }
});

client.login(process.env.DISCORD_TOKEN);
