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
yarn install:dev
```

### Run the web application

```
gulp
```

### Change the default proxy port

To proxy to a local JVM running on a different port than `8282` specify the `--port` CLI arguement to gulp.

```
gulp --port=8181
```

### Test with hawtio v1.x

When developing on hawtio-jmx you can run a JVM with the Java based hawtio 1.x web module. This allows the JMX plugin to have MBeans to work with.

If you do not have hawtio 1.x on your computer then you can clone it

    git clone git@github.com:hawtio/hawtio.git

To do so in another shell:

    cd hawtio
    cd hawtio-web
    mvn install
    mvn exec:java -DstartLR=false

Then when you run `gulp` then the hawtio-jmx web console will automatic detect the running JVM with hawtio 1.x and you have some MBeans to work with.

### Output build to a different directory

When developing this plugin in a dependent console you can change the output directory where the compiled `.js` and `.css` go.  Just use the `--out` flag to set a different output directory, for example:

    gulp watch --out=../fabric8-console/libs/hawtio-jmx/dist/

Whenever the build completes the compiled `.js` file will be put into the target directory.  Don't forget to first do a `gulp build` without this flag before committing changes!

### Turn on source maps generation for debugging TypeScript

If you want to debug `.ts` using a browser developer tool such as Chrome DevTools, pass the `--sourcemap` flag to gulp:

    gulp --sourcemap

Do not use this flag when you are committing the compiled `.js` file, as it embeds source maps to the output file. Use this flag only during development.
