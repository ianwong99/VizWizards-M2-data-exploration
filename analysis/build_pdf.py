from __future__ import annotations

import json
import math
from pathlib import Path
from typing import Iterable, List, Tuple


BASE_DIR = Path(__file__).resolve().parent.parent
ANALYSIS_DIR = BASE_DIR / "analysis"
DOCS_DIR = BASE_DIR / "docs"


def wrap_text(text: str, max_chars: int) -> List[str]:
    """Simple character-based text wrapper."""
    words = text.split()
    lines: List[str] = []
    current: List[str] = []
    count = 0
    for word in words:
        if count + len(word) + (1 if current else 0) > max_chars:
            if current:
                lines.append(" ".join(current))
            current = [word]
            count = len(word)
        else:
            current.append(word)
            count += len(word) + (1 if current[:-1] else 0)
    if current:
        lines.append(" ".join(current))
    return lines


class PDFPage:
    def __init__(self, width: float = 612, height: float = 792) -> None:
        self.width = width
        self.height = height
        self.commands: List[str] = []

    def set_stroke_rgb(self, r: float, g: float, b: float) -> None:
        self.commands.append(f"{r:.3f} {g:.3f} {b:.3f} RG")

    def set_fill_rgb(self, r: float, g: float, b: float) -> None:
        self.commands.append(f"{r:.3f} {g:.3f} {b:.3f} rg")

    def draw_line(self, x1: float, y1: float, x2: float, y2: float, width: float = 1.0) -> None:
        self.commands.append(f"{width:.2f} w {x1:.2f} {y1:.2f} m {x2:.2f} {y2:.2f} l S")

    def draw_rect(self, x: float, y: float, w: float, h: float, width: float = 1.0) -> None:
        self.commands.append(f"{width:.2f} w {x:.2f} {y:.2f} {w:.2f} {h:.2f} re S")

    def draw_point(self, x: float, y: float, size: float = 4.0) -> None:
        half = size / 2
        self.commands.append(f"{x - half:.2f} {y - half:.2f} {size:.2f} {size:.2f} re f")

    def draw_text(self, x: float, y: float, text: str, size: float = 12) -> None:
        safe = (
            text.replace("\\", "\\\\")
            .replace("(", "\\(")
            .replace(")", "\\)")
        )
        self.commands.append(f"BT /F1 {size:.1f} Tf {x:.2f} {y:.2f} Td ({safe}) Tj ET")

    def draw_paragraph(
        self,
        x: float,
        y_start: float,
        text: str,
        max_chars: int = 90,
        line_height: float = 16,
        size: float = 12,
    ) -> float:
        y = y_start
        for line in wrap_text(text, max_chars):
            self.draw_text(x, y, line, size=size)
            y -= line_height
        return y


class PDFDocument:
    def __init__(self) -> None:
        self.pages: List[PDFPage] = []

    def add_page(self, page: PDFPage) -> None:
        self.pages.append(page)

    def save(self, path: Path) -> None:
        objects: List[bytes] = [b""]  # index 0 unused for convenience

        def add_object(content: bytes) -> int:
            objects.append(content)
            return len(objects) - 1

        font_obj = add_object(b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>")

        page_entries: List[Tuple[int, PDFPage, int]] = []
        for page in self.pages:
            stream_data = "\n".join(page.commands).encode("utf-8")
            content = (
                f"<< /Length {len(stream_data)} >>\nstream\n".encode("utf-8")
                + stream_data
                + b"\nendstream"
            )
            content_obj = add_object(content)
            page_obj = add_object(b"")  # placeholder
            page_entries.append((page_obj, page, content_obj))

        page_numbers = [entry[0] for entry in page_entries]
        kids = " ".join(f"{num} 0 R" for num in page_numbers)
        pages_obj = add_object(
            f"<< /Type /Pages /Kids [{kids}] /Count {len(page_numbers)} >>".encode("utf-8")
        )

        for page_obj, page, content_obj in page_entries:
            page_dict = (
                f"<< /Type /Page /Parent {pages_obj} 0 R /MediaBox [0 0 {page.width:.0f} {page.height:.0f}] "
                f"/Resources << /Font << /F1 {font_obj} 0 R >> >> /Contents {content_obj} 0 R >>"
            ).encode("utf-8")
            objects[page_obj] = page_dict

        catalog_obj = add_object(f"<< /Type /Catalog /Pages {pages_obj} 0 R >>".encode("utf-8"))

        with path.open("wb") as fh:
            fh.write(b"%PDF-1.4\n")
            offsets: List[int] = []
            for idx, obj in enumerate(objects[1:], start=1):
                offsets.append(fh.tell())
                fh.write(f"{idx} 0 obj\n".encode("utf-8"))
                fh.write(obj)
                fh.write(b"\nendobj\n")

            xref_start = fh.tell()
            fh.write(f"xref\n0 {len(objects)}\n".encode("utf-8"))
            fh.write(b"0000000000 65535 f \n")
            for off in offsets:
                fh.write(f"{off:010d} 00000 n \n".encode("utf-8"))
            fh.write(b"trailer\n")
            fh.write(f"<< /Size {len(objects)} /Root {catalog_obj} 0 R >>\n".encode("utf-8"))
            fh.write(b"startxref\n")
            fh.write(f"{xref_start}\n".encode("utf-8"))
            fh.write(b"%%EOF")


def load_json(name: str):
    return json.loads((ANALYSIS_DIR / name).read_text())


LEAGUE_TREND = load_json("league_3pa_trend.json")
for rec in LEAGUE_TREND:
    rec["avg_3p_percent"] *= 100.0

CURRY_DATA = load_json("curry_vs_league.json")
POSITION_SHARES = load_json("position_3pa_shares.json")
SHOT_PROFILE = load_json("shot_profile_trends.json")
VOLUME_EFFICIENCY = load_json("volume_vs_efficiency.json")
TEAM_ADOPTION = load_json("team_adoption_threshold.json")


def draw_league_trend(page: PDFPage, left: float, bottom: float, width: float, height: float) -> None:
    filtered = [rec for rec in LEAGUE_TREND if rec["season"] >= 1979]
    seasons = [rec["season"] for rec in filtered]
    data_left = [rec["avg_3pa_per_game"] for rec in filtered]
    data_right = [rec["avg_3p_percent"] for rec in filtered]
    left_domain = (0.0, max(data_left) * 1.05)
    right_domain = (20.0, max(data_right) * 1.05)

    def scale_x(season: int) -> float:
        return left + (season - seasons[0]) / (seasons[-1] - seasons[0]) * width

    def scale_y(value: float, domain: Tuple[float, float]) -> float:
        low, high = domain
        return bottom + (value - low) / (high - low) * height

    page.set_stroke_rgb(0.6, 0.6, 0.6)
    page.draw_rect(left, bottom, width, height, width=1.0)
    for i in range(1, 5):
        y = bottom + height * i / 5
        page.draw_line(left, y, left + width, y, width=0.5)

    # Left axis labels
    page.set_stroke_rgb(0, 0, 0)
    page.draw_text(left - 50, bottom + height + 10, "League 3PA per game", size=10)
    for i in range(6):
        value = left_domain[0] + (left_domain[1] - left_domain[0]) * i / 5
        y = scale_y(value, left_domain)
        page.draw_line(left - 5, y, left, y, width=1.0)
        page.draw_text(left - 45, y - 4, f"{value:.0f}", size=10)

    page.draw_text(left + width + 10, bottom + height + 10, "League 3P%", size=10)
    for i in range(6):
        value = right_domain[0] + (right_domain[1] - right_domain[0]) * i / 5
        y = scale_y(value, right_domain)
        page.draw_line(left + width, y, left + width + 5, y, width=1.0)
        page.draw_text(left + width + 8, y - 4, f"{value:.0f}", size=10)

    # X axis labels
    unique_steps = max(1, len(seasons) // 8)
    for idx, season in enumerate(seasons):
        if idx % unique_steps != 0 and season != seasons[-1]:
            continue
        x = scale_x(season)
        page.draw_line(x, bottom, x, bottom - 5, width=1.0)
        page.draw_text(x - 12, bottom - 18, str(season), size=10)

    # Left series
    page.set_stroke_rgb(0.12, 0.47, 0.71)
    prev = None
    for rec in filtered:
        x = scale_x(rec["season"])
        y = scale_y(rec["avg_3pa_per_game"], left_domain)
        if prev:
            page.draw_line(prev[0], prev[1], x, y, width=2.0)
        prev = (x, y)

    # Right series
    page.set_stroke_rgb(0.84, 0.15, 0.16)
    prev = None
    for rec in filtered:
        x = scale_x(rec["season"])
        y = scale_y(rec["avg_3p_percent"], right_domain)
        if prev:
            page.draw_line(prev[0], prev[1], x, y, width=2.0)
        prev = (x, y)

    page.set_stroke_rgb(0, 0, 0)
    page.draw_text(left, bottom + height + 30, "League Three-Point Attempts & Accuracy", size=14)
    page.draw_text(left, bottom + height + 15, "Blue: Attempts per game, Red: 3P%", size=10)


def draw_volume_efficiency(page: PDFPage, left: float, bottom: float, panel_width: float, height: float) -> None:
    seasons = [2000, 2010, 2020, 2025]
    points_by_season = [(year, VOLUME_EFFICIENCY[str(year)]) for year in seasons if str(year) in VOLUME_EFFICIENCY]
    if not points_by_season:
        return

    max_x = max(pt["x3pa_per_game"] for _, pts in points_by_season for pt in pts) * 1.1
    min_y = min(pt["x3p_percent"] for _, pts in points_by_season for pt in pts) * 0.95
    max_y = max(pt["x3p_percent"] for _, pts in points_by_season for pt in pts) * 1.05

    def scale_x(val: float) -> float:
        return val / max_x * (panel_width - 40)

    def scale_y(val: float) -> float:
        return (val - min_y) / (max_y - min_y) * (height - 40)

    for index, (season, points) in enumerate(points_by_season):
        panel_left = left + index * panel_width
        panel_bottom = bottom
        page.draw_rect(panel_left, panel_bottom, panel_width - 20, height - 20, width=1.0)
        page.draw_text(panel_left + 20, panel_bottom + height - 10, f"Season {season}", size=12)

        # Axes ticks
        for i in range(5):
            value = max_x * i / 4
            x = panel_left + 20 + scale_x(value)
            page.draw_line(x, panel_bottom + 20, x, panel_bottom + 16, width=1.0)
            page.draw_text(x - 10, panel_bottom + 4, f"{value:.0f}", size=9)
        for i in range(5):
            value = min_y + (max_y - min_y) * i / 4
            y = panel_bottom + 20 + scale_y(value)
            page.draw_line(panel_left + 20, y, panel_left + 16, y, width=1.0)
            page.draw_text(panel_left + 2, y - 4, f"{value:.3f}", size=9)

        page.set_fill_rgb(0.12, 0.47, 0.71)
        for pt in points:
            x = panel_left + 20 + scale_x(pt["x3pa_per_game"])
            y = panel_bottom + 20 + scale_y(pt["x3p_percent"])
            page.draw_point(x, y, size=4.0)
        page.set_fill_rgb(0, 0, 0)

    page.draw_text(left, bottom + height, "3PA Volume vs. Efficiency Snapshots", size=14)
    page.draw_text(left, bottom + height - 16, "Panels: 2000, 2010, 2020, 2025 (dark squares show teams).", size=10)


def draw_curry_comparison(page: PDFPage, left: float, bottom: float, width: float, height: float) -> None:
    league_lookup = {rec["season"]: rec["avg_player_3pa_per_game"] for rec in CURRY_DATA["league_avg_player_3pa_per_game"]}
    curry = [rec for rec in CURRY_DATA["curry"] if rec["season"] >= 2010]
    seasons = [rec["season"] for rec in curry]
    league_vals = [league_lookup.get(season) for season in seasons]

    if not seasons:
        return

    left_domain = (0.0, max(rec["x3pa_per_game"] for rec in curry) * 1.1)
    right_domain = (0.0, max(val for val in league_vals if val is not None) * 1.5)

    def scale_x(season: int) -> float:
        return left + (season - seasons[0]) / (seasons[-1] - seasons[0]) * width

    def scale_y(val: float, domain: Tuple[float, float]) -> float:
        low, high = domain
        return bottom + (val - low) / (high - low) * height

    page.draw_rect(left, bottom, width, height, width=1.0)

    # X ticks
    unique_steps = max(1, len(seasons) // 8)
    for idx, season in enumerate(seasons):
        if idx % unique_steps != 0 and season != seasons[-1]:
            continue
        x = scale_x(season)
        page.draw_line(x, bottom, x, bottom - 5, width=1.0)
        page.draw_text(x - 12, bottom - 18, str(season), size=10)

    # Left axis (Curry)
    page.draw_text(left, bottom + height + 12, "Curry 3PA per game", size=10)
    for i in range(6):
        value = left_domain[0] + (left_domain[1] - left_domain[0]) * i / 5
        y = scale_y(value, left_domain)
        page.draw_line(left - 5, y, left, y, width=1.0)
        page.draw_text(left - 45, y - 4, f"{value:.0f}", size=10)

    # League axis (right)
    page.draw_text(left + width + 8, bottom + height + 12, "League avg player 3PA", size=10)
    for i in range(6):
        value = right_domain[0] + (right_domain[1] - right_domain[0]) * i / 5
        y = scale_y(value, right_domain)
        page.draw_line(left + width, y, left + width + 5, y, width=1.0)
        page.draw_text(left + width + 8, y - 4, f"{value:.1f}", size=10)

    # Curry series
    page.set_stroke_rgb(1.0, 0.49, 0.0)
    prev = None
    for rec in curry:
        x = scale_x(rec["season"])
        y = scale_y(rec["x3pa_per_game"], left_domain)
        if prev:
            page.draw_line(prev[0], prev[1], x, y, width=2.5)
        prev = (x, y)

    # League series
    page.set_stroke_rgb(0.12, 0.47, 0.71)
    prev = None
    for season in seasons:
        league_val = league_lookup.get(season)
        if league_val is None:
            continue
        x = scale_x(season)
        y = scale_y(league_val, right_domain)
        if prev:
            page.draw_line(prev[0], prev[1], x, y, width=2.0)
        prev = (x, y)

    page.set_stroke_rgb(0, 0, 0)
    page.draw_text(left, bottom + height + 28, "Stephen Curry vs. League Average 3PA", size=14)
    page.draw_text(left, bottom + height + 14, "Orange: Curry, Blue: league average per player.", size=10)


def draw_shot_profile(page: PDFPage, left: float, bottom: float, width: float, height: float) -> None:
    data = [rec for rec in SHOT_PROFILE if rec["season"] >= 1997]
    for rec in data:
        rec["three"] = rec.get("percent_fga_from_x3p_range", 0) * 100
        rec["mid"] = rec.get("percent_fga_from_x10_16_range", 0) * 100
        rec["long_mid"] = rec.get("percent_fga_from_x16_3p_range", 0) * 100

    seasons = [rec["season"] for rec in data]
    max_val = max(rec["three"] for rec in data) * 1.05

    def scale_x(season: int) -> float:
        return left + (season - seasons[0]) / (seasons[-1] - seasons[0]) * width

    def scale_y(val: float) -> float:
        return bottom + val / max_val * height

    page.draw_rect(left, bottom, width, height, width=1.0)
    for i in range(1, 5):
        y = bottom + height * i / 5
        page.draw_line(left, y, left + width, y, width=0.5)

    for i in range(6):
        value = max_val * i / 5
        y = scale_y(value)
        page.draw_line(left - 5, y, left, y, width=1.0)
        page.draw_text(left - 40, y - 4, f"{value:.0f}%", size=10)

    step = max(1, len(seasons) // 8)
    for idx, season in enumerate(seasons):
        if idx % step != 0 and season != seasons[-1]:
            continue
        x = scale_x(season)
        page.draw_line(x, bottom, x, bottom - 5, width=1.0)
        page.draw_text(x - 12, bottom - 18, str(season), size=10)

    def draw_series(field: str, color: Tuple[float, float, float], width_line: float = 2.0) -> None:
        page.set_stroke_rgb(*color)
        prev = None
        for rec in data:
            value = rec[field]
            x = scale_x(rec["season"])
            y = scale_y(value)
            if prev:
                page.draw_line(prev[0], prev[1], x, y, width=width_line)
            prev = (x, y)

    draw_series("three", (0.12, 0.47, 0.71), 2.5)
    draw_series("mid", (0.84, 0.15, 0.16), 2.0)
    draw_series("long_mid", (0.58, 0.40, 0.74), 2.0)
    page.set_stroke_rgb(0, 0, 0)
    page.draw_text(left, bottom + height + 28, "Shot Selection Migration", size=14)
    page.draw_text(left, bottom + height + 14, "Blue: 3PA share, Red: midrange (10-16ft), Purple: long midrange.", size=10)


def draw_position_share(page: PDFPage, left: float, bottom: float, width: float, height: float) -> None:
    data = [rec for rec in POSITION_SHARES if rec["season"] >= 1997]
    seasons = [rec["season"] for rec in data]
    positions = ["PG", "SG", "SF", "PF", "C"]

    def scale_x(season: int) -> float:
        return left + (season - seasons[0]) / (seasons[-1] - seasons[0]) * width

    def scale_y(val: float) -> float:
        return bottom + val * height

    page.draw_rect(left, bottom, width, height, width=1.0)
    for i in range(1, 5):
        y = bottom + height * i / 5
        page.draw_line(left, y, left + width, y, width=0.5)
        page.draw_text(left - 45, y - 4, f"{i*20}%", size=10)

    step = max(1, len(seasons) // 8)
    for idx, season in enumerate(seasons):
        if idx % step != 0 and season != seasons[-1]:
            continue
        x = scale_x(season)
        page.draw_line(x, bottom, x, bottom - 5, width=1.0)
        page.draw_text(x - 12, bottom - 18, str(season), size=10)

    palette = {
        "PG": (0.12, 0.47, 0.71),
        "SG": (0.84, 0.15, 0.16),
        "SF": (0.20, 0.63, 0.17),
        "PF": (0.58, 0.40, 0.74),
        "C": (0.55, 0.34, 0.29),
    }

    for pos in positions:
        page.set_stroke_rgb(*palette[pos])
        prev = None
        for rec in data:
            value = rec.get(f"share_{pos}")
            if value is None:
                continue
            x = scale_x(rec["season"])
            y = scale_y(value)
            if prev:
                page.draw_line(prev[0], prev[1], x, y, width=2.0)
            prev = (x, y)

    page.set_stroke_rgb(0, 0, 0)
    page.draw_text(left, bottom + height + 28, "Share of League 3PA by Position", size=14)
    legend_x = left + width - 140
    legend_y = bottom + height - 14
    for pos in positions:
        page.set_stroke_rgb(*palette[pos])
        page.draw_line(legend_x, legend_y, legend_x + 20, legend_y, width=2.5)
        page.set_stroke_rgb(0, 0, 0)
        page.draw_text(legend_x + 30, legend_y - 4, pos, size=10)
        legend_y -= 16


def draw_team_adoption(page: PDFPage, left: float, bottom: float, width: float, height: float) -> None:
    data = TEAM_ADOPTION
    seasons = [rec["season"] for rec in data]
    net_vals = [rec["net_rating"] for rec in data if rec["net_rating"] is not None]
    xs_domain = (min(seasons) - 1, max(seasons) + 1)
    ys_domain = (min(net_vals) - 2, max(net_vals) + 2)

    def scale_x(season: float) -> float:
        return left + (season - xs_domain[0]) / (xs_domain[1] - xs_domain[0]) * width

    def scale_y(val: float) -> float:
        return bottom + (val - ys_domain[0]) / (ys_domain[1] - ys_domain[0]) * height

    page.draw_rect(left, bottom, width, height, width=1.0)

    step = max(1, (xs_domain[1] - xs_domain[0]) // 8)
    for season in range(int(xs_domain[0]), int(xs_domain[1]) + 1, step):
        x = scale_x(season)
        page.draw_line(x, bottom, x, bottom - 5, width=1.0)
        page.draw_text(x - 12, bottom - 18, str(season), size=10)

    for i in range(1, 6):
        value = ys_domain[0] + (ys_domain[1] - ys_domain[0]) * i / 5
        y = scale_y(value)
        page.draw_line(left, y, left + width, y, width=0.5)
        page.draw_text(left - 40, y - 4, f"{value:.0f}", size=10)

    page.set_fill_rgb(0.20, 0.63, 0.17)
    for rec in data:
        if rec["net_rating"] is None:
            continue
        x = scale_x(rec["season"])
        y = scale_y(rec["net_rating"])
        page.draw_point(x, y, size=5.0)
    page.set_fill_rgb(0, 0, 0)

    page.draw_text(left, bottom + height + 28, "Team Adoption of ≥40% 3PA Rate", size=14)
    page.draw_text(left, bottom + height + 14, "Green squares mark season net rating vs. adoption year.", size=10)


def build_document() -> PDFDocument:
    doc = PDFDocument()

    # Page 1: Cover
    page1 = PDFPage()
    page1.draw_text(80, 700, "Designing the NBA 3-Point Revolution Story", size=24)
    page1.draw_text(80, 660, "Team Members: __________________________", size=14)
    page1.draw_text(80, 640, "Course / Section: _______________________", size=14)
    page1.draw_text(80, 620, "Submission Date: ________________________", size=14)
    intro = (
        "We explore how the NBA evolved into a perimeter-first league by connecting long-term "
        "three-point trends, Stephen Curry's influence, positional role changes, and the timing "
        "of team-wide adoption. The project delivers a presentation-grade scrollytelling "
        "experience supported by analytical tooling."
    )
    page1.draw_paragraph(80, 580, intro, max_chars=95, size=12)
    doc.add_page(page1)

    # Page 2: Problem & Audience
    page2 = PDFPage()
    page2.draw_text(80, 720, "1. Problem & Motivation", size=18)
    text_problem = (
        "The NBA's strategic identity flipped as three-pointers surged from novelty to primary "
        "offensive weapon. The shift spans decades of gradual experimentation, structural rule "
        "changes, and a singular catalyst in Stephen Curry. Our story rebuilds that arc with data."
    )
    y = page2.draw_paragraph(80, 690, text_problem, max_chars=95)
    y -= 10
    bullets = [
        "Reconstruct inflection points in league-wide three-point volume and accuracy.",
        "Quantify Curry and the Warriors as accelerants that normalized high-volume threes.",
        "Link adoption timing to efficiency, net rating, and roster role changes.",
    ]
    for bullet in bullets:
        y -= 14
        page2.draw_text(90, y, f"• {bullet}", size=12)
    y -= 30
    page2.draw_text(80, y, "2. Audience & Use Cases", size=18)
    y -= 30
    audience_text = (
        "Primary: classmates and instructors expecting a cohesive, annotated storyline. "
        "Secondary: basketball fans and media members who need exportable visuals and punchy "
        "talking points. Tertiary: analysts and coaches who want to benchmark adoption, efficiency, "
        "and positional shifts through light interactivity."
    )
    page2.draw_paragraph(80, y, audience_text, max_chars=95)
    doc.add_page(page2)

    # Page 3: Data inventory & key questions
    page3 = PDFPage()
    page3.draw_text(80, 720, "3. Data Inventory & Quality Check", size=18)
    inventory_lines = [
        "Team Stats Per Game (1,876 rows): season-level 3PA, 3P%, scoring, pace metrics.",
        "Team Summaries (1,876 rows): wins/losses, net rating, three-point attempt rate.",
        "Player Totals & Per Game (32,606 rows): positional 3PA volume, efficiency splits.",
        "Player Shooting (17,521 rows): shot distance, zone shares, dunk and corner rates.",
    ]
    y = 690
    for line in inventory_lines:
        page3.draw_text(90, y, f"• {line}", size=12)
        y -= 18
    y -= 10
    quality = (
        "Minimal missingness (mostly players without shot zone tracking). Combo positions "
        "are normalized to primary role for share analysis. Scripts in analysis/ confirm "
        "season coverage from 1979–2025 league-wide and 1997–2025 for shot profiles."
    )
    y = page3.draw_paragraph(80, y, quality, max_chars=95)
    y -= 20
    page3.draw_text(80, y, "4. Core User Questions", size=18)
    y -= 30
    questions = [
        "When did league-wide three-point volume inflect?",
        "Does higher volume coincide with efficiency gains?",
        "How singular is Curry versus his peers?",
        "How did positions and shot geography evolve?",
        "Did early adopters capture real win-value?",
    ]
    for q in questions:
        page3.draw_text(90, y, f"• {q}", size=12)
        y -= 18
    doc.add_page(page3)

    # Page 4: League trend + commentary
    page4 = PDFPage()
    page4.draw_text(80, 720, "5. Exploratory Findings – League Context", size=18)
    commentary = (
        "League three-point attempts exploded from 2.8 per game (1980) to 37.6 (2025) while "
        "accuracy climbed roughly ten percentage points. The chart below grounds Chapter 1 "
        "of our story with annotations for major rule changes and pace shifts."
    )
    page4.draw_paragraph(80, 690, commentary, max_chars=95)
    draw_league_trend(page4, left=80, bottom=320, width=450, height=260)
    doc.add_page(page4)

    # Page 5: Volume vs efficiency + Curry
    page5 = PDFPage()
    page5.draw_text(80, 720, "6. Exploratory Findings – League vs Player", size=18)
    text5 = (
        "Panels highlight the rightward march of team shot volume and modest efficiency gains. "
        "Below, Curry's per-game attempts dwarf the league average, showing how one star "
        "redefined acceptable shot diets."
    )
    page5.draw_paragraph(80, 690, text5, max_chars=95)
    draw_volume_efficiency(page5, left=80, bottom=360, panel_width=140, height=220)
    draw_curry_comparison(page5, left=80, bottom=80, width=450, height=220)
    doc.add_page(page5)

    # Page 6: Positions & shot selection
    page6 = PDFPage()
    page6.draw_text(80, 720, "7. Exploratory Findings – Roles & Geometry", size=18)
    text6 = (
        "Frontcourt players now launch a quarter of league threes, confirming the rise of stretch "
        "bigs. Simultaneously, long midrange jumpers nearly disappeared as three-point share doubled."
    )
    page6.draw_paragraph(80, 690, text6, max_chars=95)
    draw_position_share(page6, left=80, bottom=360, width=450, height=220)
    draw_shot_profile(page6, left=80, bottom=80, width=450, height=220)
    doc.add_page(page6)

    # Page 7: Adoption timing & next steps
    page7 = PDFPage()
    page7.draw_text(80, 720, "8. Adoption Timeline & Next Steps", size=18)
    text7 = (
        "Mapping the first seasons where teams surpassed a 40% three-point attempt rate reveals "
        "early adopters like the 2017 Rockets and 2019 Bucks pairing high volume with elite "
        "net ratings. We will expand this view with filters and narrative callouts in Chapter 4."
    )
    y = page7.draw_paragraph(80, 690, text7, max_chars=95)
    draw_team_adoption(page7, left=80, bottom=320, width=450, height=260)
    y = 290
    roadmap = (
        "Next steps: ingest salary data to tie compensation to shooting gravity, build interactive "
        "prototype (scrollytelling with pinned annotations), and pre-aggregate shot coordinate "
        "data for court heatmaps. Risks include managing five million shot rows in-browser and "
        "keeping scope disciplined."
    )
    page7.draw_paragraph(80, y, roadmap, max_chars=95)
    doc.add_page(page7)

    return doc


def main() -> None:
    pdf_path = DOCS_DIR / "design_doc.pdf"
    doc = build_document()
    doc.save(pdf_path)
    print(f"Wrote {pdf_path}")


if __name__ == "__main__":
    main()
