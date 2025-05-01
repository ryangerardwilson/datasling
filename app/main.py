#!/usr/bin/env python3
import sys
from rgwfuncs import interactive_shell
from modules.config import Config
from modules.history_manager import HistoryManager
from modules.query_processor import QueryProcessor
from modules.ui import UI
from modules.file_utils import FileUtils
from modules.info import Info
from modules.df_utils import DataFrameUtils
from modules.db import Database

class DataSlingApp:
    def __init__(self):
        self.config = Config()
        self.history_manager = HistoryManager()
        self.query_processor = QueryProcessor(self.history_manager)
        self.ui = UI()
        self.file_utils = FileUtils()
        self.info = Info()
        self.df_utils = DataFrameUtils()
        self.db = Database()
        self.global_namespace = {}

    def run(self, args):
        self.ui.typewriter_print(f"{self.config.HEADING_COLOR}{self.config.ASCII_ART}{self.config.RESET_COLOR}")

        historic_mode = '--historic' in args
        if historic_mode:
            args.remove('--historic')

        filepaths = self.file_utils.get_sql_files(args if args else None)

        if not filepaths:
            self._handle_no_files(args)
            return

        conflicts = self.file_utils.check_df_conflicts(filepaths)
        if conflicts and not historic_mode:
            self._handle_conflicts(conflicts)
            return

        self.ui.typewriter_print(f"{self.config.CONTENT_COLOR}[INFO] Need help? Execute 'info()' to see the quickstart.{self.config.RESET_COLOR}")
        print()
        mode_str = " (historic mode)" if historic_mode else ""
        if not args:
            print(f"{self.config.HEADING_COLOR}Processing {len(filepaths)} .sql file(s) found in current directory{mode_str}:{self.config.RESET_COLOR}")
        else:
            print(f"{self.config.HEADING_COLOR}Processing {len(filepaths)} .sql file(s) from arguments{mode_str}:{self.config.RESET_COLOR}")

        self.db.init_history_db()
        self._setup_global_namespace(filepaths)
        
        try:
            self.ui.animate_loading("Initializing query run...")
            self.query_processor.process_all_queries(filepaths, self.global_namespace, self.db.save_history_entry, historic=historic_mode)
            interactive_shell(self.global_namespace)
        except Exception as e:
            sys.stderr.write(f"{self.config.HEADING_COLOR}Error:{self.config.RESET_COLOR} {self.config.CONTENT_COLOR}{str(e)}{self.config.RESET_COLOR}\n")
            sys.exit(1)

    def _handle_no_files(self, args):
        if args:
            sys.stderr.write(f"{self.config.HEADING_COLOR}Error:{self.config.RESET_COLOR} {self.config.CONTENT_COLOR}No .sql files found in provided arguments.{self.config.RESET_COLOR}\n")
        else:
            sys.stderr.write(f"{self.config.HEADING_COLOR}Error:{self.config.RESET_COLOR} {self.config.CONTENT_COLOR}No .sql files found in current directory.{self.config.RESET_COLOR}\n")
        sys.stderr.write(f"{self.config.HEADING_COLOR}Usage:{self.config.RESET_COLOR} {self.config.CONTENT_COLOR}datasling [--historic] [<sql_file_or_directory>...]{self.config.RESET_COLOR}\n")
        self.info.display()
        sys.exit(1)

    def _handle_conflicts(self, conflicts):
        sys.stderr.write(f"{self.config.HEADING_COLOR}Error: Conflicting DataFrame names found:{self.config.RESET_COLOR}\n")
        for filepath, df_names in conflicts.items():
            sys.stderr.write(f"{self.config.CONTENT_COLOR}{filepath}: {', '.join(sorted(df_names))}{self.config.RESET_COLOR}\n")
        sys.stderr.write(f"{self.config.HEADING_COLOR}Please resolve DataFrame name conflicts before proceeding.{self.config.RESET_COLOR}\n")
        sys.exit(1)

    def _setup_global_namespace(self, filepaths):
        self.global_namespace = globals()
        self.global_namespace['open'] = self.df_utils.open_df
        self.global_namespace['history'] = self.db.history
        self.global_namespace['clear_history'] = self.db.clear_history
        self.global_namespace['run'] = lambda: self.query_processor.run_local(filepaths, self.global_namespace, self.db.save_history_entry)
        self.global_namespace['historic'] = lambda df_names=None: self.history_manager.historic(df_names, self.global_namespace)
        self.global_namespace['ORIGINAL_FILEPATHS'] = filepaths

# Main function needed for effective PyPI Packaging
def main():
    app = DataSlingApp()
    app.run(sys.argv[1:])

if __name__ == "__main__":
    main()
