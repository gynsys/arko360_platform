from PIL import Image

def lighten_dark_pixels(input_path, output_path):
    img = Image.open(input_path).convert("RGBA")
    data = img.getdata()
    
    new_data = []
    for r, g, b, a in data:
        if a > 0:
            # If it's a dark grayscale pixel (e.g., text)
            # We check if it's mostly gray (r,g,b are close to each other) and dark
            avg = (r + g + b) / 3
            diff = max(abs(r - avg), abs(g - avg), abs(b - avg))
            
            # If it's grayish and not too bright
            if diff < 20 and avg < 100:
                # Map avg from [0, 100] to [150, 220] to make it light gray
                # This preserves anti-aliasing to some extent
                new_val = int(150 + (avg / 100) * 70)
                new_data.append((new_val, new_val, new_val, a))
            else:
                new_data.append((r, g, b, a))
        else:
            new_data.append((r, g, b, a))
            
    img.putdata(new_data)
    img.save(output_path)
    print("Logo updated successfully.")

lighten_dark_pixels(r"C:\Users\pablo\Documents\arko360_platform\landing\public\images\logo_aeko360.png", r"C:\Users\pablo\Documents\arko360_platform\landing\public\images\logo_arko360_light.png")
