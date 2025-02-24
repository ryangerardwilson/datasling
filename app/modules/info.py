# ~/Apps/datasling/app/modules/info.py
from modules.config import HEADING_COLOR, CONTENT_COLOR, RESET_COLOR


def info():
    """
    Display detailed usage instructions for the DataSling application.
    """
    instructions = f"""
{HEADING_COLOR}================================ INFO =================================={RESET_COLOR}

{HEADING_COLOR}Overview:{RESET_COLOR}
{CONTENT_COLOR}DataSling is a Python-based tool for processing SQL queries from .sql files,
executing them against predefined data sources, and managing the results
as pandas DataFrames in an interactive shell.{RESET_COLOR}

{HEADING_COLOR}Quickstart/ Step I{RESET_COLOR}
{CONTENT_COLOR}Define your database presets in a ~/.rgwfuncsrc file. See the rgwfuncs
documentation (https://pypi.org/project/rgwfuncs/) for more info
about available database types.
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
    }}{RESET_COLOR}

{HEADING_COLOR}Quickstart/ Step II{RESET_COLOR}
{CONTENT_COLOR}Create one or more .sql files containing your SQL queries in the below format,
using 'df_name@preset::preset_name' directive to define DataFrame name and preset.

    /* Getting table1 data */
    df1@preset::redshift
    SELECT * FROM table1 LIMIT 10

    /* Getting table2 data */
    df2@preset::snowflake
    SELECT * FROM table2 WHERE date > '2023-01-01'

{HEADING_COLOR}Quickstart/ Step III{RESET_COLOR}
{CONTENT_COLOR}Invoke datasling with optional file/directory arguments and flags:
    datasling [--historic] [<sql_file_or_directory>...]

    Examples:
    datasling                     # Process all .sql files in current directory
    datasling queries.sql         # Process a single file
    datasling dir1 queries.sql    # Process multiple files/directories
    datasling --historic          # Use most recent historic data for all .sql files in current directory
    datasling --historic q.sql    # Use most recent historic data for specified file

{HEADING_COLOR}Explore Utilities{RESET_COLOR}
{CONTENT_COLOR}The following utilities are available in the interactive shell:

- open(df_name): Open DataFrame in LibreOffice Calc
- history(n): Show last n query history entries. Defaults to 10.
- clear_history(): Clear all query history
- run(): Re-run all original SQL files (respects --historic flag from initial run)
- info(): Show this documentation

{HEADING_COLOR}Tips{RESET_COLOR}
{CONTENT_COLOR}- Only files with .sql extension will be processed
- If no arguments are provided, all .sql files in the current directory are processed
- DataFrame names must be unique across all processed files (conflicts will prevent execution, ignored in historic mode)
- Use --historic flag to load the most recent saved version of DataFrames instead of running queries
- Use comments (--) to organize your SQL files
- Query inputs and outputs are copied to clipboard with the print
  of the query df, or error message (in case execution failed)
- Check history() for past query results
- Use open() to explore large DataFrames externally
- History is limited to last 40 entries (older entries auto-deleted){RESET_COLOR}
"""
    print(instructions)
