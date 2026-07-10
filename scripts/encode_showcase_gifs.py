import os
import glob
from PIL import Image, ImageDraw, ImageFont

VIDEOS_DIR = "docs/assets/videos"
FRAMES_ROOT = "docs/assets/videos/_frames"


def encode_gif_and_contact_sheet(frames_dir, out_gif_path, out_sheet_path, durations):
    frame_files = sorted(glob.glob(os.path.join(frames_dir, "frame_*.png")))
    if not frame_files:
        raise RuntimeError(f"No frames found in {frames_dir}")

    quantized_frames = []
    rgb_frames = []
    target_w = 1120

    for fp in frame_files:
        im = Image.open(fp).convert("RGB")
        w, h = im.size
        target_h = int(h * (target_w / w))
        resized = im.resize((target_w, target_h), Image.Resampling.LANCZOS)
        rgb_frames.append(resized)
        q = resized.quantize(
            colors=256,
            method=Image.Quantize.MEDIANCUT,
            dither=Image.Dither.NONE,
        )
        quantized_frames.append(q)

    quantized_frames[0].save(
        out_gif_path,
        save_all=True,
        append_images=quantized_frames[1:],
        optimize=True,
        duration=durations,
        loop=0,
    )
    size_kb = os.path.getsize(out_gif_path) / 1024.0
    print(f"Encoded {out_gif_path} ({len(quantized_frames)} frames, {size_kb:.1f} KB)")

    # Generate Contact Sheet for frame-by-frame visual QA
    cols = 3
    rows = (len(rgb_frames) + cols - 1) // cols
    thumb_w = 480
    thumb_h = int(rgb_frames[0].height * (thumb_w / rgb_frames[0].width))
    sheet = Image.new("RGB", (cols * thumb_w, rows * (thumb_h + 28)), (9, 9, 11))
    draw = ImageDraw.Draw(sheet)

    for idx, rf in enumerate(rgb_frames):
        r = idx // cols
        c = idx % cols
        x0 = c * thumb_w
        y0 = r * (thumb_h + 28)
        thumb = rf.resize((thumb_w, thumb_h), Image.Resampling.LANCZOS)
        sheet.paste(thumb, (x0, y0 + 28))
        draw.text(
            (x0 + 10, y0 + 6),
            f"Frame {idx + 1}/{len(rgb_frames)} ({durations[idx]}ms)",
            fill=(56, 189, 248),
        )

    sheet.save(out_sheet_path)
    print(f"Saved contact sheet: {out_sheet_path}")


if __name__ == "__main__":
    encode_gif_and_contact_sheet(
        os.path.join(FRAMES_ROOT, "demo1"),
        os.path.join(VIDEOS_DIR, "demo-shopping-and-reviews.gif"),
        os.path.join(FRAMES_ROOT, "contact-sheet-demo1.png"),
        [1300, 1300, 1200, 1400, 1800],
    )
    encode_gif_and_contact_sheet(
        os.path.join(FRAMES_ROOT, "demo2"),
        os.path.join(VIDEOS_DIR, "demo-admin-console-and-charts.gif"),
        os.path.join(FRAMES_ROOT, "contact-sheet-demo2.png"),
        [1400, 1300, 1500, 1400, 1600],
    )
    encode_gif_and_contact_sheet(
        os.path.join(FRAMES_ROOT, "demo3"),
        os.path.join(VIDEOS_DIR, "demo-seller-and-ai-assistant.gif"),
        os.path.join(FRAMES_ROOT, "contact-sheet-demo3.png"),
        [1400, 1400, 1400, 1600],
    )

