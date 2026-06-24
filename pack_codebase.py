import os

# Files or directories to completely ignore
EXCLUDE_DIRS = {'.git', '.venv', 'node_modules', 'dist', '.gemini', '__pycache__'}
EXCLUDE_FILES = {'package-lock.json', 'pack_codebase.py', 'test.json', 'binaa_codebase.txt'}
ALLOWED_EXTENSIONS = {'.py', '.jsx', '.css', '.html', '.md', '.json', '.js'}

output_filename = "binaa_codebase.txt"

with open(output_filename, "w", encoding="utf-8") as outfile:
    # Write a quick header
    outfile.write("# BINAA Codebase Export\n")
    outfile.write("This file contains the full source code structure and contents of the BINAA project.\n\n")
    
    for root, dirs, files in os.walk("."):
        # Modifying dirs in-place filters out excluded directories from traversal
        dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS]
        
        for file in files:
            if file in EXCLUDE_FILES:
                continue
            
            ext = os.path.splitext(file)[1]
            if ext in ALLOWED_EXTENSIONS:
                filepath = os.path.join(root, file)
                # Normalize path separators for readability
                display_path = filepath.replace("\\", "/")
                
                print(f"Packing: {display_path}")
                outfile.write(f"\n\n{'='*80}\n")
                outfile.write(f"FILE: {display_path}\n")
                outfile.write(f"{'='*80}\n\n")
                
                try:
                    with open(filepath, "r", encoding="utf-8") as infile:
                        outfile.write(infile.read())
                except Exception as e:
                    outfile.write(f"// Error reading file: {str(e)}\n")

print(f"\nSuccess! Codebase packed into {output_filename}")
