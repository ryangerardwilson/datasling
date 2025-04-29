import os
import pandas as pd
import subprocess
from datetime import datetime
from .config import Config
from rgwfuncs import load_data_from_path

class DataFrameUtils:
    def __init__(self):
        self.config = Config()

    def save_df_to_csv(self, df):
        if not isinstance(df, pd.DataFrame):
            return None

        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
        filename = f"{self.config.HISTORY_DIR}/{timestamp}.csv"

        try:
            df.to_csv(filename, index=False)
            return filename
        except Exception as e:
            print(f"Error saving DataFrame to CSV: {str(e)}")
            if os.path.exists(filename):
                os.unlink(filename)
            return None

    def open_df(self, df):
        if not isinstance(df, pd.DataFrame):
            print(f"Error: {df} is not a valid DataFrame")
            return

        file_path = self.save_df_to_csv(df) if df is not None else None
        if file_path:
            try:
                subprocess.Popen(['libreoffice', '--calc', file_path], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
                print(f"Opened {file_path} in LibreOffice Calc")
                return file_path
            except Exception as e:
                print(f"Error opening DataFrame: {str(e)}")
        else:
            print("Failed to save or open the DataFrame")

    def load_data_from_path(self, file_path):
        return load_data_from_path(file_path)
