import sys
import time
import threading
from .config import Config
from .ui import UI
from .file_utils import FileUtils
from rgwfuncs import load_data_from_query

class QueryProcessor:
    def __init__(self, history_manager):
        self.config = Config()
        self.ui = UI()
        self.file_utils = FileUtils()
        self.history_manager = history_manager
        self.lock = threading.Lock()  # Lock for synchronizing dictionary access

    def process_query(self, query, preset, result_dict, df_name, start_time_dict, end_time_dict):
        try:
            with self.lock:  # Synchronize access to dictionaries
                start_time_dict[df_name] = time.time()
            df = load_data_from_query(preset, query)
            with self.lock:  # Synchronize access to dictionaries
                result_dict[df_name] = df
                end_time_dict[df_name] = time.time()
                elapsed = end_time_dict[df_name] - start_time_dict[df_name]
                print(f"{self.config.CONTENT_COLOR} Done '{df_name}'{self.config.RESET_COLOR}")
        except Exception as e:
            with self.lock:  # Synchronize access to dictionaries
                result_dict[df_name] = f"Error executing query: {str(e)}"
                end_time_dict[df_name] = time.time()
                elapsed = end_time_dict[df_name] - start_time_dict[df_name]
                print(f"{self.config.HEADING_COLOR}Error '{df_name}': {elapsed:.2f}s - {str(e)}{self.config.RESET_COLOR}")

    def run_local(self, original_filepaths, global_namespace, save_callback):
        if original_filepaths:
            print(f"{self.config.HEADING_COLOR}Re-running queries from {len(original_filepaths)} file(s):{self.config.RESET_COLOR}")
            self.ui.animate_loading("Processing queries...")
            self.process_all_queries(original_filepaths, global_namespace, save_callback, historic=False)
        else:
            print(f"{self.config.HEADING_COLOR}Error:{self.config.RESET_COLOR} {self.config.CONTENT_COLOR} No original file paths available to re-run queries.{self.config.RESET_COLOR}")

    def process_all_queries(self, filepaths, global_namespace, save_callback, historic=False):
        all_queries = []
        for filepath in filepaths:
            queries = self.file_utils.collect_queries(filepath)
            all_queries.extend(queries)

        if not all_queries:
            raise ValueError("No valid SQL queries found in any file.")

        threads = []
        results = {}
        start_times = {}
        end_times = {}

        if historic:
            for df_name, preset, query in all_queries:
                df, hist_preset, hist_query, timestamp = self.history_manager.get_historic_df(df_name)
                with self.lock:
                    start_times[df_name] = time.time()
                    end_times[df_name] = time.time()
                    if df is not None:
                        results[df_name] = df
                        print(f"{self.config.HEADING_COLOR}Loaded historic {df_name} (preset: {hist_preset}, timestamp: {timestamp}):{self.config.RESET_COLOR}")
                        print(f"{self.config.CONTENT_COLOR}{df}{self.config.RESET_COLOR}")
                        print()
                        save_callback(df_name, hist_preset, hist_query, df)
                    else:
                        print(f"{self.config.HEADING_COLOR}Warning:{self.config.RESET_COLOR} {self.config.CONTENT_COLOR}No historic data found for {df_name}{self.config.RESET_COLOR}")
                        results[df_name] = f"No historic data available"
        else:
            # Start total time counter thread
            stop_counter = threading.Event()
            def total_time_counter(start_time):
                last_length = 0
                while not stop_counter.is_set():
                    elapsed = time.time() - start_time
                    counter_line = f"{self.config.CONTENT_COLOR}Total time: {elapsed:.2f}s{self.config.RESET_COLOR}"
                    plain_counter = f"Total time: {elapsed:.2f}s"
                    sys.stdout.write(f"\r{' ' * last_length}\r{counter_line}")
                    sys.stdout.flush()
                    last_length = len(plain_counter)
                    time.sleep(0.01)  # Update every 0.5 seconds
                # Clear the counter line
                sys.stdout.write(f"\r{' ' * last_length}\r")
                sys.stdout.flush()

            # Start query threads
            process_start_time = time.time()
            counter_thread = threading.Thread(target=total_time_counter, args=(process_start_time,))
            counter_thread.start()

            for df_name, preset, query in all_queries:
                thread = threading.Thread(target=self.process_query, args=(query, preset, results, df_name, start_times, end_times))
                threads.append(thread)
                thread.start()

            # Wait for all query threads to complete
            for thread in threads:
                thread.join()

            # Stop the counter thread
            stop_counter.set()
            counter_thread.join()

        # Process DataFrames in ascending order of names
        for df_name in sorted(results.keys()):
            if not historic or isinstance(results[df_name], str):
                qindex = [q[0] for q in all_queries].index(df_name)
                query_tuple = all_queries[qindex]
                query_text = query_tuple[2]
                elapsed_time = end_times.get(df_name, time.time()) - start_times.get(df_name, 0)

                if isinstance(results[df_name], str):
                    save_callback(df_name, query_tuple[1], query_text, None)
                elif not historic:
                    global_namespace[df_name] = results[df_name]
                    load_msg = f"{self.config.HEADING_COLOR}Loaded {df_name} (preset: {query_tuple[1]}, {elapsed_time:.2f}s):{self.config.RESET_COLOR}"
                    self.ui.typewriter_print(load_msg)
                    df_output = f"{self.config.CONTENT_COLOR}{results[df_name]}{self.config.RESET_COLOR}"
                    print(df_output)
                    print()
                    save_callback(df_name, query_tuple[1], query_text, results[df_name])
            else:
                global_namespace[df_name] = results[df_name]
