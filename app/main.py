#!/usr/bin/env python3
import sys
from rgwfuncs import interactive_shell
from modules.config import ASCII_ART, HEADING_COLOR, CONTENT_COLOR, RESET_COLOR
from modules.db import init_history_db, save_history_entry, history, clear_history
from modules.query_processor import run_local, process_all_queries
from modules.ui import animate_loading, typewriter_print
from modules.df_utils import open_df
from modules.info import info
from modules.file_utils import get_sql_files, check_df_conflicts

# Import the original historic function under a different name
from modules.history_manager import historic as historic_func


# Wrapper function that uses historic_func, not historic (to avoid recursion)
def historic_wrapper(df_names=None, *args, **kwargs):
    return historic_func(df_names, global_namespace)


if __name__ == "__main__":
    formatted_art = f"{HEADING_COLOR}{ASCII_ART}{RESET_COLOR}"
    typewriter_print(formatted_art)

    args = sys.argv[1:]
    historic_mode = '--historic' in args
    if historic_mode:
        args.remove('--historic')

    original_filepaths = get_sql_files(args if args else None)

    if not original_filepaths:
        if args:
            sys.stderr.write(f"{HEADING_COLOR}Error:{RESET_COLOR} {CONTENT_COLOR}No .sql files found in provided arguments.{RESET_COLOR}\n")
        else:
            sys.stderr.write(f"{HEADING_COLOR}Error:{RESET_COLOR} {CONTENT_COLOR}No .sql files found in current directory.{RESET_COLOR}\n")
        sys.stderr.write(f"{HEADING_COLOR}Usage:{RESET_COLOR} {CONTENT_COLOR}datasling [--historic] [<sql_file_or_directory>...]{RESET_COLOR}\n")
        info()
        sys.exit(1)

    conflicts = check_df_conflicts(original_filepaths)
    if conflicts and not historic_mode:
        sys.stderr.write(f"{HEADING_COLOR}Error: Conflicting DataFrame names found:{RESET_COLOR}\n")
        for filepath, df_names in conflicts.items():
            sys.stderr.write(f"{CONTENT_COLOR}{filepath}: {', '.join(sorted(df_names))}{RESET_COLOR}\n")
        sys.stderr.write(f"{HEADING_COLOR}Please resolve DataFrame name conflicts before proceeding.{RESET_COLOR}\n")
        sys.exit(1)

    typewriter_print(f"{CONTENT_COLOR}[INFO] Need help? Execute 'info()' to see the quickstart.{RESET_COLOR}")
    print()
    mode_str = " (historic mode)" if historic_mode else ""
    if not args:
        print(f"{HEADING_COLOR}Processing {len(original_filepaths)} .sql file(s) found in current directory{mode_str}:{RESET_COLOR}")
    else:
        print(f"{HEADING_COLOR}Processing {len(original_filepaths)} .sql file(s) from arguments{mode_str}:{RESET_COLOR}")

    init_history_db()
    global_namespace = globals()
    global_namespace['open'] = open_df
    global_namespace['history'] = history
    global_namespace['clear_history'] = clear_history
    global_namespace['run'] = lambda: run_local(original_filepaths, global_namespace, save_history_entry)

    global_namespace['historic'] = historic_wrapper
    global_namespace['ORIGINAL_FILEPATHS'] = original_filepaths

    try:
        animate_loading("Initializing query run...")
        process_all_queries(original_filepaths, global_namespace, save_history_entry, historic=historic_mode)
        interactive_shell(global_namespace)
    except Exception as e:
        sys.stderr.write(f"{HEADING_COLOR}Error:{RESET_COLOR} {CONTENT_COLOR}{str(e)}{RESET_COLOR}\n")
        sys.exit(1)
