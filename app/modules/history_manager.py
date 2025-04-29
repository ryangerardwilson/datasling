import sqlite3
import os
from .config import Config
from .df_utils import DataFrameUtils
from .file_utils import FileUtils

class HistoryManager:
    def __init__(self):
        self.config = Config()
        self.df_utils = DataFrameUtils()
        self.file_utils = FileUtils()

    def get_historic_df(self, df_name):
        conn = sqlite3.connect(self.config.HISTORY_DB)
        c = conn.cursor()
        c.execute("""
            SELECT file_path, preset, query, timestamp
            FROM query_history
            WHERE df_name = ? AND file_path IS NOT NULL
            ORDER BY timestamp DESC
            LIMIT 1
        """, (df_name,))
        row = c.fetchone()
        conn.close()

        if row:
            file_path, preset, query, timestamp = row
            if os.path.exists(file_path):
                return self.df_utils.load_data_from_path(file_path), preset, query, timestamp
        return None, None, None, None

    def historic(self, df_names=None, global_namespace=None):
        if global_namespace is None:
            global_namespace = globals()
        if df_names is None:
            all_queries = []
            for filepath in global_namespace.get('ORIGINAL_FILEPATHS', []):
                all_queries.extend(self.file_utils.collect_queries(filepath))
            df_names = [q[0] for q in all_queries]

        for df_name in df_names:
            df, preset, query, timestamp = self.get_historic_df(df_name)
            if df is not None:
                global_namespace[df_name] = df
                print(f"{self.config.HEADING_COLOR}Reloaded historic {df_name} (preset: {preset}, timestamp: {timestamp}):{self.config.RESET_COLOR}")
                print(f"{self.config.CONTENT_COLOR}{df}{self.config.RESET_COLOR}")
                print()
            else:
                print(f"{self.config.HEADING_COLOR}Warning:{self.config.RESET_COLOR} {self.config.CONTENT_COLOR}No historic data found for {df_name}{self.config.RESET_COLOR}")
