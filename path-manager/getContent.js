const fs = require( "fs" );
const updateTime = require( "./updateTime" );

function getContent( path, mtime ){
    const main = fs.readFileSync( path + "/main.html", "utf8" );
	return main;
}

module.exports = getContent;
