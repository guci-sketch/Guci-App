import os
import glob
import re

def replace_firebase_imports():
    files = glob.glob('src/**/*.tsx', recursive=True) + glob.glob('src/**/*.ts', recursive=True)
    for f in files:
        with open(f, 'r', encoding='utf-8') as file:
            content = file.read()

        # Check if file has firebase/firestore or firebase/auth imports
        if 'firebase/firestore' in content or 'firebase/auth' in content:
            # How deep is the file?
            depth = f.count(os.sep)
            if depth == 1:
                prefix = './'
            else:
                prefix = '../' * (depth - 1)
            
            lib_path = prefix + 'lib/firebase'

            # Replace firebase/firestore
            content = re.sub(r'from\s+[\'"]firebase/firestore[\'"]', f'from "{lib_path}"', content)
            
            # Replace firebase/auth
            content = re.sub(r'from\s+[\'"]firebase/auth[\'"]', f'from "{lib_path}"', content)
            
            with open(f, 'w', encoding='utf-8') as file:
                file.write(content)
            print(f"Fixed {f}")

if __name__ == '__main__':
    replace_firebase_imports()
