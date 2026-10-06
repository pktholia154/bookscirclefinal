#!/usr/bin/env python3
import zlib
import struct
import math
import os

def create_png(width, height, get_pixel_func):
    """
    Generate an uncompressed RGBA PNG using standard library zlib and struct.
    """
    raw_data = bytearray()
    
    for y in range(height):
        raw_data.append(0) # Filter byte 0 (None)
        for x in range(width):
            r, g, b, a = get_pixel_func(x, y, width, height)
            raw_data.extend((r, g, b, a))
            
    def chunk(tag, data):
        return struct.pack('>I', len(data)) + tag + data + struct.pack('>I', zlib.crc32(tag + data) & 0xffffffff)

    header = b'\x89PNG\r\n\x1a\n'
    ihdr = chunk(b'IHDR', struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0))
    idat = chunk(b'IDAT', zlib.compress(bytes(raw_data), 9))
    iend = chunk(b'IEND', b'')
    
    return header + ihdr + idat + iend

def logo_pixel_sampler(x, y, w, h, maskable=False):
    # Normalized coordinates 0.0 to 1.0
    # Map to 512x512 coordinate space
    if maskable:
        # Scale into center 80% to fit safe area
        pad = 0.12
        nx = (x / w - pad) / (1.0 - 2 * pad)
        ny = (y / h - pad) / (1.0 - 2 * pad)
    else:
        nx = x / w
        ny = y / h

    px = nx * 512.0
    py = ny * 512.0

    # Colors:
    # Purple: #4631B7 -> (70, 49, 183)
    # Orange: #FF6E1D -> (255, 110, 29)
    
    # 4x Supersampling for smooth antialiased edges
    samples = [
        (-0.35, -0.35), (0.35, -0.35),
        (-0.35, 0.35), (0.35, 0.35)
    ]
    
    r_acc, g_acc, b_acc, a_acc = 0, 0, 0, 0
    
    for sx, sy in samples:
        spx = px + sx * (512.0 / w)
        spy = py + sy * (512.0 / h)

        # Distance to purple circle: center (248, 256), r=172
        d_purple = math.hypot(spx - 248, spy - 256)

        # Distance to top orange circle: center (316, 198), r=132
        d_orange_top = math.hypot(spx - 316, spy - 198)

        # Distance to bottom orange circle: center (316, 314), r=132
        d_orange_bot = math.hypot(spx - 316, spy - 314)

        if d_purple <= 172:
            # Purple circle takes precedence
            r_acc += 70
            g_acc += 49
            b_acc += 183
            a_acc += 255
        elif d_orange_top <= 132 or d_orange_bot <= 132:
            # Orange lobes
            r_acc += 255
            g_acc += 110
            b_acc += 29
            a_acc += 255
        else:
            # Transparent
            if maskable:
                # White background for maskable
                r_acc += 255
                g_acc += 255
                b_acc += 255
                a_acc += 255
            else:
                pass

    n = len(samples)
    return int(r_acc / n), int(g_acc / n), int(b_acc / n), int(a_acc / n)

def main():
    os.makedirs('public', exist_ok=True)
    
    # Standard transparent PNGs
    for size, name in [
        (512, 'logo.png'),
        (512, 'icon-512.png'),
        (192, 'icon-192.png'),
        (180, 'apple-touch-icon.png'),
        (48, 'favicon.png'),
        (32, 'favicon-32x32.png'),
        (16, 'favicon-16x16.png'),
    ]:
        print(f"Generating public/{name} ({size}x{size})...")
        png_bytes = create_png(size, size, lambda x, y, w, h: logo_pixel_sampler(x, y, w, h, maskable=False))
        with open(f'public/{name}', 'wb') as f:
            f.write(png_bytes)

    # Maskable icon (with white background & safe area padding)
    print("Generating public/icon-maskable-512.png...")
    png_bytes = create_png(512, 512, lambda x, y, w, h: logo_pixel_sampler(x, y, w, h, maskable=True))
    with open('public/icon-maskable-512.png', 'wb') as f:
        f.write(png_bytes)
        
    print("All PNG icons generated successfully.")

if __name__ == '__main__':
    main()
