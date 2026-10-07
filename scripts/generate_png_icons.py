#!/usr/bin/env python3
import subprocess
import sys
import os

def main():
    script_path = os.path.join(os.path.dirname(__file__), 'generate_logo.js')
    result = subprocess.run(['node', script_path], check=False)
    sys.exit(result.returncode)

if __name__ == '__main__':
    main()
