const { Client, GatewayIntentBits, Events, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, ActivityType } = require('discord.js');
const ytdl = require('ytdl-core');
const { config } = require('dotenv');
const SpotifyWebApi = require('spotify-web-api-node');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, VoiceConnectionStatus, AudioPlayerStatus } = require('@discordjs/voice');

config();

const spotifyApi = new SpotifyWebApi({
    clientId: process.env['SPOTIFY-CLIENT-ID'],
    clientSecret: process.env['SPOTIFY-CLIENT-SECRET']
});

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ],
    presence: {
        activities: [{ name: 'Lorem Ipsum', type: ActivityType.Listening }]
    }
});

const allowedRoleId = '0'; // Replace with your role ID
const boosterRoleId = '0'; // Replace with your role ID

const musicQueue = {
    queue: [],
    current: null,
    player: createAudioPlayer()
};

client.once(Events.ClientReady, async () => {
    console.log(`Logged in as ${client.user.tag}!`);
    try {
        await spotifyApi.clientCredentialsGrant().then(
            data => spotifyApi.setAccessToken(data.body['access_token']),
            err => console.log('Error retrieving Spotify access token', err)
        );
    } catch (error) {
        console.error('Spotify API authentication failed', error);
    }
});

client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isCommand()) return;

    const { commandName } = interaction;

    if (!hasAllowedRole(interaction)) {
        await interaction.reply({ content: "You do not have permission to use this command.", ephemeral: true });
        return;
    }

    switch (commandName) {
        case 'join':
            await joinCommand(interaction);
            break;
        case 'leave':
            await leaveCommand(interaction);
            break;
        case 'play':
            await playCommand(interaction);
            break;
        case 'queue':
            await queueCommand(interaction);
            break;
        default:
            await interaction.reply({ content: "Unknown command.", ephemeral: true });
            break;
    }
});

async function joinCommand(interaction) {
    const channel = interaction.member.voice.channel;
    if (!channel) {
        await interaction.reply({ content: "You need to be in a voice channel.", ephemeral: true });
        return;
    }
    try {
        joinVoiceChannel({
            channelId: channel.id,
            guildId: channel.guild.id,
            adapterCreator: channel.guild.voiceAdapterCreator
        });
        await interaction.reply({ content: `Joined ${channel.name}` });
    } catch (error) {
        await interaction.reply({ content: `An error occurred: ${error.message}`, ephemeral: true });
    }
}

async function leaveCommand(interaction) {
    const connection = getVoiceConnection(interaction.guild.id);
    if (connection) {
        connection.destroy();
        await interaction.reply({ content: "Disconnected from the voice channel" });
    } else {
        await interaction.reply({ content: "The bot is not connected to a voice channel.", ephemeral: true });
    }
}

async function playCommand(interaction) {
    const url = interaction.options.getString('url');
    const channel = interaction.member.voice.channel;
    if (!channel) {
        await interaction.reply({ content: "You need to be in a voice channel.", ephemeral: true });
        return;
    }

    const connection = joinVoiceChannel({
        channelId: channel.id,
        guildId: channel.guild.id,
        adapterCreator: channel.guild.voiceAdapterCreator
    });

    try {
        if (url.includes('spotify.com')) {
            const results = await spotifyApi.searchTracks(url);
            results.body.tracks.items.forEach(track => musicQueue.queue.push(track.external_urls.spotify));
        } else {
            const stream = ytdl(url, { filter: 'audioonly' });
            const resource = createAudioResource(stream);
            musicQueue.queue.push(resource);
        }

        if (!musicQueue.player.state.status === AudioPlayerStatus.Playing) {
            playNext(connection);
        }

        await interaction.reply({ content: `Added to queue: ${url}` });
    } catch (error) {
        await interaction.reply({ content: `An error occurred: ${error.message}`, ephemeral: true });
    }
}

async function queueCommand(interaction) {
    if (musicQueue.queue.length === 0) {
        await interaction.reply({ content: "The queue is currently empty.", ephemeral: true });
        return;
    }

    const embed = new EmbedBuilder()
        .setTitle("Song Queue")
        .setDescription(musicQueue.queue.map((item, index) => `${index + 1}. ${item.title}`).join('\n'))
        .setColor('#808000');

    await interaction.reply({ embeds: [embed] });
}

function playNext(connection) {
    if (musicQueue.queue.length === 0) return;

    const nextTrack = musicQueue.queue.shift();
    const resource = createAudioResource(nextTrack);
    musicQueue.current = nextTrack;
    musicQueue.player.play(resource);
    connection.subscribe(musicQueue.player);
}

function hasAllowedRole(interaction) {
    return interaction.member.roles.cache.some(role => [allowedRoleId, boosterRoleId].includes(role.id));
}

client.login(process.env.MUSIC_TOKEN);
