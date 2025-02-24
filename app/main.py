#!/usr/bin/env python3
import sys
import time
from rgwfuncs import interactive_shell
from modules.config import ASCII_ART, ORIGINAL_FILEPATH, HEADING_COLOR, CONTENT_COLOR, RESET_COLOR, VERSION  # Import VERSION
from modules.db import init_history_db, save_history_entry, history, clear_history
from modules.query_processor import process_sql_file
from modules.ui import animate_loading, typewriter_print
from modules.df_utils import open_df
from modules.info import info


def run_local(original_filepath):
    if original_filepath:
        print(f"{HEADING_COLOR}Re-running queries from {original_filepath}:{RESET_COLOR}")
        animate_loading("Processing queries...")
        process_sql_file(original_filepath, globals(), save_history_entry)
    else:
        print(f"{HEADING_COLOR}Error:{RESET_COLOR} {CONTENT_COLOR}No original file path available to re-run queries.{RESET_COLOR}")


if __name__ == "__main__":
    # Format the ASCII art and append the version number in HEADING_COLOR
    formatted_art = f"{HEADING_COLOR}{ASCII_ART}                        Version {VERSION}{RESET_COLOR}"
    typewriter_print(formatted_art)
    print()

    # Check if there's less than 2 arguments (i.e., only the script name)
    if len(sys.argv) < 2:
        sys.stderr.write(f"{HEADING_COLOR}Usage:{RESET_COLOR} {CONTENT_COLOR}datasling <sql_file>{RESET_COLOR}\n")
        info()  # Execute info() directly when no arguments are provided
        sys.exit(0)  # Exit with success code since we provided info
    else:
        typewriter_print(f"{CONTENT_COLOR}[INFO] Need help? Execute 'info()' to see the quickstart.{RESET_COLOR}")
        print()

    original_filepath = sys.argv[1]
    init_history_db()

    global_namespace = globals()
    global_namespace['open'] = open_df
    global_namespace['history'] = history
    global_namespace['clear_history'] = clear_history
    global_namespace['run'] = lambda: run_local(original_filepath)
    global_namespace['ORIGINAL_FILEPATH'] = original_filepath

    try:
        animate_loading("Initializing query run...")     
        process_sql_file(original_filepath, global_namespace, save_history_entry)
        interactive_shell(global_namespace)
    except Exception as e:
        sys.stderr.write(f"{HEADING_COLOR}Error:{RESET_COLOR} {CONTENT_COLOR}{str(e)}{RESET_COLOR}\n")
        sys.exit(1)



