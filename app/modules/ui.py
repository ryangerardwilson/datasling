import sys
import time
from modules.config import HEADING_COLOR, RESET_COLOR  # Add this import


def animate_loading(message, duration=1):
    spinner = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']
    end_time = time.time() + duration
    while time.time() < end_time:
        for char in spinner:
            sys.stdout.write(f'\r{HEADING_COLOR}{message} {char}{RESET_COLOR}')
            sys.stdout.flush()
            time.sleep(0.1)
    sys.stdout.write(f'\r{HEADING_COLOR}{message} Done!{RESET_COLOR}\n')
    sys.stdout.flush()


def typewriter_print(text, delay=0.001):
    """Print text with a typewriter effect."""
    for char in text:
        sys.stdout.write(char)
        sys.stdout.flush()
        time.sleep(delay)
    sys.stdout.write('\n')
    sys.stdout.flush()
