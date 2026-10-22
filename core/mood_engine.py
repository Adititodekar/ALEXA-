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
        # Common Hindi/Hinglish and Spanish phrases. This is a lightweight
        # language-aware signal, not a clinical or definitive assessment.
        extra_phrases = {
            "stressed": ["tension ho rahi", "bahut pressure", "kaam bahut zyada", "estresado", "estresada", "agobiado", "agobiada"],
            "anxious": ["ghabra raha", "ghabra rahi", "chinta ho rahi", "dar lag raha", "ansioso", "ansiosa", "preocupado", "preocupada"],
            "sad": ["udaas", "akela lag raha", "akeli lag rahi", "mann udaas", "triste", "me siento solo", "me siento sola"],
            "joyful": ["khush hoon", "bahut khush", "maza aa gaya", "feliz", "muy contento", "muy contenta", "emocionado", "emocionada"],
            "calm": ["sukoon", "shaant hoon", "theek hoon", "tranquilo", "tranquila", "en paz"]
        }
        for emotion, phrases in extra_phrases.items():
            self.emotion_lexicon[emotion].extend(phrases)

        self.suggestions = {
            "emergency": "If you’re in immediate danger, contact local emergency services or someone you trust now.",
            "stressed": "Try choosing one small next step, then take a short pause before the next one.",
            "anxious": "A slow breath with a longer exhale may help. If you want, tell me what’s worrying you.",
            "sad": "Consider reaching out to someone you trust, or tell me what’s been weighing on you.",
            "joyful": "Enjoy the moment—and if you like, share what’s making you feel good.",
            "calm": "You seem settled. This could be a good moment for a task that needs focus.",
            "neutral": "I don’t have a clear mood signal yet. You can tell me how you’re feeling, or just keep chatting."
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

        # Confidence reflects keyword evidence only. Phrase matches are not
        # proof of a person's internal state, so expose uncertainty clearly.
        unique_emotions = set(matched_emotions)
        confidence = 0.0 if primary_mood == "neutral" else min(0.9, 0.55 + 0.12 * max(0, matched_emotions.count(primary_mood) - 1))

        return {
            "primary_mood": primary_mood,
            "detected_emotions": sorted(unique_emotions),
            "is_emergency": is_emergency,
            "tone_advice": tone_advice,
            "confidence": confidence,
            "suggestion": self.suggestions[primary_mood],
            "disclaimer": "A best-effort read of your words, not a diagnosis. Tell Nova if it got your mood wrong."
        }
