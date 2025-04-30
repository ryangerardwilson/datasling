# DATASLING

datasling is a tool for processing SQL queries from .sql files, executing them against predefined data sources, and managing the results as pandas DataFrames in an interactive shell.

## 1. Installation

To install, add the APT repository and install the package using the following command:

    bash -c "sh <(curl -fsSL https://files.ryangerardwilson.com/datasling/install.sh)"

After installation, the `datasling` command is available system-wide.
 
## 2. Get Latest Version

    sudo apt update
    sudo apt install --only-upgrade datasling

## 3. Usage

datasling allows you to process one or more .sql files (only files with the .sql extension will be processed). If no file or directory arguments are provided, DataSling processes all .sql files in the current directory.

### 3.1. Step 1 – Define Your Database Presets

Create (or update) your ~/.rgwfuncsrc file with the required database presets. (For more details, check out the [rgwfuncs documentation](https://pypi.org/project/rgwfuncs/).) For example:

    {
      "db_presets" : [
        {
          "name": "redshift",
          "db_type": "mssql",
          "host": "YOUR_HOST",
          "username": "YOUR_USERNAME",
          "password": "YOUR_PASSWORD",
          "database": "YOUR_DATABASE"
        },
        {
          "name": "snowflake",
          "db_type": "mysql",
          "host": "YOUR_HOST",
          "username": "YOUR_USERNAME",
          "password": "YOUR_PASSWORD",
          "database": "YOUR_DATABASE"
        }
      ]
    }

### 3.2. Step 2 – Create Your SQL Files

Write one or more .sql files containing your SQL queries. Use the `df_name@preset::preset_name` directive to define the DataFrame name and specify which preset to use. Comments (/* ... */ or -- style) are ignored during execution. For example:

    /* Getting data from table1 */
    df1@preset::redshift
    SELECT * FROM table1 LIMIT 10
  
    /* Getting data from table2 */
    df2@preset::snowflake
    SELECT * FROM table2 WHERE date > '2023-01-01'

Note:
- DataFrame names must be unique across all processed files.  
- If duplicate names are detected, execution will be halted (unless running in historic mode).

### 3.3. Step 3 – Run datasling

Invoke datasling from the command line with optional file/directory arguments and flags:

    datasling [--historic] [<sql_file_or_directory>...]

Examples:

    # Process all .sql files in the current directory:  
    datasling

    # Process a single file:
    datasling queries.sql

    # Process multiple files or directories:
    datasling dir1 queries.sql

    # Run using historic data (loads the most recent saved DataFrames instead of executing queries):
    datasling --historic
    datasling --historic q.sql

### 3.4 Utilities in the Interactive Shell

After running your queries, datasling opens an interactive shell where you can use these utilities:

    # Open the specified DataFrame in LibreOffice Calc.
    open(df_name)

    # Show the last n query history entries (defaults to 10).
    history(n)

    # Clear all query history.
    clear_history()

    # Re-run all original SQL files (this respects any --historic flag used during the initial run).
    run()

    # Reload all (if no args) or specified DataFrames from history
    historic(["df1","df2", ...]): Reload all (if no args) or specified DataFrames from history

    # Display detailed instructions and documentation.
    info()

## 4. Tips

• Only files with the .sql extension will be processed.  
• If no arguments are provided, datasling processes all .sql files in the current directory.  
• Use the --historic flag to load the most recent saved version of DataFrames instead of re-executing the queries.  
• DataFrame names must be unique across all processed files. Conflicts will prevent execution (though they are ignored in historic mode).  
• Use comments (/* ... */ or --) to organize your SQL files.  
• Query inputs and outputs are automatically copied to the clipboard along with any error messages—great for quick debugging with your favorite AI tool.  
• Check history() for a summary of past query results.  
• Use open() to explore large DataFrames externally.  
• Query history is limited to the last 40 entries (older entries are auto-deleted).

## 5. License

This project is licensed under the MIT License – see the [LICENSE](LICENSE) file for details.

