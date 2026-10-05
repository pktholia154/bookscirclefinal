#!/usr/bin/env python3
"""
Generate PNG brand icons for BooksCircle using scripts/generate-brand-assets.js.
"""
import subprocess
import sys
import os

def main():
    root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    script_path = os.path.join(root_dir, 'scripts', 'generate-brand-assets.js')
    
    print(f"Executing brand assets generator: {script_path}")
    res = subprocess.run(['node', script_path], cwd=root_dir)
    sys.exit(res.returncode)

if __name__ == '__main__':
    main()
