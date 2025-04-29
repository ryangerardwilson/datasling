import os
from colorama import init

class Config:
    def __init__(self):
        init()
        self.HISTORY_DIR = os.path.expanduser("~/Downloads/query_history")
        os.makedirs(self.HISTORY_DIR, exist_ok=True)
        self.HISTORY_DB = os.path.join(self.HISTORY_DIR, "query_history.db")
        self.ORIGINAL_FILEPATH = None
        self.HEADING_COLOR = '\033[92m'
        self.CONTENT_COLOR = '\033[94m'
        self.RESET_COLOR = '\033[0m'
        self.ASCII_ART = r"""
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
