import discord
from discord.app_commands import CommandTree
import yt_dlp as youtube_dl
import asyncio
import logging
import os
from discord.ui import Button, View
import math
from dotenv import load_dotenv
from spotipy import Spotify # soon
from spotipy.oauth2 import SpotifyClientCredentials

load_dotenv()

spotify = Spotify(client_credentials_manager=SpotifyClientCredentials(
    client_id=os.getenv('SPOTIFY-CLIENT-ID'),
    client_secret=os.getenv('SPOTIFY-CLIENT-SECRET')
))

logging.basicConfig(level=logging.INFO)

intents = discord.Intents.default()
intents.voice_states = True 

activity = discord.Activity(type=discord.ActivityType.listening, name="Lorem Ipsum")
client = discord.Client(intents=intents, activity=activity)
tree = CommandTree(client)

allowed_role_id = 1 # input your role id
booster_role_id = 1 # input your role id

class QueueView(View):
    def __init__(self, songs, current_song, user):
        super().__init__(timeout=60.0)
        self.songs = songs
        self.current_song = current_song
        self.user = user
        self.items_per_page = 10
        self.total_pages = math.ceil(len(songs) / self.items_per_page)
        self.current_page = 0

        self.prev_button = Button(label="⏮️", style=discord.ButtonStyle.success)
        self.next_button = Button(label="⏭️", style=discord.ButtonStyle.success)

        self.prev_button.callback = self.prev_page
        self.next_button.callback = self.next_page

        self.update_buttons()

    def update_buttons(self):
        self.clear_items()
        if self.current_page > 0:
            self.add_item(self.prev_button)
        if self.current_page < self.total_pages - 1:
            self.add_item(self.next_button)

    async def update_embed(self, interaction):
        embed = self.generate_embed(self.current_page)
        await interaction.response.edit_message(embed=embed, view=self)

    def generate_embed(self, page):
        embed = discord.Embed(title="Song Queue", description="List of songs in the queue", color=0x808000)
        start = page * self.items_per_page
        end = start + self.items_per_page
        page_songs = self.songs[start:end]

        if self.current_song and page == 0:
            embed.add_field(name="**Currently Playing**", value=self.current_song.title, inline=False)

        for i, song in enumerate(page_songs, start=start + 1):
            embed.add_field(name=f"#{i}", value=song.title, inline=False)

        embed.set_footer(text=f"Page {page + 1}/{self.total_pages}")
        return embed

    async def prev_page(self, interaction: discord.Interaction):
        if interaction.user != self.user:
            await interaction.response.send_message("You are not allowed to use these buttons.", ephemeral=True)
            return
        if self.current_page > 0:
            self.current_page -= 1
            self.update_buttons()
            await self.update_embed(interaction)

    async def next_page(self, interaction: discord.Interaction):
        if interaction.user != self.user:
            await interaction.response.send_message("You are not allowed to use these buttons.", ephemeral=True)
            return
        if self.current_page < self.total_pages - 1:
            self.current_page += 1
            self.update_buttons()
            await self.update_embed(interaction)

ytdl_format_options = {
    'format': 'bestaudio/best',
    'outtmpl': '%(extractor)s-%(id)s-%(title)s.%(ext)s',
    'restrictfilenames': True,
    'noplaylist': True, 
    'nocheckcertificate': True,
    'ignoreerrors': False,
    'logtostderr': False,
    'quiet': True,
    'no_warnings': True,
    'default_search': 'auto',
    'source_address': '0.0.0.0'
}

ffmpeg_options = {
    'options': '-vn',
    'executable': 'ffmpeg'
}

ytdl = youtube_dl.YoutubeDL(ytdl_format_options)

class YTDLSource(discord.PCMVolumeTransformer):
    def __init__(self, source, *, data, volume=0.5):
        super().__init__(source, volume)
        self.data = data
        self.title = data.get('title')
        self.url = data.get('url')

    @classmethod
    async def from_url(cls, url, *, loop=None, stream=False):
        loop = loop or asyncio.get_event_loop()
        data = await loop.run_in_executor(None, lambda: ytdl.extract_info(url, download=not stream))

        if 'entries' in data:
            entries = data['entries']
            playlist = []
            for entry in entries:
                filename = entry['url'] if stream else ytdl.prepare_filename(entry)
                playlist.append(cls(discord.FFmpegPCMAudio(filename, **ffmpeg_options), data=entry))
            return playlist
        else:
            filename = data['url'] if stream else ytdl.prepare_filename(data)
            return [cls(discord.FFmpegPCMAudio(filename, **ffmpeg_options), data=data)]

def has_allowed_role(interaction, playlist=False):
    if playlist:
        return discord.utils.get(interaction.user.roles, id=booster_role_id) is not None
    else:
        return discord.utils.get(interaction.user.roles, id=allowed_role_id) is not None

class MusicPlayer:
    def __init__(self):
        self.queue = asyncio.Queue()
        self.current = None

    async def play_next(self, voice_client):
        if not self.queue.empty():
            self.current = await self.queue.get()
            voice_client.play(self.current, after=lambda e: self.play_next_after(e, voice_client))
            return True
        return False

    def play_next_after(self, error, voice_client):
        if error:
            logging.error(f'Player error: {error}')
        asyncio.run_coroutine_threadsafe(self.play_next(voice_client), client.loop)

music_player = MusicPlayer()

@client.event
async def on_ready():
    await tree.sync()
    logging.info(f'Logged in as {client.user}!')

@tree.command(name="join", description="Tells the bot to join the voice channel")
async def join(interaction: discord.Interaction):
    if not has_allowed_role(interaction):
        await interaction.response.send_message("You do not have permission to use this command.", ephemeral=True)
        return

    if not interaction.user.voice:
        await interaction.response.send_message(f"{interaction.user.name} is not connected to a voice channel", ephemeral=True)
        return

    channel = interaction.user.voice.channel
    try:
        await channel.connect()
        await interaction.response.send_message(f"Joined {channel}")
    except discord.ClientException as e:
        await interaction.response.send_message(f"An error occurred: {str(e)}", ephemeral=True)
    except discord.opus.OpusNotLoaded as e:
        await interaction.response.send_message("Opus library is not loaded", ephemeral=True)
    except Exception as e:
        await interaction.response.send_message(f"An error occurred: {str(e)}", ephemeral=True)

@tree.command(name="leave", description="To make the bot leave the voice channel")
async def leave(interaction: discord.Interaction):
    if not has_allowed_role(interaction):
        await interaction.response.send_message("You do not have permission to use this command.", ephemeral=True)
        return

    voice_client = interaction.guild.voice_client
    if voice_client and voice_client.is_connected():
        await voice_client.disconnect()
        await interaction.response.send_message("Disconnected from the voice channel")
    else:
        await interaction.response.send_message("The bot is not connected to a voice channel.", ephemeral=True)

@tree.command(name="play", description="Play a song or playlist from a YouTube or Spotify URL")
async def play(interaction: discord.Interaction, url: str):
    if not has_allowed_role(interaction):
        await interaction.response.send_message("You do not have permission to use this command.", ephemeral=True)
        return

    if not interaction.user.voice:
        await interaction.response.send_message("You are not connected to a voice channel.", ephemeral=True)
        return

    voice_client = interaction.guild.voice_client
    if not voice_client:
        await interaction.response.send_message("Bot is not in a voice channel.", ephemeral=True)
        return

    await interaction.response.defer(ephemeral=False)

    playlist = []

    try:
        if "spotify.com" in url:
            # Spotify playlist URL handling
            results = spotify.search(q=url, type="track", limit=10)
            for track in results['tracks']['items']:
                playlist.append(track['external_urls']['spotify'])
        else:
            playlist = await YTDLSource.from_url(url, stream=True)
        
        if playlist:
            for track in playlist:
                await music_player.queue.put(track)

            if not voice_client.is_playing():
                await music_player.play_next(voice_client)

            await interaction.followup.send(f"Added to queue: {', '.join([track.title for track in playlist])}")
        else:
            await interaction.followup.send("No results found.")

    except Exception as e:
        await interaction.followup.send(f"An error occurred: {str(e)}")

@tree.command(name="queue", description="Displays the current song queue")
async def queue(interaction: discord.Interaction):
    if not has_allowed_role(interaction, playlist=True):
        await interaction.response.send_message("You do not have permission to use this command.", ephemeral=True)
        return

    if music_player.queue.empty():
        await interaction.response.send_message("The queue is currently empty.", ephemeral=True)
        return

    songs = list(music_player.queue.queue)
    current_song = music_player.current.data if music_player.current else None
    view = QueueView(songs, current_song, interaction.user)
    
    embed = view.generate_embed(view.current_page)
    message = await interaction.response.send_message(embed=embed, view=view)
    view.message = message

client.run(os.getenv('MUSIC-TOKEN'))
