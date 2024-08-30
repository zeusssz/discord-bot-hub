const { Client, GatewayIntentBits, Events, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const ytdl = require('ytdl-core');
const ffmpeg = require('fluent-ffmpeg');
const { config } = require('dotenv');

config();

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
});

const allowedRoleId = '0'; // Replace with your role ID
const boosterRoleId = '0'; // Replace with your role ID

class MusicPlayer {
    constructor() {
        this.queue = [];
        this.current = null;
    }

    async playNext(voiceConnection) {
        if (this.queue.length > 0) {
            this.current = this.queue.shift();
            voiceConnection.play(this.current.stream, { type: 'opus' })
                .on('finish', () => this.playNext(voiceConnection))
                .on('error', (error) => console.error('Player error:', error));
            return true;
        }
        return false;
    }
}

const musicPlayer = new MusicPlayer();

client.once(Events.ClientReady, () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isCommand()) return;

    const { commandName } = interaction;

    if (!hasAllowedRole(interaction)) {
        await interaction.reply({ content: "You do not have permission to use this command.", ephemeral: true });
        return;
    }

    if (commandName === 'join') {
        if (!interaction.member.voice.channel) {
            await interaction.reply({ content: "You need to be in a voice channel.", ephemeral: true });
            return;
        }

        const channel = interaction.member.voice.channel;
        try {
            await channel.join();
            await interaction.reply({ content: `Joined ${channel.name}` });
        } catch (error) {
            await interaction.reply({ content: `An error occurred: ${error.message}`, ephemeral: true });
        }
    } else if (commandName === 'leave') {
        const voiceConnection = interaction.guild.voiceAdapterCreator;
        if (voiceConnection) {
            voiceConnection.disconnect();
            await interaction.reply({ content: "Disconnected from the voice channel" });
        } else {
            await interaction.reply({ content: "The bot is not connected to a voice channel.", ephemeral: true });
        }
    } else if (commandName === 'play') {
        const url = interaction.options.getString('url');
        if (!interaction.member.voice.channel) {
            await interaction.reply({ content: "You need to be in a voice channel.", ephemeral: true });
            return;
        }

        const voiceConnection = interaction.guild.voiceAdapterCreator;
        if (!voiceConnection) {
            await interaction.reply({ content: "Bot is not in a voice channel.", ephemeral: true });
            return;
        }

        try {
            const stream = ytdl(url, { filter: 'audioonly' });
            const dispatcher = voiceConnection.play(stream, { type: 'opus' });
            dispatcher.on('finish', () => musicPlayer.playNext(voiceConnection));
            musicPlayer.queue.push({ stream, title: url });
            if (!voiceConnection.dispatcher) {
                await musicPlayer.playNext(voiceConnection);
                await interaction.reply({ content: `**Now playing:** \`${url}\`` });
            } else {
                const queuePosition = musicPlayer.queue.length;
                await interaction.reply({ content: `Added \`${url}\` to the queue. Currently at queue position ${queuePosition}` });
            }
        } catch (error) {
            await interaction.reply({ content: `An error occurred: ${error.message}`, ephemeral: true });
        }
    } else if (commandName === 'pause') {
        const voiceConnection = interaction.guild.voiceAdapterCreator;
        if (voiceConnection && voiceConnection.dispatcher) {
            voiceConnection.dispatcher.pause();
            await interaction.reply({ content: "Paused the song" });
        } else {
            await interaction.reply({ content: "Currently no audio is playing.", ephemeral: true });
        }
    } else if (commandName === 'resume') {
        const voiceConnection = interaction.guild.voiceAdapterCreator;
        if (voiceConnection && voiceConnection.dispatcher) {
            voiceConnection.dispatcher.resume();
            await interaction.reply({ content: "Resumed the song" });
        } else {
            await interaction.reply({ content: "The audio is not paused.", ephemeral: true });
        }
    } else if (commandName === 'stop') {
        const voiceConnection = interaction.guild.voiceAdapterCreator;
        if (voiceConnection && voiceConnection.dispatcher) {
            voiceConnection.dispatcher.stop();
            await interaction.reply({ content: "Stopped the song" });
        } else {
            await interaction.reply({ content: "Currently no audio is playing.", ephemeral: true });
        }
    } else if (commandName === 'current') {
        if (!musicPlayer.current) {
            await interaction.reply({ content: "No song is currently playing.", ephemeral: true });
            return;
        }

        const embed = new EmbedBuilder()
            .setTitle("Currently Playing")
            .setDescription(musicPlayer.current.title)
            .setColor('#808000');

        await interaction.reply({ embeds: [embed] });
    } else if (commandName === 'queue') {
        const queue = musicPlayer.queue;
        if (queue.length === 0) {
            await interaction.reply({ content: "The queue is currently empty.", ephemeral: true });
            return;
        }

        const embed = new EmbedBuilder()
            .setTitle("Song Queue")
            .setDescription("List of songs in the queue")
            .setColor('#808000');

        if (musicPlayer.current) {
            embed.addFields({ name: "**Currently Playing**", value: musicPlayer.current.title, inline: false });
        }

        queue.forEach((song, index) => {
            embed.addFields({ name: `#${index + 1}`, value: song.title, inline: false });
        });

        await interaction.reply({ embeds: [embed] });
    } else if (commandName === 'skip') {
        const count = interaction.options.getInteger('count') || 1;
        const voiceConnection = interaction.guild.voiceAdapterCreator;
        if (voiceConnection && voiceConnection.dispatcher) {
            for (let i = 0; i < count; i++) {
                voiceConnection.dispatcher.stop();
                await new Promise(res => setTimeout(res, 1000));
            }
            await interaction.reply({ content: `Skipped ${count} song${count > 1 ? 's' : ''}` });
        } else {
            await interaction.reply({ content: "Currently no audio is playing.", ephemeral: true });
        }
    }
});

function hasAllowedRole(interaction) {
    return interaction.member.roles.cache.some(role => role.id === allowedRoleId || role.id === boosterRoleId);
}

client.login(process.env.MUSIC_TOKEN);
