"""
Nova Gaming Arcade Service.
Provides instant playable games, game intent recognition, trivia databases,
and turn-based game logic for the NOVA AI Assistant.
"""

import re
import random
import logging
from typing import Dict, Any, List, Optional, Tuple

logger = logging.getLogger(__name__)

GAMES_CATALOG = [
    {
        "id": "snake",
        "title": "Cyber Snake Arcade",
        "icon": "🐍",
        "genre": "Retro Arcade",
        "description": "Navigate the cyber grid, eat energy orbs, and grow without crashing into walls or your tail.",
        "controls": "Arrow Keys / WASD or On-Screen D-Pad",
        "difficulty": "Easy to Fast",
        "badge": "Popular"
    },
    {
        "id": "tictactoe",
        "title": "Nova AI Tic-Tac-Toe",
        "icon": "❌⭕",
        "genre": "Strategy",
        "description": "Challenge Nova AI to a classic 3x3 battle of wits. Choose your difficulty from Novice to Master.",
        "controls": "Click or Tap Grid",
        "difficulty": "Adaptive AI",
        "badge": "Vs Nova"
    },
    {
        "id": "trivia",
        "title": "Nova Trivia Challenge",
        "icon": "🧠",
        "genre": "Quiz & Brain",
        "description": "Test your knowledge in Tech, Science, Space, Gaming, and Pop Culture with live score streaks.",
        "controls": "Choose Option A, B, C, or D",
        "difficulty": "Multi-Topic",
        "badge": "Knowledge"
    },
    {
        "id": "space",
        "title": "Cosmic Asteroid Dodge",
        "icon": "🚀",
        "genre": "Action Arcade",
        "description": "Pilot your spaceship through hazardous asteroid fields, shoot space debris, and beat high scores.",
        "controls": "Left/Right Keys to Move, Space to Fire Laser",
        "difficulty": "Action",
        "badge": "60 FPS"
    }
]

TRIVIA_QUESTIONS = [
    {
        "question": "What does 'HTTP' stand for in computer networking?",
        "options": ["HyperText Transfer Protocol", "High Transfer Text Program", "Hyperlink Text Transmission Plan", "Host Terminal Telephony Protocol"],
        "correct": 0,
        "category": "Technology",
        "explanation": "HTTP stands for HyperText Transfer Protocol, the foundation of data communication on the World Wide Web."
    },
    {
        "question": "Which planet in our solar system has the most moons?",
        "options": ["Jupiter", "Saturn", "Mars", "Neptune"],
        "correct": 1,
        "category": "Space & Science",
        "explanation": "Saturn holds the official lead with over 140 confirmed natural satellites!"
    },
    {
        "question": "Who is credited with creating the world's first computer algorithm?",
        "options": ["Alan Turing", "Ada Lovelace", "Charles Babbage", "Grace Hopper"],
        "correct": 1,
        "category": "History of Tech",
        "explanation": "Ada Lovelace wrote the first machine algorithm for Babbage's Analytical Engine in the 1840s."
    },
    {
        "question": "What is the primary programming language used to develop FastAPI and PyTorch?",
        "options": ["Java", "Python", "Rust", "C++"],
        "correct": 1,
        "category": "Coding",
        "explanation": "Python is the primary language, known for its high productivity and rich ecosystem in machine learning."
    },
    {
        "question": "Which gaming franchise features the iconic protagonist Master Chief?",
        "options": ["Gears of War", "Halo", "Mass Effect", "Destiny"],
        "correct": 1,
        "category": "Gaming",
        "explanation": "Master Chief Petty Officer John-117 is the legendary hero of the Halo franchise."
    },
    {
        "question": "In artificial intelligence, what does the acronym 'LLM' stand for?",
        "options": ["Linear Learning Machine", "Large Language Model", "Logical Linguistic Method", "Layered Logic Memory"],
        "correct": 1,
        "category": "Artificial Intelligence",
        "explanation": "Large Language Models (LLMs) are deep learning neural networks trained on vast text corpora."
    },
    {
        "question": "What is the approximate speed of light in vacuum?",
        "options": ["300,000 km/s", "150,000 km/s", "30,000 km/s", "3,000 km/s"],
        "correct": 0,
        "category": "Physics",
        "explanation": "Light travels at approximately 299,792 kilometers per second in a vacuum."
    },
    {
        "question": "Which element has the chemical symbol 'Au' on the periodic table?",
        "options": ["Silver", "Gold", "Copper", "Aluminum"],
        "correct": 1,
        "category": "Science",
        "explanation": "'Au' comes from the Latin word 'aurum', meaning shining dawn or gold."
    },
    {
        "question": "Which year was the original Nintendo Entertainment System (NES) released in North America?",
        "options": ["1981", "1983", "1985", "1989"],
        "correct": 2,
        "category": "Gaming",
        "explanation": "The NES launched in North America in late 1985, revitalizing the video game industry."
    },
    {
        "question": "Which company developed the Gemini family of multimodal AI models?",
        "options": ["OpenAI", "Google DeepMind", "Meta", "Anthropic"],
        "correct": 1,
        "category": "Artificial Intelligence",
        "explanation": "Google DeepMind developed the Gemini series of frontier multimodal models."
    }
]


class GameService:
    def __init__(self):
        self.catalog = GAMES_CATALOG
        self.trivia_pool = TRIVIA_QUESTIONS

    def get_catalog(self) -> List[Dict[str, Any]]:
        """Returns all available playable arcade games."""
        return self.catalog

    def get_game_by_id(self, game_id: str) -> Optional[Dict[str, Any]]:
        for g in self.catalog:
            if g["id"] == game_id.lower():
                return g
        return None

    def get_random_trivia(self) -> Dict[str, Any]:
        """Returns a randomized trivia question."""
        q = random.choice(self.trivia_pool)
        return {
            "question": q["question"],
            "options": q["options"],
            "category": q["category"],
            "correct": q["correct"],
            "explanation": q["explanation"]
        }

    def extract_game_intent(self, text: str) -> Tuple[bool, Optional[str], Optional[str]]:
        """
        Extracts whether the user wants to play a game, and which game specifically.
        Returns: (is_game_intent, action, game_id)
        """
        lowered = text.lower().strip()

        # Check for direct game requests or keywords
        game_triggers = [
            "play a game", "play game", "play any game", "want to play game",
            "want to plye", "want to play", "let's play a game", "lets play a game",
            "start game", "launch game", "open game", "open arcade",
            "gaming", "arcade game", "play something fun", "play trivia",
            "play snake", "play tic tac toe", "play tictactoe", "play space dodge",
            "play asteroid", "i am bored let's play", "i want to play the any game",
            "can we play a game", "games", "arcade"
        ]

        is_game_keyword = any(t in lowered for t in game_triggers) or any(
            w in lowered for w in ["snake", "tic tac toe", "tictactoe", "trivia", "quiz", "asteroid"]
        )

        if not is_game_keyword:
            return (False, None, None)

        # Detect specific game requested
        if any(w in lowered for w in ["snake", "cyber snake", "python game"]):
            return (True, "play", "snake")
        if any(w in lowered for w in ["tic tac toe", "tictactoe", "tic-tac-toe", "noughts and crosses", "x and o"]):
            return (True, "play", "tictactoe")
        if any(w in lowered for w in ["trivia", "quiz", "trivia challenge", "ask me question", "quiz me"]):
            return (True, "play", "trivia")
        if any(w in lowered for w in ["space", "asteroid", "spaceship", "cosmic"]):
            return (True, "play", "space")

        # User wants to play "any game" or general gaming
        chosen = random.choice(["snake", "tictactoe", "trivia", "space"])
        return (True, "play_any", chosen)


game_service = GameService()

