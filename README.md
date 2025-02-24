# Datasling

A tool for processing SQL queries from a file, executing them against predefined data sources, and managing the results as pandas DataFrames in an interactive shell.

## 1. Installation/ Upgrade to Latest Version

    bash -c "sh <(curl -fsSL https://files.ryangerardwilson.com/datasling/install.sh)"

## 2. Subsequent Updates

    sudo apt update
    sudo apt install --only-upgrade datasling

## 3. Usage

### 3.1. Quickstart

#### 3.1.1. Step I

Define your database presets in a ~/.rgwfuncsrc file. See the rgwfuncs documentation (https://pypi.org/project/rgwfuncs/) for more info  about available database types.

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
    }

#### 3.1.2. Step II

Create a file, containing your sql queries in the below format, using `df_name@preset::preset_name` directive to define DataFrame name and  preset. For instance, the below syntax would store the query results in df1 and df2, respectively.

    /* Getting table1 data */
    df1@preset::redshift
    SELECT * FROM table1 LIMIT 10
  
    /* Getting table2 data */
    df2@preset::snowflake
    SELECT * FROM table2 WHERE date > '2023-01-01'

The below syntax would store the query results in df1 and df2, respectively. Further, content inside /* ... */ will not be evaluated.

#### 3.1.3. Step III

Invoke datasling against your file.

    datasling <your_file>

### 3.2 Utilities

The following utilities are available in the interactive shell:

- `open(df_name)`: Open DataFrame in LibreOffice Calc
- `history(n)`: Show last n query history entries. Defaults to 10.
- `clear_history()`: Clear all query history
- `run()`: Re-run the original SQL file
- `info()`: Show this documentation

### 3.3. Tips
- Use comments (--) to organize your SQL file
- Query inputs and outputs are copied to clipboard with the print of the 
  query df, or error message (in case execution failed). You can paste 
  this into your AI tool of choice for quick debugging.
- Check history() for past query results
- Use open() to explore large DataFrames externally
- History is limited to last 40 entries (older entries auto-deleted)

## 4. License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.


