const fs = require('fs');
const swaggerAutogen = require('swagger-autogen')();

const routesFolder = './src/routes/';

const outputFile = '../docs/api/swagger.json';
const endpointsFiles = [];

var files = fs.readdirSync(routesFolder);
files.forEach(file => {
    let fileStat = fs.statSync(routesFolder + '/' + file).isDirectory();
    if(!fileStat) {
        endpointsFiles.push(routesFolder + '/' + file);
    }
});

swaggerAutogen(outputFile, endpointsFiles);
