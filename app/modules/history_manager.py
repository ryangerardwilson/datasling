import sqlite3
import os
from .config import HISTORY_DB
from .df_utils import load_data_from_path
from .config import HEADING_COLOR, CONTENT_COLOR, RESET_COLOR


def get_historic_df(df_name):
    conn = sqlite3.connect(HISTORY_DB)
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
            return load_data_from_path(file_path), preset, query, timestamp
    return None, None, None, None


def historic(df_names=None, global_namespace=None):
    """Reload DataFrames from their most recent history entries."""
    if global_namespace is None:
        global_namespace = globals()
    if df_names is None:
        from .query_processor import collect_queries
        all_queries = []
        for filepath in global_namespace.get('ORIGINAL_FILEPATHS', []):
            all_queries.extend(collect_queries(filepath))
        df_names = [q[0] for q in all_queries]

    for df_name in df_names:
        df, preset, query, timestamp = get_historic_df(df_name)
        if df is not None:
            global_namespace[df_name] = df
            print(f"{HEADING_COLOR}Reloaded historic {df_name} (preset: {preset}, timestamp: {timestamp}):{RESET_COLOR}")
            print(f"{CONTENT_COLOR}{df}{RESET_COLOR}")
            print()
        else:
            print(f"{HEADING_COLOR}Warning:{RESET_COLOR} {CONTENT_COLOR}No historic data found for {df_name}{RESET_COLOR}")
