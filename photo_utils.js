var ExifImage = require('exif').ExifImage;
var ExifData = require('exif').ExifData;
/**
 * 
 * @param {string} img 
 * @returns {ExifData}
 */
module.exports.getExif = (img) => {
    return new Promise((resolve) => {
        try {
            new ExifImage({ image : img }, function (error, exifData) {
                if (error){
                    console.log('Error: '+error.message);
                    resolve('400')
                }
                else
                    resolve(exifData) 
            });
        } catch (error) {
            console.log('Error: ' + error.message);
            resolve('400')
        }
    })
}