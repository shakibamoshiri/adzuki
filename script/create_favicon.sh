#!/bin/bash

filename=$1;

convert $filename -resize 16x16 16x16.png
convert $filename -resize 32x32 32x32.png
convert $filename -resize 48x48 48x48.png
convert $filename -resize 64x64 64x64.png
convert $filename -resize 96x96 96x96.png
convert $filename -resize 192x192 192x192.png
convert $filename -resize 144x144 ms-icon-144x144.png

convert 16x16.png 16x16.ico
cp 16x16.ico favicon.ico
