# heightmap to SVG Polyline Converter

This Node.js script converts an input grayscale heightmap into SVG files by sampling a specified number of horizontal rows and creating polylines based on pixel values. It can generate SVGs highlighting land (non-zero pixels), water (zero pixels), both, or all three at once.

## Prerequisites

- Node.js installed on your system.
- The [Sharp](https://www.npmjs.com/package/sharp) and [Commander](https://www.npmjs.com/package/commander) npm packages installed.

Install dependencies (if not already):
```bash
npm install
```

## Usage

```bash
node run.js -i <inputImage> -n <numberOfRows> -t <type> -H <maxHeight> -l <lookahead> -o <outputSVG>
```

### Parameters

- `-i, --input <file>`  
  **(Required)** Path to the input image file.

- `-n, --rows <number>`  
  **(Required)** Number of horizontal rows to sample from the image.

- `-t, --type <type>`  
  Type of output to generate. Options:
  - `land` – Generate polylines for land areas (non-zero pixels).
  - `water` – Generate polylines for water areas (zero pixels).
  - `both` – Generate polylines for all pixel values.
  - `all` – Generate three SVG files simultaneously for land, water, and both.
  
  **Default:** `all`

- `-H, --maxHeight <number>`  
  Maximum height used for interpolation of pixel values to SVG coordinates.  
  **Default:** `100`

- `-l, --lookahead <number>`  
  Number of steps to look ahead when encountering a gap, reducing fragmentation of lines.  
  **Default:** `5`

- `-o, --output <file>`  
  Base name for the output SVG file(s). For type `all`, suffixes will be added automatically.  
  **Default:** `output.svg`

  - `-s, --sampleRate <number>`  
  This is how often the script will sample pixels per row. Low values will result in very large file sizes, and result in more jagged lines.  
  **Default:** `4`

### Example Commands

- Generate all three SVG outputs with default parameters:
  ```bash
  node run.js -i input.png -n 300
  ```
  This uses defaults: type `all`, maxHeight `100`, lookahead `5`, and outputs to `output_land.svg`, `output_water.svg`, and `output_both.svg`.

- Generate an SVG highlighting only land areas:
  ```bash
  node run.js -i input.png -n 300 -t land -H 100 -l 5 -o land_output.svg
  ```

- Generate an SVG highlighting water areas with a custom lookahead:
  ```bash
  node run.js -i input.png -n 300 -t water -H 50 -l 10 -o water_output.svg
  ```

- Generate an SVG including both land and water data:
  ```bash
  node run.js -i input.png -n 300 -t both -H 100 -l 5 -o both_output.svg
  ```

### How It Works

1. **Parsing Options**:  
   The script uses Commander to parse command-line arguments. By default, it generates outputs for type `"all"` if not specified otherwise.

2. **Image Processing**:  
   - The script uses Sharp to read image metadata (width, height).
   - It calculates a vertical step based on the image height and the requested number of rows.
   - It samples rows at evenly spaced intervals across the height of the image.

3. **SVG Creation**:  
   - The script calculates the SVG canvas size based on the number of rows, spacing between rows, and `maxHeight`.
   - For each sampled row:
     - It computes a vertical offset for the row.
     - Depending on the selected type (land, water, both), it creates SVG polyline points:
       - **land**: Only include points where pixel value > 0.
       - **water**: Only include points where pixel value === 0.
       - **both**: Include all points.
     - The `lookahead` feature skips small gaps to avoid fragmented lines. When a gap is encountered, the script looks ahead up to the specified number of pixels to decide whether to continue the current polyline or close it.

4. **Output**:  
   - For types other than `"all"`, a single SVG file is written to the specified output path.
   - If type is `"all"`, three SVG files are generated with suffixes `_land.svg`, `_water.svg`, and `_both.svg` appended to the base output filename.

## Notes

- Ensure the input image exists and is accessible, and is grayscale in a range of 0 - 255.
- Adjust `--rows`, `--maxHeight`, and `--lookahead` to change the resolution, height of lines, and reducing small lines and dots, respectively.
- For water detection, the script assumes pixel values of exactly 0 represent water.
- Using type `"all"` is convenient for debugging and comparing outputs simultaneously.
- The output can be quite large. In some cases, you might want to use 'simplify' in inkcape or other methods to reduce the number of points.

## License

This script is released under the MIT License. Feel free to use, modify, and distribute it as needed.

## Roadmap

In the future, I'd like to add occlusion culling to avoid drawing lines that are hidden by other lines. I also have a version with spiral lines that could be added at some point. I've also been working on the ability to transform the lines into a orthographic style projection, but that requires further work. I'd also like to work on swapping the lines direction for alternative lines, so the plotter moves back and forth instead of always in the same direction with un needed long travels.
```


