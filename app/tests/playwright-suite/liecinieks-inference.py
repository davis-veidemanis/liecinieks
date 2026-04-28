#!/usr/bin/env python3
import argparse
import json
import sys


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument('--weights', required=True)
    parser.add_argument('--image', required=True)
    parser.add_argument('--conf', type=float, default=0.25)
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

    json.dump(detections, sys.stdout)
    return 0


if __name__ == '__main__':
    sys.exit(main())
