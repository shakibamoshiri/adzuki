const fs = require( "fs" );
const updateTime = require( "./updateTime" );

function getContent( path, mtime ){
    const index = fs.readFileSync( path + "/index.html", "utf8" );
	return index;
}

module.exports = getContent;
