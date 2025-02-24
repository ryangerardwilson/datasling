import sqlite3
from datetime import datetime
import io
import sys
import time
import os
from modules.config import HISTORY_DB, HEADING_COLOR, CONTENT_COLOR, RESET_COLOR
from .df_utils import save_df_to_csv, load_data_from_path


def init_history_db():
    conn = sqlite3.connect(HISTORY_DB)
    c = conn.cursor()

    # Create the table if it doesn't exist
    c.execute('''CREATE TABLE IF NOT EXISTS query_history (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp TEXT,
                    df_name TEXT,
                    preset TEXT,
                    query TEXT,
                    file_path TEXT,
                    printed_output TEXT
                 )''')

    # Check the total number of entries
    c.execute('SELECT COUNT(*) FROM query_history')
    total_entries = c.fetchone()[0]

    # If there are more than 100 entries, retain only the last 40
    if total_entries > 100:
        # Get the file paths of entries older than the last 40
        c.execute('''SELECT file_path
                     FROM query_history
                     WHERE id NOT IN (
                         SELECT id FROM query_history
                         ORDER BY timestamp DESC
                         LIMIT 40
                     ) AND file_path IS NOT NULL''')
        old_file_paths = [row[0] for row in c.fetchall()]

        # Delete all entries except the last 40
        c.execute('''DELETE FROM query_history
                     WHERE id NOT IN (
                         SELECT id FROM query_history
                         ORDER BY timestamp DESC
                         LIMIT 40
                     )''')

        conn.commit()
        conn.close()

        # Delete the associated CSV files from disk
        for file_path in old_file_paths:
            try:
                if os.path.exists(file_path):
                    os.remove(file_path)
                    print(f"{HEADING_COLOR}Deleted old file:{RESET_COLOR} {CONTENT_COLOR}{file_path}{RESET_COLOR}")
            except OSError as e:
                print(f"{HEADING_COLOR}Error deleting file {file_path}:{RESET_COLOR} {CONTENT_COLOR}{str(e)}{RESET_COLOR}")
    else:
        conn.close()


def save_history_entry(df_name, preset, query, df=None):
    file_path = save_df_to_csv(df) if df is not None else None
    printed_output = None

    if df is not None:
        buffer = io.StringIO()
        print(df.head(10), file=buffer)
        printed_output = buffer.getvalue()

    conn = sqlite3.connect(HISTORY_DB)
    c = conn.cursor()
    c.execute("""INSERT INTO query_history (timestamp, df_name, preset, query, file_path, printed_output)
                 VALUES (?, ?, ?, ?, ?, ?)""",
              (datetime.now().isoformat(), df_name, preset, query, file_path, printed_output))
    conn.commit()
    conn.close()
    return file_path


def history(limit=10):
    conn = sqlite3.connect(HISTORY_DB)
    c = conn.cursor()
    query = """
        SELECT timestamp, df_name, preset, query, file_path, printed_output
        FROM (
            SELECT timestamp, df_name, preset, query, file_path, printed_output
            FROM query_history
            ORDER BY timestamp DESC
            LIMIT ?
        ) AS last_entries
        ORDER BY timestamp ASC;
    """
    c.execute(query, (limit,))
    rows = c.fetchall()
    conn.close()

    if not rows:
        print(f"{HEADING_COLOR}History:{RESET_COLOR} {CONTENT_COLOR}No query history available.{RESET_COLOR}")
        return

    for i, (timestamp, df_name, preset, query_text, file_path, printed_output) in enumerate(rows, 1):
        sys.stdout.write(f"{HEADING_COLOR}History Entry {i} ")
        sys.stdout.flush()
        for _ in range(3):
            sys.stdout.write(f"{HEADING_COLOR}.")
            sys.stdout.flush()
            time.sleep(0.1)
        sys.stdout.write(f"{HEADING_COLOR} (Timestamp: {timestamp}){RESET_COLOR}\n")
        sys.stdout.flush()
        print(f"{HEADING_COLOR}  DataFrame:{RESET_COLOR} {CONTENT_COLOR}{df_name}{RESET_COLOR}")
        print(f"{HEADING_COLOR}  Preset:{RESET_COLOR} {CONTENT_COLOR}{preset}{RESET_COLOR}")
        print(f"{HEADING_COLOR}  Query:{RESET_COLOR}")
        print(f"{CONTENT_COLOR}{query_text}{RESET_COLOR}")
        if file_path:
            if printed_output:
                print(f"{HEADING_COLOR}  DataFrame Preview:{RESET_COLOR}")
                print(f"{CONTENT_COLOR}{printed_output}{RESET_COLOR}", end="")
                print(f"{HEADING_COLOR}  Load File:{RESET_COLOR} {CONTENT_COLOR}load_data_from_path(\"{file_path}\"){RESET_COLOR}")
            else:
                print(f"{HEADING_COLOR}  Preview:{RESET_COLOR} {CONTENT_COLOR}No preview available (saved before optimization){RESET_COLOR}")
        else:
            print(f"{HEADING_COLOR}  File:{RESET_COLOR} {CONTENT_COLOR}Not saved{RESET_COLOR}")
        print()
        time.sleep(0.2)


def clear_history():
    conn = sqlite3.connect(HISTORY_DB)
    c = conn.cursor()
    c.execute("DELETE FROM query_history")
    conn.commit()
    conn.close()
    print(f"{HEADING_COLOR}Query history cleared!{RESET_COLOR}")
