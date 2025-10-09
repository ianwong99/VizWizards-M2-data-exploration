/* global d3 */

const DATA_DIR = "../analysis";
const DATA_SOURCES = {
  leagueTrend: {
    file: "Team Stats Per Game.csv",
    fields: ["season", "x3pa_per_game", "x3p_percent"],
  },
  volumeEfficiency: {
    file: "Team Stats Per Game.csv",
    fields: ["season", "team", "x3pa_per_game", "x3p_percent"],
  },
  curryComparison: {
    file: "Player Per Game.csv",
    fields: ["season", "player", "team", "x3pa_per_game", "x3p_percent"],
  },
  positionShare: {
    file: "Player Totals.csv",
    fields: ["season", "pos", "x3pa"],
  },
  shotProfile: {
    file: "Player Shooting.csv",
    fields: [
      "season",
      "percent_fga_from_x3p_range",
      "percent_fga_from_x10_16_range",
      "percent_fga_from_x16_3p_range",
      "avg_dist_fga",
    ],
  },
  teamAdoption: {
    file: "Team Summaries.csv",
    fields: ["season", "team", "x3p_ar", "n_rtg", "w", "l"],
  },
};

async function loadJSON(name) {
  const response = await fetch(`${DATA_DIR}/${name}`);
  if (!response.ok) throw new Error(`Failed to load ${name}`);
  return response.json();
}

function createTooltip(container) {
  const tip = container.append("div").attr("class", "tooltip");
  return {
    show: (html, x, y) => {
      tip
        .style("left", `${x}px`)
        .style("top", `${y}px`)
        .style("opacity", 1)
        .html(html);
    },
    hide: () => {
      tip.style("opacity", 0);
    },
  };
}

function responsiveSvg({ container, margin, height = 420 }) {
  const node = container.node();
  const width = node.getBoundingClientRect().width || 800;
  const svg = container
    .append("svg")
    .attr("width", width)
    .attr("height", height)
    .attr("viewBox", `0 0 ${width} ${height}`);

  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  const g = svg
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  return { svg, g, width, innerWidth, innerHeight };
}

async function renderLeagueTrend() {
  const data = (await loadJSON("league_3pa_trend.json"))
    .filter((d) => d.season >= 1979)
    .map((d) => ({
      season: +d.season,
      attempts: +d.avg_3pa_per_game,
      pct: +d.avg_3p_percent * 100,
    }));

  const container = d3.select('[data-chart="leagueTrend"]');
  const margin = { top: 40, right: 80, bottom: 50, left: 60 };
  const { g, innerWidth, innerHeight, svg } = responsiveSvg({
    container,
    margin,
    height: 420,
  });

  const x = d3
    .scaleLinear()
    .domain(d3.extent(data, (d) => d.season))
    .range([0, innerWidth]);

  const yLeft = d3
    .scaleLinear()
    .domain([0, d3.max(data, (d) => d.attempts) * 1.05])
    .nice()
    .range([innerHeight, 0]);

  const yRight = d3
    .scaleLinear()
    .domain([20, d3.max(data, (d) => d.pct) * 1.05])
    .nice()
    .range([innerHeight, 0]);

  const lineLeft = d3
    .line()
    .x((d) => x(d.season))
    .y((d) => yLeft(d.attempts))
    .curve(d3.curveMonotoneX);

  const lineRight = d3
    .line()
    .x((d) => x(d.season))
    .y((d) => yRight(d.pct))
    .curve(d3.curveMonotoneX);

  g.append("g")
    .attr("transform", `translate(0,${innerHeight})`)
    .call(
      d3
        .axisBottom(x)
        .ticks(Math.min(12, data.length))
        .tickFormat(d3.format("d"))
    );

  g.append("g").call(d3.axisLeft(yLeft).ticks(6));
  g.append("g")
    .attr("transform", `translate(${innerWidth},0)`)
    .call(d3.axisRight(yRight).ticks(6).tickFormat((d) => `${d}%`));

  g.append("path")
    .datum(data)
    .attr("fill", "none")
    .attr("stroke", "#1f77b4")
    .attr("stroke-width", 2.5)
    .attr("d", lineLeft);

  g.append("path")
    .datum(data)
    .attr("fill", "none")
    .attr("stroke", "#d62728")
    .attr("stroke-width", 2.5)
    .attr("stroke-dasharray", "6 4")
    .attr("d", lineRight);

  const legend = svg
    .append("g")
    .attr("transform", `translate(${margin.left + 10},${margin.top})`);

  legend.append("text").text("League 3PA per game").attr("x", 30).attr("y", 0);
  legend
    .append("line")
    .attr("x1", 0)
    .attr("x2", 20)
    .attr("y1", -4)
    .attr("y2", -4)
    .attr("stroke", "#1f77b4")
    .attr("stroke-width", 3);

  legend
    .append("text")
    .text("League 3P%")
    .attr("x", 30)
    .attr("y", 18);
  legend
    .append("line")
    .attr("x1", 0)
    .attr("x2", 20)
    .attr("y1", 12)
    .attr("y2", 12)
    .attr("stroke", "#d62728")
    .attr("stroke-width", 3)
    .attr("stroke-dasharray", "6 4");
}

async function renderVolumeEfficiency() {
  const raw = await loadJSON("volume_vs_efficiency.json");
  const seasons = ["2000", "2010", "2020", "2025"].filter((year) => raw[year]);
  const container = d3.select('[data-chart="volumeEfficiency"]');
  container.selectAll("*").remove();
  const tooltip = createTooltip(container);

  const cols = seasons.length;
  const width = container.node().getBoundingClientRect().width || 800;
  const panelWidth = width / cols;
  const height = 400;
  const margin = { top: 50, right: 30, bottom: 50, left: 60 };

  const svg = container
    .append("svg")
    .attr("width", width)
    .attr("height", height)
    .attr("viewBox", `0 0 ${width} ${height}`);

  const maxX =
    d3.max(seasons, (s) => d3.max(raw[s], (d) => d.x3pa_per_game)) * 1.1;
  const yExtent = d3.extent(seasons, (s) =>
    d3.extent(raw[s], (d) => d.x3p_percent)
  );
  const minY = yExtent[0][0] * 0.95;
  const maxY = yExtent[1][1] * 1.05;

  seasons.forEach((season, index) => {
    const g = svg
      .append("g")
      .attr(
        "transform",
        `translate(${panelWidth * index + margin.left},${margin.top})`
      );
    const innerWidth = panelWidth - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const x = d3.scaleLinear().domain([0, maxX]).range([0, innerWidth]);
    const y = d3.scaleLinear().domain([minY, maxY]).range([innerHeight, 0]);

    g.append("rect")
      .attr("width", innerWidth)
      .attr("height", innerHeight)
      .attr("fill", "none")
      .attr("stroke", "#d1d5db");

    g.append("g")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(d3.axisBottom(x).ticks(4));
    g.append("g").call(d3.axisLeft(y).ticks(4).tickFormat(d3.format(".3f")));

    g.append("text")
      .attr("x", innerWidth / 2)
      .attr("y", -15)
      .attr("text-anchor", "middle")
      .attr("font-weight", "600")
      .text(`Season ${season}`);

    g.selectAll("circle")
      .data(raw[season])
      .join("circle")
      .attr("cx", (d) => x(d.x3pa_per_game))
      .attr("cy", (d) => y(d.x3p_percent))
      .attr("r", 4)
      .attr("fill", "#1f77b4")
      .attr("opacity", 0.75)
      .on("mouseenter", (event, d) => {
        tooltip.show(
          `${d.team}\n3PA: ${d.x3pa_per_game.toFixed(
            1
          )}\n3P%: ${(d.x3p_percent * 100).toFixed(1)}%`,
          event.offsetX,
          event.offsetY
        );
      })
      .on("mouseleave", () => tooltip.hide());
  });
}

async function renderCurryComparison() {
  const raw = await loadJSON("curry_vs_league.json");
  const curry = raw.curry.filter((d) => d.x3pa_per_game != null && d.season >= 2010);
  const leagueLookup = new Map(
    raw.league_avg_player_3pa_per_game.map((d) => [d.season, d.avg_player_3pa_per_game])
  );
  const data = curry.map((d) => ({
    season: +d.season,
    curry: +d.x3pa_per_game,
    league: +leagueLookup.get(d.season),
  }));

  const container = d3.select('[data-chart="curryComparison"]');
  const margin = { top: 50, right: 60, bottom: 50, left: 60 };
  const { g, innerWidth, innerHeight, svg } = responsiveSvg({
    container,
    margin,
    height: 420,
  });

  const x = d3
    .scaleLinear()
    .domain(d3.extent(data, (d) => d.season))
    .range([0, innerWidth]);

  const maxLeft = d3.max(data, (d) => d.curry) * 1.1;
  const maxRight = d3.max(data, (d) => d.league) * 1.5;

  const yLeft = d3.scaleLinear().domain([0, maxLeft]).range([innerHeight, 0]);
  const yRight = d3.scaleLinear().domain([0, maxRight]).range([innerHeight, 0]);

  const areaLeague = d3
    .area()
    .x((d) => x(d.season))
    .y0(innerHeight)
    .y1((d) => yRight(d.league))
    .curve(d3.curveMonotoneX);

  const lineCurry = d3
    .line()
    .x((d) => x(d.season))
    .y((d) => yLeft(d.curry))
    .curve(d3.curveMonotoneX);

  g.append("g")
    .attr("transform", `translate(0,${innerHeight})`)
    .call(
      d3.axisBottom(x).ticks(Math.min(12, data.length)).tickFormat(d3.format("d"))
    );
  g.append("g").call(d3.axisLeft(yLeft).ticks(6));
  g.append("g")
    .attr("transform", `translate(${innerWidth},0)`)
    .call(d3.axisRight(yRight).ticks(6));

  g.append("path")
    .datum(data)
    .attr("fill", "rgba(31, 119, 180, 0.2)")
    .attr("d", areaLeague);

  g.append("path")
    .datum(data)
    .attr("fill", "none")
    .attr("stroke", "#ff7f0e")
    .attr("stroke-width", 3)
    .attr("d", lineCurry);

  g.selectAll("circle.curry")
    .data(data)
    .join("circle")
    .attr("class", "curry")
    .attr("cx", (d) => x(d.season))
    .attr("cy", (d) => yLeft(d.curry))
    .attr("r", 4)
    .attr("fill", "#ff7f0e");

  svg
    .append("g")
    .attr("transform", `translate(${margin.left + 10},${margin.top})`)
    .call((legend) => {
      legend
        .append("text")
        .text("Curry 3PA per game")
        .attr("x", 30)
        .attr("y", 0);
      legend
        .append("line")
        .attr("x1", 0)
        .attr("x2", 20)
        .attr("y1", -4)
        .attr("y2", -4)
        .attr("stroke", "#ff7f0e")
        .attr("stroke-width", 3);

      legend
        .append("text")
        .text("League avg player 3PA")
        .attr("x", 30)
        .attr("y", 18);
      legend
        .append("rect")
        .attr("x", 0)
        .attr("y", 6)
        .attr("width", 20)
        .attr("height", 8)
        .attr("fill", "rgba(31, 119, 180, 0.2)")
        .attr("stroke", "#1f77b4")
        .attr("stroke-width", 1);
    });
}

async function renderPositionShare() {
  const data = (await loadJSON("position_3pa_shares.json"))
    .filter((d) => d.season >= 1997)
    .map((d) => ({
      season: +d.season,
      PG: d.share_PG ?? 0,
      SG: d.share_SG ?? 0,
      SF: d.share_SF ?? 0,
      PF: d.share_PF ?? 0,
      C: d.share_C ?? 0,
    }));

  const positions = ["PG", "SG", "SF", "PF", "C"];
  const palette = {
    PG: "#1f77b4",
    SG: "#d62728",
    SF: "#2ca02c",
    PF: "#9467bd",
    C: "#8c564b",
  };

  const container = d3.select('[data-chart="positionShare"]');
  const margin = { top: 50, right: 100, bottom: 50, left: 60 };
  const { g, innerWidth, innerHeight, svg } = responsiveSvg({
    container,
    margin,
    height: 420,
  });

  const x = d3
    .scaleLinear()
    .domain(d3.extent(data, (d) => d.season))
    .range([0, innerWidth]);
  const y = d3.scaleLinear().domain([0, 0.6]).range([innerHeight, 0]);

  g.append("g")
    .attr("transform", `translate(0,${innerHeight})`)
    .call(
      d3.axisBottom(x).ticks(Math.min(12, data.length)).tickFormat(d3.format("d"))
    );
  g.append("g")
    .call(d3.axisLeft(y).ticks(6).tickFormat((d) => `${(d * 100).toFixed(0)}%`));

  positions.forEach((pos) => {
    const line = d3
      .line()
      .x((d) => x(d.season))
      .y((d) => y(d[pos]))
      .curve(d3.curveMonotoneX);

    g.append("path")
      .datum(data)
      .attr("fill", "none")
      .attr("stroke", palette[pos])
      .attr("stroke-width", 2.5)
      .attr("d", line);
  });

  const legend = svg
    .append("g")
    .attr(
      "transform",
      `translate(${svg.attr("width") - margin.right + 10},${margin.top})`
    );

  positions.forEach((pos, index) => {
    const row = legend.append("g").attr("transform", `translate(0,${index * 18})`);
    row
      .append("line")
      .attr("x1", 0)
      .attr("x2", 20)
      .attr("y1", 0)
      .attr("y2", 0)
      .attr("stroke", palette[pos])
      .attr("stroke-width", 3);
    row.append("text").text(pos).attr("x", 30).attr("y", 4);
  });
}

async function renderShotProfile() {
  const data = (await loadJSON("shot_profile_trends.json"))
    .filter((d) => d.season >= 1997)
    .map((d) => ({
      season: +d.season,
      three: +d.percent_fga_from_x3p_range * 100,
      mid: +d.percent_fga_from_x10_16_range * 100,
      longMid: +d.percent_fga_from_x16_3p_range * 100,
    }));

  const container = d3.select('[data-chart="shotProfile"]');
  const margin = { top: 50, right: 60, bottom: 50, left: 60 };
  const { g, innerWidth, innerHeight } = responsiveSvg({
    container,
    margin,
    height: 420,
  });

  const x = d3
    .scaleLinear()
    .domain(d3.extent(data, (d) => d.season))
    .range([0, innerWidth]);
  const y = d3.scaleLinear().domain([0, 50]).range([innerHeight, 0]);

  g.append("g")
    .attr("transform", `translate(0,${innerHeight})`)
    .call(
      d3.axisBottom(x).ticks(Math.min(12, data.length)).tickFormat(d3.format("d"))
    );
  g.append("g").call(d3.axisLeft(y).ticks(6).tickFormat((d) => `${d}%`));

  const series = [
    { key: "three", label: "3PA share", color: "#1f77b4", width: 2.5 },
    { key: "mid", label: "Midrange (10-16ft)", color: "#d62728", width: 2 },
    { key: "longMid", label: "Long midrange (16ft-3pt)", color: "#9467bd", width: 2 },
  ];

  series.forEach((serie) => {
    const line = d3
      .line()
      .x((d) => x(d.season))
      .y((d) => y(d[serie.key]))
      .curve(d3.curveMonotoneX);

    g.append("path")
      .datum(data)
      .attr("fill", "none")
      .attr("stroke", serie.color)
      .attr("stroke-width", serie.width)
      .attr("d", line);
  });
}

async function renderTeamAdoption() {
  const data = (await loadJSON("team_adoption_threshold.json")).map((d) => ({
    team: d.team,
    season: +d.season,
    netRating: d.net_rating != null ? +d.net_rating : null,
  }));

  const filtered = data.filter((d) => d.netRating != null);

  const container = d3.select('[data-chart="teamAdoption"]');
  const margin = { top: 50, right: 60, bottom: 60, left: 60 };
  const tooltip = createTooltip(container);
  const { g, innerWidth, innerHeight } = responsiveSvg({
    container,
    margin,
    height: 420,
  });

  const x = d3
    .scaleLinear()
    .domain(d3.extent(filtered, (d) => d.season))
    .nice()
    .range([0, innerWidth]);
  const y = d3
    .scaleLinear()
    .domain(d3.extent(filtered, (d) => d.netRating))
    .nice()
    .range([innerHeight, 0]);

  g.append("g")
    .attr("transform", `translate(0,${innerHeight})`)
    .call(
      d3.axisBottom(x).ticks(Math.min(12, filtered.length)).tickFormat(d3.format("d"))
    );
  g.append("g").call(d3.axisLeft(y).ticks(6));

  g.selectAll("circle")
    .data(filtered)
    .join("circle")
    .attr("cx", (d) => x(d.season))
    .attr("cy", (d) => y(d.netRating))
    .attr("r", 5)
    .attr("fill", "#2ca02c")
    .attr("opacity", 0.8)
    .on("mouseenter", (event, d) => {
      tooltip.show(
        `${d.team} (${d.season})\nNet Rating: ${d.netRating.toFixed(1)}`,
        event.offsetX,
        event.offsetY
      );
    })
    .on("mouseleave", () => tooltip.hide());
}

async function init() {
  applyDataSourceNotes();
  await Promise.all([
    renderLeagueTrend(),
    renderVolumeEfficiency(),
    renderCurryComparison(),
    renderPositionShare(),
    renderShotProfile(),
    renderTeamAdoption(),
  ]);
}

function applyDataSourceNotes() {
  Object.entries(DATA_SOURCES).forEach(([key, meta]) => {
    d3.select(`[data-source="${key}"]`).text(
      `Data: ${meta.file} → fields used: ${meta.fields.join(", ")}`
    );
  });
}

document.addEventListener("DOMContentLoaded", init);
