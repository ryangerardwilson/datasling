import sys
import time
from .config import Config

class UI:
    def __init__(self):
        self.config = Config()

    def animate_loading(self, message, duration=1):
        spinner = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']
        end_time = time.time() + duration
        while time.time() < end_time:
            for char in spinner:
                sys.stdout.write(f'\r{self.config.HEADING_COLOR}{message} {char}{self.config.RESET_COLOR}')
                sys.stdout.flush()
                time.sleep(0.1)
        sys.stdout.write(f'\r{self.config.HEADING_COLOR}{message} Done!{self.config.RESET_COLOR}\n')
        sys.stdout.flush()

    def typewriter_print(self, text, delay=0.001):
        for char in text:
            sys.stdout.write(char)
            sys.stdout.flush()
            time.sleep(delay)
        sys.stdout.write('\n')
        sys.stdout.flush()
