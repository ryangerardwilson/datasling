from .config import Config

class Info:
    def __init__(self):
        self.config = Config()

    def display(self):
        instructions = f"""
{self.config.HEADING_COLOR}================================ INFO =================================={self.config.RESET_COLOR}

{self.config.HEADING_COLOR}Overview:{self.config.RESET_COLOR}
{self.config.CONTENT_COLOR}DataSling is a Python-based tool for processing SQL queries from .sql
files, executing them against predefined data sources,
and managing the results as pandas DataFrames in an
interactive shell.{self.config.RESET_COLOR}

{self.config.HEADING_COLOR}Quickstart/ Step I{self.config.RESET_COLOR}
{self.config.CONTENT_COLOR}Define your database presets in a ~/.rgwfuncsrc
file. See the rgwfuncs documentation
(https://pypi.org/project/rgwfuncs/) for more info about
available database types.
    {{
      "db_presets" : [
        {{
          "name": "redshift",
          "db_type": "mssql",
          "host": "YOUR_HOST",
          "username": "YOUR_USERNAME",
          "password": "YOUR_PASSWORD",
          "database": "YOUR_DATABASE"
        }},
        {{
          "name": "snowflake",
          "db_type": "mysql",
          "host": "YOUR_HOST",
          "username": "YOUR_USERNAME",
          "password": "YOUR_PASSWORD",
          "database": "YOUR_DATABASE"
        }}
    }}{self.config.RESET_COLOR}

{self.config.HEADING_COLOR}Quickstart/ Step II{self.config.RESET_COLOR}
{self.config.CONTENT_COLOR}Create one or more .sql files containing your SQL
queries in the below format, using 'df_name@preset::preset_name'
directive to define DataFrame name and preset.

    /* Getting table1 data */
    df1@preset::redshift
    SELECT * FROM table1 LIMIT 10

    /* Getting table2 data */
    df2@preset::snowflake
    SELECT * FROM table2 WHERE date > '2023-01-01'

{self.config.HEADING_COLOR}Quickstart/ Step III{self.config.RESET_COLOR}
{self.config.CONTENT_COLOR}Invoke datasling with optional file/directory arguments and flags:
    datasling [--historic] [<sql_file_or_directory>...]

    Examples:
    datasling                     # Process all .sql files in
                                  # current directory
    datasling queries.sql         # Process a single file
    datasling dir1 queries.sql    # Process multiple files/directories
    datasling --historic          # Use most recent historic data
                                  # for all .sql files in current directory
    datasling --historic q.sql    # Use most recent historic data for
                                  # specified file

{self.config.HEADING_COLOR}Explore Utilities{self.config.RESET_COLOR}
{self.config.CONTENT_COLOR}The following utilities are available in the interactive shell:

- open(df_name): Open DataFrame in LibreOffice Calc
- history(n): Show last n query history entries. Defaults to 10.
- clear_history(): Clear all query history
- run(): Re-run all original SQL files (respects --historic flag
  from initial run)
- historic(["df1","df2"]): Reload all (if no args) or specified
  DataFrames from history
- info(): Show this documentation

{self.config.HEADING_COLOR}Tips{self.config.RESET_COLOR}
{self.config.CONTENT_COLOR}- Only files with .sql extension will be processed
- If no arguments are provided, all .sql files in the current
  directory are processed
- DataFrame names must be unique across all processed files
  (conflicts will prevent execution, ignored in historic mode)
- Use --historic flag to load the most recent saved version of
  DataFrames instead of running queries
- Use historic() in shell to reload DataFrames from history at
  any time
- Use comments (--) to organize your SQL files
- Check history() for past query results
- Use open() to explore large DataFrames externally
- History is limited to last 40 entries (older entries auto-deleted){self.config.RESET_COLOR}
"""
        print(instructions)
