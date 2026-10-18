"""
Mood and Emotion Engine for Nova AI Assistant.
Analyzes conversational text, emotional cues, and distress levels to adapt tone and detect danger.
"""

import re
from typing import Dict, Any

class MoodEngine:
    def __init__(self):
        # Emotion keyword maps
        self.emotion_lexicon = {
            "emergency": [
                "help me", "emergency", "call police", "call ambulance", "accident", 
                "someone is following me", "i fell", "i can't breathe", "attack", 
                "heart attack", "danger", "robbery", "fire", "dying", "bleeding"
            ],
            "stressed": [
                "stressed", "stress", "overwhelmed", "too much work", "pressure", 
                "burnout", "exhausted", "can't take it", "so tired", "deadline panic",
                "freaking out", "frustrated", "headache"
            ],
            "anxious": [
                "anxious", "anxiety", "nervous", "scared", "fear", "worried", 
                "panic", "uneasy", "dread", "what if"
            ],
            "sad": [
                "sad", "depressed", "lonely", "crying", "unhappy", "hopeless", 
                "down", "feeling low", "heartbroken", "gloomy"
            ],
            "joyful": [
                "happy", "excited", "great", "awesome", "yay", "wonderful", 
                "thrilled", "celebrate", "proud", "amazing", "good news", "fantastic"
            ],
            "calm": [
                "calm", "relaxed", "peaceful", "chill", "content", "fine", 
                "all good", "balanced", "rested"
            ]
        }

    def analyze(self, text: str) -> Dict[str, Any]:
        """
        Analyzes the emotional tone, sentiment score, and urgency of the text.
        """
        lowered = text.lower().strip()
        matched_emotions = []
        is_emergency = False

        for emotion, keywords in self.emotion_lexicon.items():
            for kw in keywords:
                # Word boundary match for single words, direct substring for phrases
                if " " in kw:
                    if kw in lowered:
                        matched_emotions.append(emotion)
                        if emotion == "emergency":
                            is_emergency = True
                else:
                    if re.search(rf"\b{kw}\b", lowered):
                        matched_emotions.append(emotion)
                        if emotion == "emergency":
                            is_emergency = True

        # Primary emotion resolution
        if is_emergency:
            primary_mood = "emergency"
            tone_advice = "Urgent, calm, directive, initiate immediate SOS assistance."
        elif "stressed" in matched_emotions or "anxious" in matched_emotions:
            primary_mood = "stressed" if "stressed" in matched_emotions else "anxious"
            tone_advice = "Empathetic, reassuring, gentle, offer practical simplification and calming pauses."
        elif "sad" in matched_emotions:
            primary_mood = "sad"
            tone_advice = "Warm, supportive, non-judgmental, compassionate."
        elif "joyful" in matched_emotions:
            primary_mood = "joyful"
            tone_advice = "Enthusiastic, cheerful, validating user's achievements."
        elif "calm" in matched_emotions:
            primary_mood = "calm"
            tone_advice = "Pleasant, steady, informative, friendly."
        else:
            primary_mood = "neutral"
            tone_advice = "Helpful, conversational, natural and concise like Alexa."

        return {
            "primary_mood": primary_mood,
            "detected_emotions": list(set(matched_emotions)),
            "is_emergency": is_emergency,
            "tone_advice": tone_advice
        }
