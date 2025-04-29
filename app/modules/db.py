import sqlite3
from datetime import datetime
import io
import sys
import time
import os
from .config import Config
from .df_utils import DataFrameUtils

class Database:
    def __init__(self):
        self.config = Config()
        self.df_utils = DataFrameUtils()

    def init_history_db(self):
        conn = sqlite3.connect(self.config.HISTORY_DB)
        c = conn.cursor()

        c.execute('''CREATE TABLE IF NOT EXISTS query_history (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        timestamp TEXT,
                        df_name TEXT,
                        preset TEXT,
                        query TEXT,
                        file_path TEXT,
                        printed_output TEXT
                     )''')

        c.execute('SELECT COUNT(*) FROM query_history')
        total_entries = c.fetchone()[0]

        if total_entries > 100:
            c.execute('''SELECT file_path
                         FROM query_history
                         WHERE id NOT IN (
                             SELECT id FROM query_history
                             ORDER BY timestamp DESC
                             LIMIT 40
                         ) AND file_path IS NOT NULL''')
            old_file_paths = [row[0] for row in c.fetchall()]

            c.execute('''DELETE FROM query_history
                         WHERE id NOT IN (
                             SELECT id FROM query_history
                             ORDER BY timestamp DESC
                             LIMIT 40
                         )''')

            conn.commit()
            conn.close()

            for file_path in old_file_paths:
                try:
                    if os.path.exists(file_path):
                        os.remove(file_path)
                        print(f"{self.config.HEADING_COLOR}Deleted old file:{self.config.RESET_COLOR} {self.config.CONTENT_COLOR}{file_path}{self.config.RESET_COLOR}")
                except OSError as e:
                    print(f"{self.config.HEADING_COLOR}Error deleting file {file_path}:{self.config.RESET_COLOR} {self.config.CONTENT_COLOR}{str(e)}{self.config.RESET_COLOR}")
        else:
            conn.close()

    def save_history_entry(self, df_name, preset, query, df=None):
        file_path = self.df_utils.save_df_to_csv(df) if df is not None else None
        printed_output = None

        if df is not None:
            buffer = io.StringIO()
            print(df.head(10), file=buffer)
            printed_output = buffer.getvalue()

        conn = sqlite3.connect(self.config.HISTORY_DB)
        c = conn.cursor()
        c.execute("""INSERT INTO query_history (timestamp, df_name, preset, query, file_path, printed_output)
                     VALUES (?, ?, ?, ?, ?, ?)""",
                  (datetime.now().isoformat(), df_name, preset, query, file_path, printed_output))
        conn.commit()
        conn.close()
        return file_path

    def history(self, limit=10):
        conn = sqlite3.connect(self.config.HISTORY_DB)
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
            print(f"{self.config.HEADING_COLOR}History:{self.config.RESET_COLOR} {self.config.CONTENT_COLOR}No query history available.{self.config.RESET_COLOR}")
            return

        for i, (timestamp, df_name, preset, query_text, file_path, printed_output) in enumerate(rows, 1):
            sys.stdout.write(f"{self.config.HEADING_COLOR}History Entry {i} ")
            sys.stdout.flush()
            for _ in range(3):
                sys.stdout.write(f"{self.config.HEADING_COLOR}.")
                sys.stdout.flush()
                time.sleep(0.1)
            sys.stdout.write(f"{self.config.HEADING_COLOR} (Timestamp: {timestamp}){self.config.RESET_COLOR}\n")
            sys.stdout.flush()
            print(f"{self.config.HEADING_COLOR}  DataFrame:{self.config.RESET_COLOR} {self.config.CONTENT_COLOR}{df_name}{self.config.RESET_COLOR}")
            print(f"{self.config.HEADING_COLOR}  Preset:{self.config.RESET_COLOR} {self.config.CONTENT_COLOR}{preset}{self.config.RESET_COLOR}")
            print(f"{self.config.HEADING_COLOR}  Query:{self.config.RESET_COLOR}")
            print(f"{self.config.CONTENT_COLOR}{query_text}{self.config.RESET_COLOR}")
            if file_path:
                if printed_output:
                    print(f"{self.config.HEADING_COLOR}  DataFrame Preview:{self.config.RESET_COLOR}")
                    print(f"{self.config.CONTENT_COLOR}{printed_output}{self.config.RESET_COLOR}", end="")
                    print(f"{self.config.HEADING_COLOR}  Load File:{self.config.RESET_COLOR} {self.config.CONTENT_COLOR}load_data_from_path(\"{file_path}\"){self.config.RESET_COLOR}")
                else:
                    print(f"{self.config.HEADING_COLOR}  Preview:{self.config.RESET_COLOR} {self.config.CONTENT_COLOR}No preview available (saved before optimization){self.config.RESET_COLOR}")
            else:
                print(f"{self.config.HEADING_COLOR}  File:{self.config.RESET_COLOR} {self.config.CONTENT_COLOR}Not saved{self.config.RESET_COLOR}")
            print()
            time.sleep(0.2)

    def clear_history(self):
        conn = sqlite3.connect(self.config.HISTORY_DB)
        c = conn.cursor()
        c.execute("DELETE FROM query_history")
        conn.commit()
        conn.close()
        print(f"{self.config.HEADING_COLOR}Query history cleared!{self.config.RESET_COLOR}")
