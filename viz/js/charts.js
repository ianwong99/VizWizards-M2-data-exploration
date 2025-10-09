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
  const [summary, perGameRows] = await Promise.all([
    loadJSON("curry_vs_league.json"),
    d3.csv("../Player%20Per%20Game.csv", d3.autoType),
  ]);

  const leagueSeries = summary.league_avg_player_3pa_per_game
    .filter((d) => d.season >= 2010)
    .map((d) => ({
      season: +d.season,
      attempts: +d.avg_player_3pa_per_game,
    }));

  const playerSeasonGroup = d3.group(
    perGameRows.filter((row) => row.season >= 2010 && row.x3pa_per_game != null),
    (row) => row.player,
    (row) => row.season
  );

  const playerSeries = new Map();
  const playerCatalog = [];

  playerSeasonGroup.forEach((seasonMap, player) => {
    const records = [];
    seasonMap.forEach((entries, season) => {
      const preferred =
        entries.find((entry) => entry.team === "TOT") ?? entries[0];
      if (
        preferred == null ||
        preferred.x3pa_per_game == null ||
        preferred.x3p_percent == null
      ) {
        return;
      }
      records.push({
        season: +season,
        attempts: +preferred.x3pa_per_game,
        pct: +preferred.x3p_percent,
      });
    });

    records.sort((a, b) => a.season - b.season);
    if (records.length) {
      playerSeries.set(player, records);
      playerCatalog.push({
        player,
        averageAttempts: d3.mean(records, (d) => d.attempts) ?? 0,
      });
    }
  });

  const currySeries = playerSeries.get("Stephen Curry") ?? [];

  const playersSorted = playerCatalog
    .filter((d) => d.player !== "Stephen Curry")
    .sort((a, b) => d3.descending(a.averageAttempts, b.averageAttempts));

  const controls = d3.select('[data-controls="curryComparison"]');
  const datalist = controls.select("datalist#player-options");
  datalist
    .selectAll("option")
    .data(playersSorted, (d) => d.player)
    .join("option")
    .attr("value", (d) => d.player);

  const state = {
    extraPlayers: [],
  };

  const chipContainer = controls.select("[data-chip-list]");
  const addButton = controls.select('[data-action="add-player"]');
  const clearButton = controls.select('[data-action="clear-players"]');
  const input = controls.select("#player-search");

  const palette = d3.scaleOrdinal(d3.schemeTableau10);
  const curryColor = "#ff7f0e";
  const leagueFill = "rgba(15, 23, 42, 0.18)";

  const container = d3.select('[data-chart="curryComparison"]');
  container.selectAll("*").remove();
  const margin = { top: 60, right: 60, bottom: 50, left: 60 };
  const { g, innerWidth, innerHeight, svg } = responsiveSvg({
    container,
    margin,
    height: 440,
  });

  const x = d3.scaleLinear().range([0, innerWidth]);
  const y = d3.scaleLinear().range([innerHeight, 0]);

  const xAxis = g
    .append("g")
    .attr("class", "x-axis")
    .attr("transform", `translate(0,${innerHeight})`);
  const yAxis = g.append("g").attr("class", "y-axis");

  const areaPath = g
    .append("path")
    .attr("class", "league-area")
    .attr("fill", leagueFill)
    .attr("stroke", "#1e293b")
    .attr("stroke-width", 1)
    .attr("stroke-opacity", 0.3);

  const linesGroup = g.append("g").attr("class", "player-lines");
  const dotsGroup = g.append("g").attr("class", "player-dots");

  const legendGroup = svg
    .append("g")
    .attr("class", "legend")
    .attr("transform", `translate(${margin.left + 10},${margin.top - 35})`);

  const areaGenerator = d3
    .area()
    .defined((d) => d.attempts != null)
    .x((d) => x(d.season))
    .y0(innerHeight)
    .y1((d) => y(d.attempts))
    .curve(d3.curveMonotoneX);

  const lineGenerator = d3
    .line()
    .defined((d) => d.attempts != null)
    .x((d) => x(d.season))
    .y((d) => y(d.attempts))
    .curve(d3.curveMonotoneX);

  function updateChart() {
    const activeSeries = [
      {
        name: "League avg player 3PA",
        type: "league",
        color: leagueFill,
        values: leagueSeries,
      },
      {
        name: "Stephen Curry",
        type: "player",
        color: curryColor,
        values: currySeries,
      },
      ...state.extraPlayers
        .map((player) => ({
          name: player,
          type: "player",
          color: palette(player),
          values: playerSeries.get(player) ?? [],
        }))
        .filter((series) => series.values.length),
    ];

    const seasons = d3.extent(leagueSeries, (d) => d.season);
    x.domain(seasons);

    const maxAttempts =
      d3.max(activeSeries, (series) =>
        d3.max(series.values, (d) => d.attempts)
      ) ?? 1;
    y.domain([0, maxAttempts * 1.1]).nice();

    xAxis.call(
      d3
        .axisBottom(x)
        .ticks(Math.min(12, leagueSeries.length))
        .tickFormat(d3.format("d"))
    );
    yAxis.call(d3.axisLeft(y).ticks(6));

    areaPath.datum(leagueSeries).attr("d", areaGenerator);

    const playerLines = linesGroup
      .selectAll("path.player-line")
      .data(
        activeSeries.filter((s) => s.type === "player"),
        (d) => d.name
      );

    playerLines
      .enter()
      .append("path")
      .attr("class", "player-line")
      .attr("fill", "none")
      .attr("stroke-width", 3)
      .attr("stroke-linejoin", "round")
      .attr("stroke-linecap", "round")
      .merge(playerLines)
      .attr("stroke", (d) => d.color)
      .attr("d", (d) => lineGenerator(d.values));

    playerLines.exit().remove();

    const playerDots = dotsGroup
      .selectAll("g.player-dots")
      .data(
        activeSeries.filter((s) => s.type === "player"),
        (d) => d.name
      );

    const dotsEnter = playerDots.enter().append("g").attr("class", "player-dots");

    dotsEnter
      .merge(playerDots)
      .selectAll("circle")
      .data((d) => d.values, (d) => d.season)
      .join(
        (enter) =>
          enter
            .append("circle")
            .attr("r", 4)
            .attr("fill", function (_, i, nodes) {
              const parentData = d3.select(nodes[i].parentNode).datum();
              return parentData.color;
            })
            .attr("cx", (d) => x(d.season))
            .attr("cy", (d) => y(d.attempts)),
        (update) =>
          update
            .attr("fill", function (_, i, nodes) {
              const parentData = d3.select(nodes[i].parentNode).datum();
              return parentData.color;
            })
            .attr("cx", (d) => x(d.season))
            .attr("cy", (d) => y(d.attempts)),
        (exit) => exit.remove()
      );

    playerDots.exit().remove();

    const legendItems = legendGroup
      .selectAll("g.legend-item")
      .data(activeSeries, (d) => d.name);

    const legendEnter = legendItems
      .enter()
      .append("g")
      .attr("class", "legend-item")
      .attr("transform", (_, i) => `translate(${i * 180},0)`);

    legendEnter
      .append("rect")
      .attr("width", 18)
      .attr("height", 9)
      .attr("y", -12)
      .attr("rx", 2)
      .attr("ry", 2);

    legendEnter
      .append("text")
      .attr("x", 24)
      .attr("y", -4)
      .attr("font-size", 12)
      .attr("font-weight", 600);

    legendItems
      .merge(legendEnter)
      .attr("transform", (_, i) => `translate(${i * 180},0)`)
      .select("rect")
      .attr("fill", (d) =>
        d.type === "league" ? leagueFill : d.color
      )
      .attr("stroke", (d) =>
        d.type === "league" ? "#1e293b" : d.color
      )
      .attr("stroke-width", 1.5);

    legendItems
      .merge(legendEnter)
      .select("text")
      .text((d) => d.name);

    legendItems.exit().remove();
  }

  function renderChips() {
    const chips = chipContainer.selectAll(".chip").data(state.extraPlayers, (d) => d);
    const chipsEnter = chips
      .enter()
      .append("span")
      .attr("class", "chip");

    chipsEnter
      .append("span")
      .attr("class", "chip-label");

    chipsEnter
      .append("button")
      .attr("type", "button")
      .attr("aria-label", "Remove player")
      .text("✕")
      .on("click", (_, player) => {
        state.extraPlayers = state.extraPlayers.filter((p) => p !== player);
        renderChips();
        updateChart();
      });

    chips
      .merge(chipsEnter)
      .select(".chip-label")
      .text((d) => d);

    chips.exit().remove();
    chipContainer.classed("empty", state.extraPlayers.length === 0);
  }

  function addPlayer(name) {
    const trimmed = name.trim();
    if (
      !trimmed ||
      trimmed === "Stephen Curry" ||
      !playerSeries.has(trimmed) ||
      state.extraPlayers.includes(trimmed)
    ) {
      return;
    }
    state.extraPlayers.push(trimmed);
    renderChips();
    updateChart();
  }

  addButton.on("click", () => {
    addPlayer(input.property("value"));
    input.property("value", "");
  });

  input.on("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      addPlayer(input.property("value"));
      input.property("value", "");
    }
  });

  clearButton.on("click", () => {
    state.extraPlayers = [];
    renderChips();
    updateChart();
  });

  renderChips();
  updateChart();
}

async function renderPositionShare() {
  const [positionData, playerShare] = await Promise.all([
    loadJSON("position_3pa_shares.json"),
    loadJSON("player_league_share.json"),
  ]);

  const data = positionData
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

  const playerSeries = new Map();
  const playerMeta = new Map();
  const availablePlayers = [];
  const featuredPlayers = [
    "Stephen Curry",
    "Damian Lillard",
    "James Harden",
    "Klay Thompson",
    "Paul George",
    "LeBron James",
    "Kevin Durant",
    "Giannis Antetokounmpo",
    "Dirk Nowitzki",
    "Karl-Anthony Towns",
    "Nikola Jokic",
    "Joel Embiid",
    "Kristaps Porzingis",
  ];

  playerShare.forEach((record) => {
    const values = (record.seasons || [])
      .filter((entry) => entry.season >= 1997)
      .map((entry) => ({
        season: +entry.season,
        share: +entry.share,
      }))
      .sort((a, b) => a.season - b.season);
    if (!values.length) return;
    const position = record.position || "UNK";
    const avgShare = +record.avg_share || 0;
    playerSeries.set(record.player, values);
    playerMeta.set(record.player, {
      player: record.player,
      position,
      avgShare,
    });
    availablePlayers.push({
      player: record.player,
      position,
      avgShare,
    });
  });

  const featuredSet = new Set(
    featuredPlayers.filter((name) => playerSeries.has(name))
  );

  const positionOrder = ["PG", "SG", "SF", "PF", "C", "UNK"];
  const positionLabels = {
    PG: "Point Guards",
    SG: "Shooting Guards",
    SF: "Small Forwards",
    PF: "Power Forwards",
    C: "Centers",
    UNK: "Other / Unknown",
  };

  const container = d3.select('[data-chart="positionShare"]');
  const margin = { top: 60, right: 100, bottom: 50, left: 60 };
  const { g, innerWidth, innerHeight, svg } = responsiveSvg({
    container,
    margin,
    height: 420,
  });

  const x = d3
    .scaleLinear()
    .domain(d3.extent(data, (d) => d.season))
    .range([0, innerWidth]);
  const baselineMax = d3.max(data, (d) =>
    d3.max(positions, (pos) => d[pos] ?? 0)
  );
  const y = d3.scaleLinear()
    .domain([0, Math.max(0.6, baselineMax || 0.4)])
    .range([innerHeight, 0]);

  g.append("g")
    .attr("transform", `translate(0,${innerHeight})`)
    .call(
      d3.axisBottom(x).ticks(Math.min(12, data.length)).tickFormat(d3.format("d"))
    );
  g.append("g")
      .call(d3.axisLeft(y).ticks(6).tickFormat((d) => `${(d * 100).toFixed(0)}%`));

  const baselineGroup = g.append("g").attr("class", "baseline-lines");
  const baselineLine = d3
    .line()
    .defined((d) => d.value != null)
    .x((d) => x(d.season))
    .y((d) => y(d.value))
    .curve(d3.curveMonotoneX);

  baselineGroup
    .selectAll("path")
    .data(
      positions.map((pos) => ({
        pos,
        values: data.map((row) => ({
          season: row.season,
          value: row[pos],
        })),
      }))
    )
    .join("path")
    .attr("fill", "none")
    .attr("stroke-width", 2.5)
    .attr("stroke-linejoin", "round")
    .attr("stroke-linecap", "round")
    .attr("stroke", (d) => palette[d.pos])
    .attr("d", (d) => baselineLine(d.values));

  const svgWidth = parseFloat(svg.attr("width"));
  const legend = svg
    .append("g")
    .attr(
      "transform",
      `translate(${svgWidth - margin.right + 10},${margin.top})`
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

  const playerLinesGroup = g.append("g").attr("class", "highlight-player-lines");
  const playerDotsGroup = g.append("g").attr("class", "highlight-player-dots");

  const controls = d3.select('[data-controls="positionShare"]');
  const select = controls.select("#position-player-search");
  const chipContainer = controls.select("[data-pos-chip-list]");
  const addButton = controls.select('[data-action="add-pos-player"]');
  const clearButton = controls.select('[data-action="clear-pos-players"]');

  select.selectAll("*").remove();
  select
    .append("option")
    .attr("value", "")
    .attr("disabled", true)
    .attr("selected", true)
    .text("Select a player...");

  if (featuredSet.size) {
    const group = select.append("optgroup").attr("label", "Featured Players");
    featuredPlayers
      .filter((name) => featuredSet.has(name))
      .forEach((name) => {
        const meta = playerMeta.get(name);
        if (!meta) return;
        group
          .append("option")
          .attr("value", name)
          .text(`${name} (${meta.position || "NA"})`);
      });
  }

  const groupedByPosition = d3.group(
    availablePlayers.filter((d) => !featuredSet.has(d.player)),
    (d) => d.position || "UNK"
  );

  positionOrder.forEach((pos) => {
    const players = groupedByPosition.get(pos);
    if (!players || !players.length) return;
    const group = select
      .append("optgroup")
      .attr("label", positionLabels[pos] || pos);
    players
      .sort((a, b) => d3.descending(a.avgShare, b.avgShare))
      .slice(0, 150)
      .forEach((entry) => {
        group
          .append("option")
          .attr("value", entry.player)
          .text(`${entry.player} (${pos})`);
      });
  });

  const colorScale = d3.scaleOrdinal(d3.schemeTableau10);
  const state = {
    players: [],
    colorMap: new Map(),
  };

  function getColor(player) {
    if (!state.colorMap.has(player)) {
      state.colorMap.set(player, colorScale(player));
    }
    return state.colorMap.get(player);
  }

  function updatePlayers() {
    const active = state.players
      .map((player) => ({
        player,
        color: getColor(player),
        values: playerSeries.get(player) || [],
      }))
      .filter((entry) => entry.values.length);

    const playerLineGenerator = d3
      .line()
      .defined((d) => d.share != null)
      .x((d) => x(d.season))
      .y((d) => y(d.share))
      .curve(d3.curveMonotoneX);

    const lines = playerLinesGroup
      .selectAll("path.player-overlay")
      .data(active, (d) => d.player);

    lines
      .enter()
      .append("path")
      .attr("class", "player-overlay")
      .attr("fill", "none")
      .attr("stroke-width", 2.5)
      .attr("stroke-linejoin", "round")
      .attr("stroke-linecap", "round")
      .merge(lines)
      .attr("stroke", (d) => d.color)
      .attr("d", (d) => playerLineGenerator(d.values));

    lines.exit().remove();

    const dots = playerDotsGroup
      .selectAll("g.player-overlay-dots")
      .data(active, (d) => d.player);

    const dotsEnter = dots.enter().append("g").attr("class", "player-overlay-dots");

    dotsEnter
      .merge(dots)
      .selectAll("circle")
      .data((d) => d.values, (d) => d.season)
      .join(
        (enter) =>
          enter
            .append("circle")
            .attr("r", 3.5)
            .attr("fill", function (_, i, nodes) {
              const parentData = d3.select(nodes[i].parentNode).datum();
              return parentData.color;
            })
            .attr("cx", (d) => x(d.season))
            .attr("cy", (d) => y(d.share)),
        (update) =>
          update
            .attr("fill", function (_, i, nodes) {
              const parentData = d3.select(nodes[i].parentNode).datum();
              return parentData.color;
            })
            .attr("cx", (d) => x(d.season))
            .attr("cy", (d) => y(d.share)),
        (exit) => exit.remove()
      );

    dots.exit().remove();
  }

  function renderChips() {
    const chips = chipContainer
      .selectAll("span.chip")
      .data(state.players, (d) => d);

    const chipsEnter = chips
      .enter()
      .append("span")
      .attr("class", "chip");

    chipsEnter.append("span").attr("class", "chip-label");

    chipsEnter
      .append("button")
      .attr("type", "button")
      .attr("aria-label", "Remove player")
      .text("✕")
      .on("click", (_, player) => {
        state.players = state.players.filter((name) => name !== player);
        renderChips();
        updatePlayers();
      });

    chips
      .merge(chipsEnter)
      .style("background", (d) => getColor(d))
      .style("color", "#f8fafc")
      .select(".chip-label")
      .text((d) => d);

    chips.exit().remove();
  }

  function addPlayer(name) {
    const player = name && name.trim();
    if (
      !player ||
      !playerSeries.has(player) ||
      state.players.includes(player) ||
      state.players.length >= 5
    ) {
      return;
    }
    state.players.push(player);
    renderChips();
    updatePlayers();
  }

  addButton.on("click", () => {
    const selected = select.property("value");
    addPlayer(selected);
  });

  select.on("change", () => {
    const selected = select.property("value");
    addPlayer(selected);
    select.property("value", "");
  });

  clearButton.on("click", () => {
    state.players = [];
    renderChips();
    updatePlayers();
  });

  renderChips();
  updatePlayers();
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
  const margin = { top: 60, right: 80, bottom: 60, left: 70 };
  const { svg, g, innerWidth, innerHeight } = responsiveSvg({
    container,
    margin,
    height: 420,
  });

  const x = d3
    .scaleLinear()
    .domain(d3.extent(data, (d) => d.season))
    .range([0, innerWidth]);
  const y = d3.scaleLinear().domain([0, 50]).range([innerHeight, 0]);

  const xAxis = g
    .append("g")
    .attr("transform", `translate(0,${innerHeight})`)
    .call(
      d3.axisBottom(x).ticks(Math.min(12, data.length)).tickFormat(d3.format("d"))
    );
  const yAxis = g
    .append("g")
    .call(d3.axisLeft(y).ticks(6).tickFormat((d) => `${d}%`));

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

  const legend = svg
    .append("g")
    .attr(
      "transform",
      `translate(${margin.left + 10}, ${margin.top - 30})`
    );

  const legendItems = legend
    .selectAll("g.legend-item")
    .data(series)
    .enter()
    .append("g")
    .attr("class", "legend-item")
    .attr("transform", (_, i) => `translate(${i * 195}, 0)`);

  legendItems
    .append("line")
    .attr("x1", 0)
    .attr("x2", 28)
    .attr("y1", -4)
    .attr("y2", -4)
    .attr("stroke-width", (d) => d.width + 1)
    .attr("stroke", (d) => d.color);

  legendItems
    .append("text")
    .attr("x", 36)
    .attr("y", 0)
    .attr("font-size", 12)
    .attr("font-weight", 600)
    .text((d) => d.label);

  svg
    .append("text")
    .attr("x", margin.left + innerWidth / 2)
    .attr("y", margin.top + innerHeight + 45)
    .attr("text-anchor", "middle")
    .attr("font-size", 12)
    .attr("fill", "#1e293b")
    .text("Season");

  svg
    .append("text")
    .attr(
      "transform",
      `translate(${margin.left - 50}, ${margin.top + innerHeight / 2}) rotate(-90)`
    )
    .attr("text-anchor", "middle")
    .attr("font-size", 12)
    .attr("fill", "#1e293b")
    .text("Share of Field Goal Attempts");
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
