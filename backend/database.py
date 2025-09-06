import sqlite3
import json

def init_db():
    """
    Initializes the database. This function creates the 'reflection.db' file
    if it doesn't exist and then creates the 'summaries' table inside it.
    """
    # This command connects to the DB, creating the file if it's not there.
    conn = sqlite3.connect('backend/reflection.db')
    cursor = conn.cursor()
    
    # We define the structure of our table for storing summaries.
    # This is like creating the columns in a spreadsheet.
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS summaries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT NOT NULL UNIQUE,
            dominant_trait TEXT NOT NULL,
            scores TEXT NOT NULL, -- We will store the scores dictionary as a JSON string
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    conn.commit()
    conn.close()
    print("Database 'reflection.db' initialized successfully.")

def save_summary(session_id, dominant_trait, scores):
    """
    Saves the final summary of a user interaction to the database.
    """
    conn = sqlite3.connect('backend/reflection.db')
    cursor = conn.cursor()
    
    # A database can't store a Python dictionary directly, so we convert it to a JSON string.
    scores_json = json.dumps(scores)
    
    # We use '?' placeholders to safely insert data and prevent security issues.
    cursor.execute(
        "INSERT INTO summaries (session_id, dominant_trait, scores) VALUES (?, ?, ?)",
        (session_id, dominant_trait, scores_json)
    )
    conn.commit()
    conn.close()
    print(f"Summary saved for session: {session_id}")


