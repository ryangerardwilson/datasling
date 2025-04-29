import os
import re
import sys
import builtins
from .config import Config

class FileUtils:
    def __init__(self):
        self.config = Config()

    def is_sql_file(self, filepath):
        return os.path.isfile(filepath) and filepath.lower().endswith('.sql')

    def get_sql_files(self, args=None):
        sql_files = []
        if args is None:
            current_dir = os.getcwd()
            for f in os.listdir(current_dir):
                full_path = os.path.join(current_dir, f)
                if self.is_sql_file(full_path):
                    sql_files.append(full_path)
        else:
            for arg in args:
                if os.path.isdir(arg):
                    for root, _, files in os.walk(arg):
                        sql_files.extend(os.path.join(root, f) for f in files if self.is_sql_file(os.path.join(root, f)))
                elif self.is_sql_file(arg):
                    sql_files.append(arg)
        return sorted(sql_files)

    def check_df_conflicts(self, filepaths):
        all_queries = {}
        conflicts = {}

        for filepath in filepaths:
            queries = self.collect_queries(filepath)
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

    def collect_queries(self, filepath):
        with builtins.open(filepath, 'r') as f:
            content = f.read()

        content = self._remove_multiline_comments(content)
        lines = content.splitlines()

        queries = []
        current_query = []
        current_df_name = None
        current_preset = None

        for line in lines:
            line = line.rstrip()
            if not line or line.startswith("--"):
                if current_query and current_df_name and current_preset:
                    query_text = "\n".join(current_query).strip()
                    if query_text and not all(q.strip().startswith("--") or not q.strip() for q in current_query):
                        queries.append((current_df_name, current_preset, query_text))
                    current_query = []
                    current_df_name = None
                    current_preset = None
                continue

            directive_match = re.match(r'(\w+)@preset::(\w+)', line)
            if directive_match:
                if current_query and current_df_name and current_preset:
                    query_text = "\n".join(current_query).strip()
                    if query_text and not all(q.strip().startswith("--") or not q.strip() for q in current_query):
                        queries.append((current_df_name, current_preset, query_text))
                    current_query = []
                current_df_name = directive_match.group(1)
                current_preset = directive_match.group(2)
            elif current_df_name and current_preset:
                current_query.append(line)

        if current_query and current_df_name and current_preset:
            query_text = "\n".join(current_query).strip()
            if query_text and not all(q.strip().startswith("--") or not q.strip() for q in current_query):
                queries.append((current_df_name, current_preset, query_text))

        if not queries:
            print(f"{self.config.CONTENT_COLOR}Error: No valid SQL queries found in {filepath}.{self.config.RESET_COLOR}")
            sys.exit(1)

        return queries

    def _remove_multiline_comments(self, content):
        return re.sub(r'/\*.*?\*/', '', content, flags=re.DOTALL)
