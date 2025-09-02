import sqlite3

def init_db():
    """Initializes the database and creates tables if they don't exist."""
    conn = sqlite3.connect('data/reflection.db')
    cursor = conn.cursor()
    # A simple table to log every interaction for potential review
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS interactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT NOT NULL,
            turn INTEGER NOT NULL,
            sender TEXT NOT NULL,
            message TEXT NOT NULL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    conn.commit()
    conn.close()

def log_interaction(session_id, turn, sender, message):
    """Logs a single message to the database."""
    conn = sqlite3.connect('data/reflection.db')
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO interactions (session_id, turn, sender, message) VALUES (?, ?, ?, ?)",
        (session_id, turn, sender, message)
    )
    conn.commit()
    conn.close()
