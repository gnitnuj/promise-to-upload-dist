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

module.exports = (bucket, hash) => {
    const distDir = path.resolve("./dist");

    // If hash is not provided (local env deploy), assume travis
    hash = hash ? hash : process.env.TRAVIS_COMMIT;

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
            // Current & Build promises seperated for clarity
            const currentPromises = data.map((d) => {
                const key = path.join(
                    "container/3.x/current/",
                    path.relative(path.resolve(distDir), d.filePath)
                );
                const contentType = getContentType(d.filePath);
                logger.info(`uploaded file: ${bucket}/${key}`);
                return s3.uploadFile(
                    bucket,
                    key,
                    d.fileData,
                    contentType,
                    "public-read"
                );
            });

            const buildPromises = data.map((d) => {
                const key = path.join(
                    `container/3.x/builds/${hash}/`,
                    path.relative(path.resolve(distDir), d.filePath)
                );
                const contentType = getContentType(d.filePath);
                logger.info(`uploaded file: ${bucket}/${key}`);
                return s3.uploadFile(
                    bucket,
                    key,
                    d.fileData,
                    contentType,
                    "public-read"
                );
            });

            const promises = [...buildPromises, ...currentPromises];

            return Promise.all(promises);
        });
};
