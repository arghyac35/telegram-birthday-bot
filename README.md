# telegram-birthday-bot architecture 🛡️

TODO

## Development

We use `node` version `15.x`

The first time, you will need to run

```
npm install
```

Then just start the server with

```
npm run start
```
It uses nodemon for livereloading :peace-fingers:

__If u see errors regarding python then run__

```
npm install --global --production windows-build-tools --vs2015
```
#### Important note

_If you run this command without any additional flags, you’ll install the files associated with the latest version of Visual Studio, which is VS2017 at the time of writing. However, node-gyp requires the v140 distributable, not the v150 (which comes with VS2017). This is why the --vs2015 flag is added to the end of the command, since that’s the last version of Visual Studio that came with the v140 package. You can see more notes about that near the bottom of the package’s wbsite._

_Hopefully, that’s all it will take for you to get everything installed._


# Roadmap
TODO


# FAQ

TODO
