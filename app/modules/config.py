import os
from colorama import init

# Initialize colorama for cross-platform compatibility
init()

# Directory for storing query history
HISTORY_DIR = os.path.expanduser("~/Downloads/query_history")
os.makedirs(HISTORY_DIR, exist_ok=True)

# SQLite database for query history
HISTORY_DB = os.path.join(HISTORY_DIR, "query_history.db")

# Global variable placeholder (set by main.py)
ORIGINAL_FILEPATH = None

# Color definitions using ANSI escape codes
HEADING_COLOR = '\033[92m'  # Bright green (non-bold) for headings and subheadings
CONTENT_COLOR = '\033[94m'  # Bright blue (non-bold) for content like DataFrames, query text, etc.
RESET_COLOR = '\033[0m'     # Reset to default terminal color

VERSION = "0.0.39-1"

# Define ASCII_ART without formatting
ASCII_ART = r"""
            ▗▄▄▄  ▗▞▀▜▌   ■  ▗▞▀▜▌ ▗▄▄▖█ ▄ ▄▄▄▄
            ▐▌  █ ▝▚▄▟▌▗▄▟▙▄▖▝▚▄▟▌▐▌   █ ▄ █   █
            ▐▌  █        ▐▌        ▝▀▚▖█ █ █   █
            ▐▙▄▄▀        ▐▌       ▗▄▄▞▘█ █     ▗▄▖
                         ▐▌                   ▐▌ ▐▌
                                               ▝▀▜▌
                                              ▐▙▄▞▘
    ╔╗ ┬ ┬  ╦═╗┬ ┬┌─┐┌┐┌  ╔═╗┌─┐┬─┐┌─┐┬─┐┌┬┐  ╦ ╦┬┬  ┌─┐┌─┐┌┐┌
    ╠╩╗└┬┘  ╠╦╝└┬┘├─┤│││  ║ ╦├┤ ├┬┘├─┤├┬┘ ││  ║║║││  └─┐│ ││││
    ╚═╝ ┴   ╩╚═ ┴ ┴ ┴┘└┘  ╚═╝└─┘┴└─┴ ┴┴└──┴┘  ╚╩╝┴┴─┘└─┘└─┘┘└┘
"""
