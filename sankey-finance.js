#!/usr/bin/env node

// imports
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import jsdom from "jsdom";
import { format, select } from "d3";
import d3sankey from "d3-sankey";
import fs from "fs";
import { readSheet, parseSheetData } from "read-excel-file/node";
import { nodesSchema, linksSchema, metadataSchema } from "./schema.js";
import svg2img from "svg2img";

// command line arguments parsing
const argv = yargs(hideBin(process.argv)).argv;

yargs(hideBin(process.argv))
  .usage(
    "$0 -i input_file -o output_file -a [left|right|center|justify] -n -l -w [image_width] -h [image_height] [-A | -p [node_padding] -d [node_width]]"
  )
  .example(
    "$0 -i Nokia_results.xlsx -o Nokia_results.svg -a right -n -l -d 80 -p 100 -w 1024 -h 768"
  )
  .option("input", {
    alias: "i",
    demandOption: true,
    type: "string",
    description: "Path to input Excel spreadsheet file",
  })
  .option("output", {
    alias: "o",
    type: "string",
    default: "output",
    description: "Output SVG file name",
  })
  .option("align", {
    alias: "a",
    type: "string",
    choices: ["left", "right", "center", "justify"],
    default: "justify",
    description: "Node alignment",
  })
  .option("nodewidth", {
    alias: "d",
    type: "number",
    number: true,
    requiresArg: true,
    default: 50,
    description: "Node width",
  })
  .option("nodepadding", {
    alias: "p",
    type: "number",
    number: true,
    requiresArg: true,
    default: 80,
    description: "Node alignment",
  })
  .option("nodesort", {
    alias: "n",
    type: "boolean",
    description: "Node sorting",
  })
  .option("linksort", {
    alias: "l",
    type: "boolean",
    description: "Link sorting",
  })
  .option("width", {
    alias: "w",
    type: "number",
    number: true,
    requiresArg: true,
    default: 1920,
    description: "Image width",
  })
  .option("height", {
    alias: "h",
    type: "number",
    number: true,
    requiresArg: true,
    default: 1080,
    description: "Image alignment",
  })
  .option("auto", {
    alias: "A",
    type: "boolean",
    description:
      "Auto-fit node width and padding to image size (ignores -d and -p)",
  })
  .wrap(yargs.terminalWidth)
  .parse();

const input = argv.i || argv.input;
const output = argv.o || argv.output || "output";
const [filename, fileExtension] = output.split(".");
const align = argv.a || argv.align || "justify";
const nodesort = argv.n || argv.nodesort ? null : undefined;
const linksort = argv.l || argv.linksort ? null : undefined;
const nodePadding = argv.p || argv.nodepadding || 80;
const nodeWidth = argv.d || argv.nodewidth || 50;
const autoMode = argv.A || argv.auto || false;
const imageWidth = argv.w || argv.width || 1920;
const imageHeight = argv.h || argv.height || 1080;
const color = {
  default: "#666666",
  profit: "#2ba02d",
  loss: "#cc0001",
};

// helper functions
const formatValue = (value, currency, abbreviation) => {
  return format(",.2~f")(value) + abbreviation + currency;
};

const findMaxValue = (objects, attribute) =>
  Math.max(...objects.map((object) => object[attribute]));

async function getXlsData(input, sheet, schema) {
  const data = await readSheet(input, sheet);
  const { objects, errors } = parseSheetData(data, schema);
  if (errors) {
    throw new Error("Error loading Excel data!");
  }
  return objects;
}

const nodes = await getXlsData(input, "nodes", nodesSchema);
const links = await getXlsData(input, "links", linksSchema);
const metadata = await getXlsData(input, "metadata", metadataSchema);

const graph = {
  header: metadata[0]?.header ?? "",
  currency: metadata[0]?.currency ?? "€",
  abbreviation: metadata[0]?.abbreviation ?? "B",
  nodes,
  links,
};

// chart generation

const { JSDOM } = jsdom;

const dom = new JSDOM("<!DOCTYPE html><body></body>");

const margin = {
  top: Math.round(imageHeight * 0.13),
  right: Math.round(imageWidth * 0.15),
  bottom: Math.round(imageHeight * 0.03),
  left: Math.round(imageWidth * 0.026),
};

const body = select(dom.window.document.querySelector("body"));
const svg = body
  .append("svg")
  .attr("width", imageWidth)
  .attr("height", imageHeight)
  .attr("xmlns", "http://www.w3.org/2000/svg")
  .attr("viewBox", `0 0 ${imageWidth} ${imageHeight}`)
  .style("background", "#fff");

const mySankey = d3sankey
  .sankey()
  .nodeId((d) => d.name)
  .nodeWidth(nodeWidth)
  .nodePadding(nodePadding)
  .nodeSort(nodesort)
  .linkSort(linksort)
  .nodeAlign(d3sankey[`sankey${align[0].toUpperCase()}${align.slice(1)}`])
  .extent([
    [margin.left, margin.top],
    [imageWidth - margin.right, imageHeight - margin.bottom],
  ]);

mySankey(graph);

if (autoMode) {
  const columnCounts = new Map();
  const colSums = new Map();
  for (const n of graph.nodes) {
    columnCounts.set(n.layer, (columnCounts.get(n.layer) ?? 0) + 1);
    colSums.set(n.layer, (colSums.get(n.layer) ?? 0) + n.value);
  }
  const numCols = columnCounts.size;
  const maxPerColumn = Math.max(...columnCounts.values());
  const span = imageHeight - margin.top - margin.bottom;
  const availableWidth = imageWidth - margin.left - margin.right;

  let effectiveNodeWidth = nodeWidth;
  let needsRerun = false;

  const maxNodeWidth = Math.floor(availableWidth / numCols / 3);
  if (nodeWidth > maxNodeWidth) {
    effectiveNodeWidth = maxNodeWidth;
    mySankey.nodeWidth(effectiveNodeWidth);
    needsRerun = true;
  }

  if (graph.nodes.every((n) => n.y1 === n.y0)) {
    const maxColSum = Math.max(...colSums.values());
    const maxLinkValue = Math.max(...graph.links.map((l) => l.value));
    const gap =
      (availableWidth - effectiveNodeWidth) / (numCols - 1) -
      effectiveNodeWidth;
    const minPaddingForFit = Math.ceil(
      (span - (gap * maxColSum) / maxLinkValue) / (maxPerColumn - 1)
    );
    const maxPadding = Math.floor(span / (maxPerColumn - 1)) - 1;
    const effectivePadding = Math.min(
      Math.max(minPaddingForFit, 1),
      maxPadding
    );
    mySankey.nodePadding(effectivePadding);
    needsRerun = true;
  }

  if (needsRerun) mySankey(graph);
}

const numLayers = findMaxValue(graph.nodes, "layer");

// links
svg
  .append("g")
  .attr("fill", "none")
  .attr("class", "links")
  .attr("stroke-opacity", 0.5)
  .selectAll("path")
  .data(graph.links)
  .enter()
  .append("path")
  .attr("d", d3sankey.sankeyLinkHorizontal())
  .attr("stroke-width", (d) => Math.max(1, d.width))
  .style(
    "stroke",
    (d) =>
      d.color ||
      (d.target.type === "profit"
        ? color.profit
        : d.target.type === "loss"
        ? color.loss
        : color.default)
  )
  .append("title")
  .text((d) => d.index)
  .append("title")
  .text(
    (d) => `${d.source.name} → ${d.target.name}\n${d.value.toLocaleString()}`
  );

// nodes
svg
  .append("g")
  .attr("class", "nodes")
  .selectAll("rect")
  .data(graph.nodes)
  .enter()
  .append("rect")
  .attr("width", (d) => d.x1 - d.x0)
  .attr("height", (d) => d.y1 - d.y0)
  .attr("x", (d) => d.x0)
  .attr("y", (d) => d.y0)
  .style(
    "fill",
    (d) =>
      d.color ||
      (d.type === "profit"
        ? color.profit
        : d.type === "loss"
        ? color.loss
        : color.default)
  );

// header
svg
  .append("g")
  .append("text")
  .attr("x", () => imageWidth / 2)
  .attr("y", Math.round(margin.top * 0.5))
  .attr("font-family", "Arial")
  .attr("font-size", Math.round(margin.top / 3))
  .attr("font-weight", "bold")
  .attr("text-anchor", "middle")
  .attr("fill", (d) => "blue")
  .text(graph.header);

const fontSize = Math.round(Math.min(nodePadding / 5, imageHeight / 40));

// node names and values
svg
  .append("g")
  .attr("class", "texts")
  .selectAll("text")
  .data(graph.nodes)
  .enter()
  .append("text")
  .attr("x", (d) => (d.layer < numLayers ? (d.x0 + d.x1) / 2 : d.x1 + 6))
  .attr("y", (d) =>
    d.layer < numLayers ? d.y0 - fontSize - 5 : (d.y1 + d.y0) / 2
  )
  .attr("font-family", "Arial")
  .attr("font-size", fontSize)
  .attr("font-weight", "bold")
  .attr("text-anchor", (d) => (d.layer < numLayers ? "middle" : "start"))
  .attr(
    "fill",
    (d) =>
      d.color ||
      (d.type === "profit"
        ? color.profit
        : d.type === "loss"
        ? color.loss
        : color.default)
  )
  .text((d) => d.name)
  .append("tspan")
  .attr("fill-opacity", 0.7)
  .attr("x", (d) => (d.layer < numLayers ? (d.x0 + d.x1) / 2 : d.x1 + 6))
  .attr("dy", "1em")
  .attr("font-weight", "normal")
  .attr("font-size", "0.75em")
  .text((d) =>
    d.type === "loss"
      ? ` (${formatValue(d.value, graph.currency, graph.abbreviation)})`
      : ` ${formatValue(d.value, graph.currency, graph.abbreviation)}`
  );

// save the chart
if (fileExtension === "png") {
  svg2img(body.html(), function (_error, buffer) {
    fs.writeFileSync(`${filename}.png`, buffer);
  });
} else if (fileExtension === undefined) {
  fs.writeFileSync(`${output}.svg`, body.html());
} else {
  fs.writeFileSync(output, body.html());
}
