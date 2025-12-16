const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

const directory = "src/assets/images";

async function processDirectory(dir) {
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      await processDirectory(filePath);
    } else if (file.endsWith(".png") || file.endsWith(".jpg")) {
      const tempPath = filePath + ".temp";

      console.log(`Optimizing: ${filePath}`);

      try {
        await sharp(filePath)
          .resize(512, 512, { fit: "inside", withoutEnlargement: true })
          .webp({ quality: 80 })
          .toFile(tempPath);

        // Replace original with WebP (renaming extension)
        const newPath = filePath.replace(/\.(png|jpg)$/, ".webp");
        fs.renameSync(tempPath, newPath);
        if (filePath !== newPath) {
          fs.unlinkSync(filePath);
        }
        console.log(`Saved: ${newPath}`);
      } catch (err) {
        console.error(`Error processing ${filePath}:`, err);
      }
    }
  }
}

processDirectory(directory);
