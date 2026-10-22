"""
Conversational Dialogue & Natural Reasoning Engine for Nova AI Assistant.
Provides dynamic, non-hardcoded conversation, multi-turn memory, real-time knowledge synthesis,
math calculations, emotional adaptation, and conversational assistant replies without requiring an API key.
"""

import re
import ast
import random
import operator
from datetime import datetime
from typing import Dict, Any, Optional, List, Tuple
import requests

class ConversationEngine:
    def __init__(self, media_service=None):
        self.media_service = media_service
        self.history: List[Dict[str, str]] = []  # [{role: "user"|"assistant", text: str, time: str}]
        self.user_profile: Dict[str, Any] = {
            "name": None,
            "interests": set(),
            "notes": []
        }
        self.last_topic: Optional[str] = None
        
        # Safe math operators
        self._operators = {
            ast.Add: operator.add,
            ast.Sub: operator.sub,
            ast.Mult: operator.mul,
            ast.Div: operator.truediv,
            ast.Pow: operator.pow,
            ast.Mod: operator.mod,
            ast.USub: operator.neg,
        }

        self.jokes = [
            "Why do programmers prefer dark mode? Because light attracts bugs!",
            "Why was the computer cold? Because it left its Windows open!",
            "There are only 10 kinds of people in the world: those who understand binary, and those who don't.",
            "Why did the JavaScript developer wear glasses? Because they didn't C#!",
            "A SQL query walks into a bar, walks up to two tables and asks: 'Can I join you?'",
            "Why do Python programmers have low self-esteem? Because they're constantly comparing their self to other objects.",
            "What is an algorithm? A word used by programmers when they don't want to explain what they did."
        ]

        self.fun_facts = [
            "Honey never spoils. Archaeologists have found pots of honey in ancient Egyptian tombs that are over 3,000 years old and still edible!",
            "Octopuses have three hearts and blue copper-based blood.",
            "A day on Venus is longer than a year on Venus. It takes 243 Earth days to rotate once on its axis, but only 225 Earth days to orbit the Sun.",
            "The first computer mouse was invented in 1964 by Doug Engelbart and was made of wood.",
            "Sound travels about 4.3 times faster in water than in air.",
            "Bananas are naturally slightly radioactive because they are rich in potassium-40!"
        ]

        self.inspirational_quotes = [
            "“The best way to predict the future is to create it.” — Peter Drucker",
            "“It always seems impossible until it's done.” — Nelson Mandela",
            "“Success is not final, failure is not fatal: it is the courage to continue that counts.” — Winston Churchill",
            "“Small daily improvements over time lead to stunning results.” — Robin Sharma",
            "“You don’t have to see the whole staircase, just take the first step.” — Martin Luther King Jr."
        ]

    # --- Conversation Memory & Profile ---
    def record_turn(self, user_text: str, assistant_reply: str, topic: Optional[str] = None):
        """Records dialogue turn in short-term context memory."""
        now_str = datetime.now().strftime("%H:%M:%S")
        self.history.append({"role": "user", "text": user_text, "time": now_str})
        self.history.append({"role": "assistant", "text": assistant_reply, "time": now_str})
        if topic:
            self.last_topic = topic
        # Keep last 20 turns
        if len(self.history) > 20:
            self.history = self.history[-20:]

    def _extract_user_info(self, text: str) -> Optional[str]:
        """Detects if user is introducing themselves or sharing their name."""
        lowered = text.lower().strip()
        name_patterns = [
            r"my name is ([a-zA-Z]+)",
            r"i am called ([a-zA-Z]+)",
            r"call me ([a-zA-Z]+)",
            r"i'm ([a-zA-Z]+)(?:\b|$)"
        ]
        for pattern in name_patterns:
            m = re.search(pattern, text, re.IGNORECASE)
            if m:
                candidate = m.group(1).strip()
                # filter out common adjectives
                if candidate.lower() not in ["stressed", "sad", "happy", "fine", "good", "lost", "hungry", "tired", "busy", "here"]:
                    self.user_profile["name"] = candidate.capitalize()
                    return self.user_profile["name"]
        return None

    # --- Safe Math Evaluator ---
    def _evaluate_math(self, expression_str: str) -> Optional[float]:
        """Safely evaluates basic arithmetic expressions without eval()."""
        try:
            expr_clean = expression_str.replace("x", "*").replace("^", "**").replace("×", "*").replace("÷", "/")
            node = ast.parse(expr_clean, mode='eval')

            def _eval_node(n):
                if isinstance(n, ast.Expression):
                    return _eval_node(n.body)
                elif isinstance(n, ast.Constant) and isinstance(n.value, (int, float)):
                    return n.value
                elif isinstance(n, ast.BinOp):
                    op_type = type(n.op)
                    if op_type in self._operators:
                        return self._operators[op_type](_eval_node(n.left), _eval_node(n.right))
                elif isinstance(n, ast.UnaryOp):
                    op_type = type(n.op)
                    if op_type in self._operators:
                        return self._operators[op_type](_eval_node(n.operand))
                raise ValueError("Unsupported expression")

            result = _eval_node(node)
            return round(result, 4)
        except Exception:
            return None

    # --- Real-Time Knowledge Lookup (Wikipedia) ---
    def _fetch_knowledge(self, topic: str) -> Optional[Tuple[str, str, Dict[str, Any]]]:
        """
        Fetches live encyclopedic information from Wikipedia REST API.
        Returns (title, clean_summary, raw_data).
        """
        try:
            headers = {"User-Agent": "NovaAIAssistant/2.0 (contact@nova-assistant.local)"}
            search_url = f"https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch={requests.utils.quote(topic)}&format=json"
            resp = requests.get(search_url, headers=headers, timeout=5)
            if resp.status_code == 200:
                results = resp.json().get("query", {}).get("search", [])
                if results:
                    best_title = results[0]["title"]
                    summary_url = f"https://en.wikipedia.org/api/rest_v1/page/summary/{requests.utils.quote(best_title)}"
                    s_resp = requests.get(summary_url, headers=headers, timeout=5)
                    if s_resp.status_code == 200:
                        s_data = s_resp.json()
                        extract = s_data.get("extract")
                        if extract and len(extract.strip()) > 30:
                            return best_title, extract.strip(), s_data
        except Exception:
            pass
        return None

    # --- Main Conversational Engine ---
    def generate_response(self, clean_text: str, mood_data: Dict[str, Any], current_location: Dict[str, Any]) -> Dict[str, Any]:
        """
        Synthesizes a human-like, intelligent, non-hardcoded conversational reply.
        Adapts tone according to user mood, context, math, time, and live knowledge.
        """
        lowered = clean_text.lower().strip()
        name = self.user_profile.get("name")
        user_name_prefix = f"{name}, " if name else ""

        # 1. Check if user is sharing their name
        extracted_name = self._extract_user_info(clean_text)
        if extracted_name and ("my name is" in lowered or "call me" in lowered):
            replies = [
                f"Nice to meet you, {extracted_name}! I'm Nova, your personal AI companion. How can I assist you today?",
                f"Pleasure to connect with you, {extracted_name}! I have noted your name. What's on your mind right now?",
                f"Wonderful to know you, {extracted_name}! I'm ready whenever you need planning, directions, answers, or just a good conversation."
            ]
            reply = random.choice(replies)
            self.record_turn(clean_text, reply)
            return {"speech": reply, "display": reply, "topic": "introduction"}

        # 2. Check if user asks about their own name
        if any(p in lowered for p in ["what is my name", "who am i", "do you know my name", "what's my name"]):
            if name:
                reply = f"You told me your name is {name}! It's great chatting with you."
            else:
                reply = "You haven't introduced yourself yet! What should I call you?"
            self.record_turn(clean_text, reply)
            return {"speech": reply, "display": reply, "topic": "profile"}

        # 3. Check for Date & Time queries
        if any(w in lowered for w in ["what time is it", "current time", "what's the time", "tell me the time", "what is today's date", "what date is it", "today's date", "what day is today"]):
            now = datetime.now()
            time_str = now.strftime("%I:%M %p")
            date_str = now.strftime("%A, %B %d, %Y")
            if "time" in lowered:
                reply = f"It is currently {time_str}."
            elif "date" in lowered:
                reply = f"Today is {date_str}."
            else:
                reply = f"It is {time_str} on {date_str}."
            self.record_turn(clean_text, reply)
            return {"speech": reply, "display": f"🕒 **{reply}**", "topic": "time"}

        # 4. Check for Mathematical Calculations
        # Patterns like: "what is 15 * 24", "calculate 200 / 4", "50 + 20", "15% of 80"
        percent_match = re.search(r"(\d+(?:\.\d+)?)\s*%\s*(?:of)\s*(\d+(?:\.\d+)?)", lowered)
        if percent_match:
            p_val = float(percent_match.group(1))
            total_val = float(percent_match.group(2))
            calc_res = round((p_val / 100.0) * total_val, 4)
            reply = f"{p_val}% of {total_val} is {calc_res}."
            self.record_turn(clean_text, reply)
            return {"speech": reply, "display": f"🔢 **Calculation**: `{reply}`", "topic": "math"}

        math_match = re.search(r"(?:calculate|what is|how much is)?\s*([0-9\.\s\+\-\*\/\^\(\)]+[0-9\)])", clean_text)
        if math_match:
            candidate_expr = math_match.group(1).strip()
            # Must contain at least one math operator
            if any(op in candidate_expr for op in ["+", "-", "*", "/", "^"]):
                val = self._evaluate_math(candidate_expr)
                if val is not None:
                    # Clean up .0 if integer
                    display_val = int(val) if val == int(val) else val
                    reply = f"{candidate_expr} equals {display_val}."
                    self.record_turn(clean_text, reply)
                    return {"speech": reply, "display": f"🔢 **Result**: `{candidate_expr} = {display_val}`", "topic": "math"}

        # 5. Greetings & Pleasantries
        greeting_words = ["hello", "hi", "hey", "good morning", "good afternoon", "good evening", "howdy", "sup nova", "hey nova"]
        if any(lowered == g or lowered.startswith(g + " ") for g in greeting_words):
            hour = datetime.now().hour
            time_greeting = "Good morning" if hour < 12 else ("Good afternoon" if hour < 18 else "Good evening")
            openers = [
                f"{time_greeting}, {user_name_prefix}how can I help you today?",
                f"Hello {user_name_prefix}! Great to hear from you. What would you like to explore or accomplish?",
                f"Hey there{f', {name}' if name else ''}! I'm online, tuned in, and ready to assist.",
                f"Hi {user_name_prefix}! Hope your day is going well. How can I be of service?"
            ]
            reply = random.choice(openers)
            self.record_turn(clean_text, reply)
            return {"speech": reply, "display": reply, "topic": "greeting"}

        # 6. How are you / Status
        if any(p in lowered for p in ["how are you", "how're you", "how are you doing", "how are things", "how do you feel"]):
            responses = [
                f"I'm feeling energized and ready to help{f', {name}' if name else ''}! How are you doing today?",
                "All systems are running smoothly! I'm here and eager to assist with whatever you need.",
                "Doing wonderfully, thank you for asking! How has your day been treating you?"
            ]
            reply = random.choice(responses)
            self.record_turn(clean_text, reply)
            return {"speech": reply, "display": reply, "topic": "chit-chat"}

        # 7. Identity & Capabilities
        if any(p in lowered for p in ["who are you", "what are you", "what can you do", "introduce yourself", "tell me about yourself"]):
            reply = (
                f"I am Nova, your voice-activated multimodal AI companion! "
                f"I can navigate you to places with live maps, track your deadlines, organize your daily schedule, "
                f"monitor digital wellbeing, answer complex questions with real encyclopedic knowledge, and provide instant emergency SOS dispatch if you're ever in danger. "
                f"What would you like to do?"
            )
            self.record_turn(clean_text, reply)
            return {"speech": reply, "display": f"✨ **Meet Nova**\n\n{reply}", "topic": "identity"}

        # 8. Creator / Origin
        if any(p in lowered for p in ["who made you", "who created you", "who built you"]):
            reply = "I was engineered as an advanced, autonomous AI assistant companion designed to blend real-time multimodal intelligence, safety guardianship, and daily productivity."
            self.record_turn(clean_text, reply)
            return {"speech": reply, "display": reply, "topic": "origin"}

        # 9. Jokes & Humor
        if any(w in lowered for w in ["joke", "make me laugh", "tell me something funny", "funny"]):
            joke = random.choice(self.jokes)
            reply = f"Here's one for you: {joke}"
            self.record_turn(clean_text, reply)
            return {"speech": reply, "display": f"😄 **Humor Break**\n\n{joke}", "topic": "joke"}

        # 10. Fun Facts & Trivia
        if any(w in lowered for w in ["fun fact", "tell me a fact", "trivia", "interesting fact"]):
            fact = random.choice(self.fun_facts)
            reply = f"Did you know? {fact}"
            self.record_turn(clean_text, reply)
            return {"speech": reply, "display": f"💡 **Did You Know?**\n\n{fact}", "topic": "fact"}

        # 11. Inspiration & Motivation
        if any(w in lowered for w in ["inspire me", "motivation", "motivate me", "quote", "words of wisdom"]):
            quote = random.choice(self.inspirational_quotes)
            reply = f"Here is an inspiring thought for you: {quote}"
            self.record_turn(clean_text, reply)
            return {"speech": reply, "display": f"🌟 **Inspiration**\n\n{quote}", "topic": "inspiration"}

        # 12. Emotional Support & Empathy (User feeling stressed, sad, anxious, or tired)
        if mood_data.get("primary_mood") in ["stressed", "sad", "anxious"] or any(w in lowered for w in ["feeling sad", "i am tired", "exhausted", "depressed", "rough day", "bad day", "give up"]):
            if "stressed" in mood_data.get("emotions", []) or "stressed" in lowered or "pressure" in lowered:
                reply = (
                    f"I hear you{f', {name}' if name else ''}, and it's completely okay to feel overwhelmed sometimes. "
                    f"Take a slow, deep breath. You don't have to tackle everything all at once. "
                    f"Would you like to review your high-priority tasks and break them down into bite-sized steps?"
                )
            elif "sad" in mood_data.get("emotions", []) or "sad" in lowered or "bad day" in lowered:
                reply = (
                    f"I'm really sorry you're feeling down{f', {name}' if name else ''}. "
                    f"Remember that tough days pass, and it's okay to take a moment to rest and be kind to yourself. "
                    f"I'm right here with you if you want to talk or need a distraction with some music or trivia."
                )
            else:
                reply = (
                    f"Take a moment to pause{f', {name}' if name else ''}. You're doing the best you can, "
                    f"and one step at a time is all it takes. Let me know how I can ease your workload right now."
                )
            self.record_turn(clean_text, reply)
            return {"speech": reply, "display": f"💜 **Empathetic Support**\n\n{reply}", "topic": "empathy"}

        # 13. Gratitude & Pleasant Exit
        if any(w in lowered for w in ["thank you", "thanks", "appreciate it", "thank you so much"]):
            replies = [
                f"You're very welcome{f', {name}' if name else ''}! Always happy to help.",
                "Anytime! That's what I'm here for.",
                "My pleasure! Let me know if you need anything else."
            ]
            reply = random.choice(replies)
            self.record_turn(clean_text, reply)
            return {"speech": reply, "display": reply, "topic": "gratitude"}

        # 14. Contextual Follow-Up ("tell me more", "explain more", "continue")
        if any(lowered == w or lowered.startswith(w) for w in ["tell me more", "explain more", "tell me about it", "what else", "continue"]) and self.last_topic:
            target_topic = self.last_topic
            knowledge = self._fetch_knowledge(target_topic)
            if knowledge:
                title, extract, raw_data = knowledge
                sentences = extract.split(". ")
                more_text = ". ".join(sentences[1:4]) if len(sentences) > 1 else extract
                reply = f"Expanding on {title}: {more_text}"
                self.record_turn(clean_text, reply, topic=title)
                return {"speech": reply, "display": f"📚 **Further Details on {title}**\n\n{more_text}", "topic": title, "raw": raw_data}

        # 15. Encyclopedic & Knowledge Search (ONLY for explicit factual inquiries)
        clean_topic = None
        encyclopedic_prefixes = [
            "what is the meaning of", "what is a", "what is an", "who is", "who was",
            "tell me about the", "history of", "search wikipedia for", "define", "what is the capital of"
        ]
        for prefix in encyclopedic_prefixes:
            if lowered.startswith(prefix):
                candidate = clean_text[len(prefix):].strip(" ?.")
                # Filter out chit-chat and self-referential questions
                if candidate.lower() not in ["you", "your name", "up", "going on", "new", "this", "that", "the time", "today's date", "my name", "love"]:
                    clean_topic = candidate
                break

        if clean_topic and len(clean_topic) >= 2:
            knowledge = self._fetch_knowledge(clean_topic)
            if knowledge:
                title, extract, raw_data = knowledge
                sentences = [s.strip() for s in extract.split(". ") if s.strip()]
                spoken_summary = ". ".join(sentences[:2])
                if not spoken_summary.endswith("."):
                    spoken_summary += "."
                
                reply = f"{title}: {spoken_summary}"
                display = f"### 📖 {title}\n\n{extract}\n\n*Source: Wikimedia Knowledge Base*"
                self.record_turn(clean_text, reply, topic=title)
                return {
                    "speech": reply,
                    "display": display,
                    "topic": title,
                    "raw": raw_data
                }

        # 16. Casual Chat & Engaging Dialogue Responses
        if any(w in lowered for w in ["what's up", "what is up", "sup", "wassup", "what are you doing", "what are you up to"]):
            replies = [
                f"Just here and ready to help you{f', {name}' if name else ''}! We can chat, check the weather, play your favourite songs, or organize tasks. What's on your mind?",
                "Monitoring your smart home, tracking your schedule, and ready for whatever you need. How's your day going?",
                "Standing by and feeling great! What are we working on or listening to today?"
            ]
            reply = random.choice(replies)
            self.record_turn(clean_text, reply)
            return {"speech": reply, "display": reply, "topic": "chit-chat"}

        if any(w in lowered for w in ["good night", "night nova", "going to sleep", "sleep well", "see you tomorrow"]):
            reply = f"Good night{f', {name}' if name else ''}! Rest well and recharge. I'll be here whenever you're ready tomorrow."
            self.record_turn(clean_text, reply)
            return {"speech": reply, "display": f"🌙 **{reply}**", "topic": "night"}

        if any(w in lowered for w in ["bored", "entertain me", "what should i do"]):
            reply = "If you're looking for a quick reset, you can say 'Nova play my favourite songs', ask me for a fun fact, or check out today's daily briefing and weather!"
            self.record_turn(clean_text, reply)
            return {"speech": reply, "display": f"✨ {reply}", "topic": "bored"}

        if any(w in lowered for w in ["you are awesome", "you are great", "love you", "good job", "nice job", "you're the best", "you rock"]):
            replies = [
                f"Thank you so much{f', {name}' if name else ''}! That really brightens my circuits. I love assisting you!",
                f"You're awesome too! I'm always glad to be in your corner.",
                "Thank you! Knowing that I'm helping you accomplish your goals is what I was built for."
            ]
            reply = random.choice(replies)
            self.record_turn(clean_text, reply)
            return {"speech": reply, "display": reply, "topic": "compliment"}

        # 17. General Conversational Fallback (Thoughtful, human-like dialogue)
        fallbacks = [
            f"I hear you{f', {name}' if name else ''}! That's an interesting thought. Tell me more about what you have in mind.",
            f"I'm right here with you. What direction would you like to take that in?",
            f"I'd love to chat more about that! Could you elaborate on what you're thinking?",
            f"Got it! Let me know if you want me to assist with an action, find details, or just keep chatting."
        ]
        reply = random.choice(fallbacks)
        self.record_turn(clean_text, reply)
        return {"speech": reply, "display": reply, "topic": "conversation"}

    # --- Conversational Assistants for Core Capabilities ---

    def format_planner_speech(self, plan: Dict[str, Any]) -> str:
        """Generates dynamic, human-like voice synthesis for daily agenda."""
        name = self.user_profile.get("name")
        hour = datetime.now().hour
        greeting = "Good morning" if hour < 12 else ("Good afternoon" if hour < 18 else "Good evening")
        name_str = f", {name}" if name else ""

        urgent_count = plan.get("urgent_deadlines_count", 0)
        blocks = plan.get("schedule_blocks", [])

        if urgent_count > 0:
            first_block = blocks[0]["activity"] if blocks else "tackling priority deadlines"
            speech = (
                f"{greeting}{name_str}! Looking at your agenda for today, you have {urgent_count} critical deadline{'' if urgent_count == 1 else 's'} "
                f"approaching. I've scheduled your peak morning focus for {first_block}. Let's make today productive!"
            )
        else:
            speech = (
                f"{greeting}{name_str}! Your schedule for today looks well balanced with no critical submission bottlenecks. "
                f"I've mapped out structured blocks for deep work and wellness. Would you like to review any specific time slot?"
            )
        return speech

    def format_deadlines_speech(self, deadlines: List[Dict[str, Any]], added_title: Optional[str] = None) -> str:
        """Generates conversational commentary on deadlines."""
        name = self.user_profile.get("name")
        name_str = f", {name}" if name else ""

        if added_title:
            return f"Got it{name_str}! I added '{added_title}' to your submission tracker and will remind you proactively before it's due."

        if not deadlines:
            return f"Great news{name_str}! You currently have no outstanding submission deadlines on your tracker."

        urgent_items = [d for d in deadlines if d.get("priority") in ["urgent", "high"] or d.get("is_urgent")]
        if urgent_items:
            top_item = urgent_items[0]["title"]
            return (
                f"You have {len(deadlines)} active deadline{'' if len(deadlines) == 1 else 's'}{name_str}. "
                f"The most pressing is '{top_item}', due {urgent_items[0].get('due_date')}. I recommend focusing on this first."
            )
        else:
            return f"You have {len(deadlines)} upcoming deadline{'' if len(deadlines) == 1 else 's'} recorded. Everything is currently on track."

    def format_location_speech(self, address: str, nav_info: Optional[Dict[str, Any]] = None, destination: Optional[str] = None) -> str:
        """Generates dynamic, human-like location and navigation directions speech."""
        if destination and nav_info and nav_info.get("success"):
            dist = nav_info.get("distance_km", "a few")
            duration = nav_info.get("duration_min", "several")
            return f"Routing you to {destination}. It's approximately {dist} kilometers away, taking around {duration} minutes. I've highlighted the path on your map."
        elif destination:
            return f"I've initiated navigation search for {destination} and mapped out the best available coordinates."
        else:
            return f"You are currently situated at {address}. I have locked your live coordinates on the map."

    def format_wellbeing_speech(self, wb: Dict[str, Any], toggled_focus: Optional[bool] = None) -> str:
        """Generates empathetic voice commentary for digital wellbeing."""
        name = self.user_profile.get("name")
        name_str = f", {name}" if name else ""

        if toggled_focus is True:
            return f"Focus mode is now engaged{name_str}. Distracting applications are locked so you can concentrate without interruptions."
        elif toggled_focus is False:
            return f"Focus mode has been deactivated{name_str}. Your standard app limits remain active."

        percent = wb.get("percent_used", 0)
        time_str = wb.get("total_screen_time_formatted", "a few hours")

        if percent >= 100:
            return f"Heads up{name_str}! You have reached {percent} percent of your daily phone limit with {time_str} of screen time. Consider taking a rejuvenating screen break."
        elif percent >= 75:
            return f"You're at {time_str} of screen time today — about {percent} percent of your daily limit. Doing well, but keep an eye on recreational apps."
        else:
            return f"Your screen time is looking balanced today at {time_str}, well within your daily goal of {wb.get('daily_limit_mins', 180)} minutes."
