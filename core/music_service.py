"""
Music and Entertainment Player Service for NOVA AI Assistant.
Powers 'Nova, play my favourite songs!', ambient playlists, track controls, and browser audio stream integration.
"""

import random
from typing import Dict, Any, List, Optional

FAVOURITE_TRACKS = [
    {
        "id": "track-1",
        "title": "Midnight Chill Lofi Beats",
        "artist": "Nova Sonic Vibes",
        "album": "Deep Work & Focus Vol. 1",
        "genre": "Lofi / Chillout",
        "duration": "3:24",
        "audio_url": "https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3",
        "cover_art": "https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=400&auto=format&fit=crop&q=80"
    },
    {
        "id": "track-2",
        "title": "Starlight Synthetics",
        "artist": "Aura Frequency",
        "album": "Cyber Dreams",
        "genre": "Ambient Electronic",
        "duration": "2:50",
        "audio_url": "https://cdn.pixabay.com/download/audio/2022/03/15/audio_c8c8a73467.mp3",
        "cover_art": "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=400&auto=format&fit=crop&q=80"
    },
    {
        "id": "track-3",
        "title": "Acoustic Horizon Glow",
        "artist": "Luna Strings",
        "album": "Morning Acoustic Sessions",
        "genre": "Acoustic / Warm",
        "duration": "3:12",
        "audio_url": "https://cdn.pixabay.com/download/audio/2022/10/14/audio_9939f77cd0.mp3",
        "cover_art": "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&auto=format&fit=crop&q=80"
    },
    {
        "id": "track-4",
        "title": "Cosmic Rain & Coffee",
        "artist": "Echo Drift",
        "album": "Rainy Days Study",
        "genre": "Lofi Study",
        "duration": "3:45",
        "audio_url": "https://cdn.pixabay.com/download/audio/2022/01/18/audio_d0a13f69d2.mp3",
        "cover_art": "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&auto=format&fit=crop&q=80"
    }
]

class MusicService:
    def __init__(self):
        self.tracks = FAVOURITE_TRACKS
        self.current_index = 0
        self.is_playing = False

    def play_favourite_songs(self) -> Dict[str, Any]:
        """Starts playback of the user's favourite songs playlist."""
        self.is_playing = True
        track = self.tracks[self.current_index]
        return {
            "status": "playing",
            "message": f"Playing your favourite track: '{track['title']}' by {track['artist']}.",
            "track": track,
            "playlist": self.tracks,
            "current_index": self.current_index
        }

    def next_track(self) -> Dict[str, Any]:
        self.current_index = (self.current_index + 1) % len(self.tracks)
        return self.play_favourite_songs()

    def previous_track(self) -> Dict[str, Any]:
        self.current_index = (self.current_index - 1 + len(self.tracks)) % len(self.tracks)
        return self.play_favourite_songs()

    def pause_music(self) -> Dict[str, Any]:
        self.is_playing = False
        track = self.tracks[self.current_index]
        return {
            "status": "paused",
            "message": f"Paused '{track['title']}'.",
            "track": track
        }

    def get_current_track(self) -> Dict[str, Any]:
        return self.tracks[self.current_index]

    def pause(self) -> Dict[str, Any]:
        return self.pause_music()

    def prev_track(self) -> Dict[str, Any]:
        return self.previous_track()

    def get_player_state(self) -> Dict[str, Any]:
        return {
            "is_playing": self.is_playing,
            "current_track": self.tracks[self.current_index],
            "playlist": self.tracks
        }

music_service = MusicService()
