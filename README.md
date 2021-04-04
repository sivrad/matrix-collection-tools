<p align="center"><img height="220px" src="https://avatars.githubusercontent.com/u/76859002?s=200&v=4" alt="Logo" /><p>

<p align="center">
  <strong>Matrix Collection Tools</strong><br />
  <sub>Collection CI/CD.</sub>
</p>

<p align="center">
  [ <a href="#installation">Installation 💾</a> | <a href="#usage">Usage 🤓</a> | <a href="https://www.npmjs.com/package/@sivrad/PACKAGE_NAME">NPM 📦</a> | <a href="https://github.com/sivrad/readme-template">Github 🕸</a> ]
</p>

# Installation

```sh
yarn add -D @sivrad/matrix-collection-tools
```

# Usage

## Lint the Collection

This will compare files that match:

-   `./collection.json`
-   `./types/*.json`

```sh
matrix lint
```

Or using a script and yarn:

```json
"scripts": {
  "lint": "yarn matrix lint"
}
```

## Build the Collection Package

This will build the files in `./src/`.

```sh
matrix build
```

## Make a new Type

You can quickly create a new type with this command.

```sh
matrix mk-type YourTypeName
```

# Build

The main function of this the collection tools is the Build functionality.

This will create all the files for the collection package.

These files include:

-   `./src/`
-   `./src/index.ts`
-   `./src/collection.ts`
-   `./src/types`
-   `./src/types/index.ts`
-   `./src/types/YourTypeName.ts`
