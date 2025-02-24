import os


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
    from .query_processor import collect_queries  # Import here to avoid circular dependency
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
