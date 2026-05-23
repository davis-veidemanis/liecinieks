#!/usr/bin/env python3
"""Runs Ultralytics YOLO inference on a single image and prints detections as JSON.
Optionally also writes an annotated copy of the image with bboxes, labels and
confidence values drawn over each detection.

Usage:
    python liecinieks-inference.py --weights weights.pt --image screenshot.png
    python liecinieks-inference.py --weights weights.pt --image screenshot.png \
        --annotate screenshot.annotated.png

Output: a JSON array of {className, bbox: {x, y, w, h}, confidence} on stdout.
"""
import argparse
import colorsys
import json
import sys
from pathlib import Path


# Parse CLI args, run YOLO inference on the image, and print detections as JSON.
def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument('--weights', required=True)
    parser.add_argument('--image', required=True)
    parser.add_argument('--conf', type=float, default=0.25)
    parser.add_argument('--annotate', default=None,
                        help='If given, write an annotated PNG with bboxes/labels here.')
    args = parser.parse_args()

    try:
        from ultralytics import YOLO
    except ImportError:
        print('Error: ultralytics not installed. Run: pip install ultralytics', file=sys.stderr)
        return 2

    model = YOLO(args.weights)
    results = model.predict(source=args.image, conf=args.conf, verbose=False)
    detections = []
    for result in results:
        names = result.names
        if result.boxes is None:
            continue
        for box in result.boxes:
            cls = int(box.cls.item())
            conf = float(box.conf.item())
            xyxy = box.xyxy[0].tolist()
            x1, y1, x2, y2 = xyxy
            detections.append({
                'className': names.get(cls, str(cls)),
                'bbox': {
                    'x': round(x1),
                    'y': round(y1),
                    'w': round(x2 - x1),
                    'h': round(y2 - y1),
                },
                'confidence': conf,
            })

    if args.annotate:
        try:
            write_annotated(args.image, args.annotate, detections)
        except Exception as exc:  # pragma: no cover - cosmetic, not critical
            print(f'warn: failed to write annotated image: {exc}', file=sys.stderr)

    json.dump(detections, sys.stdout)
    return 0


def write_annotated(src_path: str, out_path: str, detections: list) -> None:
    """Draw bbox, label and confidence over each detection and save the image."""
    from PIL import Image, ImageDraw, ImageFont

    img = Image.open(src_path).convert('RGBA')
    overlay = Image.new('RGBA', img.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)

    font = _load_font(13)
    small_font = _load_font(11)

    # Stable color per class so the same label always renders in the same
    # tone across different screenshots (handy when comparing PDP and cart
    # images and so on).
    class_colours: dict[str, tuple[int, int, int]] = {}

    # Return a deterministic RGB color derived from the class name.
    def colour_for(name: str) -> tuple[int, int, int]:
        if name not in class_colours:
            seed = sum(ord(c) for c in name) * 2654435761
            hue = (seed & 0xFF) / 255.0
            r, g, b = colorsys.hsv_to_rgb(hue, 0.62, 0.95)
            class_colours[name] = (int(r * 255), int(g * 255), int(b * 255))
        return class_colours[name]

    # Stable sort: outer (largest-area) detections first, so the labels of
    # small inner detections aren't covered by the outlines of bigger boxes.
    sorted_dets = sorted(
        detections,
        key=lambda d: d['bbox']['w'] * d['bbox']['h'],
        reverse=True,
    )

    for det in sorted_dets:
        name = det['className']
        conf = det['confidence']
        bb = det['bbox']
        x0, y0 = bb['x'], bb['y']
        x1, y1 = x0 + bb['w'], y0 + bb['h']
        rgb = colour_for(name)
        rgba_stroke = (*rgb, 230)
        rgba_fill = (*rgb, 32)

        # Box: translucent fill plus a solid 2 px outline.
        draw.rectangle([x0, y0, x1, y1], outline=rgba_stroke, width=2, fill=rgba_fill)

        # Label tab pinned to the top-left corner of the box, flips to the
        # bottom-left if the box is right up against the top of the screen.
        text = f'{name}  {conf:.2f}'
        tx0, ty0, tx1, ty1 = draw.textbbox((0, 0), text, font=font)
        tw, th = tx1 - tx0, ty1 - ty0
        pad_x, pad_y = 6, 3
        lbl_y = y0 - th - pad_y * 2
        if lbl_y < 0:
            lbl_y = y0 + 2
        lbl_box = [x0, lbl_y, x0 + tw + pad_x * 2, lbl_y + th + pad_y * 2]
        draw.rectangle(lbl_box, fill=(*rgb, 235))
        draw.text((x0 + pad_x, lbl_y + pad_y), text, fill=(255, 255, 255, 255), font=font)

    out = Image.alpha_composite(img, overlay)
    out.convert('RGB').save(out_path, format='PNG')


# Try a list of common system font paths and return the first one that loads.
def _load_font(size: int):
    from PIL import ImageFont
    candidates = [
        '/System/Library/Fonts/Helvetica.ttc',
        '/System/Library/Fonts/HelveticaNeue.ttc',
        '/System/Library/Fonts/Supplemental/Arial.ttf',
        '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
    ]
    for path in candidates:
        if Path(path).exists():
            try:
                return ImageFont.truetype(path, size)
            except Exception:
                continue
    return ImageFont.load_default()


if __name__ == '__main__':
    sys.exit(main())
