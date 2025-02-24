import re
import threading
import subprocess
import io
import builtins
import sys
import time
from modules.config import HEADING_COLOR, CONTENT_COLOR, RESET_COLOR
from modules.ui import typewriter_print
from rgwfuncs import load_data_from_query

def process_sql_file(filepath, global_namespace, save_callback):
    def remove_multiline_comments(content):
        return re.sub(r'/\*.*?\*/', '', content, flags=re.DOTALL)

    def process_query(query, preset, result_dict, df_name, start_time_dict, end_time_dict):
        try:
            start_time = time.time()
            start_time_dict[df_name] = start_time
            df = load_data_from_query(preset, query)
            result_dict[df_name] = df
            end_time_dict[df_name] = time.time()  # Store completion time
        except Exception as e:
            result_dict[df_name] = f"Error executing query: {str(e)}"
            end_time_dict[df_name] = time.time()  # Store completion time even on error

    with builtins.open(filepath, 'r') as f:
        content = f.read()

    content = remove_multiline_comments(content)
    lines = content.splitlines()

    queries = []
    current_query = []
    current_df_name = None
    current_preset = None

    for line in lines:
        line = line.rstrip()
        if not line or line.startswith("--"):
            if current_query and current_df_name and current_preset:
                queries.append((current_df_name, current_preset, "\n".join(current_query)))
                current_query = []
                current_df_name = None
                current_preset = None
            continue

        directive_match = re.match(r'(\w+)@preset::(\w+)', line)
        if directive_match:
            if current_query and current_df_name and current_preset:
                queries.append((current_df_name, current_preset, "\n".join(current_query)))
                current_query = []
            current_df_name = directive_match.group(1)
            current_preset = directive_match.group(2)
        elif current_df_name and current_preset:
            current_query.append(line)

    if current_query and current_df_name and current_preset:
        queries.append((current_df_name, current_preset, "\n".join(current_query)))

    if not queries:
        raise ValueError("No valid SQL queries found in the file.")

    threads = []
    results = {}
    start_times = {}
    end_times = {}  # New dictionary to store completion times

    for df_name, preset, query in queries:
        thread = threading.Thread(target=process_query, args=(query, preset, results, df_name, start_times, end_times))
        threads.append(thread)
        thread.start()

    # Display running status until all queries complete
    active_threads = threads.copy()
    while active_threads:
        current_time = time.time()
        running_status = []
        completed_status = []
        
        for df_name, _, _ in queries:
            if df_name in start_times:
                if df_name in end_times:
                    # Use stored end time for completed queries
                    elapsed = end_times[df_name] - start_times[df_name]
                    completed_status.append(f"'{df_name}': {elapsed:.2f}s (done)")
                else:
                    # Use current time for running queries
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
        
        time.sleep(0.1)  # Update every 100ms
        active_threads = [t for t in active_threads if t.is_alive()]

    # Print final status on a new line
    final_status = []
    for df_name, _, _ in queries:
        if df_name in start_times and df_name in end_times:
            elapsed = end_times[df_name] - start_times[df_name]
            final_status.append(f"'{df_name}': {elapsed:.2f}s (done)")
    print(f"\n{CONTENT_COLOR}Completed: {', '.join(final_status)}{RESET_COLOR}")

    for thread in threads:
        thread.join()

    for df_name in results:
        qindex = [q[0] for q in queries].index(df_name)
        query_tuple = queries[qindex]
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
        else:
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
