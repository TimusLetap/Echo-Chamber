def build_system_prompt(profile_data):
    """Builds the system prompt from the profile JSON."""
    persona = profile_data.get("persona", "You are a helpful AI.")
    rules = "\n".join(profile_data.get("rules", []))
    return f"{persona}\n\nFollow these rules:\n{rules}"

def get_feedback_data(profile_data):
    """Extracts the feedback data."""
    return profile_data.get("feedback", {})
