# promise-to-upload-dist

## Overview

a simple function that uploads a folder to s3

## YARN / NPM

`yarn add promise-to-upload-dist`

or

`npm install promise-to-upload-dist`

## Usage

first...

```js
const uploadDist = require("promise-to-upload-dist");
```

then...

```js
uploadDist(bucket, keyPrefix, sourcePath = "./dist", metadata = {})
```
