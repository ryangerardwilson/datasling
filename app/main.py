#!/usr/bin/env python3
import sys
import time
import os
import threading
import sqlite3
from rgwfuncs import interactive_shell, load_data_from_query
from modules.config import ASCII_ART, HEADING_COLOR, CONTENT_COLOR, RESET_COLOR, VERSION, HISTORY_DB
from modules.db import init_history_db, save_history_entry, history, clear_history
from modules.query_processor import collect_queries
from modules.ui import animate_loading, typewriter_print
from modules.df_utils import open_df, load_data_from_path
from modules.info import info
import subprocess
import io


def run_local(original_filepaths):
    if original_filepaths:
        print(f"{HEADING_COLOR}Re-running queries from {len(original_filepaths)} file(s):{RESET_COLOR}")
        animate_loading("Processing queries...")
        process_all_queries(original_filepaths, globals(), save_history_entry, historic=False)
    else:
        print(f"{HEADING_COLOR}Error:{RESET_COLOR} {CONTENT_COLOR}No original file paths available to re-run queries.{RESET_COLOR}")


def is_sql_file(filepath):
    return os.path.isfile(filepath) and filepath.lower().endswith('.sql')


def get_sql_files(args=None):
    sql_files = []
    if args is None:
        current_dir = os.getcwd()
        for f in os.listdir(current_dir):
            full_path = os.path.join(current_dir, f)
            if is_sql_file(full_path):
                sql_files.append(full_path)
    else:
        for arg in args:
            if os.path.isdir(arg):
                for root, _, files in os.walk(arg):
                    sql_files.extend(os.path.join(root, f) for f in files if is_sql_file(os.path.join(root, f)))
            elif is_sql_file(arg):
                sql_files.append(arg)
    return sorted(sql_files)


def check_df_conflicts(filepaths):
    all_queries = {}
    conflicts = {}

    for filepath in filepaths:
        queries = collect_queries(filepath)
        for df_name, preset, query in queries:
            if df_name in all_queries:
                if filepath not in conflicts:
                    conflicts[filepath] = set()
                conflicts[filepath].add(df_name)
                if all_queries[df_name][0] not in conflicts:
                    conflicts[all_queries[df_name][0]] = set()
                conflicts[all_queries[df_name][0]].add(df_name)
            all_queries[df_name] = (filepath, preset, query)

    return conflicts


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


def historic(df_names=None):
    """Reload DataFrames from their most recent history entries.

    Args:
        df_names (list, optional): List of DataFrame names to reload. If None, reloads all from original files.
    """
    global_namespace = globals()
    if df_names is None:
        # Reload all DataFrames from original files
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


def process_query(query, preset, result_dict, df_name, start_time_dict, end_time_dict):
    try:
        start_time = time.time()
        start_time_dict[df_name] = start_time
        df = load_data_from_query(preset, query)
        result_dict[df_name] = df
        end_time_dict[df_name] = time.time()
    except Exception as e:
        result_dict[df_name] = f"Error executing query: {str(e)}"
        end_time_dict[df_name] = time.time()


def process_all_queries(filepaths, global_namespace, save_callback, historic=False):
    all_queries = []
    for filepath in filepaths:
        queries = collect_queries(filepath)
        all_queries.extend(queries)

    if not all_queries:
        raise ValueError("No valid SQL queries found in any file.")

    threads = []
    results = {}
    start_times = {}
    end_times = {}

    if historic:
        for df_name, preset, query in all_queries:
            df, hist_preset, hist_query, timestamp = get_historic_df(df_name)
            if df is not None:
                results[df_name] = df
                start_times[df_name] = time.time()
                end_times[df_name] = time.time()
                print(f"{HEADING_COLOR}Loaded historic {df_name} (preset: {hist_preset}, timestamp: {timestamp}):{RESET_COLOR}")
                print(f"{CONTENT_COLOR}{df}{RESET_COLOR}")
                print()
                save_callback(df_name, hist_preset, hist_query, df)
            else:
                print(f"{HEADING_COLOR}Warning:{RESET_COLOR} {CONTENT_COLOR}No historic data found for {df_name}{RESET_COLOR}")
                results[df_name] = f"No historic data available"
                start_times[df_name] = time.time()
                end_times[df_name] = time.time()
    else:
        for df_name, preset, query in all_queries:
            thread = threading.Thread(target=process_query, args=(query, preset, results, df_name, start_times, end_times))
            threads.append(thread)
            thread.start()

        active_threads = threads.copy()
        while active_threads:
            current_time = time.time()
            running_status = []
            completed_status = []

            for df_name, _, _ in all_queries:
                if df_name in start_times:
                    if df_name in end_times:
                        elapsed = end_times[df_name] - start_times[df_name]
                        completed_status.append(f"'{df_name}': {elapsed:.2f}s (done)")
                    else:
                        elapsed = current_time - start_times[df_name]
                        running_status.append(f"'{df_name}': {elapsed:.2f}s")

            status_parts = []
            if running_status:
                status_parts.append(f"Running: {', '.join(running_status)}")
            if completed_status:
                status_parts.append(f"Completed: {', '.join(completed_status)}")

            if status_parts:
                status_line = f"\r{CONTENT_COLOR}{'; '.join(status_parts)}{RESET_COLOR}"
                sys.stdout.write(status_line)
                sys.stdout.flush()

            time.sleep(0.1)
            active_threads = [t for t in active_threads if t.is_alive()]

        final_status = []
        for df_name, _, _ in all_queries:
            if df_name in start_times and df_name in end_times:
                elapsed = end_times[df_name] - start_times[df_name]
                final_status.append(f"'{df_name}': {elapsed:.2f}s (done)")
        if final_status:
            print(f"\n{CONTENT_COLOR}Completed: {', '.join(final_status)}{RESET_COLOR}")

        for thread in threads:
            thread.join()

    for df_name in results:
        if not historic or isinstance(results[df_name], str):
            qindex = [q[0] for q in all_queries].index(df_name)
            query_tuple = all_queries[qindex]
            query_text = query_tuple[2]
            elapsed_time = end_times.get(df_name, time.time()) - start_times.get(df_name, 0)

            if isinstance(results[df_name], str):
                error_msg = f"{HEADING_COLOR}Failed to load {df_name} ({elapsed_time:.2f}s):{RESET_COLOR} {CONTENT_COLOR}{results[df_name]}{RESET_COLOR}"
                typewriter_print(error_msg)
                error_string = f"Query:\n{query_text}\nError: {results[df_name]}"
                try:
                    subprocess.run(['xclip', '-selection', 'clipboard'], input=error_string.encode(), check=True)
                    print(f"{CONTENT_COLOR}Copied query and error to clipboard.{RESET_COLOR}")
                except subprocess.CalledProcessError as e:
                    print(f"{HEADING_COLOR}Clipboard Error:{RESET_COLOR} {CONTENT_COLOR}{str(e)}{RESET_COLOR}")
                except FileNotFoundError:
                    print(f"{HEADING_COLOR}Clipboard Error:{RESET_COLOR} {CONTENT_COLOR}xclip not found. Please install xclip.{RESET_COLOR}")
                save_callback(df_name, query_tuple[1], query_text, None)
            elif not historic:
                global_namespace[df_name] = results[df_name]
                load_msg = f"{HEADING_COLOR}Loaded {df_name} (preset: {query_tuple[1]}, {elapsed_time:.2f}s):{RESET_COLOR}"
                typewriter_print(load_msg)
                df_output = f"{CONTENT_COLOR}{results[df_name]}{RESET_COLOR}"
                print(df_output)
                print()

                buffer = io.StringIO()
                print(results[df_name].head(10), file=buffer)
                df_printed_output = buffer.getvalue()
                success_string = f"Query:\n{query_text}\nOutput:\n{df_printed_output}"

                try:
                    subprocess.run(['xclip', '-selection', 'clipboard'], input=success_string.encode(), check=True)
                except subprocess.CalledProcessError as e:
                    print(f"{HEADING_COLOR}Clipboard Error:{RESET_COLOR} {CONTENT_COLOR}{str(e)}{RESET_COLOR}")
                except FileNotFoundError:
                    print(f"{HEADING_COLOR}Clipboard Error:{RESET_COLOR} {CONTENT_COLOR}xclip not found. Please install xclip.{RESET_COLOR}")

                save_callback(df_name, query_tuple[1], query_text, results[df_name])
        else:
            global_namespace[df_name] = results[df_name]


if __name__ == "__main__":
    formatted_art = f"{HEADING_COLOR}{ASCII_ART}                        Version {VERSION}{RESET_COLOR}"
    typewriter_print(formatted_art)
    print()

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
    global_namespace['run'] = lambda: run_local(original_filepaths)
    global_namespace['historic'] = historic  # Add historic function to shell
    global_namespace['ORIGINAL_FILEPATHS'] = original_filepaths

    try:
        animate_loading("Initializing query run...")
        process_all_queries(original_filepaths, global_namespace, save_history_entry, historic=historic_mode)
        interactive_shell(global_namespace)
    except Exception as e:
        sys.stderr.write(f"{HEADING_COLOR}Error:{RESET_COLOR} {CONTENT_COLOR}{str(e)}{RESET_COLOR}\n")
        sys.exit(1)
