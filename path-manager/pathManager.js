const fs = require( "fs" );
const crypto = require('crypto');
const dm  = require('../database-manager/databaseManager');

const rmdirSyncRec = require( "./rmdirSyncRec" );
const makeStat = require( "./makeStat" );
const getContent = require( "./getContent" );
const co = require( "./colorOrganizer" );

const CREATE = co.colorizeLine( "green" )( "Create:" );
const DELETE   = co.colorizeLine( "red" )( "Delete:" );
const LINK  = co.colorizeLine( "cyan" )( "Link:  " );
const UNLINK  = co.colorizeLine( "cyan" )( "Unlink:" );
const H_LINK  = co.colorizeLine( "cyan" )( "H-Link:" );
const UPDATE   = co.colorizeLine( "yellow" )( "Update:" );
const toYellow   = co.colorizeLine( "yellow" );

const user = dm.user;
const globalRootPath = __dirname.split( "/" ).slice( 0, -1 ).join( "/" );
const log = console.log;

const gitinfo = [];
gitinfo[ 0 ] = user.git.username;
gitinfo[ 1 ] = user.git.repository;;

const baseURL = user.baseURL;
const homepageTitle = user.homeTitle;

const tagsInHeade = (function(){
    try {
        return fs.readFileSync( globalRootPath + "/src/html/tags-in-head.html", "utf8" );
    } catch( exception ){
        log( exception.message );
        log( "tags-in-head.html is required!" );
        process.exit( 0 );
    }
}());

const mainHtmlDir = fs.existsSync( globalRootPath + "/index.html/" );
if( !mainHtmlDir ){
    try {
        fs.mkdirSync( globalRootPath + "/index.html/" );
        log( CREATE, "index.html/" );
    } catch( exception ){
        log( exception.message );
        process.exit( 0 );
    }
}

function createDir( notExistDirs, routeDirs, validRequest, homePath, rootPath ){
    notExistDirs.forEach(function( path, index ){
        // split each name
        const names = path.match( /\/?[A-Za-z0-9_.-]+/g );
        const tmp = path.replace( homePath, "/" );
        const currentPath = tmp === "/" ? baseURL + tmp : baseURL + tmp + "/";
        // old: separate blog contents from main repository
        // const gitPath = currentPath;
        // new include blog contents in main repository
        const gitPath = homePath.source.match( /\/?[A-Za-z0-9_.-]+/g ).pop() + currentPath;

        // current title is the last on on the name with has "/" at the begging
        // so "/" should be replaced with ""
        const currentTitle = names.pop().replace( "/", "" );

        // parent title will be the last word in the list
        const parentTitle = names.join( "" ).match( /[A-Za-z0-9_.-]+$/ );

        // the pack link to the parent will be all names except the root name in the JSON file
        const parentLink = names.join( "" ).replace( homePath, "/" );

        const absolutePath = rootPath + path;
        const main =
`<!DOCTYPE html>
<html lang="en">
<head>
    ${ tagsInHeade }
    <title>${ currentTitle  }</title>
    <link rel="stylesheet" href="/build/css/${ currentTitle }.css">
</head>
<body>
     <h1>${ currentTitle }</h1>
     <p>This is html part. Please build main.js to have React.js part.</p>
     <div id="root" class="main"></div>
     <script type="application/javascript" src="/build/react/${ currentTitle }.bundle.js"></script>
</body>
</html>`;

    const mainJs =
`import React, { Fragment, Component } from "react";
import { render } from "react-dom";

const rootJs = <Fragment>
    <h1>${ currentTitle }</h1>
    <p>This is React.js part; ready to go.</p>
</Fragment>;

const rootHtml = document.getElementById( "root" );
render( rootJs, rootHtml );`;

        try {
            fs.mkdirSync( absolutePath );
            fs.writeFileSync( absolutePath + "/main.js", mainJs );
            fs.writeFileSync( absolutePath + "/index.html", main );
            routeDirs.push( path );
            log( CREATE, "." + path );
        } catch( exception ){
            log( exception.message );
        }

        try {
            const dist = rootPath + "/index.html/" + currentTitle;
            fs.symlinkSync( ".." + path  + "/index.html", dist );
            log( LINK, "./index.html/" + currentTitle, "=>", "." + path );
        } catch( exception ){
            if( exception.message.search( "EEXIST" ) === 0 ){
                try {
                    const dirs =  path.split( "/" );
                    const fileName = dirs.pop();
                    const parentName = dirs.pop();
                    if( parentName !== undefined ){
                        const dist = rootPath + "/index.html/" + fileName + "-in-" + parentName;
                        fs.symlinkSync( ".." + path + "/index.html", dist );
                        log( LINK, "./index.html/" + currentTitle, "=>", "." + path );
                    } else {
                        log( "Not able to create symbolic link for:", fileName );
                    }
                } catch( exception ){
                    log( exception.message );
                }
            }
        }
    });
}

function deleteDir( notExistKey, rootPath ){
    notExistKey.forEach(function( path ){
        try {
            rmdirSyncRec( rootPath + path );
            fs.readdirSync( rootPath + "/index.html" ).forEach(function( file ){
                const dist = rootPath + "/index.html/" + file;
                if( !fs.existsSync( dist ) ){
                    fs.unlinkSync( dist );
                    log( UNLINK, "./index.html/" + file );
                }
            });
            log( DELETE, "." + path );
        } catch( exception ){
            log( exception.message );
        }
    });
}

function updateRoutes( routeDirs, routeLink, routePath, rootPath ){
    fs.writeFile( rootPath + "/database/route.dirs", routeDirs.join( "\n" ) , function( error ){
        if( error ){
            console.log( error.message );
        }
        log( UPDATE, "route.dirs ..." );
    });

    fs.writeFile( rootPath + "/database/route.link", routeLink , function( error ){
        if( error ){
            console.log( error.message );
        }
        log( UPDATE, "route.link ..." );
    });

    fs.writeFile( rootPath + "/database/route.path", routePath , function( error ){
        if( error ){
            console.log( error.message );
        }
        log( UPDATE, "route.path ..." );
    });
}

function createHardLink( homePath, rootPath ){
    const db    = rootPath + homePath + "/database";
    const posts = db + "/posts.json";
    const user  = db + "/user.json";

    fs.exists( db, function( exist ){
        if( !exist ){
            try {
                fs.mkdirSync( db );

                fs.link( rootPath + "/database/posts.json", posts, function( exception ){
                    if( exception ){
                        log( exception.message );
                    } else {
                        log( H_LINK, "." + homePath + "/database/posts.json" );
                    }
                });

                fs.link( rootPath + "/database/user.json", user, function( exception ){
                    if( exception ){
                        log( exception.message );
                    } else {
                        log( H_LINK, "." + homePath + "/database/user.json" );
                    }
                });
            } catch( exception ){
                log( exception.message );
                log( "Not able to add database to", "." + homePath );
            }
        }
    });
}

// create and delete directories
function manageDir( routeJson, routeDirs, rootPath ){
    
    routeJson.sort();

    if( routeDirs === undefined ){
        routeDirs = [];
    } else {
        routeDirs = routeDirs.split( "\n" );
        routeDirs.sort();
    }

    const hashJson = crypto.createHmac( "md5", routeJson.join( "" ) ).digest( "hex" );
    const hashDirs = crypto.createHmac( "md5", routeDirs.join( "" ) ).digest( "hex" );

    // if there is a change in posts.json file
    // try appropriate action
    if( hashJson !== hashDirs ){
    log( "posts.json md5:", toYellow( hashJson ) );
    log( "route.dirs md5:", hashDirs );

        const homePath = new RegExp( routeJson[ 0 ]  + "/?" );
        const validRequest = routeJson.map( function( item ){ return item.replace( homePath, "/") } );
        
        // route.link file
        const routeLink = validRequest.map( function( request ){
           const text = request === "/" ? routeJson[ 0 ].slice( 1 ) : request.match( /[A-Za-z0-9_.-]+$/ );
           return `<a href="${ request  }">${ text }</a>`
        }).join( "\n" ) + "\n";

        const routePath = validRequest.join( "\n" ) + "\n";

        const notExistDirs = routeJson.filter(function( path ){
            return !fs.existsSync( rootPath + path );
        });

        // check for not existing directories
        // this is the first run all files in routeJson should be created
        createDir( notExistDirs, routeDirs, validRequest, homePath, rootPath );

        if( notExistDirs.length > 0 ){
            routeDirs.sort();
        }
            
        // When we have change and notExistDirs === 0 it means
        // something has changed but it is not adding to the posts.json file
        // maybe it is a remote or rename operation
        const notExistKey = routeDirs.filter(function( key ){
            return routeJson.indexOf( key ) === -1;
        });

        deleteDir( notExistKey, rootPath );

        routeDirs = routeJson.slice( 0 );
    
        updateRoutes( routeDirs, routeLink, routePath, rootPath );

    } // end of hashes' comparison

    createHardLink( routeJson[ 0 ], rootPath );
}

module.exports = { manageDir, getContent, makeStat };
