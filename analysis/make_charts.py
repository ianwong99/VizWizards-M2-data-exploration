from __future__ import annotations

import json
import math
from pathlib import Path
from typing import Callable, Iterable, List, Tuple


BASE_DIR = Path(__file__).resolve().parent.parent
ANALYSIS_DIR = BASE_DIR / "analysis"
FIGURE_DIR = BASE_DIR / "figures"
FIGURE_DIR.mkdir(exist_ok=True)


def scale_value(value: float, domain: Tuple[float, float], length: float) -> float:
    """Map a numeric value from domain to a screen coordinate."""
    lo, hi = domain
    if math.isclose(hi, lo):
        return 0.0
    return (value - lo) / (hi - lo) * length


def svg_line(points: List[Tuple[float, float]]) -> str:
    """Create SVG path command for a sequence of points."""
    if not points:
        return ""
    commands = [f"M {points[0][0]:.2f} {points[0][1]:.2f}"]
    commands += [f"L {x:.2f} {y:.2f}" for x, y in points[1:]]
    return " ".join(commands)


def create_line_chart_dual_axis(
    records: List[dict],
    field_left: str,
    label_left: str,
    field_right: str,
    label_right: str,
    title: str,
    output_name: str,
    color_left: str = "#1f77b4",
    color_right: str = "#d62728",
) -> None:
    width, height = 880, 460
    margin_left = 70
    margin_right = 70
    margin_top = 40
    margin_bottom = 60
    plot_width = width - margin_left - margin_right
    plot_height = height - margin_top - margin_bottom

    seasons = [r["season"] for r in records]
    xs_domain = (min(seasons), max(seasons))

    left_values = [r[field_left] for r in records if r.get(field_left) is not None]
    right_values = [r[field_right] for r in records if r.get(field_right) is not None]

    left_domain = (0.0, max(left_values) * 1.05)
    right_domain = (0.0, max(right_values) * 1.05)

    x_points = [
        margin_left + scale_value(season, xs_domain, plot_width) for season in seasons
    ]
    left_points = [
        (
            x,
            margin_top + plot_height - scale_value(rec[field_left], left_domain, plot_height),
        )
        for rec, x in zip(records, x_points)
    ]
    right_points = [
        (
            x,
            margin_top + plot_height - scale_value(rec[field_right], right_domain, plot_height),
        )
        for rec, x in zip(records, x_points)
    ]

    left_axis_ticks = 5
    right_axis_ticks = 5
    x_ticks = min(len(seasons), 10)
    x_tick_step = max(1, len(seasons) // x_ticks)

    svg_parts = [
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}">',
        '<style>text{font-family:Helvetica,Arial,sans-serif;font-size:12px;fill:#333;} .title{font-size:18px;font-weight:bold;}</style>',
        f'<text class="title" x="{width/2:.1f}" y="{margin_top-10:.1f}" text-anchor="middle">{title}</text>',
        f'<rect x="{margin_left}" y="{margin_top}" width="{plot_width}" height="{plot_height}" fill="none" stroke="#ccc"/>',
    ]

    # Left axis ticks
    for i in range(left_axis_ticks + 1):
        value = left_domain[0] + (left_domain[1] - left_domain[0]) * i / left_axis_ticks
        y = margin_top + plot_height - scale_value(value, left_domain, plot_height)
        svg_parts.append(f'<line x1="{margin_left-5}" y1="{y:.2f}" x2="{margin_left}" y2="{y:.2f}" stroke="#666"/>')
        svg_parts.append(
            f'<text x="{margin_left-10}" y="{y+4:.2f}" text-anchor="end">{value:.1f}</text>'
        )
    svg_parts.append(
        f'<text x="{margin_left-45}" y="{margin_top + plot_height/2:.1f}" transform="rotate(-90 {margin_left-45} {margin_top + plot_height/2:.1f})" text-anchor="middle">{label_left}</text>'
    )

    # Right axis ticks
    for i in range(right_axis_ticks + 1):
        value = right_domain[0] + (right_domain[1] - right_domain[0]) * i / right_axis_ticks
        y = margin_top + plot_height - scale_value(value, right_domain, plot_height)
        svg_parts.append(f'<line x1="{margin_left + plot_width}" y1="{y:.2f}" x2="{margin_left + plot_width + 5}" y2="{y:.2f}" stroke="#666"/>')
        svg_parts.append(
            f'<text x="{margin_left + plot_width + 10}" y="{y+4:.2f}">{value:.1f}</text>'
        )
    svg_parts.append(
        f'<text x="{width - 20}" y="{margin_top + plot_height/2:.1f}" transform="rotate(90 {width - 20} {margin_top + plot_height/2:.1f})" text-anchor="middle">{label_right}</text>'
    )

    # X-axis ticks
    for i, season in enumerate(seasons):
        if i % x_tick_step != 0 and season != seasons[-1]:
            continue
        x = x_points[i]
        svg_parts.append(f'<line x1="{x:.2f}" y1="{margin_top + plot_height}" x2="{x:.2f}" y2="{margin_top + plot_height + 5}" stroke="#666"/>')
        svg_parts.append(
            f'<text x="{x:.2f}" y="{margin_top + plot_height + 20}" text-anchor="middle">{season}</text>'
        )

    # Grid lines (horizontal)
    for i in range(1, left_axis_ticks):
        value = left_domain[0] + (left_domain[1] - left_domain[0]) * i / left_axis_ticks
        y = margin_top + plot_height - scale_value(value, left_domain, plot_height)
        svg_parts.append(f'<line x1="{margin_left}" y1="{y:.2f}" x2="{margin_left + plot_width}" y2="{y:.2f}" stroke="#eee"/>')

    svg_parts.append(
        f'<path d="{svg_line(left_points)}" fill="none" stroke="{color_left}" stroke-width="2.5"/>'
    )
    svg_parts.append(
        f'<path d="{svg_line(right_points)}" fill="none" stroke="{color_right}" stroke-width="2.5" stroke-dasharray="6 4"/>'
    )

    svg_parts.append(
        f'<rect x="{margin_left + 10}" y="{margin_top + 10}" width="12" height="3" fill="{color_left}"/>'
    )
    svg_parts.append(
        f'<text x="{margin_left + 28}" y="{margin_top + 18}" text-anchor="start">{label_left}</text>'
    )
    svg_parts.append(
        f'<line x1="{margin_left + 10}" y1="{margin_top + 30}" x2="{margin_left + 22}" y2="{margin_top + 30}" stroke="{color_right}" stroke-width="2" stroke-dasharray="6 4"/>'
    )
    svg_parts.append(
        f'<text x="{margin_left + 28}" y="{margin_top + 34}" text-anchor="start">{label_right}</text>'
    )

    svg_parts.append("</svg>")

    (FIGURE_DIR / output_name).write_text("\n".join(svg_parts))


def create_curry_vs_league_chart() -> None:
    data = json.loads((ANALYSIS_DIR / "curry_vs_league.json").read_text())
    curry = [rec for rec in data["curry"] if rec["x3pa_per_game"] is not None]
    league = data["league_avg_player_3pa_per_game"]
    seasons = sorted({rec["season"] for rec in curry} | {rec["season"] for rec in league})

    records = []
    league_lookup = {rec["season"]: rec["avg_player_3pa_per_game"] for rec in league}
    for season in seasons:
        curry_entry = next((c for c in curry if c["season"] == season), None)
        records.append(
            {
                "season": season,
                "curry": curry_entry["x3pa_per_game"] if curry_entry else None,
                "league": league_lookup.get(season),
            }
        )

    create_line_chart_dual_axis(
        [rec for rec in records if rec["curry"] is not None and rec["league"] is not None],
        field_left="curry",
        label_left="Curry 3PA per game",
        field_right="league",
        label_right="League average 3PA per player",
        title="Stephen Curry vs. League Three-Point Volume",
        output_name="curry_vs_league.svg",
        color_left="#ff7f0e",
        color_right="#1f77b4",
    )


def create_league_trend_chart() -> None:
    data = json.loads((ANALYSIS_DIR / "league_3pa_trend.json").read_text())
    for record in data:
        record["avg_3p_percent"] = record["avg_3p_percent"] * 100.0

    create_line_chart_dual_axis(
        data,
        field_left="avg_3pa_per_game",
        label_left="League 3PA per game",
        field_right="avg_3p_percent",
        label_right="League 3P%",
        title="League Three-Point Attempts and Efficiency Over Time",
        output_name="league_3pa_trend.svg",
    )


def create_position_share_chart() -> None:
    data = json.loads((ANALYSIS_DIR / "position_3pa_shares.json").read_text())
    width, height = 880, 460
    margin_left, margin_right, margin_top, margin_bottom = 75, 40, 40, 60
    plot_width = width - margin_left - margin_right
    plot_height = height - margin_top - margin_bottom

    seasons = [rec["season"] for rec in data]
    xs_domain = (min(seasons), max(seasons))
    positions = sorted(
        {key.split("_")[1] for rec in data for key in rec if key.startswith("share_")}
    )
    palette = {
        "C": "#8c564b",
        "PF": "#9467bd",
        "SF": "#2ca02c",
        "SG": "#d62728",
        "PG": "#1f77b4",
        "UNK": "#7f7f7f",
    }

    svg_parts = [
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}">',
        '<style>text{font-family:Helvetica,Arial,sans-serif;font-size:12px;fill:#333;} .title{font-size:18px;font-weight:bold;}</style>',
        f'<text class=\"title\" x=\"{width/2:.1f}\" y=\"{margin_top-10:.1f}\" text-anchor=\"middle\">Rise of Stretch Positions</text>',
        f'<rect x=\"{margin_left}\" y=\"{margin_top}\" width=\"{plot_width}\" height=\"{plot_height}\" fill=\"none\" stroke=\"#ccc\"/>',
    ]

    # Axes
    for i in range(6):
        value = i / 5
        y = margin_top + plot_height - scale_value(value, (0, 1), plot_height)
        svg_parts.append(f'<line x1=\"{margin_left-5}\" y1=\"{y:.2f}\" x2=\"{margin_left}\" y2=\"{y:.2f}\" stroke=\"#666\"/>')
        svg_parts.append(f'<text x=\"{margin_left-10}\" y=\"{y+4:.2f}\" text-anchor=\"end\">{int(value*100)}%</text>')
        if 0 < i < 5:
            svg_parts.append(f'<line x1=\"{margin_left}\" y1=\"{y:.2f}\" x2=\"{margin_left + plot_width}\" y2=\"{y:.2f}\" stroke=\"#eee\"/>')

    svg_parts.append(
        f'<text x=\"{margin_left-50}\" y=\"{margin_top + plot_height/2:.1f}\" transform=\"rotate(-90 {margin_left-50} {margin_top + plot_height/2:.1f})\" text-anchor=\"middle\">Share of league 3PA</text>'
    )

    x_ticks = min(len(seasons), 12)
    x_step = max(1, len(seasons) // x_ticks)
    x_coords = [
        margin_left + scale_value(season, xs_domain, plot_width) for season in seasons
    ]
    for i, season in enumerate(seasons):
        if i % x_step != 0 and season != seasons[-1]:
            continue
        x = x_coords[i]
        svg_parts.append(f'<line x1=\"{x:.2f}\" y1=\"{margin_top + plot_height}\" x2=\"{x:.2f}\" y2=\"{margin_top + plot_height + 5}\" stroke=\"#666\"/>')
        svg_parts.append(f'<text x=\"{x:.2f}\" y=\"{margin_top + plot_height + 20}\" text-anchor=\"middle\">{season}</text>')

    # Lines per position
    for pos in positions:
        series = []
        for season, x in zip(seasons, x_coords):
            value = next((rec[f"share_{pos}"] for rec in data if rec["season"] == season and f"share_{pos}" in rec), None)
            if value is None:
                continue
            y = margin_top + plot_height - scale_value(value, (0, 1), plot_height)
            series.append((x, y))
        if not series:
            continue
        color = palette.get(pos, "#000000")
        svg_parts.append(
            f'<path d=\"{svg_line(series)}\" fill=\"none\" stroke=\"{color}\" stroke-width=\"2\"/>'
        )

    # Legend
    legend_y = margin_top + 10
    legend_x = margin_left + 10
    for pos in positions:
        color = palette.get(pos, "#000000")
        svg_parts.append(
            f'<rect x=\"{legend_x}\" y=\"{legend_y}\" width=\"12\" height=\"12\" fill=\"{color}\"/>'
        )
        svg_parts.append(
            f'<text x=\"{legend_x + 20}\" y=\"{legend_y + 10}\" text-anchor=\"start\">{pos}</text>'
        )
        legend_y += 18

    svg_parts.append("</svg>")
    (FIGURE_DIR / "position_3pa_share.svg").write_text("\n".join(svg_parts))


def create_shot_profile_chart() -> None:
    data = json.loads((ANALYSIS_DIR / "shot_profile_trends.json").read_text())
    for record in data:
        record["percent_fga_from_x3p_range"] = record.get("percent_fga_from_x3p_range", 0) * 100
        record["percent_fga_from_x10_16_range"] = record.get("percent_fga_from_x10_16_range", 0) * 100
        record["percent_fga_from_x16_3p_range"] = record.get("percent_fga_from_x16_3p_range", 0) * 100
        record["avg_dist_fga"] = record.get("avg_dist_fga", 0)

    width, height = 880, 460
    margin_left, margin_right, margin_top, margin_bottom = 70, 70, 40, 60
    plot_width = width - margin_left - margin_right
    plot_height = height - margin_top - margin_bottom

    seasons = [rec["season"] for rec in data]
    xs_domain = (min(seasons), max(seasons))
    y_domain = (0, max(rec["percent_fga_from_x3p_range"] for rec in data) * 1.05)

    x_coords = [
        margin_left + scale_value(season, xs_domain, plot_width) for season in seasons
    ]

    def path_for(field: str) -> str:
        pts = []
        for rec, x in zip(data, x_coords):
            value = rec.get(field)
            if value is None:
                continue
            y = margin_top + plot_height - scale_value(value, y_domain, plot_height)
            pts.append((x, y))
        return svg_line(pts)

    svg_parts = [
        f'<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"{width}\" height=\"{height}\" viewBox=\"0 0 {width} {height}\">',
        '<style>text{font-family:Helvetica,Arial,sans-serif;font-size:12px;fill:#333;} .title{font-size:18px;font-weight:bold;}</style>',
        f'<text class=\"title\" x=\"{width/2:.1f}\" y=\"{margin_top-10:.1f}\" text-anchor=\"middle\">Shot Selection Migration</text>',
        f'<rect x=\"{margin_left}\" y=\"{margin_top}\" width=\"{plot_width}\" height=\"{plot_height}\" fill=\"none\" stroke=\"#ccc\"/>',
    ]

    for i in range(6):
        value = y_domain[0] + (y_domain[1] - y_domain[0]) * i / 5
        y = margin_top + plot_height - scale_value(value, y_domain, plot_height)
        svg_parts.append(f'<line x1=\"{margin_left-5}\" y1=\"{y:.2f}\" x2=\"{margin_left}\" y2=\"{y:.2f}\" stroke=\"#666\"/>')
        svg_parts.append(f'<text x=\"{margin_left-10}\" y=\"{y+4:.2f}\" text-anchor=\"end\">{value:.0f}%</text>')
        if 0 < i < 5:
            svg_parts.append(f'<line x1=\"{margin_left}\" y1=\"{y:.2f}\" x2=\"{margin_left + plot_width}\" y2=\"{y:.2f}\" stroke=\"#eee\"/>')

    svg_parts.append(
        f'<text x=\"{margin_left-45}\" y=\"{margin_top + plot_height/2:.1f}\" transform=\"rotate(-90 {margin_left-45} {margin_top + plot_height/2:.1f})\" text-anchor=\"middle\">Share of FGA</text>'
    )

    x_ticks = min(len(seasons), 10)
    step = max(1, len(seasons) // x_ticks)
    for i, season in enumerate(seasons):
        if i % step != 0 and season != seasons[-1]:
            continue
        x = x_coords[i]
        svg_parts.append(f'<line x1=\"{x:.2f}\" y1=\"{margin_top + plot_height}\" x2=\"{x:.2f}\" y2=\"{margin_top + plot_height + 5}\" stroke=\"#666\"/>')
        svg_parts.append(f'<text x=\"{x:.2f}\" y=\"{margin_top + plot_height + 20}\" text-anchor=\"middle\">{season}</text>')

    three_path = path_for("percent_fga_from_x3p_range")
    mid_path = path_for("percent_fga_from_x10_16_range")
    long_mid_path = path_for("percent_fga_from_x16_3p_range")

    svg_parts.append(
        f'<path d="{three_path}" fill="none" stroke="#1f77b4" stroke-width="2.5"/>'
    )
    svg_parts.append(
        f'<path d="{mid_path}" fill="none" stroke="#d62728" stroke-width="2" stroke-dasharray="6 4"/>'
    )
    svg_parts.append(
        f'<path d="{long_mid_path}" fill="none" stroke="#9467bd" stroke-width="2" stroke-dasharray="3 3"/>'
    )

    legend_items = [
        ("Above-the-arc 3PA share", "#1f77b4", "solid"),
        ("Long midrange (16ft-3pt)", "#9467bd", "3 3"),
        ("Classic midrange (10-16ft)", "#d62728", "6 4"),
    ]
    legend_x = margin_left + 10
    legend_y = margin_top + 10
    for text, color, dash in legend_items:
        svg_parts.append(
            f'<line x1=\"{legend_x}\" y1=\"{legend_y}\" x2=\"{legend_x + 18}\" y2=\"{legend_y}\" stroke=\"{color}\" stroke-width=\"3\" stroke-dasharray=\"{dash}\"/>'
        )
        svg_parts.append(
            f'<text x=\"{legend_x + 24}\" y=\"{legend_y + 4}\" text-anchor=\"start\">{text}</text>'
        )
        legend_y += 18

    svg_parts.append("</svg>")
    (FIGURE_DIR / "shot_profile_migration.svg").write_text("\n".join(svg_parts))


def create_volume_vs_efficiency_chart() -> None:
    data = json.loads((ANALYSIS_DIR / "volume_vs_efficiency.json").read_text())
    width, height = 900, 400
    margin = 60
    plot_width = (width - margin * 2) / len(data)
    plot_height = height - margin * 2

    svg_parts = [
        f'<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"{width}\" height=\"{height}\" viewBox=\"0 0 {width} {height}\">',
        '<style>text{font-family:Helvetica,Arial,sans-serif;font-size:12px;fill:#333;} .title{font-size:18px;font-weight:bold;}</style>',
        f'<text class=\"title\" x=\"{width/2:.1f}\" y=\"{margin-20:.1f}\" text-anchor=\"middle\">3PA Volume vs Efficiency Snapshots</text>',
    ]

    panels = sorted(data.items())
    max_x = max(point["x3pa_per_game"] for panel in panels for point in panel[1]) * 1.1
    max_y = max(point["x3p_percent"] for panel in panels for point in panel[1]) * 1.05
    min_y = min(point["x3p_percent"] for panel in panels for point in panel[1]) * 0.95

    for index, (season, points) in enumerate(panels):
        left = margin + index * plot_width
        top = margin
        svg_parts.append(
            f'<rect x=\"{left}\" y=\"{top}\" width=\"{plot_width}\" height=\"{plot_height}\" fill=\"none\" stroke=\"#ccc\"/>'
        )
        svg_parts.append(
            f'<text x=\"{left + plot_width/2:.1f}\" y=\"{top - 10:.1f}\" text-anchor=\"middle\">Season {season}</text>'
        )

        # Axes ticks
        for i in range(5):
            value = max_x * i / 4
            x = left + scale_value(value, (0, max_x), plot_width)
            svg_parts.append(f'<line x1=\"{x:.2f}\" y1=\"{top + plot_height}\" x2=\"{x:.2f}\" y2=\"{top + plot_height + 5}\" stroke=\"#666\"/>')
            svg_parts.append(f'<text x=\"{x:.2f}\" y=\"{top + plot_height + 20}\" text-anchor=\"middle\">{value:.1f}</text>')

        for i in range(5):
            value = min_y + (max_y - min_y) * i / 4
            y = top + plot_height - scale_value(value, (min_y, max_y), plot_height)
            svg_parts.append(f'<line x1=\"{left-5}\" y1=\"{y:.2f}\" x2=\"{left}\" y2=\"{y:.2f}\" stroke=\"#666\"/>')
            svg_parts.append(f'<text x=\"{left-10}\" y=\"{y+4:.2f}\" text-anchor=\"end\">{value:.3f}</text>')
            if 0 < i < 4:
                svg_parts.append(f'<line x1=\"{left}\" y1=\"{y:.2f}\" x2=\"{left + plot_width}\" y2=\"{y:.2f}\" stroke=\"#eee\"/>')

        for point in points:
            x = left + scale_value(point["x3pa_per_game"], (0, max_x), plot_width)
            y = top + plot_height - scale_value(point["x3p_percent"], (min_y, max_y), plot_height)
            svg_parts.append(
                f'<circle cx=\"{x:.2f}\" cy=\"{y:.2f}\" r=\"3.5\" fill=\"#1f77b4\" opacity=\"0.8\">'
                f'<title>{point["team"]}\\n3PA: {point["x3pa_per_game"]:.1f}\\n3P%: {point["x3p_percent"]:.3f}</title></circle>'
            )

    svg_parts.append(
        f'<text x=\"{width/2:.1f}\" y=\"{height-10:.1f}\" text-anchor=\"middle\">3PA per game</text>'
    )
    svg_parts.append(
        f'<text x=\"{margin-40}\" y=\"{height/2:.1f}\" text-anchor=\"middle\" transform=\"rotate(-90 {margin-40} {height/2:.1f})\">3P%</text>'
    )

    svg_parts.append("</svg>")
    (FIGURE_DIR / "volume_vs_efficiency.svg").write_text("\n".join(svg_parts))


def create_team_adoption_chart() -> None:
    data = json.loads((ANALYSIS_DIR / "team_adoption_threshold.json").read_text())
    width, height = 880, 420
    margin_left, margin_right, margin_top, margin_bottom = 70, 40, 40, 60
    plot_width = width - margin_left - margin_right
    plot_height = height - margin_top - margin_bottom

    seasons = [rec["season"] for rec in data]
    net_ratings = [rec["net_rating"] for rec in data if rec["net_rating"] is not None]
    xs_domain = (min(seasons) - 1, max(seasons) + 1)
    ys_domain = (min(net_ratings) - 1, max(net_ratings) + 1)

    svg_parts = [
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}">',
        '<style>text{font-family:Helvetica,Arial,sans-serif;font-size:12px;fill:#333;} .title{font-size:18px;font-weight:bold;}</style>',
        f'<text class="title" x="{width/2:.1f}" y="{margin_top-10:.1f}" text-anchor="middle">When Teams Crossed the 40% 3PA Threshold</text>',
        f'<rect x="{margin_left}" y="{margin_top}" width="{plot_width}" height="{plot_height}" fill="none" stroke="#ccc"/>',
    ]

    years = sorted(set(seasons))
    step = max(1, len(years) // 10)
    for season in years:
        if (season - years[0]) % step != 0 and season != years[-1]:
            continue
        x = margin_left + scale_value(season, xs_domain, plot_width)
        svg_parts.append(f'<line x1="{x:.2f}" y1="{margin_top + plot_height}" x2="{x:.2f}" y2="{margin_top + plot_height + 5}" stroke="#666"/>')
        svg_parts.append(f'<text x="{x:.2f}" y="{margin_top + plot_height + 20}" text-anchor="middle">{season}</text>')

    y_ticks = 8
    for i in range(y_ticks + 1):
        value = ys_domain[0] + (ys_domain[1] - ys_domain[0]) * i / y_ticks
        y = margin_top + plot_height - scale_value(value, ys_domain, plot_height)
        svg_parts.append(f'<line x1="{margin_left-5}" y1="{y:.2f}" x2="{margin_left}" y2="{y:.2f}" stroke="#666"/>')
        svg_parts.append(f'<text x="{margin_left-10}" y="{y+4:.2f}" text-anchor="end">{value:.1f}</text>')
        if 0 < i < y_ticks:
            svg_parts.append(f'<line x1="{margin_left}" y1="{y:.2f}" x2="{margin_left + plot_width}" y2="{y:.2f}" stroke="#eee"/>')

    for rec in data:
        net = rec["net_rating"]
        if net is None:
            continue
        x = margin_left + scale_value(rec["season"], xs_domain, plot_width)
        y = margin_top + plot_height - scale_value(net, ys_domain, plot_height)
        svg_parts.append(
            f'<circle cx="{x:.2f}" cy="{y:.2f}" r="4" fill="#2ca02c" opacity="0.8">'
            f'<title>{rec["team"]}\\nSeason: {rec["season"]}\\nNet Rating: {net:.1f}</title>'
            "</circle>"
        )

    svg_parts.append(
        f'<text x="{width/2:.1f}" y="{height-15:.1f}" text-anchor="middle">Season of adoption (3PA rate ≥ 40%)</text>'
    )
    svg_parts.append(
        f'<text x="{margin_left-55}" y="{margin_top + plot_height/2:.1f}" transform="rotate(-90 {margin_left-55} {margin_top + plot_height/2:.1f})" text-anchor="middle">Net rating that season</text>'
    )

    svg_parts.append("</svg>")
    (FIGURE_DIR / "team_adoption_threshold.svg").write_text("\n".join(svg_parts))


def main() -> None:
    create_league_trend_chart()
    create_curry_vs_league_chart()
    create_position_share_chart()
    create_shot_profile_chart()
    create_volume_vs_efficiency_chart()
    create_team_adoption_chart()
    print("Charts generated in", FIGURE_DIR)


if __name__ == "__main__":
    main()
