const sharp = require('sharp');

let inputFile = "file.felename";
let outputFile = "/compresiafolder/output.jpg";

sharp(inputFile).resize({ height: 150 }).toFile(outputFile)
  .then(function(newFileInfo) {
    // newFileInfo holds the output file properties
    console.log("Success")
  })
  .catch(function(err) {
    console.log("Error occured");
  });