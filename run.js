#!/usr/bin/env node
const { program, InvalidOptionArgumentError } = require('commander');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// Custom parser for numeric options
const parseNumber = (value) => {
  const parsedValue = parseInt(value, 10);
  if (isNaN(parsedValue)) {
    throw new InvalidOptionArgumentError('Not a number.');
  }
  return parsedValue;
};

(async () => {
  program
  .option('-i, --input <file>', 'Input image file')
  .option('-n, --rows <number>', 'Number of rows to sample', parseNumber)
  .option('-t, --type <type>', 'Output type: land, water, both, all', 'all')
  .option('-o, --output <file>', 'Base output SVG file name', 'output.svg')
  .option('-H, --maxHeight <number>', 'Maximum height for interpolation', parseNumber, 100)
  .option('-l, --lookahead <number>', 'Lookahead steps to reduce fragmentation', parseNumber, 5)
  .option('-s, --sampleRate <number>', 'Set a rate to sample pixels, larger is less', parseNumber, 4);

  program.parse(process.argv);
  const options = program.opts();

  if (!options.input || !options.rows) {
    console.error('Error: Input file and number of rows are required.');
    process.exit(1);
  }

  const imagePath = path.resolve(options.input);
  const numLines = options.rows;
  const maxHeight = options.maxHeight;
  const lookaheadSteps = options.lookahead;

  let metadata;
  try {
    metadata = await sharp(imagePath).metadata();
  } catch (e) {
    console.error('Error reading image metadata:', e);
    process.exit(1);
  }

  const { width, height } = metadata;
  const step = Math.floor(height / numLines);
  const spacing = step;

  const promises = [];
  for (let i = 0; i < numLines; i++) {
    const row = i * step;
    promises.push(
      sharp(imagePath)
        .extract({ left: 0, top: row, width, height: 1 })
        .raw()
        .toBuffer()
        .then(buffer => {
          const rowData = [];
          for (let j = 0; j < buffer.length; j += 4) {
            rowData.push(buffer[j]); // Red channel
          }
          return rowData;
        })
    );
  }
  const rows = await Promise.all(promises);

  const rowWidth = rows[0]?.length || width;
  const svgHeight = numLines * spacing + maxHeight;
  const svgWidth = rowWidth;

  // Function to generate SVG content for a given type
  const generateSVGContent = (currentType) => {
    let svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="${svgWidth}" height="${svgHeight}" viewBox="0 0 ${svgWidth} ${svgHeight}">`;
    if (currentType === 'both') {
      rows.forEach((row, rowIndex) => {
        const lineHeightOffset = rowIndex * spacing;
        const points = row.map((value, colIndex) => {
          const interpolatedHeight = Math.floor((value / 255) * maxHeight);
          return `${colIndex},${lineHeightOffset + (maxHeight - interpolatedHeight)}`;
        }).join(' ');
        svgContent += `<polyline points="${points}" fill="none" stroke="black" stroke-width="1" />`;
      });
    } else if (currentType === 'land' || currentType === 'water') {
      const isLand = currentType === 'land';
      rows.forEach((row, rowIndex) => {
        const lineHeightOffset = rowIndex * spacing;
        let polylineSegments = [];
        let currentLine = [];

        row.forEach((value, colIndex) => {
          const condition = (isLand && value > 0) || (!isLand && value === 0);
          if (condition) {
            const interpolatedHeight = Math.floor((value / 255) * maxHeight);
            const yCoord = lineHeightOffset + (maxHeight - interpolatedHeight);
            currentLine.push(`${colIndex},${yCoord}`);
          } else {
            let found = false;
            for (let offset = 1; offset <= lookaheadSteps && (colIndex + offset) < row.length; offset++) {
              const nextValue = row[colIndex + offset];
              if ((isLand && nextValue > 0) || (!isLand && nextValue === 0)) {
                found = true;
                break;
              }
            }
            if (!found && currentLine.length > 0) {
              polylineSegments.push(currentLine.join(' '));
              currentLine = [];
            }
          }
        });

        if (currentLine.length > 0) {
          polylineSegments.push(currentLine.join(' '));
        }

        polylineSegments.forEach(points => {
          if (points.trim() !== "") {
            let finalPoints = points;
        
              const ptsArray = points.split(' ');
              finalPoints = ptsArray.filter((_, index) => index % options.sampleRate === 0).join(' ');
            
            svgContent += `<polyline points="${finalPoints}" fill="none" stroke="black" stroke-width="1" />`;
          }
        });
      });
    }
    svgContent += '</svg>';
    return svgContent;
  };

  if (options.type === 'all') {
    const types = ['land', 'water', 'both'];
    for (const currentType of types) {
      const baseName = options.output.replace(/\.svg$/, '');
      const outFileName = `${baseName}_${currentType}.svg`;
      const svgContent = generateSVGContent(currentType);
      fs.writeFileSync(outFileName, svgContent);
      console.log(`SVG file for type '${currentType}' has been written to ${outFileName}`);
    }
  } else {
    const svgContent = generateSVGContent(options.type);
    const outputPath = path.resolve(options.output);
    fs.writeFileSync(outputPath, svgContent);
    console.log(`SVG file has been written to ${outputPath}`);
  }
})();
