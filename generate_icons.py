"""
Generador de íconos Pillco Móvil.
Crea PNGs en todos los tamaños requeridos para PWA, iOS y Android.
"""
from PIL import Image, ImageDraw, ImageFont
import os

# Tamaños requeridos (PWA + iOS + Android + App Store)
SIZES = [72, 96, 128, 144, 152, 167, 180, 192, 256, 384, 512, 1024]

# Paleta Pillco Móvil
PRIMARY     = (0,   56,  32)    # Yungas Green
SECONDARY   = (0,   99,  153)   # Huallaga Blue
TERTIARY    = (72,  41,  4)     # Kotosh Ochre
WHITE       = (255, 255, 255)

OUT_DIR = os.path.join(os.path.dirname(__file__), 'icons')
os.makedirs(OUT_DIR, exist_ok=True)


def draw_icon(size):
    """Genera el ícono Pillco: círculo verde con auto estilizado en blanco."""
    # Renderizamos en 4x para anti-aliasing y luego reducimos
    scale = 4
    s = size * scale
    img = Image.new('RGBA', (s, s), (0, 0, 0, 0))
    d   = ImageDraw.Draw(img)

    # Fondo cuadrado redondeado (más amigable para iOS)
    radius = int(s * 0.22)
    d.rounded_rectangle([0, 0, s, s], radius=radius, fill=PRIMARY)

    # Círculo interior decorativo (verde más claro)
    margin = int(s * 0.15)
    d.ellipse([margin, margin, s - margin, s - margin], outline=(149, 212, 172), width=max(1, int(s * 0.012)))

    # Auto estilizado (silueta simple)
    cx, cy = s // 2, int(s * 0.52)
    car_w  = int(s * 0.55)
    car_h  = int(s * 0.24)
    # Cuerpo del auto
    d.rounded_rectangle(
        [cx - car_w // 2, cy - car_h // 2, cx + car_w // 2, cy + car_h // 2],
        radius=int(car_h * 0.35),
        fill=WHITE,
    )
    # Techo / cabina
    cabin_w = int(car_w * 0.55)
    cabin_h = int(car_h * 0.65)
    d.rounded_rectangle(
        [cx - cabin_w // 2, cy - car_h // 2 - cabin_h // 2, cx + cabin_w // 2, cy - car_h // 2 + cabin_h // 2],
        radius=int(cabin_h * 0.4),
        fill=WHITE,
    )
    # Ventanas (corte central)
    win_w = int(cabin_w * 0.8)
    win_h = int(cabin_h * 0.45)
    d.rounded_rectangle(
        [cx - win_w // 2, cy - car_h // 2 - cabin_h // 2 + int(cabin_h * 0.18), cx + win_w // 2, cy - car_h // 2 - cabin_h // 2 + int(cabin_h * 0.18) + win_h],
        radius=int(win_h * 0.3),
        fill=PRIMARY,
    )
    # Ruedas
    wheel_r = int(car_h * 0.32)
    wheel_y = cy + car_h // 2
    for off in (-int(car_w * 0.27), int(car_w * 0.27)):
        d.ellipse(
            [cx + off - wheel_r, wheel_y - wheel_r, cx + off + wheel_r, wheel_y + wheel_r],
            fill=PRIMARY,
        )
        d.ellipse(
            [cx + off - wheel_r // 2, wheel_y - wheel_r // 2, cx + off + wheel_r // 2, wheel_y + wheel_r // 2],
            fill=WHITE,
        )

    # Acento Kotosh: dos manos cruzadas estilizadas (debajo)
    accent_y = int(s * 0.78)
    accent_r = int(s * 0.04)
    for off in (-int(s * 0.06), int(s * 0.06)):
        d.ellipse(
            [cx + off - accent_r, accent_y - accent_r, cx + off + accent_r, accent_y + accent_r],
            fill=(240, 189, 139),
        )

    # Downsample para anti-aliasing
    return img.resize((size, size), Image.LANCZOS)


def make_splash(width, height, out):
    """Splash screen para iOS — fondo primario + logo centrado."""
    img = Image.new('RGB', (width, height), PRIMARY)
    icon_size = min(width, height) // 3
    icon = draw_icon(icon_size)
    img.paste(icon, ((width - icon_size) // 2, (height - icon_size) // 2), icon)
    img.save(out, 'PNG', optimize=True)


def main():
    print(f"Generando íconos en: {OUT_DIR}")
    for size in SIZES:
        icon = draw_icon(size)
        path = os.path.join(OUT_DIR, f'icon-{size}.png')
        icon.save(path, 'PNG', optimize=True)
        print(f"  ✓ icon-{size}.png")

    # iOS apple-touch-icons específicos
    for size in (120, 167, 180):
        icon = draw_icon(size)
        icon.save(os.path.join(OUT_DIR, f'apple-touch-icon-{size}.png'), 'PNG', optimize=True)

    # Favicon
    fav = draw_icon(64)
    fav.save(os.path.join(OUT_DIR, 'favicon-32.png'), 'PNG', optimize=True)
    fav.resize((16, 16), Image.LANCZOS).save(os.path.join(OUT_DIR, 'favicon-16.png'), 'PNG', optimize=True)

    # Splash screens iOS principales
    splash_dir = os.path.join(os.path.dirname(__file__), 'splash')
    os.makedirs(splash_dir, exist_ok=True)
    splashes = {
        'splash-iphone-5.5.png':  (1242, 2208),  # iPhone 6+/7+/8+
        'splash-iphone-5.8.png':  (1125, 2436),  # iPhone X/XS/11 Pro
        'splash-iphone-6.5.png':  (1242, 2688),  # iPhone XS Max/11 Pro Max
        'splash-iphone-6.7.png':  (1290, 2796),  # iPhone 14/15 Pro Max
        'splash-ipad.png':        (1640, 2360),  # iPad Air/Pro
    }
    print("Generando splash screens...")
    for name, (w, h) in splashes.items():
        make_splash(w, h, os.path.join(splash_dir, name))
        print(f"  ✓ {name}")

    print("\n✅ Listo. Total:", len(SIZES) + 3 + 2 + len(splashes), "imágenes generadas.")


if __name__ == '__main__':
    main()
