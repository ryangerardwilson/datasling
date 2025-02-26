import re
import sys
import time
import threading
import io
import builtins
from .config import HEADING_COLOR, CONTENT_COLOR, RESET_COLOR
from .ui import animate_loading, typewriter_print
from rgwfuncs import load_data_from_query


def _remove_multiline_comments(content):
    """Helper function to remove multiline SQL comments."""
    return re.sub(r'/\*.*?\*/', '', content, flags=re.DOTALL)


def collect_queries(filepath):
    """Collect queries from a file without executing them."""
    with builtins.open(filepath, 'r') as f:
        content = f.read()

    content = _remove_multiline_comments(content)
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
        raise ValueError(f"No valid SQL queries found in {filepath}")

    return queries


def process_query(query, preset, result_dict, df_name, start_time_dict, end_time_dict):
    """Execute a single query and store the result."""
    try:
        start_time = time.time()
        start_time_dict[df_name] = start_time
        df = load_data_from_query(preset, query)
        result_dict[df_name] = df
        end_time_dict[df_name] = time.time()
    except Exception as e:
        result_dict[df_name] = f"Error executing query: {str(e)}"
        end_time_dict[df_name] = time.time()


def run_local(original_filepaths, global_namespace, save_callback):
    """Re-run queries from provided file paths."""
    if original_filepaths:
        print(f"{HEADING_COLOR}Re-running queries from {len(original_filepaths)} file(s):{RESET_COLOR}")
        animate_loading("Processing queries...")
        process_all_queries(original_filepaths, global_namespace, save_callback, historic=False)
    else:
        print(f"{HEADING_COLOR}Error:{RESET_COLOR} {CONTENT_COLOR}No original file paths available to re-run queries.{RESET_COLOR}")


def process_all_queries(filepaths, global_namespace, save_callback, historic=False):
    """Process all queries from multiple files, with optional historic mode."""
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
        from .history_manager import get_historic_df
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
                save_callback(df_name, query_tuple[1], query_text, None)
            elif not historic:
                global_namespace[df_name] = results[df_name]
                load_msg = f"{HEADING_COLOR}Loaded {df_name} (preset: {query_tuple[1]}, {elapsed_time:.2f}s):{RESET_COLOR}"
                typewriter_print(load_msg)
                df_output = f"{CONTENT_COLOR}{results[df_name]}{RESET_COLOR}"
                print(df_output)
                print()
                save_callback(df_name, query_tuple[1], query_text, results[df_name])
        else:
            global_namespace[df_name] = results[df_name]


def process_sql_file(filepath, global_namespace, save_callback):
    """Process and execute queries from a single SQL file (legacy function)."""
    queries = collect_queries(filepath)

    threads = []
    results = {}
    start_times = {}
    end_times = {}

    for df_name, preset, query in queries:
        thread = threading.Thread(target=process_query, args=(query, preset, results, df_name, start_times, end_times))
        threads.append(thread)
        thread.start()

    active_threads = threads.copy()
    while active_threads:
        current_time = time.time()
        running_status = []
        completed_status = []

        for df_name, _, _ in queries:
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
            save_callback(df_name, query_tuple[1], query_text, None)
        else:
            global_namespace[df_name] = results[df_name]
            load_msg = f"{HEADING_COLOR}Loaded {df_name} (preset: {query_tuple[1]}, {elapsed_time:.2f}s):{RESET_COLOR}"
            typewriter_print(load_msg)
            df_output = f"{CONTENT_COLOR}{results[df_name]}{RESET_COLOR}"
            print(df_output)
            print()
            save_callback(df_name, query_tuple[1], query_text, results[df_name])
