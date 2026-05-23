from __future__ import annotations

import os
import tempfile
from io import BytesIO

import numpy as np
from PIL import Image


def run_ela(
    image_bytes: bytes,
    *,
    jpeg_quality: int = 90,
    brightness_scale: float = 10.0,
) -> tuple[float, np.ndarray]:
    with Image.open(BytesIO(image_bytes)) as img:
        img = img.convert("RGB")

        fd, tmp_path = tempfile.mkstemp(suffix=".jpg")
        os.close(fd)

        try:
            img.save(tmp_path, format="JPEG", quality=jpeg_quality)
            with Image.open(tmp_path) as resaved:
                resaved = resaved.convert("RGB")

            original = np.array(img, dtype=np.uint8)
            recompressed = np.array(resaved, dtype=np.uint8)

            try:
                import cv2

                diff = cv2.absdiff(original, recompressed)
                diff_gray = cv2.cvtColor(diff, cv2.COLOR_RGB2GRAY)
            except Exception:
                diff = np.abs(original.astype(np.int16) - recompressed.astype(np.int16)).astype(np.uint8)
                diff_gray = diff.mean(axis=2).astype(np.uint8)

            scaled = np.clip(diff_gray.astype(np.float32) * float(brightness_scale), 0, 255)
            discrepancy_map = (scaled / 255.0).astype(np.float32)
            score = float(np.clip(discrepancy_map.mean() * 100.0, 0.0, 100.0))

            return score, discrepancy_map
        finally:
            try:
                os.remove(tmp_path)
            except OSError:
                pass
