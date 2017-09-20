# hawtio-jmx

This plugin provides JMX for hawtio.

## Installation

```
yarn add @hawtio/jmx
```

## Set up development environment

### Clone the repository

```
git clone https://github.com/hawtio/hawtio-jmx
cd hawtio-jmx
```

### Install development tools

* [Node.js](http://nodejs.org)
* [Yarn](https://yarnpkg.com)
* [gulp](http://gulpjs.com/)

### Install project dependencies

```
yarn install
```

### Run the web application

```
yarn start
```

### Change the default proxy port

To proxy to a local JVM running on a different port than `8282` specify the `--port` CLI argument.

```
yarn start --port=8181
```

### Turn on source maps generation for debugging TypeScript

If you want to debug `.ts` using a browser developer tool such as Chrome DevTools, pass the `--sourcemap` flag:

```
yarn start --sourcemap
```

Do not use this flag when you are committing the compiled `.js` file, as it embeds source maps to the output file. Use this flag only during development.
