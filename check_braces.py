import sys

def check_brackets(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    stack = []
    lines = content.split('\n')
    
    for i, line in enumerate(lines):
        for j, char in enumerate(line):
            if char in '({[':
                stack.append((char, i+1, j+1))
            elif char in ')}]':
                if not stack:
                    print(f"Unmatched closing {char} at line {i+1}:{j+1}")
                    return
                last_char, last_line, last_col = stack.pop()
                if (last_char == '(' and char != ')') or \
                   (last_char == '{' and char != '}') or \
                   (last_char == '[' and char != ']'):
                    print(f"Mismatched closing {char} at line {i+1}:{j+1}. Expected closing for {last_char} from line {last_line}:{last_col}")
                    return

    if stack:
        print("Unclosed brackets:")
        for char, line, col in stack:
            print(f"  {char} at line {line}:{col}")
    else:
        print("All brackets match!")

check_brackets("admin/src/modules/cost360/pages/AIApuGeneratorPage.jsx")
