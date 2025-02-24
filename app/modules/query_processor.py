import re
import threading
import subprocess
import io
import builtins
import sys
import time
from modules.config import HEADING_COLOR, CONTENT_COLOR, RESET_COLOR
from rgwfuncs import load_data_from_query


def remove_multiline_comments(content):
    return re.sub(r'/\*.*?\*/', '', content, flags=re.DOTALL)


def process_query(query, preset, result_dict, df_name):
    try:
        df = load_data_from_query(preset, query)
        result_dict[df_name] = df
    except Exception as e:
        result_dict[df_name] = f"Error executing query: {str(e)}"


def typewriter_print(text, delay=0.02, file=sys.stdout):
    """Print text with a typewriter effect, using the specified output stream."""
    for char in text:
        file.write(char)
        file.flush()
        time.sleep(delay)
    file.write('\n')
    file.flush()


def process_sql_file(filepath, global_namespace, save_callback):
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
    for df_name, preset, query in queries:
        thread = threading.Thread(target=process_query, args=(query, preset, results, df_name))
        threads.append(thread)
        thread.start()

    for thread in threads:
        thread.join()

    # print(f"Debug - HEADING_COLOR: {repr(HEADING_COLOR)}, CONTENT_COLOR: {repr(CONTENT_COLOR)}, RESET_COLOR: {repr(RESET_COLOR)}")

    for df_name in results:
        qindex = [q[0] for q in queries].index(df_name)
        query_tuple = queries[qindex]
        query_text = query_tuple[2]

        if isinstance(results[df_name], str):
            error_msg = f"{HEADING_COLOR}Failed to load {df_name}:{RESET_COLOR} {CONTENT_COLOR}{results[df_name]}{RESET_COLOR}"
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
            load_msg = f"{HEADING_COLOR}Loaded {df_name} (preset: {query_tuple[1]}):{RESET_COLOR}"
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
