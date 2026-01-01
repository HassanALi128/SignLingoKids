const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

const inputDir = "src/assets/images/categories/basic/permium";
const outputDir = "src/assets/images/categories/basic/permium";

fs.readdir(inputDir, (err, files) => {
  if (err) {
    console.error("Error reading directory:", err);
    return;
  }

  files.forEach((file) => {
    if (path.extname(file).toLowerCase() === ".png") {
      const inputFile = path.join(inputDir, file);
      const outputFile = path.join(
        outputDir,
        path.basename(file, ".png") + ".webp"
      );

      sharp(inputFile)
        .webp({ quality: 80 })
        .toFile(outputFile)
        .then(() => {
          console.log(`Converted ${file} to WebP`);
        })
        .catch((err) => {
          console.error(`Error converting ${file}:`, err);
        });
    }
  });
});
