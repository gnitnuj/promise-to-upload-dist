// public modules
const util = require("util");
const fs = require("fs");
const path = require("path");
const winston = require("winston");
// gist modules
const s3 = require("s3-upload");
const accumulateFiles = require("accumulate-files");
const getContentType = require("content-type");

// winston/logging configuration
const tsFormat = () => new Date().toLocaleTimeString();
const logger = winston.createLogger({
  transports: [
    // colorize the output to the console
    new winston.transports.Console({
      timestamp: tsFormat,
      colorize: true,
    }),
  ],
});

// helper function to flatten array
const flattenDeep = (arr) => {
  return arr.reduce(
    (acc, val) =>
      Array.isArray(val) ? acc.concat(flattenDeep(val)) : acc.concat(val),
    []
  );
};

module.exports = (bucket, keyPrefix, sourcePath = "./dist", metadata = {}) => {
  const distDir = path.resolve(sourcePath);

  logger.info("uploading dist/");

  return accumulateFiles(distDir)
    .then((results) => {
      return Promise.all(
        flattenDeep(results).map((filePath) => {
          return util
            .promisify(fs.readFile)(filePath)
            .then((fileData) => {
              return { filePath, fileData };
            });
        })
      );
    })
    .then((data) => {
      const uploadPromises = data.map((d) => {
        const key = path.join(
          keyPrefix,
          path.relative(path.resolve(distDir), d.filePath)
        );
        const contentType = getContentType(d.filePath);
        logger.info(`uploaded file: ${bucket}/${key}`);
        return s3.uploadFile(
          bucket,
          key,
          d.fileData,
          contentType,
          "public-read",
          metadata
        );
      });

      return Promise.all(uploadPromises);
    });
};
